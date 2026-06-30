# OUT-14 External Workspace Lock Audit

## 1. Audit verdict

`BLOCKED_BY_OUT13_IMPORT_EXPORT`

Audit confidence: `88`

Reason:
- External is already on the shared shell, grid, selection, floating-panel, lifecycle/data-state, detail-route, compare, and primary form contracts.
- External is not fully lock-safe yet because its visible file-flow surface is split:
  - import uses the shared schema/profile flow via `OperationalImportModal` and `/api/v1/import/...`
  - export still uses AG Grid CSV from the current viewport in `External.tsx`, not the schema-versioned round-trip snapshot contract called for in shared source.
- There is also one clear External-local gap after that: saved workspace state/saved views sanitize `activeTab` down to `active|deleted` and drop `links`.

## 2. Source inventory

### External source files

- `frontend/src/components/External.tsx`
  - Primary audit target. Owns External shell wiring, command bar, saved views, filters, grouped/raw grid, row actions, bulk actions, detail/edit/link/compare flows, lifecycle mutations, import/export entry points, and External-specific dependency logic.

### Monitoring/golden reference files

- `frontend/src/components/MonitoringGrid.tsx`
  - Golden operational workspace reference for shared shell wiring, selection, grouped/raw grid behavior, diagnostics, saved views/display panels, compare shell, import modal wiring, and detail-route behavior.
- `frontend/src/components/SettingsStandards.tsx`
  - Human-readable contract reference for command-bar placement, native range selection, bulk flyout shape, saved-view integrity, and page-header scope-switch placement.

### Shared contract files

- `frontend/src/components/shared/OperationalWorkspace.ts`
  - Declares the shared workspace capability matrix and the explicit import/export round-trip requirement.
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
  - Owns shared page shell, command bar layout, floating panel portal surface, grouped section shells, display panel, and saved views panel.
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
  - Owns persisted state helpers, overlay arbitration, grid runtime handlers, and deep-link detail route contract.
- `frontend/src/components/shared/OperationalDataState.ts`
  - Owns lifecycle/data-state resolver vocabulary.
- `frontend/src/components/shared/OperationalDataGrid.tsx`
  - Owns shared grid rendering for loading/query-error/no-rows states.
- `frontend/src/components/shared/OperationalGridInteractions.ts`
  - Owns selection normalization, shift-range behavior, right-click handling, grouped selection publication, and overlay dismissal rules.
- `frontend/src/components/shared/OperationalFormContracts.ts`
  - Owns shared form-dirty hook contract.
- `frontend/src/components/shared/OperationalImportModal.tsx`
  - Owns shared import modal UI and `/api/v1/import/schema|preview|execute` client flow.
- `frontend/src/components/shared/OperationalDependencyGuard.ts`
  - Owns shared purge-blocker result/tooltip shape.
- `frontend/src/components/shared/WorkspaceModal.tsx`
  - Owns shared modal dirty-close, maximize, header/footer shell.
- `frontend/src/components/shared/WorkspaceModalShells.tsx`
  - Owns shared compare shell.
- `frontend/src/components/shared/OperationalGridStandard.tsx`
  - Owns standardized column/action renderers used by External and Monitoring.

### Proof artifacts

- `frontend/OUT-9-LIFECYCLE-DATA-STATE-CONTRACT-PROOF.md`
  - Confirms Monitoring and External are both on the shared lifecycle/data-state resolver and grid error-state path.
- `frontend/OUT-10-ITERATION-01-TABLE-INTERACTION-CONTRACT-AUDIT.md`
  - Prior audit evidence for shared table interaction standard scope.
- `frontend/OUT-10-ITERATION-05-PROOF.md`
  - Confirms shared selection contract and `selectionScopeKey` wiring were fixed in shared code and wired into External.
- `frontend/OUT-11-ITERATION-01-FLOATING-PANEL-CONTRACT-AUDIT.md`
  - Floating-panel contract audit source evidence chain exists.
- `frontend/OUT-11-ITERATION-05-CLOSE-READINESS-REVIEW.md`
  - Confirms shared overlay mutual exclusion/dismissal law and explicitly references preserved External dirty-close behavior for menus.
