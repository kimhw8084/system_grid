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
BACKEND_LOG="$BACKEND_DIR/test-results/verify-backend.log"
FRONTEND_LOG="$FRONTEND_DIR/test-results/verify-frontend.log"
LOOPBACK_NO_PROXY="127.0.0.1,localhost,::1"
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
LANE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sysgrid-verify-lanes.XXXXXX")"
PROGRESS_SEQUENCE=0
FRONTEND_WORKERS="${SYSGRID_FRONTEND_WORKERS:-4}"
EXECUTION_PROFILE="${SYSGRID_EXECUTION_PROFILE:-promotion_qualification}"
ACCELERATOR="$ROOT_DIR/scripts/sysgrid/verify_accelerator.py"
ACCEL_PY="$BACKEND_DIR/venv/bin/python"
ACCEL_DIR="$FRONTEND_DIR/test-results/sysgrid-accelerator"
ACCEL_PLAN="$ACCEL_DIR/impact-plan.json"
ACCEL_ENV="$ACCEL_DIR/accelerator.env"
ACCEL_TIMELINE="$ACCEL_DIR/timeline.jsonl"
ACCEL_PARALLEL_HEAVY=0
ACCEL_PROFILE="legacy"
PLAYWRIGHT_WORKERS=1
PROMOTION_SPECS=()
REMAINING_SPECS=()
BACKEND_COVERAGE_PID=""
FRONTEND_COVERAGE_PID=""
FRONTEND_COVERAGE_DEFERRED=0

GOLDEN_WORKSPACE_KEYS=(monitoring assets services external network far research vendors)
PLAYWRIGHT_SPECS=(
  tests/sentinel_comprehensive.spec.ts
  tests/blank-slate-audit.spec.ts
  tests/external-services-bulk-preview.spec.ts
  tests/assets-vendors-bulk-preview.spec.ts
  tests/shell-and-search.spec.ts
  tests/golden-eight-seeded-visual-matrix.spec.ts
  tests/view-deeplink-matrix.spec.ts
  tests/view-empty-states.spec.ts
  tests/far-golden-workspace.spec.ts
  tests/far-workflows.spec.ts
  tests/resilience/far-chaos.spec.ts
)

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
  local heavy_pid
  for heavy_pid in "$BACKEND_COVERAGE_PID" "$FRONTEND_COVERAGE_PID"; do
    if [[ -n "$heavy_pid" ]] && kill -0 "$heavy_pid" 2>/dev/null; then
      terminate_process_tree "$heavy_pid"
    fi
  done
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    terminate_process_tree "$FRONTEND_PID"
  fi
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    terminate_process_tree "$BACKEND_PID"
  fi
  remove_sqlite_database_files "$VERIFY_CONFIG_DB"
  remove_sqlite_database_files "$VERIFY_TENANT_DB"
  rm -rf "$VERIFY_TENANT_ROOT" "$LANE_DIR"
}

trap cleanup EXIT INT TERM

emit_progress() {
  local event_id="$1"
  local status="$2"
  local message="$3"

  if [[ -z "${SYSGRID_PROGRESS_FILE:-}" || -z "${SYSGRID_RUN_ID:-}" ]]; then
    return 0
  fi

  PROGRESS_SEQUENCE=$((PROGRESS_SEQUENCE + 1))
  SYSGRID_PROGRESS_EVENT_ID="$event_id" \
  SYSGRID_PROGRESS_STATUS="$status" \
  SYSGRID_PROGRESS_MESSAGE="$message" \
  SYSGRID_PROGRESS_SEQUENCE="$PROGRESS_SEQUENCE" \
  "$BACKEND_DIR/venv/bin/python" - <<'PY_PROGRESS'
import json
import os
from pathlib import Path

path = Path(os.environ["SYSGRID_PROGRESS_FILE"])
row = {
    "run_id": os.environ["SYSGRID_RUN_ID"],
    "sequence": int(os.environ["SYSGRID_PROGRESS_SEQUENCE"]),
    "event_id": os.environ["SYSGRID_PROGRESS_EVENT_ID"],
    "status": os.environ["SYSGRID_PROGRESS_STATUS"],
    "message": os.environ["SYSGRID_PROGRESS_MESSAGE"],
}
path.parent.mkdir(parents=True, exist_ok=True)
with path.open("a", encoding="utf-8") as stream:
    stream.write(json.dumps(row, sort_keys=True) + "\n")
    stream.flush()
    os.fsync(stream.fileno())
PY_PROGRESS
}

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

