# OUT-13 External Export Round-Trip Proof

## 1. Final verdict recommendation

`PARTIAL`

Reason:
- Source and focused tests prove the app is configured to expose the required headers explicitly.
- The currently running backend process on `127.0.0.1:8000` is not serving that updated middleware behavior.
- Evidence points to runtime drift, not a remaining source-level contract bug:
  - checked-in `backend/app/main.py` was modified on `June 30, 2026 07:24:46`
  - the live `uvicorn` process listening on port `8000` started on `June 29, 2026 20:38:58`
- Because browser retest against a refreshed backend process was not completed in this session, this cannot be upgraded to PASS.

## 2. Files changed summary

- `frontend/src/components/External.tsx`
  - Replaced the primary export handler with backend snapshot export for `external_entities`.
  - Made the toolbar export button truthful by enabling it only on the Active tab and clarifying that archived rows and links are excluded.
- `frontend/src/components/shared/OperationalImportExport.ts`
  - Added a shared downloader for import template/snapshot files.
  - Added optional validation for `X-SysGrid-Import-Profile` and `X-SysGrid-Schema-Version` so export failure is actionable instead of ambiguous.
- `frontend/src/components/shared/OperationalImportModal.tsx`
  - Reused the shared downloader for template downloads.
- `frontend/src/components/shared/OperationalImportExport.test.ts`
  - Added focused unit coverage for snapshot download success and missing-schema-header failure.
- `backend/app/main.py`
  - Exposes the download headers required by browser JavaScript: `Content-Disposition`, `X-SysGrid-Import-Profile`, and `X-SysGrid-Schema-Version`.
- `backend/test_import_workflows.py`
  - Added a focused real-endpoint test that verifies the External snapshot response includes the round-trip headers and exposes them through CORS.
- `frontend/OUT-13-EXTERNAL-EXPORT-ROUNDTRIP-PROOF.md`
  - Added this proof artifact.

## 2A. Root cause found

`CORS_HEADER_EXPOSURE_ISSUE`

Confirmed behavior:
- The real snapshot handler already attached:
  - `X-SysGrid-Import-Profile: external_entities`
  - `X-SysGrid-Schema-Version: 2026-06-external-v1`
  - `Content-Disposition: attachment; filename=...`
- Source: `backend/app/api/import_engine.py:1553-1564`

Actual runtime gap:
- App middleware allowed origins, methods, and request headers, but did not expose download headers to browser JavaScript.
- Before this iteration, `CORSMiddleware` was configured without `expose_headers`, so:
  - the browser could complete the request and download the file,
  - but `response.headers.get('X-SysGrid-Import-Profile')` and similar reads could still resolve as missing in frontend code on a cross-origin runtime path.

Fix applied:
- Added `expose_headers=["Content-Disposition", "X-SysGrid-Import-Profile", "X-SysGrid-Schema-Version"]` in `backend/app/main.py:75-79,124-130`

Observed Iteration 03 runtime mismatch:
- The live backend response on `http://127.0.0.1:8000/api/v1/import/snapshot/external_entities` still omitted `Access-Control-Expose-Headers` when queried with:

```bash
rtk proxy curl -si -H 'Origin: http://127.0.0.1:5173' -H 'X-User-Id: haewon.kim' -H 'X-Tenant-Id: 1' 'http://127.0.0.1:8000/api/v1/import/snapshot/external_entities'
```

- The same live response still included:
  - `content-disposition: attachment; filename=SYSGRID_external_entities_Snapshot.csv`
  - `x-sysgrid-schema-version: 2026-06-external-v1`
  - `x-sysgrid-import-profile: external_entities`
- But it did **not** include `access-control-expose-headers`.

Why this is the most likely explanation:
- Installed middleware supports `expose_headers`.
- Source passes the explicit header names.
- Focused tests pass against the app object.
- The live process predates the file change, so the running server is very likely stale relative to source.

## 3. Existing import contract summary

Profile name:
- `external_entities`

Schema endpoint:
- `GET /api/v1/import/schema/external_entities`
- Source: `backend/app/api/import_engine.py:1436-1454`
- External UI caller: `frontend/src/components/shared/OperationalImportModal.tsx:202-209`

Preview endpoint:
- File preview: `POST /api/v1/import/preview-file`
- Row preview: `POST /api/v1/import/preview-rows?table_name=external_entities`
- Source: `frontend/src/components/shared/OperationalImportModal.tsx:298-319`

Execute endpoint:
- `POST /api/v1/import/execute?table_name=external_entities`
- Source: `frontend/src/components/shared/OperationalImportModal.tsx:329-349`

