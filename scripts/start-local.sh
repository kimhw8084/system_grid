#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
PYTHON_BIN="${PYTHON_BIN:-python3}"

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
API_BASE_URL="${API_BASE_URL:-}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-}"
DEFAULT_USER_ID_VALUE="${DEFAULT_USER_ID_VALUE:-haewon.kim}"
AUTO_ADMIN_USER_IDS_VALUE="${AUTO_ADMIN_USER_IDS_VALUE:-$DEFAULT_USER_ID_VALUE}"
ADMIN_FULL_NAME="${ADMIN_FULL_NAME:-Haewon Kim}"
ADMIN_EMAIL="${ADMIN_EMAIL:-haewon.kim@sysgrid.local}"
ADMIN_DEPARTMENT="${ADMIN_DEPARTMENT:-Infrastructure}"
USER_ID_ENV_VAR_VALUE="${USER_ID_ENV_VAR_VALUE:-USER_ID}"
RUNTIME_EFFECTIVE_USER_ID="${RUNTIME_EFFECTIVE_USER_ID:-}"
SEED_DOMAIN_DATA="${SEED_DOMAIN_DATA:-true}"
RUN_TYPECHECK="${RUN_TYPECHECK:-true}"
STRICT_STARTUP_CHECKS="${STRICT_STARTUP_CHECKS:-false}"
PRINT_RUNTIME_CONFIG="${PRINT_RUNTIME_CONFIG:-false}"
BUGANIZER_URL="${BUGANIZER_URL:-}"
EXISTING_ALLOWED_HOSTS="${ALLOWED_HOSTS:-}"
EXISTING_CORS_ORIGINS="${BACKEND_CORS_ORIGINS:-}"

usage() {
  cat <<'EOF'
Usage: ./scripts/start-local.sh [options]

Starts a disposable local SysGrid environment and supports localhost, VS Code
forwarded ports, company proxy origins, and explicit remote development origins.

Options:
  --backend-host <host>              Local bind host for the backend
  --backend-port <port>              Local backend port
  --frontend-host <host>             Local bind host for Vite
  --frontend-port <port>             Local frontend port
  --api-base-url <origin>            Browser-visible backend origin, no /api/v1
  --frontend-origin <origin>         Browser-visible frontend origin
  --default-user-id <userId>
  --auto-admin-user-ids <csv>
  --admin-full-name <name>
  --admin-email <email>
  --admin-department <department>
  --user-id-env-var <envVarName>
  --runtime-effective-user-id <userId>
  --buganizer-url <url>              Optional company Buganizer/new-issue URL
  --seed-data
  --no-seed-data
  --skip-typecheck
  --strict-checks
  --print-runtime-config             Resolve and print host/CORS config, then exit
  --help

Examples:
  ./scripts/start-local.sh

  ./scripts/start-local.sh \
    --api-base-url http://8000.vscode.company.example/ \
    --frontend-origin http://5173.vscode.company.example/ \
    --user-id-env-var AccessKey \
    --skip-typecheck
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-host) BACKEND_HOST="$2"; shift 2 ;;
    --backend-port) BACKEND_PORT="$2"; shift 2 ;;
    --frontend-host) FRONTEND_HOST="$2"; shift 2 ;;
    --frontend-port) FRONTEND_PORT="$2"; shift 2 ;;
    --api-base-url) API_BASE_URL="$2"; shift 2 ;;
    --frontend-origin) FRONTEND_ORIGIN="$2"; shift 2 ;;
    --default-user-id) DEFAULT_USER_ID_VALUE="$2"; shift 2 ;;
    --auto-admin-user-ids) AUTO_ADMIN_USER_IDS_VALUE="$2"; shift 2 ;;
    --admin-full-name) ADMIN_FULL_NAME="$2"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-department) ADMIN_DEPARTMENT="$2"; shift 2 ;;
    --user-id-env-var) USER_ID_ENV_VAR_VALUE="$2"; shift 2 ;;
    --runtime-effective-user-id) RUNTIME_EFFECTIVE_USER_ID="$2"; shift 2 ;;
    --buganizer-url) BUGANIZER_URL="$2"; shift 2 ;;
    --seed-data) SEED_DOMAIN_DATA="true"; shift ;;
    --no-seed-data) SEED_DOMAIN_DATA="false"; shift ;;
    --skip-typecheck) RUN_TYPECHECK="false"; shift ;;
    --strict-checks) STRICT_STARTUP_CHECKS="true"; shift ;;
    --print-runtime-config) PRINT_RUNTIME_CONFIG="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

