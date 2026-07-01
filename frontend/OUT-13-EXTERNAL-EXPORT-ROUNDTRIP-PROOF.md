# OUT-13 External Export Round-Trip Proof

## 1. Current status

Status is still `PARTIAL`.

Reason:

- External export now uses a backend-owned manifest plus strict CSV/header validation.
- Settings now includes an in-app `System Diagnostics` surface with an `External Export Contract` doctor.
- Automated frontend/backend tests cover the source contract and browser-runtime diagnostics logic.
- Deployment-readiness hardening now adds:
  - environment matrix documentation
  - backend `/api/v1/readiness`
  - startup/runtime validation for API base, origin mismatch, redirect/login HTML, wildcard expose headers, and stale bundle risk
  - upgraded multi-card System Diagnostics reporting
- Iteration 13 removes the diagnostics exposure P0:
  - `startup-check` is now sanitized and safe-by-design for a team pilot
  - no raw DB URLs, tenant DB URLs, file paths, env paths, or sensitive identity values are returned
- Real company-domain runtime proof is still pending until the user can run the diagnostics card from the work environment.

Temporary conclusion stance:

- `READY FOR WORK-DOMAIN VERIFICATION; TEMPORARILY CONCLUDED FOR DEPLOYMENT TRANSITION`
- not Done
- remaining closure gate is the copied work-domain diagnostics report

`127.0.0.1` success is diagnostic only. It is not the final product contract.

External remains the golden candidate before spreading the contract to Monitoring or Services.

## 2. Root cause

The original External export depended exclusively on browser-readable download response headers:

- `X-SysGrid-Import-Profile`
- `X-SysGrid-Schema-Version`
- `Content-Disposition`

That is fragile across proxy/OAuth/company-domain routing because those layers may redirect, strip, overwrite, or fail to expose custom download headers to browser JavaScript.

The product fix is an environment-resilient backend-owned export metadata contract:

- backend manifest endpoint for External
- manifest-driven CSV download URL
- strict frontend validation
- readable headers used when available
- manifest fallback used when headers are unreadable
- explicit failure when metadata cannot be verified

## 3. Environment-resilient design

External snapshot export now has two coordinated validation paths:

1. Primary path
   CSV response returns:
   - `Content-Disposition`
   - `X-SysGrid-Import-Profile`
   - `X-SysGrid-Schema-Version`
   - `Access-Control-Expose-Headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version`

2. Fallback path
   `GET /api/v1/import/snapshot/external_entities/manifest` returns backend-owned metadata:
   - `profile`
   - `schema_version`
   - `filename`
   - `scope`
   - `content_type`
   - `download_url`

The manifest `download_url` contains a backend-issued `export_token`, and the CSV route uses that same token to emit the same filename in `Content-Disposition`.

## 4. How to run in-app diagnostics

Open:

- `Settings`
- `System Diagnostics`
- click `Run All Checks`
- click `Copy Full Report`

The diagnostics surface now records:

- Environment Summary
- Backend Reachability
- External Export Contract
- Transport / Preflight Risk

The External Export Contract card still runs from the actual browser runtime and records:

- frontend origin
- configured API base
- manifest URL
- CSV URL
- import preview URL
- manifest status
- CSV status
- preview status
- redirect detection
- readable-header status
- manifest fallback usage
- transport classification
  - whether custom identity headers are being sent
  - whether `Content-Type` is being sent on bodyless `GET`
  - whether the request is likely simple or likely preflighted
  - whether wildcard expose headers were returned

The new Environment Summary and Backend Reachability cards also record:

- API base URL validity
- frontend origin mismatch
- readiness/startup-check reachability
- redirect/login HTML where JSON was expected
- stale frontend bundle risk when backend version hint is available

The backend `startup-check` payload is now limited to safe deployment facts:

- booleans
- counts
- sanitized origins
- warning list
- import/export contract summary

## 5. What verdicts mean

`PASS` means:

- manifest is valid
- CSV response is valid
- profile/schema/filename contract is verified
- import preview passes or otherwise returns a valid success signal
- environment is safe for External round-trip export

`PARTIAL` means:

- contract is still safe
- one layer is degraded but not broken
- the expected example is unreadable custom headers with valid manifest fallback

`FAIL` means:

- backend contract could not be safely verified
- or the request never reached the SysGrid backend contract
- or the response content/profile/schema/filename contract is wrong

## 6. Source and automated proof

Backend proof:

- manifest route and CSV route agree on profile/schema/filename
- CSV route still emits explicit expose headers
- app-generated direct backend expose headers are not `*` or `**`
- exported CSV still previews through External Import

Frontend proof:

