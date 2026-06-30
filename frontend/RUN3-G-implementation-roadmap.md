# RUN3-G Implementation Roadmap

## Verdict
`PARTIAL_NEEDS_VERIFICATION`

## Executive Summary

- The corrected Run 3 artifacts are strong enough to define a safe Run 4 sequence, but not strong enough to justify implementation on every cited risk.
- The locked implementation baseline is the shared operational trio: `Monitoring`, `External`, and `Services`.
- Shared contracts must be locked before local workspace patches: bulk contract first, row-action contract second, API action support guards third.
- Immediate implementation work should focus on PROVEN issues only: rack reorder route mismatch, legacy `ServiceRegistry` purge wording drift, shared bulk toast exactness, and shared row-action adoption enforcement.
- `External` purge safety is source-verified and should be treated as the standard for unsafe destructive-action disablement and explanation.
- `Monitoring` bulk update undo is the only source-proven high-severity revert risk; it needs conflict-safe treatment before broader revert expansion.
- Duplicate route pairs (`/asset` vs `/asset-real`, `/vendors` vs `/vendors-real`) are real drift risks, but route deletion is blocked until a canonical route audit is completed.
- Typecheck/build work must remain minimal and bounded by the F plan; no dependency or lockfile churn should start before that validation path is followed.

## Artifact Quality Gate

| Artifact | Verdict | Strong Findings | Weaknesses | Can Drive Implementation? |
| --- | --- | --- | --- | --- |
| `RUN3-A-workspace-drift-matrix.md` | Strong | Verifies locked trio, duplicate-route drift, partial shared-runtime adopters, shared row-action law anchors | Some migration choices still require product/canonical-route decisions | Yes, for sequencing and no-touch constraints |
| `RUN3-B-bulk-contract-testpack.md` | Strong | Defines exact bulk toast/revert contract and proven support differences across trio | Some future action-surface expansion is intentionally not yet implemented | Yes, for shared bulk contract work and test order |
| `RUN3-C-row-action-contract-testpack.md` | Strong | Defines row-action width law, shared geometry anchors, and legacy drift surfaces | Legacy/manual adopter failures are structural but not all are fixed by one local patch | Yes, for shared row-action contract and migration order |
| `RUN3-D-api-action-contract-audit.md` | Mixed but usable | Corrected claim grading separates `PROVEN` from `NEEDS_VERIFICATION`; proves rack, external, services, monitoring undo issues | Several previously severe claims are now downgraded and cannot drive implementation directly | Yes, but only for PROVEN items or verification-first tasks |
| `RUN3-E-ui-standard-acceptance-checklist.md` | Strong | Deterministic acceptance gate for trio behavior, wording, row-action geometry, and unsafe-action explanations | Requires suitable data fixtures and environment readiness to execute fully | Yes, as the UI validation gate |
| `RUN3-F-typecheck-build-blockers.md` | Strong | Proves current blocker class is source-level, not dependency-level; defines minimal fix order | Does not itself validate final build health because fixes were not applied yet | Yes, as the build/typecheck guardrail |

## Highest ROI Sequence

1. Lock shared bulk contract text and revert semantics with tests.
2. Lock shared row-action width law with geometry and component tests.
3. Fix source-proven backend/frontend action mismatches:
   rack reorder route mismatch, legacy `ServiceRegistry` purge wording drift.
4. Preserve and standardize unsafe action support guards:
   `External` blocked purge explanation, `Services` purge absence, shared unsupported-action visibility rules.
5. Add Monitoring undo conflict protection or blocking behavior for snapshot replay.
6. Migrate near-standard shared-shell adopters to shared contracts:
   `NetworkReal`, then `AssetReal`, then `VendorsReal`.
7. Run E checklist against `Monitoring`, `External`, and `Services`.
8. Perform verification-only work for downgraded claims before any asset/vendor destructive-behavior implementation.
9. Defer canonical route removal or broad workspace rewrites until a route audit proves the survivor.

## Must Fix Now

