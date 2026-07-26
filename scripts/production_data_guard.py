#!/usr/bin/env python3
"""SysGrid production SQLite backup, restore, and migration-rehearsal guard.

This tool is intentionally standard-library only. It operates on file-backed
SQLite databases discovered from the SysGrid config database and never mutates
live databases during snapshot, restore, or rehearsal operations.
"""

from __future__ import annotations

import argparse
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from typing import Any, Callable, Iterable
from uuid import uuid4

TOOL_NAME = "sysgrid-production-data-guard"
TOOL_VERSION = "1.1.0"
MANIFEST_VERSION = 1
DEFAULT_BUSY_RETRIES = 5
DEFAULT_BUSY_SLEEP_SECONDS = 0.25
SQLITE_URL_PREFIXES = ("sqlite+aiosqlite:///", "sqlite:///")
TEST_RESIDUE_APPLY_TOKEN = "DEACTIVATE-VERIFIED-TEST-RESIDUE"
TEST_RESIDUE_MAINTENANCE_TOKEN = "APP-STOPPED"
TEST_RESIDUE_TIMESTAMP_PATTERN = re.compile(
    r"^(?:blank[-_ ]slate|empty[-_ ]states|switch[-_ ]a|switch[-_ ]b)[-_ ]\d{13}[-_ ][a-z0-9]{6}$",
    re.IGNORECASE,
)
TEST_RESIDUE_BACKEND_PATTERN = re.compile(
    r"^(?:factory test tenant|custom folder tenant|attached tenant|tenant one|tenant two|runtime ready tenant|inactive tenant)(?:[ -]test_[a-z0-9_]+)?$",
    re.IGNORECASE,
)
TEST_RESIDUE_BETA_PATTERN = re.compile(
    r"^tenant[-_ ]beta(?:[-_ ][0-9a-f-]{3,})$",
    re.IGNORECASE,
)


class DataGuardError(RuntimeError):
    """Raised when an operation would be unsafe or unverifiable."""


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def new_operation_id() -> str:
    return f"op-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid4().hex[:10]}"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sanitize_role_fragment(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", (value or "").strip()).strip("-._")
    return cleaned[:80] or "unnamed"


def _resolve_relative_sqlite_path(raw_path: str, backend_root: Path) -> Path:
    path = Path(raw_path).expanduser()
    if not path.is_absolute():
        path = backend_root / path
    return path.resolve()


def sqlite_path_from_url(db_url: str, *, backend_root: Path) -> Path:
    value = (db_url or "").strip()
    for prefix in SQLITE_URL_PREFIXES:
        if value.startswith(prefix):
            raw_path = value[len(prefix):]
            if not raw_path or raw_path == ":memory:":
                raise DataGuardError("In-memory SQLite databases are not supported for production durability operations.")
            if "?" in raw_path or "#" in raw_path:
                raise DataGuardError("SQLite database URLs with query strings or fragments are not supported.")
            return _resolve_relative_sqlite_path(raw_path, backend_root)
    raise DataGuardError("Only file-backed sqlite+aiosqlite:/// or sqlite:/// database URLs are supported.")


def sqlite_url_for_path(path: Path) -> str:
    return f"sqlite+aiosqlite:///{path.resolve()}"


def open_sqlite_readonly(path: Path) -> sqlite3.Connection:
    uri = path.resolve().as_uri() + "?mode=ro"
    connection = sqlite3.connect(uri, uri=True, timeout=5.0)
    connection.execute("PRAGMA busy_timeout=5000")
    return connection


def integrity_check(path: Path, *, quick: bool = False) -> str:
    pragma = "quick_check" if quick else "integrity_check"
    try:
        with closing(open_sqlite_readonly(path)) as connection:
            rows = [str(row[0]) for row in connection.execute(f"PRAGMA {pragma}").fetchall()]
    except sqlite3.Error as exc:
        raise DataGuardError(f"SQLite {pragma} failed for {path.name}: {exc.__class__.__name__}") from exc
    if rows != ["ok"]:
        raise DataGuardError(f"SQLite {pragma} failed for {path.name}: {'; '.join(rows[:5])}")
    return "ok"


def _load_registered_tenants(config_path: Path) -> list[dict[str, Any]]:
    try:
        with closing(open_sqlite_readonly(config_path)) as connection:
            table = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='tenants'"
            ).fetchone()
            if not table:
                raise DataGuardError("Config database does not contain the tenants registry table.")
            columns = {str(row[1]) for row in connection.execute("PRAGMA table_info(tenants)").fetchall()}
            has_active_column = "is_active" in columns
            select_columns = "id, name, db_url, is_active" if has_active_column else "id, name, db_url"
            rows = connection.execute(
                f"SELECT {select_columns} FROM tenants ORDER BY id ASC"
            ).fetchall()
    except sqlite3.Error as exc:
        raise DataGuardError(f"Unable to read the tenant registry: {exc.__class__.__name__}") from exc

    tenants: list[dict[str, Any]] = []
    for row in rows:
        tenant_id, name, db_url = row[:3]
        is_active = bool(row[3]) if len(row) > 3 else True
        if db_url is None or not str(db_url).strip():
            raise DataGuardError(f"Tenant {tenant_id} has an empty database URL.")
        tenants.append({
            "id": int(tenant_id),
            "name": str(name or "unnamed"),
            "db_url": str(db_url),
            "is_active": is_active,
        })
    return tenants


