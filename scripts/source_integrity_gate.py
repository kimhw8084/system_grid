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
PRINCIPAL_REPO_ENV = "SYSGRID_PRINCIPAL_REPO"
DEFAULT_PRINCIPAL_REPO_NAME = "sysgrid"


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


def _normalize_remote(value: str) -> str:
    raw = (value or "").strip()
    if raw.startswith("git@github.com:"):
        raw = "https://github.com/" + raw.split(":", 1)[1]
    if "://" not in raw and not raw.startswith("git@"):
        try:
            return "file://" + str(pathlib.Path(raw).expanduser().resolve()).removesuffix(".git")
        except Exception:
            pass
    return raw.rstrip("/").removesuffix(".git")


def _origin_remote(repo: pathlib.Path) -> str:
    return _run_git(repo, ["remote", "get-url", "origin"]).stdout.strip()


def resolve_principal_checkout(
    execution_repo: pathlib.Path,
    *,
    explicit_principal: pathlib.Path | None = None,
    home: pathlib.Path | None = None,
    expected_remote: str | None = None,
) -> tuple[pathlib.Path, str, str, str]:
    execution_repo = execution_repo.expanduser().resolve()
    if explicit_principal is not None:
        principal = explicit_principal.expanduser().resolve()
        resolution_source = "explicit_argument"
    else:
        env_value = __import__("os").environ.get(PRINCIPAL_REPO_ENV, "").strip()
        if env_value:
            principal = pathlib.Path(env_value).expanduser().resolve()
            resolution_source = "environment"
        else:
            principal = (home or pathlib.Path.home()).expanduser().resolve() / DEFAULT_PRINCIPAL_REPO_NAME
            resolution_source = "home_default"

    if principal == execution_repo:
        raise SourceIntegrityError(
            "PRIMARY_CHECKOUT_IS_EXECUTION_REPO",
            f"Principal checkout resolved to the execution checkout {execution_repo}; refusing an ambiguous sync target.",
        )
    if not (principal / ".git").exists():
        raise SourceIntegrityError(
            "PRIMARY_CHECKOUT_NOT_FOUND",
            f"Principal SysGrid checkout is not available at {principal}.",
        )

    execution_remote = _normalize_remote(expected_remote or _origin_remote(execution_repo))
    principal_remote = _normalize_remote(_origin_remote(principal))
    if principal_remote != execution_remote:
        raise SourceIntegrityError(
            "PRIMARY_CHECKOUT_REMOTE_MISMATCH",
            f"Principal checkout origin {principal_remote!r} does not match execution repository origin {execution_remote!r}.",
        )
    return principal, resolution_source, execution_remote, principal_remote


