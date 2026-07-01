# OUT-14 Run 8 Stage 1 Baseline + Gap Map

## Executive Summary

Stage 1 finds that current External source is already much closer to Run 8 lock than the older OUT-14 audit implies.

Current source clearly shows External already consuming the shared shell, grid, row-action, floating-panel, modal, lifecycle/data-state, route, import, and snapshot-export contracts. The main remaining implementation gap is not a broad standardization failure. It is a precise persisted-state adapter bug in `External.tsx`: the `links` workspace mode is destroyed by `sanitizeExternalViewConfig`, which means saved views, active workspace state, restore/apply paths, and saved-view descriptions all flatten `links` into `active`.

This makes the smallest safe Stage 2 action narrower and more defensible than a general shell/grid pass:

- fix the `links` saved-view/workspace-state adapter path in `External.tsx`;
- do not broaden into shared-contract rewrites unless Stage 2 reveals a real shared deficiency.

No lock is claimed in Stage 1.

## Current External Source Map

### Route entry

- `frontend/src/App.tsx`
  - registers `/external`
  - mounts `<External />` inside `ProtectedRoute view="external"`
  - exposes sidebar navigation for `External`

### Main page/component

- `frontend/src/components/External.tsx`
  - owns the External workspace shell wiring
  - owns entity vs link tab behavior
  - owns saved views and persisted workspace state
  - owns grouped/raw grid wiring
  - owns row actions, bulk actions, detail/edit/link/compare flows
  - owns External-specific schema, fields, forms, warnings, purge truth, and route semantics

### Monitoring golden reference

- `frontend/src/components/MonitoringGrid.tsx`
  - current golden operational workspace reference for shell, toolbar rhythm, grouped/raw grids, bulk flyout pattern, and deep-link detail behavior

### Shared contracts External currently consumes

- `frontend/src/components/shared/OperationalWorkspace.ts`
  - minimum standard and operational import/export law
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
  - shell/header/command bar/floating-panel surfaces
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
  - persistent local state helper, overlay controller, grid runtime, deep-link route helper
- `frontend/src/components/shared/OperationalGridInteractions.ts`
  - row selection, shift range, grouped selection, context-menu geometry
- `frontend/src/components/shared/OperationalDataGrid.tsx`
  - shared grid shell and data-state rendering
- `frontend/src/components/shared/OperationalDataState.ts`
  - shared lifecycle/data-state resolution
- `frontend/src/components/shared/WorkspaceModal.tsx`
  - shared modal shell and dirty-close behavior
- `frontend/src/components/shared/WorkspaceModalShells.tsx`
  - shared compare shell
- `frontend/src/components/shared/OperationalFormContracts.ts`
  - shared entity-form dirty hook
- `frontend/src/components/shared/OperationalImportExport.ts`
  - manifest-backed export validation helper
- `frontend/src/components/shared/OperationalImportModal.tsx`
  - shared import modal workflow
- `frontend/src/components/shared/OperationalDataStatus.tsx`
  - diagnostic pill and modal

### External-specific modules/components involved

- `frontend/src/components/External.tsx`
  - `sanitizeExternalViewConfig`
  - `normalizeExternalSavedViews`
  - `normalizeExternalWorkspaceState`
  - `CompareExternalModal`
  - `LinkForm`
  - External row-action sections
  - External bulk actions
  - External detail body
  - External dependency and purge intelligence
- `backend/app/api/intelligence.py`
  - entity/link/secret CRUD, uniqueness rules, restore restrictions, archive restrictions
- `backend/app/api/import_engine.py`
  - `external_entities` import profile
  - manifest-backed snapshot export contract
- `frontend/src/components/settings/externalExportDiagnostics.ts`
  - External export diagnostics/report logic

## Shared Contracts External Currently Consumes

Current source shows External already consuming these shared contracts directly:

