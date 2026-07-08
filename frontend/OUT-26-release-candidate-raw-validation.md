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
dist/assets/index-CeJ3ALJw.js   4,602.62 kB │ gzip: 1,219.61 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 11.77s
```

---

## 3. Targeted Vitest Runs

### A. Asset Import Golden Parity Verification (`AssetImportParity.test.tsx`)

```text
 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  21:49:23
   Duration  2.16s (transform 645ms, setup 59ms, import 1.36s, tests 90ms, environment 512ms)
```

### B. Asset Grid Selection and Multi-Range Parity Verification (`AssetGridSelectionParity.test.tsx`)

```text
 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  21:49:57
   Duration  2.28s (transform 336ms, setup 316ms, import 1.10s, tests 27ms, environment 659ms)
```

### C. Comparison Behavior and Drift Analysis (`AssetCompareModal.test.tsx`)

```text
 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:20:13
   Duration  1.55s (transform 95ms, setup 70ms, import 280ms, tests 154ms, environment 892ms)
```

### D. Bulk Action Panel Component Hardening (`AssetBulkActionsPanel.test.tsx`)

```text
 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  20:59:10
   Duration  1.12s (transform 135ms, setup 104ms, import 216ms, tests 171ms, environment 483ms)
```

### E. Column Definitions Identity Cell No-Click Proof (`assetGoldenColumns.test.tsx`)

```text
 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  20:59:41
   Duration  872ms (transform 72ms, setup 71ms, import 160ms, tests 26ms, environment 496ms)
```

### F. Active-Only Action Suppression on Deleted/Purged Assets (`assetGoldenRowActions.test.tsx`)

```text
 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  21:00:31
   Duration  949ms (transform 43ms, setup 77ms, import 90ms, tests 2ms, environment 608ms)
```

---

## 4. Full Unit Test Suite Execution (`npm run test:unit`)

```text
> system-grid-frontend@1.2.4 test:unit
> vitest run

 RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend

 Test Files  41 passed (41)
      Tests  185 passed (185)
   Start at  21:51:21
   Duration  5.95s (transform 4.39s, setup 3.20s, import 10.39s, tests 3.69s, environment 32.68s)
```

---

## 5. Playwright E2E Workflows Execution (`npx playwright test tests/assets-workflows.spec.ts`)

```text
Running 1 test using 1 worker

  ✓  1 tests/assets-workflows.spec.ts:8:3 › Assets workflows › simulates the changed Assets workflows end-to-end (22.5s)
SEED: Created monitoring item "PW-MON-1783479095038-a2yaei" (ID: 80)

  1 passed (23.5s)

[LLM-Reporter] All tests passed. No artifact needed.
```
