# OUT-14 Run 8 Stage 2 — Fix External Links Saved-View / Workspace-State Persistence

File path target from approval artifact: `/mnt/data/SysGrid_Run8_Stage2_prompt.md`

Prompt title: `OUT-14 Run 8 Stage 2 — Fix External Links Saved-View / Workspace-State Persistence`
Active issue: `OUT-14 — Run 8 External Workspace Lock`
Master issue: `OUT-5 — GOAL: SysGrid Workspace Goldenization & Plug-and-Play Spread`
Stage / iteration: `Run 8 Stage 2 / Implementation Iteration 01`
Prompt type: `Targeted bug fix / narrow implementation`
Approval source: User approved following uploaded SysGrid Prompt Generation Law v2.3 for OUT-14 Stage 2 immediately.

## 0. Operating mode

You are implementing one narrow OUT-14 Stage 2 fix inside SysGrid.

Do not treat this as a broad External rewrite.
Do not mark OUT-14 Done.
Do not claim Run 8 is locked.
Do not change unrelated workspaces.
Do not include git, commit, push, zip, or upload instructions.

The returned implementation must be reviewable from source changes and proof artifacts.

## 1. Objective

Fix External saved-view/workspace-state persistence so `links` is preserved as a first-class External view state instead of being collapsed to `active` during sanitize, save, apply, restore, compare, or view-label logic.

The intended end state is:

```text
External view state supports at least:
- active
- deleted / archived, if currently present
- links
```

`links` must round-trip through saved views and workspace-state persistence without silently becoming `active`.

## 2. Source of truth

Use these source truths in this order:

1. OUT-14 Stage 1 PASS finding:
   - Current source already consumes most shared shell/grid/modal/lifecycle/import-export contracts.
   - Highest-confidence remaining implementation gap is narrow and local.
   - `External.tsx` saved-view/workspace-state handling collapses `links` into `active` during sanitize/save/apply/restore/view-label flow.
2. OUT-14 issue objective:
   - External must become the first fully standardized non-Monitoring operational workspace without losing External-specific behavior.
3. Existing External behavior:
   - External-specific entity schema, links, dependency intelligence, compare modal, link forms, detail/edit flows, route behavior, endpoints, and mutations must be preserved.
4. Monitoring/golden behavior only where it clarifies shared persisted-state grammar.

## 3. Required inspection before editing

Before changing code, inspect and record where External currently handles persisted view state.

Search for all relevant paths in `frontend/src/components/External.tsx`, including but not limited to:

```text
links
active
deleted
archived
saved view
savedView
workspace state
workspaceState
sanitize
restore
apply
view label
viewLabel
selected view
current view
view mode
```

Identify every location where `links` can be lost, rejected, converted, omitted from labels, omitted from serialization, omitted from restoration, or normalized to `active`.

If `links` is already fully preserved and the Stage 1 finding is contradicted, stop and create a contradiction report instead of editing blindly.

## 4. Allowed scope

Primary allowed implementation file:

```text
frontend/src/components/External.tsx
```

Allowed only if source inspection proves it is directly necessary:

```text
Existing External-focused tests
Existing shared saved-view/workspace-state helper tests if External directly uses those helpers
```

Required documentation/proof artifacts to create or update:

```text
docs/OUT-14-run8-stage2-implementation-report.md
docs/OUT-14-run8-stage2-review-manifest.md
docs/OUT-14-external-acceptance-matrix.md
docs/OUT-14-run8-risk-register.md
```

If a docs file does not exist, create it only with the OUT-14 Stage 2 section needed for this fix.
Do not rewrite unrelated historical sections.

## 5. Forbidden scope

Do not change:

```text
OUT-13 import/export contract work
backend APIs or backend schema
Monitoring behavior, except read-only comparison
Services
Network
Assets
Vendors
FAR
Research
routes unrelated to External state persistence
shell/header/command-bar architecture
grid/table contract
row actions/right-click/bulk actions
floating panel system
modal/form/dirty-state contract
lifecycle/data-state contract
local CSS imitation
package files
lockfiles
build configuration
```

Do not remove or weaken:

```text
External links behavior
External dependency intelligence
External compare behavior
External link forms
External detail/edit flows
External route semantics
External active/deleted behavior
existing validation and diagnostics
```

## 6. Implementation rules

Implement the smallest source-backed fix.

The fix must make `links` valid anywhere External persisted view mode is validated or normalized.

At minimum, inspect whether all of these paths preserve `links`:

```text
sanitize saved-view state
save current workspace state
apply saved-view state
restore persisted workspace state
compare current state vs saved state
display/label current view state
default/fallback behavior when persisted state is invalid
```

