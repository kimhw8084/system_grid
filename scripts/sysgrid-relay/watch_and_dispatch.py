#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

SHA_LINE_RE = re.compile(r"^([0-9a-f]{64})  ([^/]+\.zip)$")


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def run(command: list[str], *, check: bool = True, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, text=True, capture_output=True, env=env)
    if check and result.returncode:
        raise RuntimeError(
            f"command failed ({result.returncode}): {' '.join(command)}\n"
            f"stdout={result.stdout[-2000:]}\nstderr={result.stderr[-2000:]}"
        )
    return result


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(temp, path)


def find_run_id(gh: str, repo: str, title: str, env: dict[str, str]) -> int | None:
    result = run([
        gh, "run", "list", "--repo", repo,
        "--workflow", "sysgrid-public-outbox-relay.yml",
        "--event", "workflow_dispatch", "--limit", "20",
        "--json", "databaseId,displayTitle,createdAt,status,conclusion",
    ], env=env)
    rows = json.loads(result.stdout or "[]")
    for row in rows:
        if row.get("displayTitle") == title:
            return int(row["databaseId"])
    return None


def ledger_payload_sha(gh: str, repo: str, env: dict[str, str]) -> str | None:
    result = run([
        gh, "api", f"repos/{repo}/contents/relay/latest.json?ref=relay-ledger",
        "-H", "Accept: application/vnd.github.raw+json",
    ], check=False, env=env)
    if result.returncode:
        return None
    try:
        data = json.loads(result.stdout)
    except Exception:
        return None
    value = data.get("payload_sha256")
    return value if isinstance(value, str) else None


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: watch_and_dispatch.py CONFIG.json")
    config_path = Path(sys.argv[1]).expanduser().resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    root = Path(config["control_root"]).expanduser().resolve()
    history = root / "Outbox" / "History"
    state_path = Path(config["state_path"]).expanduser().resolve()
    gh = config["gh_path"]
    repo = config["repository"]
    workflow = config["workflow"]
    activated_after = float(config["activated_after_epoch"])
    max_attempts = int(config.get("max_attempts", 3))
    token_path = Path(config["token_path"]).expanduser().resolve()
    token = token_path.read_text(encoding="utf-8").strip()
    if not token:
        raise RuntimeError(f"empty GitHub token file: {token_path}")
    gh_env = dict(os.environ)
    gh_env["GH_TOKEN"] = token
    gh_env["GITHUB_TOKEN"] = token
    state = load_json(state_path, {"schema_version": "1.0.0", "entries": {}})
    entries = state.setdefault("entries", {})

    if not history.is_dir():
        return

    for checksum_path in sorted(history.glob("*.zip.sha256"), key=lambda p: p.stat().st_mtime):
        if checksum_path.stat().st_mtime < activated_after:
            continue
        line = checksum_path.read_text(encoding="utf-8").strip()
        match = SHA_LINE_RE.fullmatch(line)
        if not match:
            continue
        payload_sha, basename = match.groups()
        zip_path = history / basename
        if not zip_path.is_file() or zip_path.is_symlink():
            continue
        key = payload_sha
        entry = entries.setdefault(key, {
            "history_basename": basename,
            "payload_sha256": payload_sha,
            "payload_size": zip_path.stat().st_size,
            "attempts": 0,
            "state": "DISCOVERED",
            "discovered_at": now(),
        })

        if entry.get("state") == "PUBLISHED":
            continue

        if ledger_payload_sha(gh, repo, gh_env) == payload_sha:
            entry.update({"state": "PUBLISHED", "published_at": now()})
            atomic_json(state_path, state)
            continue

        run_id = entry.get("workflow_run_id")
        if run_id:
            status = run([gh, "run", "view", str(run_id), "--repo", repo,
                          "--json", "status,conclusion"], check=False, env=gh_env)
            if status.returncode == 0:
                details = json.loads(status.stdout)
                if details.get("status") != "completed":
                    entry["state"] = "RUNNING"
                    atomic_json(state_path, state)
                    continue
                if details.get("conclusion") == "success":
                    if ledger_payload_sha(gh, repo, gh_env) == payload_sha:
                        entry.update({"state": "PUBLISHED", "published_at": now()})
                    else:
                        entry.update({"state": "LEDGER_PENDING", "last_checked_at": now()})
                    atomic_json(state_path, state)
                    continue
                entry.update({
                    "state": "FAILED",
                    "last_failure_at": now(),
                    "last_conclusion": details.get("conclusion"),
                })

        if int(entry.get("attempts", 0)) >= max_attempts:
            entry["state"] = "EXHAUSTED"
            atomic_json(state_path, state)
            continue

        payload_size = zip_path.stat().st_size
        title = f"SysGrid relay {basename}"
        run([
            gh, "workflow", "run", workflow,
            "--repo", repo, "--ref", "main",
            "-f", f"history_basename={basename}",
            "-f", f"payload_sha256={payload_sha}",
            "-f", f"payload_size={payload_size}",
        ], env=gh_env)
        entry.update({
            "state": "DISPATCHED",
            "attempts": int(entry.get("attempts", 0)) + 1,
            "last_dispatch_at": now(),
            "payload_size": payload_size,
        })
        atomic_json(state_path, state)

        for _ in range(12):
            time.sleep(5)
            found = find_run_id(gh, repo, title, gh_env)
            if found:
                entry["workflow_run_id"] = found
                entry["state"] = "RUNNING"
                atomic_json(state_path, state)
                break


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"SYSGRID_RELAY_WATCHER_ERROR: {exc}", file=sys.stderr)
        raise