- `frontend/OUT-12-ITERATION-01-MODAL-FORM-DIRTY-STATE-AUDIT.md`
  - Establishes External inventory in the modal/form/dirty-state audit.
- `frontend/OUT-12-ITERATION-04-GOLDEN-TEMPLATE-ADOPTION-PROOF.md`
  - Confirms the shared modal/form dirty contract shape used as the golden template.
- `frontend/OUT-12-ITERATION-06-SERVICES-DIRTY-GUARD-RECOVERY-PROOF.md`
  - Re-states Monitoring and External as the direct-boolean dirty baseline for shared modal behavior.

### Backend/API files

- `backend/app/api/intelligence.py`
  - Needed to verify External entity/link CRUD, restore, purge guard truthfulness, and lack of history/bulk endpoints.
- `backend/app/api/import_engine.py`
  - Needed to verify whether External file-flow already has a schema-versioned import/export profile.

## 3. External feature preservation inventory

| Feature | Current source evidence | OUT-14 safe to touch? |
| --- | --- | --- |
| External entity schema and columns | `External.tsx` owns entity field lists, metadata handling, column configs, colors, and External-specific display labels. | `NO`, except shared-shell wiring around it. Domain schema stays owned by External. |
| Link forms and link rows | `LinkForm` in `External.tsx`; links tab uses separate query `/api/v1/intelligence/links`; link create/update/delete stays in External. | `YES`, but only shell/dirty/form contract wiring. Do not genericize link semantics. |
| Dependency intelligence | `getEntityInsights`, warning generation, link counts, owner/contact/secret coverage, purge blockers all live in `External.tsx`. | `NO`, preserve as domain logic. |
| Compare behavior/modal | `CompareExternalModal` uses shared `WorkspaceModal` + `WorkspaceCompareShell`, but fields and copy are External-owned. | `YES`, shell only. Do not replace compare contents. |
| Detail/edit flows | `activeDetails`, `activeModal`, `detailRoute.openEditFromDetail`, shared `WorkspaceModal`, shared share-header. | `YES`, route/modal shell only. Keep domain content. |
| Route behavior | `useOperationalDetailRoute` wired from `External.tsx`; supports deep-link by entity `id`. | `YES`, but only if preserving entity detail route semantics. |
| Endpoints and mutations | `/api/v1/intelligence/entities`, `/restore`, `/links`, `/secrets`, `/devices`, `/logical-services` are all explicitly wired in `External.tsx`. | `NO`, do not redesign endpoint semantics. |
| Unsafe purge/dependency guard behavior | `getExternalEntityPurgeGuard`, `buildExternalMultiSelectPurgeReason`, toolbar/detail/row-action disabled reasons, backend purge checks in `intelligence.py`. | `NO`, preserve truthfulness. |
| Diagnostics and lifecycle behavior | Shared `resolveOperationalDataState`, shared grid query-error path, `DiagnosticStatusPill` + `DataDiagnosticModal` in header, shared bulk/lifecycle toasts. | `YES`, only shared contract surfaces. |

## 4. Contract acceptance matrix

