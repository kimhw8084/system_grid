# OUT-12 Iteration 02 Proof

## 1. Executive verdict

PARTIAL

Implementation fixes the three audited dirty-close bypasses with narrow, source-backed changes and passing focused tests. Runtime/manual validation could not be completed in this session because no in-app browser backend was available.

## 2. Score out of 100

88/100

Deductions:

- `-6` runtime/manual validation blocked by browser availability in this session
- `-6` full frontend `typecheck` blocked by unrelated pre-existing `NetworkReal`/`VendorsReal` errors

## 3. Source of truth reviewed

1. `frontend/OUT-12-ITERATION-01-MODAL-FORM-DIRTY-STATE-AUDIT.md`
2. Local OUT-12 source artifact search
   - no additional OUT-12 local objective/export file found beyond the Iteration 01 audit
3. Shared modal primitives
   - `frontend/src/components/shared/WorkspaceModal.tsx`
   - `frontend/src/components/shared/WorkspaceModalShells.tsx`
   - `frontend/src/components/shared/OperationalFormContracts.ts`
   - `frontend/src/components/shared/ConfirmationModal.tsx`
   - `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
4. Protected prior-run artifacts
   - `frontend/OUT-10-ITERATION-05-PROOF.md`
   - `frontend/OUT-11-ITERATION-05-CLOSE-READINESS-REVIEW.md`
5. Target implementations
   - `frontend/src/components/monitoring/BkmListModal.tsx`
   - `frontend/src/components/VendorsReal.tsx`
   - `frontend/src/components/NetworkReal.tsx`

## 4. Files changed

- `frontend/src/components/monitoring/BkmListModal.tsx`
- `frontend/src/components/VendorsReal.tsx`
- `frontend/src/components/NetworkReal.tsx`
- `frontend/src/components/shared/WorkspaceModalDirtyContract.test.tsx`
- `frontend/src/components/shared/OUT12DirtyWiring.contract.test.ts`
- `frontend/OUT-12-ITERATION-02-PROOF.md`

## 5. Root cause summary from Iteration 01 audit

- `BkmListModal` computed `isDirty` but never passed it to `WorkspaceModal`, and local `useEscapeDismiss(onClose)` bypassed the shared dirty guard.
- `VendorsReal` tracked `hasChanges` inside `VendorDetailPanel` but never passed it to `WorkspaceModal`, and local `useEscapeDismiss(onClose)` bypassed the shared dirty guard.
- `NetworkConnectionForm` used `WorkspaceModal` with no dirty tracking and local `useEscapeDismiss(onClose)`, allowing silent close on Escape and backdrop.

## 6. Implementation summary

### Shared modal changes

- No production code change was required in `WorkspaceModal`.
- Source inspection showed `WorkspaceModal` already routes header close, footer close, Escape, and backdrop mouse-down through `useOperationalDirtyGuard`.
- Iteration 02 therefore strengthened the plug-and-play path by fixing consumer wiring and adding focused shared contract tests rather than broadening modal internals unnecessarily.

### BkmListModal wiring

- Removed local `useEscapeDismiss(onClose)` so Escape no longer bypasses the shared modal lifecycle.
- Passed existing `isDirty` into `WorkspaceModal` via `isDirty={isDirty}`.
- No list, note, search, mutation, or layout behavior changed.

### VendorsReal wiring

- Removed local `useEscapeDismiss(onClose)` from `VendorDetailPanel`.
- Passed existing vendor dirty flag into `WorkspaceModal` via `isDirty={hasChanges}`.
- Preserved vendor edit mode, save mutation, personnel/contract subflows, and detail body layout.

### NetworkConnectionForm wiring

- Removed local `useEscapeDismiss(onClose)`.
- Added minimal dirty tracking by normalizing the initial form state through existing `sanitizeNetworkConnectionPayload(...)` and comparing the current normalized payload to that initial snapshot.
- Passed computed `isDirty` into `WorkspaceModal`.
- Preserved field rendering, validation, mutation payload shape, and success close behavior.

### Tests

- Added `WorkspaceModalDirtyContract.test.tsx` to cover close button, Escape, and backdrop behavior for clean vs dirty modal states.
- Added `OUT12DirtyWiring.contract.test.ts` to assert the three audited consumers now wire dirty state into `WorkspaceModal` and do not retain local Escape bypasses.
- Re-ran existing shared dirty-guard contract tests to ensure the navigation/discard path still behaves correctly.

## 7. Plug-and-play contract improvement

### What future views can now reuse

- `WorkspaceModal` remains the single close-request gateway for:
  - header close button
  - footer close button
  - Escape
  - backdrop/outside mouse-down
- Consumers only need to provide an `isDirty` signal to get shared dirty-close behavior.
- The focused tests now codify that reusable contract.

### What remains domain-owned

- form state shape
- validation rules
- mutation calls and success handling
- rich body/detail/compare/history content
- domain-specific inline cancel behavior that does not close the modal

## 8. Dirty-close behavior matrix

| Behavior | Result after Iteration 02 |
| :--- | :--- |
| Close button | Clean modals close immediately; dirty audited targets route through shared discard confirmation |
| Escape | Clean modals close immediately; dirty audited targets route through shared discard confirmation |
| Backdrop/outside | Dirty audited targets route through shared discard confirmation through `WorkspaceModal` backdrop mouse-down |
| Clean close | Preserved |
| Dirty cancel | Preserved by shared modal; discard prompt can be cancelled and modal stays mounted |
| Dirty confirm discard | Preserved by shared modal; close completes only after explicit confirmation |
| Save success reset | BKM and Vendors close/reset through existing success logic; Network closes on save success via existing `onSuccess` path |

## 9. Target validation matrix

| Target | Source status | Test status | Runtime/manual status |
| :--- | :--- | :--- | :--- |
| `BkmListModal` | PASS | Covered by source contract test | Blocked by browser availability |
| `VendorsReal` | PASS | Covered by source contract test | Blocked by browser availability |
| `NetworkConnectionForm` | PASS | Covered by source contract test | Blocked by browser availability |

## 10. Domain preservation checklist

- BKM linked procedure list body preserved
- BKM search/link/unlink/note mutation behavior preserved
- Vendor dossier/detail body preserved
- Vendor edit toggle/save/cancel semantics preserved
- Vendor personnel and contract subflows preserved
- Network connection field set preserved
- Network validation preserved
- Network save payload generation preserved

## 11. OUT-10 protection checklist

- No selection-contract files were edited
- No `OperationalGridInteractions` logic was touched
- Focused OUT-12 test run did not involve grid selection behavior
- Prior OUT-10 blocker state remains unchanged: unrelated `NetworkReal`/`VendorsReal` type errors still exist outside this iteration's dirty-close edits

## 12. OUT-11 protection checklist

- No floating-panel shared files were edited
- No overlay mutual-exclusion logic was edited
- `WorkspaceModal` production behavior was not broadened beyond existing shared guard usage
- Current iteration does not touch Display/Views/Bulk/RowAction panel logic

## 13. Test commands and exact results

Command:

```bash
rtk npm run check:form-contracts
```

Result:

```text
Form contracts check passed.
```

Command:

```bash
rtk npm run test:unit -- src/components/shared/WorkspaceModalDirtyContract.test.tsx src/components/shared/OUT12DirtyWiring.contract.test.ts src/components/shared/OperationalWorkspaceHooks.test.tsx src/components/shared/FormContractsGuard.test.ts
```

Result:

```text
Test Files  4 passed (4)
Tests  19 passed (19)
0 failed
```

## 14. Typecheck/build command and exact result, or exact unrelated blocker list

Command:

```bash
rtk npm run typecheck
```

Result:

```text
FAIL
src/components/NetworkReal.tsx(956,22): error TS2345: Argument of type '{ item: any; }' is not assignable to parameter of type 'SetStateAction<{ item: any; point: { x: number; y: number; }; }>'.
src/components/NetworkReal.tsx(2572,35): error TS2339: Property 'style' does not exist on type '{ item: any; point: { x: number; y: number; }; }'.
src/components/VendorsReal.tsx(539,22): error TS2345: Argument of type '{ item: any; }' is not assignable to parameter of type 'SetStateAction<{ item: any; point: { x: number; y: number; }; }>'.
src/components/VendorsReal.tsx(1158,167): error TS2339: Property 'style' does not exist on type '{ item: any; point: { x: number; y: number; }; }'.
```

Classification:

- unrelated pre-existing blockers in `NetworkReal.tsx` and `VendorsReal.tsx`
- not introduced by the Iteration 02 dirty-close changes

Build:

- not run separately because `typecheck` is already blocked by unrelated errors in target files outside the edited dirty-close lines

## 15. Runtime/manual validation results, or exact blocker

Runtime/manual validation blocker:

- attempted to initialize the required in-app browser runtime for localhost validation
- browser plugin runtime loaded, but `agent.browsers.get('iab')` returned `Browser is not available: iab`
- troubleshooting doc was read as required
- `agent.browsers.list()` returned `[]`

Result:

- no trustworthy interactive runtime/manual validation could be performed in this session
- runtime PASS is therefore not claimed

## 16. Packaging/artifact note

- This proof file exists inside the repo under `frontend/`
- Path: `frontend/OUT-12-ITERATION-02-PROOF.md`
- It is non-empty

## 17. Remaining risks

- Runtime/manual behavior for the three target flows is still unverified in a live browser session.
- `NetworkConnectionForm` dirty tracking compares normalized payloads; this is intentionally narrow and should match persisted semantics, but it has not yet been exercised interactively.
- Unrelated legacy `NetworkReal`/`VendorsReal` type errors still reduce review confidence for broad workspace compilation health.

## 18. Next prompt rule

- Next prompt should be validation-focused if a browser-capable session is available.
- If runtime validation passes, the follow-up can concentrate on confirming the three audited flows only.
- If runtime validation exposes a defect, the follow-up should remain narrow and limited to the specific audited close vector still failing.

## 19. Explicit statement

`OUT-12 is not Done and not locked by Iteration 02.`