| Priority | Fix | Source Proof | User Impact | Risk | Required Test/Checklist | Prompt Candidate |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Correct rack reorder route contract | D `CLM-01` proves frontend posts to site-scoped route while backend exposes `/api/v1/racks/reorder` | Rack reorder can fail or drift immediately in production use | Low to medium if fix is narrow | D `racks_reorder_route_contract`; E `Rack reorder route behavior` | `Run4-01 Rack Reorder Contract Fix` |
| P0 | Remove legacy `ServiceRegistry` purge wording where backend only supports delete/archive semantics | D `CLM-05` proves wording drift and backend unsupported purge | Users can be told an irreversible action exists when it does not | Low if copy/surface change is isolated | D `service_registry_does_not_advertise_purge`; E `purge not exposed` for modern Services plus legacy check | `Run4-02 Services Purge Label Cleanup` |
| P0 | Lock exact shared bulk success/revert contract in `OperationalBulkContract` and tests | B proves exact wording contract and current single-record pluralization gap | Prevents misleading operational feedback across the locked trio | Low; high leverage | B unit suite; E bulk/toast wording and revert gates | `Run4-03 Shared Bulk Contract Lock` |
| P0 | Lock `Services` unsupported purge guard in UI tests | B and D prove backend rejects purge and modern UI should omit it | Prevents visible action leading to known backend rejection | Low | B `ServicesReal.bulk-contract.test.tsx`; E `purge not exposed` | `Run4-04 Services Unsupported Action Guard` |
| P1 | Lock `External` unsafe purge disabled/explanation standard in shared expectations and tests | B and D prove both UI and backend guard; E defines exact explanation text | Prevents accidental destructive operations and improves trust | Low to medium | B `External.bulk-contract.test.tsx`; E `unsafe purge blocked before backend call` and exact message check | `Run4-05 External Unsafe Purge Guard` |
| P1 | Add Monitoring undo conflict-safe guard or explicit block for snapshot replay | D `CLM-08 Monitoring` is the only proven high undo-overwrite risk | Prevents revert from overwriting concurrent user changes | Medium | D `monitoring_update_undo_detects_concurrent_change`; E revert gate | `Run4-06 Monitoring Undo Conflict Guard` |
| P1 | Lock shared row-action width law in geometry/component tests before migrating legacy adopters | A and C prove shared law exists and manual adopters drift from it | Prevents long-title panel regressions and inconsistent action controls | Low to medium | C geometry/component suites; E row-action layout checklist | `Run4-07 Shared Row-Action Width Contract` |

## Needs Verification Before Implementation

| Item | Missing Evidence | Verification Prompt | Why It Matters |
| --- | --- | --- | --- |
| Services changed-key undo overwrite severity beyond Monitoring | D downgraded stale-overwrite risk to `NEEDS_VERIFICATION`; no concrete failure proof | Reproduce a concurrent edit to a reverted Services field and capture whether revert overwrites the later change | Determines whether Services needs the same conflict guard as Monitoring or only narrower test coverage |
| External changed-key undo overwrite severity | D downgraded stale-overwrite risk to `NEEDS_VERIFICATION`; replay shape is proven, concrete harmful overwrite is not | Reproduce concurrent edits on keys replayed by External undo and capture exact overwrite behavior | Avoids overbuilding concurrency controls on an unproven risk |
| Asset purge dependency-loss scope | D downgraded asset cascade severity; child-table purge effects are not fully source-anchored | Trace actual purge effects across dependent asset tables and record exact user-visible loss scope | Destructive warnings and blocking behavior must match real dependency loss, not guessed severity |
| Vendor contract-delete destructive UX severity | Backend hard-delete is proven, but explicit irreversible wording is not | Audit the contract-delete UI copy and confirm whether permanence is stated clearly | Prevents implementing incorrect warning copy or overstating an unverified UX gap |
| Canonical asset route selection | A proves duplicate routes exist but does not prove which route should survive | Compare `/asset` and `/asset-real` against required operational behaviors and identify canonical owner-approved route | Route deletion or migration without canonical proof would create product drift risk |
| Canonical vendor route selection | A proves duplicate routes exist but not the approved survivor | Compare `/vendors` and `/vendors-real` against required operational behaviors and identify canonical route | Prevents deleting the wrong surface or duplicating fixes twice |
| Asset-specific undo risk from bulk update flows | D found no source proof for bulk snapshot restore undo in assets | Verify current asset update/undo behavior under real flow before designing protections | Avoids implementing Monitoring-style guards on a different asset behavior |

