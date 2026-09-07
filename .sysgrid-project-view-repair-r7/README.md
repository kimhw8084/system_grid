# SysGrid Project View Perfection — Repair 7

Same approved Project View Perfection scope. This repair remains fail-closed and proof-before-apply.

Repair 6 kept the core Slice H acceptance at 5/5 PASS. The portaled scheduling dialog still failed the 390×844 containment check at x = -7px, and Slice G found the portaled Scenario task select had no computed accessible name.

The two failures have one boundary cause:
- the mobile schedule drawer still used `width: calc(100vw - 16px)`, while the page reserves a stable scrollbar gutter, so 100vw can exceed the usable fixed-position containing width;
- after portaling the dialog to `document.body`, scenario/baseline controls no longer inherit the Projects-root accessibility naming decorator.

Repair 7 therefore:
- retains the already-approved Project View candidate postimages;
- retains the explicit 40px rendered Gantt toolbar target correction;
- retains the cumulative R4-aware Slice H and retained-regression harness repairs;
- retains the `document.body` schedule-dialog portal;
- replaces mobile schedule `100vw` sizing with direct left/right edge anchoring;
- gives portaled Scenario task, Scenario name, Baseline name, and Schedule baseline controls explicit accessible names;
- reruns the complete diagnostic sweep across Slice H/G/F/E/D/C, scheduling, navigation, and readability;
- only if that sweep is fully green, runs the canonical OUT-40 regression chain;
- then runs the full Projects visual-repair proof;
- writes the candidate into the local repository only after every proof gate passes.

The runner verifies the exact base commit/tree, the SysGrid mode-160000 gitlink, approved parent product blobs, exact retained harness preimages, and exact schedule/CSS preimages. Any mismatch fails closed.

Expected repository root:
/Users/haewonkim/home/development/sysgrid

Output:
SysGrid-Project-View-Perfection-Repair-7-RESULT.zip
