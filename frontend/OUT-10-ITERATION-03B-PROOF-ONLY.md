# OUT-10 Iteration 03B Proof-Only

## 1. Artifact / source-state explanation

The prior capsule had a clean git status and no unstaged diff because the Iteration 03 source state was already committed before capsule generation, not left as an uncommitted worktree delta.

Relevant commit:
- `8cacd6e7880b26b5ba6b846c62efdb5f6e58b32f` `out-10 2`

Evidence:
- `git log --oneline -- <OUT-10 files>` resolves to `8cacd6e7` as the latest commit touching the Iteration 03 source files.
- `git show --stat 8cacd6e7` includes:
  - `frontend/src/components/shared/OperationalGridInteractions.ts`
  - `frontend/src/components/shared/OperationalGridInteractions.test.tsx`
  - `frontend/src/components/MonitoringGrid.tsx`
  - `frontend/src/components/External.tsx`
  - `frontend/src/components/ServicesReal.tsx`
  - `frontend/OUT-10-ITERATION-03-PROOF.md`
- Current status for the relevant files is clean, which is consistent with “already committed before capsule generation,” not “no change happened.”

## 2. Changed files / delta evidence

- `frontend/src/components/shared/OperationalGridInteractions.ts`
  - Contains Iteration 03-relevant changes.
  - Proof:
    - [OperationalGridInteractions.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.ts:212) adds `selectionScopeKey` to `useOperationalGroupedSelection`.
    - [OperationalGridInteractions.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.ts:231) clears the internal grouped-selection map and publishes `setSelectedIds([])`.
    - [OperationalGridInteractions.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.ts:236) resets grouped selection from shared code on `selectionScopeKey` change.
- `frontend/src/components/shared/OperationalGridInteractions.test.tsx`
  - Contains Iteration 03-relevant changes.
  - Proof:
    - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:159) proves grouped selections clear on scope change.
    - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:187) proves stale IDs do not reappear after scope change.
    - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:223) keeps range-anchor reset coverage.
- `frontend/src/components/MonitoringGrid.tsx`
  - Contains Iteration 03-relevant changes.
  - Proof:
    - [MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:1327) builds `selectionScopeKey`.
    - [MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:1332) passes that key into `useOperationalGroupedSelection`.
    - [MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:2259) and [MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:2326) route raw and grouped selection through the shared handler.
- `frontend/src/components/External.tsx`
  - Contains Iteration 03-relevant changes.
  - Proof:
    - [External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:1858) builds `selectionScopeKey` from active tab, group mode, and visible row IDs.
    - [External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:1864) passes that key into `useOperationalGroupedSelection`.
    - [External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:3287) and [External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:3355) use the shared handler for raw and grouped selection, replacing the old active-subgroup-only overwrite path.
- `frontend/src/components/ServicesReal.tsx`
  - Contains Iteration 03-relevant changes.
  - Proof:
    - [ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:1258) builds `selectionScopeKey`.
    - [ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:1263) passes that key into `useOperationalGroupedSelection`.
    - [ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:2200) and [ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:2269) route raw and grouped selection through the shared handler.

## 3. Shared grouped-selection reset contract

`selectionScopeKey` is the shared identity for the current row-selection universe: active domain scope, grouping mode, and current visible row ordering/universe.

Changes that should reset grouped selection:
- active tab / selected domain scope changes;
- `groupBy` changes;
- visible row universe changes due to filter, search, sort, or underlying data changes.

Where reset happens:
- in shared code, inside `useOperationalGroupedSelection` at [OperationalGridInteractions.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.ts:236).

Why reset is now shared and scope-driven:
- consumers no longer remember separate local `resetGroupedSelection()` effects;
- each consumer only supplies the scope key;
- shared code clears both the internal `groupSelectionsRef` map and visible `selectedIds`.

Required proof points:
- internal grouped-selection map clears on scope change:
  - [OperationalGridInteractions.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.ts:231)
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:159)
- `selectedIds` clears or re-publishes correctly on scope change:
  - [OperationalGridInteractions.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.ts:233)
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:184)
- stale IDs from a previous scope cannot reappear after a later grouped selection event:
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:187)

## 4. Consumer proof

### Monitoring

- grouped selection hook call:
  - [MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:1332)
- scope key inputs:
  - [MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:1327)
  - built from `activeTab`, `groupBy`, and `displayedItemsInOrder`
- old local grouped-selection aggregation:
  - none remains; there is no local `groupSelectionsRef`, `getSelectedNodes`, or local grouped-selection `useCallback` in the current source
- local selected-state clearing that still exists:
  - [MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:1892) clears visible selection on scope-switch UI interaction
  - this does not conflict with shared reset because it is only an immediate UI clear; the shared grouped map reset is independently driven by `selectionScopeKey`