- manifest-first export helper
- External runtime wiring
- in-app diagnostics runner for browser-runtime verification
- in-app diagnostics panel tests
- transport tests for bodyless `GET`/`HEAD`

## 7. Sample PASS report

```text
External Export Contract: PASS

Frontend Origin: https://frontend.example.com
API Base: https://api.example.com
Environment Mode: cross-origin company-domain proxy
Manifest URL: https://api.example.com/api/v1/import/snapshot/external_entities/manifest
CSV URL: https://api.example.com/api/v1/import/snapshot/external_entities?[redacted-query]
Preview URL: https://api.example.com/api/v1/import/preview-file
Manifest Status: 200
CSV Status: 200
Preview Status: 200
Redirect Detected: no
Headers Readable: yes
Manifest Fallback Used: no
Manifest Request: method=GET; custom_identity_headers=yes; content_type=none; likely_simple=no; likely_preflight=yes
Manifest Request Notes: cross-origin request; sends X-User-Id/X-Tenant-Id; does not send Content-Type; likely triggers OPTIONS preflight; custom identity headers can force preflight
CSV Request: method=GET; custom_identity_headers=yes; content_type=none; likely_simple=no; likely_preflight=yes
CSV Request Notes: cross-origin request; sends X-User-Id/X-Tenant-Id; does not send Content-Type; likely triggers OPTIONS preflight; custom identity headers can force preflight
Filename: SysGrid_External_2026-06-30_15-11-09.csv
Schema Version: 2026-06-external-v1
Profile: external_entities
Layer: Verified
Manifest: PASS — Manifest returned a valid backend-owned External export contract.
CSV Download: PASS — CSV endpoint returned successful CSV content from the configured API base.
Headers: PASS — Custom headers were readable and matched the backend contract.
Filename Check: PASS — Filename validated as SysGrid_External_2026-06-30_15-11-09.csv.
Import Preview: PASS — Exported CSV previewed successfully through External Import.
Overall: PASS — Environment is safe for External round-trip export.
Recommended Fix: No fix required.
```

## 8. Sample PARTIAL report

This is the expected safe fallback case when custom headers are unreadable but manifest validation is still valid.

```text
External Export Contract: PARTIAL

Frontend Origin: https://frontend.example.com
API Base: https://api.example.com
Environment Mode: cross-origin company-domain proxy
Manifest URL: https://api.example.com/api/v1/import/snapshot/external_entities/manifest
CSV URL: https://api.example.com/api/v1/import/snapshot/external_entities?[redacted-query]
Preview URL: https://api.example.com/api/v1/import/preview-file
Manifest Status: 200
CSV Status: 200
Preview Status: 200
Redirect Detected: no
Headers Readable: no
Manifest Fallback Used: yes
Manifest Request: method=GET; custom_identity_headers=yes; content_type=none; likely_simple=no; likely_preflight=yes
Manifest Request Notes: cross-origin request; sends X-User-Id/X-Tenant-Id; does not send Content-Type; likely triggers OPTIONS preflight; custom identity headers can force preflight
CSV Request: method=GET; custom_identity_headers=yes; content_type=none; likely_simple=no; likely_preflight=yes
CSV Request Notes: cross-origin request; sends X-User-Id/X-Tenant-Id; does not send Content-Type; likely triggers OPTIONS preflight; custom identity headers can force preflight
Filename: SysGrid_External_2026-06-30_15-11-09.csv
Schema Version: 2026-06-external-v1
Profile: external_entities
Layer: Headers / manifest fallback
Manifest: PASS — Manifest returned a valid backend-owned External export contract.
CSV Download: PASS — CSV endpoint returned successful CSV content from the configured API base.
Headers: PARTIAL — Custom headers were unreadable; manifest fallback was used.
Filename Check: PASS — Filename validated as SysGrid_External_2026-06-30_15-11-09.csv.
Import Preview: PASS — Exported CSV previewed successfully through External Import.
Overall: PARTIAL — Headers were unreadable, but manifest fallback validated the External export contract and kept the environment safe for round-trip export.
Recommended Fix: Proxy should still preserve and expose the custom export headers, but the manifest fallback is currently protecting the contract.
```

## 9. Sample FAIL report

OAuth/proxy redirect example:

