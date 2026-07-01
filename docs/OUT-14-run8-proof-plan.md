# OUT-14 Run 8 Proof Plan

## Non-Negotiable Proof Rules

- build or typecheck alone is not enough
- shell wrapping alone is not enough
- no lock without domain behavior preservation evidence
- no lock if External-specific behavior regresses
- no Done without zip review, lesson learned, acceptance proof, and lock statement

## Required Proof Categories

### 1. Source/file change summary

For each implementation stage, record:

- files changed
- why each file changed
- whether the change belongs to shared contract code, External wiring, or proof/docs only

### 2. Shared-contract vs External-domain separation

For each stage, state:

- which behavior is shared-contract owned
- which behavior remains External-owned
- why the boundary is correct

### 3. Visual comparison notes against Monitoring

Record:

- shell/header/action-zone alignment
- command-bar rhythm
- grid utility-column rhythm
- grouped/raw surface similarity
- modal shell similarity

This is visual comparison, not styling-only acceptance.

### 4. Interaction validation notes

Record manual or automated evidence for:

- selection behavior
- bulk behavior
- right-click
- row action menu
- floating-panel mutual exclusion
- detail/edit/link/compare transitions
- dirty-close behavior

### 5. Domain behavior preservation notes

Record explicit preservation evidence for:

- schema/columns
- forms
- compare fields
- link behavior
- dependency intelligence
- purge blocker truth
- route semantics

### 6. Import/export validation notes

Record:

- import modal contract
- export snapshot contract
- manifest validation
- CSV validation
- readable-header or fallback behavior
- preview validation

### 7. Settings/System Diagnostics notes

If applicable, record:

- runtime diagnostics card result
- copied report verdict
- whether report text still truthfully represents External export contract

### 8. Test/build/lint results

Record runnable commands and exact result summary.

Support evidence only:

- frontend unit tests
- backend tests
- Playwright tests
- build
- typecheck

If something cannot be run, state that explicitly.

### 9. Manual proof checklist

Manual browser validation is required where runtime behavior matters:

- active, archived, and links scope switching
- saved view creation/apply/refresh, especially `links`
- right-click on entity row and link row
- views/display/bulk/row-action overlay arbitration
- add/edit modal dirty protection
- link modal dirty protection
- detail deep-link and detail-to-edit/detail-to-link transitions
- compare flow
- entity-query and link-query failure surfaces
- export action and diagnostics review

### 10. Zip review result, score, lesson learned, next prompt rule

Before lock candidate review completes, record:

- zip contents
- review verdict
- score
- lesson learned
- next prompt rule

## Stage-by-Stage Proof Requirements

### Stage 1

Must produce:

- file-level and behavior-level gap map
- current-source truth statement for already-compliant areas
- explicit list of gaps requiring code changes vs proof-only work

### Stage 2

Must produce:

- source proof for shell/grid/persisted-state changes
- saved-view and workspace-state restoration notes
- explicit confirmation that `links` is preserved if changed

### Stage 3

Must produce:

- row-action/right-click/panel/modal interaction notes
- dirty-state notes for entity form, link form, and saved-view draft close
- External compare/link/dependency preservation notes

### Stage 4

Must produce:

- lifecycle/data-state proof
- import/export validation proof
- diagnostics/readiness notes

### Stage 5

Must produce:

- completed acceptance matrix with evidence-backed verdicts
- test/build summary
- review zip
- lesson learned
- explicit lock recommendation or no-lock recommendation

## Lock Refusal Triggers

Do not lock Run 8 if any of the following is true:

- `links` mode still fails persisted state or saved-view round trip
- shared shell exists but External workflows still feel page-local
- compare/link/dependency behavior is weaker than current source
- import/export contract or diagnostics truth regressed
- acceptance matrix is incomplete or evidence-free
- manual runtime validation is missing for critical flows