Rules:

```text
- Preserve existing fallback for truly invalid values.
- Do not convert valid `links` to `active`.
- Do not break `active` or `deleted` / archived behavior.
- Do not invent a new route or tab model.
- Do not create a separate one-off state system for links if existing External state can be extended safely.
- If there is a typed union, enum, schema, sanitizer, or helper, update the smallest correct owner rather than patching symptoms in multiple places.
```

## 7. Test / verification expectations

Run the narrowest relevant verification available in the repo.

Preferred proof, if available:

```text
- focused External saved-view/workspace-state unit tests
- focused shared operational saved-view tests if External uses the shared helper
- targeted frontend unit test for links round-trip
```

If no appropriate test exists, add the smallest focused test that proves:

```text
links saved view serializes as links
links saved view restores as links
links label/display remains links-specific
active remains active
deleted/archived remains deleted/archived if currently supported
invalid state still falls back safely
```

If tests cannot run in the environment, record:

```text
command attempted
exact failure reason
what source-level proof was still produced
manual validation checklist needed
```

Build/typecheck alone is not sufficient proof.

## 8. Required proof artifacts

Create or update:

### `docs/OUT-14-run8-stage2-implementation-report.md`

Must include:

```text
- Objective
- Files inspected
- Root cause
- Exact state paths where links was previously lost or at risk
- Implementation summary
- Why scope stayed narrow
- Domain behavior preservation notes
- Remaining risks
```

### `docs/OUT-14-run8-stage2-review-manifest.md`

Must include:

```text
Active issue: OUT-14
Stage / iteration: Run 8 Stage 2 / Implementation Iteration 01
Prompt title
Files changed
Commands attempted
Command results / exit codes where available
Manual validation checklist
PASS/PARTIAL/FAIL/WORSE self-assessment candidate
Known unrelated failures
No Done / no Run 8 lock statement
```

### `docs/OUT-14-external-acceptance-matrix.md`

Update only the relevant Stage 2 row/section for:

```text
External links saved-view / workspace-state persistence
```

Mark it as implementation-candidate proof, not final Run 8 lock proof.

### `docs/OUT-14-run8-risk-register.md`

Add/update risks for:

```text
links state persistence
active/deleted regression risk
External domain behavior preservation
shared-contract spillover risk
```

## 9. Manual validation checklist to include in manifest

Include this checklist even if it cannot be run by the worker:

```text
1. Open External.
2. Switch to Links view/state.
3. Save a saved view or workspace state while Links is active.
4. Switch away to Active.
5. Restore/apply the saved Links view/state.
6. Confirm External returns to Links, not Active.
7. Confirm Links-specific data/actions still behave as before.
8. Confirm Active saved view still restores Active.
9. Confirm Deleted/Archived saved view still restores Deleted/Archived if supported.
10. Confirm compare/detail/link-form behavior did not regress.
```

## 10. PASS / PARTIAL / FAIL / WORSE standard for reviewer

### PASS candidate only if

```text
- links is preserved through all relevant External persisted-state paths
- active and deleted/archived behavior remain unchanged
- link-specific External domain behavior is preserved
- focused tests or strong source-level proof exists
- required OUT-14 docs are updated
- scope stays inside OUT-14 Stage 2
```

### PARTIAL if

```text
- implementation is directionally correct but test/manual proof is incomplete
- only some state paths are proven
- docs are present but incomplete
```

### FAIL if

```text
- links still collapses to active in any relevant persisted-state path
- the worker broadens into unrelated contracts
- proof relies only on build/typecheck
- required docs are missing
```

### WORSE if

```text
- External links, compare, dependency intelligence, or link forms regress
- links is hidden/removed instead of preserved
- OUT-13/backend/routes/other workspaces are changed without source-backed necessity
- active/deleted state behavior regresses
```

## 11. Stop conditions

Stop and report instead of patching if:

```text
- source inspection disproves the Stage 1 finding
- fixing links requires a shared-contract redesign outside External adapter wiring
- the code path is owned by another unresolved active issue
- tests reveal unrelated pre-existing failures that would force broad scope
```

If stopped, produce:

```text
docs/OUT-14-run8-stage2-stop-report.md
```

with exact source evidence and the smallest next prompt recommendation.

## 12. Return requirements

Return a concise implementation summary with:

```text
- files changed
- root cause
- what fixed links persistence
- what proof was run
- what still needs manual validation
- where the review manifest is located
```

Do not claim OUT-14 is Done.
Do not claim Run 8 is locked.
