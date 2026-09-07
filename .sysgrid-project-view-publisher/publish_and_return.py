#!/usr/bin/env python3
import subprocess, sys, json, hashlib, zipfile, os, re, traceback
from pathlib import Path
from datetime import datetime, timezone

BASE_COMMIT = "d40c0929ff7a9ec37d9c57bdb7ef0cf2d020c7ee"
BASE_TREE = "0aa53cc6ed9121b178c72c31e2a6b1c04e985f5f"
GITLINK_PATH = "SysGrid"
GITLINK_OID = "445c225a3dec7c359f8ff0b09934716ee2d91b6e"
EXPECTED_BLOBS = {
    "frontend/src/components/ProjectsModernGantt.tsx": "15160b7d4b18b9f877aaa49be175628a14a9ab95",
    "frontend/src/components/ProjectsSchedulingCompletion.tsx": "28663d0a9858afcae7d39d0dfa1652c901d6d4ee",
    "frontend/src/components/ProjectsVisualRepair.css": "b2bd92bb77d3d60fffad27a644b41209feec676b",
    "frontend/tests/projects-navigation.spec.ts": "4db5eed685e43b9d43ca7461a0088a1e7d221a03",
    "frontend/tests/projects-out40-slice-e-timeline-dependency-a11y.spec.ts": "2e257214b4854a756aeb37f8c770fcab4c650210",
    "frontend/tests/projects-out40-slice-g-accessible-name-audit.spec.ts": "9bb45acc166cc8984f33efffdde5b13f0e3e6948",
    "frontend/tests/projects-out40-slice-h-gantt-modernization.spec.ts": "98daa22e1c2cfc4b98ba981855c95aaecb4359e1",
    "frontend/tests/projects-visual-repair.spec.ts": "9e104744565bb6ef6b11b1b4243ac45a14cbe15c",
}
RESULT_NAME = "SysGrid-Project-View-Perfection-Publish-RESULT.zip"

repo = Path(sys.argv[1] if len(sys.argv) > 1 else os.getcwd()).resolve()
evidence = repo / ".sysgrid-project-view-publish-evidence"
evidence.mkdir(exist_ok=True)
logs = {}

result = {
    "schema": "SYSGRID_PROJECT_VIEW_PUBLICATION_RESULT_V1",
    "objective": "Approved Project View Perfection",
    "started_at": datetime.now(timezone.utc).isoformat(),
    "status": "FAIL",
    "expected_base": {"commit": BASE_COMMIT, "tree": BASE_TREE},
    "expected_gitlink": {"path": GITLINK_PATH, "mode": "160000", "oid": GITLINK_OID},
    "expected_blobs": EXPECTED_BLOBS,
    "publication_mode": "DIRECT_MAIN_FAST_FORWARD_NO_FORCE",
    "remote_write_attempted": False,
    "remote_published": False,
}

