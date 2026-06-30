# OUT-11 Iteration 02 Proof

## 1. Executive result

Self-classification: `PARTIAL`

Reason: shared layer ownership, shared top-level overlay exclusivity, External dirty-close preservation, and Services duplicate suppression removal are implemented and covered by focused tests, but manual UI validation was not run and full `typecheck` remains blocked by unrelated legacy files.

`OUT-11 is not Done and not locked.`

## 2. Changed files summary

### Shared overlay contract changes

- `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx`
  - added shared `WORKSPACE_LAYER_Z.rowActionMenu` token at `:11`
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
  - added shared `useWorkspaceOverlayController` at `:86`
- `frontend/src/components/shared/OperationalRowActionMenu.tsx`
  - row-action container now uses shared layer token instead of a local literal at `:4` and `:92`

### Monitoring wiring

- `frontend/src/components/MonitoringGrid.tsx`
  - adopted `useWorkspaceOverlayController` at `:68`, `:541-545`
  - shared row-action open path now claims the shared top-level overlay at `:819-823`
  - local `togglePanel` now delegates to shared overlay state at `:911-913`
  - dismiss controller now keys off shared `hasRowActionMenu` and shared overlay state at `:1181-1213`
  - row-action render path now requires the shared active overlay key at `:2197`

### External wiring

- `frontend/src/components/External.tsx`
  - adopted `useWorkspaceOverlayController` at `:42`, `:1513-1517`
  - preserved unsaved saved-view close interceptor in `dismissWorkspaceMenus` at `:1677-1696`
  - shared row-action open path now claims the shared top-level overlay at `:1723-1727`
  - local `togglePanel` now delegates to shared overlay state at `:2169-2171`
  - row-action render path now requires the shared active overlay key at `:3155`

### Services wiring

- `frontend/src/components/ServicesReal.tsx`
  - adopted `useWorkspaceOverlayController` at `:53`, `:544-548`
  - shared row-action open path now claims the shared top-level overlay at `:779-783`
  - local `togglePanel` now delegates to shared overlay state at `:850-852`
  - dismiss controller now keys off shared `hasRowActionMenu` and shared overlay state at `:1080-1111`
  - removed the local duplicate native `contextmenu` suppression effect; shared hook remains the only owner
  - row-action render path now requires the shared active overlay key at `:2117`

### Tests

- `frontend/src/components/shared/OperationalWorkspaceHooks.test.tsx`
  - added `useWorkspaceOverlayController` exclusivity test at `:123`
- `frontend/src/components/shared/__tests__/row-action-menu.test.tsx`
  - added shared layer-token assertion at `:9`

### Proof/report only

- `frontend/OUT-11-ITERATION-02-PROOF.md`

## 3. Shared layer-token proof

Before:

- `OperationalRowActionMenu` hardcoded `zIndex: 1115` locally.

After:

- shared row-action layer ownership lives in `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx:7-13`
- the named token is `WORKSPACE_LAYER_Z.rowActionMenu` at `:11`
- `OperationalRowActionMenu` now reads that token in `frontend/src/components/shared/OperationalRowActionMenu.tsx:4` and applies it at `:92`

Proof that no unexplained local row-action z-index literal remains:

- `frontend/src/components/shared/OperationalRowActionMenu.tsx:92` uses `WORKSPACE_LAYER_Z.rowActionMenu`
- focused test `frontend/src/components/shared/__tests__/row-action-menu.test.tsx:9-27` asserts the rendered container `style.zIndex` matches `WORKSPACE_LAYER_Z.rowActionMenu`

Stacking policy statement:

- anchored floating panels continue to use `WORKSPACE_LAYER_Z.floatingPanel`
- row-action menus now use `WORKSPACE_LAYER_Z.rowActionMenu`
- this keeps row-action menus under the same named shared layer contract and explicitly above the general anchored floating panel layer

## 4. One-active-overlay / dismissal proof

Exact shared owner created:

- `useWorkspaceOverlayController` in `frontend/src/components/shared/OperationalWorkspaceHooks.ts:86-115`

How targets consume it:

- Monitoring: `frontend/src/components/MonitoringGrid.tsx:541-545`, `:911-913`
- External: `frontend/src/components/External.tsx:1513-1517`, `:2169-2171`
- Services: `frontend/src/components/ServicesReal.tsx:544-548`, `:850-852`

How mutual exclusion is preserved:

- display, saved views, bulk, and row action now derive from one shared `activeOverlay` key in each target workspace
- row action is promoted into the same shared top-level contract by `openOverlay('rowAction')`:
  - Monitoring `:819-823`
  - External `:1723-1727`
  - Services `:779-783`
- row-action render now requires both payload presence and the shared active overlay key:
  - Monitoring `:2197`
  - External `:3155`
  - Services `:2117`

How outside-click and Escape still work:

- shared dismiss controller remains `useOperationalDismissController` in `frontend/src/components/shared/OperationalGridInteractions.ts:332-365`
- shared Escape/outside-click base remains `useWorkspaceDismissHandlers` in `frontend/src/components/shared/OperationalWorkspaceHooks.ts:54-80`
- each workspace still passes its domain-owned `dismissWorkspaceMenus` callback into the shared dismiss controller:
  - Monitoring `:1181-1213`
  - External `:1677-1709`
  - Services `:1080-1111`

How `[data-workspace-panel]` nested child overlays stay protected:

- the shared dismiss controller still exempts `[data-workspace-panel]` descendants in `frontend/src/components/shared/OperationalGridInteractions.ts:356`
- `AppDropdown` still ignores clicks on trigger, panel, and any `[data-workspace-panel]` in `frontend/src/components/shared/AppDropdown.tsx:57-68`
- existing nested dropdown protection test remains in `frontend/src/components/shared/AppDropdown.test.tsx`

Focused exclusivity proof:

- `frontend/src/components/shared/OperationalWorkspaceHooks.test.tsx:123-151` proves one top-level overlay key replaces the prior one and supports dismissing all

## 5. External dirty-close protection proof

Exact source path preserving the unsaved saved-view close interception:

- `frontend/src/components/External.tsx:1677-1696`

What still happens there:

- if `showViewsMenu` is active and `newViewName.trim() !== ''`, `dismissWorkspaceMenus` opens the existing confirmation modal instead of silently closing the panel
- only the confirmation callback clears the draft and calls the shared overlay dismiss path

Exact path showing shared dismissal does not bypass it:

- External still passes `dismissWorkspaceMenus` into `useOperationalDismissController` at `frontend/src/components/External.tsx:1708-1720`
- External saved-views close button still routes through `dismissWorkspaceMenus` at `frontend/src/components/External.tsx:2962`

Manual validation to confirm it:

1. Open External saved views.
2. Type a new unsaved view name.
3. Click outside or press Escape.
4. Expected: confirmation modal appears; the panel does not silently disappear.

## 6. Services context-menu suppression proof

Outcome: duplicate local suppression removed because shared suppression is already equivalent.

Exact evidence:

- shared owner still exists in `frontend/src/components/shared/OperationalGridInteractions.ts:297-323`
- Services still consumes that shared hook at `frontend/src/components/ServicesReal.tsx:779-783`
- source search after the change shows no remaining local `document.addEventListener('contextmenu', ...)` effect in `frontend/src/components/ServicesReal.tsx`

Supporting command:

```bash
rtk rg -n "useOperationalContextMenu|contextmenu|document.addEventListener\\('contextmenu'" frontend/src/components/ServicesReal.tsx frontend/src/components/shared/OperationalGridInteractions.ts
```

## 7. OUT-10 no-regression proof

No changes were made to:

- `selectionScopeKey` derivation or propagation
- `useOperationalRowInteractions` selection behavior
- `useOperationalGroupedSelection`
- `OperationalDataGrid`
- `OperationalGridMatrix`
- row click / ctrl-meta / shift range / grouped selection behavior

Explicit proof:

- `frontend/src/components/shared/OperationalGridInteractions.ts` was not modified in this iteration
- `frontend/src/components/shared/OperationalDataGrid.tsx` was not modified in this iteration
- `frontend/src/components/shared/OperationalGridMatrix.tsx` was not modified in this iteration
- source still shows `selectionScopeKey` wiring in target grids:
  - Monitoring `frontend/src/components/MonitoringGrid.tsx:1332-1366`, `:2268`, `:2336`
  - External `frontend/src/components/External.tsx:1876-1884`, `:2462`, `:3295`, `:3363`
  - Services `frontend/src/components/ServicesReal.tsx:1248-1280`, `:2189`, `:2259`

## 8. Test / command evidence

Focused test command run:

```bash
rtk npx vitest run src/components/shared/__tests__/row-action.test.ts src/components/shared/__tests__/row-action-menu.test.tsx src/components/shared/AppDropdown.test.tsx src/components/shared/OperationalWorkspaceHooks.test.tsx
```

Result:

- `4` test files passed
- `16` tests passed
- `0` tests failed

Typecheck command run:

```bash
rtk npm run typecheck
```

Result:

- failed on pre-existing unrelated files only

Exact blockers reported:

```text
src/components/NetworkReal.tsx(956,22): error TS2345
src/components/NetworkReal.tsx(2572,35): error TS2339
src/components/VendorsReal.tsx(539,22): error TS2345
src/components/VendorsReal.tsx(1158,167): error TS2339
```

No new OUT-11 target-file type errors were surfaced before `tsc` stopped.

## 9. Manual validation checklist

Manual UI validation: Not run

Reason:

- this iteration stayed inside shared source consolidation and focused unit proof; I did not spend a browser cycle on live grid interactions in this pass.

Recommended manual checklist:

1. Monitoring: open display, saved views, bulk, then row action menu; verify only one top-level overlay stays open.
2. Monitoring: right-click a row near viewport bottom/right edge; verify row-action menu remains visible and usable.
3. Monitoring: open bulk panel, open nested dropdown, click inside nested dropdown; verify parent remains open.
4. External: type an unsaved saved-view name, click outside / press Escape; verify confirmation behavior still appears instead of silent close.
5. Services: right-click grid row; verify app row menu opens and native browser context menu is not shown inside grid/menu surfaces.
6. All three: row action button click and right-click must not change row selection unexpectedly.

## 10. Not verified / remaining risks

- viewport clamp under narrow widths
- resize/scroll repositioning during live runtime interaction
- long grid/page scroll interaction
- nested dropdown overlap near screen edges
- manual stacking behavior in a live browser, even though shared layer ownership is now source-proven
- full frontend typecheck/build remains blocked by unrelated `NetworkReal` and `VendorsReal` errors

## 11. Next prompt recommendation

Recommended next prompt type: `runtime validation`
