#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
P05_TEMP_ROOT="$(mktemp -d /tmp/sysgrid-p05-work-plan.XXXXXX)"
P05_CONFIG_DB="$P05_TEMP_ROOT/config.db"
P05_TENANT_DB="$P05_TEMP_ROOT/tenant.db"
P05_BACKEND_PORT="${SYSGRID_P05_BACKEND_PORT:-18051}"
P05_FRONTEND_PORT="${SYSGRID_P05_FRONTEND_PORT:-15174}"
P05_BACKEND_ORIGIN="http://127.0.0.1:$P05_BACKEND_PORT"
P05_FRONTEND_ORIGIN="http://127.0.0.1:$P05_FRONTEND_PORT"
P05_USER_ID="p05.manager"
P05_BACKEND_PID=""
P05_FRONTEND_PID=""

runtime_env=(
  env -u TESTING -u USER_ID -u user_name -u TRUSTED_PROXY_USER_HEADER
  "CONFIG_DATABASE_URL=sqlite+aiosqlite:///$P05_CONFIG_DB"
  "DATABASE_URL=sqlite+aiosqlite:///$P05_TENANT_DB"
  "TENANT_STORAGE_ROOT=$P05_TEMP_ROOT"
  "DEFAULT_TENANT_NAME=P05 Isolated Work Plan"
  "PUBLIC_READONLY_ENABLED=false"
  "DEFAULT_USER_ID=$P05_USER_ID"
  "AUTO_ADMIN_USER_IDS=$P05_USER_ID"
  "USER_ID_ENV_VAR=SYSGRID_P05_RUNTIME_USER_ID"
  "SYSGRID_P05_RUNTIME_USER_ID=$P05_USER_ID"
  "DEFAULT_EMAIL_DOMAIN=sysgrid.test"
  "ENVIRONMENT=development"
  "IDENTITY_MODE=development"
  "ALLOWED_HOSTS=127.0.0.1,localhost,test,testserver"
  "BACKEND_CORS_ORIGINS=$P05_FRONTEND_ORIGIN"
)

cleanup() {
  [[ -n "$P05_FRONTEND_PID" ]] && kill "$P05_FRONTEND_PID" >/dev/null 2>&1 || true
  [[ -n "$P05_BACKEND_PID" ]] && kill "$P05_BACKEND_PID" >/dev/null 2>&1 || true
  rm -rf "$P05_TEMP_ROOT"
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

if lsof -tiTCP:"$P05_BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 || lsof -tiTCP:"$P05_FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "P05 proof ports are already in use." >&2
  exit 1
fi

(cd "$ROOT_DIR" && "${runtime_env[@]}" ./backend/venv/bin/python seed.py --tenant-name "P05 Isolated Work Plan" --tenant-db "$P05_TENANT_DB" --admin-user "$P05_USER_ID" --no-seed-data)
(cd "$BACKEND_DIR" && exec "${runtime_env[@]}" ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$P05_BACKEND_PORT") > "$P05_TEMP_ROOT/backend.log" 2>&1 &
P05_BACKEND_PID=$!
wait_for_url "$P05_BACKEND_ORIGIN/api/v1/health"
(cd "$FRONTEND_DIR" && VITE_API_BASE_URL="$P05_BACKEND_ORIGIN" exec npm run dev -- --host 127.0.0.1 --port "$P05_FRONTEND_PORT" --strictPort) > "$P05_TEMP_ROOT/frontend.log" 2>&1 &
P05_FRONTEND_PID=$!
wait_for_url "$P05_FRONTEND_ORIGIN"

cd "$FRONTEND_DIR"
P05_REAL_BACKEND=1 \
SYSGRID_P05_API_ORIGIN="$P05_BACKEND_ORIGIN" \
PLAYWRIGHT_BASE_URL="$P05_FRONTEND_ORIGIN" \
npx playwright test tests/projects-p05-work-plan.spec.ts --workers=1
