#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import stat
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

HISTORY_NAME_RE = re.compile(
    r"^(?P<run>[A-Za-z0-9_.+-]+)__(?P<kind>[A-Za-z0-9_.+-]+)__(?P<capsule>[0-9a-f]{12}|no-capsule)__(?P<payload>[0-9a-f]{12})\.zip$"
)
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
ISSUE_RE = re.compile(r"^[A-Z][A-Z0-9]+-[1-9][0-9]*$")
CHUNK = 4 * 1024 * 1024


def fail(message: str) -> None:
    raise SystemExit(f"SYSGRID_RELAY_REJECTED: {message}")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(CHUNK), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_member(archive: zipfile.ZipFile, name: str) -> str:
    h = hashlib.sha256()
    with archive.open(name, "r") as handle:
        for chunk in iter(lambda: handle.read(CHUNK), b""):
            h.update(chunk)
    return h.hexdigest()


def require_safe_member(name: str) -> PurePosixPath:
    if not name or "\\" in name or name.startswith("/") or "\x00" in name:
        fail(f"unsafe ZIP member name: {name!r}")
    path = PurePosixPath(name)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        fail(f"unsafe ZIP member path: {name!r}")
    return path


def parse_manifest(data: bytes, label: str) -> dict[str, str]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        fail(f"{label} is not UTF-8: {exc}")
    result: dict[str, str] = {}
    for line_no, raw in enumerate(text.splitlines(), start=1):
        if not raw.strip():
            continue
        if "  " not in raw:
            fail(f"{label} line {line_no} lacks two-space separator")
        digest, rel = raw.split("  ", 1)
        if not SHA256_RE.fullmatch(digest):
            fail(f"{label} line {line_no} has invalid SHA-256")
        require_safe_member(rel)
        if rel in result:
            fail(f"{label} contains duplicate path: {rel}")
        result[rel] = digest
    if not result:
        fail(f"{label} is empty")
    return result


