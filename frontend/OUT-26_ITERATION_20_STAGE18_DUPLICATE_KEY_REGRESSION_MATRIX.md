# OUT-26 Iteration 20 Stage 18 Duplicate-Key Regression Matrix

| Target | Method | Evidence | Result | Regression risk | Next prompt rule |
| --- | --- | --- | --- | --- | --- |
| Stage 12 baseline | rendered verification | desktop grid visible; rows visible; Existing/Purged top-right; badge absent | `PASS` | low | none |
| `ND-001` | source + rendered shell check | `Assets.tsx` still mounts shared shell; screenshots remain shell-aligned | `PASS` | low | none |
| `ND-002` | prior accepted contract + no persistence edits | no persistence code touched in this slice | `ACCEPTED LIMIT` | low | revisit only if controller requires persistence-contract recovery |
| `ND-003` | rendered interaction | row-action menu opens; quick look stays closed from trigger; row-body quick look still opens | `PASS` | low | none |
| `ND-004` | rendered interaction | bulk menu opens in anchored grammar; asset actions preserved; clear selection works | `PASS` | low | none |
| `ND-005` | rendered responsive measurement | `960x720` grid height `282`; visible rows `13` | `PASS` | low | none |
| route lock | rendered route verification + no route edits | `/asset-real` resolves to `/asset`; no route files changed | `PASS` | low | none |
| quick look | rendered interaction | `Engage Full Configuration` and `Hardware Registry` visible | `PASS` | low | none |
| map | rendered interaction | `/asset?view=map`; `svg/canvas` count `39` | `PASS` | low | none |
| details/forms | rendered interaction | `+ Add Asset` opened form; `Asset Tag` visible | `PASS` | medium | none |
| history/compare/report | rendered interaction | `/asset?view=report`; `Compare Selected` visible in bulk panel | `PASS` | low | none |
| security/secrets/hardware/monitoring panels | rendered interaction | quick look exposed `Hardware Registry` | `PASS` | low | none |
| import/export | rendered visibility | `Template`, `Snapshot`, `Export CSV`, `Import Data` visible | `PASS` | low | none |
| display/saved views | rendered interaction | display and saved views panels both opened | `PASS` | low | none |
| console | pre/post console capture | duplicate-key warnings `76 -> 0`; page errors remain `0` | `PASS` | low | none |
| validation | static command rerun + focused e2e | static checks pass; focused Assets Playwright spec fails stale heading expectation | `PARTIAL` | medium | validation-contract recovery only; no product edits |
| golden-divergence guard | screenshot comparison + shared contract review | `/asset` grid view remains visually aligned with shared shell/command/table grammar | `PASS` | low | none |
