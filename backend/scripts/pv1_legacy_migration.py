#!/usr/bin/env python3
"""Run an explicit PV1 legacy backfill against an isolated tenant database.

The database URL is mandatory by design. This command does not read the
configured application database, run startup bootstrap, or run Alembic. The
caller must upgrade an isolated database first and must provide evidence that
the URL is not a configured Local Demo/user path.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sqlite3
from pathlib import Path
import sys
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# The script is invoked from ``backend/scripts`` in normal operations; make
# the backend package importable without relying on the caller's PYTHONPATH.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _sqlite_path(url: str) -> Path | None:
    for prefix in ("sqlite+aiosqlite:///", "sqlite:///"):
        if url.startswith(prefix):
            return Path(url[len(prefix):]).expanduser().resolve()
    return None


def _configured_user_paths() -> set[Path]:
    paths: set[Path] = set()
    backend = Path(__file__).resolve().parents[1]
    config_values = [os.getenv("CONFIG_DATABASE_URL"), f"sqlite+aiosqlite:///{backend / 'config.db'}"]
    for value in (*config_values, os.getenv("DATABASE_URL")):
        if value:
            path = _sqlite_path(value)
            if path:
                paths.add(path)
    paths.add((backend / "config.db").resolve())
    paths.add((backend / "system_grid.db").resolve())
    config_paths = {path for value in config_values if value for path in [_sqlite_path(value)] if path is not None}
    for config_path in config_paths:
        if not config_path.is_file():
            continue
        try:
            connection = sqlite3.connect(f"file:{config_path}?mode=ro", uri=True)
            rows = connection.execute("SELECT db_url FROM tenants WHERE name = 'Local Demo'").fetchall()
            connection.close()
        except sqlite3.Error:
            continue
        for row in rows:
            if row and row[0]:
                tenant_path = _sqlite_path(str(row[0]))
                if tenant_path:
                    paths.add(tenant_path)
    return paths


async def _run(args: argparse.Namespace) -> None:
    if not args.database_url:
        raise SystemExit("--database-url is required; configured application databases are never implicit.")
    if not args.database_url.startswith(("sqlite+aiosqlite:///", "postgresql+asyncpg://")):
        raise SystemExit("Only an explicit async SQLite or PostgreSQL tenant URL is supported.")
    path = _sqlite_path(args.database_url)
    if path is not None and path in _configured_user_paths():
        raise SystemExit(f"Refusing configured user database path: {path}")
    # Import the application migration service only after the explicit target
    # has passed the configured-user safety boundary.
    from app.pv1.migration import run_legacy_backfill

    engine = create_async_engine(args.database_url, pool_pre_ping=True)
    try:
        factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
        async with factory() as session:
            result = await run_legacy_backfill(
                session,
                tenant_id=args.tenant_id,
                actor_id=args.actor,
                cutover=args.cutover,
            )
            print(result)
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--tenant-id", required=True, type=int)
    parser.add_argument("--actor", default="pv1-migration")
    parser.add_argument("--cutover", action="store_true", help="Enable the v1 read adapter only after a clean completed run.")
    args = parser.parse_args()
    asyncio.run(_run(args))


if __name__ == "__main__":
    main()