readiness_diagnostics() {
  local label="$1"
  local url="$2"
  local pid="$3"
  local port="$4"
  local log_file="$5"
  local probe_error_file="${6:-}"

  echo "--- $label readiness diagnostics ---" >&2
  echo "URL: $url" >&2
  echo "Tracked PID: $pid" >&2
  ps -o pid=,ppid=,state=,etime=,command= -p "$pid" >&2 2>/dev/null || true
  pgrep -P "$pid" 2>/dev/null | while read -r child; do
    [[ -n "$child" ]] && ps -o pid=,ppid=,state=,etime=,command= -p "$child" >&2 2>/dev/null || true
  done
  echo "Listeners on TCP $port:" >&2
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >&2 2>/dev/null || true
  if [[ -n "$probe_error_file" && -s "$probe_error_file" ]]; then
    echo "Last HTTP probe error:" >&2
    tail -n 20 "$probe_error_file" >&2 || true
  fi
  if [[ -f "$log_file" ]]; then
    echo "Last 80 lines of $log_file:" >&2
    tail -n 80 "$log_file" >&2 || true
  fi
  echo "--- end $label readiness diagnostics ---" >&2
}

wait_for_listener() {
  local port="$1"
  local label="$2"
  local pid="$3"
  local log_file="$4"
  local attempts="${5:-120}"
  local listeners

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    listeners="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if grep -qx "$pid" <<<"$listeners"; then
      return 0
    fi
    if [[ -n "$listeners" ]]; then
      echo "$label port $port is owned by unexpected PID(s): $listeners" >&2
      readiness_diagnostics "$label" "tcp://127.0.0.1:$port" "$pid" "$port" "$log_file"
      return 1
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "$label process exited before opening TCP $port" >&2
      readiness_diagnostics "$label" "tcp://127.0.0.1:$port" "$pid" "$port" "$log_file"
      return 1
    fi
    sleep 0.25
  done

  echo "Timed out waiting for $label listener on TCP $port" >&2
  readiness_diagnostics "$label" "tcp://127.0.0.1:$port" "$pid" "$port" "$log_file"
  return 1
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local pid="$3"
  local port="$4"
  local log_file="$5"
  local attempts="${6:-120}"
  local probe_error_file="$LANE_DIR/${label//[^A-Za-z0-9_.-]/_}.curl-error.log"

  : > "$probe_error_file"
  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl --noproxy '*' --connect-timeout 1 --max-time 3 -fsS "$url" >/dev/null 2>"$probe_error_file"; then
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "$label process exited before HTTP readiness at $url" >&2
      readiness_diagnostics "$label" "$url" "$pid" "$port" "$log_file" "$probe_error_file"
      return 1
    fi
    sleep 0.25
  done

  echo "Timed out waiting for $label HTTP readiness at $url" >&2
  readiness_diagnostics "$label" "$url" "$pid" "$port" "$log_file" "$probe_error_file"
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
      --seed-data
  )

  echo "Provisioning code-managed reference data..."
  (
    cd "$BACKEND_DIR"
    "${RUNTIME_ENV_COMMAND[@]}" ./venv/bin/python -m app.reference_data
  )
}

launch_backend() {
  assert_port_free "$BACKEND_PORT" "backend"
  (
    cd "$BACKEND_DIR"
    exec env NO_PROXY="$LOOPBACK_NO_PROXY" no_proxy="$LOOPBACK_NO_PROXY" \
      "${RUNTIME_ENV_COMMAND[@]}" ./venv/bin/python -m uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT"
  ) > "$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!
}

launch_frontend() {
  local vite_bin="$FRONTEND_DIR/node_modules/.bin/vite"
  [[ -x "$vite_bin" ]] || {
    echo "Canonical Vite binary is missing or not executable: $vite_bin" >&2
    return 1
  }
  assert_port_free "$FRONTEND_PORT" "frontend"
  : > "$FRONTEND_LOG"
  (
    cd "$FRONTEND_DIR"
    exec env NO_PROXY="$LOOPBACK_NO_PROXY" no_proxy="$LOOPBACK_NO_PROXY" \
      "$vite_bin" preview --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" --strictPort
  ) > "$FRONTEND_LOG" 2>&1 &
  FRONTEND_PID=$!
}

launch_frontend_with_readiness() {
  local startup_attempt
  for startup_attempt in 1 2; do
    launch_frontend
    if wait_for_listener "$FRONTEND_PORT" "isolated production frontend" "$FRONTEND_PID" "$FRONTEND_LOG" 80 \
      && wait_for_http "$FRONTEND_URL" "isolated production frontend" "$FRONTEND_PID" "$FRONTEND_PORT" "$FRONTEND_LOG" 80; then
      return 0
    fi
    if [[ "$startup_attempt" -eq 1 ]]; then
      echo "Isolated production frontend did not become ready; relaunching its process once without rerunning product verification." >&2
      if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        terminate_process_tree "$FRONTEND_PID"
      fi
      FRONTEND_PID=""
      sleep 0.5
    fi
  done
  echo "Isolated production frontend failed both bounded startup attempts." >&2
  return 1
}

assert_seeded_fixture_contract() {
  local headers=(-H "X-User-Id: $TEST_USER_ID" -H "X-Tenant-Id: $TEST_TENANT_ID")
  local tenants devices services external network far research monitoring vendors reference_options

  tenants="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/tenants/me")"
  [[ "$tenants" == *'"id":1'* && "$tenants" == *'"name":"Playwright Gate"'* && "$tenants" == *'"is_selected":true'* ]] || {
    echo "Disposable tenant contract failed: $tenants" >&2
    exit 1
  }

  devices="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/devices?include_deleted=true")"
  services="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/logical-services?include_deleted=true")"
  external="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/intelligence/entities?include_deleted=true")"
  network="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/networks/connections?include_deleted=true")"
  far="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/far/modes")"
  research="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/investigations?include_deleted=true")"
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

  printf '%s' "$far" | "$BACKEND_DIR/venv/bin/python" -c '