def verify_zip(path: Path, expected_sha: str, expected_size: int, history_name: str) -> dict[str, object]:
    if path.is_symlink() or not path.is_file():
        fail(f"spool artifact missing or unsafe: {path}")
    actual_size = path.stat().st_size
    if actual_size != expected_size:
        fail(f"payload size mismatch: expected {expected_size}, observed {actual_size}")
    actual_sha = sha256_file(path)
    if actual_sha != expected_sha:
        fail(f"payload SHA-256 mismatch: expected {expected_sha}, observed {actual_sha}")

    match = HISTORY_NAME_RE.fullmatch(history_name)
    if not match:
        fail(f"history basename violates immutable naming contract: {history_name}")
    if match.group("payload") != expected_sha[:12]:
        fail("history basename payload prefix does not match expected SHA-256")

    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if len(names) != len(set(names)):
            fail("ZIP contains duplicate member names")
        required = {
            "MANIFEST.sha256",
            "RESULT.json",
            "HANDOFF/MANIFEST.sha256",
            "SOURCE_AUTHORITY/SOURCE_MANIFEST.sha256",
        }
        missing = sorted(required - set(names))
        if missing:
            fail(f"ZIP lacks required members: {missing}")
        for info in infos:
            require_safe_member(info.filename)
            mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_ISLNK(mode):
                fail(f"ZIP contains symlink member: {info.filename}")
            if mode & 0o111 and not info.is_dir():
                fail(f"ZIP contains executable member: {info.filename}")

        root_manifest = parse_manifest(archive.read("MANIFEST.sha256"), "MANIFEST.sha256")
        expected_members = set(names) - {"MANIFEST.sha256"}
        if set(root_manifest) != expected_members:
            missing = sorted(expected_members - set(root_manifest))[:10]
            extra = sorted(set(root_manifest) - expected_members)[:10]
            fail(f"root manifest coverage mismatch; missing={missing}, extra={extra}")

        # Each member is streamed exactly once from the local spool. Nested manifests
        # are reconciled against the already verified root manifest, avoiding a second
        # random-access pass over hundreds of source files.
        for member, digest in root_manifest.items():
            observed = sha256_member(archive, member)
            if observed != digest:
                fail(f"root manifest digest mismatch: {member}")

        nested_counts: dict[str, int] = {}
        for manifest_name, prefix in (
            ("HANDOFF/MANIFEST.sha256", "HANDOFF/"),
            ("SOURCE_AUTHORITY/SOURCE_MANIFEST.sha256", "SOURCE_AUTHORITY/files/"),
        ):
            nested = parse_manifest(archive.read(manifest_name), manifest_name)
            for rel, digest in nested.items():
                member = prefix + rel
                if member not in root_manifest:
                    fail(f"nested manifest member missing from root manifest: {member}")
                if root_manifest[member] != digest:
                    fail(f"nested manifest digest disagrees with root manifest: {member}")
            nested_counts[manifest_name] = len(nested)

        try:
            result = json.loads(archive.read("RESULT.json"))
        except Exception as exc:
            fail(f"RESULT.json is invalid JSON: {exc}")
        if not isinstance(result, dict):
            fail("RESULT.json must be an object")
        issue = result.get("issue")
        capsule_sha = result.get("capsule_sha256")
        capsule_file = result.get("capsule_file")
        if not isinstance(issue, str) or not ISSUE_RE.fullmatch(issue):
            fail(f"RESULT.json issue is invalid: {issue!r}")
        if not isinstance(capsule_sha, str) or not SHA256_RE.fullmatch(capsule_sha):
            fail("RESULT.json capsule_sha256 is invalid")
        if not isinstance(capsule_file, str) or not capsule_file.endswith(".sgcap"):
            fail("RESULT.json capsule_file is invalid")
        if match.group("capsule") != capsule_sha[:12]:
            fail("history basename capsule prefix does not match RESULT.json")

        return {
            "engine_run_id": match.group("run"),
            "artifact_kind": match.group("kind"),
            "issue": issue,
            "capsule_file": capsule_file,
            "capsule_sha256": capsule_sha,
            "classification": result.get("classification"),
            "result": result.get("result"),
            "engine_version": result.get("engine_version"),
            "finished_utc": result.get("finished_utc"),
            "payload_sha256": actual_sha,
            "payload_size": actual_size,
            "root_manifest_entries": len(root_manifest),
            "nested_manifest_entries": nested_counts,
            "source_mode": "LOCAL_VERIFIED_SPOOL",
        }


def write_github_output(path: Path, values: dict[str, str]) -> None:
    with path.open("a", encoding="utf-8") as handle:
        for key, value in values.items():
            if "\n" in value or "\r" in value:
                fail(f"unsafe multiline GitHub output: {key}")
            handle.write(f"{key}={value}\n")