- raw and grouped both use the shared contract:
  - [MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:2259)
  - [MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:2326)

### External

- grouped selection hook call:
  - [External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:1864)
- scope key inputs:
  - [External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:1858)
  - built from `activeTab`, `groupBy`, and visible filtered entity/link IDs
- proof old active-subgroup-only overwrite is gone:
  - current raw and grouped grids both route through the shared handler:
    - [External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:3287)
    - [External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:3355)
  - there is no remaining local `handleExternalSelectionChanged` in the current source
- grouped and raw both use the shared contract:
  - yes, via the two `onSelectionChanged` call sites above
- local selected-state clearing that still exists:
  - [External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:1994) clears selection while applying workspace config
  - additional local clears exist in other workflow actions, but they do not own grouped-reset lifecycle; shared reset still occurs on scope-key change

### Services

- grouped selection hook call:
  - [ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:1263)
- scope key inputs:
  - [ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:1258)
  - built from `activeTab`, `groupBy`, and `displayedItemsInOrder`
- old local grouped-selection aggregation:
  - none remains; there is no local `groupSelectionsRef`, `getSelectedNodes`, or local grouped-selection `useCallback` in the current source
- local selected-state clearing that still exists:
  - [ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:1781) clears visible selection on scope-switch UI interaction
  - this does not conflict with shared reset because `selectionScopeKey` still resets the grouped map in shared code
- raw and grouped both use the shared contract:
  - [ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:2200)
  - [ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:2269)

## 5. Test evidence

Command:
```bash
rtk npx vitest run src/components/shared/OperationalGridInteractions.test.tsx src/components/shared/OperationalDataGrid.contract.test.ts
```

Exact result summary:
```text
RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend
Test Files  2 passed (2)
Tests  9 passed (9)
Start at  18:58:23
Duration  1.06s
```

Coverage present in shared tests:
- grouped selections aggregate across groups:
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:128)
- scope change clears internal grouped selection:
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:159)
- stale selected IDs do not reappear after scope change:
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:187)
- range-anchor reset still works with `selectionScopeKey`:
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:223)
- existing single-click / ctrl-meta / shift-range / interactive-target tests still pass:
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:10)
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:29)
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:49)
  - [OperationalGridInteractions.test.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalGridInteractions.test.tsx:95)

Failures:
- none

## 6. Typecheck / build evidence

Command:
```bash
rtk npm run typecheck
```

Result:
```text
> tsc --noEmit
src/components/NetworkReal.tsx(956,22): error TS2345: Argument of type '{ item: any; }' is not assignable to parameter of type 'SetStateAction<{ item: any; point: { x: number; y: number; }; }>'.
src/components/NetworkReal.tsx(2572,35): error TS2339: Property 'style' does not exist on type '{ item: any; point: { x: number; y: number; }; }'.
src/components/VendorsReal.tsx(539,22): error TS2345: Argument of type '{ item: any; }' is not assignable to parameter of type 'SetStateAction<{ item: any; point: { x: number; y: number; }; }>'.
src/components/VendorsReal.tsx(1158,167): error TS2339: Property 'style' does not exist on type '{ item: any; point: { x: number; y: number; }; }'.
```

Classification:
- related to OUT-10 changed files:
  - none observed
- unrelated known blockers:
  - `NetworkReal.tsx`
  - `VendorsReal.tsx`
- unknown:
  - none in this command output

## 7. Manual validation checklist

Manual validation: not performed.

Reason:
- this was a proof-only follow-up focused on source-state and command evidence repair;
- no browser/app run was performed in this iteration.

Concise checklist if run later:
- Monitoring grouped selection across groups
- External grouped selection across groups
- Services grouped selection across groups
- changing tab/scope clears grouped selections
- old selections do not reappear after scope change
- shift range still behaves
- action-cell click does not select/open rows
- double-click opens the correct domain-owned target
- right-click opens the app menu where applicable

## 8. Not verified

- Live browser validation for Monitoring grouped selection across groups.
- Live browser validation for External grouped selection across groups.
- Live browser validation for Services grouped selection across groups.
- Live browser proof that tab/scope changes clear grouped selection in the running app.
- Live browser proof that stale selections do not reappear after scope change.
- Live browser proof that shift-range behavior still matches the shared contract.
- Live browser proof that action-cell click isolation still holds on all three screens.
- Live browser proof that double-click still opens the correct domain-owned target on all three screens.
- Live browser proof that right-click still opens the app menu where applicable.
- E2E/Playwright coverage for the `OUT-10` interaction contract.
- Full frontend typecheck cleanliness beyond the known unrelated Network/Vendors blockers.
