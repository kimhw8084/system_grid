# SysGrid Project View Perfection — Repair 2

Cumulative same-scope recovery for Repair 1. Repair 1 cleared the obsolete legacy-Gantt sentinel and then exposed the remaining pre-R4 assumptions in the older OUT-40 Slice H harness.

Repair 2:

- requires exact local HEAD `d40c0929ff7a9ec37d9c57bdb7ef0cf2d020c7ee`, tree `0aa53cc6ed9121b178c72c31e2a6b1c04e985f5f`, and the unchanged mode-160000 `SysGrid` gitlink;
- requires the three approved Project View product postimages byte-for-byte and never edits them;
- modernizes only `frontend/tests/projects-out40-slice-h-gantt-modernization.spec.ts` for the already-landed R4 Gantt contract;
- uses the R4 relation-key connector identity and inspect-then-remove dialog;
- exercises the `Timeline zoom` select and opens the R4 filter panel before using filters;
- makes one fixture task deliberately wide enough to exercise the pointer resize handle, while keeping the 120-task P10 shape and all DOM budgets;
- tests real primary controls at narrow width instead of treating R4's noninteractive visual port dots as 40px controls;
- runs the full Slice H browser regression first, then the complete Project visual-repair build/model/browser proof in an isolated local clone;
- writes the harness repair into the user repository only after both proof stages PASS.

Upload `SysGrid-Project-View-Perfection-Repair-2-RESULT.zip` on PASS or FAIL.
