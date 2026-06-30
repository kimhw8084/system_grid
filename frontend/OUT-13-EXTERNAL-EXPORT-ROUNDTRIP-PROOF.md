# OUT-13 External Export Round-Trip Proof

## 1. Exact root cause

The first External export implementation depended exclusively on browser-readable download response headers:

- `X-SysGrid-Import-Profile`
- `X-SysGrid-Schema-Version`
- `Content-Disposition`

That is fragile across company-domain proxy/OAuth routing. Direct local backend access proves the backend CSV contract can work, but it does not prove the deployed/company-domain runtime because proxy/auth layers may redirect, strip, overwrite, or fail to expose custom download headers to browser JavaScript.

The product fix is therefore not `127.0.0.1`, not External data cleanup, and not Monitoring parity. The fix is an environment-resilient backend-owned export metadata contract.

## 2. Final environment-resilient design

External snapshot export now has two coordinated validation paths:

1. Primary path:
   the CSV download response still returns
   - `Content-Disposition`
   - `X-SysGrid-Import-Profile`
   - `X-SysGrid-Schema-Version`
   - `Access-Control-Expose-Headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version`

2. Fallback path:
   the backend now exposes `GET /api/v1/import/snapshot/external_entities/manifest`, which returns backend-owned metadata:
   - `profile`
   - `schema_version`
   - `filename`
   - `scope`
   - `content_type`
   - `download_url`

The manifest `download_url` includes a backend-issued `export_token`, and the CSV endpoint uses that same token to emit the exact same filename in `Content-Disposition`. That removes the prior race where two independent requests could generate different timestamped filenames.

Frontend behavior:

- fetch and validate manifest first
- download from manifest `download_url`
- if headers are readable, verify they match manifest/backend expectations
- if headers are unreadable but manifest is valid, use manifest metadata and continue safely
- if manifest fetch fails or metadata is invalid, block export with `Export metadata could not be verified.`

Deployment note:

- proxies should still preserve `Content-Disposition`, `X-SysGrid-Import-Profile`, `X-SysGrid-Schema-Version`, and `Access-Control-Expose-Headers`
- the app no longer depends solely on those headers being browser-readable

## 3. Files changed

- `backend/app/api/import_engine.py`
- `backend/test_import_workflows.py`
- `frontend/src/components/shared/OperationalImportExport.ts`
- `frontend/src/components/shared/OperationalImportExport.test.ts`
- `frontend/src/components/External.tsx`
- `frontend/OUT-13-EXTERNAL-EXPORT-ROUNDTRIP-PROOF.md`

Monitoring remains out of scope. Services remains out of scope. No OUT-14 work was done.

## 4. Backend manifest proof

Backend source:

- manifest route: `backend/app/api/import_engine.py`
- manifest builder: `build_snapshot_manifest(...)`
- token validation: `validate_snapshot_export_token(...)`

Manifest contract for External:

```json
{
  "profile": "external_entities",
  "schema_version": "2026-06-external-v1",
  "filename": "SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv",
  "scope": "active",
  "content_type": "text/csv",
  "download_url": "/api/v1/import/snapshot/external_entities?export_token=YYYY-MM-DD_HH-mm-ss"
}
```

Automated proof:

- `backend/test_import_workflows.py::test_external_snapshot_export_exposes_round_trip_headers_for_browser_js`
- `backend/test_import_workflows.py::test_external_snapshot_manifest_and_csv_contract_stay_in_sync`

Those tests assert:

- manifest profile is exactly `external_entities`
- manifest schema is exactly `2026-06-external-v1`
- manifest filename matches `SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv`
- manifest scope is `active`
- manifest content type is `text/csv`
- manifest `download_url` includes the export token
- manifest filename matches CSV `Content-Disposition`
- manifest profile/schema match CSV response headers

## 5. CSV endpoint proof

The CSV endpoint remains `GET /api/v1/import/snapshot/external_entities`.

It still returns:

- `X-SysGrid-Import-Profile: external_entities`
- `X-SysGrid-Schema-Version: 2026-06-external-v1`
- `Content-Disposition: attachment; filename=SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv`
- `Access-Control-Expose-Headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version`

Automated proof:

- `backend/test_import_workflows.py::test_external_snapshot_export_exposes_round_trip_headers_for_browser_js`

That test also rejects app-generated direct backend expose headers of `*` or `**`.

## 6. Frontend validation proof

Frontend source:

- manifest-first helper: `frontend/src/components/shared/OperationalImportExport.ts`
- External wiring: `frontend/src/components/External.tsx`

Automated frontend proof:

- `succeeds when manifest and readable headers are both valid`
- `succeeds when headers are unreadable but manifest is valid`
- `fails explicitly when headers are unreadable and manifest is missing`
- `fails when manifest profile is wrong`
- `fails when manifest schema is wrong`
- `fails when manifest filename is invalid`
- `still rejects readable header mismatches instead of weakening validation`

Failure text when metadata cannot be verified:

```text
Export metadata could not be verified.
```

## 7. Direct local proof

Local direct backend remains secondary proof only.

Targeted automated backend run:

```text
rtk pytest -q backend/test_import_workflows.py -k "external_snapshot_export_exposes_round_trip_headers_for_browser_js or external_snapshot_manifest_and_csv_contract_stay_in_sync or external_snapshot_export_previews_successfully_on_round_trip or monitoring_snapshot_export_uses_round_trip_import_contract"
```

Result:

```text
Pytest: 8 passed
```

This proves:

- manifest and CSV contract agree
- CSV still emits explicit headers
- External snapshot still round-trips into External Import preview

## 8. Browser/company-domain proof

Company-domain/proxy browser proof is still required and is not claimed complete from CLI-only verification.

Reason:

- unauthenticated terminal `curl` reaching GitLab OAuth is not backend failure
- company-domain truth must come from an authenticated browser session or browser Network `Copy as cURL`

Required manual verification still pending:

- authenticated browser
- company-domain frontend/backend path
- `External -> Active -> Export`
- no missing-profile toast
- download succeeds with backend-owned filename

## 9. External Import preview proof

Automated round-trip proof:

```text
backend/test_import_workflows.py::test_external_snapshot_export_previews_successfully_on_round_trip
```

That test exports External snapshot CSV from backend, uploads it to `POST /api/v1/import/preview-file`, and asserts:

- `table_name == external_entities`
- `valid_rows == 1`
- `invalid_rows == 0`
- first row preview status is `VALID`

So the exported CSV remains compatible with External Import preview.

## 10. Test runs

Backend:

```text
Pytest: 8 passed
```

Frontend:

```text
rtk npm run test:unit -- src/components/shared/OperationalImportExport.test.ts
Test Files  1 passed
Tests       7 passed
```

## 11. Remaining risk

The remaining open risk is environment verification, not source-contract coverage.

- The source now no longer depends only on browser-readable custom headers.
- The remaining required proof is authenticated browser verification through the real company-domain/proxy/OAuth path.
- If that path rewrites the response into non-CSV content, frontend now blocks export explicitly instead of silently inventing metadata.

## 12. Status

Still PARTIAL.

Reason:

- code and targeted tests are green
- direct local round-trip is proven
- authenticated browser/company-domain verification is still required before PASS