import json
import sys

rows = json.load(sys.stdin)
if not isinstance(rows, list) or not rows:
    raise SystemExit("Disposable FAR fixture must contain material rows")
for row in rows:
    severity = row.get("severity")
    occurrence = row.get("occurrence")
    detection = row.get("detection")
    rpn = row.get("rpn")
    if any(isinstance(value, bool) or not isinstance(value, int) for value in (severity, occurrence, detection, rpn)):
        raise SystemExit(f"FAR fixture contains non-integer scoring data: {row!r}")
    expected = severity * occurrence * detection
    if rpn != expected:
        raise SystemExit(f"FAR fixture RPN mismatch for {row.get('id')}: {rpn} != {expected}")
'

  [[ "$devices" != "[]" ]] || { echo "Expected material seeded devices, observed an empty collection." >&2; exit 1; }
  [[ "$services" != "[]" ]] || { echo "Expected material seeded services, observed an empty collection." >&2; exit 1; }
  [[ "$external" != "[]" ]] || { echo "Expected material seeded external entities, observed an empty collection." >&2; exit 1; }
  [[ "$network" != "[]" ]] || { echo "Expected material seeded network connections, observed an empty collection." >&2; exit 1; }
  [[ "$far" != "[]" ]] || { echo "Expected material seeded FAR modes, observed an empty collection." >&2; exit 1; }
  [[ "$research" != "[]" ]] || { echo "Expected material seeded Research investigations, observed an empty collection." >&2; exit 1; }
  [[ "$monitoring" != "[]" ]] || { echo "Expected material seeded monitoring records, observed an empty collection." >&2; exit 1; }
  [[ "$vendors" != "[]" ]] || { echo "Expected material seeded vendors, observed an empty collection." >&2; exit 1; }

  echo "Disposable Playwright fixture contract passed: one tenant, code-managed reference data, and material seeded domain rows."
}

assert_local_playwright_runtime() {
  local runner="$FRONTEND_DIR/node_modules/.bin/playwright"
  [[ -x "$runner" ]] || {
    echo "Canonical Playwright runner is missing or not executable: $runner" >&2
    exit 1
  }
  (
    cd "$FRONTEND_DIR"
    node - <<'NODE_PLAYWRIGHT_IDENTITY'
const testVersion = require('./node_modules/@playwright/test/package.json').version
const runnerVersion = require('./node_modules/playwright/package.json').version
if (testVersion !== runnerVersion) {
  throw new Error(`Playwright package identity mismatch: @playwright/test=${testVersion}, playwright=${runnerVersion}`)
}
console.log(`Canonical local Playwright identity verified: ${runnerVersion}`)
NODE_PLAYWRIGHT_IDENTITY
  )
}

assert_canonical_playwright_suite() {
  local spec
  local duplicate_count
  for spec in "${PLAYWRIGHT_SPECS[@]}"; do
    [[ -f "$FRONTEND_DIR/$spec" ]] || { echo "Missing canonical Playwright spec: $spec" >&2; exit 1; }
  done
  duplicate_count="$(printf '%s\n' "${PLAYWRIGHT_SPECS[@]}" | sort | uniq -d | wc -l | tr -d ' ')"
  [[ "$duplicate_count" == "0" ]] || { echo "Canonical Playwright spec list contains duplicates." >&2; exit 1; }
  [[ " ${PLAYWRIGHT_SPECS[*]} " == *" tests/golden-eight-seeded-visual-matrix.spec.ts "* ]] || {
    echo "Populated Golden Eight matrix is missing from the canonical gate." >&2
    exit 1
  }
}

assert_final_tenant_contract() {
  local headers=(-H "X-User-Id: $TEST_USER_ID")
  local tenants domain_headers
  tenants="$(curl -fsS "${headers[@]}" "$BACKEND_ORIGIN/api/v1/tenants/me")"
  TENANTS_JSON="$tenants" "$BACKEND_DIR/venv/bin/python" - "$TEST_TENANT_ID" <<'PY_FINAL_TENANT'
import json
import os
import sys
rows = json.loads(os.environ["TENANTS_JSON"])
tenant_id = int(sys.argv[1])
selected = [row for row in rows if row.get("is_selected")]
if len(selected) != 1 or selected[0].get("id") != tenant_id or selected[0].get("name") != "Playwright Gate":
    raise SystemExit(f"Final selected tenant mismatch: {rows!r}")
PY_FINAL_TENANT
  domain_headers="$(curl -fsS -D - -o /dev/null "${headers[@]}" "$BACKEND_ORIGIN/api/v1/devices?include_deleted=true" | tr -d '\r')"
  [[ "$domain_headers" == *"X-SysGrid-Tenant-Id: $TEST_TENANT_ID"* || "$domain_headers" == *"x-sysgrid-tenant-id: $TEST_TENANT_ID"* ]] || {
    echo "Final tenant response header missing or incorrect: $domain_headers" >&2
    exit 1
  }
}

