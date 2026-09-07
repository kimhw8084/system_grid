#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
P04_TEMP_ROOT="$(mktemp -d /tmp/sysgrid-p04-project-story.XXXXXX)"
P04_CONFIG_DB="$P04_TEMP_ROOT/config.db"
P04_TENANT_DB="$P04_TEMP_ROOT/tenant.db"
P04_BACKEND_PORT="${SYSGRID_P04_BACKEND_PORT:-18041}"
P04_FRONTEND_PORT="${SYSGRID_P04_FRONTEND_PORT:-15194}"
P04_BACKEND_ORIGIN="http://127.0.0.1:$P04_BACKEND_PORT"
P04_FRONTEND_ORIGIN="http://127.0.0.1:$P04_FRONTEND_PORT"
P04_USER_ID="p04.manager"
P04_BACKEND_PID=""
P04_FRONTEND_PID=""

runtime_env=(
  env -u TESTING -u USER_ID -u user_name -u TRUSTED_PROXY_USER_HEADER
  "CONFIG_DATABASE_URL=sqlite+aiosqlite:///$P04_CONFIG_DB"
  "DATABASE_URL=sqlite+aiosqlite:///$P04_TENANT_DB"
  "TENANT_STORAGE_ROOT=$P04_TEMP_ROOT"
  "DEFAULT_TENANT_NAME=P04 Isolated Gate"
  "PUBLIC_READONLY_ENABLED=false"
  "DEFAULT_USER_ID=$P04_USER_ID"
  "AUTO_ADMIN_USER_IDS=$P04_USER_ID"
  "USER_ID_ENV_VAR=SYSGRID_P04_RUNTIME_USER_ID"
  "SYSGRID_P04_RUNTIME_USER_ID=$P04_USER_ID"
  "DEFAULT_EMAIL_DOMAIN=sysgrid.test"
  "ENVIRONMENT=development"
  "IDENTITY_MODE=development"
  "ALLOWED_HOSTS=127.0.0.1,localhost,test,testserver"
  "BACKEND_CORS_ORIGINS=$P04_FRONTEND_ORIGIN"
)

cleanup() {
  [[ -n "$P04_FRONTEND_PID" ]] && kill "$P04_FRONTEND_PID" >/dev/null 2>&1 || true
  [[ -n "$P04_BACKEND_PID" ]] && kill "$P04_BACKEND_PID" >/dev/null 2>&1 || true
  rm -rf "$P04_TEMP_ROOT"
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

if lsof -tiTCP:"$P04_BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 || lsof -tiTCP:"$P04_FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "P04 proof ports are already in use." >&2
  exit 1
fi

(cd "$ROOT_DIR" && "${runtime_env[@]}" ./backend/venv/bin/python seed.py --tenant-name "P04 Isolated Gate" --tenant-db "$P04_TENANT_DB" --admin-user "$P04_USER_ID" --admin-full-name "Mina Chen" --no-seed-data)
(cd "$BACKEND_DIR" && exec "${runtime_env[@]}" ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$P04_BACKEND_PORT") > "$P04_TEMP_ROOT/backend.log" 2>&1 &
P04_BACKEND_PID=$!
wait_for_url "$P04_BACKEND_ORIGIN/api/v1/health"
(cd "$FRONTEND_DIR" && VITE_API_BASE_URL="$P04_BACKEND_ORIGIN" exec npm run dev -- --host 127.0.0.1 --port "$P04_FRONTEND_PORT" --strictPort) > "$P04_TEMP_ROOT/frontend.log" 2>&1 &
P04_FRONTEND_PID=$!
wait_for_url "$P04_FRONTEND_ORIGIN"

cd "$FRONTEND_DIR"
PLAYWRIGHT_BASE_URL="$P04_FRONTEND_ORIGIN" \
SYSGRID_P04_API_ORIGIN="$P04_BACKEND_ORIGIN" \
PW_TENANT_ID=1 \
USER_ID="$P04_USER_ID" \
npx playwright test --config=playwright.p04-project-story.config.ts

if [[ "${SYSGRID_P04_INSPECT:-0}" == "1" ]]; then
  echo "P04 isolated runtime ready at $P04_FRONTEND_ORIGIN"
  while true; do sleep 30; done
fi
