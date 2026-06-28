# OUT-8 Parallel C Backend Contract Inventory Audit

This audit is based on read-only inspection of backend source, route mounting, models, tests, and the current Monitoring frontend caller. It does not implement any fix.

## 1. Backend route discovery

### Monitoring API route files

- Primary Monitoring router: `backend/app/api/monitoring.py`
- Router declaration: `APIRouter(prefix="/monitoring", tags=["Monitoring Matrix"])` at `backend/app/api/monitoring.py:12`
- Bulk-action handler: `bulk_action` at `backend/app/api/monitoring.py:803`
- Single-item delete handler: `delete_monitoring_item` at `backend/app/api/monitoring.py:979`
- History restore handler: `restore_monitoring_history_version` at `backend/app/api/monitoring.py:1000`

### Bulk-action endpoint path and method

- Router-local endpoint: `POST /bulk-action` at `backend/app/api/monitoring.py:803`
- App mount prefix: `settings.API_V1_STR = "/api/v1"` at `backend/app/core/config.py:6`
- Router registration: `app.include_router(monitoring.router, prefix=settings.API_V1_STR)` at `backend/app/main.py:138`
- Final mounted bulk endpoint: `POST /api/v1/monitoring/bulk-action`

### Other related Monitoring endpoints affecting restore semantics

- List route including deleted rows: `GET /api/v1/monitoring?include_deleted=true` at `backend/app/api/monitoring.py:638-708`
- Single-item archive route: `DELETE /api/v1/monitoring/{item_id}` at `backend/app/api/monitoring.py:979-997`
- History read route: `GET /api/v1/monitoring/{item_id}/history` at `backend/app/api/monitoring.py:608-636`
- History-version restore route: `POST /api/v1/monitoring/{item_id}/restore/{history_id}` at `backend/app/api/monitoring.py:1000-1055`

### Middleware / prefix factors

- No Monitoring-specific middleware is present in the router file.
- Effective URL is determined by:
  - app prefix `/api/v1` from `backend/app/core/config.py:6`
  - router prefix `/monitoring` from `backend/app/api/monitoring.py:12`
  - route suffix `/bulk-action` from `backend/app/api/monitoring.py:803`

## 2. Accepted action names

Search targets required by prompt: `restore_purged`, `restore`, `restore_snapshots`, `purge`, `delete`, `archive`, `update`, `bulk-action`, `bulk_action`.

| Handler path | Endpoint | Accepted action | Meaning | Supports purged-row restore? | Evidence line/function |
|---|---|---|---|---|---|
| `backend/app/api/monitoring.py` | `POST /api/v1/monitoring/bulk-action` | `delete` | Soft-delete/archive row by setting `is_deleted=True` and `status="Deleted"` | No, this archives but does not recreate a hard-deleted row | `bulk_action()` branch at `backend/app/api/monitoring.py:813-835` |
| `backend/app/api/monitoring.py` | `POST /api/v1/monitoring/bulk-action` | `purge` | Hard-delete row from DB with SQL `delete()` | No, it deletes rows; restore requires a separate action plus snapshot payload | `bulk_action()` branch at `backend/app/api/monitoring.py:836-839` |
| `backend/app/api/monitoring.py` | `POST /api/v1/monitoring/bulk-action` | `restore_purged` | Recreate hard-deleted row from supplied snapshot payload | Yes, specifically intended for purged-row restore | `bulk_action()` branch at `backend/app/api/monitoring.py:840-862`; helper `restore_purged_monitoring_item_from_snapshot()` at `backend/app/api/monitoring.py:539-606` |
| `backend/app/api/monitoring.py` | `POST /api/v1/monitoring/bulk-action` | `restore` | Restore archived row by setting `is_deleted=False` and `status="Existing"` | No for hard-deleted rows; yes only for rows still present in DB | `bulk_action()` branch at `backend/app/api/monitoring.py:862-884` |
| `backend/app/api/monitoring.py` | `POST /api/v1/monitoring/bulk-action` | `update` | Bulk field update with validation and history | No | `bulk_action()` branch at `backend/app/api/monitoring.py:885-961` |
| `backend/app/api/monitoring.py` | `POST /api/v1/monitoring/bulk-action` | `archive` | Not accepted | No | Falls into `Unsupported bulk action` at `backend/app/api/monitoring.py:962-963` |
| `backend/app/api/monitoring.py` | `POST /api/v1/monitoring/bulk-action` | `restore_snapshots` | Not accepted as bulk backend action | No; frontend uses this as a local undo mode that fans out to `PUT /api/v1/monitoring/{id}` | Backend reject path `backend/app/api/monitoring.py:962-963`; frontend local mode at `frontend/src/components/MonitoringGrid.tsx:1571-1578` |
| `backend/app/api/monitoring.py` | `POST /api/v1/monitoring/bulk-action` | `bulk-action` | Not an action string; this is the URL path | No | Route path at `backend/app/api/monitoring.py:803` |
| `backend/app/api/monitoring.py` | `POST /api/v1/monitoring/bulk-action` | `bulk_action` | Not an accepted action string; this is the Python function name | No | Function name `bulk_action` at `backend/app/api/monitoring.py:803`; unsupported otherwise via `:962-963` |