Required metadata/version rules:
- Shared workspace contract requires schema-versioned round-trip import/export: `frontend/src/components/shared/OperationalWorkspace.ts:79`
- Backend schema response includes `schema_version` for `external_entities`: `backend/app/api/import_engine.py:1441-1453`
- Backend template response sets:
  - `X-SysGrid-Schema-Version: 2026-06-external-v1`
  - `X-SysGrid-Import-Profile: external_entities`
  - Source: `backend/app/api/import_engine.py:1498-1508`
- Backend snapshot response sets:
  - `X-SysGrid-Schema-Version: 2026-06-external-v1`
  - `X-SysGrid-Import-Profile: external_entities`
  - Source: `backend/app/api/import_engine.py:1553-1564`

## 4. Previous External export behavior

Previous behavior was ad hoc AG Grid CSV from the current table viewport, not the shared import/export contract.

Exact source-backed evidence:
- Audit inventory recorded the old path as `gridRef.current.api.exportDataAsCsv(...)` in `frontend/src/components/External.tsx`: `frontend/OUT-14-EXTERNAL-WORKSPACE-LOCK-AUDIT.md:111`

## 5. New External export behavior

Endpoint/helper used:
- Frontend handler now calls `downloadOperationalImportFile({ tableName: 'external_entities', kind: 'snapshot', expectedProfile: 'external_entities', requireSchemaHeaders: true })`
- Source:
  - `frontend/src/components/External.tsx:2146-2160`
  - `frontend/src/components/shared/OperationalImportExport.ts:50-79`

File type:
- CSV snapshot download from backend `GET /api/v1/import/snapshot/external_entities`

Schema/profile metadata:
- Frontend now requires the response to include:
  - `X-SysGrid-Import-Profile=external_entities`
  - `X-SysGrid-Schema-Version=<non-empty>`
- Browser JavaScript can now read:
  - `response.headers.get('X-SysGrid-Import-Profile')`
  - `response.headers.get('X-SysGrid-Schema-Version')`
  - `response.headers.get('Content-Disposition')`
  because the backend CORS middleware now exposes those headers.
- Missing or mismatched metadata throws an actionable error:
  - `Export returned import profile "..." instead of "external_entities"`
  - `Export did not include schema version metadata`
- Source: `frontend/src/components/shared/OperationalImportExport.ts:32-47`

Truthfulness of export scope:
- Active entities only: yes
  - Backend snapshot excludes deleted rows when `model.is_deleted` exists: `backend/app/api/import_engine.py:1536-1539`
- Archived entities included: no
- Links included: no
  - Export is `external_entities` only; no link query is part of the snapshot path.
- Hidden metadata fields included: backend model columns are exported except `id`, `created_at`, `updated_at`, `created_by_user_id`
  - Source: `backend/app/api/import_engine.py:1532-1547`
- Selected rows only: no
- Filtered rows only: no
- Visible viewport columns only: no

How ambiguity is prevented:
- Export button is disabled outside the Active tab with explicit titles:
  - Deleted tab: archived rows are not included
  - Links tab: link rows are not included
  - Source: `frontend/src/components/External.tsx:2178-2182`, `2800-2804`
- Success toast states what is and is not in the snapshot:
  - Source: `frontend/src/components/External.tsx:2155-2157`

## 6. Backend/source truth

Existing endpoint used:
- `GET /api/v1/import/snapshot/external_entities`
- Source: `backend/app/api/import_engine.py:1512-1564`

Why this is the correct contract:
- It is already under the shared import/export engine.
- It already tags the export with `external_entities` profile and `2026-06-external-v1`.
- It exports from backend model state, not grid viewport state.

No new backend architecture was added in this iteration.

Header behavior before/after:
- Before:
  - Snapshot handler sent the profile/version headers.
  - Browser-visible JS header reads could fail on cross-origin runtime paths because `Access-Control-Expose-Headers` did not include those names.
  - Resulting user-visible failure matched: `export returned import profile missing instead of external_entities`.
- After:
  - Snapshot handler still sends the same round-trip headers.
  - Middleware now exposes `Content-Disposition`, `X-SysGrid-Import-Profile`, and `X-SysGrid-Schema-Version` to browser JS.
  - Focused endpoint test verifies the real response now includes `access-control-expose-headers` with those values: `backend/test_import_workflows.py:426-470`

Live runtime evidence from Iteration 03:
- Current live response from `127.0.0.1:8000` still omits `Access-Control-Expose-Headers`.
- Current live process evidence:
  - `backend/app/main.py` modified: `Jun 30 07:24:46 2026`
  - listening `uvicorn` process start: `Mon Jun 29 20:38:58 2026`
- This is the exact configured-app vs running-response mismatch for this iteration.

## 7. Round-trip proof

