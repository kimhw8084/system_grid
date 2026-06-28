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
echo "== Creating full-stack review zip =="
rm -f "$ZIP_NAME"

zip -r "$ZIP_NAME" \
  frontend/OUT-8-evidence-gap-closure.md \
  frontend/OUT-8-human-validation-packet.md \
  frontend/src/components/MonitoringGrid.tsx \
  frontend/src/components/External.tsx \
  frontend/src/components/ServicesReal.tsx \
  frontend/src/components/shared/OperationalBulkContract.ts \
  frontend/src/components/shared/OperationalBulkContract.test.ts \
  frontend/src/components/shared/OperationalRowActionMenu.tsx \
  backend/app/api/monitoring.py \
  backend/test_monitoring_workflows.py \
  backend/test_monitoring_query_and_bulk_edges.py \
  backend/test_monitoring_restore_edges.py

echo
echo "== Zip created =="
ls -lh "$ZIP_NAME"

echo
echo "== Zip content proof =="
python - <<'PY'
import zipfile

zip_path = "../frontend-debug-lean.zip"
with zipfile.ZipFile(zip_path) as z:
    names = z.namelist()
print("zip:", zip_path)
print("file_count:", len(names))
print("backend_count:", sum(1 for n in names if n.startswith(("backend/", "server/", "api/"))))
print("frontend_count:", sum(1 for n in names if n.startswith("frontend/")))
print("backend_like_files:")
for n in names:
    if n.startswith(("backend/", "server/", "api/")) or any(k in n.lower() for k in ["monitoring", "purge", "restore"]):
        print(n)
PY

echo
echo "Done."
echo "Created: $ZIP_NAME"
