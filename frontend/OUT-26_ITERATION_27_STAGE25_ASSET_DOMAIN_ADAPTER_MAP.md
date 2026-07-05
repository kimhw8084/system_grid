# OUT-26 Iteration 27 Stage25 Asset Domain Adapter Map

## Reused As Domain Content

- Route delegate: [Assets.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/Assets.tsx)
- Asset workspace implementation: [AssetsGoldenWorkspace.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/assets/AssetsGoldenWorkspace.tsx)
- Asset table column data/config: [assetGoldenColumns.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/assets/assetGoldenColumns.tsx)
- Asset detail content: [AssetDetailsView.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/assets/AssetDetailsView.tsx)

## Domain Inputs Preserved

- Asset lifecycle tabs: `inventory`, `deleted`
- Asset view state persistence and saved views
- Asset data queries, bulk mutations, and restore/purge actions
- Quick look panel
- Detail modal
- Report/list surface
- Map surface
- Compare surface
- Service, network, relationship, monitoring, history, audit, FAR, and knowledge entry points
- Import template and registry snapshot behaviors

## Domain Inputs Not Allowed To Own The Skeleton

- Old top-level `Table/List/Map` segmented shell controls
- Old `Template/Snapshot` top-level shell commands
- Old `Asset Registry` page title and `Asset Scope` action-zone language
- Old asset-specific toolbar grammar that diverged from the monitoring shell rhythm

## Stage25 Adapter Decision

- Keep domain data and deep feature content.
- Recompose the visible shell around the golden monitoring rhythm.
- Move asset-only surface switching and export flows into anchored command panels so those features remain reachable without controlling the top-level shell.
