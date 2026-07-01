# OUT-14 Run 8 Stage 2 Questionnaire

## Purpose

This questionnaire is the approval gate before drafting the final Stage 2 implementation prompt.

Stage 1 concluded that the narrowest safe next step is to fix External saved-view and persisted-workspace-state handling so the `links` workspace mode survives save, overwrite, apply, refresh, restore, and description labeling.

## Proposed Stage 2 Scope

Primary target:

- preserve `activeTab='links'` as a first-class workspace mode across sanitize/normalize, current workspace snapshot creation, saved-view creation, saved-view overwrite, saved-view apply, system default restore, and saved-view description labeling.

Likely file:

- `frontend/src/components/External.tsx`

Do not broaden unless source directly disproves the Stage 1 baseline.

## Approval Questions

1. **Stage 2 target confirmation**
   - Do you approve a Stage 2 prompt focused only on fixing `links` saved-view/workspace-state persistence?
   - Expected answer: `yes` unless you want to redirect the run.

2. **Scope boundary confirmation**
   - Should Stage 2 remain limited to persisted-state, saved-view, and truthful view-description behavior inside the External workspace flow?
   - Expected answer: `yes`.

3. **No broad rewrite confirmation**
   - Do you agree Stage 2 must not expand into shell, grid, modal, route, diagnostics, or backend rewrites unless implementation source inspection proves a direct dependency?
   - Expected answer: `yes`.

4. **Domain preservation confirmation**
   - Must the implementation explicitly preserve current External-only semantics for entity rows, link rows, compare flow, link form behavior, dependency intelligence, purge restrictions, and detail-route behavior?
   - Expected answer: `yes`.

5. **Proof expectation confirmation**
   - After implementation, should the required proof be limited to source diff summary plus manual/runtime checks that:
   - saved view created from `links` remains `links` after refresh;
   - applying a saved `links` view returns the workspace to `links`;
   - saved-view description text for `links` is truthful;
   - `active` and `deleted` modes still restore correctly;
   - no regression appears in filters, grouping, or selection-reset behavior.
   - Expected answer: `yes`.

6. **Stale-audit handling confirmation**
   - Should the final Stage 2 prompt treat the old AG Grid CSV export blocker in `frontend/OUT-14-EXTERNAL-WORKSPACE-LOCK-AUDIT.md` as stale context rather than active implementation guidance?
   - Expected answer: `yes`.

## If Approved

The final Stage 2 prompt should:

- frame the task as `OUT-14 Run 8 Stage 2`;
- target only the confirmed `links` persistence defect;
- require preservation of current shared-contract adoption and External domain behavior;
- require narrow proof tied to saved-view/workspace-state round-trip truth;
- forbid broad parity rewrites or reopening OUT-13 implementation work.

## If Not Approved

If any answer is `no`, the final prompt should be regenerated to reflect the changed scope before implementation begins.
