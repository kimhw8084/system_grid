#!/usr/bin/env python3
"""Projects-only Local Demo reset + deterministic production-style validation fixture.

The tool is intentionally self-contained (Python stdlib + SQLite only) so the controller
can prove it before any application dependency bootstrap. Normal apply mode refuses every
database except the principal SysGrid checkout's exact Local Demo tenant database.

It mutates only these Project-domain tables, in one transaction:
    project_qa -> project_comments -> project_tasks -> projects

The fixture contains exactly ten top-level scenario projects, one explicit P10 child
subproject, and 300 tasks. It is deterministic at the logical-data level and verifies that
no unrelated table row count changes before commit.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timedelta
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
from typing import Any, Iterable

SCRIPT_PATH = Path(__file__).resolve()
REPO_ROOT = SCRIPT_PATH.parents[1]
FIXTURE_VERSION = "PROJECT_VALIDATION_V1_2026_09_01"
ANCHOR = datetime(2026, 9, 1, 12, 0, 0)
EXPECTED_REPOSITORY = "kimhw8084/system_grid"
PROJECT_TABLES = ("project_qa", "project_comments", "project_tasks", "projects")
EXPECTED_TOP_LEVEL = 10
EXPECTED_CHILDREN = 1
EXPECTED_TASKS = 300

PROJECT_REQUIRED_COLUMNS = {
    "id", "name", "status", "priority", "parent_project_id", "order_index", "metadata_json"
}
TASK_REQUIRED_COLUMNS = {
    "id", "project_id", "parent_task_id", "name", "progress", "status", "owner", "dependencies_json", "metadata_json"
}
COMMENT_REQUIRED_COLUMNS = {"id", "project_id", "task_id", "author", "content"}
QA_REQUIRED_COLUMNS = {"id", "project_id", "task_id", "question", "answer", "asked_by", "answered_by", "status"}


@dataclass(frozen=True)
class Scenario:
    key: str
    name: str
    project_type: str
    status: str
    priority: str
    owner: str
    owners: tuple[str, ...]
    beneficiaries: tuple[str, ...]
    start_offset: int
    duration_days: int
    budget: float
    problem: str
    objective: str
    expected_outcomes: tuple[str, ...]
    task_count: int
    task_profile: str
    health: str
    adoption_target: float | None
    adoption_current: float | None
    roi_types: tuple[str, ...]
    man_hours_saved: float = 0.0
    stoploss_minutes_saved: float = 0.0
    wafers_gained: float = 0.0
    realized_value_note: str = ""


SCENARIOS: tuple[Scenario, ...] = (
    Scenario("P01", "Yield Guardian — Excursion Detection MVP", "Strategic", "In Progress", "High", "Mina Park", ("Mina Park", "Alex Chen", "Jordan Lee"), ("Process Engineering", "Manufacturing Ops"), -105, 180, 420000, "Excursion signals are fragmented across tools, delaying containment and increasing wafer exposure.", "Deliver an operator-ready excursion detection MVP that shortens detection-to-containment time with auditable evidence.", ("Detect excursions before lot completion", "Reach >90% operator adoption", "Demonstrate measurable stoploss and wafer benefit"), 20, "green", "green", 90.0, 94.0, ("ManHours", "StopLoss", "Wafers"), 2280.0, 1860.0, 1450.0, "Realized value confirmed through shift adoption and excursion-response evidence."),
    Scenario("P02", "Recipe Release Guardrail — Change Control MVP", "Strategic", "Blocked", "Critical", "Daniel Cho", ("Daniel Cho", "Priya Shah", "Morgan Kim"), ("Process Engineering", "Quality", "Operations"), -120, 150, 310000, "Recipe changes can reach production with inconsistent evidence and approval traceability.", "Create a release guardrail MVP with explicit evidence, dependency, approval, and rollback controls.", ("No unapproved production recipe releases", "Evidence-complete stage gates", "Forecast impact is visible when approval blocks"), 24, "blocked", "red", 85.0, 61.0, ("ManHours", "StopLoss"), 960.0, 480.0, 0.0, "Benefit realization is at risk until the blocked qualification gate clears."),
    Scenario("P03", "Predictive PM — Maintenance Adoption MVP", "Operational", "In Progress", "High", "Sofia Ramirez", ("Sofia Ramirez", "Evan Brooks"), ("Maintenance", "Equipment Engineering"), -150, 210, 275000, "Preventive maintenance is calendar-driven and misses condition signals that could reduce unplanned downtime.", "Deliver a predictive-maintenance MVP and prove sustained technician adoption before declaring success.", ("Condition-based work recommendations", "Technician adoption >=80%", "Reduced avoidable downtime"), 18, "delivered_low_adoption", "amber", 80.0, 34.0, ("ManHours", "StopLoss"), 1400.0, 720.0, 0.0, "Delivery is nearly complete, but realized value remains constrained by low technician adoption."),
    Scenario("P04", "Tool VLAN Isolation — Zero Trust MVP", "Strategic", "In Progress", "Critical", "Noah Williams", ("Noah Williams", "Aisha Patel", "Ken Ito"), ("Cyber Defense", "Network Operations", "Manufacturing IT"), -90, 165, 515000, "Production tools share broad network trust zones that make blast-radius control and audit evidence difficult.", "Deliver a zero-trust VLAN isolation MVP with auditable approvals, exceptions, and evidence-backed rollout gates.", ("Least-privilege segmentation", "Approved exception register", "Evidence-complete security stage gates"), 20, "governance", "amber", 95.0, 78.0, ("StopLoss",), 0.0, 360.0, 0.0, "Security value is tracked through reduced exposure and controlled exception closure."),
    Scenario("P05", "MES Failover Readiness — Database Resilience MVP", "Tactical", "At Risk", "Critical", "Grace Liu", ("Grace Liu", "Omar Hassan", "Luis Martin"), ("Database Admin", "Manufacturing IT", "Platform Reliability"), -135, 190, 680000, "MES recovery depends on manual database failover steps with uncertain recovery-time performance.", "Prove a production-ready database failover MVP with deterministic rehearsal, baseline, forecast, and recovery evidence.", ("RTO <=15 minutes", "Quarterly failover rehearsal", "No hidden critical-path dependencies"), 24, "schedule", "red", 90.0, 72.0, ("StopLoss", "ManHours"), 720.0, 1260.0, 0.0, "Current forecast shows schedule risk from an overdue predecessor in the recovery rehearsal chain."),
    Scenario("P06", "Engineering Capacity Lens — Workload Balancing MVP", "Operational", "In Progress", "High", "Riley Johnson", ("Riley Johnson", "Taylor Nguyen", "Chris Young"), ("Infrastructure", "Platform Reliability"), -75, 150, 190000, "Cross-project engineering commitments are hard to balance, causing hidden overload and delayed high-priority work.", "Deliver a workload-balancing MVP that makes owner capacity, WIP pressure, and overload windows actionable.", ("Visible allocation by owner", "Overload periods identified before commitment", "Reduced unplanned WIP"), 26, "capacity", "amber", 85.0, 69.0, ("ManHours",), 1280.0, 0.0, 0.0, "Value depends on managers actively rebalancing overloaded owner windows."),
    Scenario("P07", "Alarm Triage Copilot — Operator Assist MVP", "Research", "Planning", "Medium", "Mei Tan", ("Mei Tan", "Sam Wilson"), ("Operations", "Platform Reliability"), -30, 180, 230000, "Operators spend significant time correlating noisy alarms before they can choose the correct response path.", "Validate an operator-assist MVP through staged experiments without overstating uncertain forecast or value.", ("Reduce median triage time", "Demonstrate operator trust", "Document assumptions and rejected approaches"), 18, "research", "amber", 70.0, None, ("ManHours",), 0.0, 0.0, 0.0, "Outcome remains intentionally unmeasured until the controlled operator trial begins."),
    Scenario("P08", "Chiller Optimization — Energy Efficiency MVP", "Strategic", "In Progress", "High", "Avery Thompson", ("Avery Thompson", "Jae Kim", "Fatima Noor"), ("Facilities", "Finance", "Sustainability"), -165, 240, 880000, "Chiller staging is manually tuned and consumes excess energy across variable production loads.", "Deliver a controls optimization MVP with traceable energy, cost, reliability, and adoption measurements.", ("Annualized energy reduction >=8%", "No cooling-reliability regression", "Sustained facilities adoption"), 20, "roi", "green", 90.0, 88.0, ("ManHours", "StopLoss"), 540.0, 240.0, 0.0, "Annualized savings are trending above target, with one open benefit-realization dependency on seasonal verification."),
    Scenario("P09", "Supplier Intake Automation — Vendor Onboarding MVP", "Tactical", "In Progress", "Medium", "Isabella Garcia", ("Isabella Garcia", "Leo Brown", "Nora Singh"), ("Procurement", "Cyber Defense", "Business Operations"), -60, 140, 145000, "Supplier onboarding evidence, questions, approvals, and handoffs are spread across email and shared documents.", "Deliver a centralized supplier-intake MVP with collaborative evidence, review, and reporting workflows.", ("Single auditable intake packet", "Faster reviewer turnaround", "Reusable presentation-ready supplier status"), 22, "collaboration", "green", 80.0, 76.0, ("ManHours",), 840.0, 0.0, 0.0, "Collaboration throughput is improving as review and evidence move into one project record."),
    Scenario("P10", "Multi-Site Rollout — Project Atlas MVP", "Strategic", "In Progress", "Critical", "Harper Davis", ("Harper Davis", "Alex Chen", "Grace Liu", "Noah Williams"), ("Infrastructure", "Manufacturing IT", "Network Operations", "Platform Reliability"), -210, 420, 3600000, "Site enablement work is distributed across teams and locations, making dependency, capacity, and milestone risk hard to reason about at scale.", "Deliver the Atlas multi-site rollout MVP with one scalable plan, explicit dependencies, nested outcomes, and long-horizon forecast control.", ("Repeatable site enablement pattern", "Predictable cross-site critical path", "Executive-ready rollout evidence and value narrative"), 96, "scale", "amber", 90.0, 73.0, ("ManHours", "StopLoss"), 4200.0, 1560.0, 0.0, "Portfolio-scale fixture intentionally stresses hierarchy, dependencies, schedule width, and task-volume rendering."),
)


def j(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def logical_digest(rows: Iterable[dict[str, Any]]) -> str:
    return hashlib.sha256(j(list(rows)).encode("utf-8")).hexdigest()


def normalize_origin(url: str) -> str:
    value = (url or "").strip()
    if value.endswith(".git"):
        value = value[:-4]
    if value.startswith("git@github.com:"):
        value = "https://github.com/" + value.split(":", 1)[1]
    return value.rstrip("/")


def git_output(repo: Path, *args: str) -> str:
    proc = subprocess.run(["git", "-C", str(repo), *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {proc.stderr.strip()}")
    return proc.stdout.strip()


def _validated_local_demo_repo(candidate: Path) -> tuple[Path, Path] | None:
    """Return (repo, db) only for the exact SysGrid origin + Local Demo path contract."""
    try:
        candidate = candidate.expanduser().resolve()
        if not candidate.exists():
            return None
        top = Path(git_output(candidate, "rev-parse", "--show-toplevel")).resolve()
        if top != candidate:
            candidate = top
        origin = normalize_origin(git_output(candidate, "remote", "get-url", "origin"))
        if origin != f"https://github.com/{EXPECTED_REPOSITORY}":
            return None
        db = candidate / "backend" / "tenants" / "local-demo" / "local_demo.db"
        if not db.is_file() or db.is_symlink():
            return None
        return candidate, db.resolve()
    except Exception:
        return None


def _spotlight_local_demo_paths(home: Path) -> list[Path]:
    """Use macOS metadata search when available; it is bounded to the current user's home."""
    try:
        proc = subprocess.run(
            ["mdfind", "-0", "-onlyin", str(home), 'kMDItemFSName == "local_demo.db"'],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
            timeout=12,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []
    if proc.returncode != 0:
        return []
    return [Path(raw.decode("utf-8", "surrogateescape")) for raw in proc.stdout.split(b"\0") if raw]


def _bounded_home_local_demo_paths(home: Path) -> list[Path]:
    """Portable fallback for non-indexed Macs; prune large unrelated trees and cap depth."""
    results: list[Path] = []
    home = home.resolve()
    prune = {".git", "node_modules", ".venv", "venv", "__pycache__", ".cache", ".npm", ".pnpm-store", ".Trash"}
    for root, dirs, files in os.walk(home):
        root_path = Path(root)
        try:
            depth = len(root_path.relative_to(home).parts)
        except ValueError:
            continue
        if depth == 0 and "Library" in dirs:
            # Spotlight covers Library/iCloud efficiently. Avoid a full Library crawl in fallback mode.
            dirs.remove("Library")
        dirs[:] = [d for d in dirs if d not in prune]
        if depth >= 9:
            dirs[:] = []
        if "local_demo.db" in files and root_path.parts[-3:] == ("backend", "tenants", "local-demo"):
            results.append(root_path / "local_demo.db")
    return results


def locate_principal_checkout() -> Path:
    """Locate the persistent principal checkout, not the executor's detached candidate worktree."""
    candidates: list[Path] = []
    explicit = os.environ.get("SYSGRID_REPO") or os.environ.get("SYSGRID_PRINCIPAL_REPO")
    if explicit:
        candidates.append(Path(explicit))

    # Reuse any persistent worktrees the runner knows about, but do not assume that list is exhaustive.
    try:
        for line in git_output(REPO_ROOT, "worktree", "list", "--porcelain").splitlines():
            if line.startswith("worktree "):
                candidates.append(Path(line.split(" ", 1)[1]))
    except Exception:
        pass
    candidates.append(REPO_ROOT)

    home = Path.home()
    known_roots = (
        home / "system_grid", home / "SystemGrid", home / "sysgrid",
        home / "GitHub" / "system_grid", home / "Developer" / "system_grid",
        home / "Projects" / "system_grid", home / "Documents" / "system_grid",
        home / "Desktop" / "system_grid",
    )
    candidates.extend(known_roots)

    # Convert discovered DB paths back to repository roots only when they use the exact Local Demo suffix.
    discovered_dbs = _spotlight_local_demo_paths(home)
    if not discovered_dbs:
        discovered_dbs = _bounded_home_local_demo_paths(home)
    for db in discovered_dbs:
        try:
            resolved = db.resolve()
            if tuple(resolved.parts[-4:]) != ("backend", "tenants", "local-demo", "local_demo.db"):
                continue
            candidates.append(resolved.parents[3])
        except OSError:
            continue

    validated: dict[Path, Path] = {}
    for candidate in candidates:
        pair = _validated_local_demo_repo(candidate)
        if pair:
            validated[pair[0]] = pair[1]
    if not validated:
        raise RuntimeError("Could not locate a persistent SysGrid checkout with the exact Local Demo tenant database")

    def score(item: tuple[Path, Path]) -> tuple[int, float, str]:
        repo, db = item
        text = str(repo)
        value = 0
        if explicit and repo == Path(explicit).expanduser().resolve():
            value += 1000
        if (repo / "backend" / "config.local.db").is_file():
            value += 200
        if (repo / "backend" / ".env.local.runtime").is_file():
            value += 100
        if (repo / "frontend" / ".env.local").is_file():
            value += 50
        if "sysgrid-actions-runner/_work" in text:
            value -= 500
        try:
            mtime = db.stat().st_mtime
        except OSError:
            mtime = 0.0
        return value, mtime, text

    # Prefer the checkout that carries the disposable runtime markers; recency breaks safe Local-Demo ties.
    return max(validated.items(), key=score)[0]


def assert_local_demo_target(db_path: Path, principal_repo: Path) -> Path:
    repo = principal_repo.resolve()
    expected_origin = f"https://github.com/{EXPECTED_REPOSITORY}"
    if normalize_origin(git_output(repo, "remote", "get-url", "origin")) != expected_origin:
        raise RuntimeError("Refusing Local Demo reset from an unexpected repository origin")
    expected = (repo / "backend" / "tenants" / "local-demo" / "local_demo.db").resolve()
    if db_path.is_symlink():
        raise RuntimeError("Refusing symlink database target")
    target = db_path.resolve()
    if target != expected:
        raise RuntimeError(f"Refusing non-Local-Demo database target: {target}; expected exactly {expected}")
    if not target.is_file():
        raise RuntimeError(f"Local Demo database does not exist: {target}")
    return target


def qident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def table_names(conn: sqlite3.Connection) -> list[str]:
    return sorted(row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))


def columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in conn.execute(f"PRAGMA table_info({qident(table)})")}


def assert_schema(conn: sqlite3.Connection) -> None:
    tables = set(table_names(conn))
    missing_tables = set(PROJECT_TABLES) - tables
    if missing_tables:
        raise RuntimeError(f"Projects schema missing tables: {sorted(missing_tables)}")
    required = {
        "projects": PROJECT_REQUIRED_COLUMNS,
        "project_tasks": TASK_REQUIRED_COLUMNS,
        "project_comments": COMMENT_REQUIRED_COLUMNS,
        "project_qa": QA_REQUIRED_COLUMNS,
    }
    missing: dict[str, list[str]] = {}
    for table, expected in required.items():
        absent = expected - columns(conn, table)
        if absent:
            missing[table] = sorted(absent)
    if missing:
        raise RuntimeError(f"Projects schema missing required columns: {missing}")


def table_counts(conn: sqlite3.Connection) -> dict[str, int]:
    return {name: int(conn.execute(f"SELECT COUNT(*) FROM {qident(name)}").fetchone()[0]) for name in table_names(conn)}


def insert_row(conn: sqlite3.Connection, table: str, values: dict[str, Any]) -> int:
    allowed = columns(conn, table)
    payload = {k: v for k, v in values.items() if k in allowed}
    if not payload:
        raise RuntimeError(f"No insertable columns for {table}")
    names = list(payload)
    sql = f"INSERT INTO {qident(table)} ({', '.join(qident(x) for x in names)}) VALUES ({', '.join('?' for _ in names)})"
    cur = conn.execute(sql, [payload[x] for x in names])
    return int(cur.lastrowid)