assert_canonical_runtime_evidence() {
  local evidence
  local count
  count="$(find "$FRONTEND_DIR/test-results" -type f -name canonical-runtime-binding.json | wc -l | tr -d ' ')"
  [[ "$count" == "1" ]] || { echo "Expected exactly one canonical runtime binding artifact, found $count." >&2; exit 1; }
  evidence="$(find "$FRONTEND_DIR/test-results" -type f -name canonical-runtime-binding.json -print -quit)"
  "$BACKEND_DIR/venv/bin/python" - "$evidence" "$FRONTEND_ORIGIN" "$BACKEND_ORIGIN/api/v1" "$TEST_TENANT_ID" <<'PY_RUNTIME'
import json
import sys
from pathlib import Path

path, frontend, api, tenant = sys.argv[1:]
data = json.loads(Path(path).read_text())
expected = {
    "frontendOrigin": frontend,
    "apiBase": api,
    "tenantId": tenant,
    "tenantName": "Playwright Gate",
    "activeTenantName": "Playwright Gate",
    "observedApiOrigins": [api.removesuffix("/api/v1")],
    "observedTenantIds": [tenant],
    "browserTenantHeaders": [],
}
if data != expected:
    raise SystemExit(f"Canonical runtime evidence mismatch: {data!r} != {expected!r}")
PY_RUNTIME
}

assert_populated_golden_eight_evidence() {
  local key
  local count
  local matrix_count=0
  for key in "${GOLDEN_WORKSPACE_KEYS[@]}"; do
    count="$(find "$FRONTEND_DIR/test-results" -type f -name "${key}-populated-desktop.png" | wc -l | tr -d ' ')"
    [[ "$count" == "1" ]] || {
      echo "Expected exactly one populated desktop screenshot for $key, found $count." >&2
      exit 1
    }
    count="$(find "$FRONTEND_DIR/test-results" -type f -name "${key}-grid-populated-desktop.png" | wc -l | tr -d ' ')"
    [[ "$count" == "1" ]] || {
      echo "Expected exactly one fixed-viewport grid screenshot for $key, found $count." >&2
      exit 1
    }
    count="$(find "$FRONTEND_DIR/test-results" -type f -name "${key}-matrix-result.json" | wc -l | tr -d ' ')"
    [[ "$count" == "1" ]] || {
      echo "Expected exactly one matrix result for $key, found $count." >&2
      exit 1
    }
    matrix_count=$((matrix_count + count))
  done
  [[ "$matrix_count" == "${#GOLDEN_WORKSPACE_KEYS[@]}" ]] || {
    echo "Golden Eight matrix result count mismatch: $matrix_count." >&2
    exit 1
  }
  "$BACKEND_DIR/venv/bin/python" - "$FRONTEND_DIR/test-results" "${GOLDEN_WORKSPACE_KEYS[@]}" <<'PY_MATRIX'
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
keys = sys.argv[2:]
records = []
for key in keys:
    matches = list(root.rglob(f"{key}-matrix-result.json"))
    if len(matches) != 1:
        raise SystemExit(f"Expected one matrix record for {key}, found {len(matches)}")
    record = json.loads(matches[0].read_text())
    records.append(record)
    if record.get("workspace") != key:
        raise SystemExit(f"Workspace mismatch for {key}: {record!r}")
    if record.get("status") != "PASS" or record.get("failures"):
        raise SystemExit(f"Matrix failure for {key}: {record!r}")
if len(records) != len(keys):
    raise SystemExit(f"Required/returned matrix mismatch: {len(keys)} != {len(records)}")
(root / "golden-eight-complete-matrix.json").write_text(json.dumps({"schemaVersion": 1, "required": keys, "returned": [r["workspace"] for r in records], "records": records}, indent=2))
PY_MATRIX
}


json_array_lines() {
  local value="$1"
  "$BACKEND_DIR/venv/bin/python" - "$value" <<'PY_JSON_ARRAY'
import json, sys
value = json.loads(sys.argv[1] or '[]')
if not isinstance(value, list):
    raise SystemExit('target scope must be a JSON array')
for item in value:
    print(str(item))
PY_JSON_ARRAY
}

configure_campaign_scope() {
  [[ "$EXECUTION_PROFILE" == "development_campaign" ]] || return 0
  local token
  local selected=()
  while IFS= read -r token; do
    case "$token" in
      playwright:golden-seeded) selected+=(tests/golden-eight-seeded-visual-matrix.spec.ts) ;;
      playwright:shell-geometry) selected+=(tests/shell-and-search.spec.ts) ;;
      playwright:far-golden) selected+=(tests/far-golden-workspace.spec.ts) ;;
      playwright:sentinel) selected+=(tests/sentinel_comprehensive.spec.ts) ;;
      *) echo "Unsupported campaign test token: $token" >&2; exit 65 ;;
    esac
  done < <(json_array_lines "${SYSGRID_TARGETED_TESTS_JSON:-[]}")
  [[ "${#selected[@]}" -gt 0 ]] || { echo "Development campaign requires targeted Playwright tests." >&2; exit 65; }
  PLAYWRIGHT_SPECS=("${selected[@]}")
}

