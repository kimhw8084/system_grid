# Stage 24 Table Parity Evidence

## Implementation evidence

- Golden table source inspected: `frontend/src/components/MonitoringGrid.tsx`
- Shared table contract used: `frontend/src/components/shared/OperationalGridContract.ts`
- Shared table builder used: `frontend/src/components/shared/OperationalGridStandard.tsx`
- Asset adapter introduced: `frontend/src/components/assets/assetGoldenColumns.tsx`

## Before vs after ownership

- Before: `AssetsGoldenWorkspace.tsx` owned a large custom `columnDefs` block with asset-specific header rhythm, inline renderers, and a page-local action column.
- After: `AssetsGoldenWorkspace.tsx` delegates visible table definition to `buildAssetGoldenColumns()` and `buildOperationalGridColumnDefinitions()`.

## Expected golden parity improvements

- Utility columns now come from the operational grid contract.
- Identity column pinning now follows shared operational sizing behavior.
- Action column now follows the shared operational action-column contract.
- Status/type/hardware/date cells now flow through shared column kinds instead of bespoke renderers.

## Rendered table evidence status

- Golden table placement: not visually re-captured.
- Asset before table placement: not re-captured in this turn.
- Asset after table placement: blocked by frontend startup failure before the asset workspace rendered.
- Header rhythm: unverified live.
- First row rhythm: unverified live.
- Column rhythm: unverified live.
- Row action placement: implemented through shared action-column contract, unverified live.
- Selection / bulk grammar: implemented through existing shared grid + anchored panel, unverified live.
- Empty / loading / error state evidence: blocked state captured instead of table state.
- Responsive table evidence: blocked state only at `960x720`.

## Result by gate

- Table ownership parity: PASS
- Rendered table parity: FAIL
