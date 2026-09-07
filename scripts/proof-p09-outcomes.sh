#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
P09_TEMP_ROOT="$(mktemp -d /tmp/sysgrid-p09-outcomes.XXXXXX)"
P09_CONFIG_DB="$P09_TEMP_ROOT/config.db"
P09_TENANT_DB="$P09_TEMP_ROOT/tenant.db"
P09_BACKEND_PORT="${SYSGRID_P09_BACKEND_PORT:-18073}"
P09_FRONTEND_PORT="${SYSGRID_P09_FRONTEND_PORT:-15180}"
P09_BACKEND_ORIGIN="http://127.0.0.1:$P09_BACKEND_PORT"
P09_FRONTEND_ORIGIN="http://127.0.0.1:$P09_FRONTEND_PORT"
P09_USER_ID="p09.outcomes"
P09_PROOF_DIR="${SYSGRID_P09_PROOF_DIR:-$P09_TEMP_ROOT/proof}"
P09_BACKEND_PID=""
P09_FRONTEND_PID=""
mkdir -p "$P09_PROOF_DIR"

runtime_env=(
  env -u TESTING -u USER_ID -u user_name -u TRUSTED_PROXY_USER_HEADER
  "CONFIG_DATABASE_URL=sqlite+aiosqlite:///$P09_CONFIG_DB"
  "DATABASE_URL=sqlite+aiosqlite:///$P09_TENANT_DB"
  "TENANT_STORAGE_ROOT=$P09_TEMP_ROOT/tenants"
  "DEFAULT_TENANT_NAME=P09 Isolated Outcomes"
  "PUBLIC_READONLY_ENABLED=false"
  "DEFAULT_USER_ID=$P09_USER_ID"
  "AUTO_ADMIN_USER_IDS=$P09_USER_ID"
  "USER_ID_ENV_VAR=SYSGRID_P09_RUNTIME_USER_ID"
  "SYSGRID_P09_RUNTIME_USER_ID=$P09_USER_ID"
  "DEFAULT_EMAIL_DOMAIN=sysgrid.test"
  "ENVIRONMENT=development"
  "IDENTITY_MODE=development"
  "ALLOWED_HOSTS=127.0.0.1,localhost,test,testserver"
  "BACKEND_CORS_ORIGINS=$P09_FRONTEND_ORIGIN"
)

cleanup() {
  [[ -n "$P09_FRONTEND_PID" ]] && kill "$P09_FRONTEND_PID" >/dev/null 2>&1 || true
  [[ -n "$P09_BACKEND_PID" ]] && kill "$P09_BACKEND_PID" >/dev/null 2>&1 || true
  if [[ "$P09_PROOF_DIR" != "$P09_TEMP_ROOT"* ]]; then
    cp "$P09_TEMP_ROOT/backend.log" "$P09_PROOF_DIR/backend.log" 2>/dev/null || true
    cp "$P09_TEMP_ROOT/frontend.log" "$P09_PROOF_DIR/frontend.log" 2>/dev/null || true
  fi
  rm -rf "$P09_TEMP_ROOT"
}
trap cleanup EXIT INT TERM

wait_for_url() { local url="$1"; for _ in {1..90}; do if curl -fsS "$url" >/dev/null 2>&1; then return 0; fi; sleep 1; done; return 1; }
if lsof -tiTCP:"$P09_BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 || lsof -tiTCP:"$P09_FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then echo "P09 proof ports are already in use." >&2; exit 1; fi
printf '%s\n' "config_db=$P09_CONFIG_DB" "tenant_db=$P09_TENANT_DB" > "$P09_PROOF_DIR/isolated-database-paths.txt"
(cd "$ROOT_DIR" && "${runtime_env[@]}" ./backend/venv/bin/python seed.py --tenant-name "P09 Isolated Outcomes" --tenant-db "$P09_TENANT_DB" --admin-user "$P09_USER_ID" --no-seed-data)
(cd "$BACKEND_DIR" && exec "${runtime_env[@]}" ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$P09_BACKEND_PORT") > "$P09_TEMP_ROOT/backend.log" 2>&1 &
P09_BACKEND_PID=$!
wait_for_url "$P09_BACKEND_ORIGIN/api/v1/health"
(cd "$FRONTEND_DIR" && VITE_API_BASE_URL="$P09_BACKEND_ORIGIN" exec npm run dev -- --host 127.0.0.1 --port "$P09_FRONTEND_PORT" --strictPort) > "$P09_TEMP_ROOT/frontend.log" 2>&1 &
P09_FRONTEND_PID=$!
wait_for_url "$P09_FRONTEND_ORIGIN"
cd "$FRONTEND_DIR"
P09_REAL_BACKEND=1 SYSGRID_P09_API_ORIGIN="$P09_BACKEND_ORIGIN" SYSGRID_P09_PROOF_DIR="$P09_PROOF_DIR" PLAYWRIGHT_BASE_URL="$P09_FRONTEND_ORIGIN" npx playwright test --config=playwright.p09-outcomes.config.ts