| Surface | Golden/shared contract evidence | External current evidence | Verdict | Gap/risk | Smallest next action | Human-eye check |
| --- | --- | --- | --- | --- | --- | --- |
| Shell/header/command bar | `OperationalWorkspaceShell`, `PageHeader`, and `HeaderScopeSwitch` define the shared shell; `SettingsStandards.tsx` says the scope switch belongs in the header action zone. | External uses `OperationalWorkspaceShell` with header title/subtitle, `HeaderScopeSwitch`, and shared toolbar primitives in the same overall shape as Monitoring. | `COMPLIANT` | None found from source. | None. | Verify header title, subtitle, and scope switch placement match Monitoring rhythm. |
| Search/filter/saved/display/action placement | Shared shell + `OperationalDisplayPanel` + `OperationalSavedViewsPanel` own command-bar placement. | External search, filters, views, display, import, compare, bulk, and add actions all sit inside the shared command-bar slots. | `COMPLIANT` | None for placement. | None. | Verify search left, controls center/left, actions right, secondary filters below. |
| Grid/table visual rhythm | Shared `OperationalDataGrid`, `OperationalGridStandard`, `OperationalWorkspaceShells`, and grid sizing helpers. | External grid uses the shared raw/grouped surfaces and shared standard column builders. | `COMPLIANT` | Domain columns differ intentionally. | None. | Verify row height, utility columns, grouped section chrome, and loading/error surfaces feel like Monitoring. |
| Sorting/filtering/pinning/resizing/hidden columns/saved views | Shared grid runtime and sanitizers own resize/move/pin/visibility/filter/sort persistence; `SettingsStandards.tsx` calls out saved-view integrity. | External wires shared runtime handlers and sanitizers, but `sanitizeExternalViewConfig` and initial state restore collapse `activeTab` to `active|deleted` and drop `links`; saved-view description also treats non-deleted views as generic `Registry`. | `MAJOR_GAP` | Links-tab workspace mode cannot round-trip through persisted UI state/saved views even though External exposes it as a first-class scope. | After OUT-13, make External saved-state/view sanitization preserve `links` exactly. | Save/apply a Links view, refresh, and confirm the workspace returns to Links rather than Active. |
| Row actions and right-click behavior | Shared `useOperationalContextMenu`, `OperationalRowActionMenu`, and OUT-11 close-readiness proof cover right-click and overlay arbitration. | External right-click opens shared row-action menu; row actions are tab-aware for entity vs link rows and preserve purge guards. | `COMPLIANT` | None found from source. | None. | Right-click an entity row and a link row; confirm native menu is suppressed and correct row menu opens. |
| Selection and bulk actions | Shared `useOperationalRowInteractions`, `useOperationalGroupedSelection`, `selectionScopeKey`, and OUT-10 proof own native-feeling selection and grouped/raw reset behavior. | External passes `selectionScopeKey` into raw and grouped grids and uses shared shift-range/toggle logic; bulk flyout is shared Monitoring-style. | `COMPLIANT` | No source gap found. | None. | Verify click replace, cmd/ctrl toggle, shift range, grouped selection, and bulk count reset on scope change. |
| Floating panels | Shared overlay controller, dismiss controller, anchored panel primitives, and OUT-11 proof own mutual exclusion and outside-click/Escape behavior. | External views/display/bulk/row-action overlays are all on shared primitives; proof artifacts explicitly reference preserved External unsaved-view interception. | `COMPLIANT` | None found from source. | None. | Open display, then bulk, then row action; ensure only one active panel survives and draft view-name guard still intercepts close. |
| Modal/window/detail/edit/link/compare behavior | Shared `WorkspaceModal`, shared compare shell, shared detail-route transitions, and OUT-12 audit/proof form the golden modal grammar. | External entity edit uses shared dirty hook and shared modal; detail uses shared modal and share header; compare uses shared compare shell; link modal uses shared modal but keeps local form state logic. | `MINOR_GAP` | Link modal is behaviorally protected by shared `WorkspaceModal isDirty`, but it is not on the same shared dirty-hook path as the primary entity form. | Keep as-is for now unless a concrete dirty-state bug appears; do not broaden into a form rewrite during OUT-14. | Open entity edit, detail, compare, and link modals; verify consistent header/footer/maximize/close behavior. |
| Dirty-state and form safety | Shared `WorkspaceModal` dirty protection and `useOperationalFormDirty` are the locked baseline; OUT-12 artifacts treat Monitoring/External as the reference boolean-dirty path. | Entity create/edit uses `useOperationalFormDirty`; link form uses local JSON dirty comparison but still feeds `isDirty` into shared `WorkspaceModal`. | `MINOR_GAP` | Implementation path differs for link form, but source still shows shared dirty-close enforcement at modal level. | Defer unless a real dirty bug is observed; the stronger source blocker is file-flow plus links-view persistence. | Edit entity form and link form, press Escape, click backdrop, and confirm dirty protection blocks silent discard. |
| Lifecycle/data-state states: loading, empty, filtered-empty, active/deleted empty, query-error, diagnostics | Shared `resolveOperationalDataState` + `OperationalDataGrid`; OUT-9 proof confirms External is on the shared resolver and query-error grid path. | External uses shared resolver for entity and links tabs and now exposes query diagnostics in the header via shared diagnostic components. | `COMPLIANT` | Links tab still maps zero-row tab empty to shared `raw-empty`/`filtered-empty` rather than a third tab-empty kind, but labels remain truthful. | None now. | Break entity query and links query separately; verify shared empty/error surface plus diagnostic pill/modal. |
| File-flow/import/export applicability | Shared workspace standard explicitly requires schema-versioned round-trip import/export. Shared `OperationalImportModal` already uses `/api/v1/import/schema|preview|execute`. Backend `import_engine.py` defines `external_entities` profile plus schema-versioned template/snapshot endpoints. | External import button uses `OperationalImportModal tableName=\"external_entities\"`, but export button still calls `gridRef.current.api.exportDataAsCsv(...)` from the current table view. | `MAJOR_GAP` | Current External export is viewport/grid CSV, not the schema-versioned snapshot contract needed for reliable round-trip file flow. This is the real OUT-13 blocker. | Complete OUT-13 for External export wiring before locking OUT-14. | Compare the current export file against the import template/snapshot expectations; confirm whether it round-trips without manual column surgery. |
| External route behavior | Shared `useOperationalDetailRoute` owns `?id=` deep-link behavior and edit/detail/link transitions. | External uses `useOperationalDetailRoute`; entity detail deep-links are supported and detail-to-edit/detail-to-link transitions clear the route correctly. | `COMPLIANT` | Route contract is entity-detail-centric by design; links rows intentionally open the owning entity detail. | None. | Open `/external?id=<entityId>`, confirm detail opens and archived entities push the scope switch to Archived. |
| External-specific dependency/link/compare intelligence | Shared contracts do not own External’s dependency model; only shell/interaction surfaces are shared. | External keeps warnings, purge blockers, link semantics, compare fields, and ownership/contact/secret intelligence local. | `COMPLIANT` | Must not be genericized during lock work. | None. | Validate that compare fields, purge blockers, link labels, and warning counts remain External-specific. |

