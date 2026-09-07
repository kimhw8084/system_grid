# SysGrid Project View Perfection — Repair 5

Same approved Project View Perfection scope. This repair is fail-closed and proof-before-apply.

Repair 4 confirmed Slice H remains 5/5 PASS, then stopped in Slice G because the current R4 `Save view` control is inside the collapsed Workspace actions details. The create-project action is likewise the current `Project` button inside that same menu.

Repair 5 therefore:
- retains the already-approved Project View candidate postimages;
- retains the explicit 40px Gantt toolbar target correction;
- retains the cumulative R4-aware Slice H harness modernization;
- keeps the prior Slice E and navigation compatibility repairs;
- updates Slice G so Save view and Project creation are exercised through the current Workspace actions menu;
- runs a diagnostic sweep across every remaining retained OUT-40 regression file without applying anything;
- only if the diagnostic sweep is fully green, runs the canonical OUT-40 regression chain;
- then runs the full Projects visual-repair proof;
- writes the repaired CSS/test harnesses into the local repository only after every proof gate PASSes.

The runner verifies exact base commit/tree, the SysGrid mode-160000 gitlink, approved parent product blobs, and exact harness preimages. Any mismatch fails closed.

Expected repository root:
/Users/haewonkim/home/development/sysgrid

Output:
SysGrid-Project-View-Perfection-Repair-5-RESULT.zip
