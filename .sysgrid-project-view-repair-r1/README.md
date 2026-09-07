# SysGrid Project View Perfection — Repair 1

Same-scope recovery for the verified failed RESULT whose five OUT-40 Slice H tests all stopped in `openTimeline` on an obsolete hidden-legacy-Gantt sentinel.

This repair:

- requires exact local HEAD `d40c0929ff7a9ec37d9c57bdb7ef0cf2d020c7ee` and tree `0aa53cc6ed9121b178c72c31e2a6b1c04e985f5f`;
- requires the unchanged mode-160000 `SysGrid` gitlink `445c225a3dec7c359f8ff0b09934716ee2d91b6e`;
- requires the three approved Project View product postimages from the failed parent RESULT byte-for-byte;
- changes only `frontend/tests/projects-out40-slice-h-gantt-modernization.spec.ts`, replacing the obsolete legacy sentinel with an exact-one modern Gantt invariant;
- runs the failed Slice H browser proof first, then the complete Project visual-repair build/model/browser proof in an isolated local clone;
- writes the harness repair into the user repository only after both proof stages PASS;
- preserves unrelated untracked files and refuses unrelated tracked or staged changes.

Upload `SysGrid-Project-View-Perfection-Repair-1-RESULT.zip` on PASS or FAIL.
