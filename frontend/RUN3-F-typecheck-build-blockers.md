# RUN3-F Typecheck/Build Blocker Plan

## Verdict

`PASS_SAFE_PLAN`

## Evidence Method

Inspected:

* `frontend/package.json`
* `frontend/package-lock.json`
* `frontend/tsconfig.json`
* `frontend/tsconfig.node.json`
* `frontend/vite.config.ts`
* `frontend/playwright.config.ts`
* `frontend/vitest.setup.ts`
* `frontend/src/test/setup.ts`
* `frontend/src/vite-env.d.ts`
* historical error artifacts: `frontend/full_errors.txt`, `frontend/full_tsc_report.txt`, `frontend/target_errors.txt`, `frontend/ts_errors.txt`, `frontend/all_ts_errors.txt`
* install state: `frontend/node_modules/` and `frontend/node_modules/.bin/`

Non-writing proof commands used:

```bash
cd /Users/haewonkim/home/development/sysgrid
cat frontend/package.json
test -f frontend/package-lock.json && head -40 frontend/package-lock.json
find frontend -maxdepth 3 \( -name 'tsconfig*.json' -o -name 'vite.config.*' -o -name 'vitest.config.*' -o -name 'setupTests.*' -o -name '*.d.ts' \)
rg -n "vitest|jest-dom|vite/client|types|typeRoots|compilerOptions|scripts|devDependencies|dependencies" frontend/package.json frontend frontend/src
ls -la frontend
ls frontend/node_modules/.bin
node -p "require('./frontend/node_modules/vite/package.json').version"
node -p "require('./frontend/node_modules/vitest/package.json').version"
npm run typecheck --prefix frontend
npm run build --prefix frontend -- --help
```

Notes:

* `node_modules` exists.
* `vite`, `vitest`, and `tsc` binaries exist in `frontend/node_modules/.bin`.
* `package.json` and `package-lock.json` are coherent for the relevant devDependencies.
* The live `npm run typecheck --prefix frontend` failure is source-level, not missing-package-level.
* `npm run build --prefix frontend -- --help` confirmed the `vite` binary resolves without writing `dist/`.

## Current Scripts

| Script | Command | Expected binary | Dependency providing it | Present in package.json? | Risk |
| --- | --- | --- | --- | --- | --- |
| `dev` | `vite --host` | `vite` | `vite` | Yes | Low |
| `build` | `vite build` | `vite` | `vite` | Yes | Low |
| `preview` | `vite preview` | `vite` | `vite` | Yes | Low |
| `typecheck` | `tsc --noEmit` | `tsc` | `typescript` | Yes | Low |
| `test:unit` | `vitest run` | `vitest` | `vitest` | Yes | Low |
| `test:coverage` | `vitest run --coverage` | `vitest` | `vitest` | Yes | Low |
| `test:e2e` | `playwright test` | `playwright` | `playwright` / `@playwright/test` | Yes | Low |
| `test:e2e:headed` | `playwright test --headed` | `playwright` | `playwright` / `@playwright/test` | Yes | Low |
| `test:e2e:assets` | `playwright test tests/assets-workflows.spec.ts` | `playwright` | `playwright` / `@playwright/test` | Yes | Low |

## Blocker Matrix

| Blocker | Evidence | Likely Cause | Minimal Fix | File/package Impacted | Risk | Validation Command |
| --- | --- | --- | --- | --- | --- | --- |
| `vite not found` was a prior blocker class, not the current blocker | `frontend/node_modules/.bin/vite` exists; `node -p "require('./frontend/node_modules/vite/package.json').version"` returned `5.4.21`; `npm run build --prefix frontend -- --help` succeeded | Earlier run likely happened before dependencies were installed or outside `frontend` | No package change. Run from `frontend` with installed deps | Environment / working directory only | Low | `cd /Users/haewonkim/home/development/sysgrid/frontend && npm run build -- --help` |
| Missing `@testing-library/jest-dom` / `@types/node` / `vite/client` / `vitest/globals` types were prior blocker classes, not the current blocker | All four are declared in `frontend/package.json`; lockfile includes them; `frontend/tsconfig.json` includes `types: ["node", "vite/client", "vitest/globals", "@testing-library/jest-dom"]`; `frontend/src/vite-env.d.ts` references `vite/client` | Earlier install state or stale error capture, not current config absence | No package or tsconfig change unless a fresh install disproves current state | Package/config already aligned | Low | `cd /Users/haewonkim/home/development/sysgrid/frontend && npm run typecheck` |
| Live typecheck is blocked by source errors in `NetworkReal.tsx` and `VendorsReal.tsx` | Current `npm run typecheck --prefix frontend` output shows 4 errors: missing `point` in state assignment and invalid `.style` access at `src/components/NetworkReal.tsx:955`, `:2571`, `src/components/VendorsReal.tsx:539`, `:1158` | Real source typing defects after dependencies are installed | Fix these four source type errors only; do not change packages first | `frontend/src/components/NetworkReal.tsx`, `frontend/src/components/VendorsReal.tsx` | Medium | `cd /Users/haewonkim/home/development/sysgrid/frontend && npm run typecheck` |
| Historical logs contain many incompatible or misleading errors | `frontend/full_errors.txt` shows old missing-module errors; `frontend/target_errors.txt` shows `--jsx` / ES lib errors inconsistent with current `tsconfig.json` | Old reports were produced from a different install state or wrong `tsc` invocation and should not drive first fixes | Re-baseline with current authoritative commands after install verification | Historical artifacts only | Low | `cd /Users/haewonkim/home/development/sysgrid/frontend && npm run typecheck` |
| Build verification is not yet reliable until typecheck is clean | `vite` resolves, but build was not executed fully in audit mode because it writes `dist/`; current source type errors still indicate verification is not yet green | Verification sequence is out of order; build should be checked after current type errors are fixed | After source fixes, run build from `frontend` without changing lockfile/package set | Source files only, then `dist/` output | Low | `cd /Users/haewonkim/home/development/sysgrid/frontend && npm run build` |

