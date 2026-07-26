#!/usr/bin/env python3
"""Read-only guard for SysGrid's corporate-native dual-project publish contract.

The corporate platform publishes two independent projects:
- backend/ as FastAPI
- frontend/ as Node/React

This guard validates source-level publishability without requiring Docker, Compose,
company-specific URLs, network access, or live deployment credentials.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class CheckResult:
    name: str
    status: str
    detail: str


class Guard:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.results: list[CheckResult] = []

    def pass_(self, name: str, detail: str) -> None:
        self.results.append(CheckResult(name, "PASS", detail))

    def warn(self, name: str, detail: str) -> None:
        self.results.append(CheckResult(name, "WARN", detail))

    def fail(self, name: str, detail: str) -> None:
        self.results.append(CheckResult(name, "FAIL", detail))

    def require_file(self, relative: str, *, nonempty: bool = True) -> Path | None:
        path = self.root / relative
        if not path.is_file():
            self.fail(f"file:{relative}", "required file is missing")
            return None
        if nonempty and path.stat().st_size == 0:
            self.fail(f"file:{relative}", "required file is empty")
            return None
        self.pass_(f"file:{relative}", "present")
        return path

    def require_tokens(self, relative: str, tokens: Iterable[str], check_name: str) -> None:
        path = self.root / relative
        if not path.is_file():
            self.fail(check_name, f"cannot inspect missing {relative}")
            return
        text = path.read_text(encoding="utf-8")
        missing = [token for token in tokens if token not in text]
        if missing:
            self.fail(check_name, "missing required contract tokens: " + ", ".join(missing))
        else:
            self.pass_(check_name, "required contract tokens are present")

    def check_project_roots(self) -> None:
        backend = self.root / "backend"
        frontend = self.root / "frontend"
        if backend.is_dir() and frontend.is_dir() and backend.resolve() != frontend.resolve():
            self.pass_("project-boundaries", "backend/ and frontend/ remain independent project roots")
        else:
            self.fail("project-boundaries", "backend/ and frontend/ must exist as distinct roots")

    def check_backend(self) -> None:
        requirements = self.require_file("backend/requirements.txt")
        self.require_file("backend/requirements.lock")
        self.require_file("backend/app/main.py")
        self.require_file("backend/app/core/config.py")

        self.require_tokens(
            "backend/app/main.py",
            (
                "app = FastAPI",
                "/health",
                "/readiness",
            ),
            "backend-fastapi-entrypoint",
        )
        self.require_tokens(
            "backend/app/core/config.py",
            (
                "PORT:",
                "ENVIRONMENT:",
                "BACKEND_CORS_ORIGINS:",
                "ALLOWED_HOSTS:",
                "IDENTITY_MODE:",
                "TRUSTED_PROXY_USER_HEADER:",
                "DATABASE_URL:",
                "CONFIG_DATABASE_URL:",
                "TENANT_STORAGE_ROOT:",
            ),
            "backend-corporate-env-contract",
        )

        if requirements:
            unpinned = []
            for raw in requirements.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or line.startswith("-"):
                    continue
                if not re.search(r"(?:===|==|@\s*file:|@\s*https?://)", line):
                    unpinned.append(line.split(";", 1)[0].strip())
            if unpinned:
                self.warn(
                    "backend-native-installer-pinning",
                    "requirements.txt contains unpinned entries; keep it for platform compatibility, "
                    "but use requirements.lock whenever the corporate publisher supports an explicit install command",
                )
            else:
                self.pass_("backend-native-installer-pinning", "requirements.txt is fully pinned")

    def check_frontend(self) -> None:
        package_path = self.require_file("frontend/package.json")
        lock_path = self.require_file("frontend/package-lock.json")
        self.require_file("frontend/src/api/apiClient.ts")
        self.require_file("frontend/src/main.tsx")

        if package_path:
            try:
                package = json.loads(package_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                self.fail("frontend-package-json", f"invalid package.json: {exc.__class__.__name__}")
            else:
                scripts = package.get("scripts") or {}
                build = str(scripts.get("build") or "")
                if package.get("private") is True and build:
                    self.pass_("frontend-native-build", f"independent build script is defined: {build}")
                else:
                    self.fail("frontend-native-build", "package.json must be private and define scripts.build")

                coupled = [
                    f"{name}={command}"
                    for name, command in scripts.items()
                    if re.search(r"(?:\.\./backend|\bpython(?:3)?\b|\buvicorn\b)", str(command), re.I)
                ]
                if coupled:
                    self.fail(
                        "frontend-project-independence",
                        "frontend scripts must not launch or depend on backend filesystem/runtime commands: "
                        + "; ".join(coupled),
                    )
                else:
                    self.pass_("frontend-project-independence", "frontend scripts do not launch the backend")

                node_engine = str((package.get("engines") or {}).get("node") or "").strip()
                if node_engine:
                    self.pass_("frontend-node-contract", f"Node engine is declared: {node_engine}")
                else:
                    self.warn("frontend-node-contract", "package.json does not declare engines.node")

        if lock_path:
            try:
                lock = json.loads(lock_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                self.fail("frontend-lockfile", f"invalid package-lock.json: {exc.__class__.__name__}")
            else:
                version = lock.get("lockfileVersion")
                if isinstance(version, int) and version >= 2:
                    self.pass_("frontend-lockfile", f"npm lockfileVersion {version}")
                else:
                    self.fail("frontend-lockfile", "package-lock.json must use lockfileVersion 2 or newer")

        self.require_tokens(
            "frontend/src/api/apiClient.ts",
            (
                "VITE_API_BASE_URL",
                "VITE_IDENTITY_MODE",
                "trusted_proxy",
                "credentials:",
            ),
            "frontend-separate-service-url-contract",
        )
        self.require_tokens(
            "frontend/src/main.tsx",
            (
                "VITE_API_BASE_URL",
                "/api/v1/settings/bootstrap",
                "Cross-origin deployment detected",
            ),
            "frontend-bootstrap-routing-contract",
        )

    @staticmethod
    def parse_env_keys(path: Path) -> set[str]:
        keys: set[str] = set()
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key = line.split("=", 1)[0].strip()
            if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
                keys.add(key)
        return keys

    def check_env_examples(self) -> None:
        backend_path = self.require_file("deploy/backend.env.production.example")
        frontend_path = self.require_file("deploy/frontend.env.production.example")
        if backend_path:
            required = {
                "ENVIRONMENT",
                "BACKEND_CORS_ORIGINS",
                "ALLOWED_HOSTS",
                "IDENTITY_MODE",
                "TRUSTED_PROXY_USER_HEADER",
                "DATABASE_URL",
                "CONFIG_DATABASE_URL",
                "TENANT_STORAGE_ROOT",
            }
            missing = sorted(required - self.parse_env_keys(backend_path))
            if missing:
                self.fail("backend-env-example", "missing keys: " + ", ".join(missing))
            else:
                self.pass_("backend-env-example", "production backend environment contract is documented")
        if frontend_path:
            required = {"VITE_API_BASE_URL", "VITE_IDENTITY_MODE"}
            missing = sorted(required - self.parse_env_keys(frontend_path))
            if missing:
                self.fail("frontend-env-example", "missing keys: " + ", ".join(missing))
            else:
                self.pass_("frontend-env-example", "separate corporate backend URL and identity mode are documented")

    def check_docs(self) -> None:
        deployment = self.require_file("DEPLOYMENT.md")
        if deployment:
            text = deployment.read_text(encoding="utf-8")
            required = (
                "Corporate Cloud Primary Publish Path",
                "FastAPI project",
                "Node/React project",
                "Docker and Compose are optional",
                "VITE_API_BASE_URL",
            )
            missing = [token for token in required if token not in text]
            if missing:
                self.fail("corporate-publish-docs", "missing required guidance: " + ", ".join(missing))
            else:
                self.pass_("corporate-publish-docs", "corporate-native dual-project path is explicit")

    def run(self) -> list[CheckResult]:
        self.check_project_roots()
        self.check_backend()
        self.check_frontend()
        self.check_env_examples()
        self.check_docs()
        return self.results


def render_text(results: list[CheckResult], root: Path) -> str:
    lines = [f"SysGrid corporate publishability guard: {root}"]
    for result in results:
        lines.append(f"[{result.status}] {result.name}: {result.detail}")
    failures = sum(result.status == "FAIL" for result in results)
    warnings = sum(result.status == "WARN" for result in results)
    lines.append(f"SUMMARY: pass={len(results) - failures - warnings} warn={warnings} fail={failures}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = parser.parse_args(argv)

    root = args.root.resolve()
    results = Guard(root).run()
    failures = sum(result.status == "FAIL" for result in results)
    warnings = sum(result.status == "WARN" for result in results)

    if args.json:
        payload = {
            "schema_version": 1,
            "root": str(root),
            "status": "PASS" if failures == 0 else "FAIL",
            "summary": {
                "pass": len(results) - failures - warnings,
                "warn": warnings,
                "fail": failures,
            },
            "checks": [asdict(result) for result in results],
        }
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(render_text(results, root))

    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