def create_package(args: argparse.Namespace) -> None:
    if not SHA256_RE.fullmatch(args.payload_sha256):
        fail("payload_sha256 must be lowercase 64-hex")
    if args.payload_size < 1:
        fail("payload_size must be positive")
    if Path(args.history_basename).name != args.history_basename:
        fail("history_basename must not contain a path")

    spool_root = Path(args.spool_root).expanduser().resolve(strict=True)
    source = (spool_root / f"{args.payload_sha256}.zip").resolve(strict=True)
    if source.parent != spool_root:
        fail("resolved source escaped fixed spool root")

    metadata = verify_zip(source, args.payload_sha256, args.payload_size, args.history_basename)
    output = Path(args.output_dir).resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, mode=0o700)
    payload_target = output / "UPLOAD_THIS_TO_CHATGPT.zip"
    shutil.copyfile(source, payload_target)
    if sha256_file(payload_target) != args.payload_sha256:
        fail("post-copy payload SHA-256 mismatch")

    created = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    expires = created + dt.timedelta(days=args.retention_days)
    envelope = {
        "schema_version": "1.1.0",
        "state": "VERIFIED_FOR_PUBLIC_RELAY",
        "disclosure": "PUBLIC_BY_EXPLICIT_PRINCIPAL_DECISION",
        "repository": args.repository,
        "history_basename": args.history_basename,
        "workflow_run_id": args.workflow_run_id,
        "created_at": created.isoformat().replace("+00:00", "Z"),
        "expires_at": expires.isoformat().replace("+00:00", "Z"),
        **metadata,
    }
    envelope_path = output / "SYSGRID_RELAY_ENVELOPE.json"
    envelope_path.write_text(json.dumps(envelope, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    artifact_name = f"sysgrid-outbox-{metadata['engine_run_id']}-{args.payload_sha256[:12]}-{args.workflow_run_id}"
    if args.github_output:
        write_github_output(Path(args.github_output), {
            "artifact_name": artifact_name,
            "engine_run_id": str(metadata["engine_run_id"]),
            "issue": str(metadata["issue"]),
            "capsule_sha256": str(metadata["capsule_sha256"]),
            "payload_sha256": args.payload_sha256,
            "payload_size": str(args.payload_size),
            "envelope_path": str(envelope_path),
            "payload_path": str(payload_target),
            "expires_at": envelope["expires_at"],
        })
    print(json.dumps({"artifact_name": artifact_name, "envelope": envelope}, indent=2, sort_keys=True))


def self_test() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        spool = root / "spool"
        spool.mkdir()
        result = {
            "issue": "OUT-31",
            "capsule_file": "QUALIFICATION.sgcap",
            "capsule_sha256": "a" * 64,
            "classification": "QUALIFICATION",
            "result": "success",
            "engine_version": "1.1.1",
            "finished_utc": "2026-01-01T00:00:00Z",
        }
        handoff_file = b"{}\n"
        source_file = b"hello\n"
        members = {
            "RESULT.json": (json.dumps(result, sort_keys=True) + "\n").encode(),
            "HANDOFF/CURRENT_GATE.json": handoff_file,
            "SOURCE_AUTHORITY/files/README.md": source_file,
        }
        members["HANDOFF/MANIFEST.sha256"] = (
            f"{hashlib.sha256(handoff_file).hexdigest()}  CURRENT_GATE.json\n"
        ).encode()
        members["SOURCE_AUTHORITY/SOURCE_MANIFEST.sha256"] = (
            f"{hashlib.sha256(source_file).hexdigest()}  README.md\n"
        ).encode()
        root_manifest = "".join(
            f"{hashlib.sha256(data).hexdigest()}  {name}\n" for name, data in sorted(members.items())
        ).encode()
        members["MANIFEST.sha256"] = root_manifest
        dummy = root / "dummy.zip"
        with zipfile.ZipFile(dummy, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for name, data in sorted(members.items()):
                info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                info.external_attr = 0o100600 << 16
                archive.writestr(info, data)
        payload_sha = sha256_file(dummy)
        target = spool / f"{payload_sha}.zip"
        dummy.rename(target)
        history_name = f"RUN-1__qualification__{'a'*12}__{payload_sha[:12]}.zip"
        metadata = verify_zip(target, payload_sha, target.stat().st_size, history_name)
        assert metadata["issue"] == "OUT-31"
        assert metadata["source_mode"] == "LOCAL_VERIFIED_SPOOL"
    print("SYSGRID_PUBLIC_RELAY_SPOOL_SELF_TEST_PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--spool-root")
    parser.add_argument("--history-basename")
    parser.add_argument("--payload-sha256")
    parser.add_argument("--payload-size", type=int)
    parser.add_argument("--output-dir")
    parser.add_argument("--repository", default="kimhw8084/system_grid")
    parser.add_argument("--workflow-run-id", default=os.environ.get("GITHUB_RUN_ID", "local"))
    parser.add_argument("--retention-days", type=int, default=90)
    parser.add_argument("--github-output", default=os.environ.get("GITHUB_OUTPUT"))
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    required = ["spool_root", "history_basename", "payload_sha256", "payload_size", "output_dir"]
    missing = [name for name in required if getattr(args, name) in {None, ""}]
    if missing:
        fail(f"missing required arguments: {missing}")
    create_package(args)


if __name__ == "__main__":
    main()
