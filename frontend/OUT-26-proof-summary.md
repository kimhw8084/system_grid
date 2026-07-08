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
  2. **Blocker B — Export Download & Content Proved (Behavior B.4):**
     - Fully E2E browser-proven inside `assets-workflows.spec.ts` that clicking `"Export CSV"` triggers a successful client-side download.
     - Captures the Playwright download event, validates filename pattern (`SysGrid_Assets_*.csv`), reads CSV content from local disk, and asserts that headers (`"Instance"`, `"System"`, `"Type"`, `"Status"`) and seeded row data exist inside the CSV.
  3. **Blocker C — Selection Parity (Behavior A.1 & A.2):**
     - Passed `suppressRowClickSelection={false}` into both standard and grouped `OperationalDataGrid` components in `AssetGoldenFeatureSurfaces.tsx` to align selection behaviors.
     - Added prop-level verification in `AssetGridSelectionParity.test.tsx` to confirm that the grids always receive `suppressRowClickSelection={false}`.
     - Standard row-click selection is fully browser-proven inside `assets-workflows.spec.ts` (proving cell-clicks select rows and add `.ag-row-selected` class). Checkbox selection toggles are verified via the `selectGridCheckboxRows` helper flow.
  4. **Blocker E — Compare Visual Behavior & Dismissal Hardening (Behavior B.6):**
     - Configured the Asset compare modal (`AssetCompareModal.tsx`) with body modal styling and Escape key dismissal hooks, backed by detailed filtering, difference highlights, and empty-difference states unit tests in `AssetCompareModal.test.tsx`.
     - Tested in actual E2E suite to confirm rendering and Escape key dismissal.
  5. **Deleted/Purged Scope Suppression (Behavior B.3):**
     - Fully E2E browser-proven inside `assets-workflows.spec.ts` that active-only row actions (like Pin, Watch, and Edit Configuration) are completely absent from the context menu in the Purged scope.
  6. **Bulk Action Expandable Panel Grammar (Behavior B.1):**
     - Fully E2E browser-proven inside `assets-workflows.spec.ts` that top-level buttons for destructive actions are hidden on load, expanding cards inline, with confirmations nested inside the active card.
  7. **Name/Instance click no-panel (Behavior B.2):**
     - Fully E2E browser-proven inside `assets-workflows.spec.ts` that clicking plain Name cells does NOT open the details side panel, while the explicit `'View Details'` action button still opens it.

- **Exact Behaviors Proven (Browser/E2E Level):**
  - **Behavior B.1 (Bulk Action card grammar)** — fully proven.
  - **Behavior B.2 (Name click no-panel)** — fully proven.
  - **Behavior B.3 (Deleted scope suppression)** — fully proven.
  - **Behavior B.4 (Export CSV download & content verification)** — fully proven.
  - **Behavior B.5 (Import spreadsheet paste & load into manual builder)** — fully proven.
  - **Standard Row Click Selection** — fully proven.

- **Exact Behaviors Still PARTIAL (Marked PARTIAL):**
  - **Selection parity remains PARTIAL:** Standard row-click and checkbox selection are browser-proven; exact Ctrl/Cmd and Shift modifier selection deselect state-transitions could not be reliably proven in this runner due to emulated Chromium/ag-grid keyboard modifier constraints.

- **Validation Commands and Raw Evidence File Path:**
  - Raw evidence is captured cleanly in: `frontend/OUT-26-release-candidate-raw-validation.md`
  - Validation commands run & passing:
    - Type check: `npm run typecheck` (Passed cleanly with 0 compilation errors)
    - Production build: `npm run build` (Passed cleanly, 100% bundled)
    - Unit/Component tests: `npm run test:unit` (Passed cleanly, 41 files, 185 tests passed)
    - Playwright E2E simulation: `npx playwright test tests/assets-workflows.spec.ts` (Passed cleanly with 100% workflow success)

- **Unrelated-Scope Exclusion:** Only files under `frontend/` were modified; no unrelated scopes or external tables were touched.

- **Forbidden Commands & Controls:** No Linear updates, commits, pushes, zip, or packaging operations were performed.

- **Final Worker Result:** PARTIAL (All high-priority owner blockers—import, export download, bulk panel grammar, name click no-panel, and purged suppression—are fully browser-proven; only advanced OS-modifier keyboard selections are marked PARTIAL due to local environment limits).
