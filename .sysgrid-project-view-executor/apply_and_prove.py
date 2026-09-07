#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, os, pathlib, shutil, subprocess, sys, tempfile, time, zipfile

BASE_COMMIT = "d40c0929ff7a9ec37d9c57bdb7ef0cf2d020c7ee"
BASE_TREE = "0aa53cc6ed9121b178c72c31e2a6b1c04e985f5f"
GITLINK_PATH = "SysGrid"
GITLINK_OID = "445c225a3dec7c359f8ff0b09934716ee2d91b6e"
TARGETS = {
    "frontend/src/components/ProjectsModernGantt.tsx": {
        "before": "4b3cb12e6becbb92f23cef176e193f8c653e1caa",
        "after": "15160b7d4b18b9f877aaa49be175628a14a9ab95",
    },
    "frontend/src/components/ProjectsVisualRepair.css": {
        "before": "562dbd6e3fdeef6fe02c37a56e648abe2d057ddd",
        "after": "17287e273c32a1fd8c020d48e0e7ccce44c477bb",
    },
    "frontend/tests/projects-visual-repair.spec.ts": {
        "before": "379af6e82c3f2eeb9849467cced4c77249b8f6e3",
        "after": "9e104744565bb6ef6b11b1b4243ac45a14cbe15c",
    },
}
PROOF_COMMANDS = [
    ("projects-visual-repair", ["node", "scripts/run-projects-visual-repair.mjs"]),
    ("out40-slice-h-regression", ["node", "scripts/run-projects-out40-slice-h-browser.mjs", "--mode", "regression"]),
]

HERE = pathlib.Path(__file__).resolve().parent
PAYLOAD = HERE / "payload"

def run(args, cwd, *, log=None, env=None, check=True):
    started = time.time()
    p = subprocess.run(args, cwd=str(cwd), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)
    elapsed = round((time.time() - started) * 1000)
    if log:
        pathlib.Path(log).write_text(p.stdout or "", encoding="utf-8")
    if check and p.returncode:
        raise RuntimeError(f"command failed ({p.returncode}): {' '.join(args)}\n{p.stdout[-4000:]}")
    return {"args": args, "exit_code": p.returncode, "duration_ms": elapsed, "output": p.stdout}

def git(repo, *args, check=True):
    return run(["git", *args], repo, check=check)

def blob(repo, rel):
    return git(repo, "hash-object", "--", rel)["output"].strip()

