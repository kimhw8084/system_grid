# OUT-26 Iteration 35 Stage 33 Lock-Proof Correction Summary

Result: `PARTIAL`

## Scope completed

- Preserved the Stage 32 decomposed asset architecture.
- Added a Stage 33-focused evidence harness at `frontend/tests/assets-stage33-evidence.spec.ts`.
- Added a Stage 33 clone/ownership audit at `frontend/scripts/stage33_clone_audit.mjs`.
- Corrected the asset donor modal dirty-close path in `frontend/src/components/AssetReal.tsx` so the canonical `/asset` edit modal now routes through `WorkspaceModal` dirty-guard behavior instead of bypassing it with `useEscapeDismiss(...)`.

## Product fix applied

- `AssetRecordFormModal` now computes `isDirty` from the original form payload plus metadata JSON.
- The modal now passes `isDirty`, `dirtyConfirmTitle`, and `dirtyConfirmMessage` into `WorkspaceModal`.
- The bypassing custom footer close action was removed so close requests use the guarded shared modal path.

## Validation completed

Commands run:

```bash
cd frontend && npm run typecheck
cd frontend && npm run test:lint
cd frontend && npm run build
cd frontend && node scripts/stage33_clone_audit.mjs
```

Observed results:

- `npm run typecheck`: pass
- `npm run test:lint`: pass
- `npm run build`: pass
- `node scripts/stage33_clone_audit.mjs`: pass

Clone audit highlights:

- `AssetGoldenOperationalWorkspace.tsx` current line count: `248`
- Skeleton under 700 lines: `true`
- Overlap versus pre-Stage-32 monolith:
  - `AssetGoldenOperationalWorkspace.tsx`: `25.42%`
  - `assetGoldenData.ts`: `27.39%`
  - `AssetGoldenFeatureSurfaces.tsx`: `31.25%`
  - `AssetGoldenDialogs.tsx`: `41.62%`
- Previous Stage 28/30/31/32 proof files modified in this run: none

## Blocked runtime proof

Focused evidence command attempted:

```bash
cd frontend && PW_API_BASE=http://127.0.0.1:8000/api/v1 npx playwright test tests/assets-stage33-evidence.spec.ts --reporter=line
```

Blocked reason:

- Sandboxed Chromium launch failed with macOS Mach port permission denial during Playwright startup.
- Escalated rerun was auto-rejected by the environment because unsandboxed execution credits were unavailable.

## Remaining gap

- `frontend/stage33-evidence/stage33-evidence.json` not generated yet
- `frontend/OUT-26_ITERATION_35_STAGE33_EVIDENCE.html` not generated yet
- Runtime proof for warning/request classification, redirect capture, interaction captures, and dirty-state screenshot remains blocked on a successful browser-capable Playwright run

## Next command

When unsandboxed Playwright execution is available again, rerun:

```bash
cd frontend && PW_API_BASE=http://127.0.0.1:8000/api/v1 npx playwright test tests/assets-stage33-evidence.spec.ts --reporter=line
```
