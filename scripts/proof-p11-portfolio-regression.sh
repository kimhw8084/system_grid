#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
P11_TEMP_ROOT="$(mktemp -d /tmp/sysgrid-p11-portfolio.XXXXXX)"
P11_CONFIG_DB="$P11_TEMP_ROOT/config.db"
P11_TENANT_DB="$P11_TEMP_ROOT/tenant.db"
P11_BACKEND_PORT="${SYSGRID_P11_BACKEND_PORT:-18061}"
P11_FRONTEND_PORT="${SYSGRID_P11_FRONTEND_PORT:-15184}"
P11_BACKEND_ORIGIN="http://127.0.0.1:$P11_BACKEND_PORT"
P11_FRONTEND_ORIGIN="http://127.0.0.1:$P11_FRONTEND_PORT"
P11_USER_ID="p11.manager"
P11_BACKEND_PID=""
P11_FRONTEND_PID=""

runtime_env=(
  env -u TESTING -u USER_ID -u user_name -u TRUSTED_PROXY_USER_HEADER
  "CONFIG_DATABASE_URL=sqlite+aiosqlite:///$P11_CONFIG_DB"
  "DATABASE_URL=sqlite+aiosqlite:///$P11_TENANT_DB"
  "TENANT_STORAGE_ROOT=$P11_TEMP_ROOT/tenants"
  "DEFAULT_TENANT_NAME=P11 Isolated Portfolio Regression"
  "PUBLIC_READONLY_ENABLED=false"
  "DEFAULT_USER_ID=$P11_USER_ID"
  "AUTO_ADMIN_USER_IDS=$P11_USER_ID"
  "USER_ID_ENV_VAR=SYSGRID_P11_RUNTIME_USER_ID"
  "SYSGRID_P11_RUNTIME_USER_ID=$P11_USER_ID"
  "DEFAULT_EMAIL_DOMAIN=sysgrid.test"
  "ENVIRONMENT=development"
  "IDENTITY_MODE=development"
  "ALLOWED_HOSTS=127.0.0.1,localhost,test,testserver"
  "BACKEND_CORS_ORIGINS=$P11_FRONTEND_ORIGIN"
)

cleanup() {
  [[ -n "$P11_FRONTEND_PID" ]] && kill "$P11_FRONTEND_PID" >/dev/null 2>&1 || true
  [[ -n "$P11_BACKEND_PID" ]] && kill "$P11_BACKEND_PID" >/dev/null 2>&1 || true
  rm -rf "$P11_TEMP_ROOT"
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

if lsof -tiTCP:"$P11_BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 || lsof -tiTCP:"$P11_FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "P11 proof ports are already in use." >&2
  exit 1
fi

(cd "$ROOT_DIR" && "${runtime_env[@]}" ./backend/venv/bin/python seed.py --tenant-name "P11 Isolated Portfolio Regression" --tenant-db "$P11_TENANT_DB" --admin-user "$P11_USER_ID" --admin-full-name "P11 Manager" --no-seed-data)
P11_TENANT_ID=1 "${runtime_env[@]}" ./backend/venv/bin/python "$ROOT_DIR/scripts/seed-p11-portfolio-fixture.py"
(cd "$BACKEND_DIR" && exec "${runtime_env[@]}" ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$P11_BACKEND_PORT") > "$P11_TEMP_ROOT/backend.log" 2>&1 &
P11_BACKEND_PID=$!
wait_for_url "$P11_BACKEND_ORIGIN/api/v1/health"
(cd "$FRONTEND_DIR" && VITE_API_BASE_URL="$P11_BACKEND_ORIGIN" exec npm run dev -- --host 127.0.0.1 --port "$P11_FRONTEND_PORT" --strictPort) > "$P11_TEMP_ROOT/frontend.log" 2>&1 &
P11_FRONTEND_PID=$!
wait_for_url "$P11_FRONTEND_ORIGIN"

cd "$FRONTEND_DIR"
P11_USER_ID="$P11_USER_ID" \
SYSGRID_P11_API_ORIGIN="$P11_BACKEND_ORIGIN" \
SYSGRID_P11_PROOF_DIR="${SYSGRID_P11_PROOF_DIR:-test-results/p11-portfolio-regression}" \
PW_TENANT_ID=1 \
PLAYWRIGHT_BASE_URL="$P11_FRONTEND_ORIGIN" \
npx playwright test --config=playwright.p11-portfolio.config.ts