def project_metadata(s: Scenario) -> dict[str, Any]:
    return {
        "fixture": {"version": FIXTURE_VERSION, "scenario_key": s.key, "top_level": True},
        "health": s.health,
        "adoption": {
            "eligible_population": 100,
            "target_percent": s.adoption_target,
            "current_percent": s.adoption_current,
            "measurement_source": "Validation fixture — production-style acceptance baseline",
            "measurement_at": iso(ANCHOR),
            "confidence": "High" if s.adoption_current is not None else "Unknown",
            "owner": s.owner,
        },
        "governance": {
            "raids": [
                {"kind": "Risk", "title": f"{s.key} adoption/value realization", "status": "Open" if s.health != "green" else "Watching", "owner": s.owner},
                {"kind": "Assumption", "title": "Validation fixture assumptions are explicit", "status": "Accepted", "owner": s.owner},
            ],
            "decisions": [{"title": "MVP definition frozen", "status": "Approved", "decided_at": iso(ANCHOR - timedelta(days=45)), "owner": s.owner}],
            "stage_gates": [
                {"name": "Definition", "status": "Approved", "evidence": ["MVP outcome", "Owner", "Success measures"]},
                {"name": "Production readiness", "status": "Blocked" if s.task_profile in {"blocked", "schedule"} else "Approved", "evidence": ["Focused proof", "Rollback", "Operational owner"]},
            ],
        },
        "materials": [
            {"kind": "Runbook", "title": f"{s.key} operating runbook", "url": f"https://example.invalid/sysgrid/{s.key.lower()}/runbook"},
            {"kind": "Evidence", "title": f"{s.key} acceptance evidence", "url": f"https://example.invalid/sysgrid/{s.key.lower()}/evidence"},
        ],
        "report_snapshots": [{"captured_at": iso(ANCHOR - timedelta(days=14)), "health": s.health, "summary": s.realized_value_note, "adoption_current_percent": s.adoption_current}],
        "updates": [
            {"at": iso(ANCHOR - timedelta(days=7)), "author": s.owner, "health": s.health, "summary": s.realized_value_note},
            {"at": iso(ANCHOR - timedelta(days=21)), "author": s.owner, "health": "amber", "summary": "Execution baseline reviewed against current forecast."},
        ],
        "value_realization": {
            "status": "Realized" if s.key in {"P01", "P08"} else ("Adoption Risk" if s.key == "P03" else "Tracking"),
            "note": s.realized_value_note,
            "measurement_at": iso(ANCHOR),
        },
    }