Additional restore path outside bulk actions:

| Handler path | Endpoint | Accepted action | Meaning | Supports purged-row restore? | Evidence line/function |
|---|---|---|---|---|---|
| `backend/app/api/monitoring.py` | `POST /api/v1/monitoring/{item_id}/restore/{history_id}` | history restore endpoint, not bulk action | Restore an existing row to a prior saved history snapshot | No for hard-deleted rows because it first loads the existing row and returns 404 if missing | `restore_monitoring_history_version()` at `backend/app/api/monitoring.py:1000-1055` |

## 3. Purge semantics

Determination: Monitoring purge is mixed.

- Archive/delete is soft delete:
  - `delete` bulk action sets `item.is_deleted = True` and `item.status = "Deleted"` at `backend/app/api/monitoring.py:824-827`
  - single-item `DELETE /{item_id}` does the same at `backend/app/api/monitoring.py:985-988`
  - model keeps row with `is_deleted` flag at `backend/app/models/models.py:307`

- Purge is hard delete:
  - `purge` bulk action executes `delete(models.MonitoringItem).where(models.MonitoringItem.id.in_(ids))` at `backend/app/api/monitoring.py:836-838`
  - post-purge test proves row disappears from `GET /api/v1/monitoring?include_deleted=true` at `backend/test_monitoring_workflows.py:150-152`

- Snapshot-backed restore exists for purged rows:
  - `restore_purged` requires `payload.snapshots` and recreates a `MonitoringItem` row by explicit insert at `backend/app/api/monitoring.py:840-857` and `:569-595`
  - history snapshot table exists at `backend/app/models/models.py:314-324`
  - helper writes a new history entry after recreation at `backend/app/api/monitoring.py:600-605`

Conclusion: day-to-day delete is soft delete; purge is hard delete; purged-row recovery is snapshot-backed and not the same as normal `restore`.

## 4. Restore capability

### Can backend restore a purged Monitoring row today?

Yes, in current source, via bulk action `restore_purged`.

Evidence:

- Accepted in bulk dispatcher at `backend/app/api/monitoring.py:840-862`
- Recreates missing row in `restore_purged_monitoring_item_from_snapshot()` at `backend/app/api/monitoring.py:539-606`
- Covered by backend test `test_monitoring_purge_revert_restores_deleted_row_from_backend_snapshot` at `backend/test_monitoring_workflows.py:98-168`

### Which action name does it accept?

- Hard-deleted row restore: `restore_purged`
- Soft-deleted archived row restore: `restore`
- Existing-row restore from history snapshot: not a bulk action; uses `POST /api/v1/monitoring/{item_id}/restore/{history_id}`

### What data is required to restore a purged row?

- `ids`
- `action: "restore_purged"`
- `payload.snapshots`, which must be a list
- each requested id must have a matching snapshot with `snapshot.id`

Evidence:

- `restore_purged requires payload.snapshots` at `backend/app/api/monitoring.py:841-843`
- missing snapshot for any requested id raises error at `backend/app/api/monitoring.py:849-851`

### Does restore require snapshot data?

- For `restore_purged`: yes, explicitly required
- For `restore`: no snapshot payload; row must still exist and is toggled back to active state
- For history restore endpoint: yes, but the snapshot is stored in backend history and addressed by `history_id`

### Does restore only work for archived/deleted rows still present in DB?

- `restore`: yes. It loads rows by id and flips flags on rows that still exist at `backend/app/api/monitoring.py:863-884`
- history restore endpoint: yes. It calls `load_monitoring_item()` first and 404s if the row no longer exists at `backend/app/api/monitoring.py:1001-1004`
- `restore_purged`: no. It is specifically built for rows no longer present in DB and recreates them at `backend/app/api/monitoring.py:545-550` and `:569-595`

