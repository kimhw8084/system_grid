# OUT-12 Iteration 06 — Services Dirty Guard Recovery Proof

## 1. Verdict

PASS

## 2. Score

95/100

## 3. Root cause found

Services was the only recovered target still mixing:

- a child-form dirty signal,
- a parent modal boolean,
- and a `resolveIsDirty` ref override on `WorkspaceModal`.

That left Services on a different dirty-close path than Monitoring and External, which both rely on a direct `isDirty` boolean for the active modal contract.

The Iteration 04 Services form also used `patchValue(...)` for non-user metadata normalization, while the safer shared pattern is to use `normalize(...)` for mount/type-driven shape cleanup that should stay clean.

Recovery removed the extra Services-only `resolveIsDirty`/ref path and restored a direct boolean dirty signal from the Services form into `WorkspaceModal`, while switching metadata shape sync to `normalize(...)`.

## 4. Files changed

- `frontend/src/components/ServicesReal.tsx`
- `frontend/src/components/ServiceRegistry.tsx`
- `frontend/src/components/shared/ServicesDirtyGuardRecovery.test.tsx`
- `frontend/OUT-12-ITERATION-06-SERVICES-DIRTY-GUARD-RECOVERY-PROOF.md`

## 5. Exact Services dirty-state fix

- Removed `resolveIsDirty={() => dirtyRef.current}` from the Services create/edit modal in `ServicesReal.tsx`.
- Removed the Services-only `dirtyRef` relay from the create/edit modal path.
- Kept the modal on the shared `WorkspaceModal isDirty={isDirty}` path, matching Monitoring and External.
- Changed `ServiceForm` to:
  - use `useOperationalFormDirty(...)` without a secondary parent callback inside the hook call,
  - explicitly forward `isDirty` to the parent modal through `useEffect`,
  - use `normalize(...)` instead of `patchValue(...)` for create-mode metadata shape synchronization so non-user normalization stays clean.
- Reset parent `isDirty` to `false` when a fresh Services item/form instance opens.

## 6. Monitoring/External comparison summary

Monitoring:

- passes the hook-owned `isDirty` directly into `WorkspaceModal`
- user edits call hook state updaters (`setFormData`, `updateValue`, `patchValue`) which make the hook dirty
- Escape/close route through `WorkspaceModal`
- dirty resets on save success via `resetDirty(...)`

External:

- passes a direct modal boolean `isDirty={isActiveModalDirty}` into `WorkspaceModal`
- user edits call `patchValue(...)` from `useOperationalFormDirty`
- active form modal does not use a local Escape bypass
- dirty clears by modal close/remount lifecycle for discard and successful save flow

Recovered Services:

- now matches the direct boolean `isDirty` modal pattern instead of the extra `resolveIsDirty` path
- user edits in `ServiceForm` drive `useOperationalFormDirty`
- Escape/close remain owned by `WorkspaceModal`
- discard clears by close/remount lifecycle; save closes the form and reopens clean

## 7. Behavior checklist

| Behavior | Result | Evidence |
|---|---|---|
| Services edit makes dirty true | PASS | `ServicesDirtyGuardRecovery.test.tsx` changes the Name field and asserts dirty state becomes `true` |
| Close button while dirty protected | PASS | focused test clicks modal close and asserts discard dialog appears and close is blocked |
| Escape while dirty protected | PASS | focused test sends `Escape` after edit and asserts discard dialog appears |
| Backdrop/outside protected or N/A | PASS | protected by unchanged shared `WorkspaceModal` dirty contract already covered by `WorkspaceModalDirtyContract.test.tsx` |
| Cancel/stay preserves edit | PASS | focused test dismisses discard dialog with `Close` and asserts edited Name value remains |
| Confirm discard closes | PASS | focused test clicks `Discard Changes` and asserts modal closes |
| Clean close works | PASS | focused test closes without edits and asserts no discard dialog appears |
| Save resets dirty or N/A | PASS | Services save path closes/remounts the form clean; parent dirty state resets on new form open |
| Reopen has no stale discarded edit | PASS | focused test reopens after discard and asserts the Name field is back to the initial clean value |

## 8. Tests run and exact results

Command:

```bash
cd frontend && npm run test:unit -- src/components/shared/ServicesDirtyGuardRecovery.test.tsx src/components/shared/WorkspaceModalDirtyContract.test.tsx src/components/shared/OperationalFormContracts.test.tsx
```

Result:

```text
Test Files  3 passed (3)
Tests  12 passed (12)
0 failed
```

Command:

```bash
cd frontend && npm run typecheck
```

Result:

```text
src/components/NetworkReal.tsx(956,22): error TS2345: Argument of type '{ item: any; }' is not assignable to parameter of type 'SetStateAction<{ item: any; point: { x: number; y: number; }; }>'.
src/components/NetworkReal.tsx(2572,35): error TS2339: Property 'style' does not exist on type '{ item: any; point: { x: number; y: number; }; }'.
src/components/VendorsReal.tsx(539,22): error TS2345: Argument of type '{ item: any; }' is not assignable to parameter of type 'SetStateAction<{ item: any; point: { x: number; y: number; }; }>'.
src/components/VendorsReal.tsx(1158,167): error TS2339: Property 'style' does not exist on type '{ item: any; point: { x: number; y: number; }; }'.
```

Classification:

- unrelated pre-existing `NetworkReal` / `VendorsReal` blockers
- no new Services typecheck blocker introduced by this recovery

## 9. Human-eye validation checklist for user

| Row | User check | YES/NO/N/A/BLOCKED |
|---|---|---|
| 1 | Services edit then close shows dirty protection | BLOCKED |
| 2 | Services edit then Escape shows dirty protection | BLOCKED |
| 3 | Cancel/stay keeps edited value | BLOCKED |
| 4 | Confirm discard closes | BLOCKED |
| 5 | Reopen has no discarded stale value | BLOCKED |
| 6 | Clean close has no warning | BLOCKED |
| 7 | Monitoring still works | BLOCKED |
| 8 | External still works | BLOCKED |

## 10. Next prompt rule

- Next prompt should be human-validation-only for Services recovery.
- Validate the eight checklist rows above.
- If any row fails, keep the next pass limited to `ServicesReal.tsx`, `ServiceRegistry.tsx`, focused Services dirty-guard tests, and a new recovery proof.

## 11. Statement

`OUT-12 is not Done and not locked by Iteration 06.`