| Contract area | Current source evidence | Stage 1 read |
| --- | --- | --- |
| Shell/header/command grammar | `OperationalWorkspaceShell` in `External.tsx` | consumed |
| Toolbar primitives and placement grammar | `ToolbarSearch`, `ToolbarButton`, `ToolbarIconButton`, `ToolbarGroup` in `External.tsx` | consumed |
| Floating-panel anchoring and overlay arbitration | `useWorkspaceOverlayController`, `useWorkspaceAnchoredLayer`, shared panel components | consumed |
| Raw/grouped grid shell | `OperationalDataGrid`, `OperationalGroupedGridView`, `OperationalGroupedGridSection` | consumed |
| Selection and grouped selection contract | `useOperationalRowInteractions`, `useOperationalGroupedSelection`, `selectionScopeKey` | consumed |
| Grid runtime contract | `useOperationalGridRuntime` | consumed |
| Lifecycle/data-state contract | `resolveOperationalDataState` | consumed |
| Diagnostic pill/modal shell | `DiagnosticStatusPill`, `DataDiagnosticModal` | consumed |
| Modal shell contract | `WorkspaceModal` | consumed |
| Compare shell contract | `WorkspaceCompareShell` | consumed |
| Entity-form dirty contract | `useOperationalFormDirty` through `ExternalForm` `onDirtyChange` path | consumed |
| Import modal contract | `OperationalImportModal tableName="external_entities"` | consumed |
| Manifest-backed export contract | `downloadOperationalImportFile(...)` | consumed |
| Deep-link detail route contract | `useOperationalDetailRoute` | consumed |

Stage 1 does not find a shared-contract blocker that must be solved before External can proceed to a narrow Stage 2 fix.

## Acceptance Row Gap Table

| Area | Source-grounded finding | Classification | Priority | Why it matters |
| --- | --- | --- | --- | --- |
| Shell/header/command bar | Shared shell is clearly wired in current source | `SATISFIED_BY_SOURCE` | `P0` | Foundational golden-workspace grammar already present |
| Search/filter/saved/display/action placement | Placement is shared; link-tab filter swap is explicit | `SATISFIED_BY_SOURCE` | `P0` | Good spreadability signal; later proof still needed |
| Table layout and visual rhythm | Shared grid shell and grouped/raw rhythm are present | `SATISFIED_BY_SOURCE` | `P0` | Avoids a fake “needs rewrite” conclusion |
| Sorting/filtering/selection/bulk behavior | Shared interaction/runtime wiring is present | `SATISFIED_BY_SOURCE` | `P0` | Suggests no immediate grid-contract rewrite |
| Row action menu | Shared row-action shell with External-owned sections is present | `SATISFIED_BY_SOURCE` | `P0` | Reusable shell already adopted |
| Right-click behavior | Source routes context menu through shared system | `SATISFIED_BY_SOURCE` | `P0` | Needs manual proof, not a code-first rewrite |
| Floating panels | Shared overlay arbitration and anchored panels are present | `SATISFIED_BY_SOURCE` | `P0` | Stage 2 should not touch this first |
| Add/Edit modal behavior | Shared shell with External form body is present | `SATISFIED_BY_SOURCE` | `P0` | No current source gap forcing modal redesign |
| Detail window behavior | Shared detail modal and deep-link helper are present | `SATISFIED_BY_SOURCE` | `P0` | Requires proof later, not first implementation |
| Compare modal behavior | Shared compare shell with External-specific content is present | `SATISFIED_BY_SOURCE` | `P0` | Preserve, do not rewrite |
| Link/dependency forms | Shared modal shell + External domain logic + backend rules are present | `SATISFIED_BY_SOURCE` | `P0` | Strong domain-preservation zone |
| Dirty-state/unsaved-change behavior | Entity path looks shared; link path is local-but-plausible; saved-view draft guard exists | `PROOF_GAP` | `P0` | Needs validation, but no source-proven bug yet |
| Lifecycle/data states | Shared resolver and diagnostics shell are present | `SATISFIED_BY_SOURCE` | `P0` | Strong shared adoption signal |
| External import/export contract | Current source is manifest-backed and schema-versioned | `SATISFIED_BY_SOURCE` | `P0` | Removes old export blocker assumption |
| External route behavior | `/external` route and deep-link helper are present | `SATISFIED_BY_SOURCE` | `P0` | Needs later manual proof only |
| External-specific schema/columns | Domain body remains External-owned | `SATISFIED_BY_SOURCE` | `P0` | Critical preservation area |
| External-specific endpoints/mutations | Domain-specific backend semantics are intact and tested | `SATISFIED_BY_SOURCE` | `P0` | No backend redesign needed for Stage 2 |
| Diagnostics/readiness evidence | Source/test coverage exists, but real runtime proof for this run is still absent | `PROOF_GAP` | `P0` | Later proof-stage requirement |
| Accessibility/keyboard interaction | Likely inherited from shared primitives, but proof is weak | `PROOF_GAP` | `P1` | Important, not first implementation accelerator |
| Regression guardrails | Existing tests and proof artifacts exist | `SATISFIED_BY_SOURCE` | `P0` | Lock can later rely on focused proof expansion |
| Saved views/workspace state | `links` is flattened to `active` during sanitize/save/apply/restore | `IMPLEMENTATION_GAP` | `P0` | Highest-confidence Stage 2 target |
| Saved-view labeling for `links` | `describeView` labels any non-deleted view as `Registry` | `EXTERNAL_ADAPTER_GAP` | `P1` | Visible symptom of the same adapter gap |
| Old export blocker audit | Old OUT-14 audit still says export is AG Grid CSV | `STALE_AUDIT_ARTIFACT` | `P1` | Must not misdirect Stage 2 |

