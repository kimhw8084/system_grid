# RUN3-G Implementation Roadmap

## Verdict
The codebase is currently source-defined rather than doc-defined, creating significant sustainability risk. While a robust Trio (`Monitoring`, `External`, `Services`) acts as the "de facto" operational standard, the persistence of duplicate routes and legacy operational hooks in other workspaces (`NetworkReal`, `AssetReal`, `VendorsReal`) creates unsustainable drift and maintenance overhead. The "golden objective" of a plug-and-play UI is unreachable without explicitly deprecating duplicate routes and forcing full adoption of the shared operational runtime.

## Executive Summary
This roadmap formalizes the Trio as the enforced operational reference. The immediate strategic priority is not feature expansion but *reduction of complexity*: eliminating duplicate routes and migrating near-standard adopters onto the shared operational hook stack (`useOperationalGridRuntime`). We will prioritize shared-contract work, enforced through new contract-focused testpacks, before any local patches are permitted.

## Highest ROI Sequence
1. **Remove Duplicate Routes:** Canonicalize `/assets` and `/vendors` routes. Eliminate `/asset-real` and `/vendors-real`.
2. **Standardize Action Controls:** Migrate `NetworkReal`, `AssetReal`, and `VendorsReal` to the shared `OperationalRowActionMenu` to enforce the row-action width law.
3. **Normalize Action Semantics:** Align `Services` and `External` action semantics (wording, error handling, revert behavior) to the `Monitoring` reference.
4. **Fix Backend Bulk Contracts:** Add backend bulk-summary contracts for `Services` and unify action-response formats.

## Must-Fix Before Feature Expansion
- **Typecheck/Build Stability (Run F):** Resolve dependency/type resolution blockers to ensure CI integrity.
- **Row-Action Width Law (Run C):** All row-action surfaces must comply with the width-coupling law to prevent title wrapping.
- **Bulk Contract (Run B):** Ensure single-record/multi-record message consistency (pluralization) and revert availability rules.

## Shared Contract Work
- **OperationalRowActionGeometry:** Sole source of truth for panel width, positioning, and action-control distribution.
- **OperationalBulkContract:** Sole source of truth for toast message formatting, no-op semantics, and revert availability.
- **OperationalGridRuntime:** Enforced hook stack for all operational workspaces, replacing legacy `useOperationalGridLayout` and `useWorkspaceDismissHandlers`.

## Testpack Implementation Order
1. `OperationalBulkContract` unit tests (exact message assertions).
2. `Services` unsupported-purge UI assertions.
3. `External` unsafe-purge and mixed-failure UI tests.
4. `Monitoring` row-action regression tests.
5. Geometry unit suite for `OperationalRowActionGeometry` (viewport edge/clamping/long-title cases).
6. Component contract suite for `OperationalRowActionMenu` (width-coupling assertions).

## Backend/Frontend Contract Work
- **Monitoring:** Reference implementation; no changes required.
- **External:** Standardize bulk-action response aggregator to report accurately on partial failures.
- **Services:** Extend bulk endpoint to return per-record changed/skipped counts, removing the UI's reliance on "success" as a proxy for actual change.
- **Global:** Prohibit `purge` actions unless explicitly approved and backend-gated.

## UI Validation Gates
- **Type/Build Gate:** `npm run typecheck` and `npm run build` must pass.
- **Contract Gate:** `OperationalBulkContract` and `RowAction` component tests must pass.
- **Acceptance Gate:** `RUN3-E UI Standard Acceptance Checklist` must pass for all canonical workspaces.

## No-Touch Zones
- `Architecture` (DataFlowDesigner)
- `Projects`
- `Knowledge`
- `Research`
- (Unless they formally define an operational-grid adapter)

## Run 4 Prompt Candidates
1. "Enforce shared OperationalRowActionMenu in NetworkReal and AssetReal by removing custom action windows."
2. "Standardize Services bulk-action response: extend backend to return changed/skipped counts and align frontend to Monitoring's semantic toast messages."
3. "Remove /asset-real and /vendors-real routes and canonicalize on the shared operational grid implementations for assets and vendors."
4. "Implement OperationalBulkContract testpack and fix single-record pluralization drift in toast messages."

## Close Criteria
- Zero duplicate operational routes.
- 100% of operational workspaces use `useOperationalGridRuntime`.
- 100% of operational row-action menus comply with the geometry width law.
- Backend bulk endpoints return semantically correct change counts (no 100% success-only responses for updates).
- All RUN3-A through RUN3-F findings are resolved or explicitly documented as "intentionally exempt."