def discover_database_inventory(
    *,
    config_db_url: str,
    default_db_url: str,
    backend_root: Path,
) -> dict[str, Any]:
    backend_root = backend_root.resolve()
    config_path = sqlite_path_from_url(config_db_url, backend_root=backend_root)
    default_path = sqlite_path_from_url(default_db_url, backend_root=backend_root)

    candidates: list[dict[str, Any]] = [
        {"role": "config", "path": config_path, "required": True},
        {"role": "default", "path": default_path, "required": True},
    ]
    for tenant in _load_registered_tenants(config_path):
        tenant_path = sqlite_path_from_url(tenant["db_url"], backend_root=backend_root)
        candidates.append({
            "role": f"tenant-{tenant['id']}-{sanitize_role_fragment(tenant['name'])}",
            "path": tenant_path,
            "required": bool(tenant["is_active"]),
            "tenant_id": tenant["id"],
            "tenant_name": tenant["name"],
            "is_active": bool(tenant["is_active"]),
        })

    discovered: dict[Path, dict[str, Any]] = {}
    omitted_inactive: list[dict[str, Any]] = []
    active_missing: list[str] = []
    for candidate in candidates:
        role = str(candidate["role"])
        canonical = Path(candidate["path"]).resolve()
        if not canonical.exists():
            if candidate.get("tenant_id") is not None and not candidate.get("is_active", True):
                omitted_inactive.append({
                    "logical_role": role,
                    "tenant_id": int(candidate["tenant_id"]),
                    "tenant_name": sanitize_role_fragment(str(candidate.get("tenant_name") or "unnamed")),
                    "state": "inactive",
                    "database_filename": canonical.name,
                    "reason": "registered database file is missing",
                })
                continue
            active_missing.append(
                f"role='{role}' state={'active' if candidate.get('tenant_id') is not None else 'required'} file='{canonical.name}'"
            )
            continue
        if not canonical.is_file():
            raise DataGuardError(f"Registered SQLite database is not a file for role '{role}': {canonical.name}")
        entry = discovered.setdefault(canonical, {"source_path": canonical, "roles": []})
        if role not in entry["roles"]:
            entry["roles"].append(role)

    if active_missing:
        raise DataGuardError(
            "Active or required SQLite database is missing: " + "; ".join(active_missing)
        )

    ordered = sorted(discovered.values(), key=lambda item: str(item["source_path"]))
    for entry in ordered:
        entry["roles"].sort()
    omitted_inactive.sort(key=lambda item: (item["tenant_id"], item["logical_role"]))
    return {"databases": ordered, "omitted_inactive": omitted_inactive}


def discover_databases(
    *,
    config_db_url: str,
    default_db_url: str,
    backend_root: Path,
) -> list[dict[str, Any]]:
    return discover_database_inventory(
        config_db_url=config_db_url,
        default_db_url=default_db_url,
        backend_root=backend_root,
    )["databases"]


def _backup_one(
    source: Path,
    destination_tmp: Path,
    *,
    busy_retries: int = DEFAULT_BUSY_RETRIES,
    busy_sleep_seconds: float = DEFAULT_BUSY_SLEEP_SECONDS,
) -> None:
    if source.resolve() == destination_tmp.resolve():
        raise DataGuardError("Backup destination must not overlap the source database.")

    destination_tmp.parent.mkdir(parents=True, exist_ok=True)
    last_error: Exception | None = None
    for attempt in range(1, busy_retries + 1):
        destination_tmp.unlink(missing_ok=True)
        try:
            with closing(open_sqlite_readonly(source)) as source_connection:
                destination_connection = sqlite3.connect(destination_tmp, timeout=5.0)
                try:
                    destination_connection.execute("PRAGMA journal_mode=DELETE")
                    source_connection.backup(
                        destination_connection,
                        pages=1024,
                        sleep=busy_sleep_seconds,
                    )
                    destination_connection.commit()
                finally:
                    destination_connection.close()
            return
        except sqlite3.OperationalError as exc:
            last_error = exc
            if "locked" not in str(exc).lower() and "busy" not in str(exc).lower():
                break
            if attempt < busy_retries:
                time.sleep(busy_sleep_seconds * attempt)
        except sqlite3.Error as exc:
            last_error = exc
            break

    destination_tmp.unlink(missing_ok=True)
    error_name = last_error.__class__.__name__ if last_error else "UnknownError"
    raise DataGuardError(f"Online SQLite backup failed for {source.name}: {error_name}")


