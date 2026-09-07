# SysGrid Project View Perfection — Repair 6

Same approved Project View Perfection scope. This repair remains fail-closed and proof-before-apply.

Repair 5’s diagnostic sweep passed Slice H, G, F, E, D, C, navigation, and readability. Scheduling alone failed on the 390×844 acceptance viewport because the schedule-control dialog’s bounding box started at x = -7px.

The dialog currently renders inside the Projects tree while the hardened Projects CSS positions it as a fixed narrow-screen drawer. Repair 6 portals only that dialog to `document.body`, so the fixed positioning is anchored to the browser viewport instead of an offset/transformed Projects containing block. Existing schedule state, Project persistence, ARIA modal semantics, initial focus, Escape handling, and focus restoration are unchanged.

Repair 6 therefore:
- retains the already-approved Project View candidate postimages;
- retains the explicit 40px Gantt toolbar target correction;
- retains the cumulative R4-aware Slice H and retained-regression harness repairs;
- portals the schedule-control dialog to `document.body` without changing scheduler semantics;
- reruns the complete diagnostic sweep across Slice H/G/F/E/D/C, scheduling, navigation, and readability;
- only if the diagnostic sweep is fully green, runs the canonical OUT-40 regression chain;
- then runs the full Projects visual-repair proof;
- writes the CSS, schedule-dialog, and repaired harness postimages into the local repository only after every proof gate passes.

The runner verifies the exact base commit/tree, the SysGrid mode-160000 gitlink, approved parent product blobs, exact retained harness preimages, and the exact schedule-component preimage. Any mismatch fails closed.

Expected repository root:
/Users/haewonkim/home/development/sysgrid

Output:
SysGrid-Project-View-Perfection-Repair-6-RESULT.zip
