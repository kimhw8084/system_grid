from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from .api.import_engine import EXTERNAL_IMPORT_SCHEMA_VERSION, IMPORT_PROFILES, build_snapshot_manifest
from .core.config import settings


def frontend_metadata_path() -> Path:
    backend_root = Path(__file__).resolve().parents[1]
    return backend_root.parent / "frontend" / "src" / "metadata.json"


def read_frontend_metadata() -> dict[str, Any]:
    metadata_path = frontend_metadata_path()
    try:
        return json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def frontend_build_version_hint() -> str | None:
    metadata = read_frontend_metadata()
    version = metadata.get("version")
    return str(version).strip() if version else None


def infer_sanitized_environment_mode() -> str:
    cors_origins = settings.cors_origins
    if settings.ENVIRONMENT == "test":
        return "test"
    if "*" in cors_origins:
        return "open-cors-runtime"
    if any("localhost" in origin or "127.0.0.1" in origin for origin in cors_origins):
        return "local-or-proxy-runtime"
    return "restricted-origin-runtime"


def build_import_export_contract_summary() -> dict[str, Any]:
    external_profile = IMPORT_PROFILES.get("external_entities")
    external_manifest = build_snapshot_manifest(external_profile)
    return {
        "manifest_endpoint": f"{settings.API_V1_STR}/import/snapshot/external_entities/manifest",
        "snapshot_endpoint": f"{settings.API_V1_STR}/import/snapshot/external_entities",
        "preview_endpoint": f"{settings.API_V1_STR}/import/preview-file",
        "external_profile": external_manifest.get("profile"),
        "external_schema_version": EXTERNAL_IMPORT_SCHEMA_VERSION,
        "external_contract_available": bool(external_profile),
    }


def build_readiness_payload() -> dict[str, Any]:
    return {
        "status": "ready",
        "alive": True,
        "api_prefix": settings.API_V1_STR,
        "api_version": settings.API_V1_STR.strip("/").split("/")[-1] or "v1",
        "server_timestamp": datetime.now(timezone.utc).isoformat(),
        "environment_mode": infer_sanitized_environment_mode(),
        "frontend_build_version_hint": frontend_build_version_hint(),
        "import_export_contract": build_import_export_contract_summary(),
    }