def converge_principal_checkout(
    execution_repo: pathlib.Path,
    *,
    explicit_principal: pathlib.Path | None = None,
    home: pathlib.Path | None = None,
    expected_remote: str | None = None,
) -> dict[str, object]:
    execution_repo = execution_repo.expanduser().resolve()
    try:
        principal, resolution_source, execution_remote, principal_remote = resolve_principal_checkout(
            execution_repo,
            explicit_principal=explicit_principal,
            home=home,
            expected_remote=expected_remote,
        )
    except SourceIntegrityError as exc:
        return {
            "schema": "SYSGRID_PRINCIPAL_CHECKOUT_CONVERGENCE_V1",
            "status": "PRIMARY_CHECKOUT_SYNC_PENDING",
            "reason": exc.status,
            "message": str(exc),
            "execution_repository": str(execution_repo),
        }

    previous_head = _head(principal)
    before = inspect_source_integrity(principal, fetch=False)
    try:
        result = enforce_current_main(principal, fetch=True, auto_fast_forward=True)
    except SourceIntegrityError as exc:
        return {
            "schema": "SYSGRID_PRINCIPAL_CHECKOUT_CONVERGENCE_V1",
            "status": "PRIMARY_CHECKOUT_SYNC_PENDING",
            "reason": exc.status,
            "message": str(exc),
            "execution_repository": str(execution_repo),
            "principal_repository": str(principal),
            "resolution_source": resolution_source,
            "expected_remote": execution_remote,
            "principal_remote": principal_remote,
            "previous_head": previous_head,
            "branch": before.branch,
            "tracked_dirty": list(before.tracked_dirty),
            "generated_runtime_dirty": list(before.generated_runtime_dirty),
        }

    startup_gate = principal / "scripts" / "source_integrity_gate.py"
    startup_gate_present = startup_gate.is_file()
    status = "PASS" if result.launch_allowed and startup_gate_present else "PRIMARY_CHECKOUT_SYNC_PENDING"
    reason = None if status == "PASS" else "STARTUP_GATE_NOT_PRESENT_AFTER_SYNC"
    return {
        "schema": "SYSGRID_PRINCIPAL_CHECKOUT_CONVERGENCE_V1",
        "status": status,
        "reason": reason,
        "execution_repository": str(execution_repo),
        "principal_repository": str(principal),
        "resolution_source": resolution_source,
        "expected_remote": execution_remote,
        "principal_remote": principal_remote,
        "previous_head": previous_head,
        "resulting_head": result.head,
        "origin_main": result.origin_main,
        "branch": result.branch,
        "tracked_dirty": list(result.tracked_dirty),
        "generated_runtime_dirty": list(result.generated_runtime_dirty),
        "generated_runtime_backups": list(result.generated_runtime_backups),
        "fast_forwarded": result.fast_forwarded,
        "source_status": result.status,
        "startup_gate_present": startup_gate_present,
    }


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

    with tempfile.TemporaryDirectory(prefix="sysgrid-principal-gate-") as td:
        workspace = pathlib.Path(td)
        remote = workspace / "remote.git"
        seed = workspace / "seed"
        runner = workspace / "runner"
        home = workspace / "home"
        principal = home / "sysgrid"
        peer = workspace / "peer"

        subprocess.run(["git", "init", "--bare", str(remote)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        subprocess.run(["git", "clone", str(remote), str(seed)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _git(seed, "config", "user.email", "sysgrid@test.invalid")
        _git(seed, "config", "user.name", "SysGrid Test")
        (seed / "scripts").mkdir()
        (seed / "scripts" / "source_integrity_gate.py").write_text("gate-v1\n")
        (seed / "tracked.txt").write_text("one\n")
        _git(seed, "add", ".")
        _git(seed, "commit", "-m", "seed")
        _git(seed, "branch", "-M", "main")
        _git(seed, "push", "-u", "origin", "main")
        _git(remote, "symbolic-ref", "HEAD", "refs/heads/main")

        home.mkdir()
        subprocess.run(["git", "clone", str(remote), str(runner)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        subprocess.run(["git", "clone", str(remote), str(principal)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        subprocess.run(["git", "clone", str(remote), str(peer)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _git(peer, "config", "user.email", "sysgrid@test.invalid")
        _git(peer, "config", "user.name", "SysGrid Test")
        (peer / "tracked.txt").write_text("two\n")
        _git(peer, "add", "tracked.txt")
        _git(peer, "commit", "-m", "remote advance")
        _git(peer, "push", "origin", "main")

        runner_before = _head(runner)
        principal_before = _head(principal)
        receipt = converge_principal_checkout(runner, home=home)
        assert receipt["status"] == "PASS"
        assert receipt["principal_repository"] == str(principal.resolve())
        assert receipt["execution_repository"] == str(runner.resolve())
        assert receipt["previous_head"] == principal_before
        assert receipt["fast_forwarded"] is True
        assert receipt["startup_gate_present"] is True
        assert _head(runner) == runner_before
        assert _head(principal) == _origin_main(principal)
        checks.append("principal_default_targets_home_sysgrid_not_runner")
        checks.append("principal_safe_fast_forward_receipted")

        missing = converge_principal_checkout(runner, home=workspace / "missing-home")
        assert missing["status"] == "PRIMARY_CHECKOUT_SYNC_PENDING"
        assert missing["reason"] == "PRIMARY_CHECKOUT_NOT_FOUND"
        checks.append("principal_missing_reports_pending")

        (principal / "tracked.txt").write_text("dirty\n")
        dirty_receipt = converge_principal_checkout(runner, home=home)
        assert dirty_receipt["status"] == "PRIMARY_CHECKOUT_SYNC_PENDING"
        assert dirty_receipt["reason"] == "DIRTY"
        _git(principal, "restore", "tracked.txt")
        checks.append("principal_dirty_fails_closed")

        same = converge_principal_checkout(runner, explicit_principal=runner)
        assert same["status"] == "PRIMARY_CHECKOUT_SYNC_PENDING"
        assert same["reason"] == "PRIMARY_CHECKOUT_IS_EXECUTION_REPO"
        checks.append("runner_checkout_cannot_masquerade_as_principal")

    return {
        "schema": "SYSGRID_SOURCE_GATE_SELF_TEST_V1",
        "status": "PASS",
        "checks": checks,
        "check_count": len(checks),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=str(pathlib.Path(__file__).resolve().parents[1]))
    parser.add_argument("--sync-principal-from-execution-repo")
    parser.add_argument("--principal-repo")
    parser.add_argument("--expected-remote")
    parser.add_argument("--principal-home")
    parser.add_argument("--no-fetch", action="store_true")
    parser.add_argument("--no-fast-forward", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        print(json.dumps(self_test(), sort_keys=True))
        return 0

    if args.sync_principal_from_execution_repo:
        receipt = converge_principal_checkout(
            pathlib.Path(args.sync_principal_from_execution_repo),
            explicit_principal=pathlib.Path(args.principal_repo) if args.principal_repo else None,
            home=pathlib.Path(args.principal_home) if args.principal_home else None,
            expected_remote=args.expected_remote,
        )
        print(json.dumps(receipt, sort_keys=True))
        return 0 if receipt.get("status") == "PASS" else 3

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
