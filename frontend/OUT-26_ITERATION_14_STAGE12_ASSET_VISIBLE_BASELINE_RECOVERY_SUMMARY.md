# OUT-26 Iteration 14 Stage 12 Asset Visible Baseline Recovery Summary

## Metadata

- Issue: `OUT-26 / Run 19 — Assets Golden Template Implementation`
- Iteration: `Iteration 14`
- Stage: `Stage 12 — emergency recovery after post-lock manual UAT failure`
- Prompt type: `Emergency recovery only`
- Date: `2026-07-03`
- Worker result: `PASS`

## Files inspected

### Prior proof

- `frontend/OUT-26_STAGE0_ASSETS_GOLDEN_TEMPLATE_GAP_SUMMARY.md`
- `frontend/OUT-26_ITERATION_02_STAGE1_SHELL_HEADER_SUMMARY.md`

### Canonical route and implementation

- `frontend/src/components/Assets.tsx`
- `frontend/src/App.tsx`

### Golden/reference composition

- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/LayoutPrimitives.tsx`

### Validation/runtime support

- `frontend/package.json`

## Files changed

### Implementation

- `frontend/src/components/Assets.tsx`

### Proof

- `frontend/OUT-26_ITERATION_14_STAGE12_ASSET_VISIBLE_BASELINE_RECOVERY_SUMMARY.md`
- `frontend/OUT-26_ITERATION_14_STAGE12_ASSET_VISIBLE_BASELINE_MANUAL_UAT.md`

### Screenshot proof

- `frontend/OUT-26_ITERATION_14_STAGE12_asset_full_before.png`
- `frontend/OUT-26_ITERATION_14_STAGE12_asset_viewport_before.png`
- `frontend/OUT-26_ITERATION_14_STAGE12_asset_full_after.png`
- `frontend/OUT-26_ITERATION_14_STAGE12_asset_viewport_after.png`
- `frontend/OUT-26_ITERATION_14_STAGE12_asset_full_final.png`
- `frontend/OUT-26_ITERATION_14_STAGE12_asset_viewport_final.png`
- `frontend/OUT-26_ITERATION_14_STAGE12_asset_header_scope_final.png`
- `frontend/OUT-26_ITERATION_14_STAGE12_asset_grid_rows_final.png`

## Mandatory diagnostics before editing

### Table absence diagnostics

- Asset data fetch was successful. Runtime evidence after reload showed asset row content in page text and table DOM.
- Asset query result was not empty. Final evidence showed `rowCountInDom: 39` and `visibleRowCount: 19`.
- `/asset` was entering the table/grid render branch.
- `OperationalDataGrid` was mounting, but its outer wrapper had collapsed the available height.
- The page was not in a true empty state.
- Existing/Purged default scope was sane. Final proof showed `Existing` active with live rows.
- Search, lens, and scope defaults were not hiding all rows.
- The grid was present in the DOM but was effectively hidden by CSS/layout collapse.
- Root cause: the wrapper around the shared grid surface used `flex-1 min-h-0` without also being a flex container, which collapsed the `OperationalDataGrid` shell to about `2px` tall in the broken state.

### Header/scope diagnostics

- The locked golden reference places the scope switch in the top-right page header actions area, not inside the content command box.
- `Assets.tsx` had been rendering `HeaderScopeSwitch` in a lower toolbar/content area before recovery.
- `Assets.tsx` also passed a summary string to `HeaderScopeSwitch`, which rendered the small `316 active · 0 deleted` badge line under the title/subtitle.
- That badge was not acceptable for the Stage 12 recovery target and was removed by dropping the summary prop.

### Page-level golden contract diagnostics

- Canonical `/asset` was consuming shared primitives, but parts of the page still behaved like local layout ownership rather than a strict golden page composition.
- Local drift that caused the visible failure:
  - scope switch mounted in the wrong shell slot;
  - header badge summary rendered under the title;
  - `AssetInsightBar` occupied visible vertical space above the grid in table mode;
  - the grid mount wrapper broke the shared `OperationalDataGrid` flex contract.
- Recovery kept the golden shell as page owner and moved only the necessary asset-specific content back into valid golden slots.

## Fix summary

- Moved `HeaderScopeSwitch` into the shared header `actions` slot so Existing/Purged renders in the top-right header/command area.
- Removed the `HeaderScopeSwitch` summary string so the stray `316 active · 0 deleted` badge line no longer appears under the title/subtitle.
- Removed the top-of-page `AssetInsightBar` from grid mode so the table regains visible priority.
- Fixed the grid mount wrapper from a non-flex container to `className="relative flex flex-1 min-h-0 w-full"` so the shared grid surface can claim height and render rows.
- Removed an empty `ToolbarGroup` that caused a real `typecheck` failure during validation rerun.

## Before/after evidence

### Broken state

- `frontend/OUT-26_ITERATION_14_STAGE12_asset_viewport_before.png`
- Existing/Purged rendered inside the content box.
- The small count badge line appeared under the title/subtitle.
- Table rows existed in DOM text but the grid surface was visually absent.

### Recovered state

- `frontend/OUT-26_ITERATION_14_STAGE12_asset_full_final.png`
- `frontend/OUT-26_ITERATION_14_STAGE12_asset_viewport_final.png`
- `frontend/OUT-26_ITERATION_14_STAGE12_asset_header_scope_final.png`
- `frontend/OUT-26_ITERATION_14_STAGE12_asset_grid_rows_final.png`
- Final DOM/runtime evidence after refresh:
  - `hasMetaBadges: false`
  - `rowCountInDom: 39`
  - `visibleRowCount: 19`
  - `gridRect: 975x271`
  - `headerRect: 977x77`

## Route-lock evidence

- `/asset` remains canonical and still renders `Assets`: `frontend/src/App.tsx:725`
- `/asset-real` remains legacy redirect-only: `frontend/src/App.tsx:269`, `frontend/src/App.tsx:726`
- `AssetReal.tsx` was not promoted and was not mounted from `App.tsx`
- Sidebar still exposes canonical Assets only: `frontend/src/App.tsx:603`

## Rich behavior preservation checklist

| behavior | status | notes |
| --- | --- | --- |
| quick look | PASS | preserved; row visibility returned without removing quick-look entry points |
| asset map | PASS | not rewritten |
| relationships/dependencies | PASS | not rewritten |
| details/forms | PASS | not rewritten |
| history/compare/report | PASS | remained mounted |
| row/bulk actions | PASS | entry points remained mounted |
| security/secrets/hardware/monitoring panels | PASS | untouched |
| `AssetDetailsView.tsx` | PASS | untouched and remains rich asset detail surface |

## Route-level and clone-drift checks

| check | result | notes |
| --- | --- | --- |
| `MONITORING_*` introduced in canonical Assets | PASS | no monitoring clone markers introduced |
| `MONITORING_WORKSPACE_STANDARD` introduced | PASS | absent |
| `MonitoringHistoryModal` introduced | PASS | absent |
| `CompareMonitorsModal` introduced | PASS | absent |
| `NetworkConnectionForm` introduced | PASS | absent |
| monitoring history/restore endpoints introduced | PASS | absent |
| route/sidebar regression | PASS | none found |
| `/asset-real` active-route regression | PASS | none found |
| `AssetReal` ownership regression | PASS | none found |

## Validation commands/results

| command | result | summary |
| --- | --- | --- |
| `rtk npm run typecheck` | PASS | failed once on an empty `ToolbarGroup`, then passed after removing it |
| `rtk npm run build` | PASS | `vite build` passed; existing large-chunk warning remained |
| `rtk npm run test:lint` | PASS | test architecture linter passed |
| `rtk npm run check:operational-registry-drift` | PASS | no monitoring clone drift markers found |
| `rtk npm run check:form-contracts` | PASS | passed |
| `rtk npm run check:row-action-contracts` | PASS | command exited successfully |

## Manual UAT proof summary

- See `frontend/OUT-26_ITERATION_14_STAGE12_ASSET_VISIBLE_BASELINE_MANUAL_UAT.md`
- Final manual/browser evidence confirms:
  - `/asset` shows a visible asset table/grid;
  - entity rows are visible with live data;
  - Existing/Purged is restored to the header actions area;
  - the random header badge line is removed;
  - refresh preserves the visible baseline.

## Remaining warnings

- Browser console still reports repeated React duplicate-key warnings under `AnimatePresence` from `OperationalWorkspaceShells.tsx` / `Assets.tsx`.
- This did not block the visible baseline recovery, but it remains a follow-up cleanup item outside the strict Stage 12 acceptance target.

## Forbidden-command statement

- No `git`, `push`, `package`, `zip`, `release`, or dependency install commands were run.

## Unrelated-scope exclusion statement

- No Vendors, FAR, Research, Network, Services, External, or SettingsStandards migration work was performed.
- No backend/API redesign was performed.
- No route ownership change was performed.

## Final worker result

`PASS`
