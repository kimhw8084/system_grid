#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# SysGrid production-grade ship + AI review capsule orchestrator.
#
# Backward-compatible usage:
#   ./scripts/ship-ai-review.sh "commit message" [changed|quick|daily|fresh|audit|full]
#
# Package the current commit without creating or pushing a new commit:
#   ./scripts/ship-ai-review.sh --no-commit --no-push
#
# Explicit multi-commit review range:
#   ./scripts/ship-ai-review.sh --no-commit --base <PRE_RUN_COMMIT> --head HEAD --mode audit
#
# Output defaults to:
#   ../sysgrid-ai-review-capsule.zip

PROGRAM="$(basename "$0")"
SCRIPT_VERSION="2026.07.24.9-artifact-firewall"
DEFAULT_MODE="full"
DEFAULT_CHECKS="none"
DEFAULT_OUTPUT_NAME="sysgrid-ai-review-capsule.zip"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/ship-ai-review.sh ["commit message"] [mode] [options]

Backward-compatible examples:
  ./scripts/ship-ai-review.sh "OUT-22 Iteration 04: harden production guards"
  # The one-argument form repairs generated-artifact drift, commits, verifies the capsule, then pushes.

Package the current commit without a new commit:
  ./scripts/ship-ai-review.sh --no-commit --no-push

Package an explicit run range:
  ./scripts/ship-ai-review.sh --no-commit --base <PRE_RUN_COMMIT> --head HEAD --mode audit

Modes:
  changed  Diff, changed files, and before/after snapshots.
  quick    Small same-chat review with shallow context.
  daily    Normal after-prompt review capsule.
  fresh    Strong capsule for a brand-new AI review chat.
  audit    Strict production/regression review package.
  full     Default. Largest supported non-repository-dump package.
  minimal, standard, deep are accepted compatibility aliases.

Options:
  --message TEXT             Commit message. Required only when dirty changes must be committed.
  --mode MODE                Capsule mode. Default: full.
  --base REF                 Explicit review base. Strongly preferred for multi-commit runs.
  --head REF                 Review head. Default: HEAD after any optional commit.
  --checks LEVEL             none | smart | full. Default: none (fast handoff).
  --goal TEXT                Goal included in the AI review brief.
  --generator PATH           Capsule generator. Default: scripts/create-ai-review-capsule.cjs.
  --output PATH              Final zip destination.
  --exclusions PATH          Exclusion-policy JSON. Default: ai-review-exclusions.json if present.
  --no-commit                Never create a commit. Only review-tooling dirt is allowed.
  --no-push                  Never push.
  --push-current             Push even when this script did not create a commit.
  --allow-empty              Permit an empty base..head range. Not recommended.
  --strict-checks            Exit nonzero after packaging when any captured check failed.
  --keep-evidence            Keep generated COMMAND_OUTPUTS/_SHIP_AI_REVIEW after packaging.
  --check-timeout-min N      Per-command timeout when checks are explicit. Default: 12.
  --total-check-min N        Total smart/full check budget. Default: 45.
  --max-smart-checks N       Maximum smart checks. Default: 6.
  --artifact-policy POLICY    repair | block. Default: repair.
  --max-commit-file-mb N      Maximum staged file size. Default: 5 MiB.
  --max-commit-total-mb N     Maximum staged snapshot total. Default: 25 MiB.
  --quiet-checks              Capture check output without streaming it live.
  --debug                     Enable shell tracing with file and line numbers.
  --dry-run                  Print resolved plan without commit, push, checks, or packaging.
  --version                  Print wrapper version.
  -h, --help                 Show help.

Base resolution when --base is omitted:
  1. AI_BASE_COMMIT environment variable.
  2. Pre-commit HEAD when this script creates a commit.
  3. Merge-base with the configured upstream, origin/HEAD, origin/main, or origin/master.
  4. HEAD^ for a clean current-commit review.
  5. The empty Git tree for an initial root commit.

Safety:
  - Refuses merge/rebase/cherry-pick/revert conflicts.
  - Maintains a managed .gitignore firewall for generated test/evidence artifacts.
  - In repair mode, automatically untracks and removes generated reports such as test-results*,
    playwright-report*, stage*-evidence, llm-report.json, and COMMAND_OUTPUTS/_SHIP_AI_REVIEW.
  - Audits the staged snapshot before commit and blocks generated artifacts, secrets, archives,
    databases, logs, binaries, oversized files, and oversized total staged payloads.
  - Delays every push until artifact audit, capsule generation, and capsule verification pass.
  - In --no-commit mode, permits only clean review packaging; automatic repository repairs require a commit.
  - Refuses base == head and empty diffs unless --allow-empty is explicit.
  - Captures Git provenance, commit series, patch data, repository inventory, environment versions,
    dependency manifests, existing command outputs, and a production-review brief.
  - Does not rerun tests by default; --checks smart/full is an explicit diagnostic mode.
  - Verifies zip integrity, unsafe paths, range evidence, diff evidence, and command evidence.
USAGE
}

