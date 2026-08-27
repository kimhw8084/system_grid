#!/usr/bin/env python3
"""Fail-closed source identity gate for SysGrid local Mac/UAT startup."""

from __future__ import annotations

import argparse
import dataclasses
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import datetime as dt
from typing import Sequence


GENERATED_RUNTIME_TRACKED_PATHS = ("backend/.env.local.runtime",)
PRINCIPAL_REPO_ENV = "SYSGRID_PRINCIPAL_REPO"
PRINCIPAL_LOCATOR_ENV = "SYSGRID_PRINCIPAL_LOCATOR"
PRINCIPAL_STANDARD_RELATIVE_PATHS = (
    "sysgrid",
    "system_grid",
    "system-grid",
    "development/sysgrid",
    "home/development/sysgrid",
    "Projects/system_grid",
    "Developer/system_grid",
    "src/system_grid",
    "code/system_grid",
)


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


def _normalize_remote(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if raw.startswith("git@github.com:"):
        raw = "https://github.com/" + raw.split(":", 1)[1]
    elif raw.startswith("ssh://git@github.com/"):
        raw = "https://github.com/" + raw.split("ssh://git@github.com/", 1)[1]
    elif "://" not in raw and raw.count("/") == 1 and not raw.startswith(("/", ".", "~")):
        raw = "https://github.com/" + raw
    elif "://" not in raw and not raw.startswith("git@"):
        try:
            raw = "file://" + str(pathlib.Path(raw).expanduser().resolve())
        except Exception:
            pass
    return raw.rstrip("/").removesuffix(".git")


def _origin(repo: pathlib.Path) -> str:
    return _run_git(repo, ["remote", "get-url", "origin"]).stdout.strip()


def _default_locator(home: pathlib.Path | None = None) -> pathlib.Path:
    root = (home or pathlib.Path.home()).expanduser().resolve()
    env_value = os.environ.get(PRINCIPAL_LOCATOR_ENV, "").strip()
    if env_value:
        return pathlib.Path(env_value).expanduser()
    return root / "Library" / "Application Support" / "SysGrid" / "principal-checkout.json"


def _is_runner_checkout(path: pathlib.Path) -> bool:
    resolved = path.expanduser().resolve()
    parts = tuple(part.lower() for part in resolved.parts)
    runner_markers = {"_work", "_actions", "actions-runner", "sysgrid-actions-runner"}
    if any(part in runner_markers or "actions-runner" in part for part in parts):
        return True
    github_actions = os.environ.get("GITHUB_ACTIONS", "").strip().lower()
    github_workspace = os.environ.get("GITHUB_WORKSPACE", "").strip()
    if github_actions == "true" and github_workspace:
        try:
            workspace = pathlib.Path(github_workspace).expanduser().resolve()
            if resolved == workspace or workspace in resolved.parents or resolved in workspace.parents:
                return True
        except Exception:
            return True
    return False


def _checkout_identity(path: pathlib.Path, expected_origin: str) -> tuple[bool, str]:
    try:
        resolved = path.expanduser().resolve()
    except Exception:
        return False, "candidate_unresolvable"
    if _is_runner_checkout(resolved):
        return False, "candidate_is_runner_checkout"
    if not (resolved / ".git").exists():
        return False, "candidate_not_git_checkout"
    try:
        actual = _normalize_remote(_origin(resolved))
    except SourceIntegrityError:
        return False, "candidate_origin_unreadable"
    if actual != _normalize_remote(expected_origin):
        return False, "candidate_remote_mismatch"
    return True, "verified"


def _read_locator(locator_file: pathlib.Path, expected_origin: str) -> pathlib.Path | None:
    try:
        payload = json.loads(locator_file.read_text())
    except (FileNotFoundError, OSError, json.JSONDecodeError, TypeError):
        return None
    if not isinstance(payload, dict):
        return None
    if _normalize_remote(str(payload.get("origin", ""))) != _normalize_remote(expected_origin):
        return None
    raw = payload.get("repository")
    if not isinstance(raw, str) or not raw.strip():
        return None
    return pathlib.Path(raw).expanduser()


def persist_principal_checkout_locator(
    repo: pathlib.Path,
    expected_origin: str,
    *,
    locator_file: pathlib.Path,
) -> pathlib.Path:
    locator_file = locator_file.expanduser()
    locator_file.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": "SYSGRID_PRINCIPAL_CHECKOUT_LOCATOR_V1",
        "repository": str(repo.expanduser().resolve()),
        "origin": _normalize_remote(expected_origin),
    }
    tmp = locator_file.with_suffix(locator_file.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    os.replace(tmp, locator_file)
    return locator_file


def _resolution_record(
    *,
    status: str,
    source: str,
    locator_file: pathlib.Path,
    repository: pathlib.Path | None = None,
    reason: str | None = None,
    verified_candidates: Sequence[pathlib.Path] = (),
    ignored_persisted_reason: str | None = None,
) -> dict[str, object]:
    return {
        "status": status,
        "reason": reason,
        "source": source,
        "repository": str(repository.resolve()) if repository else None,
        "verified_candidates": [str(p.resolve()) for p in verified_candidates],
        "ignored_persisted_reason": ignored_persisted_reason,
        "locator_file": str(locator_file),
    }


def resolve_principal_checkout(
    expected_origin: str,
    *,
    execution_repo: pathlib.Path | None = None,
    explicit_repo: pathlib.Path | None = None,
    home: pathlib.Path | None = None,
    locator_file: pathlib.Path | None = None,
    candidate_paths: Sequence[pathlib.Path] | None = None,
) -> dict[str, object]:
    home = (home or pathlib.Path.home()).expanduser().resolve()
    locator_file = (locator_file or _default_locator(home)).expanduser()
    execution_repo = execution_repo.expanduser().resolve() if execution_repo else None
    expected = _normalize_remote(expected_origin)
    if not expected:
        return _resolution_record(
            status="PRIMARY_CHECKOUT_SYNC_PENDING", source="input", locator_file=locator_file,
            reason="expected_origin_missing",
        )

    def verify(path: pathlib.Path, source: str, *, fail_hard: bool) -> dict[str, object] | None:
        resolved = path.expanduser().resolve()
        valid, reason = _checkout_identity(resolved, expected)
        if valid:
            return _resolution_record(
                status="RESOLVED", source=source, locator_file=locator_file, repository=resolved,
            )
        if fail_hard:
            return _resolution_record(
                status="PRIMARY_CHECKOUT_SYNC_PENDING", source=source, locator_file=locator_file, reason=reason,
            )
        return None

    env_repo = os.environ.get(PRINCIPAL_REPO_ENV, "").strip()
    explicit_repo = explicit_repo or (pathlib.Path(env_repo).expanduser() if env_repo else None)
    if explicit_repo is not None:
        return verify(explicit_repo, "explicit", fail_hard=True) or _resolution_record(
            status="PRIMARY_CHECKOUT_SYNC_PENDING", source="explicit", locator_file=locator_file,
            reason="explicit_candidate_invalid",
        )

    ignored_persisted_reason: str | None = None
    persisted = _read_locator(locator_file, expected)
    if persisted is not None:
        persisted_resolution = verify(persisted, "persisted", fail_hard=False)
        if persisted_resolution is not None:
            return persisted_resolution
        _, ignored_persisted_reason = _checkout_identity(persisted, expected)

    # The execution checkout is the strongest topology signal after explicit/persisted
    # state. It is principal when it is a verified non-runner checkout. This covers the
    # actual Mac topology /Users/<user>/home/development/sysgrid while still excluding
    # GitHub Actions _work checkouts.
    if execution_repo is not None:
        execution_resolution = verify(execution_repo, "interactive_execution_checkout", fail_hard=False)
        if execution_resolution is not None:
            if ignored_persisted_reason:
                execution_resolution["ignored_persisted_reason"] = ignored_persisted_reason
            return execution_resolution

    canonical_paths = [home / rel for rel in PRINCIPAL_STANDARD_RELATIVE_PATHS]
    if candidate_paths is not None:
        canonical_paths.extend(candidate_paths)

    valid: list[pathlib.Path] = []
    seen: set[pathlib.Path] = set()
    for raw in canonical_paths:
        try:
            candidate = raw.expanduser().resolve()
        except Exception:
            continue
        if candidate in seen:
            continue
        seen.add(candidate)
        ok, _ = _checkout_identity(candidate, expected)
        if ok:
            valid.append(candidate)

    if len(valid) == 1:
        source = "canonical_verified_candidate" if valid[0] in [p.expanduser().resolve() for p in canonical_paths[:len(PRINCIPAL_STANDARD_RELATIVE_PATHS)]] else "unique_verified_candidate"
        return _resolution_record(
            status="RESOLVED", source=source, locator_file=locator_file, repository=valid[0],
            ignored_persisted_reason=ignored_persisted_reason,
        )
    return _resolution_record(
        status="PRIMARY_CHECKOUT_SYNC_PENDING",
        source="bounded_discovery",
        locator_file=locator_file,
        reason="no_verified_principal_checkout" if not valid else "ambiguous_verified_principal_checkouts",
        verified_candidates=valid,
        ignored_persisted_reason=ignored_persisted_reason,
    )


def converge_principal_checkout(
    expected_origin: str,
    *,
    execution_repo: pathlib.Path | None = None,
    explicit_repo: pathlib.Path | None = None,
    home: pathlib.Path | None = None,
    locator_file: pathlib.Path | None = None,
    candidate_paths: Sequence[pathlib.Path] | None = None,
) -> dict[str, object]:
    home = (home or pathlib.Path.home()).expanduser().resolve()
    locator_file = (locator_file or _default_locator(home)).expanduser()
    resolution = resolve_principal_checkout(
        expected_origin,
        execution_repo=execution_repo,
        explicit_repo=explicit_repo,
        home=home,
        locator_file=locator_file,
        candidate_paths=candidate_paths,
    )
    receipt: dict[str, object] = {
        "schema": "SYSGRID_PRINCIPAL_CHECKOUT_CONVERGENCE_RECEIPT_V1",
        "status": "PRIMARY_CHECKOUT_SYNC_PENDING",
        "resolution_source": resolution.get("source"),
        "reason": resolution.get("reason"),
        "principal_repository": resolution.get("repository"),
        "repository": resolution.get("repository"),
        "execution_repository": str(execution_repo.expanduser().resolve()) if execution_repo else None,
        "expected_origin": _normalize_remote(expected_origin),
        "locator_file": str(locator_file),
        "locator_persisted": False,
        "previous_head": None,
        "resulting_head": None,
        "origin_main": None,
        "branch": None,
        "dirty_state_classification": None,
        "tracked_dirty": [],
        "generated_runtime_dirty": [],
        "generated_runtime_backups": [],
        "safe_fast_forward": False,
        "startup_source_gate_present": False,
        "head_matches_origin_main": False,
    }
    if resolution.get("ignored_persisted_reason"):
        receipt["ignored_persisted_reason"] = resolution["ignored_persisted_reason"]
    if resolution.get("verified_candidates"):
        receipt["verified_candidates"] = resolution["verified_candidates"]

    repo_raw = resolution.get("repository")
    if resolution.get("status") != "RESOLVED" or not isinstance(repo_raw, str):
        return receipt

    repo = pathlib.Path(repo_raw)
    try:
        before = inspect_source_integrity(repo, fetch=True)
        receipt.update({
            "previous_head": before.head,
            "origin_main": before.origin_main,
            "branch": before.branch,
            "dirty_state_classification": before.status,
            "tracked_dirty": list(before.tracked_dirty),
            "generated_runtime_dirty": list(before.generated_runtime_dirty),
        })
        converged = enforce_current_main(repo, fetch=False, auto_fast_forward=True)
    except SourceIntegrityError as exc:
        receipt.update({
            "reason": f"source_integrity_{exc.status.lower()}",
            "source_integrity_status": exc.status,
            "detail": str(exc),
        })
        return receipt

    gate = repo / "scripts" / "source_integrity_gate.py"
    gate_present = gate.is_file()
    head_matches = bool(converged.head and converged.head == converged.origin_main)
    passable = converged.launch_allowed and gate_present and head_matches
    receipt.update({
        "status": "PASS" if passable else "PRIMARY_CHECKOUT_SYNC_PENDING",
        "reason": None if passable else (
            "head_does_not_match_origin_main" if not head_matches else "startup_source_gate_not_present_after_convergence"
        ),
        "resulting_head": converged.head,
        "origin_main": converged.origin_main,
        "branch": converged.branch,
        "safe_fast_forward": converged.fast_forwarded,
        "source_status": converged.status,
        "generated_runtime_backups": list(converged.generated_runtime_backups),
        "startup_source_gate_present": gate_present,
        "head_matches_origin_main": head_matches,
    })
    if passable:
        persisted = persist_principal_checkout_locator(
            repo, expected_origin, locator_file=locator_file,
        )
        receipt["locator_file"] = str(persisted)
        receipt["locator_persisted"] = True
    return receipt


def _git(repo: pathlib.Path, *args: str) -> str:
    return _run_git(repo, list(args)).stdout.strip()


def _clone(remote: pathlib.Path, destination: pathlib.Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "clone", str(remote), str(destination)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    _git(destination, "config", "user.email", "sysgrid@test.invalid")
    _git(destination, "config", "user.name", "SysGrid Test")


def self_test() -> dict[str, object]:
    checks: list[str] = []
    with tempfile.TemporaryDirectory(prefix="sysgrid-source-gate-") as td:
        workspace = pathlib.Path(td)
        remote = workspace / "remote.git"
        seed = workspace / "seed"
        local = workspace / "local"
        peer = workspace / "peer"

        subprocess.run(["git", "init", "--bare", str(remote)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _clone(remote, seed)
        (seed / "scripts").mkdir()
        shutil.copy2(pathlib.Path(__file__).resolve(), seed / "scripts" / "source_integrity_gate.py")
        (seed / "tracked.txt").write_text("one\n")
        (seed / "backend").mkdir()
        (seed / "backend" / ".env.local.runtime").write_text("generated=base\n")
        _git(seed, "add", ".")
        _git(seed, "commit", "-m", "seed")
        _git(seed, "branch", "-M", "main")
        _git(seed, "push", "-u", "origin", "main")
        _git(remote, "symbolic-ref", "HEAD", "refs/heads/main")

        _clone(remote, local)
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
        generated_clean = enforce_current_main(local, backup_root=workspace / "generated-backups")
        assert generated_clean.status == "CURRENT" and generated_clean.generated_runtime_backups
        assert not _tracked_dirty(local)
        checks.append("generated_runtime_drift_backed_up_and_cleaned")

        _clone(remote, peer)
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
        assert inspect_source_integrity(local).status == "DIRTY"
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

    # Topology suite uses the observed Mac shape: execution checkout is
    # ~/home/development/sysgrid, while a separate _work checkout must never win.
    with tempfile.TemporaryDirectory(prefix="sysgrid-topology-gate-") as td:
        workspace = pathlib.Path(td)
        remote = workspace / "remote.git"
        seed = workspace / "seed"
        user_home = workspace / "Users" / "principal"
        interactive = user_home / "home" / "development" / "sysgrid"
        runner = user_home / "sysgrid-actions-runner" / "_work" / "system_grid" / "system_grid"
        peer = workspace / "peer"
        locator = workspace / "locator" / "principal-checkout.json"

        subprocess.run(["git", "init", "--bare", str(remote)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _clone(remote, seed)
        (seed / "scripts").mkdir()
        shutil.copy2(pathlib.Path(__file__).resolve(), seed / "scripts" / "source_integrity_gate.py")
        (seed / "tracked.txt").write_text("one\n")
        _git(seed, "add", ".")
        _git(seed, "commit", "-m", "seed")
        _git(seed, "branch", "-M", "main")
        _git(seed, "push", "-u", "origin", "main")
        _git(remote, "symbolic-ref", "HEAD", "refs/heads/main")
        _clone(remote, interactive)
        _clone(remote, runner)
        _clone(remote, peer)

        resolved_execution = resolve_principal_checkout(
            str(remote), execution_repo=interactive, home=user_home, locator_file=locator,
        )
        assert resolved_execution["status"] == "RESOLVED"
        assert resolved_execution["repository"] == str(interactive.resolve())
        assert resolved_execution["source"] == "interactive_execution_checkout"
        checks.append("observed_noncanonical_interactive_execution_checkout_is_principal")

        runner_only = resolve_principal_checkout(
            str(remote), execution_repo=runner, home=workspace / "empty-home",
            locator_file=workspace / "runner-only-locator.json", candidate_paths=[],
        )
        assert runner_only["status"] == "PRIMARY_CHECKOUT_SYNC_PENDING"
        assert runner_only["reason"] == "no_verified_principal_checkout"
        checks.append("actions_runner_execution_checkout_rejected")

        (peer / "tracked.txt").write_text("two\n")
        _git(peer, "add", "tracked.txt")
        _git(peer, "commit", "-m", "remote topology advance")
        _git(peer, "push", "origin", "main")
        interactive_before = _head(interactive)
        runner_before = _head(runner)
        convergence = converge_principal_checkout(
            str(remote), execution_repo=interactive, home=user_home, locator_file=locator,
        )
        assert convergence["status"] == "PASS"
        assert convergence["principal_repository"] == str(interactive.resolve())
        assert convergence["previous_head"] == interactive_before
        assert convergence["safe_fast_forward"] is True
        assert convergence["resulting_head"] == convergence["origin_main"] == _origin_main(interactive)
        assert convergence["head_matches_origin_main"] is True
        assert _head(runner) == runner_before
        assert convergence["locator_persisted"] is True
        checks.append("principal_convergence_fast_forwards_observed_interactive_checkout_only")
        checks.append("convergence_receipt_head_equals_origin_main")

        persisted = resolve_principal_checkout(
            str(remote), execution_repo=runner, home=user_home, locator_file=locator,
        )
        assert persisted["status"] == "RESOLVED"
        assert persisted["source"] == "persisted"
        assert persisted["repository"] == str(interactive.resolve())
        checks.append("persisted_locator_reused_even_when_execution_is_runner")

        rejected_runner = resolve_principal_checkout(
            str(remote), execution_repo=interactive, explicit_repo=runner,
            home=user_home, locator_file=workspace / "unused-locator.json",
        )
        assert rejected_runner["status"] == "PRIMARY_CHECKOUT_SYNC_PENDING"
        assert rejected_runner["reason"] == "candidate_is_runner_checkout"
        checks.append("explicit_runner_target_rejected")

        wrong_remote = workspace / "wrong-remote.git"
        wrong_repo = workspace / "wrong-repo"
        subprocess.run(["git", "init", "--bare", str(wrong_remote)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _clone(wrong_remote, wrong_repo)
        wrong_seed = workspace / "wrong-seed"
        _clone(wrong_remote, wrong_seed)
        (wrong_seed / "x.txt").write_text("x\n")
        _git(wrong_seed, "add", "x.txt")
        _git(wrong_seed, "commit", "-m", "wrong")
        _git(wrong_seed, "branch", "-M", "main")
        _git(wrong_seed, "push", "-u", "origin", "main")
        _git(wrong_remote, "symbolic-ref", "HEAD", "refs/heads/main")
        # Reclone after the remote has a main branch.
        shutil.rmtree(wrong_repo)
        _clone(wrong_remote, wrong_repo)
        wrong = resolve_principal_checkout(
            str(remote), execution_repo=interactive, explicit_repo=wrong_repo,
            home=user_home, locator_file=workspace / "wrong-locator.json",
        )
        assert wrong["status"] == "PRIMARY_CHECKOUT_SYNC_PENDING"
        assert wrong["reason"] == "candidate_remote_mismatch"
        checks.append("explicit_remote_mismatch_rejected")

        alt_a = workspace / "alt-a"
        alt_b = workspace / "alt-b"
        _clone(remote, alt_a)
        _clone(remote, alt_b)
        ambiguous = resolve_principal_checkout(
            str(remote), execution_repo=runner, home=workspace / "empty-home-2",
            locator_file=workspace / "empty-locator.json", candidate_paths=[alt_a, alt_b],
        )
        assert ambiguous["status"] == "PRIMARY_CHECKOUT_SYNC_PENDING"
        assert ambiguous["reason"] == "ambiguous_verified_principal_checkouts"
        assert len(ambiguous["verified_candidates"]) == 2
        checks.append("ambiguous_verified_candidates_fail_closed")

        stale_locator = workspace / "stale-locator.json"
        stale_locator.write_text(json.dumps({
            "schema": "SYSGRID_PRINCIPAL_CHECKOUT_LOCATOR_V1",
            "repository": str(runner),
            "origin": _normalize_remote(str(remote)),
        }))
        recovered = resolve_principal_checkout(
            str(remote), execution_repo=interactive, home=user_home, locator_file=stale_locator,
        )
        assert recovered["status"] == "RESOLVED"
        assert recovered["source"] == "interactive_execution_checkout"
        assert recovered["ignored_persisted_reason"] == "candidate_is_runner_checkout"
        checks.append("invalid_persisted_locator_recovers_to_verified_execution_checkout")

        (interactive / "tracked.txt").write_text("dirty\n")
        dirty_receipt = converge_principal_checkout(
            str(remote), execution_repo=interactive, home=user_home,
            locator_file=workspace / "dirty-locator.json",
        )
        assert dirty_receipt["status"] == "PRIMARY_CHECKOUT_SYNC_PENDING"
        assert dirty_receipt["source_integrity_status"] == "DIRTY"
        _git(interactive, "restore", "tracked.txt")
        checks.append("dirty_principal_convergence_fails_closed")

        no_candidate = resolve_principal_checkout(
            str(remote), execution_repo=runner, home=workspace / "empty-home-3",
            locator_file=workspace / "missing-locator.json", candidate_paths=[],
        )
        assert no_candidate["status"] == "PRIMARY_CHECKOUT_SYNC_PENDING"
        assert no_candidate["reason"] == "no_verified_principal_checkout"
        checks.append("missing_principal_reports_pending")

        assert _normalize_remote("kimhw8084/system_grid") == "https://github.com/kimhw8084/system_grid"
        assert _normalize_remote("git@github.com:kimhw8084/system_grid.git") == "https://github.com/kimhw8084/system_grid"
        checks.append("repository_slug_and_git_remote_normalize_identically")

        compat_locator = workspace / "compat-cli-locator.json"
        compat = subprocess.run([
            sys.executable, str(pathlib.Path(__file__).resolve()),
            "--sync-principal-from-execution-repo", str(interactive),
            "--expected-remote", str(remote),
            "--principal-home", str(user_home),
            "--locator-file", str(compat_locator),
            "--json",
        ], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        assert compat.returncode == 0, compat.stderr or compat.stdout
        compat_receipt = json.loads(compat.stdout.strip().splitlines()[-1])
        assert compat_receipt["status"] == "PASS"
        assert compat_receipt["principal_repository"] == str(interactive.resolve())
        checks.append("published_pc46_cli_alias_converges_observed_interactive_checkout")

        er03_locator = workspace / "er03-cli-locator.json"
        er03 = subprocess.run([
            sys.executable, str(pathlib.Path(__file__).resolve()),
            "--converge-principal",
            "--expected-origin", str(remote),
            "--execution-repo", str(interactive),
            "--principal-home", str(user_home),
            "--principal-locator", str(er03_locator),
            "--json",
        ], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        assert er03.returncode == 0, er03.stderr or er03.stdout
        er03_receipt = json.loads(er03.stdout.strip().splitlines()[-1])
        assert er03_receipt["status"] == "PASS"
        assert er03_receipt["principal_repository"] == str(interactive.resolve())
        checks.append("er03_cli_converges_observed_interactive_checkout")

    return {
        "schema": "SYSGRID_SOURCE_GATE_SELF_TEST_V3",
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

    # ER-03 interface.
    parser.add_argument("--converge-principal", action="store_true")
    parser.add_argument("--expected-origin")
    parser.add_argument("--execution-repo")
    parser.add_argument("--principal-repo")
    parser.add_argument("--principal-locator")
    parser.add_argument("--locator-file")
    parser.add_argument("--principal-home")

    # Compatibility aliases for the already-published PC-46 variant.
    parser.add_argument("--sync-principal-from-execution-repo")
    parser.add_argument("--expected-remote")
    args = parser.parse_args()

    if args.self_test:
        print(json.dumps(self_test(), sort_keys=True))
        return 0

    compatibility_execution = args.sync_principal_from_execution_repo
    convergence_requested = args.converge_principal or bool(compatibility_execution)
    if convergence_requested:
        execution_raw = args.execution_repo or compatibility_execution
        expected = args.expected_origin or args.expected_remote
        execution_path = pathlib.Path(execution_raw).expanduser() if execution_raw else pathlib.Path(args.repo).expanduser()
        if not expected:
            try:
                expected = _origin(execution_path)
            except SourceIntegrityError:
                parser.error("principal convergence requires --expected-origin/--expected-remote or a readable execution-repo origin")
        locator_raw = args.principal_locator or args.locator_file
        receipt = converge_principal_checkout(
            expected,
            execution_repo=execution_path,
            explicit_repo=pathlib.Path(args.principal_repo).expanduser() if args.principal_repo else None,
            home=pathlib.Path(args.principal_home).expanduser() if args.principal_home else None,
            locator_file=pathlib.Path(locator_raw).expanduser() if locator_raw else None,
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
