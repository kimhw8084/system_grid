#!/usr/bin/env python3
"""SysGrid universal verification planning and resource telemetry.

Standard-library only. It never mutates source, Git state, tests, or runtime data.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import platform
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


def run_text(command: list[str]) -> str:
    try:
        return subprocess.run(command, check=False, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True).stdout.strip()
    except OSError:
        return ""


def sysctl_int(name: str) -> int | None:
    raw = run_text(["sysctl", "-n", name])
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def parse_vm_stat() -> dict[str, int]:
    raw = run_text(["vm_stat"])
    if not raw:
        return {}
    page_size = 4096
    first = raw.splitlines()[0] if raw.splitlines() else ""
    match = re.search(r"page size of (\d+) bytes", first)
    if match:
        page_size = int(match.group(1))
    values: dict[str, int] = {}
    for line in raw.splitlines()[1:]:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        digits = re.sub(r"[^0-9]", "", value)
        if digits:
            values[key.strip()] = int(digits) * page_size
    return values


def parse_swap_usage() -> dict[str, int | None]:
    raw = run_text(["sysctl", "-n", "vm.swapusage"])
    result: dict[str, int | None] = {"total_bytes": None, "used_bytes": None, "free_bytes": None}
    for label, key in (("total", "total_bytes"), ("used", "used_bytes"), ("free", "free_bytes")):
        match = re.search(rf"{label}\s*=\s*([0-9.]+)([MG])", raw)
        if match:
            scale = 1024 ** (2 if match.group(2) == "M" else 3)
            result[key] = int(float(match.group(1)) * scale)
    return result


def thermal_snapshot() -> dict[str, Any]:
    raw = run_text(["pmset", "-g", "therm"])
    speed = None
    match = re.search(r"CPU_Speed_Limit\s*=\s*(\d+)", raw)
    if match:
        speed = int(match.group(1))
    pressure = "unknown"
    if speed is not None:
        pressure = "nominal" if speed >= 95 else "elevated" if speed >= 75 else "critical"
    return {"pressure": pressure, "cpu_speed_limit_percent": speed}


def resource_snapshot() -> dict[str, Any]:
    logical = os.cpu_count() or 1
    physical = sysctl_int("hw.physicalcpu") or logical
    total = sysctl_int("hw.memsize")
    vm = parse_vm_stat()
    available = sum(vm.get(key, 0) for key in ("Pages free", "Pages inactive", "Pages speculative", "Pages purgeable")) or None
    swap = parse_swap_usage()
    load = os.getloadavg() if hasattr(os, "getloadavg") else (0.0, 0.0, 0.0)
    thermal = thermal_snapshot()
    return {
        "captured_unix": time.time(),
        "platform": platform.platform(),
        "machine": platform.machine(),
        "cpu": {"logical": logical, "physical": physical, "load_1m": load[0], "load_5m": load[1], "load_15m": load[2]},
        "memory": {"total_bytes": total, "available_bytes": available},
        "swap": swap,
        "thermal": thermal,
        "disk": disk_snapshot(Path.cwd()),
    }


def disk_snapshot(path: Path) -> dict[str, int]:
    stat = os.statvfs(path)
    return {"total_bytes": stat.f_blocks * stat.f_frsize, "free_bytes": stat.f_bavail * stat.f_frsize}


def changed_paths(root: Path) -> list[str]:
    commands = [
        ["git", "-C", str(root), "diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD"],
        ["git", "-C", str(root), "ls-files", "--others", "--exclude-standard"],
    ]
    paths: set[str] = set()
    for command in commands:
        for line in run_text(command).splitlines():
            value = line.strip().replace("\\", "/")
            if value:
                paths.add(value)
    return sorted(paths)


def classify(paths: list[str]) -> list[str]:
    surfaces: set[str] = set()
    for path in paths:
        if path.startswith("frontend/"):
            surfaces.add("frontend")
            if "/shared/" in path or "OperationalWorkspace" in path or "WorkspaceCommandBar" in path:
                surfaces.add("frontend-shared-platform")
            if path.startswith("frontend/tests/") or path.endswith((".test.ts", ".test.tsx", ".spec.ts")):
                surfaces.add("verification")
            if "far" in path.lower():
                surfaces.add("far")
            if "network" in path.lower():
                surfaces.add("network")
            if "research" in path.lower() or "investigation" in path.lower():
                surfaces.add("research")
        elif path.startswith("backend/"):
            surfaces.add("backend")
            if "alembic/versions/" in path or "migration" in path.lower():
                surfaces.add("database-migration")
            if "/tests" in path or Path(path).name.startswith("test_"):
                surfaces.add("verification")
        elif path.startswith("scripts/") or path.startswith(".github/"):
            surfaces.add("platform")
        else:
            surfaces.add("repository-other")
    return sorted(surfaces or {"unknown"})


def promotion_specs(paths: list[str], surfaces: list[str]) -> list[str]:
    # Promotion specs must be safe to execute before the remaining canonical suite.
    # Do not select sentinel or Golden Eight here because their canonical evidence
    # is intentionally produced by the final remaining-suite invocation.
    specs: list[str] = []
    joined = "\n".join(paths).lower()
    if "far" in surfaces or "frontend-shared-platform" in surfaces or "operationalworkspace" in joined:
        specs.append("tests/far-golden-workspace.spec.ts")
    return specs


def recommendations(snapshot: dict[str, Any]) -> dict[str, Any]:
    cpu = snapshot["cpu"]
    mem = snapshot["memory"]
    swap = snapshot["swap"]
    thermal = snapshot["thermal"]
    logical = max(1, int(cpu["logical"]))
    available = mem.get("available_bytes") or 0
    available_gib = available / (1024 ** 3) if available else 0.0
    reserve_cores = 2 if logical >= 8 else 1
    cpu_budget = max(1, logical - reserve_cores)
    memory_budget = max(1, int(available_gib // 1.25)) if available_gib else max(1, cpu_budget // 2)
    frontend_workers = max(2 if logical >= 6 else 1, min(8, cpu_budget, memory_budget))
    swap_used = swap.get("used_bytes") or 0
    thermal_ok = thermal.get("pressure") not in {"critical"}
    load_ok = float(cpu.get("load_1m", 0.0)) < logical * 1.15
    memory_ok = available_gib >= 6.0 if available else True
    swap_ok = swap_used < 4 * 1024 ** 3
    aggressive = bool(thermal_ok and load_ok and memory_ok and swap_ok)
    return {
        "profile": "adaptive_turbo" if aggressive else "guarded",
        "frontend_workers": frontend_workers if aggressive else max(1, min(4, frontend_workers)),
        "parallel_heavy_lanes": aggressive,
        "playwright_workers": 1,
        "reserved_logical_cores": reserve_cores,
        "healthy_headroom": {"thermal": thermal_ok, "load": load_ok, "memory": memory_ok, "swap": swap_ok},
        "reason": "Canonical Playwright remains single-worker because the suite shares one mutable disposable tenant; affected specs are promoted first instead of unsafe worker fan-out.",
    }


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def command_plan(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    paths = changed_paths(root)
    surfaces = classify(paths)
    snapshot = resource_snapshot()
    rec = recommendations(snapshot)
    specs = promotion_specs(paths, surfaces)
    payload = {
        "schema_version": 1,
        "mode": "active_fast_fail_planner",
        "root": str(root),
        "changed_paths": paths,
        "surfaces": surfaces,
        "promotion_specs": specs,
        "resource_snapshot": snapshot,
        "recommendations": rec,
        "full_delivery_gate_required": True,
        "uncertainty_policy": "expand_scope_and_preserve_full_gate",
    }
    write_json(Path(args.output), payload)
    if args.env_output:
        env = Path(args.env_output)
        env.parent.mkdir(parents=True, exist_ok=True)
        env.write_text(
            "\n".join([
                f"SYSGRID_ACCEL_FRONTEND_WORKERS={int(rec['frontend_workers'])}",
                f"SYSGRID_ACCEL_PARALLEL_HEAVY={1 if rec['parallel_heavy_lanes'] else 0}",
                "SYSGRID_ACCEL_PLAYWRIGHT_WORKERS=1",
                "SYSGRID_ACCEL_PROMOTION_SPECS=" + ":".join(specs),
                "SYSGRID_ACCEL_PROFILE=" + str(rec["profile"]),
            ]) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(payload, sort_keys=True))
    return 0


def command_resource(args: argparse.Namespace) -> int:
    snapshot = resource_snapshot()
    snapshot["recommendations"] = recommendations(snapshot)
    if args.output:
        write_json(Path(args.output), snapshot)
    print(json.dumps(snapshot, indent=2, sort_keys=True))
    return 0


def command_record(args: argparse.Namespace) -> int:
    path = Path(args.output)
    row = {
        "schema_version": 1,
        "event": args.event,
        "status": args.status,
        "started_unix": float(args.started),
        "ended_unix": time.time(),
        "duration_seconds": max(0.0, time.time() - float(args.started)),
        "resource_snapshot": resource_snapshot(),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(row, sort_keys=True) + "\n")
        stream.flush()
        os.fsync(stream.fileno())
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    plan = sub.add_parser("plan")
    plan.add_argument("--root", required=True)
    plan.add_argument("--output", required=True)
    plan.add_argument("--env-output")
    plan.set_defaults(func=command_plan)
    resource = sub.add_parser("resource")
    resource.add_argument("--output")
    resource.set_defaults(func=command_resource)
    record = sub.add_parser("record")
    record.add_argument("--output", required=True)
    record.add_argument("--event", required=True)
    record.add_argument("--status", required=True)
    record.add_argument("--started", required=True)
    record.set_defaults(func=command_record)
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