command -v "$PYTHON_BIN" >/dev/null 2>&1 || {
  echo "Missing Python interpreter: $PYTHON_BIN" >&2
  exit 1
}

if [[ -z "$API_BASE_URL" ]]; then
  API_BASE_URL="http://$BACKEND_HOST:$BACKEND_PORT"
fi
if [[ -z "$FRONTEND_ORIGIN" ]]; then
  FRONTEND_ORIGIN="http://$FRONTEND_HOST:$FRONTEND_PORT"
fi

runtime_assignments="$(
  "$PYTHON_BIN" "$ROOT_DIR/scripts/runtime_origin_config.py" \
    --api-base-url "$API_BASE_URL" \
    --frontend-origin "$FRONTEND_ORIGIN" \
    --backend-host "$BACKEND_HOST" \
    --backend-port "$BACKEND_PORT" \
    --frontend-host "$FRONTEND_HOST" \
    --frontend-port "$FRONTEND_PORT" \
    --allowed-hosts "$EXISTING_ALLOWED_HOSTS" \
    --cors-origins "$EXISTING_CORS_ORIGINS" \
    --format shell
)"
eval "$runtime_assignments"
export API_BASE_URL FRONTEND_ORIGIN ALLOWED_HOSTS BACKEND_CORS_ORIGINS

if [[ -z "$RUNTIME_EFFECTIVE_USER_ID" ]]; then
  RUNTIME_EFFECTIVE_USER_ID="${!USER_ID_ENV_VAR_VALUE:-}"
fi
SOURCE_OF_TRUTH_USER_ID="${RUNTIME_EFFECTIVE_USER_ID:-$DEFAULT_USER_ID_VALUE}"
if [[ -n "$RUNTIME_EFFECTIVE_USER_ID" && ",$AUTO_ADMIN_USER_IDS_VALUE," != *",$RUNTIME_EFFECTIVE_USER_ID,"* ]]; then
  AUTO_ADMIN_USER_IDS_VALUE="${AUTO_ADMIN_USER_IDS_VALUE},$RUNTIME_EFFECTIVE_USER_ID"
fi

print_runtime_summary() {
  cat <<EOF

RESOLVED SYSGRID DEVELOPMENT RUNTIME
------------------------------------
Local backend bind:       http://$BACKEND_HOST:$BACKEND_PORT
Browser API origin:       $API_BASE_URL
Trusted API hostname:     $API_PUBLIC_HOSTNAME
Local frontend bind:      http://$FRONTEND_HOST:$FRONTEND_PORT
Browser frontend origin:  $FRONTEND_ORIGIN
Allowed hosts:            $ALLOWED_HOSTS
Allowed CORS origins:     $BACKEND_CORS_ORIGINS
Health check:             $PUBLIC_HEALTH_URL
User identity variable:   $USER_ID_ENV_VAR_VALUE
Effective user:           $SOURCE_OF_TRUTH_USER_ID
Buganizer URL:            ${BUGANIZER_URL:-<not configured>}
EOF
}

print_runtime_summary
if [[ "$PRINT_RUNTIME_CONFIG" == "true" ]]; then
  exit 0
fi

LOCAL_CONFIG_DB="$BACKEND_DIR/config.local.db"
LOCAL_TENANT_ROOT="$BACKEND_DIR/tenants/local-demo"
LOCAL_TENANT_DB_REL="tenants/local-demo/local_demo.db"
LOCAL_TENANT_DB="$BACKEND_DIR/$LOCAL_TENANT_DB_REL"
LOCAL_BACKEND_ENV_FILE="$BACKEND_DIR/.env.local.runtime"
BACKEND_ENV_BACKUP_FILE="$(mktemp -t sysgrid-backend-env)"
BACKEND_ENV_EXISTED="false"
BACKEND_ENV_RESTORED="false"
if [[ -e "$LOCAL_BACKEND_ENV_FILE" ]]; then
  cp -p "$LOCAL_BACKEND_ENV_FILE" "$BACKEND_ENV_BACKUP_FILE"
  BACKEND_ENV_EXISTED="true"
