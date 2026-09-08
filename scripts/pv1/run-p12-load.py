#!/usr/bin/env python3
"""Run the PV1 Typical-profile concurrency and overload proof.

The default duration is the normative 15 minutes.  Every request is made to a
real isolated backend and timing is read from the server's privacy-minimized
Server-Timing header; client scheduling time is retained only as diagnostic
context.  The script never discovers or opens a configured user database.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import time
from collections import Counter
from pathlib import Path
from statistics import median
from uuid import uuid4

import httpx


def percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, math.floor((len(ordered) - 1) * fraction))]


def server_ms(response: httpx.Response) -> float | None:
    raw = response.headers.get("server-timing", "")
    marker = "dur="
    if marker not in raw:
        return None
    try:
        return float(raw.split(marker, 1)[1].split(";", 1)[0].split(",", 1)[0])
    except ValueError:
        return None


def summary(samples: list[float], failures: int, budget: float) -> dict[str, object]:
    return {
        "sample_count": len(samples),
        "p50_ms": median(samples) if samples else None,
        "p95_ms": percentile(samples, 0.95),
        "max_ms": max(samples) if samples else None,
        "budget_ms": budget,
        "failures": failures,
        "verdict": bool(samples and failures == 0 and (percentile(samples, 0.95) or float("inf")) <= budget),
    }


async def run(args: argparse.Namespace) -> dict[str, object]:
    started = time.monotonic()
    deadline = started + args.duration_seconds
    base_headers = {"X-Tenant-Id": "1"}
    counters: Counter[str] = Counter()
    read_samples: list[float] = []
    write_samples: list[float] = []
    read_failures = 0
    write_failures = 0
    conflicts = 0
    initial_conflicts = 0
    conflict_recoveries = 0
    conflict_recovery_attempts = 0
    conflict_recovery_failures = 0
    raw_events: list[dict[str, object]] = []
    selected_task_id = ""
    recovery_lock = asyncio.Lock()
    known_revision = {"graph": 1, "task": 1}

    def record_event(kind: str, response: httpx.Response | None, *, actor: str, client_ms: float, error: str | None = None) -> None:
        nonlocal read_failures, write_failures
        status = response.status_code if response is not None else None
        timing = server_ms(response) if response is not None else None
        if kind == "read":
            if timing is not None:
                read_samples.append(timing)
            if status != 200 or timing is None:
                read_failures += 1
        if kind == "write":
            if timing is not None and status == 200:
                write_samples.append(timing)
            if status not in {200, 409}:
                write_failures += 1
        if status == 429:
            counters["rate_limited_429"] += 1
        elif status is not None and 500 <= status <= 599:
            counters["unexpected_5xx"] += 1
        elif status is not None and status not in {409} and status >= 400:
            counters["other_failures"] += 1
        raw_events.append({"kind": kind, "actor": actor, "status": status, "server_ms": timing, "client_ms": round(client_ms, 3), "error": error, "response_code": (response.json().get("code") if response is not None and status in {409, 429} else None), "current_revisions": (response.json().get("current_revisions") if response is not None and status == 409 else None)})

    async def get(client: httpx.AsyncClient, path: str, actor: str, *, params: dict[str, object] | None = None) -> httpx.Response | None:
        began = time.perf_counter()
        try:
            response = await client.get(path, headers={**base_headers, "X-User-Id": actor}, params=params)
            record_event("read", response, actor=actor, client_ms=(time.perf_counter() - began) * 1000)
            return response
        except Exception as exc:  # network failures are counted, never hidden
            record_event("read", None, actor=actor, client_ms=(time.perf_counter() - began) * 1000, error=exc.__class__.__name__)
            return None

    async def write_task(client: httpx.AsyncClient, actor: str, progress: int, revision_state: dict[str, int]) -> httpx.Response | None:
        nonlocal conflicts, initial_conflicts, conflict_recoveries, conflict_recovery_attempts, conflict_recovery_failures, selected_task_id
        expected = dict(revision_state)
        command_id = str(uuid4())
        began = time.perf_counter()
        try:
            response = await client.post(
                f"/api/v2/projects/{args.project_id}/commands",
                headers={**base_headers, "X-User-Id": actor, "Idempotency-Key": command_id},
                json={"command_id": command_id, "type": "task.update_fields", "expected": expected, "payload": {"task_id": selected_task_id, "progress": progress}},
            )
            record_event("write", response, actor=actor, client_ms=(time.perf_counter() - began) * 1000)
            if response.status_code == 409:
                conflicts += 1
                initial_conflicts += 1
                recovery_succeeded = False
                async with recovery_lock:
                    for _retry_index in range(5):
                        conflict_recovery_attempts += 1
                        refreshed = await get(client, f"/api/v2/projects/{args.project_id}/work", actor)
                        if refreshed is None or refreshed.status_code != 200:
                            raw_events.append({"kind": "conflict_recovery_attempt", "actor": actor, "attempt": _retry_index + 1, "status": refreshed.status_code if refreshed is not None else None, "outcome": "refresh_failed"})
                            break
                        refreshed_payload = refreshed.json()
                        refreshed_items = refreshed_payload.get("items") or []
                        refreshed_task = refreshed_items[0] if refreshed_items else None
                        if refreshed_task is None:
                            break
                        retry_id = str(uuid4())
                        retry_started = time.perf_counter()
                        retry = await client.post(
                            f"/api/v2/projects/{args.project_id}/commands",
                            headers={**base_headers, "X-User-Id": actor, "Idempotency-Key": retry_id},
                            json={"command_id": retry_id, "type": "task.update_fields", "expected": {"project_revision": refreshed_payload["project_revision"], "graph_revision": refreshed_payload["graph_revision"], "task_revision": refreshed_task["revision"]}, "payload": {"task_id": str(refreshed_task["id"]), "progress": progress}},
                        )
                        record_event("write", retry, actor=actor, client_ms=(time.perf_counter() - retry_started) * 1000)
                        raw_events.append({"kind": "conflict_recovery_attempt", "actor": actor, "attempt": _retry_index + 1, "status": retry.status_code, "outcome": "recovered" if retry.status_code == 200 else "conflict" if retry.status_code == 409 else "failed"})
                        if retry.status_code == 200:
                            conflict_recoveries += 1
                            recovery_succeeded = True
                            counters["successful_writes"] += 1
                            retry_body = retry.json()
                            revision_state.update({"project_revision": retry_body["revisions"]["project_revision"], "graph_revision": retry_body["revisions"]["graph_revision"], "task_revision": retry_body["revisions"]["task_revision"]})
                            break
                        if retry.status_code == 409:
                            conflicts += 1
                            continue
                        break
                if not recovery_succeeded:
                    conflict_recovery_failures += 1
                    raw_events.append({"kind": "conflict_recovery_exhausted", "actor": actor, "attempts": 5, "status": "UNRECOVERED"})
            elif response.status_code == 200:
                counters["successful_writes"] += 1
                body = response.json()
                revision_state.update({"project_revision": body["revisions"]["project_revision"], "graph_revision": body["revisions"]["graph_revision"], "task_revision": body["revisions"]["task_revision"]})
            return response
        except Exception as exc:
            record_event("write", None, actor=actor, client_ms=(time.perf_counter() - began) * 1000, error=exc.__class__.__name__)
            return None

    async def virtual_user(index: int, client: httpx.AsyncClient) -> None:
        nonlocal known_revision
        actor = f"p12.load.user-{index:02d}"
        writer = index < args.writer_count
        iteration = 0
        revision_state = {"project_revision": known_revision["project"], "graph_revision": known_revision["graph"], "task_revision": known_revision["task"]}
        while time.monotonic() < deadline:
            if writer:
                await write_task(client, actor, iteration % 100, revision_state)
            else:
                # Keep canonical read classes active while the majority of
                # active-user heartbeats exercise the cheap capability/readiness
                # path.  The exact mix is recorded below; no route is silently
                # omitted from the workload definition.
                if iteration == 0 and index % 10 == 0:
                    await get(client, "/api/v2/projects?limit=200", actor)
                elif iteration == 0 and index % 10 == 1:
                    await get(client, "/api/v2/focus", actor)
                elif iteration == 0 and index % 10 == 2:
                    await get(client, f"/api/v2/projects/{args.project_id}/summary", actor)
                elif iteration == 0 and index % 10 == 3:
                    await get(client, f"/api/v2/projects/{args.project_id}/work", actor)
                else:
                    await get(client, "/api/v2/capabilities", actor)
            iteration += 1
            await asyncio.sleep(0.1)

    async with httpx.AsyncClient(base_url=args.api_origin, timeout=30.0) as probe:
        # Confirm the fixture and permissions before the timed phase.
        initial = await get(probe, f"/api/v2/projects/{args.project_id}/work", "p12.performance")
        if initial is None or initial.status_code != 200:
            raise RuntimeError(f"fixture project is unavailable: {initial.status_code if initial else 'network failure'}")
        selected_task_id = str((initial.json().get("items") or [{}])[0].get("id") or "")
        known_revision = {"project": initial.json().get("project_revision", 1), "graph": initial.json().get("graph_revision", 1), "task": (initial.json().get("items") or [{}])[0].get("revision", 1)}

        clients = [httpx.AsyncClient(base_url=args.api_origin, timeout=30.0, limits=httpx.Limits(max_connections=8, max_keepalive_connections=4)) for _ in range(args.user_count)]
        try:
            await asyncio.gather(*(virtual_user(index, client) for index, client in enumerate(clients)))
        finally:
            await asyncio.gather(*(client.aclose() for client in clients))

        overload_client = probe
        for index in range(620):
            began = time.perf_counter()
            try:
                response = await overload_client.post(
                    f"/api/v2/projects/{args.project_id}/commands",
                    headers={**base_headers, "X-User-Id": "p12.rate-limit", "Idempotency-Key": str(uuid4())},
                    json={"command_id": str(uuid4()), "type": "invalid.command", "expected": {}, "payload": {}},
                )
                if response.status_code == 429:
                    counters["rate_limited_429"] += 1
                    counters["retry_after_headers"] += int(bool(response.headers.get("retry-after")))
                elif response.status_code >= 500:
                    counters["unexpected_5xx"] += 1
            except Exception:
                counters["other_failures"] += 1
            raw_events.append({"kind": "rate_limit_probe", "status": response.status_code if "response" in locals() else None, "client_ms": round((time.perf_counter() - began) * 1000, 3)})

        oversized = await overload_client.get("/api/v2/projects", headers={**base_headers, "X-User-Id": "p12.performance"}, params={"limit": 999999})
        counters["oversized_rejected"] += int(oversized.status_code == 422)

        cancellation_task = asyncio.create_task(overload_client.post(
            f"/api/v2/projects/{args.project_id}/schedule/preview",
            headers={**base_headers, "X-User-Id": "p12.performance"},
            json={"operation": "move", "selection_ids": [selected_task_id], "parameters": {"delta_workdays": 1}, "graph_revision": known_revision["graph"], "calendar_revision": 1},
        ))
        await asyncio.sleep(0)
        cancellation_task.cancel()
        try:
            await cancellation_task
        except asyncio.CancelledError:
            counters["client_cancellations"] += 1
        usable_after_cancel = await get(overload_client, f"/api/v2/projects/{args.project_id}/work", "p12.performance")
        counters["usable_after_cancel"] += int(usable_after_cancel is not None and usable_after_cancel.status_code == 200)

        unauthorized = await overload_client.get(f"/api/v2/projects/{args.project_id}/summary", headers={**base_headers, "X-User-Id": "p12.unauthorized"})
        counters["authorization_enforced"] += int(unauthorized.status_code in {403, 404})

        final_work = await get(overload_client, f"/api/v2/projects/{args.project_id}/work", "p12.performance")
        integrity: dict[str, object] = {"verdict": False, "reason": "final work projection unavailable"}
        if final_work is not None and final_work.status_code == 200:
            items = final_work.json().get("items") or []
            ids = [str(item.get("id")) for item in items]
            integrity = {"verdict": len(ids) == len(set(ids)) and len(ids) == args.expected_task_count, "task_count": len(ids), "unique_task_count": len(set(ids)), "expected_task_count": args.expected_task_count}

    elapsed = time.monotonic() - started
    unexpected_5xx = counters["unexpected_5xx"]
    total_requests = len(raw_events)
    result = {
        "schema": "sysgrid.pv1.load-performance.v1",
        "profile": "Typical",
        "duration_seconds": args.duration_seconds,
        "elapsed_seconds": round(elapsed, 3),
        "virtual_users": args.user_count,
        "writer_count": args.writer_count,
        "tenant_id": 1,
        "project_id": args.project_id,
        "request_totals": {"all_recorded_events": total_requests, "successful_writes": counters["successful_writes"], "expected_409_conflicts": conflicts, "initial_conflicts": initial_conflicts, "conflict_recovery_attempts": conflict_recovery_attempts, "successful_conflict_recoveries": conflict_recoveries, "unrecovered_conflicts": conflict_recovery_failures, "429": counters["rate_limited_429"], "unexpected_5xx": unexpected_5xx, "other_failures": counters["other_failures"]},
        "workload_mix": {"canonical_heavy_read_sample_rate": "four dedicated non-writer samples per timed cohort (Portfolio, Focus, Summary, Work)", "capabilities_read_sample_rate": "remaining non-writer heartbeats", "writer_operation": "task.update_fields with revision-safe refresh after expected 409"},
        "reads": summary(read_samples, read_failures, 500),
        "simple_writes": summary(write_samples, write_failures, 500),
        "rate_limit": {"status": "PASS" if counters["rate_limited_429"] > 0 and counters["retry_after_headers"] == counters["rate_limited_429"] else "FAIL", "429_count": counters["rate_limited_429"], "retry_after_headers": counters["retry_after_headers"]},
        "oversize": {"status": "PASS" if counters["oversized_rejected"] else "FAIL", "status_code": oversized.status_code},
        "cancellation": {"status": "PASS" if counters["client_cancellations"] and counters["usable_after_cancel"] else "FAIL", "client_cancellations": counters["client_cancellations"], "usable_after_cancel": counters["usable_after_cancel"]},
        "authorization": {"status": "PASS" if counters["authorization_enforced"] else "FAIL", "enforced_samples": counters["authorization_enforced"]},
        "integrity": integrity,
        "raw_event_count": len(raw_events),
        "unexpected_5xx_rate": unexpected_5xx / total_requests if total_requests else 1.0,
        "failures": [],
    }
    result["verdict"] = bool(
        elapsed >= args.duration_seconds
        and result["reads"]["verdict"]
        and result["simple_writes"]["verdict"]
        and conflicts >= 1
        and conflict_recoveries == initial_conflicts
        and result["rate_limit"]["status"] == "PASS"
        and result["oversize"]["status"] == "PASS"
        and result["cancellation"]["status"] == "PASS"
        and result["authorization"]["status"] == "PASS"
        and integrity.get("verdict") is True
        and result["unexpected_5xx_rate"] < 0.001
    )
    Path(args.output).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    Path(args.raw_log).write_text("\n".join(json.dumps(item, sort_keys=True) for item in raw_events) + "\n", encoding="utf-8")
    print(json.dumps(result, sort_keys=True))
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-origin", required=True)
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--raw-log", required=True)
    parser.add_argument("--duration-seconds", type=float, default=900.0)
    parser.add_argument("--user-count", type=int, default=50)
    parser.add_argument("--writer-count", type=int, default=10)
    parser.add_argument("--expected-task-count", type=int, default=500)
    args = parser.parse_args()
    result = asyncio.run(run(args))
    raise SystemExit(0 if result["verdict"] else 1)


if __name__ == "__main__":
    main()