## Dependency/Config Findings

### dependency declared but not installed

* Not supported by current evidence.
* `frontend/node_modules` exists.
* `frontend/node_modules/.bin/vite`, `vitest`, and `tsc` exist.
* The relevant type declaration packages are present through lockfile and current install state.

### dependency missing from package.json

* None from the known blocker class.
* `@testing-library/jest-dom`, `@types/node`, `vite`, `vitest`, and `typescript` are already declared in `devDependencies`.

### type config issue

* No primary misconfiguration found for the known blocker class.
* `frontend/tsconfig.json` already includes the expected `types`.
* `frontend/src/vite-env.d.ts` already references `vite/client`.
* There is no separate `vitest.config.*`; Vitest config is embedded under `test` in `frontend/vite.config.ts`, which is valid.

### script issue

* No current missing-binary script issue found.
* The main operational risk is running commands from the wrong working directory rather than missing script dependencies.

### source type error

* Confirmed.
* Current blocker is 4 live TypeScript errors in:
  * `frontend/src/components/NetworkReal.tsx`
  * `frontend/src/components/VendorsReal.tsx`

### environment-only blocker

* Previously plausible, but not current.
* Earlier “vite not found” or missing-type errors are best explained by wrong cwd, dependencies not yet installed at the time, or stale artifact files from an older run.

## Minimal Fix Sequence

Safest order:

1. Verify working directory: `cd /Users/haewonkim/home/development/sysgrid/frontend`
2. Inspect package files: confirm `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `src/vite-env.d.ts`
3. Run `npm ci` if `package-lock.json` exists and package files remain coherent
4. Run `npm install` only if `npm ci` proves package/lock mismatch or install failure attributable to lock drift
5. Add missing devDependencies only if a dependency is truly absent from `package.json` and lockfile
6. Update `tsconfig` only if a clean reinstall still reproduces missing type reference errors for declared packages
7. Fix the 4 live source TypeScript errors in `NetworkReal.tsx` and `VendorsReal.tsx`
8. Re-run `npm run typecheck`
9. Run `npm run build`
10. Only consider lockfile regeneration or deletion if `npm ci` and install diagnostics prove the lockfile is corrupt or unrecoverable

Why this order is minimal:

* It treats install-state verification as a prerequisite, not a guess.
* It avoids dependency churn because the known missing types are already declared.
* It avoids config churn because the current config already references the expected type packages.
* It escalates to source edits only after install/config state is shown to be sufficient.

## What Not To Change

* No broad dependency upgrades
* No lockfile regeneration unless proven necessary
* No source rewrites to hide type errors
* No package manager switch
* No deleting `package-lock.json` as a first step

## Validation Commands Expected To Pass

After the minimal fixes above are applied:

```bash
cd /Users/haewonkim/home/development/sysgrid/frontend
npm ci
npm run typecheck
npm run build
```

Non-destructive preflight commands that should already pass now:

```bash
cd /Users/haewonkim/home/development/sysgrid/frontend
npm run build -- --help
node -p "require('./node_modules/vite/package.json').version"
node -p "require('./node_modules/vitest/package.json').version"
```

## Risk Assessment

* `npm ci`: Low to Medium. Safe and reproducible when `package-lock.json` is coherent; it can remove and recreate `node_modules`, but does not imply dependency upgrades.
* `npm install` after proven lock mismatch: Medium. Can mutate the lockfile and should only follow actual mismatch evidence.
* Adding truly missing devDependencies: Medium. Bounded package manifest change, but still higher risk than reinstalling from an existing coherent lockfile.
* `tsconfig` edits after reinstall still fails on missing declared types: Medium. Small config surface, but avoid unless install verification disproves current config sufficiency.
* Source fixes for the 4 live TypeScript errors: Medium. Necessary for verification, but should stay tightly scoped to the current failing lines.
* Lockfile deletion/regeneration: High. Not justified by current evidence and should remain a last resort only after install tooling proves corruption.