def task_state(s: Scenario, index: int) -> tuple[str, int, int]:
    ratio = (index + 1) / s.task_count
    if s.task_profile == "green":
        return ("Done", 100, 0) if ratio <= .70 else (("In Progress", 70, 0) if ratio <= .90 else ("To Do", 0, 0))
    if s.task_profile == "blocked":
        if index == 10: return "Blocked", 45, 18
        return ("Done", 100, 0) if ratio <= .38 else (("In Progress", 55, 12) if ratio <= .70 else ("To Do", 0, 16))
    if s.task_profile == "delivered_low_adoption":
        return ("Done", 100, 0) if ratio <= .82 else (("Review", 90, 2) if ratio <= .94 else ("In Progress", 80, 3))
    if s.task_profile == "governance":
        if index in {8, 9}: return "Review", 75, 5
        return ("Done", 100, 0) if ratio <= .48 else ("In Progress", 60, 4)
    if s.task_profile == "schedule":
        if index == 7: return "Blocked", 35, 14
        return ("Done", 100, 0) if ratio <= .42 else (("In Progress", 50, 9) if ratio <= .75 else ("To Do", 0, 12))
    if s.task_profile == "capacity":
        return ("Done", 100, 0) if ratio <= .30 else (("In Progress", 50 + (index % 4) * 10, 3) if ratio <= .78 else ("To Do", 0, 2))
    if s.task_profile == "research":
        return ("Done", 100, 0) if ratio <= .20 else (("In Progress", 45, 0) if ratio <= .55 else ("To Do", 0, 0))
    if s.task_profile == "roi":
        return ("Done", 100, 0) if ratio <= .62 else (("In Progress", 72, 1) if ratio <= .86 else ("To Do", 0, 0))
    if s.task_profile == "collaboration":
        return ("Done", 100, 0) if ratio <= .45 else (("Review", 85, 2) if ratio <= .72 else ("In Progress", 55, 1))
    return ("Done", 100, 0) if ratio <= .36 else (("In Progress", 55, 5 + (index % 3)) if ratio <= .66 else (("Review", 82, 6) if ratio <= .78 else ("To Do", 0, 8)))


