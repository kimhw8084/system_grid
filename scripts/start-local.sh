#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

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

usage() {
  cat <<EOF
Usage: ./scripts/start-local.sh [options]

Options:
  --backend-host <host>
  --backend-port <port>
  --frontend-host <host>
  --frontend-port <port>
  --api-base-url <origin>
  --frontend-origin <origin>
  --default-user-id <userId>
  --auto-admin-user-ids <commaSeparatedUserIds>
  --admin-full-name <name>
  --admin-email <email>
  --admin-department <department>
  --user-id-env-var <envVarName>
  --help
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
    --help|-h) usage; exit 0 ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$API_BASE_URL" ]]; then
  API_BASE_URL="http://$BACKEND_HOST:$BACKEND_PORT"
fi
if [[ -z "$FRONTEND_ORIGIN" ]]; then
  FRONTEND_ORIGIN="http://$FRONTEND_HOST:$FRONTEND_PORT"
fi

LOCAL_CONFIG_DB="$BACKEND_DIR/config.local.db"
LOCAL_DEFAULT_DB="$BACKEND_DIR/system_grid.local.db"
LOCAL_TENANT_ROOT="$BACKEND_DIR/tenants/local-demo"
LOCAL_TENANT_DB_REL="tenants/local-demo/local_demo.db"
LOCAL_TENANT_DB="$BACKEND_DIR/$LOCAL_TENANT_DB_REL"

export CONFIG_DATABASE_URL="sqlite+aiosqlite:///$LOCAL_CONFIG_DB"
export DATABASE_URL="sqlite+aiosqlite:///$LOCAL_DEFAULT_DB"
export TENANT_STORAGE_ROOT="$LOCAL_TENANT_ROOT"
export FRONTEND_ENV_FILE_PATH="$FRONTEND_DIR/.env.local"
export DEFAULT_TENANT_NAME="Local Demo"
export PUBLIC_READONLY_ENABLED="true"
export PUBLIC_READONLY_TENANT_NAME="Local Demo"
export DEFAULT_USER_ID="$DEFAULT_USER_ID_VALUE"
export AUTO_ADMIN_USER_IDS="$AUTO_ADMIN_USER_IDS_VALUE"
export USER_ID_ENV_VAR="$USER_ID_ENV_VAR_VALUE"
export DEFAULT_EMAIL_DOMAIN="sysgrid.local"
export BACKEND_CORS_ORIGINS="[\"$FRONTEND_ORIGIN\",\"http://localhost:$FRONTEND_PORT\"]"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then kill "$FRONTEND_PID" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

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
    echo "Missing required file: $path"
    echo "$message"
    exit 1
  fi
}

wait_for_backend() {
  local health_url="http://$BACKEND_HOST:$BACKEND_PORT/api/v1/health"
  for _ in $(seq 1 60); do
    if curl -fsS "$health_url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Backend did not become healthy at $health_url"
  exit 1
}

echo "Preparing disposable local SysGrid environment..."

require_file "$BACKEND_DIR/venv/bin/python" "Create the backend venv first, for example: cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt"
require_file "$FRONTEND_DIR/node_modules" "Install frontend dependencies first: cd frontend && npm install"

kill_listener_on_port "$BACKEND_PORT"
kill_listener_on_port "$FRONTEND_PORT"

mkdir -p "$BACKEND_DIR/tenants"
rm -f "$LOCAL_CONFIG_DB" "$LOCAL_DEFAULT_DB" "$LOCAL_TENANT_DB"
rm -rf "$LOCAL_TENANT_ROOT"
mkdir -p "$LOCAL_TENANT_ROOT"

cat > "$FRONTEND_DIR/.env.local" <<EOF
VITE_API_BASE_URL=$API_BASE_URL
VITE_PORT=$FRONTEND_PORT
VITE_BACKEND_PORT=$BACKEND_PORT
VITE_BACKEND_HOST=$BACKEND_HOST
EOF

echo "Seeding disposable local tenant..."
(cd "$BACKEND_DIR" && "$BACKEND_DIR/venv/bin/python" seed.py \
  --tenant-name "Local Demo" \
  --tenant-db "$LOCAL_TENANT_DB_REL" \
  --admin-user "$DEFAULT_USER_ID_VALUE" \
  --admin-full-name "$ADMIN_FULL_NAME" \
  --admin-email "$ADMIN_EMAIL" \
  --admin-department "$ADMIN_DEPARTMENT")

echo "Running preflight..."
"$ROOT_DIR/scripts/preflight.py"

echo "Starting backend on http://$BACKEND_HOST:$BACKEND_PORT"
(
  cd "$BACKEND_DIR"
  PYTHONPATH=. "$BACKEND_DIR/venv/bin/python" -m uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

echo "Waiting for backend health..."
wait_for_backend

echo "Starting frontend on http://$FRONTEND_HOST:$FRONTEND_PORT"
(
  cd "$FRONTEND_DIR"
  npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

echo
echo "Local SysGrid is starting."
echo "Frontend: http://$FRONTEND_HOST:$FRONTEND_PORT"
echo "Backend:  http://$BACKEND_HOST:$BACKEND_PORT/api/v1/health"
echo "API Base: $API_BASE_URL"
echo "Frontend Origin Allowed: $FRONTEND_ORIGIN"
echo "Bootstrap User: $DEFAULT_USER_ID_VALUE"
echo "User ID Env Var: $USER_ID_ENV_VAR_VALUE"
echo "Tenant DB: $LOCAL_TENANT_DB"
echo "Config DB: $LOCAL_CONFIG_DB"
echo
echo "This local workflow always resets and reseeds the disposable Local Demo environment."
echo "It does not touch your real production tenant or config database."

wait
