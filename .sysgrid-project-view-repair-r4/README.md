# SysGrid Project View Perfection — Repair 4

Same approved Project View Perfection scope. This repair is fail-closed and proof-before-apply.

Repair 3 established that the approved Slice H candidate itself is 5/5 PASS. The remaining failure occurred later in the retained OUT-40 regression chain: Slice G still looked for the pre-R4 quick-add and jump-menu DOM that R4 replaced with the current Projects workspace shell.

Repair 4 therefore:
- retains the already-approved Project View candidate postimages;
- retains Repair 3's explicit 40px Gantt toolbar target correction;
- retains the cumulative R4-aware Slice H harness modernization;
- modernizes only three stale retained regression tests: Slice G transient accessibility, Slice E Timeline dependency interaction, and Projects navigation;
- preserves each test's original acceptance intent: named controls, canonical Project PUTs, live announcements, focus restoration, and reachable navigation;
- runs the full OUT-40 regression chain first;
- then runs the full Projects visual-repair proof;
- writes the repaired CSS/test harnesses into the local repository only after both proof stages PASS.

The runner verifies exact base commit/tree, the SysGrid mode-160000 gitlink, the approved parent product blobs, and exact clean preimages for every retained harness it repairs. Any mismatch fails closed.

Expected repository root:
/Users/haewonkim/home/development/sysgrid

Output:
SysGrid-Project-View-Perfection-Repair-4-RESULT.zip