def task_owner(s: Scenario, index: int) -> str:
    constrained = ("Riley Johnson", "Taylor Nguyen", "Chris Young") if s.task_profile == "capacity" else s.owners
    return constrained[index % len(constrained)]


def task_priority(s: Scenario, index: int) -> str:
    if s.task_profile in {"blocked", "schedule", "scale"} and index % 7 in {0, 1}: return "Critical"
    return "High" if index % 5 == 0 else "Medium"


def seed_tasks(conn: sqlite3.Connection, project_id: int, s: Scenario) -> list[int]:
    task_ids: list[int] = []
    for idx in range(s.task_count):
        block, pos = divmod(idx, 12)
        planned_start = ANCHOR + timedelta(days=s.start_offset + block * 35 + (pos // 3) * 7)
        planned_end = planned_start + timedelta(days=4 + idx % 3)
        status, progress, slip = task_state(s, idx)
        forecast_start = planned_start + timedelta(days=max(0, slip - 2))
        forecast_end = planned_end + timedelta(days=slip)
        milestone = pos in {0, 11} or idx == s.task_count - 1
        parent_task_id: int | None = None
        if pos != 0:
            block_root = block * 12
            subgroup_candidates = [block_root + x for x in (1, 5, 9) if block_root + x < idx]
            parent_task_id = task_ids[block_root] if pos in {1, 5, 9} or not subgroup_candidates else task_ids[max(subgroup_candidates)]
        deps: list[int] = []
        if idx > 0: deps.append(task_ids[idx - 1])
        if idx > 2 and idx % 6 == 0: deps.append(task_ids[idx - 3])
        metadata = {
            "fixture": {"version": FIXTURE_VERSION, "scenario_key": s.key, "task_key": f"{s.key}-T{idx + 1:03d}"},
            "priority": task_priority(s, idx),
            "milestone": milestone,
            "milestone_name": f"{s.key} Gate {block + 1}" if milestone else None,
            "critical": s.task_profile in {"blocked", "schedule", "scale"} and (idx % 7 in {0, 1} or status == "Blocked"),
            "baseline": {"start": iso(planned_start), "end": iso(planned_end)},
            "forecast": {"start": iso(forecast_start), "end": iso(forecast_end), "variance_days": slip},
            "checklist": [
                {"text": "Owner confirmed", "done": status != "To Do"},
                {"text": "Evidence attached", "done": status in {"Done", "Review"}},
                {"text": "Acceptance reviewed", "done": status == "Done"},
            ],
            "capacity": {"allocation_percent": 85 + (idx % 4) * 15 if s.task_profile == "capacity" else 50 + (idx % 3) * 15, "hours_per_week": 24 + (idx % 4) * 8 if s.task_profile == "capacity" else 16 + (idx % 3) * 4},
            "scenario": {"live": True, "what_if": None},
        }
        task_id = insert_row(conn, "project_tasks", {
            "created_at": iso(ANCHOR - timedelta(days=5)), "updated_at": iso(ANCHOR), "created_by_user_id": "fixture.controller",
            "project_id": project_id, "parent_task_id": parent_task_id,
            "name": f"{s.key} Milestone {block + 1}" if milestone else f"{s.key} Work Package {idx + 1:03d}",
            "description": f"Deterministic {s.name} acceptance task {idx + 1}; profile={s.task_profile}.",
            "start_date": iso(planned_start), "end_date": iso(planned_end),
            "actual_start_date": iso(planned_start + timedelta(days=1)) if progress > 0 else None,
            "actual_end_date": iso(planned_end) if status == "Done" else None,
            "progress": progress, "status": status, "owner": task_owner(s, idx),
            "assigned_objects": j([{"kind": "validation-scenario", "key": s.key}]),
            "dependencies_json": j(deps), "metadata_json": j(metadata),
        })
        task_ids.append(task_id)
    return task_ids


def add_comments_and_qa(conn: sqlite3.Connection, project_id: int, s: Scenario, tasks: list[int]) -> None:
    comments = [
        (s.owner, f"{s.key} weekly update: {s.realized_value_note}", tasks[min(2, len(tasks) - 1)]),
        (s.owners[-1], f"Evidence review completed for {s.key}; remaining risks are represented in the project governance record.", None),
    ]
    if s.key == "P09":
        comments += [
            ("Nora Singh", "@Isabella Garcia supplier evidence packet is ready for security review.", tasks[8]),
            ("Leo Brown", "Security review found no blocker; one clarification is tracked in Q&A.", tasks[9]),
        ]
    for author, content, task_id in comments:
        insert_row(conn, "project_comments", {"created_at": iso(ANCHOR - timedelta(days=4)), "updated_at": iso(ANCHOR), "created_by_user_id": "fixture.controller", "project_id": project_id, "task_id": task_id, "author": author, "content": content, "timestamp": iso(ANCHOR - timedelta(days=2))})
    insert_row(conn, "project_qa", {"created_at": iso(ANCHOR - timedelta(days=8)), "updated_at": iso(ANCHOR), "created_by_user_id": "fixture.controller", "project_id": project_id, "task_id": None, "question": f"What is the production acceptance condition for {s.key}?", "answer": s.expected_outcomes[0], "asked_by": s.owners[-1], "answered_by": s.owner, "status": "Answered"})
    if s.key == "P09":
        insert_row(conn, "project_qa", {"project_id": project_id, "task_id": tasks[9], "question": "Is the supplier security evidence complete?", "answer": "Evidence is complete except for one documented clarification.", "asked_by": "Nora Singh", "answered_by": "Leo Brown", "status": "Answered"})
        insert_row(conn, "project_qa", {"project_id": project_id, "task_id": tasks[10], "question": "Who owns the final onboarding handoff?", "answer": None, "asked_by": "Leo Brown", "answered_by": None, "status": "Pending"})


def seed_project(conn: sqlite3.Connection, s: Scenario, order_index: int, parent_project_id: int | None = None, child: bool = False) -> tuple[int, list[int]]:
    start = ANCHOR + timedelta(days=s.start_offset)
    end = start + timedelta(days=s.duration_days)
    metadata = project_metadata(s)
    metadata["fixture"]["top_level"] = not child
    if child:
        metadata["fixture"]["parent_scenario_key"] = "P10"
    pid = insert_row(conn, "projects", {
        "created_at": iso(ANCHOR - timedelta(days=60)), "updated_at": iso(ANCHOR), "created_by_user_id": "fixture.controller",
        "name": s.name, "description": f"{s.key} deterministic production-style Projects validation scenario.",
        "type": s.project_type, "status": s.status, "priority": s.priority, "start_date": iso(start), "end_date": iso(end), "completed_at": None,
        "owner": s.owner, "owners": j(list(s.owners)), "jira_links": j([f"https://example.invalid/jira/{s.key}-101"]),
        "target_systems": j(["SysGrid", s.key]), "target_assets": j([]), "target_services": j([]), "beneficiaries": j(list(s.beneficiaries)),
        "problem_statement": s.problem, "objective": s.objective, "key_functions": j(["Plan", "Execute", "Measure", "Evidence"]), "expected_outcomes": j(list(s.expected_outcomes)),
        "parent_project_id": parent_project_id, "roi_types": j(list(s.roi_types)), "roi_defense_line": 2 if s.health == "green" else 1,
        "roi_defense_line_desc": "Fixture value-defense line with explicit measurement provenance.",
        "man_hours_saved": s.man_hours_saved, "man_hours_saved_math": f"{s.man_hours_saved:.0f} annualized hours" if s.man_hours_saved else None, "man_hours_saved_desc": "Deterministic acceptance fixture target/realized hours." if s.man_hours_saved else None,
        "stoploss_minutes_saved": s.stoploss_minutes_saved, "stoploss_minutes_saved_math": f"{s.stoploss_minutes_saved:.0f} annualized minutes" if s.stoploss_minutes_saved else None, "stoploss_minutes_saved_desc": "Deterministic acceptance fixture stoploss value." if s.stoploss_minutes_saved else None,
        "wafers_gained": s.wafers_gained, "wafers_gained_math": f"{s.wafers_gained:.0f} annualized wafers" if s.wafers_gained else None, "wafers_gained_desc": "Deterministic acceptance fixture wafer benefit." if s.wafers_gained else None,
        "appendix_json": j({"fixture_version": FIXTURE_VERSION, "scenario_key": s.key}), "team_members": j(list(s.owners)), "budget": s.budget, "currency": "USD", "order_index": order_index,
        "metadata_json": j(metadata), "is_deleted": 0,
    })
    tasks = seed_tasks(conn, pid, s)
    add_comments_and_qa(conn, pid, s, tasks)
    return pid, tasks


def seed_fixture(conn: sqlite3.Connection) -> dict[str, Any]:
    projects: dict[str, int] = {}
    for idx, s in enumerate(SCENARIOS):
        projects[s.key], _ = seed_project(conn, s, idx)
    child_s = Scenario("P10-C01", "Atlas — Site B Enablement", "Operational", "In Progress", "High", "Grace Liu", ("Grace Liu", "Noah Williams"), ("Site B Operations",), -25, 120, 220000, "Site B requires the Atlas operating pattern adapted to local network and resilience constraints.", "Enable Site B as an independently valuable child outcome without duplicating the top-level Atlas portfolio record.", ("Site B production ready", "Local owners trained", "Atlas pattern reused without fork"), 12, "scale", "amber", 90.0, 68.0, ("ManHours",), 360.0, 0.0, 0.0, "Child outcome progressing with explicit parent linkage.")
    child_id, child_tasks = seed_project(conn, child_s, 0, parent_project_id=projects["P10"], child=True)
    # Replace generic child discussion with an explicit hierarchy question/evidence record.
    insert_row(conn, "project_comments", {"project_id": child_id, "task_id": child_tasks[2], "author": "Grace Liu", "content": "Site B local readiness evidence is attached to the child outcome.", "timestamp": iso(ANCHOR - timedelta(days=1))})
    insert_row(conn, "project_qa", {"project_id": child_id, "task_id": None, "question": "Does Site B count as a separate top-level portfolio project?", "answer": "No. It is an explicit child outcome under Project Atlas.", "asked_by": "Noah Williams", "answered_by": "Grace Liu", "status": "Answered"})
    return summarize(conn)


def parse_json(value: Any) -> Any:
    if value in (None, ""):
        return None
    if isinstance(value, (dict, list)):
        return value
    return json.loads(value)


def summarize(conn: sqlite3.Connection) -> dict[str, Any]:
    project_rows = conn.execute("SELECT id, name, parent_project_id, status, priority, order_index, metadata_json FROM projects ORDER BY CASE WHEN parent_project_id IS NULL THEN 0 ELSE 1 END, order_index, id").fetchall()
    task_rows = conn.execute("SELECT project_id, name, status, progress, owner, metadata_json FROM project_tasks ORDER BY project_id, id").fetchall()
    top = [r for r in project_rows if r[2] is None]
    children = [r for r in project_rows if r[2] is not None]
    keys = [((parse_json(r[6]) or {}).get("fixture") or {}).get("scenario_key") for r in top]
    logical = [
        {"name": r[1], "parent": r[2] is not None, "status": r[3], "priority": r[4], "order_index": r[5], "fixture": (parse_json(r[6]) or {}).get("fixture")} for r in project_rows
    ] + [
        {"name": r[1], "status": r[2], "progress": r[3], "owner": r[4], "fixture": (parse_json(r[5]) or {}).get("fixture")} for r in task_rows
    ]
    return {
        "fixture_version": FIXTURE_VERSION,
        "top_level_projects": len(top), "child_projects": len(children), "total_projects": len(project_rows), "tasks": len(task_rows),
        "comments": int(conn.execute("SELECT COUNT(*) FROM project_comments").fetchone()[0]),
        "qa": int(conn.execute("SELECT COUNT(*) FROM project_qa").fetchone()[0]),
        "top_level_scenario_keys": keys,
        "logical_digest": logical_digest(logical),
    }


def assert_fixture(summary: dict[str, Any]) -> None:
    if summary["top_level_projects"] != EXPECTED_TOP_LEVEL: raise RuntimeError(f"Expected {EXPECTED_TOP_LEVEL} top-level projects, got {summary['top_level_projects']}")
    if summary["child_projects"] != EXPECTED_CHILDREN: raise RuntimeError(f"Expected {EXPECTED_CHILDREN} child project, got {summary['child_projects']}")
    if summary["tasks"] != EXPECTED_TASKS: raise RuntimeError(f"Expected {EXPECTED_TASKS} tasks, got {summary['tasks']}")
    if summary["top_level_scenario_keys"] != [s.key for s in SCENARIOS]: raise RuntimeError(f"Top-level scenario ordering mismatch: {summary['top_level_scenario_keys']}")


def reset_database(db_path: Path) -> dict[str, Any]:
    conn = sqlite3.connect(str(db_path), timeout=30.0)
    try:
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA busy_timeout=30000")
        conn.execute("BEGIN IMMEDIATE")
        try:
            assert_schema(conn)
            before_all = table_counts(conn)
            before = {name: before_all.get(name, 0) for name in PROJECT_TABLES}
            unrelated_before = {k: v for k, v in before_all.items() if k not in PROJECT_TABLES}
            conn.execute("DELETE FROM project_qa")
            conn.execute("DELETE FROM project_comments")
            conn.execute("DELETE FROM project_tasks")
            conn.execute("UPDATE projects SET parent_project_id = NULL WHERE parent_project_id IS NOT NULL")
            conn.execute("DELETE FROM projects")
            fixture = seed_fixture(conn)
            assert_fixture(fixture)
            during_all = table_counts(conn)
            unrelated_after = {k: v for k, v in during_all.items() if k not in PROJECT_TABLES}
            delta = {name: {"before": unrelated_before.get(name, 0), "after": unrelated_after.get(name, 0)} for name in sorted(set(unrelated_before) | set(unrelated_after)) if unrelated_before.get(name, 0) != unrelated_after.get(name, 0)}
            if delta: raise RuntimeError(f"Unrelated-domain row-count delta detected; rolling back: {delta}")
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        final = summarize(conn)
        assert_fixture(final)
        after = {name: int(conn.execute(f"SELECT COUNT(*) FROM {qident(name)}").fetchone()[0]) for name in PROJECT_TABLES}
        return {"schema": "SYSGRID_PROJECT_VALIDATION_RESET_RECEIPT_V1", "status": "PASS", "fixture_version": FIXTURE_VERSION, "target_db": str(db_path), "project_domain_tables": list(PROJECT_TABLES), "before": before, "deleted": before, "after": after, "fixture": final, "unrelated_domain_delta": {}}
    finally:
        conn.close()


def create_self_test_db(path: Path) -> None:
    conn = sqlite3.connect(str(path))
    try:
        conn.executescript("""
        PRAGMA foreign_keys=ON;
        CREATE TABLE teams (id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT);
        CREATE TABLE projects (
          id INTEGER PRIMARY KEY, created_at TEXT, updated_at TEXT, created_by_user_id TEXT,
          name TEXT NOT NULL, description TEXT, type TEXT, status TEXT, priority TEXT,
          start_date TEXT, end_date TEXT, completed_at TEXT, owner TEXT, owners TEXT, jira_links TEXT,
          target_systems TEXT, target_assets TEXT, target_services TEXT, beneficiaries TEXT,
          problem_statement TEXT, objective TEXT, key_functions TEXT, expected_outcomes TEXT,
          parent_project_id INTEGER REFERENCES projects(id), roi_types TEXT, roi_defense_line INTEGER,
          roi_defense_line_desc TEXT, man_hours_saved REAL, man_hours_saved_math TEXT, man_hours_saved_desc TEXT,
          stoploss_minutes_saved REAL, stoploss_minutes_saved_math TEXT, stoploss_minutes_saved_desc TEXT,
          wafers_gained REAL, wafers_gained_math TEXT, wafers_gained_desc TEXT, appendix_json TEXT,
          team_members TEXT, budget REAL, currency TEXT, order_index INTEGER, metadata_json TEXT, is_deleted INTEGER DEFAULT 0
        );
        CREATE TABLE project_tasks (
          id INTEGER PRIMARY KEY, created_at TEXT, updated_at TEXT, created_by_user_id TEXT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          parent_task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
          name TEXT NOT NULL, description TEXT, start_date TEXT, end_date TEXT, actual_start_date TEXT, actual_end_date TEXT,
          progress INTEGER, status TEXT, owner TEXT, assigned_objects TEXT, dependencies_json TEXT, metadata_json TEXT
        );
        CREATE TABLE project_comments (
          id INTEGER PRIMARY KEY, created_at TEXT, updated_at TEXT, created_by_user_id TEXT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE, author TEXT, content TEXT, timestamp TEXT
        );
        CREATE TABLE project_qa (
          id INTEGER PRIMARY KEY, created_at TEXT, updated_at TEXT, created_by_user_id TEXT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE, question TEXT, answer TEXT, asked_by TEXT, answered_by TEXT, status TEXT
        );
        INSERT INTO teams(name, description) VALUES ('Unrelated Sentinel', 'must survive');
        INSERT INTO projects(name, status, priority, parent_project_id, order_index, metadata_json) VALUES ('Old Project', 'Planning', 'Low', NULL, 0, '{}');
        """)
        conn.commit()
    finally:
        conn.close()


def self_test() -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix="sysgrid-project-fixture-") as td:
        db = Path(td) / "fixture.db"
        create_self_test_db(db)
        first = reset_database(db)
        second = reset_database(db)
        if first["fixture"]["logical_digest"] != second["fixture"]["logical_digest"]:
            raise RuntimeError("Fixture logical digest changed across idempotent rerun")
        conn = sqlite3.connect(str(db))
        try:
            sentinel = int(conn.execute("SELECT COUNT(*) FROM teams WHERE name='Unrelated Sentinel'").fetchone()[0])
        finally:
            conn.close()
        if sentinel != 1:
            raise RuntimeError("Unrelated sentinel changed during Projects-only reset")
        return {"schema": "SYSGRID_PROJECT_VALIDATION_SELF_TEST_V1", "status": "PASS", "fixture_version": FIXTURE_VERSION, "logical_digest": second["fixture"]["logical_digest"], "top_level_projects": second["fixture"]["top_level_projects"], "child_projects": second["fixture"]["child_projects"], "tasks": second["fixture"]["tasks"], "unrelated_sentinel_preserved": True}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--apply-principal-local-demo", action="store_true")
    group.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            receipt = self_test()
        else:
            principal = locate_principal_checkout()
            target = assert_local_demo_target(principal / "backend" / "tenants" / "local-demo" / "local_demo.db", principal)
            receipt = reset_database(target)
            receipt["principal_repo"] = str(principal)
        print(json.dumps(receipt, indent=2, sort_keys=True))
        return 0
    except Exception as exc:
        print(json.dumps({"schema": "SYSGRID_PROJECT_VALIDATION_RESET_RECEIPT_V1", "status": "FAIL", "fixture_version": FIXTURE_VERSION, "error": f"{type(exc).__name__}: {exc}"}, indent=2, sort_keys=True), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