fi

export CONFIG_DATABASE_URL="sqlite+aiosqlite:///$LOCAL_CONFIG_DB"
export DATABASE_URL="sqlite+aiosqlite:///$LOCAL_TENANT_DB"
export TENANT_STORAGE_ROOT="$LOCAL_TENANT_ROOT"
export FRONTEND_ENV_FILE_PATH="$FRONTEND_DIR/.env.local"
export BACKEND_ENV_FILE_PATH="$LOCAL_BACKEND_ENV_FILE"
export DEFAULT_TENANT_NAME="Local Demo"
export PUBLIC_READONLY_ENABLED="true"
export PUBLIC_READONLY_TENANT_NAME="Local Demo"
export DEFAULT_USER_ID="$DEFAULT_USER_ID_VALUE"
export AUTO_ADMIN_USER_IDS="$AUTO_ADMIN_USER_IDS_VALUE"
export USER_ID_ENV_VAR="$USER_ID_ENV_VAR_VALUE"
export "$USER_ID_ENV_VAR_VALUE=$SOURCE_OF_TRUTH_USER_ID"
export USER_ID="$SOURCE_OF_TRUTH_USER_ID"
export DEFAULT_EMAIL_DOMAIN="sysgrid.local"
export ENVIRONMENT="development"

restore_backend_runtime_env() {
  if [[ "$BACKEND_ENV_RESTORED" == "true" ]]; then
    return 0
  fi
  if [[ "$BACKEND_ENV_EXISTED" == "true" ]]; then
    if ! cp -p "$BACKEND_ENV_BACKUP_FILE" "$LOCAL_BACKEND_ENV_FILE"; then
      echo "WARNING: failed to restore $LOCAL_BACKEND_ENV_FILE" >&2
      return 1
    fi
  else
    rm -f "$LOCAL_BACKEND_ENV_FILE"
  fi
  rm -f "$BACKEND_ENV_BACKUP_FILE"
  BACKEND_ENV_RESTORED="true"
}

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then kill "$FRONTEND_PID" >/dev/null 2>&1 || true; fi
  restore_backend_runtime_env || true
}
trap cleanup EXIT INT TERM

kill_listener_on_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Stopping existing listener(s) on port $port: $pids"
    for pid in $pids; do
      kill "$pid" >/dev/null 2>&1 || true
    done
    sleep 1
  fi
}

require_file() {
  local path="$1"
  local message="$2"
  if [[ ! -e "$path" ]]; then
    echo "Missing required file: $path" >&2
    echo "$message" >&2
    exit 1
  fi
}

print_probe_failure() {
  local title="$1"
  local status_code="$2"
  local body="$3"
  cat >&2 <<EOF

BACKEND PREFLIGHT FAILED: $title
----------------------------------------
Local probe:          $LOCAL_HEALTH_URL
Browser API origin:   $API_BASE_URL
Host header tested:   $API_PUBLIC_HOSTNAME
Frontend origin:      $FRONTEND_ORIGIN
HTTP status:          $status_code
Response body:        ${body:-<empty>}

Resolved ALLOWED_HOSTS:
$ALLOWED_HOSTS

Resolved BACKEND_CORS_ORIGINS:
$BACKEND_CORS_ORIGINS
EOF
}

