# OUT-26 Iteration 34 Stage 32 Clone-Proof Decomposition Summary

## Scope

Canonical `/asset` now renders a small golden skeleton composition file:

- `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` (`247` lines)

The previous 5,223-line canonical body was removed from render ownership and replaced with donor/adaptor modules:

- `frontend/src/components/assets/assetGoldenData.ts`
- `frontend/src/components/assets/AssetGoldenFeatureSurfaces.tsx`
- `frontend/src/components/assets/AssetGoldenDialogs.tsx`

Legacy donor reuse was limited to exported asset-specific modals from `frontend/src/components/AssetReal.tsx`:

- `AssetRecordFormModal`
- `NetworkConnectionForm`

No backend routes, `/asset-real` redirect behavior, or Monitoring product code were changed.

## Pre-Implementation Asset Feature Inventory

Recovered from current Asset sources before cutover:

| Feature Surface | Old Source Location | Inventory Notes |
| --- | --- | --- |
| Data source and domain model | `frontend/src/components/AssetReal.tsx`, `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` | Asset inventory comes from `/api/v1/devices?include_deleted=true`; live device lists come from `/api/v1/devices/`; relationships come from `/api/v1/devices/relationships/all`; network topology comes from `/api/v1/networks/connections`. |
| Visible/default/hidden columns | `frontend/src/components/AssetReal.tsx`, `frontend/src/components/assets/assetGoldenColumns.tsx` | Asset, system, type, status, environment, owner, manufacturer, model, OS, IPs, hardware summary, incidents, site, rack, U position, size, power, lifecycle state, updated timestamp, row actions. Default hidden set includes model, OS, IPs, hardware summary, site/rack/U/power, updated timestamp. |
| Filters/search/display/saved views | `frontend/src/components/AssetReal.tsx`, `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` | Search term, existing/purged dataset switch, lens selection, status/system/type/owner quick filters, display density, column toggles, local saved views. |
| Command bar actions | `frontend/src/components/AssetReal.tsx`, `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` | Add asset, import, export snapshot, export template, saved views, display controls, refresh, registry enumerations. |
| Bulk actions | `frontend/src/components/AssetReal.tsx` | Bulk update via repeated `PUT /api/v1/devices/{id}`; lifecycle bulk actions via `POST /api/v1/devices/bulk-action` with `delete`, `restore`, `purge`. |
| Row action buttons | `frontend/src/components/assets/assetGoldenColumns.tsx` | Details, edit, row action menu trigger. |
| Right-click/context menu actions | `frontend/src/components/assets/assetGoldenRowActions.tsx` | Quick console, details, edit, soft delete or purge depending on active dataset. |
| Row click behavior | `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` old body, now recaptured | Row click opens quick-look; double-click opens detail modal. |
| Quick-look behavior | `frontend/src/components/assets/AssetGoldenQuickLookPanel.tsx` | Asset summary, status, environment, primary IP, management URL, hardware summary, edit CTA. |
| Details/right-side drawer/panel behavior | `frontend/src/components/assets/AssetDetailsView.tsx` | Detail modal hosts hardware, secrets, relations, services, network, security, monitoring, metadata tabs plus runbook and maintenance context. |
| Map surface | `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` old body | Asset topology map based on devices, network connections, and relationships. |
| Relationships/dependencies surface | `frontend/src/components/assets/AssetDetailsView.tsx` | CRUD for device relationships inside asset details. |
| History/compare/report surface | `frontend/src/components/AssetReal.tsx`, `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` | Report/list projections existed; asset-specific history/compare was not a first-class independent route in the golden file. |
| Security/secrets/hardware/monitoring panels | `frontend/src/components/assets/AssetDetailsView.tsx` | Preserved inside the detail modal tabs. |
| Import/export behavior | `frontend/src/components/AssetReal.tsx`, `frontend/src/components/shared/OperationalImportExport.ts`, `frontend/src/components/shared/BulkImportModal.tsx` | Import modal for `devices`; template and snapshot CSV download flows. |
| Lifecycle/loading/empty/error states | `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx`, shared operational primitives | Shared operational loading/empty/error states. |
| Modal/form dirty-state behavior | `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx`, `frontend/src/components/AssetReal.tsx` | Old golden asset form had local dirty-state wiring; donor reuse in this run uses exported `AssetRecordFormModal` from `AssetReal`, which preserves the asset form workflow but does not carry the removed local dirty-guard implementation. |
| Known warning/error behavior | Runtime evidence, shared AG Grid builder | Existing AG Grid custom-property warnings and ResizeObserver warning still surface; they were not hidden in this run. |