def sha256(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for chunk in iter(lambda:f.read(1024*1024), b""): h.update(chunk)
    return h.hexdigest()

def deterministic_zip(src: pathlib.Path, out: pathlib.Path):
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(x for x in src.rglob("*") if x.is_file()):
            rel=p.relative_to(src).as_posix(); info=zipfile.ZipInfo(rel, (2026,9,6,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=(0o644 & 0xFFFF)<<16
            z.writestr(info,p.read_bytes())

def make_result(result_dir: pathlib.Path, out: pathlib.Path):
    deterministic_zip(result_dir, out)
    return {"path": str(out), "sha256": sha256(out), "bytes": out.stat().st_size}

def main():
    ap=argparse.ArgumentParser(description="Apply and prove the approved SysGrid Project View Perfection slice.")
    ap.add_argument("--repo", default=".", help="system_grid repository root (default: current directory)")
    ap.add_argument("--output", default=None, help="RESULT zip path (default: repo root/SysGrid-Project-View-Perfection-RESULT.zip)")
    ns=ap.parse_args()
    repo=pathlib.Path(ns.repo).resolve()
    out=pathlib.Path(ns.output).resolve() if ns.output else repo/"SysGrid-Project-View-Perfection-RESULT.zip"
    result_dir=pathlib.Path(tempfile.mkdtemp(prefix="sysgrid-project-view-result-"))
    logs=result_dir/"logs"; logs.mkdir()
    receipt={
        "schema":"SYSGRID_PROJECT_VIEW_LOCAL_RESULT_V1",
        "scope":"Approved Project View Perfection: semantic virtual WBS/treegrid, keyboard whole-task movement and resize parity, 40px manipulation hit targets, bounded browser acceptance.",
        "non_goals":["no backend/API/schema changes","no alternate ProjectTask store","no new scheduling/scenario/capacity model","no app-wide accessibility rewrite","no redesign of already-golden Project views","no weakening of existing drag/cancellation/dependency/responsive/DOM-budget guards"],
        "expected_base":{"commit":BASE_COMMIT,"tree":BASE_TREE,"gitlink":{"path":GITLINK_PATH,"mode":"160000","oid":GITLINK_OID}},
        "targets":TARGETS,
        "started_at":dt.datetime.now(dt.timezone.utc).isoformat(),
        "status":"RUNNING",
        "stages":[],
    }
    modified=False
    try:
        if not (repo/".git").exists(): raise RuntimeError(f"not a git repository root: {repo}")
        head=git(repo,"rev-parse","HEAD")["output"].strip(); tree=git(repo,"rev-parse","HEAD^{tree}")["output"].strip()
        receipt["observed_base"]={"commit":head,"tree":tree}
        if head != BASE_COMMIT or tree != BASE_TREE: raise RuntimeError(f"exact base mismatch: HEAD={head} tree={tree}; expected {BASE_COMMIT} / {BASE_TREE}")
        gl=git(repo,"ls-tree","HEAD","--",GITLINK_PATH)["output"].strip(); receipt["observed_gitlink"]=gl
        parts=gl.split()
        if len(parts)<4 or parts[0]!="160000" or parts[1]!="commit" or parts[2]!=GITLINK_OID: raise RuntimeError(f"gitlink identity mismatch: {gl!r}")
        for rel, hashes in TARGETS.items():
            if not (repo/rel).is_file(): raise RuntimeError(f"target missing: {rel}")
            actual=blob(repo,rel)
            if actual != hashes["before"]: raise RuntimeError(f"preimage mismatch for {rel}: {actual} != {hashes['before']}")
        for diff_args in (["diff","--quiet","--",*TARGETS],["diff","--cached","--quiet","--",*TARGETS]):
            r=git(repo,*diff_args,check=False)
            if r["exit_code"] != 0: raise RuntimeError("target files have local or staged changes; refusing to overwrite")
        receipt["stages"].append({"name":"exact-source-preflight","status":"PASS"})

        for rel, hashes in TARGETS.items():
            src=PAYLOAD/rel; dst=repo/rel
            if sha256(src) != sha256(src): raise RuntimeError("impossible payload self-check failure")
            shutil.copyfile(src,dst)
            actual=blob(repo,rel)
            if actual != hashes["after"]: raise RuntimeError(f"postimage mismatch for {rel}: {actual} != {hashes['after']}")
        modified=True
        receipt["stages"].append({"name":"apply-exact-postimages","status":"PASS"})

        r=git(repo,"diff","--check","--",*TARGETS,check=False)
        (logs/"git-diff-check.log").write_text(r["output"],encoding="utf-8")
        if r["exit_code"] != 0: raise RuntimeError("git diff --check failed")
        diff=git(repo,"diff","--",*TARGETS)["output"]
        (result_dir/"applied.patch").write_text(diff,encoding="utf-8")
        receipt["stages"].append({"name":"git-diff-check","status":"PASS"})

        frontend=repo/"frontend"
        if not (frontend/"node_modules").is_dir(): raise RuntimeError("frontend/node_modules is missing; exact product bytes were applied, but browser proof cannot run without the repository's installed dependencies")
        env=os.environ.copy(); env.setdefault("CI","1"); env.setdefault("npm_config_offline","true"); env.setdefault("npm_config_yes","false")
        for name, command in PROOF_COMMANDS:
            info=run(command,frontend,log=logs/f"{name}.log",env=env,check=False)
            receipt["stages"].append({"name":name,"status":"PASS" if info["exit_code"]==0 else "FAIL","exit_code":info["exit_code"],"duration_ms":info["duration_ms"]})
            if info["exit_code"] != 0: raise RuntimeError(f"proof stage failed: {name}; see logs/{name}.log")

        receipt["status"]="PASS"
    except Exception as e:
        receipt["status"]="FAIL"; receipt["error"]=str(e)
    finally:
        receipt["modified_target_files"]=modified
        receipt["completed_at"]=dt.datetime.now(dt.timezone.utc).isoformat()
        try:
            receipt["final_target_blobs"]={rel:blob(repo,rel) for rel in TARGETS if (repo/rel).exists()}
            receipt["git_status_porcelain"]=git(repo,"status","--porcelain=v1",check=False)["output"].splitlines()
        except Exception as e:
            receipt["final_inspection_error"]=str(e)
        (result_dir/"RESULT.json").write_text(json.dumps(receipt,indent=2,sort_keys=True)+"\n",encoding="utf-8")
        meta=make_result(result_dir,out)
        print(json.dumps({"status":receipt["status"],"result_zip":meta},indent=2))
        print(f"RESULT_ZIP={out}")
        print(f"RESULT_SHA256={meta['sha256']}")
        if receipt["status"] != "PASS": sys.exit(1)

if __name__ == "__main__": main()
