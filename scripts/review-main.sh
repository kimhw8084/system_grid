#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-main}"
WORKFLOW_NAME="${WORKFLOW_NAME:-AI Review Packet}"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REPO="$(gh repo view --json nameWithOwner --jq '.nameWithOwner')"

if [[ "$CURRENT_BRANCH" != "$BASE_BRANCH" ]]; then
  echo "ERROR: You are on $CURRENT_BRANCH, but this main-only workflow expects $BASE_BRANCH."
  echo "Run:"
  echo "  git checkout $BASE_BRANCH"
  exit 1
fi

echo "Pulling latest $BASE_BRANCH..."
git pull --ff-only origin "$BASE_BRANCH"

NEW_HEAD_SHA="$(git rev-parse HEAD)"
COMMIT_URL="https://github.com/$REPO/commit/$NEW_HEAD_SHA"
DIFF_URL="$COMMIT_URL.diff"
PATCH_URL="$COMMIT_URL.patch"

echo "Pushing $BASE_BRANCH..."
git push origin "$BASE_BRANCH"

echo ""
echo "Commit:"
echo "$COMMIT_URL"
echo ""

echo "Waiting for GitHub to register workflow run..."
sleep 8

RUN_ID=""
for i in {1..36}; do
  RUN_ID="$(gh run list \
    --workflow "$WORKFLOW_NAME" \
    --branch "$BASE_BRANCH" \
    --commit "$NEW_HEAD_SHA" \
    --limit 1 \
    --json databaseId \
    --jq '.[0].databaseId // empty' 2>/dev/null || true)"

  if [[ -n "$RUN_ID" ]]; then
    break
  fi

  echo "No workflow run found yet. Retrying..."
  sleep 5
done

RUN_URL="NOT_FOUND"
RUN_STATUS=0
ARTIFACT_NAME="ai-review-packet-$NEW_HEAD_SHA"
DOWNLOAD_DIR=".ai-review-latest"

if [[ -n "$RUN_ID" ]]; then
  RUN_URL="https://github.com/$REPO/actions/runs/$RUN_ID"
  echo "Watching workflow run: $RUN_ID"

  set +e
  gh run watch "$RUN_ID" --compact --exit-status
  RUN_STATUS="$?"
  set -e

  echo ""
  echo "Trying to download review artifact locally..."
  rm -rf "$DOWNLOAD_DIR"

  set +e
  gh run download "$RUN_ID" -n "$ARTIFACT_NAME" -D "$DOWNLOAD_DIR"
  DOWNLOAD_STATUS="$?"
  set -e

  if [[ "$DOWNLOAD_STATUS" == "0" ]]; then
    echo "Artifact downloaded to: $DOWNLOAD_DIR"
  else
    echo "WARNING: Artifact download failed."
    echo "You can still use commit .diff/.patch URLs."
  fi
else
  echo "WARNING: No AI Review Packet run found for commit $NEW_HEAD_SHA."
fi

echo ""
echo "========================================"
echo "COPY THIS TO CHATGPT:"
echo "========================================"
echo "Review this commit line by line:"
echo "$COMMIT_URL"
echo ""
echo "Full diff:"
echo "$DIFF_URL"
echo ""
echo "Patch:"
echo "$PATCH_URL"
echo ""
echo "Workflow run:"
echo "$RUN_URL"
echo ""
echo "Goal:"
echo "Run 3 External pass against Monitoring golden standard."
echo ""
echo "Use the commit .diff/.patch and AI Review Packet workflow artifact."
echo "Read every changed file and every diff hunk. Do not judge by summary."
echo "========================================"
echo ""

echo "========================================"
echo "FALLBACK IF CHATGPT CANNOT FETCH GITHUB:"
echo "========================================"
echo "Run this and paste the output here:"
echo ""
echo "cat $DOWNLOAD_DIR/ai-review/REVIEW_PACKET.md"
echo ""
echo "Or for smaller chunks:"
echo ""
echo "cat $DOWNLOAD_DIR/ai-review/CHANGED_FILES.txt"
echo "cat $DOWNLOAD_DIR/ai-review/DIFF_STAT.txt"
echo "cat $DOWNLOAD_DIR/ai-review/PER_FILE_INDEX.txt"
echo "cat $DOWNLOAD_DIR/ai-review/FULL_DIFF_NUMBERED.diff"
echo ""
echo "Artifact download command if needed:"
echo "gh run download $RUN_ID -n $ARTIFACT_NAME -D $DOWNLOAD_DIR"
echo "========================================"
echo ""

exit "$RUN_STATUS"
