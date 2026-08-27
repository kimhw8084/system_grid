#!/usr/bin/env python3
"""Fail-closed source identity gate for SysGrid local Mac/UAT startup."""

from __future__ import annotations

import argparse
import dataclasses
import json
import pathlib
import shutil
import subprocess
import tempfile
import datetime as dt
from typing import Sequence


GENERATED_RUNTIME_TRACKED_PATHS = ("backend/.env.local.runtime",)


class SourceIntegrityError(RuntimeError):
    def __init__(self, status: str, message: str):
        super().__init__(message)
        self.status = status


@dataclasses.dataclass(frozen=True)
class SourceIntegrityResult:
    repository: str
    branch: str
    head: str
    origin_main: str
    status: str
    ahead: int
    behind: int
    tracked_dirty: tuple[str, ...] = ()
    generated_runtime_dirty: tuple[str, ...] = ()
    generated_runtime_backups: tuple[str, ...] = ()
    fast_forwarded: bool = False
    previous_head: str | None = None

    @property
    def launch_allowed(self) -> bool:
        return self.status in {"CURRENT", "CURRENT_AFTER_SAFE_FAST_FORWARD"}

    def as_dict(self) -> dict[str, object]:
        return dataclasses.asdict(self)


def _run_git(
    repo: pathlib.Path,
    args: Sequence[str],
    *,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and completed.returncode != 0:
        detail = (completed.stderr or completed.stdout).strip()
        raise SourceIntegrityError(
            "GIT_ERROR",
            f"git {' '.join(args)} failed: {detail or f'rc={completed.returncode}'}",
        )
    return completed


def _tracked_dirty(repo: pathlib.Path) -> tuple[str, ...]:
    output = _run_git(repo, ["status", "--porcelain=v1", "--untracked-files=no"]).stdout
    return tuple(line for line in output.splitlines() if line.strip())


def _dirty_path(line: str) -> str:
    payload = line[3:] if len(line) >= 4 else line
    if " -> " in payload:
        payload = payload.split(" -> ", 1)[1]
    return payload.strip().strip('"')


def _partition_tracked_dirty(lines: tuple[str, ...]) -> tuple[tuple[str, ...], tuple[str, ...]]:
    generated: list[str] = []
    product: list[str] = []
    generated_paths = set(GENERATED_RUNTIME_TRACKED_PATHS)
    for line in lines:
        (generated if _dirty_path(line) in generated_paths else product).append(line)
    return tuple(product), tuple(generated)


def _backup_and_restore_generated_runtime(
    repo: pathlib.Path,
    dirty_lines: tuple[str, ...],
    *,
    backup_root: pathlib.Path | None = None,
) -> tuple[str, ...]:
    if not dirty_lines:
        return ()
    backup_root = backup_root or (pathlib.Path.home() / "Library" / "Caches" / "SysGrid" / "source-gate-backups")
    backup_root.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    backups: list[str] = []
    for line in dirty_lines:
        rel = _dirty_path(line)
        if rel not in GENERATED_RUNTIME_TRACKED_PATHS:
            continue
        src = repo / rel
        if src.is_file():
            dest = backup_root / f"{pathlib.Path(rel).name}.{stamp}.bak"
            shutil.copy2(src, dest)
            backups.append(str(dest))
        _run_git(repo, ["restore", "--staged", "--worktree", "--", rel])
    return tuple(backups)


def _branch(repo: pathlib.Path) -> str:
    completed = _run_git(repo, ["symbolic-ref", "--quiet", "--short", "HEAD"], check=False)
    return completed.stdout.strip() if completed.returncode == 0 else ""


def _head(repo: pathlib.Path) -> str:
    return _run_git(repo, ["rev-parse", "HEAD"]).stdout.strip()


def _origin_main(repo: pathlib.Path) -> str:
    return _run_git(repo, ["rev-parse", "origin/main"]).stdout.strip()


def _ahead_behind(repo: pathlib.Path) -> tuple[int, int]:
    output = _run_git(repo, ["rev-list", "--left-right", "--count", "HEAD...origin/main"]).stdout.strip()
    left, right = output.split()
    return int(left), int(right)


def inspect_source_integrity(
    repo: pathlib.Path,
    *,
    fetch: bool = True,
) -> SourceIntegrityResult:
    repo = repo.resolve()
    if not (repo / ".git").exists():
        raise SourceIntegrityError("NOT_A_GIT_CHECKOUT", f"SysGrid repository metadata is missing at {repo}")

    if fetch:
        _run_git(repo, ["fetch", "origin", "main"])

    branch = _branch(repo)
    head = _head(repo)
    origin_main = _origin_main(repo)
    dirty_all = _tracked_dirty(repo)
    dirty, generated_dirty = _partition_tracked_dirty(dirty_all)

    if not branch:
        return SourceIntegrityResult(
            repository=str(repo),
            branch="DETACHED",
            head=head,
            origin_main=origin_main,
            status="DETACHED",
            ahead=0,
            behind=0,
            tracked_dirty=dirty,
            generated_runtime_dirty=generated_dirty,
        )

    ahead, behind = _ahead_behind(repo)

    if branch != "main":
        return SourceIntegrityResult(
            repository=str(repo),
            branch=branch,
            head=head,
            origin_main=origin_main,
            status="LOCAL_BRANCH",
            ahead=ahead,
            behind=behind,
            tracked_dirty=dirty,
            generated_runtime_dirty=generated_dirty,
        )

    if dirty:
        return SourceIntegrityResult(
            repository=str(repo),
            branch=branch,
            head=head,
            origin_main=origin_main,
            status="DIRTY",
            ahead=ahead,
            behind=behind,
            tracked_dirty=dirty,
            generated_runtime_dirty=generated_dirty,
        )

    if ahead == 0 and behind == 0:
        status = "CURRENT"
    elif ahead == 0 and behind > 0:
        status = "BEHIND_SAFE_FAST_FORWARD"
    elif ahead > 0 and behind == 0:
        status = "LOCAL_COMMITS"
    else:
        status = "DIVERGED"

    return SourceIntegrityResult(
        repository=str(repo),
        branch=branch,
        head=head,
        origin_main=origin_main,
        status=status,
        ahead=ahead,
        behind=behind,
        tracked_dirty=dirty,
        generated_runtime_dirty=generated_dirty,
    )


def enforce_current_main(
    repo: pathlib.Path,
    *,
    fetch: bool = True,
    auto_fast_forward: bool = True,
    backup_root: pathlib.Path | None = None,
) -> SourceIntegrityResult:
    result = inspect_source_integrity(repo, fetch=fetch)
    generated_backups: tuple[str, ...] = ()
    if result.generated_runtime_dirty:
        generated_backups = _backup_and_restore_generated_runtime(
            repo.resolve(),
            result.generated_runtime_dirty,
            backup_root=backup_root,
        )
        result = inspect_source_integrity(repo, fetch=False)

    if result.status == "CURRENT":
        return dataclasses.replace(result, generated_runtime_backups=generated_backups)

    if result.status == "BEHIND_SAFE_FAST_FORWARD" and auto_fast_forward:
        previous_head = result.head
        _run_git(repo, ["merge", "--ff-only", "origin/main"])
        verified = inspect_source_integrity(repo, fetch=False)
        if verified.status != "CURRENT":
            raise SourceIntegrityError(
                "FAST_FORWARD_VERIFY_FAILED",
                f"safe fast-forward completed but source is not current: {verified.status}",
            )
        return dataclasses.replace(
            verified,
            status="CURRENT_AFTER_SAFE_FAST_FORWARD",
            fast_forwarded=True,
            previous_head=previous_head,
            generated_runtime_backups=generated_backups,
        )

    messages = {
        "BEHIND_SAFE_FAST_FORWARD": "Local main is behind origin/main. Safe fast-forward is required before launch.",
        "DIRTY": "Tracked local modifications are present. SysGrid refuses to update or launch so local work is not overwritten.",
        "LOCAL_COMMITS": "Local main contains commits not on origin/main. SysGrid refuses to launch an ambiguous source.",
        "DIVERGED": "Local main and origin/main have diverged. Resolve the Git history explicitly before launch.",
        "DETACHED": "HEAD is detached. Switch to main before launching SysGrid.",
        "LOCAL_BRANCH": f"Current branch is {result.branch!r}, not main. Switch to main before launching the standard local runtime.",
    }
    detail = messages.get(result.status, f"Source integrity status {result.status} is not launchable.")
    if result.tracked_dirty:
        detail += " Tracked changes: " + "; ".join(result.tracked_dirty[:12])
    raise SourceIntegrityError(result.status, detail)


def render_source_banner(result: SourceIntegrityResult) -> str:
    lines = [
        "",
        "SYSGRID SOURCE INTEGRITY",
        "------------------------",
        f"Repository:       {result.repository}",
        f"Branch:           {result.branch}",
        f"HEAD:             {result.head}",
        f"origin/main:      {result.origin_main}",
        f"Source status:    {result.status}",
        f"Ahead / behind:   {result.ahead} / {result.behind}",
        f"Tracked dirty:    {len(result.tracked_dirty)}",
        f"Generated drift:  {len(result.generated_runtime_dirty)}",
    ]
    if result.generated_runtime_backups:
        lines.append(f"Generated backup: {result.generated_runtime_backups[-1]}")
    if result.fast_forwarded and result.previous_head:
        lines.append(f"Safe fast-forward:{result.previous_head} -> {result.head}")
    return "\n".join(lines)


def _git(repo: pathlib.Path, *args: str) -> str:
    return _run_git(repo, list(args)).stdout.strip()


def self_test() -> dict[str, object]:
    checks: list[str] = []
    with tempfile.TemporaryDirectory(prefix="sysgrid-source-gate-") as td:
        workspace = pathlib.Path(td)
        remote = workspace / "remote.git"
        seed = workspace / "seed"
        local = workspace / "local"
        peer = workspace / "peer"

        subprocess.run(["git", "init", "--bare", str(remote)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        subprocess.run(["git", "clone", str(remote), str(seed)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _git(seed, "config", "user.email", "sysgrid@test.invalid")
        _git(seed, "config", "user.name", "SysGrid Test")
        (seed / "tracked.txt").write_text("one\n")
        (seed / "backend").mkdir()
        (seed / "backend" / ".env.local.runtime").write_text("generated=base\n")
        _git(seed, "add", "tracked.txt", "backend/.env.local.runtime")
        _git(seed, "commit", "-m", "seed")
        _git(seed, "branch", "-M", "main")
        _git(seed, "push", "-u", "origin", "main")
        _git(remote, "symbolic-ref", "HEAD", "refs/heads/main")

        subprocess.run(["git", "clone", str(remote), str(local)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _git(local, "config", "user.email", "sysgrid@test.invalid")
        _git(local, "config", "user.name", "SysGrid Test")
        assert inspect_source_integrity(local).status == "CURRENT"
        checks.append("current")

        (local / "untracked-evidence").mkdir()
        (local / "untracked-evidence" / "snapshot.txt").write_text("keep me\n")
        assert inspect_source_integrity(local).status == "CURRENT"
        checks.append("untracked_ignored")

        (local / "backend" / ".env.local.runtime").write_text("generated=runtime\n")
        inspected_generated = inspect_source_integrity(local)
        assert inspected_generated.status == "CURRENT"
        assert len(inspected_generated.generated_runtime_dirty) == 1
        generated_backup_root = workspace / "generated-backups"
        generated_clean = enforce_current_main(local, backup_root=generated_backup_root)
        assert generated_clean.status == "CURRENT"
        assert not _tracked_dirty(local)
        assert generated_clean.generated_runtime_backups
        assert pathlib.Path(generated_clean.generated_runtime_backups[0]).read_text() == "generated=runtime\n"
        checks.append("generated_runtime_drift_backed_up_and_cleaned")

        subprocess.run(["git", "clone", str(remote), str(peer)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _git(peer, "config", "user.email", "sysgrid@test.invalid")
        _git(peer, "config", "user.name", "SysGrid Test")
        (peer / "tracked.txt").write_text("two\n")
        _git(peer, "add", "tracked.txt")
        _git(peer, "commit", "-m", "remote advance")
        _git(peer, "push", "origin", "main")
        before = _head(local)
        advanced = enforce_current_main(local)
        assert advanced.status == "CURRENT_AFTER_SAFE_FAST_FORWARD"
        assert advanced.fast_forwarded and advanced.previous_head == before
        assert _head(local) == _origin_main(local)
        assert (local / "untracked-evidence" / "snapshot.txt").exists()
        checks.append("behind_safe_fast_forward")

        (local / "tracked.txt").write_text("dirty\n")
        dirty = inspect_source_integrity(local)
        assert dirty.status == "DIRTY"
        try:
            enforce_current_main(local)
        except SourceIntegrityError as exc:
            assert exc.status == "DIRTY"
        else:
            raise AssertionError("dirty checkout was allowed")
        _git(local, "restore", "tracked.txt")
        checks.append("dirty_fails_closed")

        (local / "local.txt").write_text("local\n")
        _git(local, "add", "local.txt")
        _git(local, "commit", "-m", "local only")
        assert inspect_source_integrity(local).status == "LOCAL_COMMITS"
        checks.append("local_commits_fail_closed")

        (peer / "peer.txt").write_text("peer\n")
        _git(peer, "add", "peer.txt")
        _git(peer, "commit", "-m", "peer only")
        _git(peer, "push", "origin", "main")
        assert inspect_source_integrity(local).status == "DIVERGED"
        checks.append("diverged_fails_closed")

        _git(local, "checkout", "--detach")
        assert inspect_source_integrity(local).status == "DETACHED"
        checks.append("detached_fails_closed")

    return {
        "schema": "SYSGRID_SOURCE_GATE_SELF_TEST_V1",
        "status": "PASS",
        "checks": checks,
        "check_count": len(checks),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=str(pathlib.Path(__file__).resolve().parents[1]))
    parser.add_argument("--no-fetch", action="store_true")
    parser.add_argument("--no-fast-forward", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        print(json.dumps(self_test(), sort_keys=True))
        return 0

    try:
        result = enforce_current_main(
            pathlib.Path(args.repo),
            fetch=not args.no_fetch,
            auto_fast_forward=not args.no_fast_forward,
        )
    except SourceIntegrityError as exc:
        print(f"SYSGRID_SOURCE_INTEGRITY_FAIL status={exc.status}: {exc}")
        return 2

    if args.json:
        print(json.dumps(result.as_dict(), sort_keys=True))
    else:
        print(render_source_banner(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
