#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
P08_TEMP_ROOT="$(mktemp -d /tmp/sysgrid-p08-communication.XXXXXX)"
P08_CONFIG_DB="$P08_TEMP_ROOT/config.db"
P08_TENANT_DB="$P08_TEMP_ROOT/tenant.db"
P08_BACKEND_PORT="${SYSGRID_P08_BACKEND_PORT:-18072}"
P08_FRONTEND_PORT="${SYSGRID_P08_FRONTEND_PORT:-15179}"
P08_BACKEND_ORIGIN="http://127.0.0.1:$P08_BACKEND_PORT"
P08_FRONTEND_ORIGIN="http://127.0.0.1:$P08_FRONTEND_PORT"
P08_USER_ID="p08.communication"
P08_PROOF_DIR="${SYSGRID_P08_PROOF_DIR:-$P08_TEMP_ROOT/proof}"
P08_BACKEND_PID=""
P08_FRONTEND_PID=""
mkdir -p "$P08_PROOF_DIR"

runtime_env=(
  env -u TESTING -u USER_ID -u user_name -u TRUSTED_PROXY_USER_HEADER
  "CONFIG_DATABASE_URL=sqlite+aiosqlite:///$P08_CONFIG_DB"
  "DATABASE_URL=sqlite+aiosqlite:///$P08_TENANT_DB"
  "TENANT_STORAGE_ROOT=$P08_TEMP_ROOT/tenants"
  "DEFAULT_TENANT_NAME=P08 Isolated Communication"
  "PUBLIC_READONLY_ENABLED=false"
  "DEFAULT_USER_ID=$P08_USER_ID"
  "AUTO_ADMIN_USER_IDS=$P08_USER_ID"
  "USER_ID_ENV_VAR=SYSGRID_P08_RUNTIME_USER_ID"
  "SYSGRID_P08_RUNTIME_USER_ID=$P08_USER_ID"
  "DEFAULT_EMAIL_DOMAIN=sysgrid.test"
  "ENVIRONMENT=development"
  "IDENTITY_MODE=development"
  "ALLOWED_HOSTS=127.0.0.1,localhost,test,testserver"
  "BACKEND_CORS_ORIGINS=$P08_FRONTEND_ORIGIN"
)

cleanup() {
  [[ -n "$P08_FRONTEND_PID" ]] && kill "$P08_FRONTEND_PID" >/dev/null 2>&1 || true
  [[ -n "$P08_BACKEND_PID" ]] && kill "$P08_BACKEND_PID" >/dev/null 2>&1 || true
  if [[ "$P08_PROOF_DIR" != "$P08_TEMP_ROOT"* ]]; then
    cp "$P08_TEMP_ROOT/backend.log" "$P08_PROOF_DIR/backend.log" 2>/dev/null || true
    cp "$P08_TEMP_ROOT/frontend.log" "$P08_PROOF_DIR/frontend.log" 2>/dev/null || true
  fi
  rm -rf "$P08_TEMP_ROOT"
}
trap cleanup EXIT INT TERM

wait_for_url() { local url="$1"; for _ in {1..90}; do if curl -fsS "$url" >/dev/null 2>&1; then return 0; fi; sleep 1; done; return 1; }
if lsof -tiTCP:"$P08_BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 || lsof -tiTCP:"$P08_FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then echo "P08 proof ports are already in use." >&2; exit 1; fi
printf '%s\n' "config_db=$P08_CONFIG_DB" "tenant_db=$P08_TENANT_DB" > "$P08_PROOF_DIR/isolated-database-paths.txt"
(cd "$ROOT_DIR" && "${runtime_env[@]}" ./backend/venv/bin/python seed.py --tenant-name "P08 Isolated Communication" --tenant-db "$P08_TENANT_DB" --admin-user "$P08_USER_ID" --no-seed-data)
(cd "$BACKEND_DIR" && exec "${runtime_env[@]}" ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$P08_BACKEND_PORT") > "$P08_TEMP_ROOT/backend.log" 2>&1 &
P08_BACKEND_PID=$!
wait_for_url "$P08_BACKEND_ORIGIN/api/v1/health"
(cd "$FRONTEND_DIR" && VITE_API_BASE_URL="$P08_BACKEND_ORIGIN" exec npm run dev -- --host 127.0.0.1 --port "$P08_FRONTEND_PORT" --strictPort) > "$P08_TEMP_ROOT/frontend.log" 2>&1 &
P08_FRONTEND_PID=$!
wait_for_url "$P08_FRONTEND_ORIGIN"
cd "$FRONTEND_DIR"
P08_REAL_BACKEND=1 SYSGRID_P08_API_ORIGIN="$P08_BACKEND_ORIGIN" SYSGRID_P08_PROOF_DIR="$P08_PROOF_DIR" PLAYWRIGHT_BASE_URL="$P08_FRONTEND_ORIGIN" npx playwright test --config=playwright.p08-communication.config.ts
