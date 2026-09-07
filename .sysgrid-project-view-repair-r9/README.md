# SysGrid Project View Perfection — Repair 9

Cumulative same-scope repair for the user-observed Project View regressions.

Repair 8 reached the real browser proof and passed 15/16 tests. The new cover, refresh fallback,
and full-width member layout reached their assertions successfully. The remaining failure showed
the Project frame was still visually darker than the application page under Nordic Frost.

Repair 9 keeps the Repair 8 behavior and changes only the surface model/test measurement:
- the Project frame is transparent over the canonical application page background;
- regular Project panels are subtle translucent-white elevation (~3.5%);
- raised Project panels are subtle translucent-white elevation (~6.5%);
- no Project panel is deliberately darkened with a black underlay;
- the browser regression measures composited luminance, including rgba and CSS `color(srgb ...)`
  serialization, so it verifies what the user actually sees.

The cumulative Repair 8 corrections remain:
- exact `Unknown workspace key.` from optional remote saved-view reads is treated as unsupported
  capability instead of breaking Project View refresh;
- individual Project views do not render the redundant internal project rail;
- Overview starts with a visible Project Information cover containing identity, objective, owner,
  status, priority, dates, progress, expected outcomes, and primary actions;
- compact project context exposes key information without a hidden Project-info expander.

Non-goals:
- no backend/API/schema changes;
- no alternate Project data model;
- no weakening of Gantt/treegrid/keyboard/target-size/bounded-DOM regressions;
- no commit, push, GitHub write, or Linear write.

Fail-closed behavior:
- exact published base commit/tree/gitlink required;
- exact source preimage blobs required;
- tracked worktree must be clean;
- candidate is proved in an isolated local clone;
- the user repository changes only after full Project visual proof and retained OUT-40 regression pass.