run_campaign_validation_lanes() {
  emit_progress static_started started "Campaign static, backend contract, and changed-area verification started."
  (
    cd "$BACKEND_DIR"
    ./venv/bin/pytest test_workspace_views.py -k "workspace_definition_registry_is_complete_and_typed or far_workspace_experience_and_saved_view_contract"
  )
  emit_progress backend_completed passed "Campaign FAR backend definition, saved-view, and experience contracts passed."
  (
    cd "$FRONTEND_DIR"
    npm run check:canonical-verification
    npm run test:lint
    npm run typecheck
    npm run test:coverage -- --maxWorkers "$FRONTEND_WORKERS" --run \
      src/components/shared/GoldenWorkspaceGeometryContract.test.ts \
      src/components/shared/OperationalWorkspaceCapabilities.test.ts \
      src/components/far/FARGoldenWorkspaceModel.test.ts
    VITE_API_BASE_URL="$BACKEND_ORIGIN" VITE_FRONTEND_ORIGIN="$FRONTEND_ORIGIN" npm run build
  )
  emit_progress frontend_completed passed "Campaign FAR model, golden geometry, capability, and production build verification passed."
}

run_static_lane() {
  cd "$FRONTEND_DIR"
  npm run check:canonical-verification
}

run_backend_lane() {
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
}

run_frontend_lane() {
  local status=0
  cd "$FRONTEND_DIR"

  if npm run test:lint; then
    echo "[frontend-lint] PASS"
  else
    echo "[frontend-lint] FAIL" >&2
    status=1
  fi

  if npm run check:operational-contracts; then
    echo "[frontend-contracts] PASS"
  else
    echo "[frontend-contracts] FAIL" >&2
    status=1
  fi

  if npm run typecheck; then
    echo "[frontend-typecheck] PASS"
  else
    echo "[frontend-typecheck] FAIL" >&2
    status=1
  fi

  if npm run test:coverage -- --maxWorkers "$FRONTEND_WORKERS"; then
    echo "[frontend-coverage] PASS"
  else
    echo "[frontend-coverage] FAIL" >&2
    status=1
  fi

  if VITE_API_BASE_URL="$BACKEND_ORIGIN" VITE_FRONTEND_ORIGIN="$FRONTEND_ORIGIN" npm run build; then
    echo "[frontend-build] PASS"
  else
    echo "[frontend-build] FAIL" >&2
    status=1
  fi

  return "$status"
}

run_validation_lanes() {
  local static_pid backend_pid frontend_pid
  local static_status backend_status frontend_status
  local overall=0

  emit_progress static_started started "Canonical static verification started."
  emit_progress backend_started started "Backend coverage lane started."
  emit_progress frontend_started started "Frontend lint, contracts, typecheck, coverage, and production build lane started."

  run_static_lane > "$LANE_DIR/static.log" 2>&1 &
  static_pid=$!
  run_backend_lane > "$LANE_DIR/backend.log" 2>&1 &
  backend_pid=$!
  run_frontend_lane > "$LANE_DIR/frontend.log" 2>&1 &
  frontend_pid=$!

  set +e
  wait "$static_pid"
  static_status=$?
  wait "$backend_pid"
  backend_status=$?
  wait "$frontend_pid"
  frontend_status=$?
  set -e

  printf '\n===== Canonical static lane =====\n'
  cat "$LANE_DIR/static.log"
  printf '\n===== Backend coverage lane =====\n'
  cat "$LANE_DIR/backend.log"
  printf '\n===== Frontend verification lane =====\n'
  cat "$LANE_DIR/frontend.log"

  if [[ "$static_status" == "0" ]]; then
    emit_progress static_completed passed "Canonical static verification passed."
  else
    emit_progress static_completed failed "Canonical static verification failed."
    overall=1
  fi

  if [[ "$backend_status" == "0" ]]; then
    emit_progress backend_completed passed "Backend coverage lane passed."
  else
    emit_progress backend_completed failed "Backend coverage lane failed."
    overall=1
  fi

  if [[ "$frontend_status" == "0" ]]; then
    emit_progress frontend_completed passed "Frontend verification lane passed."
    emit_progress build_completed passed "Canonical production frontend build completed."
  else
    emit_progress frontend_completed failed "Frontend verification lane failed."
    overall=1
  fi

  return "$overall"
}


accel_now() {
  "$ACCEL_PY" -c 'import time; print(time.time())'
}

accel_record() {
  local event_id="$1"
  local status="$2"
  local started="$3"
  "$ACCEL_PY" "$ACCELERATOR" record \
    --output "$ACCEL_TIMELINE" \
    --event "$event_id" \
    --status "$status" \
    --started "$started" >/dev/null 2>&1 || true
}

