#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, os, pathlib, shutil, subprocess, sys, tempfile, time, zipfile

BASE_COMMIT = "d40c0929ff7a9ec37d9c57bdb7ef0cf2d020c7ee"
BASE_TREE = "0aa53cc6ed9121b178c72c31e2a6b1c04e985f5f"
GITLINK_PATH = "SysGrid"
GITLINK_OID = "445c225a3dec7c359f8ff0b09934716ee2d91b6e"
PARENT_RESULT_SHA256 = "ee99946d3ec51eb5a840955e80e932bc0edfb77ea2418023d391236743fbaa53"
PARENT_PRODUCT_BLOBS = {
    "frontend/src/components/ProjectsModernGantt.tsx": "15160b7d4b18b9f877aaa49be175628a14a9ab95",
    "frontend/src/components/ProjectsVisualRepair.css": "17287e273c32a1fd8c020d48e0e7ccce44c477bb",
    "frontend/tests/projects-visual-repair.spec.ts": "9e104744565bb6ef6b11b1b4243ac45a14cbe15c",
}
HARNESS = "frontend/tests/projects-out40-slice-h-gantt-modernization.spec.ts"
HARNESS_BEFORE = "714a7639d59eb2575462a0814bfc544996d82986"
OLD = b"  await expect(page.locator('[data-project-legacy-gantt-hidden=\"true\"]')).toHaveCount(1)\n"
NEW = b"  await expect(gantt).toHaveCount(1)\n"
PROOF_COMMANDS = [
    ("out40-slice-h-regression", ["node", "scripts/run-projects-out40-slice-h-browser.mjs", "--mode", "regression"]),
    ("projects-visual-repair", ["node", "scripts/run-projects-visual-repair.mjs"]),
]
ALLOWED_TRACKED = set(PARENT_PRODUCT_BLOBS) | {HARNESS}


def run(args, cwd, *, log=None, env=None, check=True):
    started = time.time()
    p = subprocess.run(args, cwd=str(cwd), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)
    elapsed = round((time.time() - started) * 1000)
    if log:
        pathlib.Path(log).write_text(p.stdout or "", encoding="utf-8")
    if check and p.returncode:
        raise RuntimeError(f"command failed ({p.returncode}): {' '.join(args)}\n{(p.stdout or '')[-4000:]}")
    return {"args": args, "exit_code": p.returncode, "duration_ms": elapsed, "output": p.stdout or ""}


def git(repo, *args, check=True):
    return run(["git", *args], repo, check=check)


def blob(repo, rel):
    return git(repo, "hash-object", "--", rel)["output"].strip()


