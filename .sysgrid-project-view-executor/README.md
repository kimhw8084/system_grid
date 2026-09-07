# SysGrid Project View Perfection — local executor

This package applies the already-approved bounded Project View Perfection slice to one exact source only:

- commit `d40c0929ff7a9ec37d9c57bdb7ef0cf2d020c7ee`
- tree `0aa53cc6ed9121b178c72c31e2a6b1c04e985f5f`
- tracked gitlink `SysGrid` mode `160000` -> `445c225a3dec7c359f8ff0b09934716ee2d91b6e`

It refuses to overwrite changed target files. It changes only:

1. `frontend/src/components/ProjectsModernGantt.tsx`
2. `frontend/src/components/ProjectsVisualRepair.css`
3. `frontend/tests/projects-visual-repair.spec.ts`

It then runs the real repository proof paths:

- `node scripts/run-projects-visual-repair.mjs`
- `node scripts/run-projects-out40-slice-h-browser.mjs --mode regression`

The second command retains Slice H/G/F/E/D/C, scheduling, navigation, P10, and narrow-width regression coverage. The executor makes no GitHub or Linear writes and does not commit/push.

## Run

Place the ZIP in the `system_grid` repository root, then run the exact command supplied with the ChatGPT delivery. A PASS or FAIL `SysGrid-Project-View-Perfection-RESULT.zip` is always emitted when Python can create the result file. Upload that RESULT ZIP back to ChatGPT.
