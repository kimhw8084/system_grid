# OUT-12 Iteration 04 — Golden Template Adoption Proof

## 1. Verdict

PARTIAL

## 2. Score out of 100

92/100

Deductions:

- `-4` runtime/manual modal interaction validation blocked by unavailable in-app browser backend
- `-4` full repo `typecheck` still blocked by unrelated pre-existing `NetworkReal` and `VendorsReal` errors

## 3. Selected target view and why

`Services`

Reason:

- Iteration 04 explicitly requires `Services` first unless source evidence proves it is already fully equivalent.
- `Services` was close, but not fully equivalent to the Monitoring golden contract because its form still used custom dirty comparison instead of the shared `useOperationalFormDirty` hook and lacked the Monitoring-style validation banner surface at the top of the modal body.

## 4. Files changed

- `frontend/src/components/ServiceRegistry.tsx`
- `frontend/src/components/ServicesReal.tsx`
- `frontend/src/components/shared/OperationalValidationWiring.contract.test.ts`
- `frontend/OUT-12-ITERATION-04-GOLDEN-TEMPLATE-ADOPTION-PROOF.md`

## 5. Monitoring golden behaviors copied/reused

- `WorkspaceModal` remains the outer window shell for the Services create/edit flow.
- `WorkspaceDossierShell` remains the shared body container wrapper.
- `useOperationalFormDirty` now drives Services form dirty-state behavior, matching Monitoring’s shared form-dirty hook path.
- `WorkspaceValidationBanner` now renders the top-of-body validation/error banner for Services, matching Monitoring’s banner placement pattern.
- Existing shared `WorkspaceModal` behavior continues to own close button, Escape, backdrop close, maximize/restore, discard cancel, and discard confirm behavior.

## 6. Shared template contract now used

Services create/edit now uses this shared modal/form contract:

- `WorkspaceModal`
- `WorkspaceDossierShell`
- `useOperationalFormDirty`
- `WorkspaceValidationBanner`

This is a real shared contract adoption, not another dirty-close-only patch.

## 7. Target before/after summary

Before:

- Services create/edit already used `WorkspaceModal`, but its form used local JSON dirty comparison instead of the shared form-dirty hook.
- Services surfaced field-level validation but did not expose a Monitoring-style top validation/error banner in the modal body.
- Backend general save errors were toasted only, not placed in the shared validation banner zone.

After:

- Services create/edit still preserves the same domain-specific body and mutations, but its form now uses `useOperationalFormDirty`.
- Services now renders `WorkspaceValidationBanner` at the top of the modal body and threads backend general errors into that banner.
- The outer modal/window grammar remains shared and now the form state/validation contract aligns materially closer to Monitoring’s golden path.

## 8. Domain preservation checklist

- No field redesign
- No mutation redesign
- No table interaction changes
- No compare/detail body deletion
- No history/link content deletion
- Existing Services domain fields preserved
- Existing Services mutation endpoints preserved
- Existing Services `WorkspaceDossierShell` body preserved
- Existing detail-to-edit routing preserved

## 9. Behavior matrix

| Behavior | Monitoring golden | Target after change | Result |
|---|---|---|---|
| Header/title/icon/subtitle | `WorkspaceModal` header grammar with domain title/icon/subtitle | Same shared `WorkspaceModal` header grammar already used by `ServiceRecordForm` | PASS |
| Status area | Monitoring status pills in shared header status slot | Services form/detail keep shared header status slot with service status/type/environment pills | PASS |
| Close button | Shared red close control via `WorkspaceModal` | Same shared close control via `WorkspaceModal` | PASS |
| Maximize | Shared maximize/restore control via `WorkspaceModal` | Same shared maximize/restore control via `WorkspaceModal` | PASS |
| Footer actions | Shared footer with domain actions in `footerRight`/`footerLeft` | Same shared footer action placement for save/close | PASS |
| Validation/error placement | Top-of-body `WorkspaceValidationBanner` plus field errors | Services now uses `WorkspaceValidationBanner` plus existing field errors | PASS |
| Escape | Shared modal Escape routed through dirty guard | Same shared Escape path via `WorkspaceModal` + dirty guard | PASS |
| Backdrop/outside | Shared backdrop close routed through dirty guard | Same shared backdrop close path via `WorkspaceModal` + dirty guard | PASS |
| Dirty guard | Monitoring uses `useOperationalFormDirty` to feed modal dirty state | Services now uses `useOperationalFormDirty` to feed modal dirty state | PASS |
| Clean close | Shared modal closes immediately when clean | Same | PASS |
| Cancel discard | Shared discard confirm can be canceled without closing | Same | PASS |
| Confirm discard | Shared discard confirm closes only after explicit confirmation | Same | PASS |
| Save/reset | Monitoring resets dirty baseline through shared dirty hook on save success | Services now saves through shared dirty hook path; modal closes on success before a visible stale-dirty state can persist | PASS |
| Detail-to-edit/state isolation | Detail closes and edit opens with isolated state | Services keeps detail-to-edit isolation through separate detail/form modal state owners | PASS |

## 10. Tests run and exact results

Command:

```bash
cd frontend && npm run test:unit -- src/components/shared/OperationalValidationWiring.contract.test.ts src/components/shared/OperationalFormContracts.test.tsx src/components/shared/WorkspaceModalDirtyContract.test.tsx
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

- unrelated pre-existing blockers outside the Services iteration scope

## 11. Runtime/manual validation result or exact blocker

Runtime/manual interaction validation is blocked in this session.

What was verified:

- local frontend is serving on `http://127.0.0.1:4173`
- `curl -I http://127.0.0.1:4173` returned `HTTP/1.1 200 OK`

What blocked manual modal interaction validation:

- in-app browser selection failed with exact result: `Browser is not available: iab`
- browser troubleshooting documentation was read as required
- `agent.browsers.list()` returned `[]`

Result:

- source-backed and test-backed adoption is proven
- live click/Escape/backdrop/manual modal exercise is not claimed

## 12. OUT-10 protection note

- No OUT-10 table-selection/shared grid behavior files were changed.
- No `OperationalGridInteractions` behavior was edited.
- No table interaction semantics were changed in Services.

## 13. OUT-11 protection note

- No OUT-11 floating-panel shared files were changed.
- No floating panel or overlay arbitration behavior was edited.
- The Services work stayed inside the modal/form path only.

## 14. Remaining risks

- Runtime/manual modal interaction remains unverified due browser backend unavailability.
- Services save success closes the modal immediately; this is source-correct, but unlike Monitoring it is not visibly exercising a post-save on-screen dirty reset state because the form unmounts on success.
- Full repo compile confidence is still reduced by unrelated `NetworkReal` and `VendorsReal` type errors.

## 15. Next prompt rule

- Next prompt should be runtime-validation-focused if a browser-capable session is available.
- Validate only the Services create/edit modal against Monitoring for close button, Escape, backdrop, dirty discard cancel/confirm, validation banner placement, and detail-to-edit isolation.
- Do not pivot back to BKM, Vendors, or Network for golden-template proof.

## 16. Statement

`OUT-12 is not Done and not locked by Iteration 04.`