## Shared Contract Work

1. Bulk contract
   Lock `OperationalBulkContract` exact strings, revert availability, semantic changed-count handling, and the single-record pluralization decision through unit tests before any view-specific edits.

2. Row-action contract
   Treat `OperationalRowActionMenu` plus `OperationalRowActionGeometry` as the only approved row-action implementation path for operational workspaces.

3. Row-action long-title control-width law
   Enforce one resolved content width across header/title/meta, action rows, action cards, dropdown editors, and nested controls. No local manual menu should remain the long-term solution.

4. API action support guard
   Visible UI actions must never invite known backend rejection. `Services` purge absence is the clean baseline. `External` blocked purge is the clean baseline for conditionally unsupported destructive actions.

5. Unsafe action disabled/explanation standard
   Standardize the `External` pattern:
   disabled when unsafe, precise explanation when blocked, no misleading success path, no silent backend-only failure as the first user signal.

## Testpack Implementation Order

1. `OperationalBulkContract` unit tests.
   Highest leverage, lowest risk, and directly protects locked trio wording and revert rules.

2. `computeRowActionGeometry` and `OperationalRowActionMenu` contract tests.
   Shared row-action law is cross-workspace and should be locked before migrating manual menus.

3. `Services` unsupported purge UI tests.
   Cleanest source-proven unsupported-action guard with low fixture complexity.

4. `External` unsafe purge and mixed-failure tests.
   Highest-value destructive safety contract after the shared bulk helper is locked.

5. `Monitoring` archive/restore/purge and revert tests.
   Needed to validate the reference workspace and protect the only proven high undo-risk path.

6. Workspace-level row-action regression tests for `Monitoring`, `External`, and `Services`.
   Confirms shared law holds in real adopters, not only in isolated components.

7. Expected-fail or migration-blocker tests for `NetworkReal`, `AssetReal`, and `VendorsReal`.
   Useful after the shared law is locked, to prevent silent drift while migration is queued.

## Backend/Frontend Contract Work

- Fix the proven rack reorder route mismatch first.
- Remove legacy `ServiceRegistry` purge wording or hide that destructive surface if it cannot be made truthful immediately.
- Keep `Services` purge absent in modern UI and permanently backed by tests.
- Preserve `External` purge and restore guards exactly as source-proven, then make them the reference for unsafe/destructive affordance behavior.
- Scope Monitoring undo work to conflict-safe behavior for snapshot replay only.
- Do not implement asset purge-warning, vendor destructive-copy, or non-Monitoring undo-concurrency fixes until their downgraded claims are verified.

## UI Validation Gates

Run the E checklist as the acceptance gate for Run 4 work:

- `Monitoring`, `External`, and `Services` must match the locked trio behavior.
- Exact toast wording must match the locked bulk contract.
- No-op must never show revert.
- Reversible real changes must show a working revert.
- Purge must never show revert.
- Unsafe destructive actions must be blocked with a precise explanation.
- Row-action long titles must stay one line, and every control inside the panel must widen with the resolved content width.
- Any item lacking source-verified applicability must be marked `NOT_APPLICABLE_SOURCE_NOT_VERIFIED`, not guessed.

## No-Touch Zones

- No route deletion until canonical route audit proves the survivor.
- No broad rewrites of operational workspaces.
- No package or lockfile churn until the F minimal validation plan is executed and disproven.
- No local per-view patches if a shared contract can solve the problem first.
- No implementation from any `NEEDS_VERIFICATION` claim.

## Run 4 Prompt Candidates

### 1. Run4-01 Rack Reorder Contract Fix
- Title: `Fix Racks reorder route mismatch`
- Files allowed: `frontend/src/components/Racks.tsx`, relevant frontend rack tests only
- Goal: Change the frontend reorder request to the proven backend route contract and add coverage
- Proof checks: D `CLM-01`; E `Rack reorder route behavior`
- Pass/fail: Pass if request targets `/api/v1/racks/reorder` and test coverage locks it; fail if any site-scoped reorder route remains
- Dependency on verification if any: None