```text
External Export Contract: FAIL

Frontend Origin: https://frontend.example.com
API Base: https://api.example.com
Environment Mode: cross-origin company-domain proxy
Manifest URL: https://api.example.com/api/v1/import/snapshot/external_entities/manifest
CSV URL: https://api.example.com/api/v1/import/snapshot/external_entities
Preview URL: https://api.example.com/api/v1/import/preview-file
Manifest Status: 200
CSV Status: NOT_RUN
Preview Status: NOT_RUN
Redirect Detected: yes
Headers Readable: no
Manifest Fallback Used: no
Manifest Request: method=GET; custom_identity_headers=yes; content_type=none; likely_simple=no; likely_preflight=yes
Manifest Request Notes: cross-origin request; sends X-User-Id/X-Tenant-Id; does not send Content-Type; likely triggers OPTIONS preflight; custom identity headers can force preflight
CSV Request: method=GET; custom_identity_headers=yes; content_type=none; likely_simple=no; likely_preflight=yes
CSV Request Notes: cross-origin request; sends X-User-Id/X-Tenant-Id; does not send Content-Type; likely triggers OPTIONS preflight; custom identity headers can force preflight
Filename: missing
Schema Version: missing
Profile: missing
Layer: Auth / proxy routing
Manifest: FAIL — Manifest request redirected before valid JSON contract was returned.
CSV Download: PARTIAL — Skipped because manifest failed.
Headers: PARTIAL — Skipped because manifest failed.
Filename Check: PARTIAL — Skipped because manifest failed.
Import Preview: PARTIAL — Import preview not run.
Overall: FAIL — Manifest request was redirected to OAuth or a login page before reaching the SysGrid JSON contract.
Recommended Fix: Ensure the authenticated browser session can access the API route, or configure proxy/API base so the app can reach the backend manifest endpoint.
```

## 10. Transport / preflight note

The diagnostics report now states whether each manifest/CSV request is likely simple or likely preflighted.

Current behavior:

- bodyless `GET` and `HEAD` no longer send `Content-Type: application/json`
- diagnostics still classify that `X-User-Id` and `X-Tenant-Id` may force OPTIONS preflight in cross-origin environments
- identity headers were not removed globally in this iteration
- diagnostics now also fail if the runtime returns wildcard `Access-Control-Expose-Headers`

## 11. Deploy-readiness status

Deploy-readiness remains `PARTIAL`, but it is materially improved.

Current source-level readiness now includes:

- deployment environment matrix
- safe health/readiness endpoints
- runtime API-base and frontend-origin validation
- backend JSON redirect/login detection
- stale frontend bundle mismatch detection when backend hint is available
- pilot-focused diagnostics copy/export flow
- pilot checklist, rollback plan, and deployment risk register
- sanitized startup-check payload safe for team-pilot diagnostics capture
- final temporary-conclusion handoff artifact for transition to the next deployment/data-durability goal

## 12. Environment matrix summary

- Local direct:
  supported when frontend and backend are both local and the browser can reach the backend directly or through a local proxy.
- Company-domain dev:
  supported when the API base points to a real company-routed backend or same-origin proxy, not loopback.
- Production-like:
  supported in source contract terms, but still waiting on real work-domain runtime proof.

## 13. Company-domain runtime proof

Company-domain proof is still pending.

That is expected in this iteration because the user cannot currently test in the work environment.

When work access is available again, the intended source of truth is:

- `Settings`
- `System Diagnostics`
- `Run All Checks`
- `Copy Full Report`

The copied report should then be attached as the runtime proof artifact.

## 14. What remains blocked only by real work-domain test

Only these final proof points remain blocked on the real work environment:

- exact company-domain frontend origin seen by the browser
- exact backend/API routing shape after company proxy rules
- whether OAuth or login redirect occurs on readiness/startup-check/export routes
- whether the company route preserves explicit expose headers or relies on manifest fallback
- whether the deployed frontend/backend build versions match in the live environment

The remaining blocker is no longer diagnostics exposure. That P0 is fixed. The remaining blocker is real work-domain runtime proof.

## 15. Exact next user action when back at work

1. Open the real company-domain SysGrid URL in the work browser.
2. Go to `Settings -> System Diagnostics`.
3. Click `Run All Checks`.
4. Click `Copy Full Report`.
5. Save the copied report and one screenshot of the diagnostics cards.
6. If External export is being verified at the same time, run one export/import-preview round trip and attach the result with the report.

## 16. Test runs

Backend:

```text
Pytest: 8 passed
```

Frontend:

```text
rtk npm run test:unit -- src/components/settings/externalExportDiagnostics.test.ts src/components/settings/SystemDiagnosticsPanel.test.tsx src/components/shared/OperationalImportExport.test.ts src/api/apiClient.test.ts
Test Files  4 passed
Tests       39 passed
```

Frontend build:

```text
rtk npm run build
vite build: success
```

## 13. Final status

Still `PARTIAL`.

Reason:

- source and in-app diagnostics are materially hardened
- startup-check diagnostics are now sanitized and safe for team pilot exposure
- direct local and mocked browser-runtime proof are in place
- real company-domain `System Diagnostics -> Copy Full Report` evidence is still pending