## Domain Preservation Risk Table

| Area | Current source evidence | Risk type | Why standardization could break it | Stage 1 handling |
| --- | --- | --- | --- | --- |
| Link form semantics | `LinkForm` stays local in `External.tsx`; backend enforces uniqueness/archive rules | `DOMAIN_PRESERVATION_RISK` | A generic relationship form could erase External-specific identity fields and failure modes | Preserve current domain form; do not genericize in Stage 2 |
| Dependency/purge intelligence | `getEntityInsights`, purge helpers, disabled reasons in `External.tsx` | `DOMAIN_PRESERVATION_RISK` | A shared destructive-action model could weaken truthfulness | Preserve exact logic and wording |
| Link row vs entity row actions | Row-action sections branch on `activeTab === 'links'` | `DOMAIN_PRESERVATION_RISK` | Shared menu refactors could collapse distinct row behaviors | Keep shared shell, not shared content |
| Detail route behavior for link rows | Double-clicking a link row opens owning entity detail | `DOMAIN_PRESERVATION_RISK` | A generic detail route might try to open link detail instead of entity detail | Preserve current External route semantics |
| External schema/body | Fields, labels, metadata rendering remain local | `DOMAIN_PRESERVATION_RISK` | Grid standardization could push toward generic field loss | Treat schema/body as immutable for Run 8 |
| Diagnostics language | External export diagnostics encode profile/schema/scope language | `DOMAIN_PRESERVATION_RISK` | Genericizing diagnostics could reduce truth for External-specific contract failures | Preserve External-specific report vocabulary |

## Stale-Audit Artifacts Table

| Artifact | Old assumption | Current source reality | Stage 1 verdict |
| --- | --- | --- | --- |
| `frontend/OUT-14-EXTERNAL-WORKSPACE-LOCK-AUDIT.md` import/export blocker row | External export still uses AG Grid CSV from viewport | `External.tsx` now uses `downloadOperationalImportFile(...)` with manifest-backed snapshot validation | `STALE_AUDIT_ARTIFACT` |
| Same audit’s recommendation to finish OUT-13 export wiring before OUT-14 can proceed | Export wiring remains the active blocker | Export wiring is already present in current source; remaining OUT-13 runtime company-domain proof is still separate but not a code blocker for Stage 1 analysis | `STALE_AUDIT_ARTIFACT` |

## Deployment Acceleration Priority Table

