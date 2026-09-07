#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
P07_TEMP_ROOT="$(mktemp -d /tmp/sysgrid-p07-architecture.XXXXXX)"
P07_CONFIG_DB="$P07_TEMP_ROOT/config.db"
P07_TENANT_DB="$P07_TEMP_ROOT/tenant.db"
P07_BACKEND_PORT="${SYSGRID_P07_BACKEND_PORT:-18071}"
P07_FRONTEND_PORT="${SYSGRID_P07_FRONTEND_PORT:-15178}"
P07_BACKEND_ORIGIN="http://127.0.0.1:$P07_BACKEND_PORT"
P07_FRONTEND_ORIGIN="http://127.0.0.1:$P07_FRONTEND_PORT"
P07_USER_ID="p07.architecture"
P07_PROOF_DIR="${SYSGRID_P07_PROOF_DIR:-$P07_TEMP_ROOT/proof}"
P07_BACKEND_PID=""
P07_FRONTEND_PID=""
mkdir -p "$P07_PROOF_DIR"

runtime_env=(
  env -u TESTING -u USER_ID -u user_name -u TRUSTED_PROXY_USER_HEADER
  "CONFIG_DATABASE_URL=sqlite+aiosqlite:///$P07_CONFIG_DB"
  "DATABASE_URL=sqlite+aiosqlite:///$P07_TENANT_DB"
  "TENANT_STORAGE_ROOT=$P07_TEMP_ROOT/tenants"
  "DEFAULT_TENANT_NAME=P07 Isolated Architecture"
  "PUBLIC_READONLY_ENABLED=false"
  "DEFAULT_USER_ID=$P07_USER_ID"
  "AUTO_ADMIN_USER_IDS=$P07_USER_ID"
  "USER_ID_ENV_VAR=SYSGRID_P07_RUNTIME_USER_ID"
  "SYSGRID_P07_RUNTIME_USER_ID=$P07_USER_ID"
  "DEFAULT_EMAIL_DOMAIN=sysgrid.test"
  "ENVIRONMENT=development"
  "IDENTITY_MODE=development"
  "ALLOWED_HOSTS=127.0.0.1,localhost,test,testserver"
  "BACKEND_CORS_ORIGINS=$P07_FRONTEND_ORIGIN"
)

cleanup() {
  [[ -n "$P07_FRONTEND_PID" ]] && kill "$P07_FRONTEND_PID" >/dev/null 2>&1 || true
  [[ -n "$P07_BACKEND_PID" ]] && kill "$P07_BACKEND_PID" >/dev/null 2>&1 || true
  if [[ "$P07_PROOF_DIR" != "$P07_TEMP_ROOT"* ]]; then
    cp "$P07_TEMP_ROOT/backend.log" "$P07_PROOF_DIR/backend.log" 2>/dev/null || true
    cp "$P07_TEMP_ROOT/frontend.log" "$P07_PROOF_DIR/frontend.log" 2>/dev/null || true
  fi
  rm -rf "$P07_TEMP_ROOT"
}
trap cleanup EXIT INT TERM

wait_for_url() { local url="$1"; for _ in {1..90}; do if curl -fsS "$url" >/dev/null 2>&1; then return 0; fi; sleep 1; done; return 1; }
if lsof -tiTCP:"$P07_BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 || lsof -tiTCP:"$P07_FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then echo "P07 proof ports are already in use." >&2; exit 1; fi
printf '%s\n' "config_db=$P07_CONFIG_DB" "tenant_db=$P07_TENANT_DB" > "$P07_PROOF_DIR/isolated-database-paths.txt"
(cd "$ROOT_DIR" && "${runtime_env[@]}" ./backend/venv/bin/python seed.py --tenant-name "P07 Isolated Architecture" --tenant-db "$P07_TENANT_DB" --admin-user "$P07_USER_ID" --no-seed-data)
(cd "$BACKEND_DIR" && exec "${runtime_env[@]}" ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$P07_BACKEND_PORT") > "$P07_TEMP_ROOT/backend.log" 2>&1 &
P07_BACKEND_PID=$!
wait_for_url "$P07_BACKEND_ORIGIN/api/v1/health"
(cd "$FRONTEND_DIR" && VITE_API_BASE_URL="$P07_BACKEND_ORIGIN" exec npm run dev -- --host 127.0.0.1 --port "$P07_FRONTEND_PORT" --strictPort) > "$P07_TEMP_ROOT/frontend.log" 2>&1 &
P07_FRONTEND_PID=$!
wait_for_url "$P07_FRONTEND_ORIGIN"
cd "$FRONTEND_DIR"
P07_REAL_BACKEND=1 SYSGRID_P07_API_ORIGIN="$P07_BACKEND_ORIGIN" SYSGRID_P07_PROOF_DIR="$P07_PROOF_DIR" PLAYWRIGHT_BASE_URL="$P07_FRONTEND_ORIGIN" npx playwright test --config=playwright.p07-architecture.config.ts
