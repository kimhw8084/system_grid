# OUT-14 Run 8 Risk Register

## Active Risks

| Risk | Severity | Likelihood | Detection method | Prevention rule | Owner boundary | Blocks Run 8 lock |
| --- | --- | --- | --- | --- | --- | --- |
| External still looks or behaves like an old one-off page even though shared shells are present in source | High | Medium | visual comparison against Monitoring plus manual interaction audit | judge lock by behavior and grammar, not by import names alone | shared + domain | Yes |
| Shared behavior is reimplemented by local imitation instead of reused primitives | High | Medium | source diff review of touched files | require shared primitives first; reject one-off shell/grid/panel replacements | shared | Yes |
| External-specific behavior is lost while chasing visual parity | Critical | Medium | preservation inventory cross-check plus targeted manual flows | preserve by default; no genericization without source proof | domain | Yes |
| Compare, link, or dependency intelligence regresses | Critical | Medium | backend/frontend External workflow tests plus manual compare/link checks | do not move domain intelligence into shared code | domain | Yes |
| Persisted workspace state still collapses `links` into `active` during save, normalize, apply, or view labeling | High | High | source inspection of `sanitizeExternalViewConfig`, saved-view creation/apply flow, refresh/apply manual check | treat `links` persistence as the first Stage 2 fix, not polish | external adapter | Yes |
| Stage 2 fixes the `links` bug locally in UI labels but misses the actual saved-state write/apply path | High | Medium | code review of save/overwrite/apply/default paths | repair the full state lifecycle: normalize, save, apply, restore, describe | external adapter | Yes |
| Import/export contract regresses away from Run 7 manifest-backed round trip | Critical | Low | diagnostics report, import/export tests, manual export/import notes | never replace snapshot export with viewport CSV or ad hoc download | shared + domain | Yes |
| Diagnostics mismatch appears between External runtime and Run 7 proof posture | High | Medium | Settings/System Diagnostics review and copied report | validate report text and runtime behavior before lock | shared + domain | Yes |
| Route ambiguity or detail-link transition drift breaks deep-link behavior | High | Medium | `/external?id=...` manual validation and route-focused notes | preserve entity-detail route semantics and shared route helper | shared + domain | Yes |
| Dirty-state regression silently discards entity, link, or saved-view draft work | Critical | Low | targeted unsaved-change checklist | keep shared modal dirty-close law; do not bypass it | shared + domain | Yes |
| Tests or build pass but manual behavior remains unproven | High | High | proof-plan completeness review | build/typecheck are support evidence only, never closure proof | shared + domain | Yes |
| Scope creep expands Run 8 into Services, Network, Assets, Vendors, FAR, Research, or generic deployment | High | Medium | diff scope review and stage-goal audit | reject unrelated file sets and unrelated objective changes | run management | Yes |
| Reusable contract is not actually reusable for the next workspace | Critical | Medium | review whether fix lives in shared/adaptable boundary and whether docs explain reuse | prefer shared fix or adapter-safe wiring over page-local patch | shared | Yes |
| Accessibility or keyboard regressions go unnoticed because lock focuses only on mouse flows | Medium | Medium | manual keyboard checklist | include Escape/focus/close-guard validation in proof plan | shared + domain | No, unless a critical workflow breaks |

## Newly Discovered Or Clarified In Stage 1

- The highest-confidence Stage 2 target is narrower than Stage 0 phrased it: the bug is not only restore behavior. `links` is lost at sanitize, save, overwrite, apply, and view-description time inside `External.tsx`.
- Current source shows no confirmed shared-contract gap requiring shared runtime redesign before Stage 2. The first fix is an External adapter/state gap.

## Stale Or Downgraded Risks

- Stale audit artifact: `frontend/OUT-14-EXTERNAL-WORKSPACE-LOCK-AUDIT.md` still treats External export as blocked by AG Grid CSV export.
- Downgrade: that specific export blocker is no longer an active implementation risk in current source because `External.tsx` now uses `downloadOperationalImportFile(...)` with manifest-backed validation.
- Remaining import/export risk is therefore not “missing implementation”; it is “runtime proof and future regression”.

## Deployment-Acceleration Lens

Highest deployment-acceleration risks are:

1. `links` saved-view/workspace-state corruption.
2. silent regression of External domain behavior while standardizing proof or interaction surfaces.
3. lack of runtime diagnostics/manual proof for flows that source already appears to support.

## Risk Handling Rule

Any risk marked `Blocks Run 8 lock = Yes` must have explicit evidence of prevention or non-occurrence before lock candidate review.
