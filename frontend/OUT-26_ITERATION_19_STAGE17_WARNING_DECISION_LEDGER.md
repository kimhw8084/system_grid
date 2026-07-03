# OUT-26 Iteration 19 Stage 17 Warning Decision Ledger

- review date: `2026-07-03`
- final decision: `B. Lock blocker requiring narrow cleanup`

## Duplicate-key warning facts
- Stage 16 fresh render recorded repeated duplicate-key warnings on canonical `/asset`.
- Count in the verification session: `76`.
- The warning stack points to:
  - `AnimatePresence`
  - `OperationalWorkspaceFrame`
  - `OperationalWorkspaceShell`
  - `Assets`
- Current active source path for that stack is the floating-panel block mounted through:
  - `frontend/src/components/Assets.tsx:2861-3016`
  - `frontend/src/components/shared/OperationalWorkspaceShells.tsx:77-80`

## Source or render location if identifiable
- Render location:
  - active `/asset` route during Stage 16 render verification
- Source location:
  - the warning is tied to the `AnimatePresence` overlay subtree passed as `floatingPanels`
  - that subtree contains multiple conditional overlay/panel children under a shared active route shell

## Impact analysis
- Proven safe:
  - grid rendered
  - rows rendered
  - row-action isolation held
  - bulk actions worked
  - route redirect held
  - `960x720` threshold passed
- Not proven harmless:
  - React duplicate-key warnings explicitly state children can be duplicated or omitted
  - the warning is not detached from the active workspace; it sits in the overlay identity path
  - the affected subtree owns display views, saved views, bulk flyout, and quick-look-related overlay behavior
  - sampled regression checks do not prove absence of intermittent remount/identity instability across all overlay sequences

## Decision
- decision type: `B`
- label: `Lock blocker requiring narrow cleanup`

## Lock-readiness effect
- effect: `BLOCKER`
- reason:
  - the user's standard forbids silent acceptance of active-route warnings that plausibly affect identity or stability
  - the current evidence is not strong enough to classify these warnings as harmless non-divergent noise

## Follow-up rule
- Narrow duplicate-key-warning cleanup only.
- No unrelated changes.
- Preserve:
  - Stage 12 baseline
  - `ND-003`
  - `ND-004`
  - `ND-005`
  - route lock
  - all accepted rich asset behavior
- After cleanup, rerun fresh render verification focused on:
  - zero duplicate-key warnings on canonical `/asset`
  - unchanged row identity
  - unchanged overlay behavior
  - unchanged responsive measurements

## Why this satisfies zero-deviation / perfectionist standard
- It does not pretend that repeated active-route identity warnings are acceptable without proof.
- It does not erase the strong functional progress already achieved.
- It keeps the remaining work narrow and directly tied to the only unresolved active divergence.
