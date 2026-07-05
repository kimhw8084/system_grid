# OUT-26 Iteration 30 Stage 28 Validation Ledger

| Step | Command | Result | Notes |
| --- | --- | --- | --- |
| focused evidence harness | /bin/zsh -lc 'cd frontend && PW_API_BASE=http://127.0.0.1:8000/api/v1 npx playwright test tests/assets-golden-evidence.spec.ts --reporter=line' | PASS | Unsandboxed Playwright rerun required on July 4, 2026 because Chromium could not launch inside the sandbox. Single focused harness run captured /asset, /monitoring, /asset-real redirect, desktop full-page, desktop full-viewport, and exact 960x720 screenshots into frontend/stage28-evidence/. |
| focused /asset capture | included in focused evidence harness command above | PASS | No separate command was needed. The passing focused harness generated asset-desktop-fullpage.png, asset-desktop-viewport.png, and asset-960x720.png and recorded non-null command bounds. |
| focused /monitoring capture | included in focused evidence harness command above | PASS | No separate command was needed. The passing focused harness generated monitoring-desktop-fullpage.png, monitoring-desktop-viewport.png, and monitoring-960x720.png and recorded non-null command bounds. |
| exact 960x720 capture | included in focused evidence harness command above | PASS | No separate command was needed. The passing focused harness generated asset-960x720.png and monitoring-960x720.png with exact 960x720 viewport metadata in stage28-evidence.json. |
| typecheck | npm run typecheck | PASS | Executed from frontend/ using the package.json script; output was `> tsc --noEmit` with exit code 0. |
| test lint | npm run test:lint | PASS | Executed from frontend/ using the package.json script; output reported `LINTER PASSED: Test architecture is compliant.` |
| build | skipped | SKIP | Credible skip rationale: Stage 28 changes are confined to Playwright evidence tests, Playwright helper import resolution, a proof-generation script, markdown/html proof artifacts, and evidence outputs. No production bundle inputs under frontend/src or route files changed. |
| product-code lock diff audit | git status --short -- frontend | PASS | Audit scope after cleanup is limited to Stage 28 evidence tests/helpers, proof-generation helper script, generated stage28-evidence outputs, and Stage 28 proof documents. |
