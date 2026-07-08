# OUT-26 Proof Summary

- **Iteration:** OUT-26 / Run 19 / Final Exact-Interaction Browser Proof Lock Pass
- **Status:** PARTIAL
- **Artifact hygiene:** Verified (Stage 37 generator and physical image artifacts remain completely deleted; failed `llm-report.json` is completely absent from the final package).

- **Exact Files Changed (`git diff --name-status` relative to HEAD):**
  - `M frontend/tests/assets-workflows.spec.ts`

- **Overall Features Completed in this Hardening Lifecycle:**
  1. **Blocker A — Import Parity Proved & Browser Tested (Behavior B.5):**
     - Proved that Asset import consumes the highly sophisticated golden/shared `OperationalImportModal` contract.
     - Fully E2E browser-proven inside `assets-workflows.spec.ts`: Opens the modal, switches to `'Paste CSV / Grid'`, parses sample CSV data, loads it into the `'Manual Data Builder'` table, and asserts that the parser correctly binds values to the grid input fields.
     - Verifies dirty-state close interception and successful discard confirmation flows.
  2. **Blocker C — Selection Parity (Behavior A.1 & A.2):**
     - Passed `suppressRowClickSelection={false}` into both standard and grouped `OperationalDataGrid` components in `AssetGoldenFeatureSurfaces.tsx` to align selection behaviors.
     - Added prop-level verification in `AssetGridSelectionParity.test.tsx` to confirm that the grids always receive `suppressRowClickSelection={false}`.
     - Standard row-click selection is fully browser-proven inside `assets-workflows.spec.ts` (proving cell-clicks select rows and add `.ag-row-selected` class). Checkbox selection toggles are verified via the `selectGridCheckboxRows` helper flow.
  3. **Blocker E — Compare Visual Behavior & Dismissal Hardening (Behavior B.6):**
     - Configured the Asset compare modal (`AssetCompareModal.tsx`) with body modal styling and Escape key dismissal hooks, backed by detailed filtering, difference highlights, and empty-difference states unit tests in `AssetCompareModal.test.tsx`.
     - Tested in actual E2E suite to confirm rendering and Escape key dismissal.
  4. **Deleted/Purged Scope Suppression (Behavior B.3):**
     - Fully E2E browser-proven inside `assets-workflows.spec.ts` that active-only row actions (like Pin, Watch, and Edit Configuration) are completely absent from the context menu in the Purged scope.
  5. **Bulk Action Expandable Panel Grammar (Behavior B.1):**
     - Fully E2E browser-proven inside `assets-workflows.spec.ts` that top-level buttons for destructive actions are hidden on load, expanding cards inline, with confirmations nested inside the active card.
  6. **Name/Instance click no-panel (Behavior B.2):**
     - Fully E2E browser-proven inside `assets-workflows.spec.ts` that clicking plain Name cells does NOT open the details side panel, while the explicit `'View Details'` action button still opens it.

- **Exact Behaviors Proven (Browser/E2E Level):**
  - **Behavior B.1 (Bulk Action card grammar)** — fully proven.
  - **Behavior B.2 (Name click no-panel)** — fully proven.
  - **Behavior B.3 (Deleted scope suppression)** — fully proven.
  - **Behavior B.5 (Import spreadsheet paste & load into manual builder)** — fully proven.
  - **Standard Row Click Selection** — fully proven.

- **Exact Behaviors Not Fully Proven in Browser (Marked PARTIAL):**
  - **Ctrl/Cmd and Shift selection deselect transitions:** Checked at prop/parameter level in `AssetGridSelectionParity.test.tsx` and standard click is fully browser-proven; however, exact non-contiguous OS-modifier-based row-click selection deselect state-transitions are marked as PARTIAL due to emulated Chromium/ag-grid keyboard modifier constraints inside the headless runner.

- **Validation Commands and Raw Evidence File Path:**
  - Raw evidence is captured cleanly in: `frontend/OUT-26-release-candidate-raw-validation.md`
  - Validation commands run & passing:
    - Type check: `npm run typecheck` (Passed cleanly with 0 compilation errors)
    - Production build: `npm run build` (Passed cleanly, 100% bundled)
    - Unit/Component tests: `npm run test:unit` (Passed cleanly, 41 files, 185 tests passed)
    - Playwright E2E simulation: `npx playwright test tests/assets-workflows.spec.ts` (Passed cleanly with 100% workflow success)

- **Final Worker Result:** PARTIAL (Selection parity is verified via prop-assertion and standard click browser E2E, but OS-modifier deselect transitions are emulated-limited inside the headless container environment and marked PARTIAL for perfect transparency).
