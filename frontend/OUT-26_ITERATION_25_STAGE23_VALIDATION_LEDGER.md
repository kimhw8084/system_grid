# OUT-26 Iteration 25 Stage 23 Validation Ledger

| Validation | Command | Result | Notes |
| --- | --- | --- | --- |
| Typecheck | `rtk npm run typecheck` | PASS | clean |
| Build | `rtk npm run build` | PASS | chunk-size warning only |
| Test lint | `rtk npm run test:lint` | PASS | evidence harness updated to compliant helper usage |
| Operational registry drift | `rtk npm run check:operational-registry-drift` | PASS | no monitoring clone drift markers found |
| Form contracts | `rtk npm run check:form-contracts` | PASS | clean |
| Row-action contracts | `rtk npm run check:row-action-contracts` | PASS | clean |
| Focused assets workflow | `PW_API_BASE=http://127.0.0.1:8000/api/v1 npx playwright test tests/assets-workflows.spec.ts --reporter=line` | PASS | canonical `/asset` workflow preserved |
| Before / golden evidence | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 ... STAGE23_CAPTURE_PHASE=before npx playwright test tests/assets-golden-evidence.spec.ts --reporter=line` | PASS | full-page captures written |
| After desktop evidence | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 ... STAGE23_CAPTURE_PHASE=after npx playwright test tests/assets-golden-evidence.spec.ts --reporter=line` | PASS | full-page capture written |
| After `960x720` evidence | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 ... STAGE23_CAPTURE_PHASE=after STAGE23_CAPTURE_VIEWPORT=960x720 npx playwright test tests/assets-golden-evidence.spec.ts --reporter=line` | PASS | full-viewport capture written |

## Route / warning checks
- `/asset` canonical render: PASS
- `/asset-real` redirect to `/asset`: PASS
- `AssetReal.tsx` promoted into route/sidebar: NO
- duplicate-key warnings zero: not proven, overall browser warning count remained non-zero in captures
- page errors zero: PASS in evidence captures
- new active-route warning stream: not observed in focused evidence runs
