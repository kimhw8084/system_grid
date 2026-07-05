# OUT-26 Iteration 27 Stage25 Old Page Body Exclusion Audit

## 1. Reused Old Asset Code

- Data fetching, mutations, filters, saved views, and surface state inside [AssetsGoldenWorkspace.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/assets/AssetsGoldenWorkspace.tsx)
- Asset column definitions in [assetGoldenColumns.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/assets/assetGoldenColumns.tsx)
- Asset detail, report, map, compare, modal, and panel content

## 2. Why That Reuse Is Domain Content

- It defines asset entities, asset actions, and asset feature slots.
- It does not define the shared header/component grammar exported by the monitoring shell primitives.
- The preserved logic is content and behavior, not page-frame ownership.

## 3. Which Old Shell/Layout/Table/Command Code Was Removed Or Bypassed

- Removed visible top-level `Table`, `List`, and `Map` toolbar buttons from the command grammar.
- Removed visible top-level `Template` and `Snapshot` toolbar buttons from the command grammar.
- Replaced `Asset Registry`/`Asset Scope` language with `Assets`/`Registry Scope`.
- Replaced the long asset-specific search affordance with the monitoring-style matrix scan affordance.
- Added anchored `Surfaces` and `Export` panels so asset-only features live inside golden-style floating command slots instead of controlling the page frame.

## 4. What Prevents Old Asset Body Control Now

- The command bar now follows the monitoring order: search, `Views`, `Display`, utility icons, import/filter/domain panel buttons, then compare/bulk/add.
- Asset-only surfaces are secondary anchored panels, not first-class shell-defining toggles.
- Export behaviors are secondary anchored actions, not shell-defining buttons.

## 5. Source-Similarity Risk

- Risk remains moderate because `AssetsGoldenWorkspace.tsx` is still a very large file with preserved domain logic.
- The visible shell ownership changed materially, but the implementation is not yet a fully decomposed golden-first adapter file set.
- That remaining structural density is one reason this run is classified `PARTIAL`, not `PASS`.
