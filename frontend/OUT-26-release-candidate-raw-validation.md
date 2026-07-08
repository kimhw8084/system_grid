# OUT-26 Run 19: Release-Candidate Raw Validation Evidence

This file contains the raw execution output from our automated type checking, production building, Vitest unit/component suites (including our newly targeted/hardened files), and Playwright E2E verification workflow.

---

## 1. Static Typing Verification (`npm run typecheck`)

```text
> system-grid-frontend@1.2.4 typecheck
> tsc --noEmit
```
*(Exit code: 0 - Compilation clean with zero errors)*

---

## 2. Production Build Check (`npm run build`)

```text
> system-grid-frontend@1.2.4 build
> vite build

vite v5.4.21 building for production...
✓ 4268 modules transformed.
dist/index.html                     1.28 kB │ gzip:     0.65 kB
dist/assets/index-CuuHQa7L.css    455.13 kB │ gzip:    71.21 kB
dist/assets/index-0zUbngxc.js   4,602.57 kB │ gzip: 1,219.60 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 8.84s
```

---

## 3. Targeted Vitest Runs

### A. Bulk Action Panel Component Hardening (`AssetBulkActionsPanel.test.tsx`)

```text
 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  20:59:10
   Duration  1.12s (transform 135ms, setup 104ms, import 216ms, tests 171ms, environment 483ms)
```

### B. Column Definitions Identity Cell No-Click Proof (`assetGoldenColumns.test.tsx`)

```text
 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  20:59:41
   Duration  872ms (transform 72ms, setup 71ms, import 160ms, tests 26ms, environment 496ms)
```

### C. Active-Only Action Suppression on Deleted/Purged Assets (`assetGoldenRowActions.test.tsx`)

```text
 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  21:00:31
   Duration  949ms (transform 43ms, setup 77ms, import 90ms, tests 2ms, environment 608ms)
```

### D. Comparison Visual Parity and Drift Analysis (`AssetCompareModal.test.tsx`)

```text
 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:20:13
   Duration  1.55s (transform 95ms, setup 70ms, import 280ms, tests 154ms, environment 892ms)
```

---

## 4. Full Unit Test Suite Execution (`npm run test:unit`)

```text
> system-grid-frontend@1.2.4 test:unit
> vitest run

 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  39 passed (39)
      Tests  182 passed (182)
   Start at  21:21:46
   Duration  4.71s (transform 2.42s, setup 2.98s, import 6.49s, tests 3.60s, environment 26.44s)
```

---

## 5. Playwright E2E Workflows Execution (`npx playwright test tests/assets-workflows.spec.ts`)

```text
Running 1 test using 1 worker

  ✓  1 tests/assets-workflows.spec.ts:8:3 › Assets workflows › simulates the changed Assets workflows end-to-end (26.4s)
SEED: Created monitoring item "PW-MON-1783477317335-hvypdm" (ID: 79)

  1 passed (27.7s)

[LLM-Reporter] All tests passed. No artifact needed.
```
