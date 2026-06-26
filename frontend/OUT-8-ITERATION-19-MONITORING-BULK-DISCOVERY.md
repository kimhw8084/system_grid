# OUT-8 Iteration 19 — Monitoring Bulk Menu Discovery

## Verdict
- LEGACY_INCOMPLETE_SURFACE

## Evidence
- Files inspected:
  - `frontend/src/components/MonitoringGrid.tsx`
  - `src/components/shared/OperationalWorkspaceShells.tsx`
- Symbols inspected:
  - `showBulkMenu`, `setShowBulkMenu`
  - `bulkMenuButtonRef`, `bulkMenuPanelRef`, `bulkMenuStyle`
  - `useWorkspaceAnchoredLayer`, `useOperationalDismissController`
  - `OperationalAnchoredPanel`
  - `BulkActionModals`, `BulkEditTableModal`
  - `selectedRows`, `selectedCount`

## Findings
- `MonitoringGrid` maintains `showBulkMenu` state and a `bulkMenuButtonRef` that triggers `toggleBulkWindow`.
- However, there is no rendered `OperationalAnchoredPanel` or equivalent container for the bulk menu in the `floatingPanels` section.
- The `bulkMenuTrigger` button exists and toggles the `showBulkMenu` state.
- `BulkActionModals` and `BulkEditTableModal` are rendered as modals, not as anchored floating panels.
- It appears that the `showBulkMenu` lifecycle logic in `MonitoringGrid` is a legacy holdover or placeholder that was never fully realized for an anchored bulk menu.
- Monitoring has bulk trigger/state.
- Monitoring does not render an anchored bulk menu panel today.
- BulkActionModals and BulkEditTableModal are modal surfaces, not the missing anchored bulk menu.
- Source evidence supports LEGACY_INCOMPLETE_SURFACE, not INTENTIONALLY_MISSING.

## Safe next action
- Do not add bulk UI yet.
- Do not remove state yet.
- Next action should be chosen separately after deciding whether legacy incomplete bulk surface should be restored, removed, or tracked as a separate issue.
