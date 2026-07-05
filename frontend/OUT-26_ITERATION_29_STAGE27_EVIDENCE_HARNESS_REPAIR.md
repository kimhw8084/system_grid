# OUT-26 Iteration 29 Stage 27 Evidence Harness Repair

## Scope

- Prompt type: evidence harness repair only
- Product UI implementation: not performed
- Focused validation command: `rtk npx playwright test tests/assets-golden-evidence.spec.ts --reporter=line`
- Result: `PASS`

## Proof artifacts

- JSON ledger: `frontend/stage27-evidence/stage27-evidence.json`
- Asset desktop full-page: `frontend/stage27-evidence/asset-desktop-fullpage.png`
- Asset desktop viewport: `frontend/stage27-evidence/asset-desktop-viewport.png`
- Asset exact `960x720`: `frontend/stage27-evidence/asset-960x720.png`
- Monitoring desktop full-page: `frontend/stage27-evidence/monitoring-desktop-fullpage.png`
- Monitoring desktop viewport: `frontend/stage27-evidence/monitoring-desktop-viewport.png`
- Monitoring exact `960x720`: `frontend/stage27-evidence/monitoring-960x720.png`
- Redirect proof capture: `frontend/stage27-evidence/asset-real-desktop-viewport.png`

## Route validity proof

| capture | final URL | screenshot | command region | table region | valid |
| --- | --- | --- | --- | --- | --- |
| `asset-desktop-fullpage` | `/asset?search=PW-ASSET-A-1783221665999-gvi0o8` | `1440x1200` full-page | non-null | `535x748` | yes |
| `asset-desktop-viewport` | `/asset?search=PW-ASSET-A-1783221665999-gvi0o8` | `1440x1200` viewport | non-null | `535x748` | yes |
| `asset-960x720` | `/asset?search=PW-ASSET-A-1783221665999-gvi0o8` | `960x720` viewport | non-null | `55x181` | yes |
| `monitoring-desktop-fullpage` | `/monitoring` | `1440x1200` full-page | non-null | `455x653` | yes |
| `monitoring-desktop-viewport` | `/monitoring` | `1440x1200` viewport | non-null | `455x653` | yes |
| `monitoring-960x720` | `/monitoring` | `960x720` viewport | non-null | `641x59` | yes |
| `asset-real-desktop-viewport` | `/asset?search=PW-ASSET-A-1783221665999-gvi0o8` | `1440x1200` viewport | non-null | `535x748` | yes |

## Hard checks

- `/asset-real` redirect-only proof: final pathname resolved to `/asset`
- `/asset` command-region bounds: non-null for desktop full-page, desktop viewport, and exact `960x720`
- `/monitoring` command-region bounds: non-null for desktop full-page, desktop viewport, and exact `960x720`
- Actual `/asset` duplicate-key warnings: `0`
- Actual `/asset` page errors: `0`

## Warning and error classification

Accepted non-blocking messages recorded by the harness:

- `AG Grid: invalid colDef property 'operationalLockWidth' ...`
- `AG Grid: invalid colDef property 'operationalSkipAutoSize' ...`
- `AG Grid: to see all the valid colDef properties please check ...`
- `AG Grid: Since v31, 'columnApi.getColumnState' is deprecated ...`
- `React Router Future Flag Warning ... v7_startTransition`
- `A router only supports one blocker at a time`
- `GLOBAL_ERROR_BEFORE_MOUNT: ResizeObserver loop completed with undelivered notifications. null`

Per-capture warning totals from the JSON ledger:

- `/asset` full-page: `13` warnings, `0` console errors, `0` page errors, `1` request failure
- `/asset` desktop viewport: `13` warnings, `0` console errors, `0` page errors, `2` request failures
- `/asset` exact `960x720`: `13` warnings, `0` console errors, `0` page errors, `1` request failure
- `/monitoring` full-page: `14` warnings, `0` console errors, `0` page errors, `0` request failures
- `/monitoring` desktop viewport: `15` warnings, `0` console errors, `0` page errors, `3` request failures
- `/monitoring` exact `960x720`: `15` warnings, `4` console errors, `0` page errors, `0` request failures
- `/asset-real` redirect capture: `4` warnings, `0` console errors, `0` page errors, `0` request failures

## Detail-panel capture note

- The harness now probes detail-panel geometry without hanging the run.
- `detailPanel` remained `null` in the current route captures, and the JSON ledger preserves the exact selector and failure reason for each capture instead of silently passing or timing out.

## Product-code lock audit

| file | category | visible | layout | behavior | result |
| --- | --- | --- | --- | --- | --- |
| `frontend/tests/assets-golden-evidence.spec.ts` | evidence test | no | no | no product behavior change | PASS |
| `frontend/stage27-evidence/*.png` | proof artifact | n/a | n/a | n/a | PASS |
| `frontend/stage27-evidence/stage27-evidence.json` | proof artifact | n/a | n/a | n/a | PASS |
| `frontend/OUT-26_ITERATION_29_STAGE27_EVIDENCE_HARNESS_REPAIR.md` | proof artifact | n/a | n/a | n/a | PASS |

Final lock result: `PASS`

## Forbidden-file audit

- No changes were made to `frontend/src/components/Assets.tsx`
- No changes were made to `frontend/src/components/assets/AssetsGoldenWorkspace.tsx`
- No changes were made to `frontend/src/components/assets/AssetGoldenShellScaffold.tsx`
- No route file, backend file, or product CSS/layout file was changed
