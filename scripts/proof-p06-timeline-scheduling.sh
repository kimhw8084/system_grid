#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
P06_TEMP_ROOT="$(mktemp -d /tmp/sysgrid-p06-timeline.XXXXXX)"
P06_CONFIG_DB="$P06_TEMP_ROOT/config.db"
P06_TENANT_DB="$P06_TEMP_ROOT/tenant.db"
P06_BACKEND_PORT="${SYSGRID_P06_BACKEND_PORT:-18061}"
P06_FRONTEND_PORT="${SYSGRID_P06_FRONTEND_PORT:-15176}"
P06_BACKEND_ORIGIN="http://127.0.0.1:$P06_BACKEND_PORT"
P06_FRONTEND_ORIGIN="http://127.0.0.1:$P06_FRONTEND_PORT"
P06_USER_ID="p06.scheduler"
P06_PROOF_DIR="${SYSGRID_P06_PROOF_DIR:-$P06_TEMP_ROOT/proof}"
P06_BACKEND_PID=""
P06_FRONTEND_PID=""
mkdir -p "$P06_PROOF_DIR"

runtime_env=(
  env -u TESTING -u USER_ID -u user_name -u TRUSTED_PROXY_USER_HEADER
  "CONFIG_DATABASE_URL=sqlite+aiosqlite:///$P06_CONFIG_DB"
  "DATABASE_URL=sqlite+aiosqlite:///$P06_TENANT_DB"
  "TENANT_STORAGE_ROOT=$P06_TEMP_ROOT/tenants"
  "DEFAULT_TENANT_NAME=P06 Isolated Timeline"
  "PUBLIC_READONLY_ENABLED=false"
  "DEFAULT_USER_ID=$P06_USER_ID"
  "AUTO_ADMIN_USER_IDS=$P06_USER_ID"
  "USER_ID_ENV_VAR=SYSGRID_P06_RUNTIME_USER_ID"
  "SYSGRID_P06_RUNTIME_USER_ID=$P06_USER_ID"
  "DEFAULT_EMAIL_DOMAIN=sysgrid.test"
  "ENVIRONMENT=development"
  "IDENTITY_MODE=development"
  "ALLOWED_HOSTS=127.0.0.1,localhost,test,testserver"
  "BACKEND_CORS_ORIGINS=$P06_FRONTEND_ORIGIN"
)

cleanup() {
  [[ -n "$P06_FRONTEND_PID" ]] && kill "$P06_FRONTEND_PID" >/dev/null 2>&1 || true
  [[ -n "$P06_BACKEND_PID" ]] && kill "$P06_BACKEND_PID" >/dev/null 2>&1 || true
  if [[ "$P06_PROOF_DIR" != "$P06_TEMP_ROOT"* ]]; then
    cp "$P06_TEMP_ROOT/backend.log" "$P06_PROOF_DIR/backend.log" 2>/dev/null || true
    cp "$P06_TEMP_ROOT/frontend.log" "$P06_PROOF_DIR/frontend.log" 2>/dev/null || true
  fi
  rm -rf "$P06_TEMP_ROOT"
}
trap cleanup EXIT INT TERM

wait_for_url() {
  local url="$1"
  for _ in {1..90}; do
    if curl -fsS "$url" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

if lsof -tiTCP:"$P06_BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 || lsof -tiTCP:"$P06_FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "P06 proof ports are already in use." >&2
  exit 1
fi

printf '%s\n' "config_db=$P06_CONFIG_DB" "tenant_db=$P06_TENANT_DB" > "$P06_PROOF_DIR/isolated-database-paths.txt"
(cd "$ROOT_DIR" && "${runtime_env[@]}" ./backend/venv/bin/python seed.py --tenant-name "P06 Isolated Timeline" --tenant-db "$P06_TENANT_DB" --admin-user "$P06_USER_ID" --no-seed-data)
(cd "$BACKEND_DIR" && exec "${runtime_env[@]}" ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$P06_BACKEND_PORT") > "$P06_TEMP_ROOT/backend.log" 2>&1 &
P06_BACKEND_PID=$!
wait_for_url "$P06_BACKEND_ORIGIN/api/v1/health"
(cd "$FRONTEND_DIR" && VITE_API_BASE_URL="$P06_BACKEND_ORIGIN" exec npm run dev -- --host 127.0.0.1 --port "$P06_FRONTEND_PORT" --strictPort) > "$P06_TEMP_ROOT/frontend.log" 2>&1 &
P06_FRONTEND_PID=$!
wait_for_url "$P06_FRONTEND_ORIGIN"

cd "$FRONTEND_DIR"
P06_REAL_BACKEND=1 \
SYSGRID_P06_API_ORIGIN="$P06_BACKEND_ORIGIN" \
SYSGRID_P06_PROOF_DIR="$P06_PROOF_DIR" \
PLAYWRIGHT_BASE_URL="$P06_FRONTEND_ORIGIN" \
npx playwright test --config=playwright.p06-timeline.config.ts
