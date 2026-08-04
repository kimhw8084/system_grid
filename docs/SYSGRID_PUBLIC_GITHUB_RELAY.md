# SysGrid Public GitHub Relay

This relay publishes the complete canonical SysGrid Outbox ZIP as a public GitHub Actions artifact. Public disclosure is an explicit principal decision made to support proxy-constrained access from another computer.

## Trust boundary

The relay is transport only. It does not execute capsules, edit product source, accept Product Attempts, change Linear state, or reset Verification Repair counts.

`sg` remains the sole explicit product-execution command.

## Data flow

1. Stable Engine and Supervisor publish an immutable ZIP to `SysGrid-Control/Outbox/History` plus its `.sha256` sidecar.
2. The local LaunchAgent detects only new checksum-complete History objects.
3. The watcher dispatches `sysgrid-public-outbox-relay.yml` with the exact basename, SHA-256, and byte size.
4. A uniquely labeled self-hosted macOS runner verifies the fixed path, filename contract, size, payload hash, ZIP safety, root manifest, nested handoff/source manifests, `RESULT.json`, issue, and capsule identity.
5. The workflow uploads exactly `UPLOAD_THIS_TO_CHATGPT.zip` and `SYSGRID_RELAY_ENVELOPE.json` as an immutable public artifact.
6. The workflow commits a machine-readable pointer to the `relay-ledger` branch.
7. ChatGPT reads `relay/latest.json`, downloads the artifact by numeric ID, and independently re-verifies the bytes.

## Security controls

- Public repository and public artifacts are intentional.
- No `pull_request` trigger exists.
- The job requires actor `kimhw8084`, ref `main`, and runner labels `self-hosted`, `macOS`, `ARM64`, `sysgrid-relay`.
- Arbitrary paths and commands are prohibited.
- The workflow uses a fixed iCloud control root and an immutable History basename.
- Symlinks, path traversal, duplicate ZIP members, executable ZIP members, incomplete manifests, hash mismatches, issue mismatches, and capsule mismatches fail closed.
- The runner operates in its own Actions work directory and never checks out into the retained dirty SysGrid working tree.
- Publication failure does not change the local product result; the manual Outbox path remains authoritative fallback.

## Relay ledger

The `relay-ledger` branch contains:

- `relay/latest.json`: latest verified publication pointer;
- `relay/history.ndjson`: append-only pointer history.

Ledger entries are locators only. They do not prove product success or acceptance.
