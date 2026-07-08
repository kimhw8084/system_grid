# OUT-26 Proof Summary

- **Iteration:** OUT-26 / Run 19 / Final Selection-Or-Lock Honesty Pass
- **Status:** PARTIAL
- **Artifact hygiene:** Verified (Stage 37 generator and physical image artifacts remain completely deleted; failed `llm-report.json` is completely absent from the final package).

- **Exact Files Inspected:**
  - `frontend/src/components/assets/AssetGoldenFeatureSurfaces.tsx`
  - `frontend/src/components/assets/AssetCompareModal.tsx`
  - `frontend/src/components/assets/AssetBulkActionsPanel.tsx`
  - `frontend/src/components/assets/assetGoldenColumns.tsx`
  - `frontend/src/components/assets/assetGoldenRowActions.tsx`

- **Exact Files Changed (`git diff --name-status` relative to HEAD):**
  - `M frontend/tests/assets-workflows.spec.ts`

- **Behaviors Proven in Browser / E2E Level:**
  1. **Behavior B.1 (Bulk Action Expandable Panel Grammar):**
     - Verified in actual `/asset` browser that top-level buttons for destructive actions are hidden on initial panel load.
     - Verified that clicking `"Archive Selection"` expands the card inline.
     - Verified that clicking `'Archive selected assets'` reveals the nested `"Confirm Archive?"` action button inside the card.
  2. **Behavior B.2 (Name/Instance Column Click No-Panel):**
     - Verified in actual `/asset` browser that clicking on the plain text name/Instance cell does **not** open the details side panel or trigger navigation.
     - Verified that clicking `'View Details'` inside the context menu still successfully opens the details view.
  3. **Behavior B.3 (Deleted Scope Active-Only Suppression):**
     - Verified in actual `/asset` browser that inside the Purged/Deleted view, active-only actions like `'Pin'`, `'Watch'`, and `'Edit Configuration'` are completely absent from the row context menu.
  4. **Behavior B.4 (Export CSV Download & Content Verification):**
     - Verified in actual `/asset` browser that clicking `"Export CSV"` triggers a successful client-side download.
     - Captures the Playwright download event, validates filename pattern (`SysGrid_Assets_*.csv`), reads CSV content from local disk, and asserts that headers (`"Instance"`, `"System"`, `"Type"`, `"Status"`) and seeded row data exist inside the CSV.
  5. **Behavior B.5 (Import spreadsheet paste & load into manual builder):**
     - Verified in actual `/asset` browser that clicking `"Import"` loads the shared `OperationalImportModal`.
     - Verified that pasting valid CSV rows and clicking `"Load Into Builder"` parses the delimiter/columns and successfully populates the manual data builder's input fields (verified with direct `.toHaveValue()` assertion).
     - Verified that clicking `'Close'` triggers the dirty-state close guard and clicking `'Discard Changes'` completes the modal cleanup.
  6. **Standard Row Click Selection (Behavior A.3 & A.4):**
     - Verified that plain cell-clicks successfully select the row container and assign the `.ag-row-selected` class, and checkbox selection still works.

- **Behaviors Proven by Unit/Component Tests Only:**
  1. **Import Modal dynamic schema schema endpoint mounting** — Verified in `AssetImportParity.test.tsx`.
  2. **Grids `suppressRowClickSelection={false}` prop-state verification** — Verified in `AssetGridSelectionParity.test.tsx`.
  3. **Comparison parameter difference filtering and empty alerts** — Verified in `AssetCompareModal.test.tsx`.
  4. **Bulk card confirmation toggle validations** — Verified in `AssetBulkActionsPanel.test.tsx`.

- **Behaviors Still PARTIAL:**
  - **Selection parity remains PARTIAL:** Standard row-click and checkbox selection are browser-proven; exact Ctrl/Cmd and Shift modifier selection deselect state-transitions could not be reliably proven in this runner due to emulated Chromium/ag-grid keyboard modifier constraints inside the macOS host environment.

- **Validation Commands and Raw Evidence File Path:**
  - Raw evidence is captured cleanly in: `frontend/OUT-26-release-candidate-raw-validation.md`
  - Validation commands run & passing:
    - Type check: `npm run typecheck` (Passed cleanly with 0 compilation errors)
    - Production build: `npm run build` (Passed cleanly, 100% bundled)
    - Unit/Component tests: `npm run test:unit` (Passed cleanly, 41 files, 185 tests passed)
    - Playwright E2E simulation: `npx playwright test tests/assets-workflows.spec.ts` (Passed cleanly with 100% workflow success)

- **Unrelated-Scope Exclusion:**
  - Only files under the `frontend/` source slice were inspected or modified; no unrelated scopes or external tables were altered.

- **Forbidden Commands & Controls:**
  - No Linear updates, commits, pushes, zip, or packaging operations were performed.

- **Final Worker Result:** PARTIAL (All high-priority owner blockers—import, export download, bulk panel grammar, name click no-panel, and purged suppression—are fully browser-proven; only advanced OS-modifier keyboard selections are marked PARTIAL due to local environment limits).
