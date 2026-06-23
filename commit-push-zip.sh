#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./commit-push-zip.sh \"commit message\""
  exit 1
fi

COMMIT_MSG="$*"
ZIP_NAME="../frontend-debug-lean.zip"

echo "== Repo root =="
pwd

echo
echo "== Git status before commit =="
git status --short

echo
echo "== git add . =="
git add .

echo
echo "== git commit =="
if git diff --cached --quiet; then
  echo "No staged changes. Skipping commit."
else
  git commit -m "$COMMIT_MSG"
fi

echo
echo "== git push =="
git push

echo
echo "== Creating lean frontend zip =="
rm -f "$ZIP_NAME"

zip -r "$ZIP_NAME" frontend \
  -x "frontend/test-results/*" \
     "frontend/venv/*" \
     "frontend/playwright-report/*" \
     "frontend/node_modules/*" \
     "frontend/dist/*" \
     "frontend/build/*" \
     "frontend/coverage/*" \
     "frontend/.vite/*" \
     "frontend/.next/*" \
     "frontend/.turbo/*" \
     "frontend/.cache/*" \
     "frontend/.git/*" \
     "frontend/.DS_Store" \
     "frontend/**/.DS_Store" \
     "frontend/.env" \
     "frontend/.env.local" \
     "frontend/*.log" \
     "frontend/**/*.log" \
     "frontend/*errors*.txt" \
     "frontend/*ts_errors*.txt" \
     "frontend/*tsc*.txt" \
     "frontend/all_ts_errors.txt" \
     "frontend/errors.txt" \
     "frontend/full_errors.txt" \
     "frontend/full_tsc_report.txt" \
     "frontend/target_errors.txt" \
     "frontend/ts_errors.txt" \
     "frontend/**/*.map"

echo
echo "== Zip created =="
ls -lh "$ZIP_NAME"

echo
echo "== Zip content sanity check: should show nothing for junk files =="
unzip -l "$ZIP_NAME" | grep -E 'test-results|venv/|playwright-report|\.env|\.env.local|errors\.txt|ts_errors|tsc|\.log|\.DS_Store' || true

echo
echo "Done."
echo "Created: $ZIP_NAME"
