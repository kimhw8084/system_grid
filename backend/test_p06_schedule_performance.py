import asyncio
from datetime import date
from statistics import median
from time import perf_counter

import pytest

from app.pv1 import domain
from app.pv1.schedule import ProjectCalendar, ScheduleEdge, ScheduleTask, cycle_path, preview_schedule


def _chain(size: int):
    tasks = [ScheduleTask(id=f"t{index:05}", title=f"Task {index}", start=date(2026, 1, 5), finish=date(2026, 1, 5), duration=1) for index in range(size)]
    edges = [ScheduleEdge(id=f"e{index:05}", predecessor_id=f"t{index:05}", successor_id=f"t{index + 1:05}") for index in range(size - 1)]
    return tasks, edges


@pytest.mark.parametrize(("profile", "size", "budget_ms"), [("Typical", 500, 200), ("Large", 10_000, 1_500)])
def test_schedule_preview_release_profile_p95(profile, size, budget_ms):
    calendar = ProjectCalendar()
    tasks, edges = _chain(size)
    preview_schedule(tasks, edges, calendar, operation="move", selection_ids=["t00000"], parameters={"delta_workdays": 1}, graph_revision=1)
    samples = []
    for _ in range(100):
        started = perf_counter()
        result = preview_schedule(tasks, edges, calendar, operation="move", selection_ids=["t00000"], parameters={"delta_workdays": 1}, graph_revision=1)
        samples.append((perf_counter() - started) * 1000)
        assert len(result["changes"]) == size
    ordered = sorted(samples)
    p95 = ordered[94]
    print(f"P06 performance profile={profile} tasks={size} edges={len(edges)} samples=100 p50_ms={median(samples):.2f} p95_ms={p95:.2f} max_ms={max(samples):.2f}")
    assert p95 <= budget_ms


def test_deep_cycle_reports_complete_path_without_recursion_limit_failure():
    _, edges = _chain(10_000)
    edges.append(ScheduleEdge(id="cycle", predecessor_id="t09999", successor_id="t00000"))
    path = cycle_path((f"t{index:05}" for index in range(10_000)), edges)
    assert path is not None
    assert len(path) == 10_001
    assert path[0] == path[-1] == "t00000"


@pytest.mark.asyncio
async def test_schedule_preview_cache_reuses_unchanged_revision_after_more_than_five_seconds():
    domain._SCHEDULE_PREVIEW_CACHE.clear()
    domain._SCHEDULE_PREVIEW_COORDINATION.clear()
    preview = {"content_hash": "revision-one"}
    warnings = [{"code": "EXTERNAL_DEPENDENCY_UNCONFIRMED"}]

    domain._schedule_preview_cache_put("tenant:project:revision-one", preview, warnings)
    await asyncio.sleep(5.1)

    assert domain._schedule_preview_cache_get("tenant:project:revision-one") == (preview, warnings)
    assert domain._schedule_preview_cache_get("tenant:project:revision-two") is None


def test_schedule_preview_cache_key_separates_authority_revision_and_request_scope():
    domain._SCHEDULE_PREVIEW_CACHE.clear()
    base = {
        "tenant_id": 1,
        "project_id": "project-a",
        "actor_id": "actor-a",
        "request_role": "Lead",
        "project_revision": 1,
        "graph_revision": 1,
        "calendar_revision": 1,
        "operation": "move",
        "selection_ids": ["task-a"],
        "parameters": {"delta_workdays": 1},
    }
    variants = [
        {"tenant_id": 2},
        {"project_id": "project-b"},
        {"actor_id": "actor-b"},
        {"request_role": "Contributor"},
        {"project_revision": 2},
        {"graph_revision": 2},
        {"calendar_revision": 2},
        {"operation": "change_calendar"},
        {"selection_ids": ["task-b"]},
        {"parameters": {"delta_workdays": 2}},
    ]

    keys = {domain._hash_payload(base), *(domain._hash_payload({**base, **variant}) for variant in variants)}
    assert len(keys) == len(variants) + 1


