# Stage 24 Rendered Parity Evidence

## Result

`FAIL`

The browser never reached the actual `/asset` workspace. The frontend stopped on the bootstrap failure surface at `http://127.0.0.1:4174/asset`.

## Captures produced

1. `frontend/stage24-evidence/asset-bootstrap-blocked-full.png`
   route: `/asset`
   viewport: default browser viewport
   capture: full-page
   screenshot dimensions: `1265x1630`
   document dimensions: `1265x1630`
2. `frontend/stage24-evidence/asset-bootstrap-blocked-960x720.png`
   route: `/asset`
   viewport: `960x720`
   capture: viewport
   screenshot dimensions: `960x720`
   document dimensions at default capture: `1265x1630`

## Measured blocked-state metadata

- URL: `http://127.0.0.1:4174/asset`
- Default viewport used during metadata capture: `1280x720`
- Document bounds: `1265x1630`
- Header/title bounds for `Bootstrap Blocked`: `{ x: 106, y: 122, width: 114, height: 24 }`
- Action/status zone bounds:
  - `Clear Overrides & Retry`: `{ x: 624, y: 226, width: 185, height: 36 }`
  - `Configure API URL`: `{ x: 818, y: 226, width: 145, height: 36 }`
  - `Ignore Error & Launch`: `{ x: 971, y: 226, width: 171, height: 36 }`
- Command bar bounds: absent, because workspace never launched
- Table bounds: absent, because workspace never launched
- First row bounds: absent, because workspace never launched
- Panel bounds: absent, because workspace never launched

## Visible text inventory

- `BOOTSTRAP FAILURE`
- `Connection Failure`
- `STARTUP COULD NOT ESTABLISH A VALID BACKEND, USER, AND TENANT CONTRACT.`
- `Bootstrap Blocked`
- `Backend Diagnostics Live`
- `Active user: admin_root`
- `Failed target: http://127.0.0.1:8000`
- `Configured API Base`
- `http://127.0.0.1:8000`
- `3. For the disposable local seed flow, the expected bootstrap user is haewon.kim.`

## Blocking diagnosis

- The backend health endpoint was live: `GET http://127.0.0.1:8000/api/v1/health -> 200`.
- The frontend bootstrap surface reported a user/tenant contract failure.
- `frontend/src/main.tsx` explicitly recommends setting `localStorage.SYSGRID_USER_ID = "haewon.kim"` for the disposable local environment when this failure occurs.

## Golden primitive / slot ownership summary

- Implemented in code: shared shell, command slots, display panel, saved views panel, anchored bulk panel, operational grid adapter.
- Not render-verified: final header rhythm, command bar rhythm, table placement, row rhythm, panel placement.

## Console warnings / errors

- Browser console log count on reachable blocked screen: `0`
- Duplicate-key warnings observed: `0`
- Page errors observed on blocked screen: `0`

## Route redirect evidence

- Static route lock preserved in `frontend/src/App.tsx`:
  - `/asset` -> `Assets`
  - `/asset-real` -> `LegacyAssetRedirect` -> `/asset`
