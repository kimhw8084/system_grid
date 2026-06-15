import os
import subprocess
import sys

# Match start-local.sh environment
backend_dir = os.path.join(os.getcwd(), "backend")
local_config_db = os.path.join(backend_dir, "config.local.db")
local_tenant_db = os.path.join(backend_dir, "tenants/local-demo/local_demo.db")
local_tenant_root = os.path.join(backend_dir, "tenants/local-demo")

env = os.environ.copy()
env["CONFIG_DATABASE_URL"] = f"sqlite+aiosqlite:///{local_config_db}"
env["DATABASE_URL"] = f"sqlite+aiosqlite:///{local_tenant_db}"
env["TENANT_STORAGE_ROOT"] = local_tenant_root
env["DEFAULT_TENANT_NAME"] = "Local Demo"
env["PUBLIC_READONLY_ENABLED"] = "true"
env["PUBLIC_READONLY_TENANT_NAME"] = "Local Demo"
env["DEFAULT_USER_ID"] = "haewon.kim"
env["AUTO_ADMIN_USER_IDS"] = "haewon.kim"
env["USER_ID_ENV_VAR"] = "USER_ID"
env["USER_ID"] = "haewon.kim"
env["PYTHONPATH"] = "."

cmd = [
    "./venv/bin/python", "-m", "uvicorn", "app.main:app",
    "--host", "127.0.0.1", "--port", "8000"
]

with open("backend.log", "w") as log_file:
    subprocess.Popen(cmd, cwd=backend_dir, env=env, stdout=log_file, stderr=log_file)
    print("Backend started with PID and redirected to backend.log")