def _safe_relative_path(value: str) -> PurePosixPath:
    if not isinstance(value, str) or not value.strip():
        raise DataGuardError("Manifest database path is empty.")
    relative = PurePosixPath(value)
    if relative.is_absolute() or ".." in relative.parts:
        raise DataGuardError(f"Unsafe manifest path: {value}")
    if any(part in {"", "."} for part in relative.parts):
        raise DataGuardError(f"Unsafe manifest path: {value}")
    return relative


def _write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def create_snapshot(
    *,
    output_root: Path,
    config_db_url: str,
    default_db_url: str,
    backend_root: Path,
    operation_id: str | None = None,
    backup_one: Callable[..., None] = _backup_one,
) -> Path:
    operation_id = operation_id or new_operation_id()
    output_root = output_root.expanduser().resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    snapshot_name = f"snapshot-{utc_timestamp().replace(':', '').replace('-', '')}-{operation_id}"
    final_snapshot = output_root / snapshot_name
    staging_snapshot = output_root / f".{snapshot_name}.partial"

    if final_snapshot.exists() or staging_snapshot.exists():
        raise DataGuardError(f"Snapshot destination already exists for operation {operation_id}.")

    inventory = discover_database_inventory(
        config_db_url=config_db_url,
        default_db_url=default_db_url,
        backend_root=backend_root,
    )
    databases = inventory["databases"]
    omitted_inactive = inventory["omitted_inactive"]

    source_paths = {entry["source_path"].resolve() for entry in databases}
    if output_root in source_paths:
        raise DataGuardError("Backup root must not be a database file.")

    manifest_entries: list[dict[str, Any]] = []
    staging_snapshot.mkdir(parents=True, exist_ok=False)
    try:
        database_dir = staging_snapshot / "databases"
        database_dir.mkdir()
        for index, entry in enumerate(databases, start=1):
            source_path: Path = entry["source_path"]
            source_integrity = integrity_check(source_path, quick=True)
            relative_path = PurePosixPath("databases") / f"db-{index:03d}.sqlite3"
            destination = staging_snapshot.joinpath(*relative_path.parts)
            temporary = destination.with_suffix(destination.suffix + ".tmp")
            if destination.resolve() in source_paths or temporary.resolve() in source_paths:
                raise DataGuardError("Backup destination overlaps a live source database.")

            backup_one(source_path, temporary)
            backup_integrity = integrity_check(temporary, quick=False)
            os.replace(temporary, destination)
            manifest_entries.append({
                "logical_roles": list(entry["roles"]),
                "relative_path": relative_path.as_posix(),
                "size_bytes": destination.stat().st_size,
                "sha256": sha256_file(destination),
                "source_quick_check": source_integrity,
                "backup_integrity_check": backup_integrity,
            })

        manifest = {
            "manifest_version": MANIFEST_VERSION,
            "tool": TOOL_NAME,
            "tool_version": TOOL_VERSION,
            "operation_id": operation_id,
            "created_at": utc_timestamp(),
            "database_count": len(manifest_entries),
            "databases": manifest_entries,
            "omitted_inactive_count": len(omitted_inactive),
            "omitted_inactive_databases": omitted_inactive,
        }
        _write_json_atomic(staging_snapshot / "manifest.json", manifest)
        os.replace(staging_snapshot, final_snapshot)
        return final_snapshot
    except Exception:
        shutil.rmtree(staging_snapshot, ignore_errors=True)
        raise