Source-backed round-trip chain:
- External import modal still opens on `tableName="external_entities"`:
  - `frontend/src/components/External.tsx:3624-3629`
- Import modal resolves schema from `/api/v1/import/schema/${tableName}`:
  - `frontend/src/components/shared/OperationalImportModal.tsx:202-209`
- Import modal previews through `/api/v1/import/preview-file` or `/api/v1/import/preview-rows?table_name=${tableName}`:
  - `frontend/src/components/shared/OperationalImportModal.tsx:298-319`
- Import modal executes through `/api/v1/import/execute?table_name=${tableName}`:
  - `frontend/src/components/shared/OperationalImportModal.tsx:329-349`
- Backend test already proves the `external_entities` contract end to end:
  - schema success: `backend/test_import_workflows.py:310-322`
  - template metadata success: `backend/test_import_workflows.py:324-335`
  - preview success/failure classification: `backend/test_import_workflows.py:337-379`
  - execute success: `backend/test_import_workflows.py:381-410`
  - snapshot export metadata and content: `backend/test_import_workflows.py:417-423`

Conclusion:
- External export now emits the same domain/profile family the External import flow already consumes.
- This session did not run an in-browser upload of the exported snapshot back into the import modal, so the proof remains source-backed plus backend-tested rather than UI-runtime-proven.

## 8. Explicit non-changes

- No saved-view fix
- No OUT-14 broad lock work
- No lifecycle/data-state changes
- No compare modal changes
- No table interaction changes
- No floating-panel changes
- No route changes
- No External-specific feature deletion
- No Services/Network/Assets/Vendors/FAR/Research changes

## 9. Tests/checks run

Command:

```bash
rtk npm run test:unit -- src/components/shared/OperationalImportExport.test.ts
```

Result:
- Passed
- `1` test file passed
- `2` tests passed

Command:

```bash
rtk pytest -q backend/test_import_workflows.py -k "external_import_schema_template_preview_and_execute or external_snapshot_export_exposes_round_trip_headers_for_browser_js"
```

Result:
- Passed
- `4 passed`

Command:

```bash
rtk proxy curl -si -H 'Origin: http://127.0.0.1:5173' -H 'X-User-Id: haewon.kim' -H 'X-Tenant-Id: 1' 'http://127.0.0.1:8000/api/v1/import/snapshot/external_entities'
```

Result:
- Live runtime response included:
  - `content-disposition`
  - `x-sysgrid-import-profile`
  - `x-sysgrid-schema-version`
- Live runtime response did **not** include:
  - `Access-Control-Expose-Headers`

Command:

```bash
stat -f '%Sm %N' backend/app/main.py && rtk proxy ps -o lstart= -p <backend-pid>
```

Result:
- `backend/app/main.py` modified: `Jun 30 07:24:46 2026`
- live backend process start: `Mon Jun 29 20:38:58 2026`
- Interpretation: the checked-in middleware fix is newer than the currently running backend process.

## 10. Human-eye validation checklist

- [ ] Export External active entities.
- [ ] In browser DevTools Network, confirm the request path is `/api/v1/import/snapshot/external_entities`.
- [ ] Inspect the response headers and confirm:
  - `X-SysGrid-Import-Profile=external_entities`
  - `X-SysGrid-Schema-Version=2026-06-external-v1`
  - `Content-Disposition=attachment; filename=...`
  - `Access-Control-Expose-Headers` includes those names.
- [ ] Confirm `Access-Control-Expose-Headers` is exactly explicit names, not empty, `*`, or `**`:
  - `Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version`
- [ ] Open External import and run import preview on the exported file.
- [ ] Confirm the domain/profile is recognized as `external_entities`.
- [ ] Confirm validation/preview messages are actionable if the file is modified into an invalid state.
- [ ] Confirm existing import still opens and behaves normally.
- [ ] Confirm the export button is disabled on Archived and Links tabs and that the tooltip/title explains why.

## 10A. Explicit non-scope confirmation

- No OUT-14 broad work
- No saved-view Links-tab fix
- No modal work
- No table work
- No floating-panel work
- No lifecycle/data-state work
- No route work
- No other workspace work

## 11. Lesson learned

The safe fix was not a new export format. The backend already had the correct `external_entities` snapshot contract, so the narrow solution was to wire the frontend to that endpoint and enforce the existing profile/schema headers at download time.

## 12. Next prompt rule

If a follow-up is needed, keep it narrow:
- either restart the backend that actually serves `127.0.0.1:8000` and then perform browser-side human validation of the new External export/import preview round-trip,
- or, if the product needs archived-entity export or link export, treat that as a separate contract decision and do not smuggle it into OUT-14 lock work.
