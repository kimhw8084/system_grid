# OUT-26 Iteration 30 Stage 28 Validation Ledger

| Step | Command | Result | Notes |
| --- | --- | --- | --- |
| frontend-health | curl -I http://127.0.0.1:5173 | PASS | HTTP/1.1 200 OK |
| backend-health | curl -i http://127.0.0.1:8000/api/v1/health | PASS | HTTP/1.1 200 OK; status=online |
| typecheck | cd frontend && npm run typecheck | PASS | tsc --noEmit completed with exit code 0 |
| test-lint | cd frontend && npm run test:lint | PASS | SysGrid test architecture linter passed |
| build | cd frontend && npm run build | PASS | vite build completed; chunk-size warning only |
| golden-evidence | cd frontend && npx playwright test tests/assets-golden-evidence.spec.ts --reporter=line | PASS | 1 passed in 16.8s; refreshed stage28-evidence captures for /asset, /monitoring, and /asset-real |
| product-diff-audit | git diff --name-only -- frontend | PASS | Diff limited to frontend/src/components/assets/AssetsGoldenWorkspace.tsx and stage28 evidence artifacts |