## 5. Shared-vs-domain boundary

Shared contracts own:
- page shell, header, toolbar slots, and command-bar rhythm
- grid runtime behavior for selection, resizing, filter/sort/visibility persistence, grouped/raw rendering, and query-error surface
- floating-panel arbitration, dismissal, anchoring, and shared row-action shell
- modal shell, dirty-close protection, maximize/restore, compare shell, and detail-route URL behavior
- lifecycle/data-state vocabulary and shared lifecycle/bulk toast wording
- shared import modal shell and schema/profile-driven import client flow

External owns:
- External entity schema, metadata shape, colors, labels, warnings, and compare fields
- endpoint semantics for entities, links, secrets, devices, and logical services
- dependency intelligence, link intelligence, purge guards, and blocker wording
- compare contents, detail body contents, link-form fields, and domain validation rules
- any decision about how External-specific links map to entity detail routes

Do not move External schema, endpoint semantics, link intelligence, compare contents, or domain validation into generic shared code.

## 6. Import/export decision

`OUT13_REQUIRED_BEFORE_EXTERNAL_LOCK`

Source evidence:
- Shared source explicitly says operational import/export must be schema-versioned and round-trip safe: `frontend/src/components/shared/OperationalWorkspace.ts`.
- External import is already on the shared profile-based path: `OperationalImportModal` in `External.tsx` with `tableName="external_entities"`.
- Backend already has an `external_entities` import profile plus schema-versioned template/snapshot endpoints in `backend/app/api/import_engine.py`.
- External export is still ad hoc AG Grid CSV from the visible table state in `External.tsx`, not the schema-versioned snapshot/profile export path.

Why this blocks lock:
- External already exposes file-flow in its primary command bar.
- A workspace cannot be described as the first fully standardized non-Monitoring operational workspace while one of its visible file-flow surfaces still bypasses the shared round-trip contract.

## 7. Smallest safe next action

`STOP_BLOCKED`