## Feature Transplant Matrix

| Asset Feature | Old Source Location | New Donor/Adaptor Location | New Skeleton Integration Point | Rendered Proof / Validation Proof | Status |
| --- | --- | --- | --- | --- | --- |
| Canonical route ownership | `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` old monolith | `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` | Direct `/asset` render target via `Assets -> AssetGoldenShellRoute -> AssetGoldenOperationalWorkspace` | Runtime capture `asset_desktop_viewport.png`; route file proof below | Preserved |
| Inventory fetch, lifecycle counts, filters, saved views, bulk operations | Old monolith and `AssetReal.tsx` | `frontend/src/components/assets/assetGoldenData.ts` | `useAssetGoldenWorkspace()` | `npm run typecheck`, `npm run build`, runtime captures | Preserved |
| Golden shell/header/action/status grammar | Old monolith | `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` + `AssetGoldenShellScaffold.tsx` | Top-level scaffold composition | `asset_desktop_full.png`, `asset_960x720.png` | Preserved |
| Asset columns and row actions | Old monolith | Existing donors `assetGoldenColumns.tsx`, `assetGoldenRowActions.tsx` | Column memo and `OperationalRowActionMenu` | `asset_desktop_viewport.png`, `asset_context_menu.png` | Preserved |
| Grid/report/map feature surfaces | Old monolith | `frontend/src/components/assets/AssetGoldenFeatureSurfaces.tsx` | `<AssetGoldenFeatureSurfaces />` | `asset_desktop_viewport.png`, `monitoring_desktop_viewport.png` for grammar comparison | Intentionally normalized |
| Quick-look panel | `AssetGoldenQuickLookPanel.tsx` | Existing donor `AssetGoldenQuickLookPanel.tsx` | `AssetGoldenDialogs.tsx` | `asset_quicklook.png` | Preserved |
| Detail modal with hardware/secrets/relations/services/network/security/monitoring/metadata | `AssetDetailsView.tsx` | Existing donor `AssetDetailsView.tsx` | `AssetGoldenDialogs.tsx` | `asset_details_modal.png` | Preserved |
| Asset create/edit form | Old monolith local asset form; `AssetReal.tsx` asset record modal | Exported donor `AssetRecordFormModal` from `AssetReal.tsx` | `AssetGoldenDialogs.tsx` | Type/build validation; donor export proof in git diff | Intentionally normalized |
| Network link edit/view form | Old monolith local network form; `AssetReal.tsx` network form | Exported donor `NetworkConnectionForm` from `AssetReal.tsx` | `AssetGoldenDialogs.tsx` through detail callbacks | Type/build validation; donor export proof in git diff | Intentionally normalized |
| Service detail/edit modal path | Old monolith service modal helper | `frontend/src/components/assets/AssetGoldenDialogs.tsx` | `AssetServiceDialogs` | Type/build validation | Preserved |
| Import/export workflows | Old monolith, `AssetReal.tsx`, shared import/export utilities | `AssetGoldenDialogs.tsx`, `assetGoldenData.ts` | Toolbar actions and modal wiring | Runtime toolbar captures; `node scripts/stage32_capture.mjs` | Preserved |
| Registry enumeration modal | Old monolith | `AssetGoldenDialogs.tsx` | Toolbar registry action | Type/build validation | Preserved |
| Error/loading/empty states | Shared operational state helpers | `assetGoldenData.ts` + `OperationalDataGrid` | Data-state resolution | Runtime neutral captures | Preserved |
| Modal dirty-state guard | Old monolith local asset form | No new dedicated adaptor extracted | Donor asset form export path | No dedicated runtime proof captured | Not completed |