def blob_bytes(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def deterministic_zip(src: pathlib.Path, out: pathlib.Path):
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(x for x in src.rglob("*") if x.is_file()):
            rel = p.relative_to(src).as_posix()
            info = zipfile.ZipInfo(rel, (2026, 9, 6, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o644 & 0xFFFF) << 16
            z.writestr(info, p.read_bytes())


def parse_tracked_status(repo: pathlib.Path):
    raw = git(repo, "status", "--porcelain=v1", "--untracked-files=all", "-z")["output"]
    tracked = []
    untracked = []
    for item in raw.split("\0"):
        if not item:
            continue
        code = item[:2]
        path = item[3:]
        if code == "??":
            untracked.append(path)
        else:
            # Rename/copy records are not expected in this repair and fail closed below.
            tracked.append({"code": code, "path": path})
    return tracked, untracked


def verify_root_state(repo: pathlib.Path, *, expect_harness_before: bool = True):
    if not (repo / ".git").exists():
        raise RuntimeError(f"not a git repository root: {repo}")
    head = git(repo, "rev-parse", "HEAD")["output"].strip()
    tree = git(repo, "rev-parse", "HEAD^{tree}")["output"].strip()
    if head != BASE_COMMIT or tree != BASE_TREE:
        raise RuntimeError(f"exact base mismatch: HEAD={head} tree={tree}; expected {BASE_COMMIT} / {BASE_TREE}")
    gl = git(repo, "ls-tree", "HEAD", "--", GITLINK_PATH)["output"].strip()
    parts = gl.split()
    if len(parts) < 4 or parts[0] != "160000" or parts[1] != "commit" or parts[2] != GITLINK_OID:
        raise RuntimeError(f"gitlink identity mismatch: {gl!r}")
    if git(repo, "diff", "--cached", "--quiet", check=False)["exit_code"] != 0:
        raise RuntimeError("staged tracked changes present; refusing repair")
    for rel, expected in PARENT_PRODUCT_BLOBS.items():
        if not (repo / rel).is_file():
            raise RuntimeError(f"parent candidate file missing: {rel}")
        actual = blob(repo, rel)
        if actual != expected:
            raise RuntimeError(f"parent candidate ancestry mismatch for {rel}: {actual} != {expected}")
    if expect_harness_before:
        actual = blob(repo, HARNESS)
        if actual != HARNESS_BEFORE:
            raise RuntimeError(f"Slice H harness preimage mismatch: {actual} != {HARNESS_BEFORE}")
    tracked, untracked = parse_tracked_status(repo)
    bad = [x for x in tracked if x["path"] not in ALLOWED_TRACKED]
    if bad:
        raise RuntimeError(f"unrelated tracked changes present; refusing repair: {bad}")
    return {"head": head, "tree": tree, "gitlink": gl, "tracked": tracked, "untracked_count": len(untracked)}


def repaired_harness_bytes(repo: pathlib.Path):
    src = (repo / HARNESS).read_bytes()
    if blob_bytes(src) != HARNESS_BEFORE:
        raise RuntimeError("harness bytes changed after preflight")
    count = src.count(OLD)
    if count != 1:
        raise RuntimeError(f"expected exactly one obsolete legacy-Gantt sentinel, found {count}")
    out = src.replace(OLD, NEW, 1)
    if OLD in out or out.count(NEW) < 1:
        raise RuntimeError("deterministic harness repair invariant failed")
    return out


def write_atomic(path: pathlib.Path, data: bytes):
    tmp = path.with_name(path.name + ".sysgrid-repair.tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)


def make_result(result_dir: pathlib.Path, out: pathlib.Path):
    deterministic_zip(result_dir, out)
    return {"path": str(out), "sha256": sha256(out), "bytes": out.stat().st_size}


def main():
    ap = argparse.ArgumentParser(description="Same-scope repair for SysGrid Project View Perfection failed Slice H harness precondition.")
    ap.add_argument("--repo", default=".")
    ap.add_argument("--output", default=None)
    ns = ap.parse_args()
    repo = pathlib.Path(ns.repo).resolve()
    out = pathlib.Path(ns.output).resolve() if ns.output else repo / "SysGrid-Project-View-Perfection-Repair-1-RESULT.zip"
    result_dir = pathlib.Path(tempfile.mkdtemp(prefix="sysgrid-project-view-repair-result-"))
    logs = result_dir / "logs"; logs.mkdir()
    receipt = {
        "schema": "SYSGRID_PROJECT_VIEW_REPAIR_LOCAL_RESULT_V1",
        "objective": "Approved Project View Perfection",
        "repair_iteration": 1,
        "parent_result_sha256": PARENT_RESULT_SHA256,
        "same_semantics_approval": "INHERITED_FROM_VERIFIED_FAILED_RESULT_CONTEXT",
        "failure_signature": "all five OUT-40 Slice H tests fail in openTimeline before test bodies: expected one [data-project-legacy-gantt-hidden=true], received zero",
        "cause_hypothesis": "obsolete harness-only legacy-Gantt sentinel; modern Gantt is visible and the complete visual-repair suite passed",
        "repair": {"path": HARNESS, "before_git_blob": HARNESS_BEFORE, "transformation": "replace obsolete hidden-legacy sentinel assertion with exact-one modern Gantt assertion"},
        "preserved_parent_product_blobs": PARENT_PRODUCT_BLOBS,
        "expected_base": {"commit": BASE_COMMIT, "tree": BASE_TREE, "gitlink": {"path": GITLINK_PATH, "mode": "160000", "oid": GITLINK_OID}},
        "proof_order": [name for name, _ in PROOF_COMMANDS],
        "started_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "status": "RUNNING",
        "stages": [],
        "local_application": "NOT_ATTEMPTED",
    }
    temp_root = pathlib.Path(tempfile.mkdtemp(prefix="sysgrid-project-view-repair-proof-"))
    proof_repo = temp_root / "repo"
    try:
        observed = verify_root_state(repo, expect_harness_before=True)
        receipt["observed_preflight"] = observed
        receipt["stages"].append({"name": "repair-ancestry-preflight", "status": "PASS"})

        repaired = repaired_harness_bytes(repo)
        repaired_blob = blob_bytes(repaired)
        receipt["repair"]["after_git_blob"] = repaired_blob

        # Isolated proof checkout. It consumes local Git objects only; no network or remote mutation.
        clone = run(["git", "clone", "--shared", "--no-checkout", str(repo), str(proof_repo)], temp_root, check=False)
        (logs / "isolated-clone.log").write_text(clone["output"], encoding="utf-8")
        if clone["exit_code"] != 0:
            raise RuntimeError("isolated local clone failed; see logs/isolated-clone.log")
        git(proof_repo, "checkout", "--detach", BASE_COMMIT)
        for rel, expected in PARENT_PRODUCT_BLOBS.items():
            src = repo / rel; dst = proof_repo / rel; dst.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(src, dst)
            if blob(proof_repo, rel) != expected:
                raise RuntimeError(f"isolated parent postimage mismatch: {rel}")
        write_atomic(proof_repo / HARNESS, repaired)
        if blob(proof_repo, HARNESS) != repaired_blob:
            raise RuntimeError("isolated repaired harness blob mismatch")
        node_modules = repo / "frontend" / "node_modules"
        if not node_modules.is_dir():
            raise RuntimeError("frontend/node_modules is missing; proof cannot run")
        proof_nm = proof_repo / "frontend" / "node_modules"
        if proof_nm.exists() or proof_nm.is_symlink():
            if proof_nm.is_dir() and not proof_nm.is_symlink(): shutil.rmtree(proof_nm)
            else: proof_nm.unlink()
        proof_nm.symlink_to(node_modules, target_is_directory=True)
        r = git(proof_repo, "diff", "--check", "--", *sorted(ALLOWED_TRACKED), check=False)
        (logs / "git-diff-check.log").write_text(r["output"], encoding="utf-8")
        if r["exit_code"] != 0:
            raise RuntimeError("isolated git diff --check failed")
        (result_dir / "candidate.patch").write_text(git(proof_repo, "diff", "--", *sorted(ALLOWED_TRACKED))["output"], encoding="utf-8")
        receipt["stages"].append({"name": "isolated-candidate-construction", "status": "PASS", "harness_after_git_blob": repaired_blob})

        env = os.environ.copy(); env.setdefault("CI", "1"); env.setdefault("npm_config_offline", "true"); env.setdefault("npm_config_yes", "false")
        frontend = proof_repo / "frontend"
        for name, command in PROOF_COMMANDS:
            info = run(command, frontend, log=logs / f"{name}.log", env=env, check=False)
            stage = {"name": name, "status": "PASS" if info["exit_code"] == 0 else "FAIL", "exit_code": info["exit_code"], "duration_ms": info["duration_ms"]}
            receipt["stages"].append(stage)
            if info["exit_code"] != 0:
                raise RuntimeError(f"proof stage failed: {name}; see logs/{name}.log")

        # Apply only the harness repair after isolated complete PASS, and only if ancestry is still exact.
        verify_root_state(repo, expect_harness_before=True)
        for rel, expected in PARENT_PRODUCT_BLOBS.items():
            if blob(repo, rel) != expected:
                raise RuntimeError(f"concurrent parent candidate change before apply: {rel}")
        write_atomic(repo / HARNESS, repaired)
        if blob(repo, HARNESS) != repaired_blob:
            raise RuntimeError("local harness application verification failed")
        r = git(repo, "diff", "--check", "--", *sorted(ALLOWED_TRACKED), check=False)
        if r["exit_code"] != 0:
            raise RuntimeError("local git diff --check failed after repair")
        receipt["local_application"] = "APPLIED_VERIFIED"
        receipt["final_tracked_blobs"] = {rel: blob(repo, rel) for rel in sorted(ALLOWED_TRACKED)}
        receipt["status"] = "PASS"
    except Exception as e:
        receipt["status"] = "FAIL"
        receipt["error"] = str(e)
    finally:
        receipt["completed_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
        try:
            receipt["final_repo_status"] = git(repo, "status", "--porcelain=v1", check=False)["output"].splitlines()
        except Exception as e:
            receipt["final_inspection_error"] = str(e)
        (result_dir / "RESULT.json").write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        meta = make_result(result_dir, out)
        shutil.rmtree(temp_root, ignore_errors=True)
        print(json.dumps({"status": receipt["status"], "result_zip": meta}, indent=2))
        print(f"RESULT_ZIP={out}")
        print(f"RESULT_SHA256={meta['sha256']}")
        if receipt["status"] != "PASS":
            sys.exit(1)


if __name__ == "__main__":
    main()
