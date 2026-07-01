# OUT-14 Run 8 Stage 0 Cutline

## Status

Stage 0 status: `PASS_CANDIDATE`

Run 8 status after Stage 0: `NOT_LOCKED`

Lock claim status: `FORBIDDEN_IN_STAGE_0`

## Objective

Lock External as the first fully standardized non-Monitoring operational workspace using the shared operational contracts already established in Runs 2-7, without losing External-specific domain behavior.

This Stage 0 package is source-grounded in current repository artifacts. It is not a generic deployment plan, not an OUT-13 reopen, and not a permission slip for shell-level imitation.

## Source Grounding

Primary source files and artifacts inspected for this cutline:

- `docs/operational-workspace-law.md`
- `docs/OUT-13-temporary-conclusion-handoff.md`
- `frontend/OUT-13-EXTERNAL-EXPORT-ROUNDTRIP-PROOF.md`
- `frontend/OUT-14-EXTERNAL-WORKSPACE-LOCK-AUDIT.md`
- `frontend/src/components/External.tsx`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/SettingsStandards.tsx`
- `frontend/src/components/shared/OperationalWorkspace.ts`
- `frontend/src/components/settings/externalExportDiagnostics.ts`
- `frontend/src/components/shared/OperationalImportExport.ts`
- `backend/app/api/import_engine.py`
- `backend/app/api/intelligence.py`
- `frontend/tests/external-workflows.spec.ts`
- `backend/test_external_workflows.py`

## Exact Run 8 Lock Cutline

Run 8 is allowed to claim External as the first real plug-and-play consumer only if all of the following are true together:

1. External uses the shared shell/header/command grammar through the same operational primitives and placement law as Monitoring.
2. External uses the shared grid rhythm and interaction contract for raw/grouped table surfaces, selection, bulk behavior, saved views, display controls, and right-click handling.
3. External uses the shared floating-panel and modal shells for row actions, views, display, bulk, detail, edit, compare, and link flows.
4. External remains on the shared lifecycle/data-state contract for loading, empty, filtered empty, error, and diagnostics surfaces.
5. External file flow remains on the Run 7 import/export contract, including manifest-backed snapshot export, schema-versioned validation, and System Diagnostics compatibility.
6. External preserves its own domain body: schema, columns, forms, compare fields, link/dependency intelligence, endpoints, route behavior, and purge/dependency truthfulness.
7. Remaining implementation is reusable shared wiring or adapter-safe External wiring, not page-local imitation.

## Smallest Honest Scope

The smallest honest Run 8 scope is:

- prove External already consumes the shared contracts where source shows compliance;
- identify the remaining gaps that stop External from being lock-safe;
- implement only those gaps in the fastest order that increases future workspace spreadability.

Based on current source, the smallest remaining lock scope is not a broad rewrite. It is concentrated in:

- saved view and persisted workspace-state preservation for the `links` tab;
- proof-level validation that shared shell/grid/panel/modal behavior still holds in actual External runtime;
- lock-grade evidence that External-specific compare/link/dependency behavior was preserved while using shared shells;
- lock-grade diagnostics evidence that Run 7 import/export and System Diagnostics remain true in External runtime.

## What External Must Prove Before Implementation Is Allowed

Before Stage 1 implementation work begins, Run 8 must treat the following as binding:

1. Shared contracts are the primary implementation path.
2. External-specific domain logic is preserved by default.
3. Any remaining gap must be classified as:
   - shared contract gap;
   - External adapter/wiring gap;
   - proof-only gap;
   - blocked by a current source dependency.
4. No implementation is allowed to broaden into Services, Network, Assets, Vendors, FAR, Research, generic deployment, or backend redesign.

## Deployment-Critical Priorities

### P0

Directly accelerates a team-usable golden system:

- shared shell/header/command contract truth in External;
- shared grid interaction and persisted-state truth in External;
- row action, right-click, panel, and modal contract truth in External;
- External-specific compare/link/dependency intelligence preserved under shared shells;
- Run 7 import/export contract consumption stays true in External;
- System Diagnostics can still report External export/import contract truth;
- lock evidence is explicit enough that future workspace migrations can copy the pattern instead of rediscovering it.

### P1

Needed before final lock, but not first implementation:

- keyboard and accessibility edge validation beyond current automated coverage;
- secondary panel polish or non-blocking alignment drift;
- documentation alignment across run artifacts after source truth is stable.

### P2

Defer unless objectively blocking:

- Services migration;
- Network migration;
- Assets migration;
- Vendors migration;
- FAR migration;
- Research migration;
- broad route cleanup;
- broad backend redesign;
- generic deployment or data-durability planning.

## Shared Contracts External Must Consume

External must consume these locked shared contracts as currently present in source:

- workspace law and minimum standard from `frontend/src/components/shared/OperationalWorkspace.ts`
- shell/header/toolbar/floating-panel grammar from `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- persisted state, overlay arbitration, and detail route helpers from `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- shared grid rendering and empty/error surfaces from `frontend/src/components/shared/OperationalDataGrid.tsx`
- selection, right-click, and grouped interaction contract from `frontend/src/components/shared/OperationalGridInteractions.ts`
- lifecycle/data-state resolver from `frontend/src/components/shared/OperationalDataState.ts`
- dirty-state form contract from `frontend/src/components/shared/OperationalFormContracts.ts`
- modal shell and dirty-close law from `frontend/src/components/shared/WorkspaceModal.tsx`
- compare modal shell from `frontend/src/components/shared/WorkspaceModalShells.tsx`
- schema-versioned import/export client contract from `frontend/src/components/shared/OperationalImportExport.ts` and `OperationalImportModal.tsx`
- diagnostics posture from `frontend/src/components/settings/externalExportDiagnostics.ts`

## External-Specific Behaviors That Must Be Preserved Exactly

The following are preservation-critical and cannot be genericized away:

- External entity schema and field semantics
- External columns and labels
- External quick-filter split between entity tabs and links tab
- External forms and metadata shape
- External detail body and compare fields
- External row actions for entity rows vs link rows
- External link creation, edit, and delete behavior
- External dependency and purge intelligence
- External endpoint and mutation semantics under `/api/v1/intelligence/...`
- External deep-link detail route behavior under `/external?id=...`
- External import/export profile identity: `external_entities`
- External diagnostics truth for manifest, CSV, preview, and fallback behavior

## Current Source-Based Run 8 Readiness Read

Current source shows these areas already aligned or substantially aligned:

- shared shell/header/command grammar
- shared grid/table surface
- shared selection and bulk strip behavior
- shared right-click row-action shell
- shared detail/edit/compare modal shell
- shared lifecycle/data-state wiring
- shared import modal wiring
- shared snapshot export wiring through `downloadOperationalImportFile`
- diagnostics source for External export contract
- route registration under `/external`

Current source shows one clear lock-sensitive gap still present:

- persisted view/workspace sanitization drops `links` and collapses `activeTab` to `active|deleted` in `sanitizeExternalViewConfig`, while runtime state itself supports `active|deleted|links`

Current source also shows one older audit statement is now stale:

- `frontend/OUT-14-EXTERNAL-WORKSPACE-LOCK-AUDIT.md` still describes External export as blocked by the old AG Grid CSV path
- current `frontend/src/components/External.tsx` now routes export through `downloadOperationalImportFile(...)` with manifest-backed snapshot validation

This means Stage 1 should not assume a broad contract gap. It should start from a narrow baseline/gap map and protect already-wired shared behavior.

## Explicit Exclusions

Excluded from Run 8 unless objectively blocking:

- Services migration
- Network migration
- Assets migration
- Vendors migration
- FAR migration
- Research migration
- route cleanup beyond External needs
- broad backend redesign
- database durability strategy
- generic deployment project
- styling-only imitation of Monitoring
- local one-off CSS or event patches that do not increase spreadability

## PASS / PARTIAL / FAIL / WORSE Law

### PASS

Stage 0 passes if these docs define an unambiguous, source-grounded lock cutline and acceptance system that protects both shared-contract adoption and External domain preservation.

### PARTIAL

Stage 0 is partial if the sequence is usable but lacks enough current-source inventory, evidence rules, or failure triggers to safely govern Stage 1.

### FAIL

Stage 0 fails if it becomes generic deployment planning, vague UI parity planning, or a narrative without a usable acceptance matrix.

### WORSE

Stage 0 is worse if it encourages:

- local imitation instead of shared contracts;
- loss of External-specific behavior;
- view-by-view patching;
- or scope creep outside Run 8.

## Next Approved Prompt Type

If this Stage 0 package is accepted, the next prompt should be:

`Run 8 Stage 1 — External Baseline + Gap Map`