wait_for_backend_contract() {
  local body_file header_file status_code body_text request_id allow_origin
  body_file="$(mktemp -t sysgrid-health-body)"
  header_file="$(mktemp -t sysgrid-health-headers)"
  trap 'rm -f "$body_file" "$header_file"; cleanup' EXIT INT TERM

  for _ in $(seq 1 60); do
    status_code="$(
      curl -sS \
        -D "$header_file" \
        -o "$body_file" \
        -w '%{http_code}' \
        -H "Host: $API_PUBLIC_HOSTNAME" \
        -H "Origin: $FRONTEND_ORIGIN" \
        "$LOCAL_HEALTH_URL" 2>/dev/null || true
    )"
    if [[ "$status_code" == "200" ]]; then
      body_text="$(tr '\n' ' ' < "$body_file" | cut -c1-500)"
      request_id="$(awk 'BEGIN{IGNORECASE=1} /^x-request-id:/ {sub(/\r$/,"",$2); print $2; exit}' "$header_file")"
      allow_origin="$(awk 'BEGIN{IGNORECASE=1} /^access-control-allow-origin:/ {sub(/\r$/,"",$2); print $2; exit}' "$header_file")"
      if [[ "$allow_origin" != "$FRONTEND_ORIGIN" && "$allow_origin" != "*" ]]; then
        print_probe_failure "CORS origin was not accepted" "$status_code" "$body_text"
        echo "Expected Access-Control-Allow-Origin: $FRONTEND_ORIGIN" >&2
        echo "Observed Access-Control-Allow-Origin: ${allow_origin:-<missing>}" >&2
        exit 1
      fi
      echo "Backend host/CORS preflight passed."
      echo "  HTTP status: 200"
      echo "  Request ID: ${request_id:-<not returned>}"
      echo "  Access-Control-Allow-Origin: ${allow_origin:-<missing>}"
      rm -f "$body_file" "$header_file"
      trap cleanup EXIT INT TERM
      return 0
    fi

    body_text="$(tr '\n' ' ' < "$body_file" 2>/dev/null | cut -c1-500)"
    if [[ "$status_code" == "400" && "$body_text" == *"Invalid host header"* ]]; then
      print_probe_failure "trusted-host rejection" "$status_code" "$body_text"
      echo "Root cause: $API_PUBLIC_HOSTNAME is not accepted by TrustedHostMiddleware." >&2
      echo "The startup script attempted to configure it automatically; inspect backend/.env.local.runtime for drift." >&2
      exit 1
    fi
    sleep 1
  done

  body_text="$(tr '\n' ' ' < "$body_file" 2>/dev/null | cut -c1-500)"
  print_probe_failure "backend did not become healthy" "${status_code:-000}" "$body_text"
  exit 1
}

echo "Preparing disposable local SysGrid environment..."

if [[ "$RUN_TYPECHECK" == "true" ]]; then
  echo "Running frontend typecheck..."
  TYPECHECK_LOG="$(mktemp -t sysgrid-typecheck)"
  if (
    cd "$FRONTEND_DIR"
    npx tsc --noEmit
  ) >"$TYPECHECK_LOG" 2>&1; then
    echo "Frontend typecheck passed."
  else
    echo "Frontend typecheck reported errors."
    echo "Log: $TYPECHECK_LOG"
    sed -n '1,40p' "$TYPECHECK_LOG"
    if [[ "$STRICT_STARTUP_CHECKS" == "true" ]]; then
      echo "Strict startup checks enabled. Refusing to start until typecheck passes."
      exit 1
    fi
    echo "Continuing startup because this script is for local bootstrapping. Use ./scripts/verify-app.sh for strict validation."
  fi
else
  echo "Skipping frontend typecheck."
fi

echo "Cleaning frontend build artifacts..."
rm -rf "$FRONTEND_DIR/dist" "$FRONTEND_DIR/.vite" "$FRONTEND_DIR/node_modules/.cache"

require_file "$BACKEND_DIR/venv/bin/python" "Create the backend venv first: cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt"
require_file "$FRONTEND_DIR/node_modules" "Install frontend dependencies first: cd frontend && npm install"

kill_listener_on_port "$BACKEND_PORT"
kill_listener_on_port "$FRONTEND_PORT"

mkdir -p "$BACKEND_DIR/tenants"
rm -f "$LOCAL_CONFIG_DB" "$LOCAL_TENANT_DB"
rm -rf "$LOCAL_TENANT_ROOT"
mkdir -p "$LOCAL_TENANT_ROOT"

