#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_URL="http://127.0.0.1:8000/api/v1/health"
FRONTEND_URL="http://127.0.0.1:5173"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

wait_for_url() {
  local url="$1"
  local label="$2"
  for _ in {1..60}; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $label at $url" >&2
  return 1
}

ensure_backend() {
  if curl -fsS "$BACKEND_URL" >/dev/null 2>&1; then
    return 0
  fi
  mkdir -p "$BACKEND_DIR/test-results"
  (
    cd "$BACKEND_DIR"
    ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > test-results/verify-backend.log 2>&1
  ) &
  BACKEND_PID=$!
  wait_for_url "$BACKEND_URL" "backend"
}

ensure_frontend() {
  if curl -fsS "$FRONTEND_URL" >/dev/null 2>&1; then
    return 0
  fi
  mkdir -p "$FRONTEND_DIR/test-results"
  (
    cd "$FRONTEND_DIR"
    npm run dev -- --host 127.0.0.1 > test-results/verify-frontend.log 2>&1
  ) &
  FRONTEND_PID=$!
  wait_for_url "$FRONTEND_URL" "frontend"
}

cd "$BACKEND_DIR"
./venv/bin/pytest --cov=app --cov-report=term --cov-report=xml:test-results/backend-coverage.xml

cd "$FRONTEND_DIR"
npm run test:lint
npm run typecheck
npm run test:coverage
npm run build

ensure_backend
ensure_frontend

PW_API_BASE=http://127.0.0.1:8000/api/v1 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 \
npx playwright test \
  tests/sentinel_comprehensive.spec.ts \
  tests/blank-slate-audit.spec.ts \
  tests/shell-and-search.spec.ts \
  tests/view-deeplink-matrix.spec.ts \
  tests/view-empty-states.spec.ts
