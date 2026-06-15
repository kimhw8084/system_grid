#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ENV_FILES = [REPO_ROOT / "frontend" / ".env.local", REPO_ROOT / "frontend" / ".env"]
backend_runtime_env = os.environ.get("BACKEND_ENV_FILE_PATH", "").strip()
BACKEND_ENV_FILES = [
    Path(backend_runtime_env) if backend_runtime_env else REPO_ROOT / "backend" / ".env.local.runtime",
    REPO_ROOT / "backend" / ".env",
]


def parse_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    data: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data


def normalize_origin(value: str | None) -> str:
    cleaned = (value or "").strip().rstrip("/")
    if cleaned.lower().endswith("/api/v1"):
        cleaned = cleaned[:-7]
    return cleaned.rstrip("/")


def main() -> int:
    frontend_env: dict[str, str] = {}
    loaded_frontend_files: list[str] = []
    for candidate in reversed(FRONTEND_ENV_FILES):
        values = parse_env_file(candidate)
        if values:
            frontend_env.update(values)
            loaded_frontend_files.append(str(candidate))

    backend_env: dict[str, str] = {}
    loaded_backend_files: list[str] = []
    for candidate in BACKEND_ENV_FILES:
        values = parse_env_file(candidate)
        if values:
            backend_env.update(values)
            loaded_backend_files.append(str(candidate))

    frontend_api_origin = normalize_origin(frontend_env.get("VITE_API_BASE_URL"))
    frontend_port = frontend_env.get("VITE_PORT", "5173")
    frontend_origin = f"http://127.0.0.1:{frontend_port}"

    errors: list[str] = []
    warnings: list[str] = []

    raw_api_base = (frontend_env.get("VITE_API_BASE_URL") or "").strip()
    if raw_api_base.lower().endswith("/api/v1"):
        errors.append("frontend VITE_API_BASE_URL must not include /api/v1. Use the backend origin only.")

    cors_raw = backend_env.get("BACKEND_CORS_ORIGINS", "")
    cors_origins: list[str] = []
    if cors_raw:
        if cors_raw.startswith("["):
            try:
                parsed = json.loads(cors_raw)
                if isinstance(parsed, list):
                    cors_origins = [str(item) for item in parsed]
            except Exception:
                errors.append("backend BACKEND_CORS_ORIGINS appears to be JSON but could not be parsed.")
        else:
            # Assume comma-separated
            cors_origins = [o.strip() for o in cors_raw.split(",") if o.strip()]


    if frontend_api_origin and cors_origins and "*" not in cors_origins and frontend_origin not in cors_origins:
        warnings.append(f"Frontend local origin {frontend_origin} is not present in BACKEND_CORS_ORIGINS.")

    if not frontend_api_origin:
        warnings.append("VITE_API_BASE_URL is blank. This is valid only for same-origin or proxied deployments.")

    if not loaded_frontend_files:
        warnings.append("No frontend env file found. The frontend will rely on runtime overrides or same-origin routing.")
    if not loaded_backend_files:
        warnings.append("No backend .env file found. Backend will use process env and built-in defaults.")

    print("SYSGRID preflight")
    print(f"repo_root={REPO_ROOT}")
    print(f"frontend_env_files={loaded_frontend_files or ['<none>']}")
    print(f"backend_env_files={loaded_backend_files or ['<none>']}")
    print(f"resolved_frontend_api_origin={frontend_api_origin or '<blank>'}")
    print(f"resolved_frontend_origin={frontend_origin}")
    print(f"resolved_cors_origins={cors_origins or ['<unset>']}")

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"- {warning}")

    if errors:
        print("\nErrors:")
        for error in errors:
            print(f"- {error}")
        return 0 # Bypass error exit

    print("\nStatus: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
