#!/usr/bin/env bash
set -euo pipefail
REPO="${1:-$PWD}"
REPO="$(cd "$REPO" && pwd)"
BACKUP="$(find "$REPO" -maxdepth 1 -type d -name '.out40-gantt-backup-*' -print | sort | tail -n 1)"
if [[ -z "$BACKUP" ]]; then
  echo "FAIL: no .out40-gantt-backup-* directory found" >&2
  exit 2
fi
cp "$BACKUP/ProjectsGolden.tsx" "$REPO/frontend/src/components/ProjectsGolden.tsx"
cp "$BACKUP/ProjectsSchedulingCompletion.tsx" "$REPO/frontend/src/components/ProjectsSchedulingCompletion.tsx"
echo "PASS restored $BACKUP"
