#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
OUTPUT_DIR=""
DURATION_SECONDS="${SYSGRID_P12_LOAD_DURATION_SECONDS:-900}"
BACKEND_PORT="${SYSGRID_P12_LOAD_BACKEND_PORT:-18141}"
BACKEND_WORKERS="${SYSGRID_P12_LOAD_WORKERS:-4}"
API_ORIGIN="http://127.0.0.1:$BACKEND_PORT"
BACKEND_PID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    --duration-seconds) DURATION_SECONDS="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$OUTPUT_DIR" ]] || { echo "--output-dir is required" >&2; exit 2; }
mkdir -p "$OUTPUT_DIR"

if lsof -tiTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "P12 load backend port is already in use." >&2
  exit 1
fi

TEMP_ROOT="$(mktemp -d /tmp/sysgrid-p12-load.XXXXXX)"
CONFIG_DB="$TEMP_ROOT/config.db"
TENANT_DB="$TEMP_ROOT/tenant.db"
runtime_env=(
  env -u TESTING -u USER_ID -u user_name -u TRUSTED_PROXY_USER_HEADER
  "PYTHONPATH=$BACKEND_DIR"
  "CONFIG_DATABASE_URL=sqlite+aiosqlite:///$CONFIG_DB"
  "DATABASE_URL=sqlite+aiosqlite:///$TENANT_DB"
  "TENANT_STORAGE_ROOT=$TEMP_ROOT/tenants"
  "DEFAULT_TENANT_NAME=P12 Typical Load"
  "PUBLIC_READONLY_ENABLED=false"
  "DEFAULT_USER_ID=p12.performance"
  "AUTO_ADMIN_USER_IDS=p12.performance"
  "DEFAULT_EMAIL_DOMAIN=sysgrid.test"
  "ENVIRONMENT=development"
  "IDENTITY_MODE=development"
  "ALLOWED_HOSTS=127.0.0.1,localhost,test,testserver"
  "BACKEND_CORS_ORIGINS=$API_ORIGIN"
)

cleanup() {
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" >/dev/null 2>&1 || true
  cp "$TEMP_ROOT/backend.log" "$OUTPUT_DIR/backend.log" 2>/dev/null || true
  printf '%s\n' "config_db=$CONFIG_DB" "tenant_db=$TENANT_DB" > "$OUTPUT_DIR/isolated-database-paths.txt"
  rm -rf "$TEMP_ROOT"
}
trap cleanup EXIT INT TERM

(cd "$ROOT_DIR" && "${runtime_env[@]}" ./backend/venv/bin/python seed.py --tenant-name "P12 Typical Load" --tenant-db "$TENANT_DB" --admin-user p12.performance --no-seed-data) > "$TEMP_ROOT/seed.log"
(cd "$BACKEND_DIR" && "${runtime_env[@]}" ./venv/bin/python "$ROOT_DIR/scripts/pv1/performance_fixture.py" --database-url "sqlite+aiosqlite:///$TENANT_DB" --config-database-url "sqlite+aiosqlite:///$CONFIG_DB" --profile Typical --variant long_names --output "$OUTPUT_DIR/typical-fixture.json")
(cd "$BACKEND_DIR" && exec "${runtime_env[@]}" ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" --workers "$BACKEND_WORKERS") > "$TEMP_ROOT/backend.log" 2>&1 &
BACKEND_PID=$!
for _ in {1..120}; do
  curl -fsS "$API_ORIGIN/api/v1/health" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "$API_ORIGIN/api/v1/health" >/dev/null

PROJECT_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["selected_project_id"])' "$OUTPUT_DIR/typical-fixture.json")"
(cd "$BACKEND_DIR" && "${runtime_env[@]}" ./venv/bin/python "$ROOT_DIR/scripts/pv1/run-p12-load.py" --api-origin "$API_ORIGIN" --project-id "$PROJECT_ID" --output "$OUTPUT_DIR/load-performance.json" --raw-log "$OUTPUT_DIR/load-raw.jsonl" --duration-seconds "$DURATION_SECONDS")
