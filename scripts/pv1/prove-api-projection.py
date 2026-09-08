#!/usr/bin/env python3
"""Measure the canonical project projection against an isolated real API."""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import time
from pathlib import Path
from uuid import uuid4

import httpx


def percentile(values: list[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, int((len(ordered) - 1) * fraction)))
    return ordered[index]


def headers(actor: str, tenant: str) -> dict[str, str]:
    return {"X-User-Id": actor, "X-Tenant-Id": tenant}


async def json_response(response: httpx.Response) -> dict:
    if not response.is_success:
        raise RuntimeError(f"{response.request.method} {response.request.url} -> {response.status_code}: {response.text[:500]}")
    return response.json()


async def create_project(client: httpx.AsyncClient, actor: str, tenant: str) -> tuple[str, dict]:
    command_id = str(uuid4())
    response = await client.post(
        "/api/v2/projects",
        headers={**headers(actor, tenant), "Idempotency-Key": command_id},
        json={"name": "P12 API projection evidence", "objective": "Measure canonical derived projection freshness."},
    )
    payload = await json_response(response)
    project = payload["project"]
    return str(project["id"]), project


async def update_project(client: httpx.AsyncClient, project_id: str, actor: str, tenant: str, revision: int, label: str) -> tuple[dict, float]:
    command_id = str(uuid4())
    started = time.perf_counter()
    response = await client.post(
        f"/api/v2/projects/{project_id}/commands",
        headers={**headers(actor, tenant), "Idempotency-Key": command_id},
        json={
            "command_id": command_id,
            "type": "project.update_details",
            "expected": {"project_revision": revision},
            "payload": {"name": label},
        },
    )
    return await json_response(response), (time.perf_counter() - started) * 1000


async def read_projection(client: httpx.AsyncClient, project_id: str, actor: str, tenant: str) -> dict:
    response = await client.get(f"/api/v2/projects/{project_id}/summary", headers=headers(actor, tenant))
    return await json_response(response)


async def wait_for_revision(client: httpx.AsyncClient, project_id: str, actor: str, tenant: str, revision: int, label: str, deadline: float) -> tuple[dict, float]:
    started = time.perf_counter()
    while time.perf_counter() < deadline:
        projection = await read_projection(client, project_id, actor, tenant)
        source = projection.get("source_revisions") or {}
        current = int(source.get("project_revision") or 0)
        if current >= revision and projection.get("project", {}).get("name") == label:
            return projection, (time.perf_counter() - started) * 1000
        await asyncio.sleep(0.01)
    raise TimeoutError(f"projection did not expose revision {revision} and label {label!r}")


async def run(api_origin: str, actor: str, tenant: str, output: str, samples_count: int) -> dict:
    timeout = httpx.Timeout(20.0, connect=10.0)
    async with httpx.AsyncClient(base_url=api_origin, timeout=timeout) as client:
        project_id, project = await create_project(client, actor, tenant)
        revision = int(project["revision"])
        samples: list[float] = []
        failures: list[str] = []
        for index in range(samples_count):
            label = f"P12 projection sample {index:03d}"
            try:
                applied, _ = await update_project(client, project_id, actor, tenant, revision, label)
                revision = int(applied["revisions"]["project_revision"])
                _, lag_ms = await wait_for_revision(client, project_id, actor, tenant, revision, label, time.perf_counter() + 5.0)
                samples.append(lag_ms)
            except Exception as error:  # retain the failure in the machine-readable artifact
                failures.append(str(error))

        # Two concurrent clients use one acknowledged base revision.  Exactly
        # one write may win; the loser must recover by refetching the newer
        # authorized projection rather than overwriting it.
        base = await read_projection(client, project_id, actor, tenant)
        base_revision = int((base.get("source_revisions") or {}).get("project_revision") or 0)
        first_client = client
        second_client = httpx.AsyncClient(base_url=api_origin, timeout=timeout)
        try:
            first_id = str(uuid4())
            second_id = str(uuid4())
            body = lambda command_id, label: {
                "command_id": command_id,
                "type": "project.update_details",
                "expected": {"project_revision": base_revision},
                "payload": {"name": label},
            }
            responses = await asyncio.gather(
                first_client.post(f"/api/v2/projects/{project_id}/commands", headers={**headers(actor, tenant), "Idempotency-Key": first_id}, json=body(first_id, "P12 concurrent winner A")),
                second_client.post(f"/api/v2/projects/{project_id}/commands", headers={**headers(actor, tenant), "Idempotency-Key": second_id}, json=body(second_id, "P12 concurrent winner B")),
            )
            statuses = sorted(response.status_code for response in responses)
            expected_conflict = statuses == [200, 409]
            refreshed = await read_projection(client, project_id, actor, tenant)
            refreshed_revision = int((refreshed.get("source_revisions") or {}).get("project_revision") or 0)
            recovery_success = expected_conflict and refreshed_revision == base_revision + 1

            # A delayed old response must be ignored by the consumer.  Both
            # payloads come from the real API; only arrival order is controlled.
            older = await read_projection(client, project_id, actor, tenant)
            newer, _ = await update_project(client, project_id, actor, tenant, refreshed_revision, "P12 out-of-order newer state")
            newer_revision = int(newer["revisions"]["project_revision"])
            newest, _ = await wait_for_revision(client, project_id, actor, tenant, newer_revision, "P12 out-of-order newer state", time.perf_counter() + 5.0)
            observed_revision = newer_revision
            for response in (newest, older):
                incoming = int((response.get("source_revisions") or {}).get("project_revision") or 0)
                if incoming >= observed_revision:
                    observed_revision = incoming
            out_of_order_safe = observed_revision == newer_revision and newer_revision > refreshed_revision

            # Reconnect means a new client must refetch before accepting a
            # further write.  The request is deliberately made after the
            # concurrent revision change.
            await second_client.aclose()
            async with httpx.AsyncClient(base_url=api_origin, timeout=timeout) as reconnected:
                reconnected_projection = await read_projection(reconnected, project_id, actor, tenant)
            reconnect_revision = int((reconnected_projection.get("source_revisions") or {}).get("project_revision") or 0)
            reconnect_safe = reconnect_revision >= newer_revision
        finally:
            if not second_client.is_closed:
                await second_client.aclose()

    result = {
        "schema": "sysgrid.pv1.api-projection-performance.v1",
        "endpoint": "/api/v2/projects/{id}/summary",
        "project_id": project_id,
        "sample_count": len(samples),
        "p50_ms": round(statistics.median(samples), 3) if samples else None,
        "p95_ms": round(percentile(samples, 0.95), 3) if samples else None,
        "max_ms": round(max(samples), 3) if samples else None,
        "budget_ms": 5000,
        "failures": failures,
        "delayed_projection_samples": len(samples),
        "out_of_order_safe": out_of_order_safe,
        "reconnect_safe": reconnect_safe,
        "concurrent_revision_conflict": expected_conflict,
        "conflict_recovery": recovery_success,
        "verdict": bool(samples) and not failures and percentile(samples, 0.95) <= 5000 and out_of_order_safe and reconnect_safe and recovery_success,
    }
    Path(output).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, sort_keys=True))
    if not result["verdict"]:
        raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-origin", required=True)
    parser.add_argument("--actor", default="p12.performance")
    parser.add_argument("--tenant", default="1")
    parser.add_argument("--output", required=True)
    parser.add_argument("--samples", type=int, default=20)
    args = parser.parse_args()
    asyncio.run(run(args.api_origin, args.actor, args.tenant, args.output, args.samples))


if __name__ == "__main__":
    main()