cat > "$LOCAL_BACKEND_ENV_FILE" <<EOF
ALLOWED_HOSTS=$ALLOWED_HOSTS
BACKEND_CORS_ORIGINS=$BACKEND_CORS_ORIGINS
CONFIG_DATABASE_URL=$CONFIG_DATABASE_URL
DATABASE_URL=$DATABASE_URL
TENANT_STORAGE_ROOT=$TENANT_STORAGE_ROOT
FRONTEND_ENV_FILE_PATH=$FRONTEND_ENV_FILE_PATH
BACKEND_ENV_FILE_PATH=$BACKEND_ENV_FILE_PATH
DEFAULT_TENANT_NAME=$DEFAULT_TENANT_NAME
PUBLIC_READONLY_ENABLED=$PUBLIC_READONLY_ENABLED
PUBLIC_READONLY_TENANT_NAME=$PUBLIC_READONLY_TENANT_NAME
DEFAULT_USER_ID=$DEFAULT_USER_ID
AUTO_ADMIN_USER_IDS=$AUTO_ADMIN_USER_IDS
USER_ID_ENV_VAR=$USER_ID_ENV_VAR
SOURCE_OF_TRUTH_USER_ID=$SOURCE_OF_TRUTH_USER_ID
${USER_ID_ENV_VAR_VALUE}=$SOURCE_OF_TRUTH_USER_ID
DEFAULT_EMAIL_DOMAIN=$DEFAULT_EMAIL_DOMAIN
PORT=$BACKEND_PORT
EOF

cat > "$FRONTEND_DIR/.env.local" <<EOF
VITE_API_BASE_URL=$API_BASE_URL
VITE_FRONTEND_ORIGIN=$FRONTEND_ORIGIN
VITE_PORT=$FRONTEND_PORT
VITE_BACKEND_PORT=$BACKEND_PORT
VITE_BACKEND_HOST=$BACKEND_HOST
VITE_BUGANIZER_URL=$BUGANIZER_URL
EOF

echo "Seeding disposable local tenant..."
seed_args=(
  --tenant-name "Local Demo"
  --tenant-db "$LOCAL_TENANT_DB_REL"
  --admin-user "$DEFAULT_USER_ID_VALUE"
)
if [[ "$SEED_DOMAIN_DATA" == "true" ]]; then
  seed_args+=(--seed-data)
else
  seed_args+=(--no-seed-data)
fi
if [[ -n "$RUNTIME_EFFECTIVE_USER_ID" ]]; then
  seed_args+=(--extra-admin-user "$RUNTIME_EFFECTIVE_USER_ID")
fi
(cd "$ROOT_DIR" && ./backend/venv/bin/python seed.py "${seed_args[@]}")

echo "Provisioning code-managed reference data..."
(
  cd "$BACKEND_DIR"
  ./venv/bin/python -m app.reference_data
)

echo "Running preflight..."
"$ROOT_DIR/scripts/preflight.py"

echo "Starting backend on http://$BACKEND_HOST:$BACKEND_PORT"
(
  cd "$BACKEND_DIR"
  PYTHONPATH=. "$BACKEND_DIR/venv/bin/python" -m uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

echo "Waiting for backend host/CORS/health contract..."
wait_for_backend_contract

echo "Starting frontend on http://$FRONTEND_HOST:$FRONTEND_PORT"
(
  cd "$FRONTEND_DIR"
  npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

cat <<EOF

SYSGRID DEVELOPMENT RUNTIME READY
---------------------------------
Frontend (browser): $FRONTEND_ORIGIN
Frontend (local):   $LOCAL_FRONTEND_URL
Backend health:     $PUBLIC_HEALTH_URL
Backend local:      $LOCAL_HEALTH_URL
API base:           $API_BASE_URL
Trusted host:       $API_PUBLIC_HOSTNAME
Bootstrap user:     $SOURCE_OF_TRUTH_USER_ID
Seed domain data:   $SEED_DOMAIN_DATA
Backend runtime:    $LOCAL_BACKEND_ENV_FILE
Tenant DB:          $LOCAL_TENANT_DB
Config DB:          $LOCAL_CONFIG_DB

This workflow resets and reseeds only the disposable Local Demo databases.
It does not touch production tenant or configuration databases.

Troubleshooting:
  1. Open $PUBLIC_HEALTH_URL.
  2. Run this command with --print-runtime-config to inspect resolved hosts/origins.
  3. Clear stale browser API overrides from the bootstrap failure window.
  4. Use the bootstrap window's Copy Diagnostics / Open Buganizer actions.
EOF

wait
