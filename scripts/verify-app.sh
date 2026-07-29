#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_HOST="127.0.0.1"
FRONTEND_HOST="127.0.0.1"
BACKEND_PORT="${SYSGRID_VERIFY_BACKEND_PORT:-18000}"
FRONTEND_PORT="${SYSGRID_VERIFY_FRONTEND_PORT:-15173}"
BACKEND_ORIGIN="http://$BACKEND_HOST:$BACKEND_PORT"
FRONTEND_ORIGIN="http://$FRONTEND_HOST:$FRONTEND_PORT"
BACKEND_URL="$BACKEND_ORIGIN/api/v1/health"
FRONTEND_URL="$FRONTEND_ORIGIN"
TEST_USER_ID="${SYSGRID_VERIFY_USER_ID:-haewon.kim}"
TEST_TENANT_ID="1"
RUNTIME_TAG="verify-${$}-${RANDOM}"
VERIFY_CONFIG_DB="$BACKEND_DIR/config.${RUNTIME_TAG}.db"
VERIFY_TENANT_ROOT="$BACKEND_DIR/tenants/$RUNTIME_TAG"
VERIFY_TENANT_DB_REL="tenants/$RUNTIME_TAG/verify_gate.db"
VERIFY_TENANT_DB="$BACKEND_DIR/$VERIFY_TENANT_DB_REL"
RUNTIME_USER_ENV_VAR="SYSGRID_VERIFY_RUNTIME_USER_ID"
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
  "DEFAULT_TENANT_NAME=Playwright Gate"
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
  rm -f \
    "$database_path" \
    "$database_path-wal" \
    "$database_path-shm" \
    "$database_path-journal"
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

reset_generated_evidence() {
  rm -rf \
    "$BACKEND_DIR/test-results" \
    "$FRONTEND_DIR/test-results" \
    "$FRONTEND_DIR/playwright-report" \
    "$FRONTEND_DIR/blob-report"
  rm -f "$FRONTEND_DIR/llm-report.json"
  mkdir -p "$BACKEND_DIR/test-results" "$FRONTEND_DIR/test-results"
}

reset_generated_evidence

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
    echo "Refusing to reuse an unmanaged $label on port $port (PID(s): $listeners)." >&2
    echo "The canonical gate owns isolated ports and must start the exact current source itself." >&2
    exit 1
  fi
}

prepare_disposable_runtime() {
  remove_sqlite_database_files "$VERIFY_CONFIG_DB"
  remove_sqlite_database_files "$VERIFY_TENANT_DB"
  rm -rf "$VERIFY_TENANT_ROOT"
  mkdir -p "$VERIFY_TENANT_ROOT"

  echo "Seeding isolated Playwright tenant..."
  (
    cd "$ROOT_DIR"
    "${RUNTIME_ENV_COMMAND[@]}" ./backend/venv/bin/python seed.py \
      --tenant-name "Playwright Gate" \
      --tenant-db "$VERIFY_TENANT_DB_REL" \
      --admin-user "$TEST_USER_ID" \
      --no-seed-data
  )

  echo "Provisioning code-managed reference data..."
  (
    cd "$BACKEND_DIR"
    "${RUNTIME_ENV_COMMAND[@]}" ./venv/bin/python -m app.reference_data
  )
}

start_backend() {
  assert_port_free "$BACKEND_PORT" "backend"
  (
    cd "$BACKEND_DIR"
    exec "${RUNTIME_ENV_COMMAND[@]}" ./venv/bin/python -m uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT"
  ) > "$BACKEND_DIR/test-results/verify-backend.log" 2>&1 &
  BACKEND_PID=$!
  wait_for_url "$BACKEND_URL" "isolated backend"
}

start_frontend() {
  assert_port_free "$FRONTEND_PORT" "frontend"
  (
    cd "$FRONTEND_DIR"
    VITE_API_BASE_URL="$BACKEND_ORIGIN" \
    VITE_FRONTEND_ORIGIN="$FRONTEND_ORIGIN" \
    exec npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" --strictPort
  ) > "$FRONTEND_DIR/test-results/verify-frontend.log" 2>&1 &
  FRONTEND_PID=$!
  wait_for_url "$FRONTEND_URL" "isolated frontend"
}

assert_clean_fixture_contract() {
  local headers=(-H "X-User-Id: $TEST_USER_ID" -H "X-Tenant-Id: $TEST_TENANT_ID")
  local tenants devices services external monitoring vendors reference_options

  tenants="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/tenants/me")"
  [[ "$tenants" == *'"id":1'* && "$tenants" == *'"name":"Playwright Gate"'* && "$tenants" == *'"is_selected":true'* ]] || {
    echo "Disposable tenant contract failed: $tenants" >&2
    exit 1
  }

  devices="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/devices?include_deleted=true")"
  services="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/logical-services?include_deleted=true")"
  external="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/intelligence/entities?include_deleted=true")"
  monitoring="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/monitoring?include_deleted=true")"
  vendors="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/vendors?include_deleted=true")"
  reference_options="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/settings/options")"

  printf '%s' "$reference_options" | "$BACKEND_DIR/venv/bin/python" -c '
import json
import sys

rows = json.load(sys.stdin)
observed = {(str(row.get("category")), str(row.get("value"))) for row in rows}
required = {
    ("MonitoringCategory", "Hardware"),
    ("MonitoringPlatform", "Zabbix"),
    ("NotificationMethod", "Slack"),
    ("MonitoringSeverity", "Critical"),
    ("MonitoringOwnerRole", "Primary Support"),
}
missing = sorted(required - observed)
if missing:
    raise SystemExit(f"Missing code-managed reference options: {missing}")
'

  [[ "$devices" == "[]" ]] || { echo "Expected zero seeded devices, observed: $devices" >&2; exit 1; }
  [[ "$services" == "[]" ]] || { echo "Expected zero seeded services, observed: $services" >&2; exit 1; }
  [[ "$external" == "[]" ]] || { echo "Expected zero seeded external entities, observed: $external" >&2; exit 1; }
  [[ "$monitoring" == "[]" ]] || { echo "Expected zero seeded monitoring records, observed: $monitoring" >&2; exit 1; }
  [[ "$vendors" == "[]" ]] || { echo "Expected zero seeded vendors, observed: $vendors" >&2; exit 1; }

  echo "Disposable Playwright fixture contract passed: one tenant, code-managed reference data, zero domain rows."
}

cd "$BACKEND_DIR"
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
  -u USER_ID \
  -u user_name \
  -u DEFAULT_EMAIL_DOMAIN \
  -u ENVIRONMENT \
  -u TESTING \
  -u ALLOWED_HOSTS \
  -u BACKEND_CORS_ORIGINS \
  -u IDENTITY_MODE \
  -u TRUSTED_PROXY_USER_HEADER \
  ./venv/bin/pytest --cov=app --cov-report=term --cov-report=xml:test-results/backend-coverage.xml

cd "$FRONTEND_DIR"
npm run test:lint
npm run typecheck
npm run test:coverage
npm run build

prepare_disposable_runtime
start_backend
assert_clean_fixture_contract
start_frontend

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
  tests/sentinel_comprehensive.spec.ts \
  tests/external-services-bulk-preview.spec.ts \
  tests/assets-vendors-bulk-preview.spec.ts \
  tests/shell-and-search.spec.ts \
  tests/view-deeplink-matrix.spec.ts \
  tests/view-empty-states.spec.ts \
  tests/blank-slate-audit.spec.ts
