# RUN3-F Typecheck/Build Blocker Plan

## Verdict
The build and typecheck blockers are primarily caused by a mismatch between the `tsconfig.json` `types` configuration and the installed `devDependencies`. While the packages appear in `package.json`, they are either not correctly installed in the current environment or the type paths are incorrectly resolved.

## Current Verification Scripts
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Build: `npm run build` (`vite build`)

## Blocker Matrix
| Blocker | Evidence | Likely cause | Minimal fix | File/package impacted | Risk | Validation command |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Missing @testing-library/jest-dom types | `tsc` error in CI/Local | Type path resolution fail | Re-install/Verify | `frontend/package.json` | Low | `npm run typecheck` |
| Missing node types | `tsc` error in CI/Local | Type path resolution fail | Re-install/Verify | `frontend/package.json` | Low | `npm run typecheck` |
| Missing vite/client types | `tsc` error in CI/Local | Type path resolution fail | Re-install/Verify | `frontend/package.json` | Low | `npm run typecheck` |
| Missing vitest/globals types | `tsc` error in CI/Local | Type path resolution fail | Re-install/Verify | `frontend/package.json` | Low | `npm run typecheck` |
| Vite not found for build | `npm run build` fails | Node environment/path | Check `node_modules` | `frontend/package.json` | Low | `npm run build` |

## Dependency/Config Findings
- `package.json` contains: `@testing-library/jest-dom`, `@types/node`, `typescript`, `vite`, `vitest`.
- `tsconfig.json` explicitly lists types in `compilerOptions.types`.
- All required `devDependencies` are listed in `package.json`.
- The issue is likely a corrupted `node_modules` state or an environment-specific resolution issue.

## Minimal Fix Plan
1. Delete `frontend/node_modules` and `frontend/package-lock.json`.
2. Run `npm install` in the `frontend/` directory to ensure a clean, consistent dependency tree.
3. Validate with `npm run typecheck`.
4. Validate with `npm run build`.

## Risk Assessment
- The proposed changes are limited to regenerating the dependency lockfile and node modules.
- Risk is very low as no source code or configuration files are being altered.

## Commands Expected To Pass
- `npm run typecheck`
- `npm run build`

## What Not To Change
- Do not manually edit `tsconfig.json`.
- Do not manually edit `package.json`.
- Do not change the `types` array in `tsconfig.json` unless the clean install fails.

## Grep/Proof Commands Used
- `cat frontend/package.json`
- `find . -maxdepth 3 -name "tsconfig*.json" -o -name "vite.config.*" -o -name "vitest.config.*" -o -name "setupTests.*" -o -name "*.d.ts"`
- `grep -rnE "vitest|jest-dom|vite/client|types|typeRoots|compilerOptions|scripts|devDependencies|dependencies" frontend/package.json frontend/tsconfig.json frontend/vite.config.ts`
