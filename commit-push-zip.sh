#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./commit-push-zip.sh \"commit message\""
  exit 1
fi

COMMIT_MSG="$*"
ZIP_NAME="../frontend-debug-lean.zip"

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
     "frontend/.env" \
     "frontend/.env.local" \
     "frontend/*.log" \
     "frontend/errors.txt" \
     "frontend/tsc.txt" \
     "frontend/.DS_Store" \
     "frontend//.DS_Store" \
     "frontend/**/.DS_Store" \
     "frontend//.map" \
     "frontend/**/*.map" \
     "frontend/**/.log"

echo
echo "Done."
echo "Created: $ZIP_NAME"
ls -lh "$ZIP_NAME"