### 2. Run4-02 Services Purge Label Cleanup
- Title: `Remove false purge wording from legacy ServiceRegistry`
- Files allowed: `frontend/src/components/ServiceRegistry.tsx`, related tests only
- Goal: Ensure legacy services UI does not advertise purge when backend supports only delete/archive semantics
- Proof checks: D `CLM-05`; B/D unsupported purge expectations
- Pass/fail: Pass if purge wording is removed or surface is blocked and tests prove it; fail if any visible purge label remains in that legacy flow
- Dependency on verification if any: None

### 3. Run4-03 Shared Bulk Contract Lock
- Title: `Lock OperationalBulkContract exact wording and revert rules`
- Files allowed: `frontend/src/components/shared/OperationalBulkContract.ts`, `frontend/src/components/shared/OperationalBulkContract.test.ts`, directly related trio tests only
- Goal: Enforce exact bulk toast strings, revert availability rules, and semantic changed-count handling
- Proof checks: B locked strings and helper anchors; E bulk behavior gates
- Pass/fail: Pass if tests cover no-op, changed, partial, archive, restore, purge, revert success/failure, and single-record wording decision; fail if exact-copy gaps remain
- Dependency on verification if any: None

### 4. Run4-04 Services Unsupported Action Guard
- Title: `Lock Services purge absence in modern UI`
- Files allowed: `frontend/src/components/ServicesReal.tsx`, `frontend/src/components/ServicesReal.bulk-contract.test.tsx`, related Services UI tests only
- Goal: Guarantee unsupported purge never appears in modern Services surfaces
- Proof checks: B Services matrix; D action support matrix; E `purge not exposed`
- Pass/fail: Pass if deleted-scope Services exposes restore only and tests lock that behavior; fail if purge appears anywhere
- Dependency on verification if any: None

### 5. Run4-05 External Unsafe Purge Guard
- Title: `Lock External unsafe purge disablement and explanation`
- Files allowed: `frontend/src/components/External.tsx`, `frontend/src/components/External.bulk-contract.test.tsx`, related UI tests only
- Goal: Preserve exact blocked-purge behavior and wording for linked or credentialed deleted entities
- Proof checks: B unsafe-action rows; D `CLM-02`; E blocked purge checks
- Pass/fail: Pass if unsafe purge is disabled before request, exact explanation text appears, and no success path is possible; fail otherwise
- Dependency on verification if any: None

### 6. Run4-06 Monitoring Undo Conflict Guard
- Title: `Add conflict-safe protection to Monitoring bulk update undo`
- Files allowed: `frontend/src/components/MonitoringGrid.tsx`, monitoring tests, and any directly required monitoring API layer files
- Goal: Prevent snapshot-based revert from silently overwriting concurrent changes
- Proof checks: D `CLM-08 Monitoring`; D required test `monitoring_update_undo_detects_concurrent_change`; E revert gate
- Pass/fail: Pass if concurrent-change undo is blocked or conflict-reported and covered by tests; fail if snapshot replay can still silently overwrite later edits
- Dependency on verification if any: None

## Close Criteria

Run 3 is complete and Run 4 is ready when all of the following are true:

- this roadmap is based on corrected artifacts A through F
- every implementation recommendation is source-proven or explicitly routed into verification-first work
- shared contracts are sequenced ahead of local workspace patches
- the locked trio (`Monitoring`, `External`, `Services`) remains the implementation baseline
- E is adopted as the UI validation gate
- F is adopted as the typecheck/build guardrail
- duplicate-route work is constrained to audit/migration planning, not deletion
- Run 4 prompt candidates are narrow, executable, and independently verifiable
- only `frontend/RUN3-G-implementation-roadmap.md` changed

## PASS / FAIL Conditions

### PASS

- roadmap uses corrected evidence
- no unverified claim drives implementation
- shared contracts before local patches
- exact prompt candidates
- artifact only changed

### FAIL

- recommends implementation from `NEEDS_VERIFICATION`
- broad rewrite
- deletes routes without canonical proof
- ignores E/F gates
- source code changed
