#!/usr/bin/env python3
"""Capture configured SysGrid database identity without importing the app."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2] / "backend"


def dotenv_values() -> dict[str, str]:
    path = BACKEND_ROOT / ".env"
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


DOTENV = dotenv_values()


def configured(name: str, default: str) -> str:
    return os.environ.get(name) or DOTENV.get(name) or default


def sqlite_path(url: str | None) -> Path | None:
    if not url:
        return None
    prefixes = ("sqlite+aiosqlite:///", "sqlite:///")
    raw = next((url[len(prefix) :] for prefix in prefixes if url.startswith(prefix)), None)
    if not raw or raw == ":memory:":
        return None
    path = Path(raw).expanduser()
    return (path if path.is_absolute() else BACKEND_ROOT / path).resolve()


def local_demo_path(config_path: Path | None) -> Path | None:
    if config_path is None or not config_path.is_file():
        return None
    try:
        connection = sqlite3.connect(f"file:{config_path}?mode=ro", uri=True)
        row = connection.execute(
            "SELECT db_url FROM tenants WHERE name = 'Local Demo' LIMIT 1"
        ).fetchone()
        connection.close()
    except sqlite3.Error:
        return None
    return sqlite_path(row[0]) if row and row[0] else None


def snapshot(path: Path | None) -> dict[str, object]:
    if path is None:
        return {"path": None, "exists": False, "size": None, "mtime_ns": None, "sha256": None}
    if not path.is_file():
        return {"path": str(path), "exists": False, "size": None, "mtime_ns": None, "sha256": None}
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    stat = path.stat()
    return {
        "path": str(path),
        "exists": True,
        "size": stat.st_size,
        "mtime_ns": stat.st_mtime_ns,
        "sha256": digest,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--label", default="snapshot")
    args = parser.parse_args()

    config_path = sqlite_path(
        configured("CONFIG_DATABASE_URL", f"sqlite+aiosqlite:///{BACKEND_ROOT / 'config.db'}")
    )
    tenant_path = sqlite_path(
        configured("DATABASE_URL", f"sqlite+aiosqlite:///{BACKEND_ROOT / 'system_grid.db'}")
    )
    default_path = tenant_path
    demo_path = local_demo_path(config_path)
    paths = {
        "configured_user_config_db_path": config_path,
        "configured_user_tenant_db_path": demo_path,
        "configured_user_system_db_path": default_path,
    }
    snapshots = {key: snapshot(value) for key, value in paths.items()}
    payload = {
        "schema": "sysgrid.pv1.database-safety.v1",
        "label": args.label,
        "environment": {
            "CONFIG_DATABASE_URL_source": "environment" if os.environ.get("CONFIG_DATABASE_URL") else "backend/.env/default",
            "DATABASE_URL_source": "environment" if os.environ.get("DATABASE_URL") else "backend/.env/default",
            "TENANT_STORAGE_ROOT": os.environ.get("TENANT_STORAGE_ROOT") or DOTENV.get("TENANT_STORAGE_ROOT"),
        },
        "databases": snapshots,
    }
    Path(args.output).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
