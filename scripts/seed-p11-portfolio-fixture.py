"""Seed only the disposable P11 Portfolio browser-proof tenant."""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from app.models import models as legacy_models  # noqa: E402
from app.pv1 import migration  # noqa: E402


async def main() -> None:
    database_url = os.environ["DATABASE_URL"]
    tenant_id = int(os.environ.get("P11_TENANT_ID", "1"))
    engine = create_async_engine(database_url)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        blocked = legacy_models.Project(
            name="P11 Migrated Attention Project",
            status="In Progress",
            priority="High",
            owner="p11.manager",
            objective="Legacy delivery remains visible in the canonical Project story.",
            end_date=datetime(2026, 9, 1, tzinfo=timezone.utc),
        )
        quiet = legacy_models.Project(
            name="P11 Migrated Quiet Project",
            status="Planning",
            priority="Medium",
            owner="p11.manager",
            objective="Sparse legacy metadata keeps deterministic empty story collections.",
            metadata_json=None,
        )
        session.add_all([blocked, quiet])
        await session.flush()
        session.add(legacy_models.ProjectTask(
            project_id=blocked.id,
            name="Legacy blocker remains actionable",
            status="Blocked",
            progress=20,
            owner="p11.manager",
        ))
        await session.commit()
        await migration.run_legacy_backfill(session, tenant_id=tenant_id, actor_id="p11-proof")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
