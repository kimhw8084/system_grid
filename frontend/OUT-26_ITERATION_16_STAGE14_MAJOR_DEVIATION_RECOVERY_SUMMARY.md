# OUT-26 Iteration 16 Stage 14 Major-Deviation Recovery Summary

## Metadata
- issue: `OUT-26 / Run 19 — Assets Golden Template Implementation`
- iteration: `16`
- stage: `14`
- prompt type: `targeted recovery`
- date: `2026-07-03`
- worker result: `PARTIAL`

## Context
- Stage 12 baseline was manually accepted and preserved as a hard lock.
- Stage 13 audit passed as an audit but failed the product no-deviation bar.
- Stage 14 was limited to `ND-001` through `ND-005`.

## Files inspected
- Stage 13 proof:
  - `frontend/OUT-26_ITERATION_15_STAGE13_NO_DEVIATION_GOLDEN_AUDIT_SUMMARY.md`
  - `frontend/OUT-26_ITERATION_15_STAGE13_NO_DEVIATION_LEDGER.md`
  - `frontend/OUT-26_ITERATION_15_STAGE13_NO_DEVIATION_RENDERED_EVIDENCE.md`
- Canonical Assets / route lock:
  - `frontend/src/components/Assets.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/components/AssetReal.tsx`
  - `frontend/src/components/assets/AssetDetailsView.tsx`
- Shared operational contracts and primitives:
  - `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
  - `frontend/src/components/shared/OperationalGridInteractions.ts`
  - `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
  - `frontend/src/components/shared/OperationalDataGrid.tsx`
  - `frontend/src/components/shared/WorkspaceCommandBar.tsx`
  - `frontend/src/components/shared/LayoutPrimitives.tsx`
  - `frontend/src/components/shared/OperationalWorkspace.ts`
  - `frontend/src/components/shared/OperationalBulkContract.ts`
  - `frontend/src/components/shared/OperationalDataState.ts`
  - `frontend/src/components/shared/OperationalRowActionMenu.tsx`
  - `frontend/src/components/shared/OperationalImportExport.ts`
- Golden reference:
  - `frontend/src/components/MonitoringGrid.tsx`

