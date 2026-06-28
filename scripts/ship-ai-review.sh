#!/usr/bin/env bash
set -euo pipefail

# SysGrid one-command ship + AI review capsule creator.
# Run from anywhere inside the repo:
#   ./scripts/ship-ai-review.sh "commit message" [changed|quick|daily|fresh|audit|full]
# Default mode: fresh
# Output: ../sysgrid-ai-review-capsule.zip

usage() {
  cat <<'EOF'
Usage:
  ./scripts/ship-ai-review.sh "commit message" [mode]

Modes:
  changed  Diff + changed files + before/after snapshots only. Smallest honest patch review.
  quick    Small same-chat review: changed files + shallow context.
  daily    Normal after-each-Codex-prompt capsule.
  fresh    Default. Best for a brand-new AI chat with your typed goal.
  audit    Bigger/stricter capsule for regression hunting or uncertain backend/frontend truth.
  full     Largest non-repo-dump capsule for severe blockers or architecture review.

Output:
  ../sysgrid-ai-review-capsule.zip

Safety:
  - Fails if forbidden artifacts/secrets/runtime files are modified or staged.
  - Captures base commit before commit, then builds capsule against that base after commit.
  - Commits and pushes before capsule generation, so the capsule matches pushed code.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

COMMIT_MSG="$1"
MODE="${2:-fresh}"

case "$MODE" in
  changed|quick|daily|fresh|audit|full|minimal|standard|deep) ;;
  *)
    echo "FAIL: invalid mode: $MODE" >&2
    usage
    exit 2
    ;;
esac

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

SCRIPT="scripts/create-ai-review-capsule.cjs"
if [[ ! -f "$SCRIPT" ]]; then
  echo "FAIL: missing $SCRIPT" >&2
  exit 2
fi

if ! command -v node >/dev/null 2>&1; then
  echo "FAIL: node is required" >&2
  exit 2
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "FAIL: zip is required" >&2
  exit 2
fi

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "FAIL: detached HEAD is not allowed for ship script" >&2
  exit 2
fi

if [[ -f .git/MERGE_HEAD || -d .git/rebase-merge || -d .git/rebase-apply ]]; then
  echo "FAIL: merge/rebase in progress. Resolve Git state first." >&2
  exit 2
fi

echo "== Repo root =="
pwd

echo
echo "== Branch =="
echo "$BRANCH"

echo
echo "== Git status before safety check =="
git status --short

# Never stage/commit these accidentally. If they are dirty, fix or intentionally override outside this script.
FORBIDDEN_REGEX='(^|/)(\.DS_Store|\.env|\.env\.local|\.env\.local\.runtime|\.env\.production|\.coverage|backend\.log|server\.log|critical_failures\.log|db_debug\.log)$|(^|/)(__pycache__|\.pytest_cache|node_modules|venv|dist|build|coverage|playwright-report|test-results|\.ai-review-latest)(/|$)|\.(db|db-shm|db-wal|sqlite|sqlite3|zip|tar\.gz|log)$'
DIRTY_FORBIDDEN="$(git status --porcelain | awk '{print substr($0,4)}' | grep -E "$FORBIDDEN_REGEX" || true)"
if [[ -n "$DIRTY_FORBIDDEN" ]]; then
  echo
  echo "FAIL: forbidden dirty artifact/secret/runtime files detected. Not committing." >&2
  echo "$DIRTY_FORBIDDEN" >&2
  echo >&2
  echo "Safe next action examples:" >&2
  echo "  git restore -- <path>" >&2
  echo "  git rm --cached -- <path>   # if accidentally tracked" >&2
  echo "  add ignore rules, then rerun" >&2
  exit 2
fi

BASE_COMMIT="$(git rev-parse HEAD)"

echo
echo "== Base commit captured before commit =="
echo "$BASE_COMMIT"

echo
echo "== git add -A =="
git add -A -- .

echo
echo "== Staged changes =="
git diff --cached --name-status

if git diff --cached --quiet; then
  echo
  echo "No staged changes. Skipping commit."
  DID_COMMIT=0
else
  echo
  echo "== git commit =="
  git commit -m "$COMMIT_MSG"
  DID_COMMIT=1
fi

HEAD_COMMIT="$(git rev-parse HEAD)"

echo
echo "== Head commit =="
echo "$HEAD_COMMIT"

echo
echo "== git push =="
if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  git push
else
  git push -u origin "$BRANCH"
fi

# Map user-facing modes to generator modes/flags.
GEN_MODE="$MODE"
EXTRA_FLAGS=(--force)
case "$MODE" in
  changed)
    GEN_MODE="changed"
    ;;
  quick)
    GEN_MODE="quick"
    ;;
  minimal)
    GEN_MODE="minimal"
    ;;
  daily|standard)
    GEN_MODE="daily"
    ;;
  fresh|deep)
    GEN_MODE="fresh"
    EXTRA_FLAGS+=(--include-all-essential)
    ;;
  audit)
    GEN_MODE="audit"
    EXTRA_FLAGS+=(--include-all-essential --strict)
    ;;
  full)
    GEN_MODE="full"
    EXTRA_FLAGS+=(--include-all-essential --strict --max-file-bytes 5000000 --max-diff-bytes 8000000)
    ;;
esac

# If nothing was committed, avoid a hard fail from empty diff while still building useful context.
if [[ "$DID_COMMIT" == "0" ]]; then
  EXTRA_FLAGS+=(--allow-empty)
  if [[ "$MODE" != "changed" && "$MODE" != "quick" ]]; then
    EXTRA_FLAGS+=(--include-all-essential)
  fi
fi

echo
echo "== Creating AI review capsule =="
echo "mode: $MODE -> generator mode: $GEN_MODE"
echo "base: $BASE_COMMIT"
node "$SCRIPT" --mode "$GEN_MODE" --base "$BASE_COMMIT" "${EXTRA_FLAGS[@]}"

ZIP_PATH="$(cd .. && pwd)/sysgrid-ai-review-capsule.zip"

echo
echo "== Capsule proof =="
ls -lh "$ZIP_PATH"
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$ZIP_PATH"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$ZIP_PATH"
fi

echo
echo "== Capsule content sample =="
python3 - <<PY 2>/dev/null || true
import zipfile
p = "$ZIP_PATH"
with zipfile.ZipFile(p) as z:
    names = z.namelist()
print('file_count:', len(names))
for n in names[:100]:
    print(n)
if len(names) > 100:
    print('...')
PY

echo
echo "DONE"
echo "Commit: $HEAD_COMMIT"
echo "Pushed branch: $BRANCH"
echo "Upload this file: $ZIP_PATH"