load_accelerator_plan() {
  local key value promotion_value=""
  [[ -f "$ACCELERATOR" ]] || { echo "Missing universal verification accelerator: $ACCELERATOR" >&2; return 1; }
  "$ACCEL_PY" -m py_compile "$ACCELERATOR"
  mkdir -p "$ACCEL_DIR"
  "$ACCEL_PY" "$ACCELERATOR" plan --root "$ROOT_DIR" --output "$ACCEL_PLAN" --env-output "$ACCEL_ENV" >/dev/null
  while IFS='=' read -r key value; do
    case "$key" in
      SYSGRID_ACCEL_FRONTEND_WORKERS) FRONTEND_WORKERS="$value" ;;
      SYSGRID_ACCEL_PARALLEL_HEAVY) ACCEL_PARALLEL_HEAVY="$value" ;;
      SYSGRID_ACCEL_PLAYWRIGHT_WORKERS) PLAYWRIGHT_WORKERS="$value" ;;
      SYSGRID_ACCEL_PROMOTION_SPECS) promotion_value="$value" ;;
      SYSGRID_ACCEL_PROFILE) ACCEL_PROFILE="$value" ;;
    esac
  done < "$ACCEL_ENV"
  [[ "$FRONTEND_WORKERS" =~ ^[1-9][0-9]*$ ]] || { echo "Invalid accelerator frontend worker count: $FRONTEND_WORKERS" >&2; return 1; }
  [[ "$PLAYWRIGHT_WORKERS" == "1" ]] || { echo "Canonical shared-tenant Playwright must remain single-worker." >&2; return 1; }
  PROMOTION_SPECS=()
  if [[ -n "$promotion_value" ]]; then
    IFS=':' read -r -a PROMOTION_SPECS <<< "$promotion_value"
  fi
  echo "[sysgrid-accelerator] profile=$ACCEL_PROFILE frontend_workers=$FRONTEND_WORKERS parallel_heavy=$ACCEL_PARALLEL_HEAVY playwright_workers=$PLAYWRIGHT_WORKERS"
  echo "[sysgrid-accelerator] impact plan: $ACCEL_PLAN"
}

run_fast_preflight() {
  local started
  local syntax_pid canonical_pid lint_pid contracts_pid typecheck_pid
  local syntax_status canonical_status lint_status contracts_status typecheck_status
  local overall=0
  started="$(accel_now)"
  emit_progress accelerator_preflight_started started "Universal fast-fail syntax, contracts, lint, and typecheck preflight started."
  (
    cd "$ROOT_DIR"
    /bin/bash -n scripts/verify-app.sh
    "$ACCEL_PY" -m py_compile scripts/sysgrid/verify_accelerator.py
  ) > "$LANE_DIR/accelerator-syntax.log" 2>&1 & syntax_pid=$!
  (cd "$FRONTEND_DIR" && npm run check:canonical-verification) > "$LANE_DIR/accelerator-canonical.log" 2>&1 & canonical_pid=$!
  (cd "$FRONTEND_DIR" && npm run test:lint) > "$LANE_DIR/accelerator-lint.log" 2>&1 & lint_pid=$!
  (cd "$FRONTEND_DIR" && npm run check:operational-contracts) > "$LANE_DIR/accelerator-contracts.log" 2>&1 & contracts_pid=$!
  (cd "$FRONTEND_DIR" && npm run typecheck) > "$LANE_DIR/accelerator-typecheck.log" 2>&1 & typecheck_pid=$!
  set +e
  wait "$syntax_pid"; syntax_status=$?
  wait "$canonical_pid"; canonical_status=$?
  wait "$lint_pid"; lint_status=$?
  wait "$contracts_pid"; contracts_status=$?
  wait "$typecheck_pid"; typecheck_status=$?
  set -e
  printf '\n===== Accelerator syntax lane =====\n'; cat "$LANE_DIR/accelerator-syntax.log"
  printf '\n===== Accelerator canonical contract lane =====\n'; cat "$LANE_DIR/accelerator-canonical.log"
  printf '\n===== Accelerator architecture linter lane =====\n'; cat "$LANE_DIR/accelerator-lint.log"
  printf '\n===== Accelerator operational contracts lane =====\n'; cat "$LANE_DIR/accelerator-contracts.log"
  printf '\n===== Accelerator TypeScript lane =====\n'; cat "$LANE_DIR/accelerator-typecheck.log"
  for status in "$syntax_status" "$canonical_status" "$lint_status" "$contracts_status" "$typecheck_status"; do
    [[ "$status" == "0" ]] || overall=1
  done
  if [[ "$overall" == "0" ]]; then
    emit_progress accelerator_preflight_completed passed "Universal fast-fail preflight passed."
    accel_record preflight passed "$started"
  else
    emit_progress accelerator_preflight_completed failed "Universal fast-fail preflight failed before expensive verification."
    accel_record preflight failed "$started"
  fi
  return "$overall"
}