def load_and_validate_manifest(snapshot_dir: Path) -> dict[str, Any]:
    snapshot_dir = snapshot_dir.expanduser().resolve()
    manifest_path = snapshot_dir / "manifest.json"
    if not manifest_path.is_file():
        raise DataGuardError("Snapshot manifest.json is missing.")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DataGuardError("Snapshot manifest is unreadable or invalid JSON.") from exc

    if manifest.get("manifest_version") != MANIFEST_VERSION:
        raise DataGuardError("Unsupported snapshot manifest version.")
    if manifest.get("tool") != TOOL_NAME:
        raise DataGuardError("Snapshot was not created by the SysGrid production data guard.")
    databases = manifest.get("databases")
    if not isinstance(databases, list) or not databases:
        raise DataGuardError("Snapshot manifest contains no databases.")
    if manifest.get("database_count") != len(databases):
        raise DataGuardError("Snapshot database count does not match the manifest entries.")
    omitted = manifest.get("omitted_inactive_databases", [])
    if not isinstance(omitted, list):
        raise DataGuardError("Snapshot omitted inactive database list is malformed.")
    if manifest.get("omitted_inactive_count", len(omitted)) != len(omitted):
        raise DataGuardError("Snapshot omitted inactive database count does not match the manifest entries.")
    for entry in omitted:
        if not isinstance(entry, dict):
            raise DataGuardError("Snapshot omitted inactive database entry is malformed.")
        if entry.get("state") != "inactive" or entry.get("reason") != "registered database file is missing":
            raise DataGuardError("Snapshot omitted database entry is not an approved inactive-missing record.")
        if not isinstance(entry.get("tenant_id"), int):
            raise DataGuardError("Snapshot omitted inactive database tenant id is malformed.")
        for key in ("logical_role", "tenant_name", "database_filename"):
            value = entry.get(key)
            if not isinstance(value, str) or not value or "/" in value or "\\" in value:
                raise DataGuardError("Snapshot omitted inactive database metadata is unsafe.")

    snapshot_root = snapshot_dir.resolve()
    seen_paths: set[str] = set()
    for entry in databases:
        if not isinstance(entry, dict):
            raise DataGuardError("Snapshot database entry is malformed.")
        relative = _safe_relative_path(entry.get("relative_path"))
        relative_text = relative.as_posix()
        if relative_text in seen_paths:
            raise DataGuardError("Snapshot manifest contains a duplicate database path.")
        seen_paths.add(relative_text)
        database_path = snapshot_dir.joinpath(*relative.parts).resolve()
        try:
            database_path.relative_to(snapshot_root)
        except ValueError as exc:
            raise DataGuardError(f"Snapshot path escapes its root: {relative_text}") from exc
        if not database_path.is_file():
            raise DataGuardError(f"Snapshot database is missing: {relative_text}")
        expected_size = entry.get("size_bytes")
        if not isinstance(expected_size, int) or database_path.stat().st_size != expected_size:
            raise DataGuardError(f"Snapshot size check failed: {relative_text}")
        expected_hash = entry.get("sha256")
        if not isinstance(expected_hash, str) or sha256_file(database_path) != expected_hash:
            raise DataGuardError(f"Snapshot checksum check failed: {relative_text}")
        if entry.get("backup_integrity_check") != "ok":
            raise DataGuardError(f"Snapshot manifest lacks a successful integrity result: {relative_text}")
        integrity_check(database_path, quick=False)
    return manifest


def restore_snapshot(*, snapshot_dir: Path, target_root: Path) -> Path:
    snapshot_dir = snapshot_dir.expanduser().resolve()
    target_root = target_root.expanduser().resolve()
    manifest = load_and_validate_manifest(snapshot_dir)

    if target_root == snapshot_dir or snapshot_dir in target_root.parents:
        raise DataGuardError("Restore target must be isolated from the snapshot directory.")
    if target_root.exists() and any(target_root.iterdir()):
        raise DataGuardError("Restore target must not contain existing files.")

    staging = target_root.with_name(target_root.name + ".partial")
    if staging.exists():
        raise DataGuardError("A previous partial restore exists; remove it before retrying.")
    target_root.parent.mkdir(parents=True, exist_ok=True)
    staging.mkdir(parents=True, exist_ok=False)
    try:
        for entry in manifest["databases"]:
            relative = _safe_relative_path(entry["relative_path"])
            source = snapshot_dir.joinpath(*relative.parts)
            destination = staging.joinpath(*relative.parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)
            if destination.stat().st_size != entry["size_bytes"]:
                raise DataGuardError(f"Restored size check failed: {relative.as_posix()}")
            if sha256_file(destination) != entry["sha256"]:
                raise DataGuardError(f"Restored checksum check failed: {relative.as_posix()}")
            integrity_check(destination, quick=False)

        restore_record = {
            "manifest_version": MANIFEST_VERSION,
            "source_operation_id": manifest["operation_id"],
            "restored_at": utc_timestamp(),
            "database_count": manifest["database_count"],
        }
        _write_json_atomic(staging / "restore-record.json", restore_record)
        if target_root.exists():
            target_root.rmdir()
        os.replace(staging, target_root)
        return target_root
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise


def rehearse_migrations(
    *,
    snapshot_dir: Path,
    backend_root: Path,
    work_root: Path | None = None,
    runner: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
) -> dict[str, Any]:
    manifest = load_and_validate_manifest(snapshot_dir)
    backend_root = backend_root.expanduser().resolve()
    if not (backend_root / "alembic.ini").is_file():
        raise DataGuardError("backend/alembic.ini is missing; migration rehearsal cannot run.")

    managed_temp: tempfile.TemporaryDirectory[str] | None = None
    if work_root is None:
        managed_temp = tempfile.TemporaryDirectory(prefix="sysgrid-migration-rehearsal-")
        work_root = Path(managed_temp.name) / "restore"
    else:
        work_root = work_root.expanduser().resolve()

    try:
        restored_root = restore_snapshot(snapshot_dir=snapshot_dir, target_root=work_root)
        results: list[dict[str, Any]] = []
        for entry in manifest["databases"]:
            roles = [str(role) for role in entry.get("logical_roles", [])]
            if roles and all(role == "config" for role in roles):
                results.append({
                    "logical_roles": roles,
                    "status": "skipped",
                    "reason": "Config database schema is managed by SQLAlchemy create_all, not Alembic.",
                })
                continue
            relative = _safe_relative_path(entry["relative_path"])
            restored_db = restored_root.joinpath(*relative.parts).resolve()
            environment = os.environ.copy()
            environment["SQLALCHEMY_DATABASE_URL"] = sqlite_url_for_path(restored_db)
            completed = runner(
                [sys.executable, "-m", "alembic", "upgrade", "head"],
                cwd=str(backend_root),
                env=environment,
                capture_output=True,
                text=True,
                check=False,
            )
            if completed.returncode != 0:
                raise DataGuardError(
                    "Migration rehearsal failed for "
                    f"{','.join(roles) or relative.as_posix()}: return code {completed.returncode}"
                )
            integrity_check(restored_db, quick=False)
            results.append({"logical_roles": roles, "status": "passed"})
        return {
            "operation_id": manifest["operation_id"],
            "restored_root": str(restored_root),
            "results": results,
            "limitation": "Config database schema is validated and restored but is not Alembic-managed.",
        }
    finally:
        if managed_temp is not None:
            managed_temp.cleanup()