Blocker:
- Finish the External-facing portion of OUT-13 first: replace the current External export path with the schema-versioned snapshot/profile export contract already present in backend/shared source.

Post-blocker note:
- After OUT-13 is resolved, the smallest remaining OUT-14-local target is `External.tsx` saved-state/view sanitization for the `links` tab.

## 8. Manual validation checklist

1. Open External and compare the page shell against Monitoring. Confirm header title/subtitle, scope switch, command bar, and secondary filter row use the same visual grammar.
2. In Active and Archived scopes, verify search, views, display, import, filters, activity toggle, compare, bulk actions, and add action all render in the expected slots.
3. In Links scope, verify the filter row switches to direction/protocol filters and does not leave entity-only filters behind.
4. Right-click an entity row. Confirm the native browser context menu does not appear and the shared row-action menu opens at the cursor.
5. Right-click a link row. Confirm the row-action menu changes to link-specific actions without breaking the shared shell.
6. Test selection behavior in raw grid: single click replaces selection, cmd/ctrl toggles, shift selects a visible range, and bulk count matches selected rows.
7. Test grouped mode: select rows in multiple groups, switch back to raw or another scope, and confirm stale selection does not survive.
8. Open the Display panel, then Views, then Bulk Actions, then a row action menu. Confirm only one floating panel remains open and outside-click/Escape behavior is stable.
9. Type a new saved-view name, then click away. Confirm the unsaved draft close prompt appears and cancel preserves the draft.
10. Open entity Details from a row, then use Edit from the detail modal. Confirm the detail closes, the route clears, and the edit modal opens cleanly.
11. From entity Details, use Map Link. Confirm the detail closes and the link modal opens with the selected entity seeded.
12. Open Compare with 2 to 5 selected entity rows. Confirm the compare modal uses the shared compare shell and preserves External-specific fields.
13. Edit an entity form, change a field, then press Escape and click the backdrop. Confirm dirty protection prevents silent discard.
14. Open the link form, change a field, then press Escape and click the backdrop. Confirm dirty protection also prevents silent discard.
15. Break the entities request and verify the shared query-error card plus diagnostic pill/modal show entity-specific endpoint details.
16. Break the links request and verify the same shared diagnostic path switches to links-specific endpoint details.
17. In Archived scope, try to purge an entity that still has links or credentials. Confirm purge is disabled and the blocker reason names linked records truthfully.
18. Save a Links-scoped view, refresh the page, and apply that view. Confirm whether the workspace incorrectly returns to Active instead of Links.
19. Use the current Export button and compare the file shape with the import template/snapshot expectations. Confirm whether it is a schema-versioned round-trip export or just a table CSV.

## 9. Verification commands

Command:

```bash
rtk npm run test:unit -- src/components/shared/OperationalDataState.test.ts src/components/shared/OperationalGridInteractions.test.tsx src/components/shared/WorkspaceModalDirtyContract.test.tsx src/components/shared/OperationalFormContracts.test.tsx
```

Exact result:
- Passed.
- `4` test files passed.
- `25` tests passed.

Command:

```bash
rtk npm run typecheck
```

Exact result:
- Failed with existing blockers outside External/OUT-14 scope:
  - `src/components/NetworkReal.tsx(956,22): error TS2345`
  - `src/components/NetworkReal.tsx(2572,35): error TS2339`
  - `src/components/VendorsReal.tsx(539,22): error TS2345`
  - `src/components/VendorsReal.tsx(1158,167): error TS2339`
- No new External-specific typecheck blocker was surfaced by this run.

## 10. Final recommendation

Recommended verdict:
`BLOCKED_BY_OUT13_IMPORT_EXPORT`

Recommended score:
`88/100`

Recommended next prompt type:
`OUT-13 narrow implementation`

Smallest next prompt rule:
`Touch only External export wiring and the existing shared/backend import-export path needed to make External export schema-versioned and round-trip safe. Do not mix in saved-view, route, compare, or domain-schema refactors.`

Forbidden next prompt:
`Do not request a broad External workspace rewrite or a mixed OUT-13 + OUT-14 parity pass.`