def run(args, check=True, cwd=repo, name=None):
    p = subprocess.run(args, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if name:
        logs[name] = p.stdout
    if check and p.returncode != 0:
        raise RuntimeError(f"{' '.join(args)} exited {p.returncode}\n{p.stdout}")
    return p

def git(*args, check=True, name=None):
    return run(["git", *args], check=check, name=name)

def blob_of_worktree(path):
    return git("hash-object", "--", path).stdout.strip()

def blob_of_head(path, ref="HEAD"):
    out = git("ls-tree", ref, "--", path).stdout.strip()
    if not out:
        return None
    return out.split()[2]

def emit():
    result["completed_at"] = datetime.now(timezone.utc).isoformat()
    result_path = evidence / "RESULT.json"
    result_path.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    for name, content in logs.items():
        (evidence / f"{name}.log").write_text(content)
    zip_path = repo / RESULT_NAME
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for p in sorted(evidence.iterdir()):
            if p.is_file():
                z.write(p, p.name if p.name == "RESULT.json" else f"logs/{p.name}")
    print(f"RESULT_ZIP={zip_path}")
    print(f"STATUS={result['status']}")
    return zip_path

try:
    if not (repo / ".git").exists():
        raise RuntimeError(f"Not a Git repository root: {repo}")

    origin = git("remote", "get-url", "origin").stdout.strip()
    result["origin"] = origin
    if not re.search(r"(?:github\.com[:/])kimhw8084/system_grid(?:\.git)?$", origin):
        raise RuntimeError(f"Unexpected origin: {origin}")

    branch = git("symbolic-ref", "--short", "-q", "HEAD", check=False).stdout.strip()
    result["branch"] = branch
    if branch != "main":
        raise RuntimeError(f"Expected checked-out branch main, found {branch or 'DETACHED'}")

    head = git("rev-parse", "HEAD").stdout.strip()
    tree = git("rev-parse", "HEAD^{tree}").stdout.strip()
    result["initial_head"] = head
    result["initial_tree"] = tree

    gitlink_line = git("ls-tree", "HEAD", "--", GITLINK_PATH).stdout.strip()
    result["gitlink_observed"] = gitlink_line
    parts = gitlink_line.split()
    if len(parts) < 3 or parts[0] != "160000" or parts[2] != GITLINK_OID:
        raise RuntimeError(f"Gitlink mismatch: {gitlink_line}")

    # Network/authority guard happens before any commit creation.
    remote_before_line = git("ls-remote", "origin", "refs/heads/main", name="remote-before").stdout.strip()
    remote_before = remote_before_line.split()[0] if remote_before_line else ""
    result["remote_main_before"] = remote_before

    # Two resumable states are accepted:
    # A) HEAD is base and exact candidate bytes are uncommitted.
    # B) HEAD is already a one-commit child of base containing exactly the candidate bytes.
    if head == BASE_COMMIT:
        if tree != BASE_TREE:
            raise RuntimeError(f"Base tree mismatch: {tree}")

        if remote_before != BASE_COMMIT:
            raise RuntimeError(f"Remote main moved: expected {BASE_COMMIT}, found {remote_before or 'missing'}")

        staged = git("diff", "--cached", "--name-only").stdout.splitlines()
        if staged:
            raise RuntimeError(f"Index is not clean before publication: {staged}")

        tracked_changed = sorted(
            p for p in git("status", "--porcelain=v1", "--untracked-files=no").stdout.splitlines()
            if p.strip()
        )
        result["tracked_status_before"] = tracked_changed
        changed_paths = sorted(line[3:] for line in tracked_changed)
        expected_paths = sorted(EXPECTED_BLOBS)
        if changed_paths != expected_paths:
            raise RuntimeError(f"Tracked change set mismatch.\nExpected: {expected_paths}\nObserved: {changed_paths}")

        observed = {p: blob_of_worktree(p) for p in EXPECTED_BLOBS}
        result["worktree_blobs_before_commit"] = observed
        mismatches = {p: {"expected": EXPECTED_BLOBS[p], "observed": observed[p]}
                      for p in EXPECTED_BLOBS if observed[p] != EXPECTED_BLOBS[p]}
        if mismatches:
            raise RuntimeError(f"Candidate blob mismatch: {mismatches}")

        git("diff", "--check", name="diff-check")
        git("add", "--", *EXPECTED_BLOBS.keys())

        cached_paths = sorted(git("diff", "--cached", "--name-only").stdout.splitlines())
        if cached_paths != expected_paths:
            raise RuntimeError(f"Staged path set mismatch: {cached_paths}")

        staged_blobs = {p: blob_of_head(p, ":0") if False else None for p in []}  # documented no-op
        commit_msg = (
            "feat(projects): perfect Project View timeline accessibility\n\n"
            "SysGrid Project View Perfection\n\n"
            "- virtualized WBS/treegrid accessibility semantics\n"
            "- keyboard whole-task move and resize parity\n"
            "- >=40px direct-manipulation targets\n"
            "- responsive scheduling control\n"
            "- R4-aligned retained regression coverage\n"
        )
        cp = run(["git", "commit", "-m", commit_msg], check=False, name="commit")
        if cp.returncode != 0:
            raise RuntimeError(f"git commit failed\n{cp.stdout}")
        head = git("rev-parse", "HEAD").stdout.strip()
        tree = git("rev-parse", "HEAD^{tree}").stdout.strip()
        result["local_commit_created"] = head
        result["local_commit_tree"] = tree
    else:
        parent = git("rev-parse", "HEAD^", check=False).stdout.strip()
        result["resume_parent"] = parent
        if parent != BASE_COMMIT:
            raise RuntimeError(f"HEAD is neither base nor a direct child of base: {head}")
        if remote_before not in (BASE_COMMIT, head):
            raise RuntimeError(f"Remote main is incompatible with resumable local commit: {remote_before}")
        changed = sorted(git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").stdout.splitlines())
        if changed != sorted(EXPECTED_BLOBS):
            raise RuntimeError(f"Existing local commit changed unexpected paths: {changed}")
        observed = {p: blob_of_head(p) for p in EXPECTED_BLOBS}
        result["head_blobs_resume"] = observed
        mismatches = {p: {"expected": EXPECTED_BLOBS[p], "observed": observed[p]}
                      for p in EXPECTED_BLOBS if observed[p] != EXPECTED_BLOBS[p]}
        if mismatches:
            raise RuntimeError(f"Existing local commit blob mismatch: {mismatches}")
        if git("status", "--porcelain=v1", "--untracked-files=no").stdout.strip():
            raise RuntimeError("Tracked worktree is dirty on resumable commit")
        result["resumed_local_commit"] = head
        result["local_commit_tree"] = tree

    # Verify commit ancestry and exact committed blobs.
    parent = git("rev-parse", "HEAD^").stdout.strip()
    if parent != BASE_COMMIT:
        raise RuntimeError(f"Publication commit parent mismatch: {parent}")

    committed = {p: blob_of_head(p) for p in EXPECTED_BLOBS}
    result["committed_blobs"] = committed
    mismatches = {p: {"expected": EXPECTED_BLOBS[p], "observed": committed[p]}
                  for p in EXPECTED_BLOBS if committed[p] != EXPECTED_BLOBS[p]}
    if mismatches:
        raise RuntimeError(f"Committed blob mismatch: {mismatches}")

    # Ensure the gitlink survived unchanged in the publication commit.
    gitlink_after = git("ls-tree", "HEAD", "--", GITLINK_PATH).stdout.strip()
    result["gitlink_after_commit"] = gitlink_after
    p = gitlink_after.split()
    if len(p) < 3 or p[0] != "160000" or p[2] != GITLINK_OID:
        raise RuntimeError(f"Gitlink changed in publication commit: {gitlink_after}")

    # If already remote, do not push again. Otherwise require remote still at base.
    head = git("rev-parse", "HEAD").stdout.strip()
    if remote_before == head:
        result["remote_write_attempted"] = False
    else:
        if remote_before != BASE_COMMIT:
            raise RuntimeError(f"Remote main moved before push: {remote_before}")
        result["remote_write_attempted"] = True
        pp = run(["git", "push", "origin", "HEAD:refs/heads/main"], check=False, name="push")
        if pp.returncode != 0:
            result["local_application"] = "LOCAL_COMMIT_CREATED_REMOTE_PUSH_FAILED"
            raise RuntimeError(f"git push failed\n{pp.stdout}")

    remote_after_line = git("ls-remote", "origin", "refs/heads/main", name="remote-after").stdout.strip()
    remote_after = remote_after_line.split()[0] if remote_after_line else ""
    result["remote_main_after"] = remote_after
    if remote_after != head:
        raise RuntimeError(f"Remote verification mismatch: expected {head}, found {remote_after}")

    result["published_commit"] = head
    result["published_tree"] = git("rev-parse", "HEAD^{tree}").stdout.strip()
    result["remote_published"] = True
    result["status"] = "PASS"
    result["next_gate"] = "FRESH_GITHUB_VERIFY_THEN_LINEAR_FRONTIER_HOT_STATE_TRANSITION"
except Exception as e:
    result["error"] = str(e)
    result["traceback"] = traceback.format_exc()
finally:
    emit()
    sys.exit(0 if result["status"] == "PASS" else 1)
