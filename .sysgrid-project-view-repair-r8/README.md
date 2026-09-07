# SysGrid Project View Perfection — Repair 8

Same-scope corrective repair for the user-observed Project View regressions after the published Project View Perfection slice.

Corrections:
- refresh no longer turns the exact unsupported remote saved-view error `Unknown workspace key.` into a Project View failure;
- individual Project views no longer render the redundant internal project rail, so the selected Project uses the full application main width;
- Project panels use the application background or semantic surfaces mixed slightly brighter with white instead of darker `black/*` panels;
- Overview begins with an always-visible Project Information cover containing name, objective, owner, status, priority, start/finish, progress, expected outcomes, Edit project, Measure outcome, and Timeline actions;
- the compact context strip no longer hides basics behind a `Project info` expander.

Non-goals:
- no backend/API/schema changes;
- no alternate Project data model;
- no weakening of Gantt/treegrid/keyboard/target-size/bounded-DOM regressions;
- no GitHub, Linear, commit, or push writes.

Fail-closed behavior:
- exact published base commit/tree/gitlink required;
- exact preimage blobs required;
- tracked worktree must be clean;
- candidate is proved in an isolated local clone;
- user repository is changed only after the full Project visual proof and retained OUT-40 regression both PASS;
- unrelated untracked files are preserved.