### Does purge remove the row permanently?

Not permanently if a valid snapshot is still available to the caller or recoverable from backend history; permanently for normal row-level restore semantics because the row is removed from the table.

Important nuance from current source:

- `purge` itself does not fetch or preserve snapshots in the request/response contract at `backend/app/api/monitoring.py:836-839`
- Current backend test succeeds because the caller saved a pre-purge deleted-row snapshot from `GET /api/v1/monitoring?include_deleted=true` before purge, then sent it back to `restore_purged` at `backend/test_monitoring_workflows.py:137-159`

## 5. Failure explanation hypothesis

Most likely explanation from current source evidence:

1. The running backend that failed is older or different from the checked-in source.
   - Current source clearly accepts `restore_purged` at `backend/app/api/monitoring.py:840-862`.
   - Current frontend undo code also clearly sends `restore_purged` at `frontend/src/components/MonitoringGrid.tsx:1561-1568`.
   - If runtime still returns `Unsupported bulk action`, the deployed/running handler likely lacks that branch or is pointing at stale code.

2. Less likely, the frontend sent an action string other than the supported set.
   - Backend supports only `delete`, `purge`, `restore_purged`, `restore`, `update` at `backend/app/api/monitoring.py:813-961`.
   - Anything else reaches `Unsupported bulk action` at `backend/app/api/monitoring.py:962-963`.
   - The current frontend Monitoring code does not appear to send `archive`, `bulk_action`, or `restore_snapshots` to the backend bulk endpoint. `restore_snapshots` is only a local undo mode that switches to `PUT /api/v1/monitoring/{id}` at `frontend/src/components/MonitoringGrid.tsx:1571-1578`.

3. Route mismatch is unlikely in current source.
   - Backend mounted route is `/api/v1/monitoring/bulk-action` at `backend/app/main.py:138` plus `backend/app/api/monitoring.py:12` and `:803`.
   - Frontend calls `/api/v1/monitoring/bulk-action` at `frontend/src/components/MonitoringGrid.tsx:1556`, `:1562`, and `:1596`.

4. Backend semantic limitation is also real, even if action mismatch is fixed.
   - Normal `restore` cannot resurrect a hard-deleted row; only `restore_purged` can do that.
   - `restore_purged` requires caller-supplied snapshots. If the runtime flow loses those snapshots, purge revert cannot succeed even on current source.

Best evidence-backed hypothesis:

- Source and frontend currently agree on `restore_purged`.
- Therefore `Unsupported bulk action` most plausibly indicates artifact/running-backend mismatch, not the current checked-in contract.

## 6. Iteration 38 review checklist

The reviewer should demand exact proof of all of the following from the coding lane:

- Changed backend file path:
  - `backend/app/api/monitoring.py`
  - plus any backend startup/mount file if the runtime mismatch involves router registration or stale imports

- Accepted action before/after:
  - explicit diff showing which actions `bulk_action()` accepts before and after
  - if `restore_purged` already exists in source, proof that the runtime artifact actually includes that branch

- Test proof or runtime proof:
  - backend test run covering `backend/test_monitoring_workflows.py::test_monitoring_purge_revert_restores_deleted_row_from_backend_snapshot`
  - if a runtime mismatch is suspected, evidence from the running app/backend environment, not just unit tests

- Request/response evidence:
  - captured request body for purge revert
  - captured backend response body showing whether `action` was `restore_purged`
  - if failure persists, captured response body with exact `detail`

- Row restoration evidence:
  - proof that the purged Monitoring row disappears after purge
  - proof that the same id reappears after revert
  - proof of restored fields, especially `id`, `title`, `status`, `is_deleted`, ownership, and recovery docs
  - proof whether the restored row returns as `Deleted`/`is_deleted=true` or `Existing`/`is_deleted=false`, since current source recreates the purged snapshot as-is

- Snapshot dependency proof:
  - evidence showing where the revert snapshot comes from
  - evidence that `payload.snapshots` includes a matching snapshot for every requested id
  - evidence that missing-snapshot behavior is handled or surfaced correctly

- Runtime artifact proof:
  - if source already contains `restore_purged`, reviewer should require proof the running backend process was restarted or rebuilt against this exact source
  - if not, reviewer should treat any frontend-only success as insufficient

## 7. Final note

This audit is read-only support. It does not implement the fix and cannot close OUT-8.
