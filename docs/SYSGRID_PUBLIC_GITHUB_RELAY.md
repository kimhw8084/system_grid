# SysGrid Public GitHub Relay

This relay publishes the complete canonical SysGrid Outbox ZIP as a public GitHub Actions artifact. Public disclosure is an explicit principal decision made to support proxy-constrained access from another computer.

## Trust boundary

The relay is transport only. It does not execute capsules, edit product source, accept Product Attempts, change Linear state, or reset Verification Repair counts. `sg` remains the sole explicit product-execution command.

## Data flow

1. Stable Engine and Supervisor publish an immutable ZIP to `SysGrid-Control/Outbox/History` plus its `.sha256` sidecar.
2. The local LaunchAgent detects only new checksum-complete History objects.
3. Before dispatch, the watcher performs one sequential copy-and-hash into the fixed local spool `~/Library/Application Support/SysGridRelay/spool/<payload-sha>.zip`.
4. The watcher dispatches `sysgrid-public-outbox-relay.yml` with the exact immutable History basename, SHA-256, and byte size.
5. A uniquely labeled self-hosted macOS runner verifies the fixed local spool object, filename contract, size, payload hash, ZIP safety, root manifest, nested handoff/source manifests, `RESULT.json`, issue, and capsule identity.
6. Every ZIP member is streamed exactly once; nested manifests are reconciled against the already verified root manifest rather than rereading hundreds of source files.
7. The workflow uploads exactly `UPLOAD_THIS_TO_CHATGPT.zip` and `SYSGRID_RELAY_ENVELOPE.json` as an immutable public artifact.
8. The workflow commits a machine-readable pointer to the `relay-ledger` branch.
9. ChatGPT reads `relay/latest.json`, downloads the artifact by numeric ID, and independently re-verifies the bytes.
10. The watcher removes the local spool object only after the exact payload is published.

## Security controls

- Public repository and public artifacts are intentional.
- No `pull_request` trigger exists.
- The job requires actor `kimhw8084`, ref `main`, and runner labels `self-hosted`, `macOS`, `ARM64`, `sysgrid-relay`.
- Arbitrary paths and commands are prohibited.
- The watcher alone stages from the fixed iCloud History root into the fixed local spool root.
- The workflow derives the spool filename solely from the exact 64-hex payload SHA; no caller-supplied local path is accepted.
- Symlinks, path traversal, duplicate ZIP members, executable ZIP members, incomplete manifests, hash mismatches, issue mismatches, and capsule mismatches fail closed.
- The runner operates in its own Actions work directory and never checks out into the retained dirty SysGrid working tree.
- Publication failure does not change the local product result; the manual Outbox path remains authoritative fallback.

## Relay ledger

The `relay-ledger` branch contains `relay/latest.json` and append-only `relay/history.ndjson`. Ledger entries are locators only. They do not prove product success or acceptance.
