#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

LOCAL_CONFIG_DB="$BACKEND_DIR/config.local.db"
LOCAL_DEFAULT_DB="$BACKEND_DIR/system_grid.local.db"
LOCAL_TENANT_ROOT="$BACKEND_DIR/tenants/local-demo"
LOCAL_TENANT_DB_REL="tenants/local-demo/local_demo.db"
LOCAL_TENANT_DB="$BACKEND_DIR/$LOCAL_TENANT_DB_REL"

export CONFIG_DATABASE_URL="sqlite+aiosqlite:///$LOCAL_CONFIG_DB"
export DATABASE_URL="sqlite+aiosqlite:///$LOCAL_DEFAULT_DB"
export TENANT_STORAGE_ROOT="$LOCAL_TENANT_ROOT"
export DEFAULT_TENANT_NAME="Local Demo"
export DEFAULT_USER_ID="haewon.kim"
export AUTO_ADMIN_USER_IDS="haewon.kim"
export DEFAULT_EMAIL_DOMAIN="sysgrid.local"
export BACKEND_CORS_ORIGINS="[\"http://$FRONTEND_HOST:$FRONTEND_PORT\",\"http://localhost:$FRONTEND_PORT\"]"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then kill "$FRONTEND_PID" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

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

mkdir -p "$BACKEND_DIR/tenants"
rm -f "$LOCAL_CONFIG_DB" "$LOCAL_DEFAULT_DB" "$LOCAL_TENANT_DB"
rm -rf "$LOCAL_TENANT_ROOT"
mkdir -p "$LOCAL_TENANT_ROOT"

cat > "$FRONTEND_DIR/.env.local" <<EOF
VITE_API_BASE_URL=http://$BACKEND_HOST:$BACKEND_PORT
VITE_PORT=$FRONTEND_PORT
VITE_BACKEND_PORT=$BACKEND_PORT
VITE_BACKEND_HOST=$BACKEND_HOST
EOF

echo "Seeding disposable local tenant..."
(cd "$BACKEND_DIR" && "$BACKEND_DIR/venv/bin/python" seed.py \
  --tenant-name "Local Demo" \
  --tenant-db "$LOCAL_TENANT_DB_REL" \
  --admin-user "haewon.kim" \
  --admin-full-name "Haewon Kim" \
  --admin-email "haewon.kim@sysgrid.local" \
  --admin-department "Infrastructure")

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
echo "Tenant DB: $LOCAL_TENANT_DB"
echo "Config DB: $LOCAL_CONFIG_DB"
echo
echo "This local workflow always resets and reseeds the disposable Local Demo environment."
echo "It does not touch your real production tenant or config database."

wait
