# PV1 P10 Hardening Runbook

This runbook is an operational boundary, not a performance or disaster-recovery claim. Each release evidence bundle must record the candidate identity, environment, fixture profile, measured result, and any unavailable proof layer explicitly.

## Qualification database safety

Never use `start-local.sh`, `reset_project_validation_data.py`, `seed.py`, truncation, or a configured Local Demo path as test setup. Backend tests establish `CONFIG_DATABASE_URL`, `DATABASE_URL`, and `TENANT_STORAGE_ROOT` in a temporary namespace before importing application settings. The session guard records configured database snapshots and fails if any digest, size, or mtime changes. Browser proof scripts must pass their own temporary config and tenant paths before application startup.

Before and after a qualification run record, for every configured user database:

- absolute path and existence;
- byte size and nanosecond mtime;
- SHA-256 digest.

An apparent restoration of a changed user database is still a failure. Stop, preserve the evidence, and classify the run as an isolation defect.

## Authorization and sensitive data

Identity comes from the server or trusted proxy in production. Project object and write permissions are rechecked at the domain boundary. A role change during a session must result in a disabled/no-write action or a server `403`; it must not be hidden by a cached capability response. Financial fields are omitted unless the explicit financial capability is present. Signed file access is short-lived and access-checked at issuance.

Uploads are size- and type-validated, SVG external references/scripts are rejected, storage references are opaque tenant references rather than filesystem paths, and CSV exports neutralize formula cells. Operational metrics contain request/command identity, route, status, duration, scan state, and job status only; they do not contain bodies, comments, financial values, tokens, or private architecture descriptions.

## Failure, reconnect, and draft safety

The client is online-first. A write attempted while offline is rejected before `fetch`; it is not queued or replayed. Reconnection invalidates queries so the user sees the current revision before retrying. Failed edits retain their draft and expose retry/discard controls. Published snapshots, delivery acceptance, measurement verification, and architecture approval remain pending until server acknowledgment.

For a write failure, capture the request/command ID and server error code, preserve the local draft, refresh the canonical revision, and retry only after review. Do not force a stale optimistic patch over a newer revision.

## Rate limiting and overload

Mutations and expensive exports/reports are bounded by the application fallback limiter. A rejected request returns `429` and `Retry-After`; clients must show confirmed data and retry only after the indicated interval. Deployments with multiple workers should enforce the same policy at the gateway. Large exports and graph queries must remain bounded or move to an observable background job.

## Outbox, restore, and rollback

Canonical domain events, redacted activity projections, and outbox records are committed in one transaction. A failed transaction must leave none of the three records visible. Delivery of an outbox event is idempotent and independent of the originating task write; a notification failure must not roll back a valid domain edit.

Production schema changes are operator-managed under the configured startup policy. Restore is an explicit, permission-checked, revisioned operation that preserves accepted evidence and audit history. A release evidence bundle must record actual RPO/RTO measurements from a controlled restore/rollback exercise; a backup filename alone is not proof.

## Performance evidence

Generate the deterministic release fixture manifest with:

```text
node scripts/pv1/performance-profiles.mjs --output-dir <evidence-dir>
```

The manifest declares Small, Typical, Large, and Architecture counts and budgets. It is not a measured browser/load result. A valid performance record additionally names the production build, pinned browser, viewport, CPU/memory, network profile, fixture seed, 100 warm interactions, p50/p95/max, DOM bounds, conflicts, throttling, 5xx rate, and projection lag. Unavailable infrastructure is recorded as `NOT_MEASURED` or `BLOCKED` with the reproducible reason; it is never promoted to PASS.