## Files changed
- implementation files:
  - `frontend/src/components/Assets.tsx`
  - `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- proof files:
  - `frontend/OUT-26_ITERATION_16_STAGE14_MAJOR_DEVIATION_RECOVERY_SUMMARY.md`
  - `frontend/OUT-26_ITERATION_16_STAGE14_MAJOR_DEVIATION_RENDERED_EVIDENCE.md`
  - `frontend/OUT-26_ITERATION_16_STAGE14_MAJOR_DEVIATION_RESOLUTION_LEDGER.md`
  - `frontend/OUT-26_ITERATION_16_STAGE14_MAJOR_DEVIATION_RENDERED_EVIDENCE.html`
- shared-file compatibility:
  - `OperationalWorkspaceHooks.ts` received one additive shared hook, `useOperationalWorkspaceViewState(...)`.
  - Existing hook behavior was not changed for unrelated workspaces.

## Per-finding recovery matrix
| Finding | Stage 13 problem | Stage 14 recovery | Evidence | Final status |
| --- | --- | --- | --- | --- |
| `ND-001` | `Assets.tsx` still owned too much shell/state/overlay composition. | Moved view-state ownership into a shared hook, moved overlay ownership into the shared overlay controller, and moved bulk flyout mounting to `OperationalAnchoredPanel` + shared flyout grammar. | Shared hook and overlay wiring in `Assets.tsx` and `OperationalWorkspaceHooks.ts`; rendered shell remains mounted. | `PARTIAL` |
| `ND-002` | Saved/display state was still ad hoc and active view was not persisted safely. | Added shared `useOperationalWorkspaceViewState(...)`; persisted working state, active view id, saved views, and kept route grammar on `search/tab/lens/view` with refresh-safe restore. | Refresh preserves `?search=FINANCE-S-001`; display/views panels render from shared state path. | `PARTIAL` |
| `ND-003` | Row-action trigger also opened quick look. | Stopped relying on selection to open quick look, guarded row-body click handling against button-origin clicks, and kept row-action opening isolated. | Rendered evidence shows row-action menu open with `quickLookOpen: false` and `selectedRows: 0`; row-body click still opens quick look. | `PASS` |
| `ND-004` | Bulk actions stayed bespoke/local. | Replaced local absolute flyout with anchored shared bulk grammar using `OperationalAnchoredPanel`, `WorkspaceFloatingPanel`, and `WorkspaceFlyoutActionCard`; added clear-selection control and preserved asset-specific actions. | Rendered evidence shows `Bulk actions / 2 assets selected / Clear Selection / Compare Selected / Set Status... / Set Environment... / Bulk Delete`. | `PASS` |
| `ND-005` | `960x720` layout collapsed grid usability. | Reduced command-bar wrapping pressure, moved bulk control into aligned toolbar grammar, made lens bar horizontally scrollable, and kept top-right scope/bulk/add controls readable. | `960x720` evidence shows grid visible at `639x104`, `visibleRowCount: 12`, Existing/Purged still top-right, controls still accessible. | `PARTIAL` |

## Stage 12 baseline preservation checklist
- `/asset` table/grid visible: `PASS`
- entity rows visible when data exists: `PASS`
- Existing/Purged remains in top-right header/command area: `PASS`
- random badge remains gone: `PASS`
- default `/asset` does not collapse into blank content: `PASS`
- empty state only when truthfully empty/filtered empty: `PASS`

## Route-lock preservation checklist
- `/asset` remains canonical: `PASS`
- `/asset` remains backed by `Assets`: `PASS`
- `/asset-real` remains redirect-only to `/asset`: `PASS`
- `AssetReal.tsx` remains non-canonical: `PASS`
- `AssetReal.tsx` not promoted into route ownership: `PASS`
- sidebar/navigation remains canonical: `PASS`

## Asset-domain slot preservation checklist
- quick look: `PASS`
- map: `PASS`
- details/forms: `PASS`
- relationships/dependencies: `PASS`
- service/network panels and modals: `PASS`
- history/compare/report: `PASS`
- security/secrets/hardware/monitoring panels: `PASS`
- row actions: `PASS`
- bulk actions: `PASS`
- display/saved views: `PASS`
- import/export: `PASS`
- lifecycle states: `PASS`
- modal dirty-state: `PASS`
- route persistence: `PARTIAL`

## Rendered evidence summary
- desktop `/asset` baseline:
  - viewport `1280x720`
  - Existing rect `{ x: 1061, y: 120, width: 81, height: 36 }`
  - Purged rect `{ x: 1146, y: 120, width: 75, height: 36 }`
  - Bulk Actions rect `{ x: 942, y: 249, width: 138, height: 36 }`
  - grid rect `{ x: 273, y: 448, width: 959, height: 207 }`
  - visible rows `21`
- row-action isolation:
  - menu rect `{ x: 686, y: 298, width: 578, height: 225 }`
  - menu text `Row actions FINANCE FINANCE-S-001 Quick Console Access View Details Edit Configuration Soft Delete`
  - `quickLookOpen: false`
  - `selectedRows: 0`
- intended quick-look path:
  - row-body click still yields `quickLookOpen: true`
- bulk grammar:
  - bulk panel rect `{ x: 928, y: 293, width: 340, height: 287 }`
  - visible text `Bulk actions 2 assets selected Clear Selection Compare Selected Set Status... Set Environment... Bulk Delete`
- state / refresh:
  - filter route persisted as `/asset?search=FINANCE-S-001`
  - refresh preserved the same URL and filtered row sample
  - display panel and saved views panel both rendered from current workspace state
- route lock:
  - `/asset-real` redirected to `/asset`
- `960x720` responsive:
  - default route `/asset`
  - grid rect `{ x: 273, y: 551, width: 639, height: 104 }`
  - visible rows `12`
  - Existing/Purged remained at the top-right

## Validation commands/results
- `rtk npm run typecheck`: `PASS`
- `rtk npm run build`: `PASS` with existing Vite chunk-size warning only
- `rtk npm run test:lint`: `PASS`
- `rtk npm run check:operational-registry-drift`: `PASS`
- `rtk npm run check:form-contracts`: `PASS`
- `rtk npm run check:row-action-contracts`: `PASS`

## Remaining deviations
- `ND-001`: page-level ownership is reduced, but `Assets.tsx` still owns report/map/compare branching and some page composition that is better pushed behind stricter golden slots.
- `ND-002`: route/search/view persistence is materially safer, but there is still no backend preference contract; current recovery is a shared frontend persistence path, not full tenant-scoped golden persistence.
- `ND-005`: `960x720` is usable again, but the command region still consumes enough height that the grid remains shorter than ideal.
- console inventory still shows repeated duplicate-key warnings inside the Assets shell path; this remained outside the Stage 14 allowed root cause scope.

## Forbidden-action statement
- No `git`, `push`, `package`, `zip`, `release`, or dependency-install commands were run.

## Unrelated-scope exclusion statement
- No Vendors, FAR, Research, Network, Services, External, SettingsStandards migration, backend/API redesign, or unrelated workspace work was performed.

## Exact next prompt rule
- Target only the remaining partials: reduce residual page-level ownership in `Assets.tsx`, decide whether `ND-002` stops at shared frontend persistence or moves to an approved backend preference contract, and tighten `960x720` command-bar compaction without revisiting the now-locked row-action or bulk-action recoveries.

## Final worker result
- `PARTIAL`
