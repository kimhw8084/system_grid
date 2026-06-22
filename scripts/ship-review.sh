#!/usr/bin/env bash
set -euo pipefail

MSG="${1:-ai review cycle}"

if [[ -z "$(git status --porcelain)" ]]; then
  echo "No changes to commit."
else
  git add .
  git commit -m "$MSG"
fi

./scripts/review-pr.sh
