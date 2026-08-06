#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
PATCH_FILE="$SCRIPT_DIR/FAR_FULL_GOLDEN_RECOVERY.patch"
ROLLBACK_FILE="$SCRIPT_DIR/ROLLBACK_FAR_FULL_GOLDEN_RECOVERY.patch"
TARGET_A="frontend/src/components/far/FARGoldenWorkspace.tsx"
TARGET_B="frontend/tests/far-golden-workspace.spec.ts"
PRE_A="f630fa1528843d22e91d7cc73f42ae26f03747d6d1bc8065ba9a52539fe3280f"
PRE_B="176f49455fc53febeb1cb54346352ffa932ef91776d31b91e999e4444c04f075"
POST_A="3696015d5713851b25d04f6d77243acbee4e8667edbd7e94f1558614e7ced3fe"
POST_B="0112ea6565a99bd130bf4a83d0156003ea31f3227d6d71ea5df825497703b88e"

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

find_repo() {
  local candidate="${1:-$PWD}"
  candidate="$(cd "$candidate" && pwd -P)"
  while [[ "$candidate" != "/" ]]; do
    if [[ -f "$candidate/$TARGET_A" && -f "$candidate/$TARGET_B" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
    candidate="$(dirname "$candidate")"
  done
  return 1
}

REPO="$(find_repo "${1:-$PWD}")" || {
  echo "ERROR: Run this from the SysGrid repository, or pass the repository path:" >&2
  echo "  ./APPLY_FAR_RECOVERY.command /path/to/SysGrid" >&2
  exit 2
}

cd "$REPO"
actual_a="$(sha256_file "$TARGET_A")"
actual_b="$(sha256_file "$TARGET_B")"

if [[ "$actual_a" == "$POST_A" && "$actual_b" == "$POST_B" ]]; then
  echo "FAR full golden recovery is already applied."
  exit 0
fi

if [[ "$actual_a" != "$PRE_A" || "$actual_b" != "$PRE_B" ]]; then
  echo "ERROR: Source does not match the reviewed authoritative preimage." >&2
  echo "$TARGET_A" >&2
  echo "  expected: $PRE_A" >&2
  echo "  actual:   $actual_a" >&2
  echo "$TARGET_B" >&2
  echo "  expected: $PRE_B" >&2
  echo "  actual:   $actual_b" >&2
  echo "No file was changed." >&2
  exit 3
fi

# The outer repository may contain a nested .git directory under frontend/src/components/far.
# git apply changes the exact working-tree files directly and does not require staging or commits.
git apply --check "$PATCH_FILE"
git apply "$PATCH_FILE"

final_a="$(sha256_file "$TARGET_A")"
final_b="$(sha256_file "$TARGET_B")"
if [[ "$final_a" != "$POST_A" || "$final_b" != "$POST_B" ]]; then
  echo "ERROR: Post-apply hash verification failed; rolling back." >&2
  git apply "$ROLLBACK_FILE" || true
  exit 4
fi

echo "PASS: FAR full golden recovery applied directly."
echo "Changed:"
echo "  $TARGET_A"
echo "  $TARGET_B"
echo
echo "The running frontend should hot-reload. Otherwise restart the existing app process."
echo "Rollback command:"
echo "  git apply '$ROLLBACK_FILE'"
