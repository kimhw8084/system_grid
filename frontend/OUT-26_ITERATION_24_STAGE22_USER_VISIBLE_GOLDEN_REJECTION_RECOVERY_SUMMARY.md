# OUT-26 Iteration 24 Stage 22 User-Visible Golden Rejection Recovery Summary

## 1. Issue / iteration / stage / prompt type
- Issue: OUT-26 / Run 19 — Assets Golden Template Implementation
- Iteration: 24
- Stage: 22
- Stage name: User-Visible Golden Rejection Recovery
- Prompt type: deep product recovery implementation

## 2. Worker result
- `PARTIAL`

## 3. User UAT controlling statement
- User UAT remained controlling.
- Canonical `/asset` was treated as visibly rejected before this pass.

## 4. Rebuild-or-salvage decision
- Decision: `Option A — Salvage current Assets.tsx`
- Reason: the canonical asset route already consumes the shared operational shell, shared saved-views panel, shared display panel, shared bulk flyout shell, shared row-action shell, and shared operational grid runtime directly. The highest-value gap was visible page composition drift, not missing primitive adoption.

## 5. Golden sources inspected
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/shared/OperationalWorkspace.ts`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalRowActionMenu.tsx`
- `frontend/src/components/shared/OperationalGridInteractions.ts`
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- `frontend/src/components/SettingsStandards.tsx`

## 6. Asset sources inspected
- `frontend/src/components/Assets.tsx`
- `frontend/src/components/assets/AssetDetailsView.tsx`
- `frontend/src/components/AssetReal.tsx`
- `frontend/tests/assets-workflows.spec.ts`

## 7. Files changed
- `frontend/src/components/Assets.tsx`
- `frontend/OUT-26_ITERATION_24_STAGE22_USER_VISIBLE_GOLDEN_REJECTION_RECOVERY_SUMMARY.md`
- `frontend/OUT-26_ITERATION_24_STAGE22_GLOBAL_TEMPLATE_RECONSUMPTION_MAP.md`
- `frontend/OUT-26_ITERATION_24_STAGE22_TABLE_PARITY_MATRIX.md`
- `frontend/OUT-26_ITERATION_24_STAGE22_GLOBAL_FEATURE_PARITY_MATRIX.md`
- `frontend/OUT-26_ITERATION_24_STAGE22_RENDERED_UAT_EVIDENCE.md`
- `frontend/OUT-26_ITERATION_24_STAGE22_RENDERED_UAT_EVIDENCE.html`

## 8. Pre-edit gap map severity count
- `PASS`: 6
- `MINOR`: 7
- `MAJOR`: 15
- `BLOCKER`: 4

## 9. Implementation approach
- Kept canonical `/asset` on `Assets.tsx`.
- Re-centered the visible command-bar composition on the shared operational grammar.
- Promoted asset lens switching into first-row shared toolbar pills instead of a local filter dropdown.
- Moved table/list/map and template/snapshot controls into the right action zone so the command bar reads like the Monitoring workspace.
- Removed asset-specific row-density inflation and extra grid shell emphasis so the table surface follows the Monitoring baseline more closely.
- Restored `Compare Visible` from the shared bulk flyout so the existing asset workflow remains preserved without requiring explicit row selection.

## 10. Why this is not cosmetic patching
- The change modifies command ownership and interaction placement, not only class strings.
- The bulk-action entry contract changed back to support the asset domain’s visible compare flow through the shared flyout shell.
- The grid now consumes the same density baseline instead of an asset-only inflated row rhythm.

## 11. How global shell is inherited
- Page header remains owned by `OperationalWorkspaceShell`.
- Command bar remains owned by `OperationalWorkspaceShell` and `WorkspaceCommandBar`.
- Saved views, display controls, bulk flyout, and floating panels remain owned by shared operational primitives.

## 12. How global table is inherited
- Canonical grid remains `OperationalDataGrid`.
- Row actions remain `OperationalRowActionMenu`.
- Selection remains driven by the shared operational grid runtime.
- Grid density now uses `rowDensity` directly instead of `rowDensity + 6`.

## 13. How global features are inherited
- Search: shared `ToolbarSearch`
- Display: shared `OperationalDisplayPanel`
- Saved views: shared `OperationalSavedViewsPanel`
- Row actions: shared `OperationalRowActionMenu`
- Bulk actions: shared `OperationalAnchoredPanel` + shared flyout cards/editors
- Data states: shared `resolveOperationalDataState`

## 14. How Asset details / windows / features are preserved
- Quick look preserved.
- `AssetDetailsView` preserved.
- Map preserved.
- Compare/report preserved.
- Import/export preserved.
- Service, network, security, secrets, hardware, monitoring, relationships, and edit flows preserved through existing asset detail/form content.

## 15. Stage 12 baseline preservation
- Canonical `/asset` route and core asset workflows remain intact.

## 16. Stage 18 duplicate-key preservation
- No duplicate-key regression was introduced in this pass.
- No duplicate-key warning was surfaced during the focused asset Playwright rerun.

## 17. Stage 19 validation preservation
- Focused asset workflow spec still passes after this change.

## 18. Route lock preservation
- `/asset` remains canonical.
- `/asset-real` remains redirect-only.
- `AssetReal.tsx` was not promoted into the route.

## 19. Rendered desktop result
- Evidence is limited to a focused Playwright DOM/session run, not a separate side-by-side measurement capture.
- The command bar now renders with first-row lens pills and right-aligned view/import-export actions, which is visibly closer to the Monitoring operational grammar.

## 20. Rendered `960x720` result
- Not re-captured in this pass.
- Remains an explicit remaining proof gap.

## 21. Console result
- Focused asset workflow Playwright rerun passed without surfacing a page-console blocker in the test result.
- A dedicated standalone console inventory run was not captured separately.

## 22. Validation commands / results
- `rtk npm run typecheck` → PASS
- `rtk npm run build` → PASS
- `rtk npm run test:lint` → PASS
- `/bin/zsh -lc 'cd frontend && PW_API_BASE=http://127.0.0.1:8000/api/v1 npx playwright test tests/assets-workflows.spec.ts --reporter=line'` → PASS
- Dedicated registry-drift / form-contract / row-action-contract package scripts were not present as runnable top-level package commands in this workspace; existing focused validation was used instead.

## 23. Final user-visible golden verdict
- `PARTIAL`

## 24. Remaining gaps
- No new 1280-wide side-by-side capture matrix was rendered in this pass.
- No exact `960x720` responsive recapture was produced in this pass.
- The asset page is materially closer to Monitoring’s command grammar, but not yet proven visually indistinguishable by fresh rendered measurement evidence.

## 25. Forbidden-action statement
- No forbidden route promotion was performed.
- `AssetReal.tsx` was not promoted.
- Backend/API contracts were not changed.
- No unrelated workspace was changed.

## 26. Unrelated-scope exclusion statement
- This pass only touched canonical asset workspace composition and validation/proof files.

## 27. Exact next prompt rule
- Next prompt should continue from fresh rendered parity capture only: compare Monitoring vs canonical `/asset` at desktop and exact `960x720`, then close only the remaining measured visual gaps without reopening route, backend, or unrelated workspace work unless new regression evidence appears.
