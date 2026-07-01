# OUT-14 Run 8 Implementation Sequence

## Objective

This sequence is optimized for the fastest safe spread of a durable plug-and-play operational workspace pattern.

It assumes current source already contains substantial shared-contract adoption in External and therefore avoids a broad rewrite.

## Stage 1 — External Baseline + Gap Map

Goal:

- verify current External behavior against Monitoring, shared contracts, and Run 7 import/export law;
- produce a file-level and behavior-level gap map;
- explicitly separate proof gaps from implementation gaps.

Required work:

- confirm which parts of `frontend/OUT-14-EXTERNAL-WORKSPACE-LOCK-AUDIT.md` are still current and which are stale;
- map External current behavior to each acceptance-matrix row;
- confirm the known `links` saved-state gap in current source;
- identify whether any remaining gaps belong in shared code vs External wiring.

Required proof after Stage 1:

- exact gap map with file references;
- stage-by-stage implementation recommendation tied to acceptance rows;
- explicit statement of what is already compliant and must not be rewritten.

Why first:

- current source shows Run 8 is a narrowing exercise, not a greenfield migration.

## Stage 2 — Shell/Grid Contract Wiring

Goal:

- close any remaining shell/grid/persisted-state gaps while preserving External domain content.

Primary target:

- fix saved views and persisted workspace state so `activeTab='links'` round-trips truthfully;
- keep shared shell/grid/state primitives as the implementation vehicle.

Allowed work:

- shared or External wiring changes that improve persisted-state truth and grid contract compliance;
- narrow sanitization updates required for saved views, filters, sort, grouping, and tab mode restoration.

Forbidden work:

- local CSS imitation;
- domain schema refactors;
- unrelated route or backend redesign.

Required proof after Stage 2:

- before/after state restoration proof for active, archived, and links scopes;
- source summary proving the fix is contract-driven rather than page-local.

## Stage 3 — Actions/Panels/Modal Contract Wiring

Goal:

- lock row actions, right-click, floating panels, detail/edit/link/compare modals, and dirty-state behavior.

Primary targets:

- verify menu/panel/modal shells remain shared;
- correct only true contract gaps discovered in Stage 1;
- preserve External compare/link/dependency flows exactly.

Allowed work:

- shared overlay or modal fixes if they improve spreadability;
- External wiring updates that preserve domain-specific menu sections or transitions.

Forbidden work:

- genericizing External link or compare semantics;
- replacing domain intelligence with shared approximations.

Required proof after Stage 3:

- interaction notes for row menu, right-click, views/display/bulk mutual exclusion, detail-to-edit, detail-to-link, compare, and dirty-close flows;
- explicit preservation notes for External compare/link/dependency behavior.

## Stage 4 — Lifecycle + Import/Export + Diagnostics Proof

Goal:

- prove External remains truthful on lifecycle/data states and Run 7 file-flow contract in runtime.

Primary targets:

- shared loading/empty/error/diagnostic surfaces;
- External snapshot import/export contract;
- Settings/System Diagnostics compatibility for External reportability.

Allowed work:

- narrow fixes to lifecycle wording, diagnostics wiring, or import/export proof gaps;
- no generic deployment workstream creation.

Required proof after Stage 4:

- diagnostics report review;
- import/export validation notes including manifest, CSV, preview, and fallback behavior;
- error-state and empty-state validation notes for both entities and links queries.

## Stage 5 — Run 8 Lock Candidate

Goal:

- assemble final evidence and determine whether External can honestly be called the first lock-safe non-Monitoring consumer.

Required work:

- fill the acceptance matrix with evidence-backed verdicts;
- run relevant tests/build steps that are actually available;
- package a review zip;
- record lesson learned and next prompt rule.

No lock allowed unless all are true:

- acceptance matrix is evidence-backed;
- External domain preservation is explicitly demonstrated;
- diagnostics/import-export proof is present;
- manual validation covers non-automated flows;
- zip review is complete.

## Fastest-Safe Ordering Rationale

This order is faster than a broad rewrite because:

- current source already shows External on most shared contracts;
- the main remaining risk is silent partial-standardization, not wholesale absence of shared wiring;
- fixing persisted-state truth and then validating behavior produces a reusable migration recipe for future workspaces.

## Sequence Change Rule

The sequence may change only if Stage 1 source inspection shows a different order shortens the path to a reusable lock while preserving domain behavior. Any change must explain:

- what source disproved this order;
- why the new order increases spreadability;
- what proof gate moved and why.
