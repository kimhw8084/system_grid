#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
OUTPUT_DIR=""
FRONTEND_PORT="${SYSGRID_P12_PERF_FRONTEND_PORT:-15199}"
FRONTEND_ORIGIN="http://127.0.0.1:$FRONTEND_PORT"
FRONTEND_PID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$OUTPUT_DIR" ]] || { echo "--output-dir is required" >&2; exit 2; }
mkdir -p "$OUTPUT_DIR"

if lsof -tiTCP:"$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "P12 browser performance frontend port is already in use." >&2
  exit 1
fi

TEMP_ROOT="$(mktemp -d /tmp/sysgrid-p12-browser-performance.XXXXXX)"
BACKEND_PID=""
cleanup() {
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" >/dev/null 2>&1 || true
  cp "$TEMP_ROOT/frontend.log" "$OUTPUT_DIR/frontend.log" 2>/dev/null || true
  rm -rf "$TEMP_ROOT"
}
trap cleanup EXIT INT TERM

cd "$FRONTEND_DIR"
npm run preview -- --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort > "$TEMP_ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!
for _ in {1..120}; do
  curl -fsS "$FRONTEND_ORIGIN" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "$FRONTEND_ORIGIN" >/dev/null

run_profile() {
  local profile="$1"
  local backend_port="$2"
  local profile_root="$TEMP_ROOT/$profile"
  local config_db="$profile_root/config.db"
  local tenant_db="$profile_root/tenant.db"
  local api_origin="http://127.0.0.1:$backend_port"
  local fixture_json="$OUTPUT_DIR/${profile,,}-fixture.json"
  local output_json="$OUTPUT_DIR/${profile,,}-browser-performance.json"
  mkdir -p "$profile_root"
  local runtime_env=(
    env -u TESTING -u USER_ID -u user_name -u TRUSTED_PROXY_USER_HEADER
    "PYTHONPATH=$BACKEND_DIR"
    "CONFIG_DATABASE_URL=sqlite+aiosqlite:///$config_db"
    "DATABASE_URL=sqlite+aiosqlite:///$tenant_db"
    "TENANT_STORAGE_ROOT=$profile_root/tenants"
    "DEFAULT_TENANT_NAME=P12 $profile Performance"
    "PUBLIC_READONLY_ENABLED=false"
    "DEFAULT_USER_ID=p12.performance"
    "AUTO_ADMIN_USER_IDS=p12.performance"
    "USER_ID_ENV_VAR=SYSGRID_P12_RUNTIME_USER_ID"
    "SYSGRID_P12_RUNTIME_USER_ID=p12.performance"
    "DEFAULT_EMAIL_DOMAIN=sysgrid.test"
    "ENVIRONMENT=development"
    "AUTO_MIGRATE_ON_STARTUP=false"
    "IDENTITY_MODE=development"
    "ALLOWED_HOSTS=127.0.0.1,localhost,test,testserver"
    "BACKEND_CORS_ORIGINS=$FRONTEND_ORIGIN"
  )
  (cd "$ROOT_DIR" && "${runtime_env[@]}" ./backend/venv/bin/python seed.py --tenant-name "P12 $profile Performance" --tenant-db "$tenant_db" --admin-user p12.performance --no-seed-data) > "$profile_root/seed.log"
  (cd "$BACKEND_DIR" && "${runtime_env[@]}" ./venv/bin/python "$ROOT_DIR/scripts/pv1/performance_fixture.py" --database-url "sqlite+aiosqlite:///$tenant_db" --profile "$profile" --output "$fixture_json")
  (cd "$BACKEND_DIR" && exec "${runtime_env[@]}" ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$backend_port") > "$profile_root/backend.log" 2>&1 &
  BACKEND_PID=$!
  for _ in {1..120}; do
    curl -fsS "$api_origin/api/v1/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -fsS "$api_origin/api/v1/health" >/dev/null
  local selected_project
  selected_project="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["selected_project_id"])' "$fixture_json")"
  (cd "$FRONTEND_DIR" && P12_PROFILE="$profile" P12_API_ORIGIN="$api_origin" P12_PROJECT_ID="$selected_project" P12_PERF_BROWSER_OUTPUT="$output_json" PLAYWRIGHT_BASE_URL="$FRONTEND_ORIGIN" npx playwright test --config=playwright.pv1-performance.config.ts)
  kill "$BACKEND_PID" >/dev/null 2>&1 || true
  BACKEND_PID=""
  cp "$profile_root/backend.log" "$OUTPUT_DIR/${profile,,}-backend.log"
}

run_profile Typical 18131
run_profile Large 18132

python3 - "$OUTPUT_DIR" <<'PY'
import json
import pathlib
import sys
root = pathlib.Path(sys.argv[1])
payload = {
    "schema": "sysgrid.pv1.browser-performance-suite.v1",
    "profiles": [json.loads((root / "typical-browser-performance.json").read_text()), json.loads((root / "large-browser-performance.json").read_text())],
}
(root / "browser-performance.json").write_text(json.dumps(payload, indent=2) + "\n")
print(json.dumps({"profiles": [item["profile"] for item in payload["profiles"]], "verdict": all(item.get("verdict") for item in payload["profiles"])}, sort_keys=True))
PY