## Route And Canonical Proof

| Proof Item | Evidence |
| --- | --- |
| Route file import path | `frontend/src/App.tsx` renders `/asset` with `<Assets />`; `frontend/src/components/Assets.tsx` renders `AssetGoldenShellRoute`; `frontend/src/components/assets/AssetGoldenShellRoute.tsx` renders `AssetGoldenOperationalWorkspace`. |
| Canonical render path | `/asset -> Assets -> AssetGoldenShellRoute -> AssetGoldenOperationalWorkspace`. |
| Skeleton line count | `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx`: `247` lines. |
| 700-line skeleton gate | Pass. |
| Old-body ownership audit | Previous 5,223-line canonical file body was deleted and replaced by a small composition layer. Asset-specific state, feature surfaces, and dialogs now live in donor/adaptor modules. |
| `/asset-real` redirect proof | Runtime capture `frontend/stage32-evidence/asset_real_redirect.png` shows final URL `http://127.0.0.1:5173/asset`. |

## Clone-Proof Similarity Audit

Baseline recovery method:

- `git show HEAD:frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx`

Audit command:

- `node scripts/stage32_clone_audit.mjs`

| File | Line Count After | Common Line Count | Overlap % | Character Similarity Proxy | 45% Gate |
| --- | ---: | ---: | ---: | --- | --- |
| `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx` | 240 normalized lines | 61 | 25.42% | `ebc1ac29aaea` | Pass |
| `frontend/src/components/assets/assetGoldenData.ts` | 449 normalized lines | 123 | 27.39% | `db21804ab190` | Pass |
| `frontend/src/components/assets/AssetGoldenFeatureSurfaces.tsx` | 256 normalized lines | 80 | 31.25% | `92bd828deabd` | Pass |
| `frontend/src/components/assets/AssetGoldenDialogs.tsx` | 197 normalized lines | 82 | 41.62% | `18c4ac403aac` | Pass |

## Runtime Evidence Set

Generated artifacts:

- `frontend/OUT-26_ITERATION_34_STAGE32_EVIDENCE.html`
- `frontend/stage32-evidence/`

Captured screenshots:

- `asset_desktop_full.png`
- `asset_desktop_viewport.png`
- `asset_960x720.png`
- `monitoring_desktop_full.png`
- `monitoring_desktop_viewport.png`
- `monitoring_960x720.png`
- `asset_real_redirect.png`
- `asset_context_menu.png`
- `asset_row_click.png`
- `asset_quicklook.png`
- `asset_details_modal.png`

Observed geometry proof from evidence JSON:

- Asset desktop viewport table bounds: `1121 x 334`
- Asset exact `960x720` captured successfully
- Row-action trigger bounds were recorded
- Quick-look bounds were recorded in row-click and quick-look captures
- Detail modal bounds were recorded in `asset_details_modal`

## Validation Ledger

| Validation | Command | Result |
| --- | --- | --- |
| Typecheck | `rtk npm run typecheck` | Pass |
| Test lint | `rtk npm run test:lint` | Pass |
| Build | `rtk npm run build` | Pass |
| Runtime capture harness | `STAGE32_BASE_URL=http://127.0.0.1:5173 node scripts/stage32_capture.mjs` | Pass |
| Clone-proof audit | `node scripts/stage32_clone_audit.mjs` | Pass |
| Product diff audit | `rtk git status --short`, `rtk git diff --stat` | Product-code edits limited to `AssetGoldenOperationalWorkspace.tsx` rewrite plus donor exports in `AssetReal.tsx`; new Stage 32 donor modules and artifacts added. |

## Known Warnings / Residual Gaps

- AG Grid still logs invalid custom `colDef` property warnings for `operationalLockWidth` and `operationalSkipAutoSize`.
- Runtime evidence still shows the pre-existing `ResizeObserver loop completed with undelivered notifications` warning.
- React Router future-flag warning is still present.
- Asset form dirty-close proof was not re-extracted into a new dedicated donor module in this run; donor workflow is preserved via `AssetRecordFormModal`, but the old local dirty-state guard was intentionally not cloned.
