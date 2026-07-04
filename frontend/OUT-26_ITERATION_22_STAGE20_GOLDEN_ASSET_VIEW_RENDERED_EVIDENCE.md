# OUT-26 Iteration 22 Stage 20 Golden Asset View Rendered Evidence

## Desktop measurements
- Target: `1280x720`
- Grid height: `261px`
- Visible rows counted from DOM: `13`
- Visible toolbar text: `VIEWS`, `DISPLAY`, `IMPORT`, `FILTERS`, `BULK ACTIONS`, `+ ADD ASSET`

## Responsive measurements
- Target: exact `960x720`
- Grid height: `218px`
- Visible rows counted from DOM: `11`
- Controls remained visible and usable in the rendered page

## Console counts
- Warning/error issues captured for `/asset`: `0`
- Duplicate-key count: `0`
- Page error count: `0`

## Row-action evidence
- Contract validation: `rtk npm run check:row-action-contracts` -> PASS
- Source evidence: `Assets.tsx:2172-2265`
- Rendered evidence: row action trigger remained a dedicated `.row-action-trigger` button, separate from the row body quick-look path.

## Bulk-action evidence
- Source evidence: `Assets.tsx:2921-2988`
- Rendered evidence: `Bulk Actions` remained in the shared action zone and still opened the anchored panel grammar.

## Route evidence
- Browser check:
  - Opened `http://127.0.0.1:5173/asset-real`
  - Final URL: `http://127.0.0.1:5173/asset`
- Source evidence: `App.tsx:725-726`

## Golden comparison evidence
- Monitoring reference render showed native primary toolbar grammar: search + `Views` + `Display` + import/filter/activity groups.
- Pre-change asset render showed bespoke segmented `Table/List/Map` in the primary toolbar and domain lens buttons occupying the main command grammar.
- Post-change asset render moved `Views`, `Display`, `Import`, and `Filters` into the native primary-toolbar grammar and demoted `Table/List/Map` and lens choices into a secondary row.
- Result: materially closer to the golden contract, not fully indistinguishable.

## Rich behavior spot checks
- Report view preserved.
- Map view preserved.
- Compare path preserved.
- Detail modal preserved.
- Edit modal preserved.
- Import/export artifact actions preserved.

## Validation result table

| Command | Result |
|---|---|
| `rtk npm run typecheck` | PASS |
| `rtk npm run build` | PASS |
| `rtk npm run test:lint` | PASS |
| `rtk npm run check:operational-registry-drift` | PASS |
| `rtk npm run check:form-contracts` | PASS |
| `rtk npm run check:row-action-contracts` | PASS |
| `/bin/zsh -lc "cd frontend && PW_API_BASE=http://127.0.0.1:8001/api/v1 npx playwright test tests/assets-workflows.spec.ts"` | PASS |
