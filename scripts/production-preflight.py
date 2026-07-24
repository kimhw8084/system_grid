#!/usr/bin/env python3
from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def run(label: str, command: list[str], cwd: Path) -> bool:
    print(f"\n== {label} ==")
    completed = subprocess.run(command, cwd=cwd)
    if completed.returncode != 0:
        print(f"FAIL: {label} exited {completed.returncode}")
        return False
    print(f"PASS: {label}")
    return True


def main() -> int:
    blockers: list[str] = []
    if not (ROOT / "frontend/package-lock.json").exists():
        blockers.append("frontend/package-lock.json is missing; dependency installation is not reproducible.")
    if not (ROOT / "backend/requirements.lock").exists():
        blockers.append("backend/requirements.lock is missing; Python dependency installation is not reproducible.")

    required_env = [
        "BACKEND_CORS_ORIGINS",
        "ALLOWED_HOSTS",
        "IDENTITY_MODE",
        "TRUSTED_PROXY_USER_HEADER",
        "DATABASE_URL",
        "CONFIG_DATABASE_URL",
        "TENANT_STORAGE_ROOT",
    ]
    if os.getenv("ENVIRONMENT", "").lower() == "production":
        for name in required_env:
            if not os.getenv(name):
                blockers.append(f"Production environment variable is missing: {name}")

    checks = [
        run("Frontend typecheck", ["npm", "run", "typecheck"], ROOT / "frontend"),
        run("Frontend build", ["npm", "run", "build"], ROOT / "frontend"),
        run("Operational contracts", ["npm", "run", "check:operational-contracts"], ROOT / "frontend"),
        run("Frontend unit tests", ["npm", "run", "test:unit"], ROOT / "frontend"),
        run("Backend tests", [sys.executable, "-m", "pytest", "-q"], ROOT / "backend"),
    ]

    print("\n== Deployment blockers ==")
    if blockers:
        for blocker in blockers:
            print(f"BLOCKER: {blocker}")
    else:
        print("No static deployment blockers detected.")

    if blockers or not all(checks):
        print("\nNOT READY FOR PRODUCTION")
        return 1
    print("\nPRE-FLIGHT PASSED. Run the full Playwright suite and backup/restore drill before release.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
