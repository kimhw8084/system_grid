# OUT-8 Iteration 06 Selection Finalization Report

## 1. Changed files

* Shared selection/runtime changes:
    * src/components/shared/OperationalWorkspaceHooks.ts (No changes in Iteration 06)
* Monitoring consumer changes:
    * src/components/MonitoringGrid.tsx (No changes in Iteration 06)
* Report artifact:
    * OUT-8-ITERATION-06-SELECTION-FINALIZATION-REPORT.md
* Other changes:
    * None.

## 2. Selection ownership map

| Area | Ownership | Decision |
| :--- | :--- | :--- |
| selected IDs state | Shared-owned | Owned by useOperationalSelection. |
| selected IDs setter/update lifecycle | Shared-owned | setSelectedIds remains the shared replacement/update API. |
| clear selection | Shared-owned | clearSelection() is shared and consumed by Monitoring. |
| selected count | Shared-owned | selectedCount is shared and consumed by Monitoring. |
| has selection | Shared-owned | hasSelection() is shared and consumed by Monitoring. |
| selected-id predicate | Shared-owned | isSelected() is shared and consumed by Monitoring. |
| selection changed handler | Domain-owned / deferred | Remains local because it reads concrete grid selected nodes and coordinates grouped selection state. |
| grouped selection aggregation | Domain-owned / deferred | Remains local because it depends on Monitoring group semantics and groupSelectionsRef. |
| section-level selected count | Partially shared | Uses shared isSelected(), but section/group traversal remains Monitoring-owned. |
| bulk action relationship | Partially shared / domain-owned | Uses shared selectedCount; action definitions and mutation behavior remain domain-owned. |
| row-menu relationship | Unchanged / domain-owned | Row-menu remains untouched and local to avoid the prior opener/setter regression. |

## 3. Shared selection API summary

* **Hook/function name:**
    * `useOperationalSelection`
* **Inputs:**
    * optional `initialSelectedIds`
* **Outputs:**
    * `selectedIds`
    * `setSelectedIds`
    * `clearSelection`
    * `isSelected`
    * `selectedCount`
    * `hasSelection`
* **Monitoring now consumes:**
    * `selectedIds`
    * `setSelectedIds`
    * `clearSelection`
    * `isSelected`
    * `selectedCount`
    * `hasSelection`
* **Reserved for future workspaces:**
    * same generic selected ID lifecycle helpers.
* **Must remain domain-owned:**
    * domain row identity if not generic
    * group semantics
    * bulk actions
    * mutation logic
    * labels/copy
    * concrete grid node extraction if grid-specific

## 4. Explicit defer decisions

* **Selection-change handler lifecycle:**
    * Deferred.
    * Reason: current handler reads selected nodes from the concrete grid and coordinates grouped selection state.
* **Grouped selection aggregation:**
    * Deferred.
    * Reason: depends on Monitoring group semantics and `groupSelectionsRef`.
* **Bulk action relationship:**
    * Deferred except shared `selectedCount`.
    * Reason: action definitions and mutation behavior are domain-owned.
* **Known shift-range selection bug:**
    * Deferred to a later run.
    * Reason: not required for the selection lifecycle extraction and should not be mixed into Run 2 selection finalization.

## 5. Regression protection

* Row-menu was not touched.
* No `openRowActionMenu`: `setRowActionMenu` alias was introduced.
* No opener/setter alias was introduced.
* Display panel code was not changed.
* Saved views code was not changed.
* Bulk action behavior was not changed.
* Modal/window code was not changed.
* Route code was not changed.
* Target workspaces were not migrated.

## 6. Monitoring preservation evidence

* Visual layout remains unchanged because this slice only changed selection helper ownership/usage.
* Grid density, row height, header height, borders, fonts, padding, and scroll behavior are unchanged.
* Row menu behavior remains unchanged and local.
* Display panel behavior remains unchanged.
* Saved views behavior remains unchanged.
* Modal/window behavior remains unchanged.
* Selection behavior should remain equivalent because shared helpers wrap the same selected ID state semantics.

## 7. Verification results

* **npm run typecheck**
    * Blocked: missing dependency environment
* **npm run build**
    * Blocked: missing dependency environment
* **npm run test:lint**
    * Pass
* **node scripts/check-operational-registry-drift.cjs**
    * Pass
* **node scripts/check-form-contracts.cjs**
    * Pass
* **node scripts/check-row-action-contracts.cjs**
    * Pass

## 8. Remaining Run 2 work after selection slice

* saved views
* display panel
* row menu extraction
* bulk action panel
* modal/window state
* active item/detail route
* lifecycle/data-state flags

## 9. Zip/output

* This report file exists.
* The completed repo is ready for review.
