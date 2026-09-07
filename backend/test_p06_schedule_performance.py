from datetime import date
from statistics import median
from time import perf_counter

import pytest

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
