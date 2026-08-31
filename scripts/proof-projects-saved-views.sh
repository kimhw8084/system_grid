#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <python>" >&2
  exit 2
fi

PYTHON="$1"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_HOST="127.0.0.1"
FRONTEND_HOST="127.0.0.1"
BACKEND_PORT="${SYSGRID_PROJECTS_VERIFY_BACKEND_PORT:-$((20000 + ($$ % 1000)))}"
FRONTEND_PORT="${SYSGRID_PROJECTS_VERIFY_FRONTEND_PORT:-$((22000 + ($$ % 1000)))}"
BACKEND_ORIGIN="http://$BACKEND_HOST:$BACKEND_PORT"
FRONTEND_ORIGIN="http://$FRONTEND_HOST:$FRONTEND_PORT"
TEST_USER_ID="${SYSGRID_PROJECTS_VERIFY_USER_ID:-haewon.kim}"
TEST_TENANT_ID="1"
RUNTIME_TAG="projects-saved-views-${$}-${RANDOM}"
VERIFY_CONFIG_DB="$BACKEND_DIR/config.${RUNTIME_TAG}.db"
VERIFY_TENANT_ROOT="$BACKEND_DIR/tenants/$RUNTIME_TAG"
VERIFY_TENANT_DB_REL="tenants/$RUNTIME_TAG/projects_saved_views.db"
VERIFY_TENANT_DB="$BACKEND_DIR/$VERIFY_TENANT_DB_REL"
RUNTIME_USER_ENV_VAR="SYSGRID_PROJECTS_VERIFY_RUNTIME_USER_ID"
BACKEND_PID=""
FRONTEND_PID=""

RUNTIME_ENV_COMMAND=(
  env
  -u TESTING
  -u USER_ID
  -u user_name
  -u SYSGRID_VERIFY_USER_ID
  -u TRUSTED_PROXY_USER_HEADER
  "CONFIG_DATABASE_URL=sqlite+aiosqlite:///$VERIFY_CONFIG_DB"
  "DATABASE_URL=sqlite+aiosqlite:///$VERIFY_TENANT_DB"
  "TENANT_STORAGE_ROOT=$VERIFY_TENANT_ROOT"
  "DEFAULT_TENANT_NAME=Projects Saved Views Gate"
  "PUBLIC_READONLY_ENABLED=false"
  "DEFAULT_USER_ID=$TEST_USER_ID"
  "AUTO_ADMIN_USER_IDS=$TEST_USER_ID"
  "USER_ID_ENV_VAR=$RUNTIME_USER_ENV_VAR"
  "$RUNTIME_USER_ENV_VAR=$TEST_USER_ID"
  "DEFAULT_EMAIL_DOMAIN=sysgrid.test"
  "ENVIRONMENT=development"
  "IDENTITY_MODE=development"
  "ALLOWED_HOSTS=$BACKEND_HOST,localhost,test,testserver"
  "BACKEND_CORS_ORIGINS=$FRONTEND_ORIGIN"
)

terminate_process_tree() {
  local pid="$1"
  local child
  while read -r child; do
    [[ -n "$child" ]] && terminate_process_tree "$child"
  done < <(pgrep -P "$pid" 2>/dev/null || true)
  kill "$pid" >/dev/null 2>&1 || true
}

remove_sqlite_database_files() {
  local database_path="$1"
  rm -f "$database_path" "$database_path-wal" "$database_path-shm" "$database_path-journal"
}

cleanup() {
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    terminate_process_tree "$FRONTEND_PID"
  fi
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    terminate_process_tree "$BACKEND_PID"
  fi
  remove_sqlite_database_files "$VERIFY_CONFIG_DB"
  remove_sqlite_database_files "$VERIFY_TENANT_DB"
  rm -rf "$VERIFY_TENANT_ROOT"
}

trap cleanup EXIT INT TERM

wait_for_url() {
  local url="$1"
  local label="$2"
  for _ in {1..90}; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $label at $url" >&2
  return 1
}

assert_port_free() {
  local port="$1"
  local label="$2"
  local listeners
  listeners="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$listeners" ]]; then
    echo "Refusing unmanaged $label listener on port $port: $listeners" >&2
    exit 1
  fi
}

remove_sqlite_database_files "$VERIFY_CONFIG_DB"
remove_sqlite_database_files "$VERIFY_TENANT_DB"
rm -rf "$VERIFY_TENANT_ROOT"
mkdir -p "$VERIFY_TENANT_ROOT" "$BACKEND_DIR/test-results" "$FRONTEND_DIR/test-results"
rm -rf "$FRONTEND_DIR/playwright-report" "$FRONTEND_DIR/blob-report"
rm -f "$FRONTEND_DIR/llm-report.json"

(
  cd "$ROOT_DIR"
  "${RUNTIME_ENV_COMMAND[@]}" "$PYTHON" seed.py \
    --tenant-name "Projects Saved Views Gate" \
    --tenant-db "$VERIFY_TENANT_DB_REL" \
    --admin-user "$TEST_USER_ID" \
    --no-seed-data
)

(
  cd "$BACKEND_DIR"
  "${RUNTIME_ENV_COMMAND[@]}" "$PYTHON" -m app.reference_data
)

assert_port_free "$BACKEND_PORT" "backend"
(
  cd "$BACKEND_DIR"
  exec "${RUNTIME_ENV_COMMAND[@]}" "$PYTHON" -m uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT"
) > "$BACKEND_DIR/test-results/projects-saved-views-backend.log" 2>&1 &
BACKEND_PID=$!
wait_for_url "$BACKEND_ORIGIN/api/v1/health" "candidate backend"

assert_port_free "$FRONTEND_PORT" "frontend"
(
  cd "$FRONTEND_DIR"
  VITE_API_BASE_URL="$BACKEND_ORIGIN" \
  VITE_FRONTEND_ORIGIN="$FRONTEND_ORIGIN" \
  exec npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" --strictPort
) > "$FRONTEND_DIR/test-results/projects-saved-views-frontend.log" 2>&1 &
FRONTEND_PID=$!
wait_for_url "$FRONTEND_ORIGIN" "candidate frontend"

cd "$FRONTEND_DIR"
env \
  -u CONFIG_DATABASE_URL \
  -u DATABASE_URL \
  -u TENANT_STORAGE_ROOT \
  -u DEFAULT_TENANT_NAME \
  -u PUBLIC_READONLY_ENABLED \
  -u DEFAULT_USER_ID \
  -u AUTO_ADMIN_USER_IDS \
  -u USER_ID_ENV_VAR \
  -u SYSGRID_VERIFY_RUNTIME_USER_ID \
  -u SYSGRID_VERIFY_USER_ID \
  -u user_name \
  -u DEFAULT_EMAIL_DOMAIN \
  -u ENVIRONMENT \
  -u TESTING \
  -u ALLOWED_HOSTS \
  -u BACKEND_CORS_ORIGINS \
  -u IDENTITY_MODE \
  -u TRUSTED_PROXY_USER_HEADER \
  PW_API_BASE="$BACKEND_ORIGIN/api/v1" \
  PW_TENANT_ID="$TEST_TENANT_ID" \
  USER_ID="$TEST_USER_ID" \
  PLAYWRIGHT_BASE_URL="$FRONTEND_ORIGIN" \
  npx playwright test \
  tests/projects-saved-views.spec.ts \
  --grep "nested Portfolio|linked legacy Portfolio" \
  --workers=1