| Priority | Item | Why it accelerates deployment safely |
| --- | --- | --- |
| `P0` | Fix `links` saved-view/workspace-state corruption | Removes the one clear source-level reason External is not a truthful first non-Monitoring consumer |
| `P0` | Preserve current shared shell/grid/modal/import-export adoption | Avoids wasting time on a rewrite the repo no longer needs |
| `P0` | Preserve External link/dependency/purge semantics | Prevents losing user-critical domain behavior during standardization |
| `P0` | Later runtime proof for diagnostics/import-export and key interactions | Converts current source confidence into team-usable confidence |
| `P1` | Correct stale audit assumptions in working docs/review context | Keeps future prompts from reopening solved areas |
| `P1` | Accessibility/keyboard proof pass | Improves lock confidence without delaying the first narrow implementation |

## First Implementation Recommendation For Stage 2

### Exact recommendation

Fix External saved-view and persisted-workspace-state handling so `links` is preserved as a first-class workspace mode across:

- sanitize/normalize
- current workspace snapshot creation
- saved view creation
- saved view overwrite
- saved view apply
- system default restore
- saved-view description labeling

### Why this is the smallest safe first implementation step

- It is the only clear `IMPLEMENTATION_GAP` found in current source.
- It directly prevents External from truthfully qualifying as the first full non-Monitoring consumer.
- It is narrow, local, and adapter-oriented rather than a broad rewrite.
- It accelerates deployment by removing a user-visible persistence defect without touching stable shared contracts unnecessarily.

### Likely files involved

- `frontend/src/components/External.tsx`

Possible shared file touch only if source disproves current read during implementation:

- none currently recommended

### Stage 2 proof requirement after implementation

- source diff shows `links` survives normalization and apply paths
- saved view created from `links` remains `links` after refresh
- applying a saved `links` view returns to `links`
- description label for a `links` view is truthful
- active/deleted modes still restore correctly

## Commands Run

Commands run in Stage 1 were source-inspection commands only:

- `rtk rg ...`
- `rtk sed -n ...`
- `rtk cat frontend/package.json`
- Linear issue listing for project `SysGrid`, query `OUT-14`
- `rtk npm run test:unit -- src/components/settings/externalExportDiagnostics.test.ts src/components/shared/OperationalImportExport.test.ts`

Targeted test result:

- `2` test files passed
- `19` tests passed
- scope validated current frontend import/export and diagnostics contract coverage only

No code implementation commands were run in Stage 1.

## Source Files Inspected

- `docs/OUT-14-run8-stage0-cutline.md`
- `docs/OUT-14-external-acceptance-matrix.md`
- `docs/OUT-14-run8-risk-register.md`
- `docs/OUT-14-run8-proof-plan.md`
- `docs/OUT-14-run8-implementation-sequence.md`
- `frontend/OUT-14-EXTERNAL-WORKSPACE-LOCK-AUDIT.md`
- `frontend/src/App.tsx`
- `frontend/src/components/External.tsx`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/SettingsStandards.tsx`
- `frontend/src/components/settings/externalExportDiagnostics.ts`
- `frontend/src/components/settings/externalExportDiagnostics.test.ts`
- `frontend/src/components/shared/OperationalWorkspace.ts`
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/components/shared/OperationalGridInteractions.ts`
- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalDataState.ts`
- `frontend/src/components/shared/OperationalFormContracts.ts`
- `frontend/src/components/shared/OperationalImportExport.ts`
- `frontend/src/components/shared/OperationalImportExport.test.ts`
- `backend/app/api/intelligence.py`
- `backend/app/api/import_engine.py`
- `backend/test_external_workflows.py`
- `backend/test_import_workflows.py`
- `frontend/tests/external-workflows.spec.ts`

## Next Prompt Rule

Next prompt should be limited to one action:

`Run 8 Stage 2 — Fix External links saved-view/workspace-state persistence`

Do not combine that fix with broader shell, modal, compare, diagnostics, or route rewrites unless current implementation source disproves this Stage 1 baseline.
