# OUT-26 Iteration 21 Stage 19 Validation Contract Regression Matrix

| target | method | evidence | result | regression risk | lock-readiness effect | next prompt rule if not PASS |
|---|---|---|---|---|---|---|
| focused Assets Playwright validation | rerun focused Playwright spec | `tests/assets-workflows.spec.ts` final rerun: `1 passed (6.6s)` | PASS | low | blocker removed | n/a |
| stale heading expectation | compare failing assertion to canonical Assets heading source | spec expected `Infrastructure Registry`; `Assets.tsx:2837` renders `Asset Registry` | PASS | low | corrected stale contract | n/a |
| product code unchanged | changed-file review limited to spec + proof files | no product source edits in Stage 19 | PASS | low | preserves accepted product baseline | n/a |
| duplicate-key warnings | Stage 18 preservation carry-forward because product code unchanged | Stage 18 accepted `76 -> 0`; no Stage 19 product edits | PASS | low | cleanup remains accepted | if any product edit occurs later, rerun fresh render/console verification |
| Stage 12 baseline | preserve by no-product-change rule | no product source edits; no contradiction introduced | PASS | low | baseline remains accepted | if product code changes later, rerun Stage 12 checks |
| ND-001 | preservation-by-non-change | unchanged from Stage 18 accepted state | PASS | low | none | rerun if product source changes |
| ND-002 | preservation-by-non-change | unchanged from Stage 18 accepted state | PASS | low | none | rerun if product source changes |
| ND-003 | preservation-by-non-change | unchanged from Stage 18 accepted state | PASS | low | none | rerun if product source changes |
| ND-004 | preservation-by-non-change | unchanged from Stage 18 accepted state | PASS | low | none | rerun if product source changes |
| ND-005 | preservation-by-non-change | unchanged from Stage 18 accepted state | PASS | low | none | rerun if product source changes |
| route lock | inspect route source | `App.tsx:725` `/asset`; `App.tsx:726` `/asset-real` redirect path preserved | PASS | low | route lock intact | if route code changes later, re-verify redirect-only behavior |
| rich behavior preservation | inspect asset detail and row-action sources, plus passing focused flow | `Assets.tsx:2185`, `2438`, `3095`; `AssetDetailsView.tsx:85`, `218`, `288`, `296` | PASS | low | rich surface remains accepted | rerun focused workflow if detail surface changes |
| golden-divergence guard | run drift check | `npm run check:operational-registry-drift` PASS | PASS | low | no clone-drift contradiction | if future assets changes occur, rerun drift guard |
| typecheck | run repo command | `rtk npm run typecheck` PASS | PASS | low | none | fix blocking TS errors only if they appear |
| build | run repo command | `rtk npm run build` PASS; non-blocking chunk warning only | PASS | low | none | investigate chunk warning separately only if requested |
| lint/test-lint | run repo command twice, fix focused spec anti-brittle issue | first FAIL, final PASS | PASS | low | none | keep focused spec on helper/locator-variable pattern |
| operational registry drift | run repo command | PASS; `No monitoring clone drift markers found in 3 file(s).` | PASS | low | none | rerun if assets source changes |
| form contracts | run repo command | PASS | PASS | low | none | rerun if form source changes |
| row-action contracts | run repo command | PASS | PASS | low | none | rerun if row-action source changes |
