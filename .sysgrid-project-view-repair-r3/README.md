# SysGrid Project View Perfection — Repair 3

Same-scope recovery from Repair 2. Repair 2 brought the OUT-40 Slice H suite to 4/5 PASS and exposed one remaining approved acceptance miss: at the 390px viewport the first primary Gantt toolbar control (`Today`) renders 34px high even though the Projects stylesheet intends a 40px minimum.

Repair 3:

- requires exact local HEAD `d40c0929ff7a9ec37d9c57bdb7ef0cf2d020c7ee`, tree `0aa53cc6ed9121b178c72c31e2a6b1c04e985f5f`, and unchanged mode-160000 `SysGrid` gitlink;
- requires the approved Project View parent postimages exactly as produced by the first executor;
- keeps the cumulative R4-aware Slice H harness modernization from Repair 2;
- adds diagnostic labels to minimum-target assertions without weakening the 40px threshold;
- makes the Gantt toolbar action buttons and `Timeline zoom` select an explicit rendered 40px block with `min-height:40px!important` and `height:40px`, scoped only to `.sg-gantt-actions`;
- does not alter scheduling semantics, hierarchy, persistence, pointer behavior, dependency behavior, DOM caps, or the R4 sidebar geometry lock;
- runs the complete Slice H regression first, then the full Project visual-repair build/model/browser proof in an isolated local clone;
- applies the cumulative harness repair plus the targeted toolbar CSS correction to the user repository only after both proof stages PASS.

Upload `SysGrid-Project-View-Perfection-Repair-3-RESULT.zip` on PASS or FAIL.