async def _run_cancellation_scenario(monkeypatch, cancel_target: str):
    domain._SCHEDULE_PREVIEW_CACHE.clear()
    domain._SCHEDULE_PREVIEW_COORDINATION.clear()
    calls = 0
    calculation_started = asyncio.Event()
    release_calculation = asyncio.Event()

    async def fake_calculation(*args, **kwargs):
        nonlocal calls
        calls += 1
        call_number = calls
        calculation_started.set()
        await release_calculation.wait()
        return {"content_hash": f"valid-{call_number}"}, []

    monkeypatch.setattr(domain, "_calculate_schedule_preview", fake_calculation)
    kwargs = {
        "tenant_id": 1,
        "project": None,
        "project_id": "project",
        "operation": "move",
        "selection_ids": ["task"],
        "parameters": {"delta_workdays": 1},
        "graph_revision": 1,
    }
    owner = asyncio.create_task(domain._schedule_preview_value("same-preview-key", None, diagnostics={}, **kwargs))
    await calculation_started.wait()

    other_entered = asyncio.Event()

    async def other_call():
        other_entered.set()
        return await domain._schedule_preview_value("same-preview-key", None, diagnostics={}, **kwargs)

    other = asyncio.create_task(other_call())
    await other_entered.wait()

    if cancel_target == "waiter":
        other.cancel()
        with pytest.raises(asyncio.CancelledError):
            await other
        release_calculation.set()
        result = await owner
    else:
        owner.cancel()
        with pytest.raises(asyncio.CancelledError):
            await owner
        release_calculation.set()
        result = await other

    diagnostics = {}
    cached = await domain._schedule_preview_value("same-preview-key", None, diagnostics=diagnostics, **kwargs)
    pending = [task for task in asyncio.all_tasks() if task is not asyncio.current_task() and not task.done()]
    return {
        "result": result,
        "cached": cached,
        "cache_status": diagnostics["cache_status"],
        "calculation_calls": calls,
        "pending_tasks": len(pending),
        "cache_entries": len(domain._SCHEDULE_PREVIEW_CACHE),
        "coordination_entries": len(domain._SCHEDULE_PREVIEW_COORDINATION),
    }


@pytest.mark.asyncio
async def test_cancelling_waiter_does_not_cancel_live_calculation_or_cache(monkeypatch):
    result = await _run_cancellation_scenario(monkeypatch, "waiter")

    assert result["result"][0]["content_hash"] == "valid-1"
    assert result["cached"] == result["result"]
    assert result["cache_status"] == "hit"
    assert result["calculation_calls"] == 1
    assert result["pending_tasks"] == 0
    assert result["cache_entries"] == 1
    assert result["coordination_entries"] == 0


@pytest.mark.asyncio
async def test_cancelling_calculating_owner_releases_request_local_work(monkeypatch):
    result = await _run_cancellation_scenario(monkeypatch, "owner")

    assert result["result"][0]["content_hash"] == "valid-2"
    assert result["cached"] == result["result"]
    assert result["cache_status"] == "hit"
    assert result["calculation_calls"] == 2
    assert result["pending_tasks"] == 0
    assert result["cache_entries"] == 1
    assert result["coordination_entries"] == 0


@pytest.mark.asyncio
async def test_identical_concurrent_preview_calculations_recheck_one_cached_result(monkeypatch):
    domain._SCHEDULE_PREVIEW_CACHE.clear()
    domain._SCHEDULE_PREVIEW_COORDINATION.clear()
    calls = 0
    calculation_started = asyncio.Event()
    release_calculation = asyncio.Event()

    async def fake_calculation(*args, **kwargs):
        nonlocal calls
        calls += 1
        calculation_started.set()
        await release_calculation.wait()
        return {"content_hash": "coordinated"}, []

    monkeypatch.setattr(domain, "_calculate_schedule_preview", fake_calculation)
    kwargs = {
        "tenant_id": 1,
        "project": None,
        "project_id": "project",
        "operation": "move",
        "selection_ids": ["task"],
        "parameters": {"delta_workdays": 1},
        "graph_revision": 1,
    }
    first_diagnostics = {}
    second_diagnostics = {}
    first = asyncio.create_task(domain._schedule_preview_value("same-preview-key", None, diagnostics=first_diagnostics, **kwargs))
    await calculation_started.wait()
    second_entered = asyncio.Event()

    async def second_call():
        second_entered.set()
        return await domain._schedule_preview_value("same-preview-key", None, diagnostics=second_diagnostics, **kwargs)

    second = asyncio.create_task(second_call())
    await second_entered.wait()
    release_calculation.set()
    assert await first == await second == ({"content_hash": "coordinated"}, [])

    assert calls == 1
    assert first_diagnostics["cache_status"] == "miss"
    assert second_diagnostics["cache_status"] == "coalesced"
    assert domain._schedule_preview_cache_get("same-preview-key") == ({"content_hash": "coordinated"}, [])
    assert domain._SCHEDULE_PREVIEW_COORDINATION == {}