def _require_environment(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise DataGuardError(f"{name} must be explicitly configured.")
    return value


def _environment_flag(name: str, *, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off", ""}:
        return False
    raise DataGuardError(f"{name} must be a boolean value.")


def validate_production_migration_policy() -> str:
    environment = os.getenv("ENVIRONMENT", "").strip().lower()
    if environment != "production":
        raise DataGuardError("ENVIRONMENT must be explicitly set to production for workhorse verification.")
    auto_requested = _environment_flag("AUTO_MIGRATE_ON_STARTUP", default=True)
    production_ack = _environment_flag("ALLOW_AUTO_MIGRATE_IN_PRODUCTION", default=False)
    if auto_requested and production_ack:
        return "automatic_explicitly_acknowledged"
    return "operator_managed"


def run_existing_preflight(repo_root: Path) -> None:
    preflight = repo_root / "scripts" / "production-preflight.py"
    if not preflight.is_file():
        raise DataGuardError("scripts/production-preflight.py is missing.")
    completed = subprocess.run(
        [sys.executable, str(preflight)],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        diagnostic = (completed.stdout + "\n" + completed.stderr).strip().splitlines()
        summary = diagnostic[-1] if diagnostic else f"exit {completed.returncode}"
        raise DataGuardError(f"Production preflight failed: {summary}")


def verify_workhorse(*, repo_root: Path, backup_root: Path, keep_drill: bool = False) -> Path:
    repo_root = repo_root.expanduser().resolve()
    backend_root = repo_root / "backend"
    operation_id = new_operation_id()
    print(f"OPERATION_ID: {operation_id}")

    run_existing_preflight(repo_root)
    print("PASS: production configuration preflight")

    migration_policy = validate_production_migration_policy()
    print(f"PASS: production startup schema policy ({migration_policy})")

    config_url = _require_environment("CONFIG_DATABASE_URL")
    default_url = _require_environment("DATABASE_URL")
    snapshot = create_snapshot(
        output_root=backup_root,
        config_db_url=config_url,
        default_db_url=default_url,
        backend_root=backend_root,
        operation_id=operation_id,
    )
    manifest = load_and_validate_manifest(snapshot)
    print(f"PASS: transaction-consistent snapshot ({snapshot.name})")
    omitted_count = int(manifest.get("omitted_inactive_count", 0))
    if omitted_count:
        print(f"WARN: omitted {omitted_count} inactive tenant registration(s) whose database files are already missing")

    drill_parent = backup_root.expanduser().resolve() / "drills"
    drill_root = drill_parent / f"restore-{operation_id}"
    restore_snapshot(snapshot_dir=snapshot, target_root=drill_root)
    print("PASS: isolated restore and checksum/integrity verification")

    rehearse_migrations(snapshot_dir=snapshot, backend_root=backend_root, work_root=drill_root.with_name(drill_root.name + "-migration"))
    print("PASS: isolated migration rehearsal")

    if not keep_drill:
        shutil.rmtree(drill_root, ignore_errors=True)
        shutil.rmtree(drill_root.with_name(drill_root.name + "-migration"), ignore_errors=True)
    print("PASS: production data durability verification")
    return snapshot



def classify_test_residue(*, tenant_name: str, database_path: Path) -> str | None:
    """Return a narrow, explainable reason when a missing tenant is proven test residue."""
    normalized_name = (tenant_name or "").strip()
    normalized_path = database_path.expanduser().resolve().as_posix().lower()

    if TEST_RESIDUE_TIMESTAMP_PATTERN.fullmatch(normalized_name):
        return "timestamped frontend test tenant name"
    if TEST_RESIDUE_BETA_PATTERN.fullmatch(normalized_name):
        return "tenant-isolation test tenant name"
    if TEST_RESIDUE_BACKEND_PATTERN.fullmatch(normalized_name):
        return "backend tenant-workflow test tenant name"

    ephemeral_markers = (
        "/pytest-of-",
        "/.pytest_cache/",
        "/private/var/folders/",
        "/var/folders/",
        "/tmp/pytest-",
    )
    if any(marker in normalized_path for marker in ephemeral_markers) and (
        "pytest" in normalized_path or "test_" in database_path.name.lower()
    ):
        return "database path is inside an ephemeral pytest workspace"
    return None


def build_test_residue_reconciliation_plan(
    *,
    config_db_url: str,
    default_db_url: str,
    backend_root: Path,
) -> dict[str, Any]:
    backend_root = backend_root.expanduser().resolve()
    config_path = sqlite_path_from_url(config_db_url, backend_root=backend_root)
    default_path = sqlite_path_from_url(default_db_url, backend_root=backend_root)
    if not config_path.is_file():
        raise DataGuardError("Config database is missing; registry reconciliation is impossible.")
    if not default_path.is_file():
        raise DataGuardError("Default database is missing; registry reconciliation must not hide required data loss.")

    candidates: list[dict[str, Any]] = []
    ambiguous: list[dict[str, Any]] = []
    for tenant in _load_registered_tenants(config_path):
        tenant_path = sqlite_path_from_url(tenant["db_url"], backend_root=backend_root)
        if tenant_path.is_file() or not tenant["is_active"]:
            continue
        reason = classify_test_residue(
            tenant_name=tenant["name"],
            database_path=tenant_path,
        )
        entry = {
            "tenant_id": tenant["id"],
            "tenant_name": sanitize_role_fragment(tenant["name"]),
            "database_filename": tenant_path.name,
        }
        if reason:
            entry["classification"] = reason
            candidates.append(entry)
        else:
            ambiguous.append(entry)

    candidates.sort(key=lambda item: item["tenant_id"])
    ambiguous.sort(key=lambda item: item["tenant_id"])
    return {
        "tool": TOOL_NAME,
        "tool_version": TOOL_VERSION,
        "action": "deactivate_only",
        "candidate_count": len(candidates),
        "ambiguous_blocker_count": len(ambiguous),
        "candidates": candidates,
        "ambiguous_blockers": ambiguous,
        "reversible": True,
        "deletes_rows": False,
        "deletes_database_files": False,
    }


def reconcile_test_residue(
    *,
    config_db_url: str,
    default_db_url: str,
    backend_root: Path,
    expected_candidate_count: int,
    evidence_root: Path | None = None,
    apply_token: str = "",
    maintenance_token: str = "",
) -> dict[str, Any]:
    """Preview or reversibly deactivate only verified missing test-residue tenants."""
    backend_root = backend_root.expanduser().resolve()
    plan = build_test_residue_reconciliation_plan(
        config_db_url=config_db_url,
        default_db_url=default_db_url,
        backend_root=backend_root,
    )
    if plan["ambiguous_blocker_count"]:
        raise DataGuardError(
            "Registry contains active missing databases that are not proven test residue; "
            "no reconciliation was performed."
        )
    if plan["candidate_count"] != expected_candidate_count:
        raise DataGuardError(
            "Verified test-residue candidate count changed: "
            f"expected {expected_candidate_count}, found {plan['candidate_count']}."
        )

    applying = bool(apply_token or maintenance_token)
    if not applying:
        return {**plan, "mode": "preview", "applied": False}
    if apply_token != TEST_RESIDUE_APPLY_TOKEN:
        raise DataGuardError("Invalid test-residue apply token.")
    if maintenance_token != TEST_RESIDUE_MAINTENANCE_TOKEN:
        raise DataGuardError("Registry reconciliation requires explicit APP-STOPPED maintenance acknowledgement.")
    if evidence_root is None:
        raise DataGuardError("An evidence root outside the repository is required for reconciliation apply.")

    config_path = sqlite_path_from_url(config_db_url, backend_root=backend_root)
    operation_id = new_operation_id()
    evidence_dir = evidence_root.expanduser().resolve() / f"registry-reconcile-{operation_id}"
    evidence_dir.mkdir(parents=True, exist_ok=False)
    config_backup_tmp = evidence_dir / "config-before.db.tmp"
    config_backup = evidence_dir / "config-before.db"
    plan_path = evidence_dir / "plan.json"
    result_path = evidence_dir / "result.json"

    _write_json_atomic(plan_path, {
        **plan,
        "operation_id": operation_id,
        "created_at": utc_timestamp(),
        "status": "planned",
    })
    before_hash = sha256_file(config_path)
    _backup_one(config_path, config_backup_tmp)
    integrity_check(config_backup_tmp)
    os.replace(config_backup_tmp, config_backup)
    backup_hash = sha256_file(config_backup)

    try:
        connection = sqlite3.connect(config_path, timeout=5.0)
        try:
            connection.execute("PRAGMA busy_timeout=5000")
            connection.execute("BEGIN IMMEDIATE")
            for candidate in plan["candidates"]:
                row = connection.execute(
                    "SELECT name, db_url, is_active FROM tenants WHERE id = ?",
                    (candidate["tenant_id"],),
                ).fetchone()
                if not row:
                    raise DataGuardError(
                        f"Tenant {candidate['tenant_id']} disappeared before reconciliation."
                    )
                name, db_url, is_active = row
                tenant_path = sqlite_path_from_url(str(db_url), backend_root=backend_root)
                reason = classify_test_residue(
                    tenant_name=str(name or ""),
                    database_path=tenant_path,
                )
                if not bool(is_active) or tenant_path.exists() or not reason:
                    raise DataGuardError(
                        f"Tenant {candidate['tenant_id']} no longer matches the verified test-residue plan."
                    )
                connection.execute(
                    "UPDATE tenants SET is_active = 0 WHERE id = ? AND is_active = 1",
                    (candidate["tenant_id"],),
                )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

        integrity_check(config_path)
        after_hash = sha256_file(config_path)
        after_plan = build_test_residue_reconciliation_plan(
            config_db_url=config_db_url,
            default_db_url=default_db_url,
            backend_root=backend_root,
        )
        if after_plan["candidate_count"] or after_plan["ambiguous_blocker_count"]:
            raise DataGuardError("Registry reconciliation verification found remaining active missing blockers.")

        result = {
            **plan,
            "mode": "apply",
            "applied": True,
            "operation_id": operation_id,
            "completed_at": utc_timestamp(),
            "status": "passed",
            "config_backup_filename": config_backup.name,
            "config_backup_sha256": backup_hash,
            "config_sha256_before": before_hash,
            "config_sha256_after": after_hash,
            "deactivated_tenant_count": plan["candidate_count"],
            "rollback": "Restore config-before.db only while the application is stopped, or reactivate a reviewed tenant after its database is recovered.",
        }
        _write_json_atomic(result_path, result)
        return {**result, "evidence_directory": str(evidence_dir)}
    except Exception:
        config_backup_tmp.unlink(missing_ok=True)
        raise


def audit_registry(*, config_db_url: str, default_db_url: str, backend_root: Path) -> dict[str, Any]:
    backend_root = backend_root.expanduser().resolve()
    config_path = sqlite_path_from_url(config_db_url, backend_root=backend_root)
    default_path = sqlite_path_from_url(default_db_url, backend_root=backend_root)
    entries: list[dict[str, Any]] = []
    entries.append({
        "logical_role": "config",
        "state": "required",
        "database_filename": config_path.name,
        "exists": config_path.is_file(),
        "test_residue_candidate": False,
    })
    entries.append({
        "logical_role": "default",
        "state": "required",
        "database_filename": default_path.name,
        "exists": default_path.is_file(),
        "test_residue_candidate": False,
    })
    for tenant in _load_registered_tenants(config_path):
        tenant_path = sqlite_path_from_url(tenant["db_url"], backend_root=backend_root)
        exists = tenant_path.is_file()
        state = "active" if tenant["is_active"] else "inactive"
        residue_reason = None
        if state == "active" and not exists:
            residue_reason = classify_test_residue(
                tenant_name=tenant["name"],
                database_path=tenant_path,
            )
        entry = {
            "logical_role": f"tenant-{tenant['id']}-{sanitize_role_fragment(tenant['name'])}",
            "tenant_id": tenant["id"],
            "tenant_name": sanitize_role_fragment(tenant["name"]),
            "state": state,
            "database_filename": tenant_path.name,
            "exists": exists,
            "test_residue_candidate": bool(residue_reason),
        }
        if residue_reason:
            entry["test_residue_reason"] = residue_reason
        entries.append(entry)
    blockers = [entry for entry in entries if entry["state"] in {"required", "active"} and not entry["exists"]]
    omissions = [entry for entry in entries if entry["state"] == "inactive" and not entry["exists"]]
    candidates = [entry for entry in blockers if entry.get("test_residue_candidate")]
    ambiguous = [entry for entry in blockers if not entry.get("test_residue_candidate")]
    return {
        "registry_entry_count": len(entries),
        "blocker_count": len(blockers),
        "test_residue_candidate_count": len(candidates),
        "ambiguous_blocker_count": len(ambiguous),
        "omittable_inactive_count": len(omissions),
        "entries": entries,
    }

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit_parser = subparsers.add_parser("audit", help="Audit required, active, and inactive database registry entries.")
    audit_parser.add_argument("--config-db-url", default=os.getenv("CONFIG_DATABASE_URL", ""))
    audit_parser.add_argument("--default-db-url", default=os.getenv("DATABASE_URL", ""))

    reconcile_parser = subparsers.add_parser(
        "reconcile-test-residue",
        help="Preview or reversibly deactivate verified missing test-created tenant registrations.",
    )
    reconcile_parser.add_argument("--config-db-url", default=os.getenv("CONFIG_DATABASE_URL", ""))
    reconcile_parser.add_argument("--default-db-url", default=os.getenv("DATABASE_URL", ""))
    reconcile_parser.add_argument("--expected-candidates", type=int, required=True)
    reconcile_parser.add_argument("--evidence-root", type=Path)
    reconcile_parser.add_argument("--apply-token", default="")
    reconcile_parser.add_argument("--maintenance-token", default="")

    snapshot_parser = subparsers.add_parser("snapshot", help="Create an online SQLite snapshot.")
    snapshot_parser.add_argument("--output-root", type=Path, required=True)
    snapshot_parser.add_argument("--config-db-url", default=os.getenv("CONFIG_DATABASE_URL", ""))
    snapshot_parser.add_argument("--default-db-url", default=os.getenv("DATABASE_URL", ""))

    restore_parser = subparsers.add_parser("restore", help="Restore a snapshot to an isolated target.")
    restore_parser.add_argument("--snapshot", type=Path, required=True)
    restore_parser.add_argument("--target-root", type=Path, required=True)

    rehearse_parser = subparsers.add_parser("rehearse", help="Restore and rehearse tenant migrations in isolation.")
    rehearse_parser.add_argument("--snapshot", type=Path, required=True)
    rehearse_parser.add_argument("--work-root", type=Path)

    verify_parser = subparsers.add_parser("verify", help="Run preflight, snapshot, restore, and migration rehearsal.")
    verify_parser.add_argument("--backup-root", type=Path, required=True)
    verify_parser.add_argument("--keep-drill", action="store_true")
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    repo_root: Path = args.repo_root.expanduser().resolve()
    backend_root = repo_root / "backend"
    try:
        if args.command == "audit":
            if not args.config_db_url or not args.default_db_url:
                raise DataGuardError("CONFIG_DATABASE_URL and DATABASE_URL are required for audit.")
            result = audit_registry(
                config_db_url=args.config_db_url,
                default_db_url=args.default_db_url,
                backend_root=backend_root,
            )
            print(json.dumps(result, indent=2, sort_keys=True))
            if result["blocker_count"]:
                raise DataGuardError(f"Registry audit found {result['blocker_count']} active or required missing database(s).")
            print("PASS: registry audit completed")
        elif args.command == "reconcile-test-residue":
            if not args.config_db_url or not args.default_db_url:
                raise DataGuardError("CONFIG_DATABASE_URL and DATABASE_URL are required for reconciliation.")
            result = reconcile_test_residue(
                config_db_url=args.config_db_url,
                default_db_url=args.default_db_url,
                backend_root=backend_root,
                expected_candidate_count=args.expected_candidates,
                evidence_root=args.evidence_root,
                apply_token=args.apply_token,
                maintenance_token=args.maintenance_token,
            )
            print(json.dumps(result, indent=2, sort_keys=True))
            print(
                "PASS: verified test-residue registry reconciliation applied"
                if result["applied"]
                else "PASS: verified test-residue reconciliation preview"
            )
        elif args.command == "snapshot":
            if not args.config_db_url or not args.default_db_url:
                raise DataGuardError("CONFIG_DATABASE_URL and DATABASE_URL are required for snapshot.")
            snapshot = create_snapshot(
                output_root=args.output_root,
                config_db_url=args.config_db_url,
                default_db_url=args.default_db_url,
                backend_root=backend_root,
            )
            print(f"PASS: snapshot created: {snapshot}")
        elif args.command == "restore":
            restored = restore_snapshot(snapshot_dir=args.snapshot, target_root=args.target_root)
            print(f"PASS: isolated restore completed: {restored}")
        elif args.command == "rehearse":
            result = rehearse_migrations(
                snapshot_dir=args.snapshot,
                backend_root=backend_root,
                work_root=args.work_root,
            )
            print(json.dumps(result, indent=2, sort_keys=True))
            print("PASS: migration rehearsal completed")
        elif args.command == "verify":
            verify_workhorse(
                repo_root=repo_root,
                backup_root=args.backup_root,
                keep_drill=args.keep_drill,
            )
        else:  # pragma: no cover - argparse enforces valid commands
            parser.error(f"Unsupported command: {args.command}")
        return 0
    except DataGuardError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