run_frontend_build_accelerated() {
  local started status=0
  started="$(accel_now)"
  emit_progress build_started started "Canonical production frontend build started before runtime promotion."
  if (cd "$FRONTEND_DIR" && VITE_API_BASE_URL="$BACKEND_ORIGIN" VITE_FRONTEND_ORIGIN="$FRONTEND_ORIGIN" npm run build); then
    emit_progress build_completed passed "Canonical production frontend build completed."
    accel_record frontend_build passed "$started"
  else
    status=$?
    emit_progress build_completed failed "Canonical production frontend build failed."
    accel_record frontend_build failed "$started"
  fi
  return "$status"
}

run_frontend_coverage_lane() {
  cd "$FRONTEND_DIR"
  npm run test:coverage -- --maxWorkers "$FRONTEND_WORKERS"
}

start_heavy_validation_lanes() {
  emit_progress backend_started started "Backend full coverage lane started."
  run_backend_lane > "$LANE_DIR/backend.log" 2>&1 &
  BACKEND_COVERAGE_PID=$!
  if [[ "$ACCEL_PARALLEL_HEAVY" == "1" ]]; then
    emit_progress frontend_started started "Frontend full coverage lane started concurrently with runtime promotion."
    run_frontend_coverage_lane > "$LANE_DIR/frontend-coverage.log" 2>&1 &
    FRONTEND_COVERAGE_PID=$!
    FRONTEND_COVERAGE_DEFERRED=0
  else
    FRONTEND_COVERAGE_DEFERRED=1
    : > "$LANE_DIR/frontend-coverage.log"
    echo "[sysgrid-accelerator] Frontend coverage deferred until affected browser promotion passes because current resource headroom is guarded." >> "$LANE_DIR/frontend-coverage.log"
  fi
}

cancel_heavy_validation_lanes() {
  local pid
  for pid in "$BACKEND_COVERAGE_PID" "$FRONTEND_COVERAGE_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      terminate_process_tree "$pid"
    fi
  done
  set +e
  [[ -n "$BACKEND_COVERAGE_PID" ]] && wait "$BACKEND_COVERAGE_PID" 2>/dev/null
  [[ -n "$FRONTEND_COVERAGE_PID" ]] && wait "$FRONTEND_COVERAGE_PID" 2>/dev/null
  set -e
}

wait_heavy_validation_lanes() {
  local backend_status frontend_status overall=0
  local backend_started frontend_started
  backend_started="$(accel_now)"
  set +e
  wait "$BACKEND_COVERAGE_PID"; backend_status=$?
  set -e
  BACKEND_COVERAGE_PID=""
  if [[ "$FRONTEND_COVERAGE_DEFERRED" == "1" ]]; then
    frontend_started="$(accel_now)"
    set +e
    run_frontend_coverage_lane > "$LANE_DIR/frontend-coverage.log" 2>&1
    frontend_status=$?
    set -e
    accel_record frontend_coverage "$([[ "$frontend_status" == "0" ]] && echo passed || echo failed)" "$frontend_started"
  else
    set +e
    wait "$FRONTEND_COVERAGE_PID"; frontend_status=$?
    set -e
    FRONTEND_COVERAGE_PID=""
  fi
  printf '\n===== Backend full coverage lane =====\n'; cat "$LANE_DIR/backend.log"
  printf '\n===== Frontend full coverage lane =====\n'; cat "$LANE_DIR/frontend-coverage.log"
  if [[ "$backend_status" == "0" ]]; then
    emit_progress backend_completed passed "Backend full coverage lane passed."
  else
    emit_progress backend_completed failed "Backend full coverage lane failed."
    overall=1
  fi
  if [[ "$frontend_status" == "0" ]]; then
    emit_progress frontend_completed passed "Frontend full coverage lane passed."
  else
    emit_progress frontend_completed failed "Frontend full coverage lane failed."
    overall=1
  fi
  return "$overall"
}

split_playwright_specs() {
  local spec candidate selected
  REMAINING_SPECS=()
  local admitted=()
  for candidate in "${PROMOTION_SPECS[@]}"; do
    selected=0
    for spec in "${PLAYWRIGHT_SPECS[@]}"; do
      if [[ "$candidate" == "$spec" ]]; then selected=1; break; fi
    done
    [[ "$selected" == "1" ]] || { echo "Accelerator selected a non-canonical promotion spec: $candidate" >&2; return 1; }
    admitted+=("$candidate")
  done
  PROMOTION_SPECS=("${admitted[@]}")
  for spec in "${PLAYWRIGHT_SPECS[@]}"; do
    selected=0
    for candidate in "${PROMOTION_SPECS[@]}"; do
      if [[ "$spec" == "$candidate" ]]; then selected=1; break; fi
    done
    [[ "$selected" == "1" ]] || REMAINING_SPECS+=("$spec")
  done
}