log()  { printf '\n== %s ==\n' "$*"; }
info() { printf '%s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die()  { printf 'FAIL: %s\n' "$*" >&2; exit 2; }

on_error() {
  local rc=$?
  local line="${BASH_LINENO[0]:-unknown}"
  local source="${BASH_SOURCE[1]:-$PROGRAM}"
  local command="${BASH_COMMAND:-unknown}"
  printf '\nFAIL: %s stopped\n' "$PROGRAM" >&2
  printf 'source: %s\nline: %s\nexit: %s\ncommand: %s\n' "$source" "$line" "$rc" "$command" >&2
  if [[ ${#FUNCNAME[@]} -gt 2 ]]; then
    printf 'call_stack:' >&2
    local i
    for ((i=1; i<${#FUNCNAME[@]}; i++)); do
      printf ' %s@%s:%s' "${FUNCNAME[$i]:-main}" "${BASH_SOURCE[$i]:-?}" "${BASH_LINENO[$((i-1))]:-?}" >&2
    done
    printf '\n' >&2
  fi
  exit "$rc"
}
trap on_error ERR

MODE="$DEFAULT_MODE"
CHECK_LEVEL="$DEFAULT_CHECKS"
COMMIT_MSG=""
BASE_REF="${AI_BASE_COMMIT:-}"
HEAD_REF="HEAD"
GOAL="${AI_REVIEW_GOAL:-Produce a production-grade review, identify concrete defects and risks, and generate the next maximum-workhorse implementation prompt.}"
GENERATOR="scripts/create-ai-review-capsule.cjs"
OUTPUT_PATH=""
EXCLUSIONS_PATH="${AI_REVIEW_EXCLUSIONS_FILE:-}"
NO_COMMIT=0
NO_PUSH=0
PUSH_CURRENT=0
ALLOW_EMPTY=0
STRICT_CHECKS=0
KEEP_EVIDENCE=0
DRY_RUN=0
QUIET_CHECKS=0
DEBUG=0
CHECK_TIMEOUT_MIN=12
TOTAL_CHECK_MIN=45
MAX_SMART_CHECKS=6
ARTIFACT_POLICY="${SHIP_AI_ARTIFACT_POLICY:-repair}"
MAX_COMMIT_FILE_MB="${SHIP_AI_MAX_COMMIT_FILE_MB:-5}"
MAX_COMMIT_TOTAL_MB="${SHIP_AI_MAX_COMMIT_TOTAL_MB:-25}"
MAX_CAPSULE_MB="${SHIP_AI_MAX_CAPSULE_MB:-100}"
POSITIONAL=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      printf "%s %s\n" "$PROGRAM" "$SCRIPT_VERSION"
      exit 0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --message)
      [[ $# -ge 2 ]] || die "--message requires a value"
      COMMIT_MSG="$2"
      shift 2
      ;;
    --mode)
      [[ $# -ge 2 ]] || die "--mode requires a value"
      MODE="$2"
      shift 2
      ;;
    --base)
      [[ $# -ge 2 ]] || die "--base requires a Git ref"
      BASE_REF="$2"
      shift 2
      ;;
    --head)
      [[ $# -ge 2 ]] || die "--head requires a Git ref"
      HEAD_REF="$2"
      shift 2
      ;;
    --checks)
      [[ $# -ge 2 ]] || die "--checks requires none, smart, or full"
      CHECK_LEVEL="$2"
      shift 2
      ;;
    --goal)
      [[ $# -ge 2 ]] || die "--goal requires text"
      GOAL="$2"
      shift 2
      ;;
    --generator)
      [[ $# -ge 2 ]] || die "--generator requires a path"
      GENERATOR="$2"
      shift 2
      ;;
    --output)
      [[ $# -ge 2 ]] || die "--output requires a path"
      OUTPUT_PATH="$2"
      shift 2
      ;;
    --exclusions)
      [[ $# -ge 2 ]] || die "--exclusions requires a path"
      EXCLUSIONS_PATH="$2"
      shift 2
      ;;
    --no-commit)
      NO_COMMIT=1
      shift
      ;;
    --no-push)
      NO_PUSH=1
      shift
      ;;
    --push-current)
      PUSH_CURRENT=1
      shift
      ;;
    --allow-empty)
      ALLOW_EMPTY=1
      shift
      ;;
    --strict-checks)
      STRICT_CHECKS=1
      shift
      ;;
    --keep-evidence)
      KEEP_EVIDENCE=1
      shift
      ;;
    --check-timeout-min)
      [[ $# -ge 2 ]] || die "--check-timeout-min requires an integer"
      CHECK_TIMEOUT_MIN="$2"
      shift 2
      ;;
    --total-check-min)
      [[ $# -ge 2 ]] || die "--total-check-min requires an integer"
      TOTAL_CHECK_MIN="$2"
      shift 2
      ;;
    --max-smart-checks)
      [[ $# -ge 2 ]] || die "--max-smart-checks requires an integer"
      MAX_SMART_CHECKS="$2"
      shift 2
      ;;
    --artifact-policy)
      [[ $# -ge 2 ]] || die "--artifact-policy requires repair or block"
      ARTIFACT_POLICY="$2"
      shift 2
      ;;
    --max-commit-file-mb)
      [[ $# -ge 2 ]] || die "--max-commit-file-mb requires an integer"
      MAX_COMMIT_FILE_MB="$2"
      shift 2
      ;;
    --max-commit-total-mb)
      [[ $# -ge 2 ]] || die "--max-commit-total-mb requires an integer"
      MAX_COMMIT_TOTAL_MB="$2"
      shift 2
      ;;
    --quiet-checks)
      QUIET_CHECKS=1
      shift
      ;;
    --debug)
      DEBUG=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do POSITIONAL+=("$1"); shift; done
      ;;
    -*)
      die "unknown option: $1"
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

# Backward compatibility: first positional = commit message, second positional = mode.
if [[ ${#POSITIONAL[@]} -ge 1 && -z "$COMMIT_MSG" ]]; then
  COMMIT_MSG="${POSITIONAL[0]}"
fi
if [[ ${#POSITIONAL[@]} -ge 2 ]]; then
  MODE="${POSITIONAL[1]}"
fi
if [[ -n "$COMMIT_MSG" && "$GOAL" == "${AI_REVIEW_GOAL:-Produce a production-grade review, identify concrete defects and risks, and generate the next maximum-workhorse implementation prompt.}" ]]; then
  GOAL="Review the complete engineering iteration represented by commit message: $COMMIT_MSG. Establish exact provenance, inspect every included implementation and test change, identify production defects and regressions, score the result, and generate the next maximum-workhorse prompt."
fi
[[ ${#POSITIONAL[@]} -le 2 ]] || die "too many positional arguments"

case "$MODE" in
  changed|quick|daily|fresh|audit|full|minimal|standard|deep) ;;
  *) die "invalid mode: $MODE" ;;
esac
case "$CHECK_LEVEL" in
  none|smart|full) ;;
  *) die "invalid --checks level: $CHECK_LEVEL" ;;
esac
case "$ARTIFACT_POLICY" in
  repair|block) ;;
  *) die "invalid --artifact-policy: $ARTIFACT_POLICY" ;;
esac
for n in "$CHECK_TIMEOUT_MIN" "$TOTAL_CHECK_MIN" "$MAX_SMART_CHECKS" "$MAX_COMMIT_FILE_MB" "$MAX_COMMIT_TOTAL_MB" "$MAX_CAPSULE_MB"; do
  [[ "$n" =~ ^[0-9]+$ ]] || die "timeout/check limits must be nonnegative integers"
done

command -v git >/dev/null 2>&1 || die "git is required"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "not inside a Git repository"
cd "$ROOT"
if [[ "$DEBUG" == "1" ]]; then
  export PS4='+ ${BASH_SOURCE##*/}:${LINENO}:${FUNCNAME[0]:-main}: '
  set -x
fi
SELF_ABS="$(python3 - "$0" <<'PY_SELF'
import os, sys
print(os.path.realpath(sys.argv[1]))
PY_SELF
)"
case "$SELF_ABS" in
  "$ROOT"/*) SELF_REL="${SELF_ABS#"$ROOT"/}" ;;
  *) SELF_REL="$0" ;;
esac

[[ -f "$GENERATOR" ]] || die "missing capsule generator: $GENERATOR"
command -v node >/dev/null 2>&1 || die "node is required"
command -v zip >/dev/null 2>&1 || die "zip is required"
command -v python3 >/dev/null 2>&1 || die "python3 is required"

if [[ -z "$EXCLUSIONS_PATH" ]]; then
  for candidate in ai-review-exclusions.json .ai-review-exclusions.json scripts/ai-review-exclusions.json; do
    if [[ -f "$candidate" ]]; then
      EXCLUSIONS_PATH="$candidate"
      break
    fi
  done
fi
if [[ -n "$EXCLUSIONS_PATH" && ! -f "$EXCLUSIONS_PATH" ]]; then
  die "exclusion policy not found: $EXCLUSIONS_PATH"
fi

BRANCH="$(git branch --show-current)"
[[ -n "$BRANCH" ]] || die "detached HEAD is not allowed by the ship wrapper"

for marker in .git/MERGE_HEAD .git/CHERRY_PICK_HEAD .git/REVERT_HEAD; do
  [[ ! -f "$marker" ]] || die "unfinished Git operation detected: $marker"
done
[[ ! -d .git/rebase-merge && ! -d .git/rebase-apply ]] || die "rebase in progress"
[[ -z "$(git ls-files -u)" ]] || die "unmerged files exist"

START_HEAD="$(git rev-parse HEAD)"
DID_COMMIT=0
CHECK_FAILURES=0
EVIDENCE_DIR="COMMAND_OUTPUTS/_SHIP_AI_REVIEW"
EVIDENCE_BACKUP=""
GEN_HELP_FILE=""

cleanup() {
  local rc=$?
  if [[ "$KEEP_EVIDENCE" == "0" ]]; then
    rm -rf "$EVIDENCE_DIR" 2>/dev/null || true
    if [[ -n "$EVIDENCE_BACKUP" && -d "$EVIDENCE_BACKUP" ]]; then
      mkdir -p "$EVIDENCE_DIR"
      cp -a "$EVIDENCE_BACKUP"/. "$EVIDENCE_DIR"/ 2>/dev/null || true
    fi
  fi
  [[ -z "$GEN_HELP_FILE" ]] || rm -f "$GEN_HELP_FILE" 2>/dev/null || true
  exit "$rc"
}
trap cleanup EXIT

log "Repository"
printf 'wrapper_version: %s\nroot: %s\nbranch: %s\nstart_head: %s\n' "$SCRIPT_VERSION" "$ROOT" "$BRANCH" "$START_HEAD"
if command -v shasum >/dev/null 2>&1; then
  printf 'wrapper_sha256: '; shasum -a 256 "$SELF_ABS" | awk '{print $1}'
elif command -v sha256sum >/dev/null 2>&1; then
  printf 'wrapper_sha256: '; sha256sum "$SELF_ABS" | awk '{print $1}'
fi

# Generated-artifact firewall. The wrapper owns this policy because test runners and
# evidence captures routinely create large files that must never enter Git history.
# Repair mode is the workhorse default: update the managed ignore block, untrack any
# already-tracked generated artifacts, and remove their working-tree copies. Block mode
# performs the same detection without modifying the repository.
ARTIFACT_FIREWALL_REPORT="$(python3 - "$ARTIFACT_POLICY" <<'PY_ARTIFACT_FIREWALL'
import os
import pathlib
import re
import shutil
import subprocess
import sys

policy = sys.argv[1]
repo = pathlib.Path.cwd()
managed_begin = "# BEGIN SYSGRID SHIP-AI GENERATED ARTIFACT FIREWALL"
managed_end = "# END SYSGRID SHIP-AI GENERATED ARTIFACT FIREWALL"
managed_lines = [
    managed_begin,
    "**/.DS_Store",
    "**/.coverage",
    "**/__pycache__/",
    "**/.pytest_cache/",
    "**/coverage/",
    "**/playwright-report*/",
    "**/blob-report*/",
    "**/test-results*/",
    "**/.ai-review-latest/",
    "**/.next/",
    "**/.cache/",
    "**/.turbo/",
    "**/stage*-evidence/",
    "**/llm-report.json",
    "COMMAND_OUTPUTS/_SHIP_AI_REVIEW/",
    managed_end,
]

def run(*args, check=True):
    return subprocess.run(args, cwd=repo, check=check, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def generated_reason(raw):
    p = pathlib.PurePosixPath(raw.replace("\\", "/"))
    parts = p.parts
    name = p.name
    lowered = [part.lower() for part in parts]
    for part in lowered:
        if part in {"__pycache__", ".pytest_cache", "coverage", ".nyc_output", ".ai-review-latest", ".next", ".cache", ".turbo"}:
            return f"generated directory {part}"
        if part.startswith("playwright-report") or part.startswith("blob-report") or part.startswith("test-results"):
            return f"generated test-report directory {part}"
        if re.fullmatch(r"stage\d+-evidence", part):
            return f"generated evidence directory {part}"
    if tuple(lowered[:2]) == ("command_outputs", "_ship_ai_review"):
        return "generated ship evidence"
    if name in {".DS_Store", ".coverage", "llm-report.json"}:
        return f"generated file {name}"
    if p.suffix.lower() in {".pyc", ".pyo"}:
        return f"generated bytecode {p.suffix.lower()}"
    return None

def status_entries():
    raw = run("git", "status", "--porcelain=v1", "-z", "--untracked-files=all").stdout
    fields = raw.split(b"\0")
    i = 0
    while i < len(fields):
        entry = fields[i]
        i += 1
        if not entry:
            continue
        text = entry.decode("utf-8", "surrogateescape")
        status = text[:2]
        path = text[3:] if len(text) >= 4 else ""
        old_path = None
        if ("R" in status or "C" in status) and i < len(fields):
            old_path = fields[i].decode("utf-8", "surrogateescape")
            i += 1
        yield status, path, old_path

def update_ignore():
    path = repo / ".gitignore"
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    pattern = re.compile(
        rf"(?:^|\n){re.escape(managed_begin)}\n.*?\n{re.escape(managed_end)}(?:\n|$)",
        re.DOTALL,
    )
    block = "\n".join(managed_lines) + "\n"
    if pattern.search(existing):
        updated = pattern.sub("\n" + block, existing).lstrip("\n")
    else:
        updated = existing
        if updated and not updated.endswith("\n"):
            updated += "\n"
        if updated and not updated.endswith("\n\n"):
            updated += "\n"
        updated += block
    if updated != existing:
        path.write_text(updated, encoding="utf-8")
        print("ignore_updated\t.gitignore")

tracked_raw = run("git", "ls-files", "-z").stdout
tracked = [x.decode("utf-8", "surrogateescape") for x in tracked_raw.split(b"\0") if x]
tracked_generated = [(path, generated_reason(path)) for path in tracked if generated_reason(path)]
untracked_generated = []
for status, path, _ in status_entries():
    if status == "??" and path and generated_reason(path):
        untracked_generated.append((path, generated_reason(path)))

if policy == "block":
    for path, reason in tracked_generated:
        print(f"blocked_tracked\t{path}\t{reason}")
    for path, reason in untracked_generated:
        print(f"blocked_untracked\t{path}\t{reason}")
    if tracked_generated or untracked_generated:
        raise SystemExit(3)
    raise SystemExit(0)

update_ignore()

# Remove tracked generated paths from the index first. This stages deletions and
# ensures the managed .gitignore prevents git add -A from reintroducing them.
if tracked_generated:
    paths = [path for path, _ in tracked_generated]
    for offset in range(0, len(paths), 100):
        batch = paths[offset:offset + 100]
        run("git", "rm", "-r", "--cached", "-f", "--ignore-unmatch", "--", *batch)
    for path, reason in tracked_generated:
        print(f"tracked_removed\t{path}\t{reason}")

# Delete disposable working-tree copies. Parent cleanup is limited to directories
# that are themselves classified as generated, never ordinary source directories.
for path, reason in tracked_generated + untracked_generated:
    target = repo / path
    try:
        if target.is_symlink() or target.is_file():
            target.unlink(missing_ok=True)
        elif target.is_dir():
            shutil.rmtree(target)
    except FileNotFoundError:
        pass
    print(f"working_copy_removed\t{path}\t{reason}")

for root, dirs, files in os.walk(repo, topdown=False):
    candidate = pathlib.Path(root)
    if candidate == repo:
        continue
    rel = candidate.relative_to(repo).as_posix()
    if generated_reason(rel + "/placeholder"):
        try:
            candidate.rmdir()
        except OSError:
            pass
PY_ARTIFACT_FIREWALL
)" || {
  rc=$?
  printf '%s\n' "$ARTIFACT_FIREWALL_REPORT" >&2
  if [[ "$rc" == "3" ]]; then
    die "generated artifacts detected under --artifact-policy block"
  fi
  die "generated-artifact firewall failed"
}

if [[ -n "$ARTIFACT_FIREWALL_REPORT" ]]; then
  log "Generated-artifact firewall"
  while IFS=$'\t' read -r action path reason; do
    [[ -n "$action" ]] || continue
    case "$action" in
      ignore_updated) printf 'updated managed ignore policy: %s\n' "$path" ;;
      tracked_removed) printf 'staged generated artifact removal: %s (%s)\n' "$path" "$reason" ;;
      working_copy_removed) printf 'removed generated working copy: %s (%s)\n' "$path" "$reason" ;;
      *) printf '%s\t%s\t%s\n' "$action" "$path" "$reason" ;;
    esac
  done <<< "$ARTIFACT_FIREWALL_REPORT"
fi

# Read current dirt for normal workflow decisions.
mapfile -t DIRTY_PATHS < <(git status --porcelain=v1 --untracked-files=all | sed -E 's/^.. //' | sed -E 's/^.* -> //' || true)

# Pre-stage policy rejects unsafe dirty additions/modifications while allowing the
# firewall's staged deletions of generated artifacts.
FORBIDDEN_REPORT="$(python3 - "$EXCLUSIONS_PATH" <<'PY_DIRTY_AUDIT'
import json
import pathlib
import re
import subprocess
import sys

policy_path = sys.argv[1]
policy = {
    "directories": [".git","node_modules","venv","__pycache__",".pytest_cache","coverage","dist","build","playwright-report","test-results",".ai-review-latest",".next",".cache",".turbo","site-packages"],
    "fileNames": [".DS_Store",".coverage","llm-report.json"],
    "extensions": [".zip",".tgz",".gz",".rar",".7z",".db",".sqlite",".sqlite3",".db-shm",".db-wal",".log",".pyc",".pyo",".so",".dylib",".dll",".exe",".png",".jpg",".jpeg",".gif",".webp",".ico",".pdf",".mp4",".mov",".avi",".webm",".woff",".woff2",".ttf",".otf"],
    "secretFileNames": [".env",".env.local",".env.local.runtime",".env.production",".env.development"],
    "allowSecretExamples": [".env.example"],
}
if policy_path:
    with open(policy_path, "r", encoding="utf-8") as handle:
        loaded = json.load(handle)
    for key in policy:
        if key in loaded and isinstance(loaded[key], list):
            policy[key] = loaded[key]

dirs = set(policy["directories"])
files = set(policy["fileNames"])
secrets = set(policy["secretFileNames"])
allowed = set(policy["allowSecretExamples"])
exts = tuple(sorted(policy["extensions"], key=len, reverse=True))

def generated_path(path):
    p = pathlib.PurePosixPath(path.replace("\\", "/"))
    for part in [x.lower() for x in p.parts]:
        if part.startswith("test-results") or part.startswith("playwright-report") or part.startswith("blob-report"):
            return True
        if re.fullmatch(r"stage\d+-evidence", part):
            return True
    return p.name == "llm-report.json" or tuple(x.lower() for x in p.parts[:2]) == ("command_outputs", "_ship_ai_review")

raw = subprocess.check_output(["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"])
fields = raw.split(b"\0")
i = 0
while i < len(fields):
    entry = fields[i]
    i += 1
    if not entry:
        continue
    text = entry.decode("utf-8", "surrogateescape")
    status = text[:2]
    path = text[3:] if len(text) >= 4 else ""
    if ("R" in status or "C" in status) and i < len(fields):
        i += 1
    if not path:
        continue
    # Pure deletions are the expected artifact-repair output.
    if status.strip() == "D" or ("D" in status and "A" not in status and "M" not in status and "R" not in status and "C" not in status):
        continue
    p = pathlib.PurePosixPath(path.replace("\\", "/"))
    parts = p.parts
    name = p.name
    reason = None
    if generated_path(path):
        reason = "generated artifact escaped firewall"
    elif any(part in dirs for part in parts[:-1]):
        reason = "excluded directory"
    elif name in files:
        reason = "excluded filename"
    elif name in secrets and name not in allowed:
        reason = "secret/runtime filename"
    elif name not in allowed and path.lower().endswith(exts):
        reason = "excluded extension"
    if reason:
        print(f"{status}\t{path}\t{reason}")
PY_DIRTY_AUDIT
)"
if [[ -n "$FORBIDDEN_REPORT" ]]; then
  printf '\n%s\n' "$FORBIDDEN_REPORT" >&2
  die "forbidden dirty artifacts or secrets detected; cleanup was intentionally limited to known generated artifacts"
fi

log "Git status before optional commit"
git status --short

if [[ "$NO_COMMIT" == "1" ]]; then
  if [[ ${#DIRTY_PATHS[@]} -gt 0 ]]; then
    NON_TOOL_DIRTY=()
    for dirty_path in "${DIRTY_PATHS[@]}"; do
      case "$dirty_path" in
        "$SELF_REL"|"$GENERATOR"|ai-review-exclusions.json|.ai-review-exclusions.json|scripts/ai-review-exclusions.json)
          ;;
        *)
          NON_TOOL_DIRTY+=("$dirty_path")
          ;;
      esac
    done
    if [[ ${#NON_TOOL_DIRTY[@]} -gt 0 ]]; then
      printf '%s
' "${NON_TOOL_DIRTY[@]}" >&2
      die "--no-commit found dirty application files; commit/stash them or run the normal commit workflow"
    fi
    warn "continuing without a commit because only AI-review tooling files are dirty"
  fi
else
  if [[ ${#DIRTY_PATHS[@]} -gt 0 ]]; then
    [[ -n "$COMMIT_MSG" ]] || die "dirty changes exist; provide a commit message or use --no-commit after cleaning the tree"
    PRE_COMMIT_HEAD="$(git rev-parse HEAD)"
    log "Stage changes"
    git add -A -- .

    STAGED_AUDIT_REPORT="$(python3 - "$EXCLUSIONS_PATH" "$MAX_COMMIT_FILE_MB" "$MAX_COMMIT_TOTAL_MB" <<'PY_STAGED_AUDIT'
import json
import pathlib
import re
import subprocess
import sys

policy_path, max_file_mb, max_total_mb = sys.argv[1:]
max_file = int(max_file_mb) * 1024 * 1024
max_total = int(max_total_mb) * 1024 * 1024
policy = {
    "directories": [".git","node_modules","venv","__pycache__",".pytest_cache","coverage","dist","build","playwright-report","test-results",".ai-review-latest",".next",".cache",".turbo","site-packages"],
    "fileNames": [".DS_Store",".coverage","llm-report.json"],
    "extensions": [".zip",".tgz",".gz",".rar",".7z",".db",".sqlite",".sqlite3",".db-shm",".db-wal",".log",".pyc",".pyo",".so",".dylib",".dll",".exe",".png",".jpg",".jpeg",".gif",".webp",".ico",".pdf",".mp4",".mov",".avi",".webm",".woff",".woff2",".ttf",".otf"],
    "secretFileNames": [".env",".env.local",".env.local.runtime",".env.production",".env.development"],
    "allowSecretExamples": [".env.example"],
}
if policy_path:
    with open(policy_path, "r", encoding="utf-8") as handle:
        loaded = json.load(handle)
    for key in policy:
        if key in loaded and isinstance(loaded[key], list):
            policy[key] = loaded[key]

dirs = set(policy["directories"])
files = set(policy["fileNames"])
secrets = set(policy["secretFileNames"])
allowed = set(policy["allowSecretExamples"])
exts = tuple(sorted(policy["extensions"], key=len, reverse=True))

def generated_path(path):
    p = pathlib.PurePosixPath(path.replace("\\", "/"))
    lowered = [part.lower() for part in p.parts]
    for part in lowered:
        if part.startswith("test-results") or part.startswith("playwright-report") or part.startswith("blob-report"):
            return True
        if re.fullmatch(r"stage\d+-evidence", part):
            return True
    return p.name == "llm-report.json" or tuple(lowered[:2]) == ("command_outputs", "_ship_ai_review")

def staged_size(path):
    result = subprocess.run(["git", "cat-file", "-s", f":{path}"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    if result.returncode != 0:
        return 0
    return int(result.stdout.strip() or "0")

raw = subprocess.check_output(["git", "diff", "--cached", "--name-status", "-z", "--find-renames", "--find-copies"])
fields = raw.split(b"\0")
i = 0
entries = []
while i < len(fields):
    status_raw = fields[i]
    i += 1
    if not status_raw:
        continue
    status = status_raw.decode("utf-8", "replace")
    if status.startswith(("R", "C")):
        if i + 1 >= len(fields):
            break
        old_path = fields[i].decode("utf-8", "surrogateescape")
        new_path = fields[i + 1].decode("utf-8", "surrogateescape")
        i += 2
        entries.append((status, new_path))
    else:
        if i >= len(fields):
            break
        path = fields[i].decode("utf-8", "surrogateescape")
        i += 1
        entries.append((status, path))

errors = []
total = 0
for status, path in entries:
    if status.startswith("D"):
        continue
    p = pathlib.PurePosixPath(path.replace("\\", "/"))
    parts = p.parts
    name = p.name
    reason = None
    if generated_path(path):
        reason = "generated artifact"
    elif any(part in dirs for part in parts[:-1]):
        reason = "excluded directory"
    elif name in files:
        reason = "excluded filename"
    elif name in secrets and name not in allowed:
        reason = "secret/runtime filename"
    elif name not in allowed and path.lower().endswith(exts):
        reason = "excluded extension"
    size = staged_size(path)
    total += size
    if reason:
        errors.append(f"{status}\t{path}\t{reason}\t{size} bytes")
    elif max_file and size > max_file:
        errors.append(f"{status}\t{path}\tfile exceeds {max_file_mb} MiB\t{size} bytes")
if max_total and total > max_total:
    errors.append(f"TOTAL\tstaged snapshot\texceeds {max_total_mb} MiB\t{total} bytes")
for error in errors:
    print(error)
PY_STAGED_AUDIT
)"
    if [[ -n "$STAGED_AUDIT_REPORT" ]]; then
      printf '\n%s\n' "$STAGED_AUDIT_REPORT" >&2
      git reset --quiet
      die "staged artifact audit failed; nothing was committed or pushed"
    fi

    git diff --cached --name-status
    if git diff --cached --quiet; then
      warn "status was dirty but no staged changes remain; no commit created"
    else
      log "Commit"
      git commit -m "$COMMIT_MSG"
      DID_COMMIT=1
      [[ -n "$BASE_REF" ]] || BASE_REF="$PRE_COMMIT_HEAD"
    fi
  else
    info "Working tree is clean; no commit needed."
  fi
fi

# Resolve requested head only after the optional commit.
HEAD_COMMIT="$(git rev-parse --verify "${HEAD_REF}^{commit}" 2>/dev/null)" || die "invalid head ref: $HEAD_REF"
CURRENT_HEAD="$(git rev-parse HEAD)"
[[ "$HEAD_COMMIT" == "$CURRENT_HEAD" ]] || die "the generator packages the checked-out state; --head must resolve to current HEAD ($CURRENT_HEAD)"

TRACKED_GENERATED_REPORT="$(python3 - <<'PY_TRACKED_AUDIT'
import pathlib
import re
import subprocess

def generated(path):
    p = pathlib.PurePosixPath(path.replace("\\", "/"))
    lowered = [part.lower() for part in p.parts]
    for part in lowered:
        if part.startswith("test-results") or part.startswith("playwright-report") or part.startswith("blob-report"):
            return True
        if re.fullmatch(r"stage\d+-evidence", part):
            return True
    return p.name == "llm-report.json" or tuple(lowered[:2]) == ("command_outputs", "_ship_ai_review")

raw = subprocess.check_output(["git", "ls-files", "-z"])
for value in raw.split(b"\0"):
    if not value:
        continue
    path = value.decode("utf-8", "surrogateescape")
    if generated(path):
        print(path)
PY_TRACKED_AUDIT
)"
if [[ -n "$TRACKED_GENERATED_REPORT" ]]; then
  printf '%s\n' "$TRACKED_GENERATED_REPORT" >&2
  die "generated artifacts remain tracked after repair; refusing commit packaging and push"
fi

# Historical blobs cannot be safely rewritten automatically once shared. Report them
# so the current-tree cleanup is honest without force-pushing or destroying provenance.
HISTORICAL_GENERATED_REPORT="$(python3 - <<'PY_HISTORY_ARTIFACTS'
import pathlib
import re
import subprocess

def generated(path):
    p = pathlib.PurePosixPath(path.replace("\\", "/"))
    lowered = [part.lower() for part in p.parts]
    for part in lowered:
        if part.startswith("test-results") or part.startswith("playwright-report") or part.startswith("blob-report"):
            return True
        if re.fullmatch(r"stage\d+-evidence", part):
            return True
    return p.name == "llm-report.json" or tuple(lowered[:2]) == ("command_outputs", "_ship_ai_review")

raw = subprocess.run(
    ["git", "rev-list", "--objects", "--all"],
    stdout=subprocess.PIPE,
    stderr=subprocess.DEVNULL,
    text=True,
    check=False,
).stdout.splitlines()
found = {}
for line in raw:
    if " " not in line:
        continue
    oid, path = line.split(" ", 1)
    if not generated(path):
        continue
    key = (oid, path)
    if key in found:
        continue
    size_result = subprocess.run(
        ["git", "cat-file", "-s", oid],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        check=False,
    )
    try:
        size = int(size_result.stdout.strip())
    except ValueError:
        size = 0
    found[key] = size
for (oid, path), size in sorted(found.items(), key=lambda item: item[1], reverse=True)[:100]:
    print(f"{size}\t{oid}\t{path}")
PY_HISTORY_ARTIFACTS
)"
if [[ -n "$HISTORICAL_GENERATED_REPORT" ]]; then
  warn "generated artifact blobs remain in Git history; current repair removes them from HEAD, but history rewrite is intentionally not automatic"
fi

# Resolve the strongest honest nonempty base when none was explicitly supplied.
resolve_base() {
  local head="$1" candidate="" parent=""

  if [[ -n "$BASE_REF" ]]; then
    git rev-parse --verify "${BASE_REF}^{commit}" 2>/dev/null && return 0
    die "invalid base ref: $BASE_REF"
  fi

  local refs=()
  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    refs+=("@{u}")
  fi
  if git symbolic-ref -q refs/remotes/origin/HEAD >/dev/null 2>&1; then
    refs+=("$(git symbolic-ref -q --short refs/remotes/origin/HEAD)")
  fi
  git show-ref --verify --quiet refs/remotes/origin/main && refs+=("origin/main")
  git show-ref --verify --quiet refs/remotes/origin/master && refs+=("origin/master")

  local ref
  for ref in "${refs[@]}"; do
    candidate="$(git merge-base "$head" "$ref" 2>/dev/null || true)"
    if [[ -n "$candidate" && "$candidate" != "$head" ]] && ! git diff --quiet "$candidate" "$head" --; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  parent="$(git rev-parse "${head}^" 2>/dev/null || true)"
  if [[ -n "$parent" ]]; then
    printf '%s\n' "$parent"
    return 0
  fi

  # Root commit fallback: compare against Git's canonical empty tree.
  git hash-object -t tree /dev/null
}

BASE_COMMIT="$(resolve_base "$HEAD_COMMIT")"

if [[ "$BASE_COMMIT" == "$HEAD_COMMIT" && "$ALLOW_EMPTY" != "1" ]]; then
  die "resolved base equals head; provide --base <PRE_RUN_COMMIT> or explicitly use --allow-empty"
fi
if git diff --quiet "$BASE_COMMIT" "$HEAD_COMMIT" -- && [[ "$ALLOW_EMPTY" != "1" ]]; then
  die "resolved range is empty; provide the commit before the work as --base, or use HEAD^ for the current commit"
fi

COMMIT_COUNT="$(git rev-list --count "$BASE_COMMIT..$HEAD_COMMIT" 2>/dev/null || printf '0')"
log "Resolved review range"
printf 'base: %s\nhead: %s\n' "$BASE_COMMIT" "$HEAD_COMMIT"
printf 'commits: %s\n' "$COMMIT_COUNT"

if [[ "$DRY_RUN" == "1" ]]; then
  printf '\nDry run complete. No push, checks, or capsule generation performed.\n'
  exit 0
fi

# Push is deliberately delayed until after capsule verification.

# Preserve any prior generated evidence folder and generate a fresh isolated evidence set.
if [[ -d "$EVIDENCE_DIR" ]]; then
  EVIDENCE_BACKUP="$(mktemp -d "${TMPDIR:-/tmp}/ship-ai-review-evidence.XXXXXX")"
  cp -a "$EVIDENCE_DIR"/. "$EVIDENCE_BACKUP"/
fi
rm -rf "$EVIDENCE_DIR"
mkdir -p "$EVIDENCE_DIR/checks"

write_header() {
  local file="$1" title="$2"
  {
    printf '# %s\n' "$title"
    printf 'generated_utc: %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    printf 'repo_root: %s\n' "$ROOT"
    printf 'branch: %s\n' "$BRANCH"
    printf 'base: %s\n' "$BASE_COMMIT"
    printf 'head: %s\n' "$HEAD_COMMIT"
    printf '\n'
  } > "$file"
}

write_header "$EVIDENCE_DIR/artifact-firewall.txt" "Generated-artifact firewall"
{
  printf 'policy: %s\n' "$ARTIFACT_POLICY"
  printf 'max_commit_file_mib: %s\n' "$MAX_COMMIT_FILE_MB"
  printf 'max_commit_total_mib: %s\n' "$MAX_COMMIT_TOTAL_MB"
  printf 'max_capsule_mib: %s\n' "$MAX_CAPSULE_MB"
  printf 'push_order: after_capsule_verification\n'
  printf '\n## repair report\n%s\n' "${ARTIFACT_FIREWALL_REPORT:-none}"
  printf '\n## tracked generated artifacts after repair\n%s\n' "${TRACKED_GENERATED_REPORT:-none}"
  printf '\n## historical generated artifacts\n%s\n' "${HISTORICAL_GENERATED_REPORT:-none}"
} >> "$EVIDENCE_DIR/artifact-firewall.txt"

write_header "$EVIDENCE_DIR/git-provenance.txt" "Git provenance"
{
  printf 'START_HEAD=%s\nCURRENT_HEAD=%s\nDID_COMMIT=%s\n' "$START_HEAD" "$CURRENT_HEAD" "$DID_COMMIT"
  printf '\n## status\n'
  git status --short --branch
  printf '\n## remotes (URLs redacted to host/path shape)\n'
  git remote -v | sed -E 's#(https?://)[^/@]+:[^/@]+@#\1***:***@#g; s#(https?://)[^/@]+@#\1***@#g' || true
  printf '\n## branches\n'
  git branch -vv --no-abbrev || true
  printf '\n## tags near head\n'
  git tag --points-at "$HEAD_COMMIT" || true
  printf '\n## merge base\n'
  git merge-base "$BASE_COMMIT" "$HEAD_COMMIT" 2>/dev/null || printf 'not-applicable\n'
} >> "$EVIDENCE_DIR/git-provenance.txt"

write_header "$EVIDENCE_DIR/current-commit.txt" "Current commit details"
git show --no-ext-diff --format=fuller --decorate=full --stat --summary "$HEAD_COMMIT" >> "$EVIDENCE_DIR/current-commit.txt"
printf '\n## raw commit object\n' >> "$EVIDENCE_DIR/current-commit.txt"
git cat-file -p "$HEAD_COMMIT" >> "$EVIDENCE_DIR/current-commit.txt"

write_header "$EVIDENCE_DIR/commit-series.txt" "Commit series"
git log --reverse --date=iso-strict --decorate=full --format='commit %H%nparents %P%nauthor %an <%ae>%nauthor_date %aI%ncommitter %cn <%ce>%ncommitter_date %cI%nsubject %s%nbody%n%b%n---' "$BASE_COMMIT..$HEAD_COMMIT" >> "$EVIDENCE_DIR/commit-series.txt" 2>/dev/null || true

write_header "$EVIDENCE_DIR/history-graph.txt" "Bounded history graph"
git log --graph --decorate --oneline --all --max-count=200 >> "$EVIDENCE_DIR/history-graph.txt"

write_header "$EVIDENCE_DIR/changed-files.txt" "Changed files"
{
  printf '## name-status\n'
  git diff --find-renames --find-copies --name-status "$BASE_COMMIT" "$HEAD_COMMIT" --
  printf '\n## numstat\n'
  git diff --find-renames --find-copies --numstat "$BASE_COMMIT" "$HEAD_COMMIT" --
  printf '\n## diff stat\n'
  git diff --find-renames --find-copies --stat "$BASE_COMMIT" "$HEAD_COMMIT" --
  printf '\n## summary\n'
  git diff --find-renames --find-copies --summary "$BASE_COMMIT" "$HEAD_COMMIT" --
} >> "$EVIDENCE_DIR/changed-files.txt"

# Generate the complete reviewable source diff while summarizing generated-artifact
# deletions separately. Binary payloads are prohibited by the staged firewall, so
# embedding binary reconstruction data would only bloat the capsule.
write_header "$EVIDENCE_DIR/full-diff.patch" "Complete reviewable source diff"
python3 - "$BASE_COMMIT" "$HEAD_COMMIT" "$EVIDENCE_DIR/full-diff.patch" <<'PY_REVIEW_DIFF'
import pathlib
import re
import subprocess
import sys

base, head, output = sys.argv[1:]

def generated(path):
    p = pathlib.PurePosixPath(path.replace("\\", "/"))
    lowered = [part.lower() for part in p.parts]
    for part in lowered:
        if part.startswith("test-results") or part.startswith("playwright-report") or part.startswith("blob-report"):
            return True
        if re.fullmatch(r"stage\d+-evidence", part):
            return True
    return p.name == "llm-report.json" or tuple(lowered[:2]) == ("command_outputs", "_ship_ai_review")

raw = subprocess.check_output(["git", "diff", "--name-only", "-z", base, head, "--"])
paths = [value.decode("utf-8", "surrogateescape") for value in raw.split(b"\0") if value]
reviewable = [path for path in paths if not generated(path)]
with open(output, "ab") as handle:
    handle.write(f"command: git diff --full-index --find-renames --find-copies {base} {head} -- <reviewable paths>\n".encode())
    handle.write(b"diff_begin\n")
    if reviewable:
        result = subprocess.run(
            ["git", "diff", "--no-ext-diff", "--full-index", "--find-renames", "--find-copies", base, head, "--", *reviewable],
            stdout=handle,
            stderr=subprocess.PIPE,
            check=False,
        )
        if result.returncode != 0:
            sys.stderr.buffer.write(result.stderr)
            raise SystemExit(result.returncode)
    handle.write(b"\ndiff_end\n")

with open(output.replace("full-diff.patch", "generated-artifact-changes.txt"), "w", encoding="utf-8") as handle:
    handle.write("Generated artifact paths intentionally excluded from full-diff.patch:\n")
    for path in paths:
        if generated(path):
            handle.write(path + "\n")
PY_REVIEW_DIFF

# Preserve commit-by-commit patches only for true multi-commit ranges. For a single
# commit they duplicate full-diff.patch byte-for-byte and unnecessarily inflate the zip.
if (( COMMIT_COUNT > 1 )); then
  write_header "$EVIDENCE_DIR/commit-patches.patch" "Commit-by-commit source patches"
  {
    git log --reverse --date=iso-strict --format='commit %H%nparents %P%nauthor %an <%ae>%nauthor_date %aI%ncommitter %cn <%ce>%ncommitter_date %cI%nsubject %s%nbody%n%b%n---PATCH---' \
      --no-ext-diff --full-index --find-renames --find-copies -p "$BASE_COMMIT..$HEAD_COMMIT"
  } >> "$EVIDENCE_DIR/commit-patches.patch"
else
  write_header "$EVIDENCE_DIR/commit-patches-note.txt" "Commit patch deduplication"
  printf 'Single-commit range: full-diff.patch is the complete review patch; duplicate commit-patches.patch intentionally omitted.\n' \
    >> "$EVIDENCE_DIR/commit-patches-note.txt"
fi

write_header "$EVIDENCE_DIR/diff-check.txt" "Git diff whitespace and conflict-marker check"
# `git diff --check` is an evidence-producing diagnostic. A nonzero result must
# be captured, not intercepted by the global ERR trap before the capsule exists.
PREVIOUS_ERR_TRAP="$(trap -p ERR || true)"
trap - ERR
set +e
git diff --check "$BASE_COMMIT" "$HEAD_COMMIT" -- >> "$EVIDENCE_DIR/diff-check.txt" 2>&1
DIFF_CHECK_RC=$?
set -e
if [[ -n "$PREVIOUS_ERR_TRAP" ]]; then
  eval "$PREVIOUS_ERR_TRAP"
else
  trap on_error ERR
fi
printf '\nexit_code: %s\n' "$DIFF_CHECK_RC" >> "$EVIDENCE_DIR/diff-check.txt"
(( DIFF_CHECK_RC == 0 )) || CHECK_FAILURES=$((CHECK_FAILURES + 1))

write_header "$EVIDENCE_DIR/repository-inventory.txt" "Repository inventory"
{
  printf '## tracked file count\n'
  git ls-files | wc -l | tr -d ' '
  printf '\n## top-level\n'
  find . -mindepth 1 -maxdepth 2 \
    -not -path './.git*' \
    -not -path './node_modules*' \
    -not -path './venv*' \
    -not -path './dist*' \
    -not -path './build*' \
    -print | LC_ALL=C sort | sed 's#^./##' | head -2000
  printf '\n## tracked paths\n'
  git ls-files | LC_ALL=C sort
} >> "$EVIDENCE_DIR/repository-inventory.txt"

write_header "$EVIDENCE_DIR/environment.txt" "Toolchain environment"
{
  printf 'os: '; uname -a || true
  printf 'git: '; git --version || true
  printf 'node: '; node --version || true
  command -v npm >/dev/null 2>&1 && { printf 'npm: '; npm --version; }
  command -v pnpm >/dev/null 2>&1 && { printf 'pnpm: '; pnpm --version; }
  command -v yarn >/dev/null 2>&1 && { printf 'yarn: '; yarn --version; }
  command -v bun >/dev/null 2>&1 && { printf 'bun: '; bun --version; }
  command -v python3 >/dev/null 2>&1 && { printf 'python: '; python3 --version; }
  command -v docker >/dev/null 2>&1 && { printf 'docker: '; docker --version; }
} >> "$EVIDENCE_DIR/environment.txt"

write_header "$EVIDENCE_DIR/dependency-manifests.txt" "Dependency and configuration manifests"
python3 - <<'PY' >> "$EVIDENCE_DIR/dependency-manifests.txt"
from pathlib import Path
names = {
    'package.json','package-lock.json','pnpm-lock.yaml','yarn.lock','bun.lockb',
    'pyproject.toml','poetry.lock','requirements.txt','Pipfile','Pipfile.lock',
    'Cargo.toml','Cargo.lock','go.mod','go.sum','Gemfile','Gemfile.lock',
    'composer.json','composer.lock','Dockerfile','docker-compose.yml','docker-compose.yaml',
}
prefixes = ('tsconfig','vite.config','vitest.config','playwright.config','eslint.config','tailwind.config','next.config')
for p in sorted(Path('.').rglob('*')):
    if not p.is_file() or '.git' in p.parts or 'node_modules' in p.parts or 'venv' in p.parts:
        continue
    if p.name in names or p.name.startswith(prefixes):
        try:
            size = p.stat().st_size
        except OSError:
            continue
        print(f'{p.as_posix()}\t{size}')
PY

cat > "$EVIDENCE_DIR/AI_REVIEW_BRIEF.md" <<EOF_BRIEF
# AI Production Review Brief

## Goal

$GOAL

## Review range

- Base: \`$BASE_COMMIT\`
- Head: \`$HEAD_COMMIT\`
- Branch: \`$BRANCH\`
- Capsule mode: \`$MODE\`
- Check level: \`$CHECK_LEVEL\`

## Required review behavior

1. Establish commit provenance and the exact engineering delta before judging implementation quality.
2. Review production correctness, regressions, security, accessibility, performance, maintainability, architecture, observability, deployment risk, test quality, and evidence quality.
3. Distinguish verified defects from hypotheses. Cite exact files, symbols, and evidence paths.
4. Detect test weakening: deleted actions, reduced assertions, broad selectors, forced clicks, fixed waits, skipped tests, hidden duplicates, and coverage loss.
5. Detect implementation drift from shared contracts and duplicated one-off patterns.
6. Rank findings by severity and user/business impact.
7. Give a PASS, PARTIAL, FAIL, or WORSE verdict with a numeric score.
8. State what worked, what failed, the lesson learned, and the binding rule for the next prompt.
9. Produce a maximum-workhorse next implementation prompt: high agency, repair-first, minimal narration, targeted checks during work, and one final proof pass.
10. Do not recommend cosmetic churn, speculative rewrites, or endless testing. Every requested change must improve production readiness or evidence quality.

## Evidence map

Generated wrapper evidence is under \`COMMAND_OUTPUTS/_SHIP_AI_REVIEW/\`.
Repository-defined command outputs may also exist elsewhere under \`COMMAND_OUTPUTS/\`.
EOF_BRIEF

# Capture package scripts and choose bounded checks. Failures are evidence and do not prevent packaging.
python3 - <<'PY' > "$EVIDENCE_DIR/package-scripts.tsv"
import json
from pathlib import Path
for p in sorted(Path('.').glob('package.json')) + sorted(Path('.').glob('*/package.json')):
    if any(x in p.parts for x in ('node_modules','.git','dist','build')):
        continue
    try:
        data = json.loads(p.read_text(encoding='utf-8'))
    except Exception:
        continue
    for name, command in sorted((data.get('scripts') or {}).items()):
        print(f'{p.parent.as_posix()}\t{name}\t{command}')
PY

run_check() {
  local index="$1" workdir="$2" script_name="$3" script_body="$4" package_manager="$5"
  local safe_name output_file command_text start_epoch end_epoch rc timeout_label="none"
  local -a timeout_cmd=()
  local previous_err_trap

  safe_name="$(printf '%s-%s' "$workdir" "$script_name" | sed -E 's#[^A-Za-z0-9._-]+#-#g; s#^-+|-+$##g')"
  output_file="$EVIDENCE_DIR/checks/$(printf '%02d' "$index")-${safe_name}.txt"

  case "$package_manager" in
    pnpm) command_text="pnpm run $script_name" ;;
    yarn) command_text="yarn run $script_name" ;;
    bun) command_text="bun run $script_name" ;;
    *) command_text="npm run $script_name" ;;
  esac

  # Make common Vitest scripts noninteractive without rewriting repository scripts.
  if [[ "$script_body" == *vitest* && "$script_body" != *"--run"* && "$script_body" != *" run"* ]]; then
    command_text+=" -- --run"
  fi

  if command -v timeout >/dev/null 2>&1; then
    timeout_cmd=(timeout --foreground "${CHECK_TIMEOUT_MIN}m")
    timeout_label="timeout ${CHECK_TIMEOUT_MIN}m"
  elif command -v gtimeout >/dev/null 2>&1; then
    timeout_cmd=(gtimeout --foreground "${CHECK_TIMEOUT_MIN}m")
    timeout_label="gtimeout ${CHECK_TIMEOUT_MIN}m"
  else
    warn "timeout/gtimeout unavailable; check '$script_name' will run without a per-command timeout"
  fi

  write_header "$output_file" "Captured repository check"
  {
    printf 'index: %s\n' "$index"
    printf 'working_directory: %s\n' "$workdir"
    printf 'script: %s\n' "$script_name"
    printf 'declared_script: %s\n' "$script_body"
    printf 'command: %s\n' "$command_text"
    printf 'timeout: %s\n' "$timeout_label"
    printf 'started_utc: %s\n\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  } > "$output_file"

  printf '\n---- CHECK %s START ----\n' "$index"
  printf 'cwd: %s\ncommand: %s\ntimeout: %s\nevidence: %s\n' "$workdir" "$command_text" "$timeout_label" "$output_file"
  printf '%s\n' '-------------------------'

  start_epoch="$(date +%s)"

  # A repository test is evidence, not wrapper control flow. Temporarily remove
  # the global ERR trap and `errexit`, run the check, capture PIPESTATUS, then
  # restore strict behavior. This works even with `set -E` and nested subshells.
  previous_err_trap="$(trap -p ERR || true)"
  trap - ERR
  set +e
  if [[ "$QUIET_CHECKS" == "1" ]]; then
    (
      trap - ERR
      set +e
      cd "$workdir" || exit 125
      CI=1 "${timeout_cmd[@]}" bash -lc "$command_text"
    ) >> "$output_file" 2>&1
    rc=$?
  else
    (
      trap - ERR
      set +e
      cd "$workdir" || exit 125
      CI=1 "${timeout_cmd[@]}" bash -lc "$command_text"
    ) 2>&1 | tee -a "$output_file"
    rc=${PIPESTATUS[0]}
  fi
  set -e
  if [[ -n "$previous_err_trap" ]]; then
    eval "$previous_err_trap"
  else
    trap on_error ERR
  fi

  end_epoch="$(date +%s)"
  {
    printf '\nfinished_utc: %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    printf 'exit_code: %s\n' "$rc"
    printf 'duration_seconds: %s\n' "$((end_epoch - start_epoch))"
    if [[ "$rc" == "124" ]]; then printf 'timed_out: true\n'; else printf 'timed_out: false\n'; fi
  } >> "$output_file"

  if (( rc != 0 )); then
    CHECK_FAILURES=$((CHECK_FAILURES + 1))
    printf '%s\n' '-------------------------'
    warn "CHECK $index FAILED"
    warn "cwd: $workdir"
    warn "command: $command_text"
    warn "exit: $rc"
    warn "full output: $output_file"
    printf '%s\n' '---- FAILED CHECK: LAST 80 LINES ----' >&2
    tail -n 80 "$output_file" >&2 2>/dev/null || true
    printf '%s\n' '---- END FAILED CHECK EXCERPT ----' >&2
  else
    printf '%s\n' '-------------------------'
    info "CHECK $index PASS: $workdir: $command_text"
  fi
  printf '%s\n' "---- CHECK $index END (exit $rc) ----"

  # Never propagate a repository-check failure into wrapper control flow.
  return 0
}

select_package_manager() {
  local dir="$1"
  if [[ -f "$dir/pnpm-lock.yaml" || -f pnpm-lock.yaml ]]; then
    command -v pnpm >/dev/null 2>&1 && { printf 'pnpm\n'; return; }
  fi
  if [[ -f "$dir/yarn.lock" || -f yarn.lock ]]; then
    command -v yarn >/dev/null 2>&1 && { printf 'yarn\n'; return; }
  fi
  if [[ -f "$dir/bun.lockb" || -f bun.lockb ]]; then
    command -v bun >/dev/null 2>&1 && { printf 'bun\n'; return; }
  fi
  printf 'npm\n'
}

if [[ "$CHECK_LEVEL" != "none" ]]; then
  log "Bounded repository checks ($CHECK_LEVEL)"
  CHECK_START="$(date +%s)"
  CHECK_INDEX=0
  declare -A SEEN_CHECKS=()
  SMART_PRIORITY_REGEX='^(typecheck|check:shell-contracts|check:operational-contracts|check:contracts|lint|test:unit|test|build)$'

  while IFS=$'\t' read -r package_dir script_name script_body; do
    [[ -n "$script_name" ]] || continue
    key="$package_dir::$script_name"
    [[ -z "${SEEN_CHECKS[$key]:-}" ]] || continue

    if [[ "$CHECK_LEVEL" == "smart" ]]; then
      [[ "$script_name" =~ $SMART_PRIORITY_REGEX ]] || continue
      (( CHECK_INDEX < MAX_SMART_CHECKS )) || break
    else
      # Full remains bounded and skips dev/watch/serve scripts.
      [[ "$script_name" =~ ^(dev|start|serve|watch|preview)$ ]] && continue
      (( CHECK_INDEX < 20 )) || break
    fi

    elapsed=$(( $(date +%s) - CHECK_START ))
    if (( elapsed >= TOTAL_CHECK_MIN * 60 )); then
      warn "total check budget reached; remaining checks skipped"
      break
    fi

    SEEN_CHECKS[$key]=1
    CHECK_INDEX=$((CHECK_INDEX + 1))
    manager="$(select_package_manager "$package_dir")"
    info "[$CHECK_INDEX] $package_dir: $manager run $script_name"
    run_check "$CHECK_INDEX" "$package_dir" "$script_name" "$script_body" "$manager"
  done < "$EVIDENCE_DIR/package-scripts.tsv"

  if (( CHECK_INDEX == 0 )); then
    warn "no matching package scripts found for check level '$CHECK_LEVEL'"
  fi
fi

write_header "$EVIDENCE_DIR/check-summary.txt" "Captured check summary"
{
  printf 'check_level: %s\n' "$CHECK_LEVEL"
  printf 'failure_count: %s\n' "$CHECK_FAILURES"
  printf 'strict_checks: %s\n' "$STRICT_CHECKS"
  printf '\n## files\n'
  find "$EVIDENCE_DIR/checks" -maxdepth 1 -type f -print | LC_ALL=C sort
} >> "$EVIDENCE_DIR/check-summary.txt"

# Discover generator capabilities rather than assuming every repository has identical flags.
GEN_HELP_FILE="$(mktemp "${TMPDIR:-/tmp}/capsule-help.XXXXXX")"
# Generator capability discovery is also intentionally nonfatal.
PREVIOUS_ERR_TRAP="$(trap -p ERR || true)"
trap - ERR
set +e
node "$GENERATOR" --help > "$GEN_HELP_FILE" 2>&1
HELP_RC=$?
set -e
if [[ -n "$PREVIOUS_ERR_TRAP" ]]; then
  eval "$PREVIOUS_ERR_TRAP"
else
  trap on_error ERR
fi
if (( HELP_RC != 0 )); then
  warn "generator --help exited $HELP_RC; continuing with flags used by the existing SysGrid wrapper"
fi

supports_flag() {
  local flag="$1"
  grep -Eq -- "(^|[[:space:],])${flag//-/\\-}([=[:space:],]|$)" "$GEN_HELP_FILE" 2>/dev/null
}

GEN_MODE="$MODE"
GEN_ARGS=(--mode "$GEN_MODE" --base "$BASE_COMMIT" --force)
case "$MODE" in
  changed) GEN_MODE="changed" ;;
  quick) GEN_MODE="quick" ;;
  minimal) GEN_MODE="minimal" ;;
  daily|standard) GEN_MODE="daily" ;;
  fresh|deep) GEN_MODE="fresh" ;;
  audit) GEN_MODE="audit" ;;
  full) GEN_MODE="full" ;;
esac
GEN_ARGS=(--mode "$GEN_MODE" --base "$BASE_COMMIT" --force)

supports_flag --head && GEN_ARGS+=(--head "$HEAD_COMMIT")
case "$MODE" in
  fresh|deep|audit|full)
    supports_flag --include-all-essential && GEN_ARGS+=(--include-all-essential)
    ;;
esac
case "$MODE" in
  audit|full)
    supports_flag --strict && GEN_ARGS+=(--strict)
    ;;
esac
supports_flag --include-before-after && GEN_ARGS+=(--include-before-after)
if [[ "$MODE" == "full" ]]; then
  supports_flag --max-file-bytes && GEN_ARGS+=(--max-file-bytes 20000000)
  supports_flag --max-diff-bytes && GEN_ARGS+=(--max-diff-bytes 50000000)
fi
if [[ "$ALLOW_EMPTY" == "1" ]]; then
  supports_flag --allow-empty && GEN_ARGS+=(--allow-empty)
fi
if [[ -n "$EXCLUSIONS_PATH" ]]; then
  # Support common exclusion flag names only when advertised.
  if supports_flag --exclusions; then
    GEN_ARGS+=(--exclusions "$EXCLUSIONS_PATH")
  elif supports_flag --exclusion-policy; then
    GEN_ARGS+=(--exclusion-policy "$EXCLUSIONS_PATH")
  fi
fi

log "Capsule generation"
printf 'generator: %s\nmode: %s\nbase: %s\nhead: %s\n' "$GENERATOR" "$GEN_MODE" "$BASE_COMMIT" "$HEAD_COMMIT"
printf 'args:'; printf ' %q' "${GEN_ARGS[@]}"; printf '\n'
node "$GENERATOR" "${GEN_ARGS[@]}"

DEFAULT_ZIP_PATH="$(cd .. && pwd)/$DEFAULT_OUTPUT_NAME"
if [[ -z "$OUTPUT_PATH" ]]; then
  OUTPUT_PATH="$DEFAULT_ZIP_PATH"
else
  case "$OUTPUT_PATH" in
    /*) ;;
    *) OUTPUT_PATH="$ROOT/$OUTPUT_PATH" ;;
  esac
fi

# If the generator writes the standard path but a custom output was requested, move a copy.
if [[ ! -f "$OUTPUT_PATH" && -f "$DEFAULT_ZIP_PATH" ]]; then
  mkdir -p "$(dirname "$OUTPUT_PATH")"
  cp -f "$DEFAULT_ZIP_PATH" "$OUTPUT_PATH"
fi
[[ -f "$OUTPUT_PATH" ]] || die "capsule zip not found at $OUTPUT_PATH or $DEFAULT_ZIP_PATH"

log "Prune generated repository artifacts from capsule"
CAPSULE_PRUNE_REPORT="$(python3 - "$OUTPUT_PATH" <<'PY_CAPSULE_PRUNE'
import os
import pathlib
import re
import sys
import tempfile
import zipfile

source = pathlib.Path(sys.argv[1])

def generated_entry(name):
    normalized = name.replace("\\", "/")
    lowered = normalized.lower()
    if lowered.startswith("command_outputs/_ship_ai_review/"):
        return False
    p = pathlib.PurePosixPath(normalized)
    parts = [part.lower() for part in p.parts]
    for part in parts:
        if part.startswith("test-results") or part.startswith("playwright-report") or part.startswith("blob-report"):
            return True
        if re.fullmatch(r"stage\d+-evidence", part):
            return True
    return p.name.lower() == "llm-report.json"

fd, temporary_name = tempfile.mkstemp(prefix=source.name + ".pruned.", dir=str(source.parent))
os.close(fd)
temporary = pathlib.Path(temporary_name)
removed = []
try:
    with zipfile.ZipFile(source, "r") as incoming, zipfile.ZipFile(temporary, "w") as outgoing:
        for info in incoming.infolist():
            if generated_entry(info.filename):
                removed.append(info.filename)
                continue
            outgoing.writestr(info, incoming.read(info.filename))
    temporary.replace(source)
finally:
    temporary.unlink(missing_ok=True)
for name in removed:
    print(name)
PY_CAPSULE_PRUNE
)"
write_header "$EVIDENCE_DIR/capsule-prune.txt" "Capsule generated-artifact pruning"
printf 'removed_count: %s\n\n%s\n' "$(printf '%s\n' "$CAPSULE_PRUNE_REPORT" | sed '/^$/d' | wc -l | tr -d ' ')" "${CAPSULE_PRUNE_REPORT:-none}" \
  >> "$EVIDENCE_DIR/capsule-prune.txt"

# Guarantee that the wrapper's decisive evidence is present even when the
# repository generator's essential-file rules do not include it automatically.
log "Inject wrapper evidence into capsule"
INJECT_PATHS=("$EVIDENCE_DIR" "$SELF_REL" "$GENERATOR")
if [[ -n "$EXCLUSIONS_PATH" && -f "$EXCLUSIONS_PATH" ]]; then
  INJECT_PATHS+=("$EXCLUSIONS_PATH")
fi
zip -qur "$OUTPUT_PATH" "${INJECT_PATHS[@]}"

log "Capsule verification"
VERIFY_JSON="$(python3 - "$OUTPUT_PATH" "$BASE_COMMIT" "$HEAD_COMMIT" "$ALLOW_EMPTY" "$MAX_CAPSULE_MB" <<'PY'
import hashlib, json, os, pathlib, re, sys, zipfile
zip_path, expected_base, expected_head, allow_empty, max_capsule_mb = sys.argv[1:]
allow_empty = allow_empty == '1'
max_capsule_bytes = int(max_capsule_mb) * 1024 * 1024
result = {"zip": zip_path, "errors": [], "warnings": []}
with zipfile.ZipFile(zip_path) as z:
    bad = z.testzip()
    if bad:
        result["errors"].append(f"CRC failure: {bad}")
    names = z.namelist()
    result["file_count"] = len(names)
    unsafe = []
    for n in names:
        p = pathlib.PurePosixPath(n)
        if p.is_absolute() or '..' in p.parts:
            unsafe.append(n)
    if unsafe:
        result["errors"].append(f"unsafe paths: {unsafe[:10]}")
    lower = {n.lower(): n for n in names}
    generated_path_re = re.compile(r'(^|/)(test-results[^/]*|playwright-report[^/]*|blob-report[^/]*|stage[0-9]+-evidence)(/|$)', re.I)
    forbidden_generated = [
        n for n in names
        if generated_path_re.search(n)
        or n.lower().endswith('/llm-report.json')
        or '/command_outputs/_ship_ai_review/command_outputs/_ship_ai_review/' in n.lower()
    ]
    # Wrapper evidence is intentionally allowed at its one canonical capsule path.
    forbidden_generated = [
        n for n in forbidden_generated
        if 'command_outputs/_ship_ai_review/' not in n.lower()
    ]
    if forbidden_generated:
        result["errors"].append(f"generated repository artifacts leaked into capsule: {forbidden_generated[:20]}")
    manifest_candidates = [n for n in names if 'manifest' in n.lower() and n.lower().endswith(('.md','.txt','.json'))]
    result["manifest_candidates"] = manifest_candidates[:20]
    combined = ''
    for n in manifest_candidates[:20]:
        try:
            combined += '\n' + z.read(n).decode('utf-8', 'replace')
        except Exception:
            pass
    if expected_head not in combined:
        result["warnings"].append("expected head hash was not found in discovered manifests")
    if expected_base not in combined:
        result["warnings"].append("expected base hash was not found in discovered manifests")
    diff_candidates = [
        n for n in names
        if n.lower().endswith(('.diff', '.patch'))
        or any(k in n.lower() for k in ('full_diff', 'full-diff', 'commit-patches'))
    ]
    result["diff_candidates"] = diff_candidates[:50]
    valid_diff_candidates = []
    for n in diff_candidates:
        try:
            data = z.read(n)
        except Exception:
            continue
        lowered = data.lower()
        # Require actual Git patch syntax. This accepts text and binary-only
        # changes and rejects placeholders, summaries, and empty files.
        has_patch_marker = (
            b'diff --git ' in data
            or b'git binary patch' in lowered
            or (b'--- a/' in data and b'+++ b/' in data)
        )
        if has_patch_marker:
            valid_diff_candidates.append(n)
    result["valid_diff_candidates"] = valid_diff_candidates[:50]
    if not valid_diff_candidates and not allow_empty:
        result["errors"].append(
            "no reviewable Git patch found; expected diff --git/GIT binary patch markers"
        )
    command_outputs = [n for n in names if 'command_outputs/' in n.lower() or 'commandoutputs/' in n.lower()]
    result["command_output_count"] = len(command_outputs)
    if not command_outputs:
        result["errors"].append("no COMMAND_OUTPUTS evidence found")
    wrapper_evidence = [n for n in names if '_ship_ai_review' in n.lower()]
    result["wrapper_evidence_count"] = len(wrapper_evidence)
    if not wrapper_evidence:
        result["warnings"].append("wrapper-generated evidence directory was not included; inspect generator essential-file rules")
size = os.path.getsize(zip_path)
result["size_bytes"] = size
if max_capsule_bytes and size > max_capsule_bytes:
    result["errors"].append(
        f"capsule exceeds {max_capsule_mb} MiB limit: {size} bytes"
    )
h = hashlib.sha256()
with open(zip_path, 'rb') as f:
    for chunk in iter(lambda: f.read(1024 * 1024), b''):
        h.update(chunk)
result["sha256"] = h.hexdigest()
print(json.dumps(result, indent=2))
PY
)"
printf '%s\n' "$VERIFY_JSON"

VERIFY_ERRORS="$(printf '%s' "$VERIFY_JSON" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["errors"]))')"
(( VERIFY_ERRORS == 0 )) || die "capsule verification failed with $VERIFY_ERRORS error(s)"

if (( STRICT_CHECKS == 1 && CHECK_FAILURES > 0 )); then
  printf 'FAIL: capsule was created locally, but %s captured check(s) failed; push was blocked.\n' "$CHECK_FAILURES" >&2
  exit 3
fi

# Push only after every artifact and capsule verification gate passes.
if [[ "$NO_PUSH" == "0" && ( "$DID_COMMIT" == "1" || "$PUSH_CURRENT" == "1" ) ]]; then
  log "Push verified commit"
  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    git push
  else
    git push -u origin "$BRANCH"
  fi
else
  info "Push skipped."
fi

log "Done"
printf 'Commit: %s\n' "$HEAD_COMMIT"
printf 'Base: %s\n' "$BASE_COMMIT"
printf 'Branch: %s\n' "$BRANCH"
printf 'Check failures captured: %s\n' "$CHECK_FAILURES"
printf 'Upload this file: %s\n' "$OUTPUT_PATH"
printf 'Normal next-iteration command: ./scripts/ship-ai-review.sh %q\n' "NEXT ITERATION COMMIT MESSAGE"
