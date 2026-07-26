from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
import sys
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "corporate_publishability_guard.py"
SPEC = importlib.util.spec_from_file_location("corporate_publishability_guard", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)
Guard = MODULE.Guard


class CorporatePublishabilityGuardTests(unittest.TestCase):
    def make_tree(self) -> Path:
        root = Path(tempfile.mkdtemp())
        files = {
            "backend/requirements.txt": "fastapi\nuvicorn\n",
            "backend/requirements.lock": "fastapi==1.0\nuvicorn==1.0\n",
            "backend/app/main.py": (
                "from fastapi import FastAPI\n"
                "app = FastAPI()\n"
                "@app.get('/api/v1/health')\n"
                "def health(): return {}\n"
                "@app.get('/api/v1/readiness')\n"
                "def readiness(): return {}\n"
            ),
            "backend/app/core/config.py": "\n".join(
                [
                    "PORT: int = 8000",
                    "ENVIRONMENT: str = 'development'",
                    "BACKEND_CORS_ORIGINS: str = '*'",
                    "ALLOWED_HOSTS: str = 'localhost'",
                    "IDENTITY_MODE: str = 'development'",
                    "TRUSTED_PROXY_USER_HEADER: str = 'X-Authenticated-User'",
                    "DATABASE_URL: str = ''",
                    "CONFIG_DATABASE_URL: str = ''",
                    "TENANT_STORAGE_ROOT: str = ''",
                ]
            ),
            "frontend/package.json": json.dumps(
                {
                    "private": True,
                    "scripts": {"build": "vite build"},
                    "engines": {"node": ">=20"},
                }
            ),
            "frontend/package-lock.json": json.dumps({"lockfileVersion": 3}),
            "frontend/src/api/apiClient.ts": (
                "const a='VITE_API_BASE_URL'; const b='VITE_IDENTITY_MODE'; "
                "const c='trusted_proxy'; fetch('/', { credentials: 'include' });"
            ),
            "frontend/src/main.tsx": (
                "const a='VITE_API_BASE_URL'; const b='/api/v1/settings/bootstrap'; "
                "const c='Cross-origin deployment detected';"
            ),
            "deploy/backend.env.production.example": "\n".join(
                [
                    "ENVIRONMENT=production",
                    "BACKEND_CORS_ORIGINS=https://frontend.invalid",
                    "ALLOWED_HOSTS=backend.invalid",
                    "IDENTITY_MODE=trusted_proxy",
                    "TRUSTED_PROXY_USER_HEADER=X-Authenticated-User",
                    "DATABASE_URL=sqlite+aiosqlite:////data/default.db",
                    "CONFIG_DATABASE_URL=sqlite+aiosqlite:////data/config.db",
                    "TENANT_STORAGE_ROOT=/data/tenants",
                ]
            ),
            "deploy/frontend.env.production.example": (
                "VITE_API_BASE_URL=https://backend.invalid\nVITE_IDENTITY_MODE=trusted_proxy\n"
            ),
            "DEPLOYMENT.md": (
                "Corporate Cloud Primary Publish Path\nFastAPI project\nNode/React project\n"
                "Docker and Compose are optional\nVITE_API_BASE_URL\n"
            ),
        }
        for relative, content in files.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        return root

    def statuses(self, root: Path) -> dict[str, str]:
        return {result.name: result.status for result in Guard(root).run()}

    def test_valid_dual_project_fixture_passes(self) -> None:
        statuses = self.statuses(self.make_tree())
        self.assertNotIn("FAIL", statuses.values())
        self.assertEqual(statuses["project-boundaries"], "PASS")
        self.assertEqual(statuses["frontend-separate-service-url-contract"], "PASS")

    def test_missing_frontend_lockfile_fails(self) -> None:
        root = self.make_tree()
        (root / "frontend/package-lock.json").unlink()
        statuses = self.statuses(root)
        self.assertEqual(statuses["file:frontend/package-lock.json"], "FAIL")

    def test_frontend_script_cannot_launch_backend(self) -> None:
        root = self.make_tree()
        package_path = root / "frontend/package.json"
        package = json.loads(package_path.read_text(encoding="utf-8"))
        package["scripts"]["start"] = "cd ../backend && uvicorn app.main:app"
        package_path.write_text(json.dumps(package), encoding="utf-8")
        statuses = self.statuses(root)
        self.assertEqual(statuses["frontend-project-independence"], "FAIL")

    def test_missing_separate_api_url_contract_fails(self) -> None:
        root = self.make_tree()
        (root / "frontend/src/api/apiClient.ts").write_text(
            "fetch('/', { credentials: 'include' })", encoding="utf-8"
        )
        statuses = self.statuses(root)
        self.assertEqual(statuses["frontend-separate-service-url-contract"], "FAIL")

    def test_env_output_never_contains_values(self) -> None:
        root = self.make_tree()
        secret = "DO-NOT-PRINT-THIS-VALUE"
        env_path = root / "deploy/backend.env.production.example"
        env_path.write_text(env_path.read_text(encoding="utf-8") + f"\nPASSWORD={secret}\n", encoding="utf-8")
        results = Guard(root).run()
        rendered = MODULE.render_text(results, root)
        self.assertNotIn(secret, rendered)


if __name__ == "__main__":
    unittest.main()
