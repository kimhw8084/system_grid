#!/usr/bin/env bash
set -euo pipefail
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${1:-$PWD}"
REPO="$(cd "$REPO" && pwd)"
if [[ ! -f "$REPO/frontend/package.json" || ! -f "$REPO/frontend/src/components/ProjectsGolden.tsx" || ! -f "$REPO/frontend/src/components/ProjectsSchedulingCompletion.tsx" ]]; then
  echo "FAIL: run from the system_grid repository root (or pass repo root as arg 1)." >&2
  exit 2
fi
python3 "$PKG_DIR/apply_gantt_worldclass.py" "$REPO"
python3 "$PKG_DIR/verify_gantt_worldclass.py" "$REPO"
if [[ -x "$REPO/frontend/node_modules/.bin/tsc" ]]; then
  echo "== TypeScript typecheck =="
  (cd "$REPO/frontend" && npm run typecheck)
else
  echo "SKIP TypeScript typecheck: frontend/node_modules not installed"
fi
if [[ -x "$REPO/frontend/node_modules/.bin/vitest" ]]; then
  echo "== OUT-40 contract tests =="
  (cd "$REPO/frontend" && npx vitest run \
    src/components/ProjectsSchedulingCompletion.out40e.contract.test.ts \
    src/components/ProjectsSchedulingCompletion.out40f.contract.test.ts)
else
  echo "SKIP Vitest contract tests: frontend/node_modules not installed"
fi
echo "DONE: OUT-40 Gantt renderer repaired/applied and verified."
