#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-main}"
WORKFLOW_NAME="${WORKFLOW_NAME:-AI Review Packet}"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [[ "$CURRENT_BRANCH" == "$BASE_BRANCH" ]]; then
  echo "ERROR: You are on $BASE_BRANCH. Create/use a feature branch first."
  echo "Example: git checkout -b run3-external-fix"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Uncommitted changes exist."
  echo "Run:"
  echo "  git add . && git commit -m \"your message\""
  exit 1
fi

echo "Pushing branch: $CURRENT_BRANCH"
git push -u origin "$CURRENT_BRANCH"

echo "Finding PR for branch..."
PR_URL="$(gh pr view "$CURRENT_BRANCH" --json url --jq '.url' 2>/dev/null || true)"

if [[ -z "$PR_URL" ]]; then
  echo "No PR found. Creating PR..."
  PR_URL="$(gh pr create \
    --base "$BASE_BRANCH" \
    --head "$CURRENT_BRANCH" \
    --title "$CURRENT_BRANCH" \
    --body "Automated review cycle PR. AI Review Packet workflow must run before review." \
    --json url \
    --jq '.url')"
fi

echo ""
echo "PR:"
echo "$PR_URL"
echo ""

echo "Waiting for GitHub to register workflow run..."
sleep 8

RUN_ID=""
for i in {1..24}; do
  RUN_ID="$(gh run list \
    --workflow "$WORKFLOW_NAME" \
    --branch "$CURRENT_BRANCH" \
    --limit 1 \
    --json databaseId,event,status \
    --jq '.[0].databaseId // empty' 2>/dev/null || true)"

  if [[ -n "$RUN_ID" ]]; then
    break
  fi

  echo "No workflow run found yet. Retrying..."
  sleep 5
done

if [[ -n "$RUN_ID" ]]; then
  echo "Watching workflow run: $RUN_ID"
  set +e
  gh run watch "$RUN_ID" --compact --exit-status
  RUN_STATUS="$?"
  set -e
else
  echo "WARNING: No AI Review Packet run found yet."
  RUN_STATUS=0
fi

echo ""
echo "========================================"
echo "COPY THIS TO CHATGPT:"
echo "========================================"
echo "Review this PR line by line:"
echo "$PR_URL"
echo ""
echo "Goal:"
echo "Run 3 External pass against Monitoring golden standard."
echo ""
echo "Use the PR .diff/.patch and Automated AI Review Packet action output."
echo "Read every changed file and every diff hunk. Do not judge by summary."
echo "========================================"
echo ""

exit "$RUN_STATUS"
