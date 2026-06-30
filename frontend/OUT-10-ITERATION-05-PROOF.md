# OUT-10 Iteration 05 Proof

## Review classification

PARTIAL

Shared selection contract defects were fixed in shared code and focused unit regressions pass. Full frontend `typecheck` is still blocked by pre-existing `NetworkReal` and `VendorsReal` errors outside OUT-10, and no human runtime validation was performed in this iteration.

## 1. Root cause analysis

The `3`, `6`, and `9` counts came from a shared logical-selection normalization defect.

- `useOperationalGroupedSelection.handleSelectionChanged` trusted `event.api.getSelectedNodes()` directly and published `node.data.id` values without deduplicating logical rows. When AG Grid surfaced multiple selected nodes for the same logical row, one click published the same ID multiple times.
- `useOperationalRowInteractions.handleRowClicked` used node-level selection and `rowIndex`-based range logic. For duplicate row nodes representing one logical row, single-click, meta-toggle, and shift-range all acted on raw nodes instead of logical row IDs.
- `forEachNodeAfterFilterAndSort` was used as if every visited node represented a unique logical row. In practice, repeated logical IDs in the node walk inflated range selection.
- `selectionScopeKey` reset only cleared React `selectedIds` state inside `useOperationalGroupedSelection`. It did not clear AG Grid native selected-node state, so stale native selections could survive scope/search/filter changes and republish old IDs later.

Primary shared cause:

- duplicate logical IDs from AG Grid selected-node and visible-node walks;
- stale AG Grid native selection not being reset with the shared scope key.

## 2. Changed files summary

### Shared selection contract changes

- `src/components/shared/OperationalGridInteractions.ts`
  - added logical ID normalization for selected nodes;
  - added visible logical row order derivation with duplicate suppression;
  - changed row click, meta-toggle, and shift-range to operate on logical row IDs rather than individual row nodes or raw `rowIndex` only;
  - kept grouped aggregation, but now unions deduplicated logical IDs only.
- `src/components/shared/OperationalDataGrid.tsx`
  - added `selectionScopeKey` plumbing into the shared grid wrapper.
- `src/components/shared/OperationalGridMatrix.tsx`
  - clears AG Grid native selection whenever `selectionScopeKey` changes;
  - includes `selectionScopeKey` in the memo comparator so the reset cannot be skipped.

### Monitoring wiring

- `src/components/MonitoringGrid.tsx`
  - passes `selectionScopeKey` into raw and grouped shared grid instances.

### External wiring

- `src/components/External.tsx`
  - passes `selectionScopeKey` into raw and grouped shared grid instances.

### Services wiring

- `src/components/ServicesReal.tsx`
  - passes `selectionScopeKey` into raw and grouped shared grid instances.

### Tests

- `src/components/shared/OperationalGridInteractions.test.tsx`
  - added duplicate-node regression coverage for plain click, meta-toggle add/remove, visible range selection, selected-node normalization, visible-order normalization, grouped cross-group aggregation, and scope-reset behavior.

### Proof/report

- `OUT-10-ITERATION-05-PROOF.md`

## 3. Before/after contract

### Old behavior

- plain click selected native row nodes and published raw selected-node IDs, including duplicate logical IDs;
- meta/ctrl toggle toggled only the clicked native node path, not the full logical row identity;
- shift-range used raw node indexes and could select duplicate logical IDs when visible node order repeated the same row ID;
- `selectionScopeKey` reset cleared React state only, allowing stale AG Grid native selection to survive and later reappear.

### New behavior

- plain click clears prior native selection and selects the clicked logical row only;
- meta/ctrl click toggles exactly one logical row membership, even when AG Grid exposes repeated native nodes for that row;
- shift-click derives the visible logical row order with duplicate suppression and selects only the contiguous logical range;
- `selectionScopeKey` reset clears both shared logical selection state and AG Grid native selection state, preventing stale IDs from reappearing after scope restoration.

### Exact shared owner of each rule

- logical row ID normalization owner: `src/components/shared/OperationalGridInteractions.ts`
- visible logical row order/range owner: `src/components/shared/OperationalGridInteractions.ts`
- grouped/raw selected-node publication owner: `src/components/shared/OperationalGridInteractions.ts`
- native AG Grid reset on scope change owner: `src/components/shared/OperationalGridMatrix.tsx`

## 4. Test evidence

Exact command:

```bash
rtk npm run test:unit -- src/components/shared/OperationalGridInteractions.test.tsx
```

Result:

- PASS

Pass/fail summary:

- 1 test file passed
- 11 tests passed
- 0 tests failed

Failures and classification:

- none in the focused OUT-10 shared regression suite

## 5. Typecheck/build evidence

Exact command:

```bash
rtk npm run typecheck
```

Result:

- FAIL, blocked by pre-existing unrelated frontend errors

First errors:

```text
src/components/NetworkReal.tsx(956,22): error TS2345
src/components/NetworkReal.tsx(2572,35): error TS2339
src/components/VendorsReal.tsx(539,22): error TS2345
src/components/VendorsReal.tsx(1158,167): error TS2339
```

Classification:

- unrelated existing `Network/Vendors` blockers
- not caused by OUT-10 Iteration 05 shared selection changes

Build:

- not run separately in this iteration because `typecheck` is already blocked by unrelated files

## 6. Human-first runtime validation checklist

Validate each workspace separately: Monitoring, External, Services.

1. Filter to known OUT10 rows or otherwise reduce the grid to a small visible set.
2. Single-click the first visible row.
   - Expected: selection count = 1.
3. Single-click the second visible row.
   - Expected: selection count remains 1 and the first row is no longer selected.
4. Meta-click on macOS or ctrl-click on Windows/Linux on the third visible row.
   - Expected: selection count = 2.
5. Meta/ctrl-click the third visible row again.
   - Expected: selection count = 1.
6. Click the first visible row, then shift-click the third visible row.
   - Expected: selection count = 3.
7. Group by a visible grouping field.
8. Select one row in group A and one row in group B.
   - Expected: selection count = 2.
9. Change search, filter, tab, or scope.
   - Expected: selection count clears to 0.
10. Restore the previous broader search, filter, or scope and select one new row.
   - Expected: only the new row is selected and old rows do not reappear.

## 7. Not verified list

- no human runtime smoke validation was performed in Monitoring
- no human runtime smoke validation was performed in External
- no human runtime smoke validation was performed in Services
- no full frontend build was run
- no Playwright automation was added in this iteration
