#!/usr/bin/env python3
"""Create deterministic, fixture-owned PV1 performance datasets.

This module is intentionally a direct fixture writer.  It is only invoked by
the isolated P12 proof wrappers after seed.py has created a temporary tenant
database; it never discovers or opens the configured Local Demo databases.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.config import Tenant, UserTenantAccess
from app.pv1.models import PV1Dependency, PV1Project, PV1ProjectCalendar, PV1ProjectMember, PV1Task


ACTOR = "p12.performance"
TENANT_ID = 1
BASE_DATE = date(2026, 10, 5)
REQUIRED_VARIANTS = (
    "long_names",
    "deep_wbs_to_8_levels",
    "unscheduled_work",
    "dense_dependencies",
    "archived_data",
    "mixed_permissions",
)


def project_id(profile: str, index: int) -> str:
    return f"perf-{profile.lower()}-project-{index:05d}"


def display_key(profile: str, index: int) -> str:
    return f"P12-{profile[:3].upper()}-{index:05d}"


def task_id(profile: str, index: int) -> str:
    return f"perf-{profile.lower()}-task-{index:05d}"


def make_projects(profile: str, count: int, selected: str, variant: str) -> list[PV1Project]:
    return [
        PV1Project(
            id=project_id(profile, index),
            tenant_id=TENANT_ID,
            display_key=display_key(profile, index),
            name=(f"P12 {profile} project {index:05d} " + "Long name " * 8)[:120] if variant == "long_names" else f"P12 {profile} project {index:05d}",
            objective=("Deterministic PV1 performance fixture. " + "Long objective content. " * 24)[:500] if variant == "long_names" else "Deterministic PV1 performance fixture.",
            problem="Performance evidence must use canonical records.",
            owner_id=ACTOR,
            phase="Archived" if variant == "archived_data" and index % 7 == 0 and index else "Executing",
            run_state="Archived" if variant == "archived_data" and index % 7 == 0 and index else "Active",
            priority="Medium",
            start_date=BASE_DATE,
            target_date=BASE_DATE + timedelta(days=30),
            timezone="America/Chicago",
            calendar_id=f"perf-{profile.lower()}-calendar",
            calendar_revision=1,
            visibility="Team",
            architecture_assessment="Not assessed",
            outcome_phase="Planned",
            outcome_result="Unassessed",
            revision=1,
            graph_revision=1,
            created_by=ACTOR,
            updated_by=ACTOR,
            metadata_json={"performance_fixture": profile, "variant": variant, "selected": index == 0},
        )
        for index in range(count)
    ]


def make_tasks(profile: str, count: int, selected: str, variant: str) -> list[PV1Task]:
    tasks: list[PV1Task] = []
    selected_project = project_id(profile, 0)
    for index in range(count):
        identifier = task_id(profile, index)
        parent = task_id(profile, index - 1) if variant == "deep_wbs_to_8_levels" and index <= 8 and index > 0 else (task_id(profile, index - 1) if index < 8 and index > 0 else None)
        # Keep every generated task on an explicit working boundary.  The
        # schedule core intentionally rejects implicit weekend normalization;
        # this fixture must exercise performance, not manufacture an invalid
        # calendar input.
        start = None if variant == "unscheduled_work" and index % 11 == 0 else BASE_DATE + timedelta(days=index % 5)
        end = None if start is None else start
        tasks.append(
            PV1Task(
                id=identifier,
                tenant_id=TENANT_ID,
                project_id=selected_project,
                parent_task_id=parent,
                kind="Task",
                title=f"{profile} task {index:05d}",
                description="Performance fixture task.",
                owner_id=ACTOR,
                status="To Do",
                priority="Medium",
                progress=0,
                start_date=start,
                end_date=end,
                duration_workdays=None if start is None else 1,
                planning_weight=1,
                mandatory=True,
                order_key=(index + 1) * 1024,
                tags=["p12-performance", profile.lower()],
                revision=1,
                created_by=ACTOR,
                updated_by=ACTOR,
            )
        )
    return tasks


def make_dependencies(profile: str, count: int, edge_count: int) -> list[PV1Dependency]:
    selected_project = project_id(profile, 0)
    edges: list[PV1Dependency] = []
    cursor = 0
    for offset in (1, 2, 3):
        for predecessor in range(count - offset):
            if cursor >= edge_count:
                return edges
            successor = predecessor + offset
            edges.append(
                PV1Dependency(
                    id=f"perf-{profile.lower()}-edge-{cursor:05d}",
                    tenant_id=TENANT_ID,
                    project_id=selected_project,
                    predecessor_id=task_id(profile, predecessor),
                    successor_id=task_id(profile, successor),
                    dependency_type="FS",
                    lag_days=0,
                    active=True,
                    revision=1,
                    created_by=ACTOR,
                    updated_by=ACTOR,
                )
            )
            cursor += 1
    return edges


async def build_fixture(database_url: str, profile: str, variant: str, output: str) -> dict:
    if profile not in {"Typical", "Large"}:
        raise ValueError("profile must be Typical or Large")
    if variant not in REQUIRED_VARIANTS:
        raise ValueError(f"variant must be one of {REQUIRED_VARIANTS}")
    project_count = 100 if profile == "Typical" else 10_000
    task_count = 500 if profile == "Typical" else 10_000
    edge_count = 750 if profile == "Typical" else 20_000
    selected_project = project_id(profile, 0)
    engine = create_async_engine(database_url, future=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        projects = make_projects(profile, project_count, selected_project, variant)
        session.add_all(projects)
        session.add(
            PV1ProjectCalendar(
                id=f"perf-{profile.lower()}-calendar",
                tenant_id=TENANT_ID,
                project_id=selected_project,
                timezone="America/Chicago",
                working_weekdays=[0, 1, 2, 3, 4],
                exceptions=[],
                revision=1,
                created_by=ACTOR,
                updated_by=ACTOR,
            )
        )
        members = [ACTOR, *[f"p12.load.user-{index:02d}" for index in range(50)]]
        session.add_all([
            PV1ProjectMember(
                id=str(uuid4()),
                tenant_id=TENANT_ID,
                project_id=selected_project,
                user_id=user_id,
                role=("Owner" if user_id == ACTOR else "Viewer" if variant == "mixed_permissions" and index % 3 == 0 else "Lead"),
                capabilities=(
                    {"view": True, "edit": False, "transition": False}
                    if variant == "mixed_permissions" and index % 3 == 0 and user_id != ACTOR
                    else {"view": True, "edit": True, "transition": True}
                ),
                revision=1,
                created_by=ACTOR,
                updated_by=ACTOR,
            )
            for index, user_id in enumerate(members)
        ])
        await session.flush()
        tasks = make_tasks(profile, task_count, selected_project, variant)
        edges = make_dependencies(profile, task_count, edge_count)
        for start in range(0, len(tasks), 1000):
            session.add_all(tasks[start:start + 1000])
        for start in range(0, len(edges), 1000):
            session.add_all(edges[start:start + 1000])
        await session.commit()
    await engine.dispose()
    result = {
        "schema": "sysgrid.pv1.performance-fixture.v1",
        "profile": profile,
        "variant": variant,
        "database_url": database_url,
        "tenant_id": TENANT_ID,
        "actor_id": ACTOR,
        "selected_project_id": selected_project,
        "counts": {"projects": project_count, "selected_tasks": task_count, "selected_edges": edge_count},
        "variants": list(REQUIRED_VARIANTS),
        "variant_runs": [{"variant": variant, "instantiated": True, "executed": False, "artifact_produced": False, "fixture_seed": f"{profile.lower()}:{variant}:v1"}],
    }
    Path(output).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, sort_keys=True))
    return result


async def grant_load_access(config_database_url: str | None) -> None:
    if not config_database_url:
        return
    engine = create_async_engine(config_database_url, future=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    users = [f"p12.load.user-{index:02d}" for index in range(50)]
    async with session_factory() as session:
        tenant = await session.scalar(select(Tenant).order_by(Tenant.id.asc()))
        if tenant is None:
            raise RuntimeError("isolated config database has no tenant")
        existing = set(await session.scalars(select(UserTenantAccess.user_id).where(UserTenantAccess.tenant_id == tenant.id)))
        session.add_all([
            UserTenantAccess(user_id=user_id, tenant_id=tenant.id, role="EDITOR", is_selected=False)
            for user_id in users
            if user_id not in existing
        ])
        await session.commit()
    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--profile", choices=["Typical", "Large"], required=True)
    parser.add_argument("--variant", choices=REQUIRED_VARIANTS, required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--config-database-url")
    args = parser.parse_args()
    asyncio.run(grant_load_access(args.config_database_url))
    asyncio.run(build_fixture(args.database_url, args.profile, args.variant, args.output))


if __name__ == "__main__":
    main()