run_playwright_group() {
  local label="$1"; shift
  local started status
  local specs=("$@")
  [[ "${#specs[@]}" -gt 0 ]] || return 0
  started="$(accel_now)"
  echo "[sysgrid-accelerator] $label specs (${#specs[@]}): ${specs[*]}"
  set +e
  (
    cd "$FRONTEND_DIR"
    "${PLAYWRIGHT_ENV_COMMAND[@]}" "$FRONTEND_DIR/node_modules/.bin/playwright" test "${specs[@]}" --workers="$PLAYWRIGHT_WORKERS"
  )
  status=$?
  set -e
  accel_record "$label" "$([[ "$status" == "0" ]] && echo passed || echo failed)" "$started"
  return "$status"
}

assert_canonical_playwright_suite
assert_local_playwright_runtime
configure_campaign_scope

if [[ "$EXECUTION_PROFILE" == "development_campaign" ]]; then
  run_campaign_validation_lanes
  prepare_disposable_runtime
  launch_backend
  wait_for_listener "$BACKEND_PORT" "isolated backend" "$BACKEND_PID" "$BACKEND_LOG" 240
  wait_for_http "$BACKEND_URL" "isolated backend" "$BACKEND_PID" "$BACKEND_PORT" "$BACKEND_LOG" 240
  launch_frontend_with_readiness
  assert_seeded_fixture_contract
  emit_progress runtime_ready passed "Disposable tenant, backend, and exact production frontend are ready."
else
  reset_generated_evidence
  mkdir -p "$ACCEL_DIR"
  load_accelerator_plan
  run_fast_preflight
  run_frontend_build_accelerated
  start_heavy_validation_lanes
  prepare_disposable_runtime
  launch_backend
  wait_for_listener "$BACKEND_PORT" "isolated backend" "$BACKEND_PID" "$BACKEND_LOG" 240
  wait_for_http "$BACKEND_URL" "isolated backend" "$BACKEND_PID" "$BACKEND_PORT" "$BACKEND_LOG" 240
  launch_frontend_with_readiness
  assert_seeded_fixture_contract
  emit_progress runtime_ready passed "Disposable tenant, backend, and exact production frontend are ready."
fi

PLAYWRIGHT_ENV_COMMAND=(
  env
  -u CONFIG_DATABASE_URL
  -u DATABASE_URL
  -u TENANT_STORAGE_ROOT
  -u DEFAULT_TENANT_NAME
  -u PUBLIC_READONLY_ENABLED
  -u DEFAULT_USER_ID
  -u AUTO_ADMIN_USER_IDS
  -u USER_ID_ENV_VAR
  -u SYSGRID_VERIFY_RUNTIME_USER_ID
  -u SYSGRID_VERIFY_USER_ID
  -u user_name
  -u DEFAULT_EMAIL_DOMAIN
  -u ENVIRONMENT
  -u TESTING
  -u ALLOWED_HOSTS
  -u BACKEND_CORS_ORIGINS
  -u IDENTITY_MODE
  -u TRUSTED_PROXY_USER_HEADER
  "SYSGRID_CANONICAL_GATE=1"
  "SYSGRID_EXPECTED_FRONTEND_ORIGIN=$FRONTEND_ORIGIN"
  "SYSGRID_EXPECTED_API_BASE=$BACKEND_ORIGIN/api/v1"
  "PW_API_BASE=$BACKEND_ORIGIN/api/v1"
  "PW_TENANT_ID=$TEST_TENANT_ID"
  "USER_ID=$TEST_USER_ID"
  "PLAYWRIGHT_BASE_URL=$FRONTEND_ORIGIN"
)

if [[ "$EXECUTION_PROFILE" == "development_campaign" ]]; then
  emit_progress playwright_started started "Campaign Playwright promotion started."
  if ! run_playwright_group campaign_playwright "${PLAYWRIGHT_SPECS[@]}"; then
    emit_progress playwright_completed failed "Campaign Playwright promotion failed."
    exit 1
  fi
  emit_progress playwright_completed passed "Campaign Playwright promotion passed."
else
  split_playwright_specs
  emit_progress playwright_started started "Affected browser promotion started before the remaining canonical matrix."
  if [[ "${#PROMOTION_SPECS[@]}" -gt 0 ]]; then
    if ! run_playwright_group affected_browser_promotion "${PROMOTION_SPECS[@]}"; then
      emit_progress playwright_completed failed "Affected browser promotion failed; independent expensive lanes were cancelled."
      cancel_heavy_validation_lanes
      exit 1
    fi
    echo "[sysgrid-accelerator] Affected browser promotion passed. Completing full non-duplicated acceptance proof."
  fi
  if ! wait_heavy_validation_lanes; then
    emit_progress playwright_completed failed "Full backend or frontend coverage failed after affected browser promotion."
    exit 1
  fi
  if ! run_playwright_group remaining_canonical_playwright "${REMAINING_SPECS[@]}"; then
    emit_progress playwright_completed failed "Remaining canonical Playwright matrix failed."
    exit 1
  fi
  emit_progress playwright_completed passed "Affected promotion and complete non-duplicated canonical Playwright matrix passed."
  assert_final_tenant_contract
  assert_canonical_runtime_evidence
  assert_populated_golden_eight_evidence
fi
