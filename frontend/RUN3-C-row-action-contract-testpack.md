# RUN3-C Row Action Contract Testpack

## Verdict
Current state is a partial fail against the row-action width law.

- Shared-path adopters using `OperationalRowActionMenu` are structurally close to the contract: `ServicesReal`, `MonitoringGrid`, and `External` compute panel width from both header text and action rows, clamp to viewport-safe width, and distribute resolved action-row width through the rendered controls.
- Legacy/manual adopters are off-contract: `AssetReal`, `NetworkReal`, and `VendorsReal` bypass shared geometry, do not couple panel width to title width, and do not guarantee that widened header/title width is inherited by the quick-action controls.
- The highest-risk regressions are title wrapping on the selected entity line, header/control width drift after long-title expansion, and viewport-edge overflow behavior in the legacy/manual menus.

## Row Action Width Law
1. The main "Row actions" header line must never wrap.
2. The selected entity title line must stay on one line.
3. The panel must widen to fit the resolved header/title content width when viewport-safe space exists.
4. If the resolved title width exceeds viewport-safe maximum width, the title must remain one line and truncate with ellipsis.
5. Header/title/meta content width and action content width must resolve to the same panel content width.
6. For multi-button rows, the row container width must equal the resolved action content width and child buttons must distribute that width without leaving an older narrower row.
7. For single-column action buttons, action cards, and dropdown editors, the control surface must render at full resolved content width.
8. Disabled, destructive, dropdown, and nested-control variants must obey the same width contract.

Failure signature:
The panel widens for the title/header, but the action row, action card, or dropdown editor remains at its older narrower width.

## Current Source Anchors
- Shared row-action panel assembly: [frontend/src/components/shared/OperationalRowActionMenu.tsx](./src/components/shared/OperationalRowActionMenu.tsx) lines 47-163.
- Shared width/placement solver: [frontend/src/components/shared/OperationalRowActionGeometry.ts](./src/components/shared/OperationalRowActionGeometry.ts) lines 20-154.
- Shared header text width estimator: [frontend/src/components/shared/OperationalBulkContract.ts](./src/components/shared/OperationalBulkContract.ts) lines 43-45.
- Shared flyout action-card template: [frontend/src/components/shared/WorkspaceFlyout.tsx](./src/components/shared/WorkspaceFlyout.tsx) lines 5-27.
- Shared flyout dropdown-editor template: [frontend/src/components/shared/WorkspaceFlyout.tsx](./src/components/shared/WorkspaceFlyout.tsx) lines 29-65.
- Shared dropdown control shell: [frontend/src/components/shared/AppDropdown.tsx](./src/components/shared/AppDropdown.tsx) lines 124-199.
- Standardized row-action adopters:
  - [frontend/src/components/ServicesReal.tsx](./src/components/ServicesReal.tsx) lines 2114-2159
  - [frontend/src/components/MonitoringGrid.tsx](./src/components/MonitoringGrid.tsx) lines 2119-2171
  - [frontend/src/components/External.tsx](./src/components/External.tsx) lines 3030-3144
- Legacy/manual row-action adopters:
  - [frontend/src/components/AssetReal.tsx](./src/components/AssetReal.tsx) lines 928-932 and 2627-2716
  - [frontend/src/components/NetworkReal.tsx](./src/components/NetworkReal.tsx) lines 954-958 and 2569-2656
  - [frontend/src/components/VendorsReal.tsx](./src/components/VendorsReal.tsx) lines 538-541 and 1157-1193

## Scenario Matrix
| Scenario | Expected panel width | Expected title behavior | Expected button/card/dropdown width | Expected viewport behavior | Candidate assertion |
| --- | --- | --- | --- | --- | --- |
| short title + few buttons | Panel width resolves from action width floor, not less than usable minimum content width | Single-line, no wrap, no ellipsis | Single-column controls are full width; multi-button row sums to resolved content width | Opens below cursor if room, else above | Assert panel content width equals action-set width when header text is shorter |
| long title + few buttons | Panel widens from header/title width until viewport-safe max | Single-line, no wrap | Action rows widen with panel to same resolved content width | Left position clamps inside viewport edge | Assert widened header causes action row width increase in same render |
| long title + many buttons | Panel width resolves to max(action-set width, header width), capped by viewport-safe max | Single-line, no wrap unless viewport cap reached; then ellipsis | Every row width resolves to same content width; no stale narrow row remains | Placement may switch above if height exceeds below-space | Assert all action rows have identical row container width after layout |
| long title at viewport edge | Width still resolved by content, then left-clamped | Single-line, ellipsis only if width cap hit | Controls keep same width as header content slot after left clamp | Panel never crosses left/right safe edge | Assert panel right edge <= viewport - 16 and row width matches header content width |
| narrow viewport | Width capped to viewport-safe max | Single-line with ellipsis | Single-column buttons/cards/dropdowns fill capped width; multi-button rows reflow but do not retain old width | Clamp inside viewport-safe width and choose above/below by available height | Assert panel width == viewportWidth - 32 and title still `nowrap` |
| title beyond viewport-safe max | Width stops at viewport-safe max | One-line ellipsis, never wrap | Controls use capped width, not pre-cap width | No horizontal overflow | Assert title element has `whitespace-nowrap` and `truncate` while panel width is capped |
| disabled buttons | Width unchanged by disabled state | Title behavior unchanged | Disabled control width equals enabled sibling width in same row/section | No placement change | Assert disabled item width matches peer width and has disabled affordance only |
| destructive buttons | Width unchanged by danger/confirm state | Title behavior unchanged | Destructive row/button spans same resolved width as non-destructive peers in same slot model | No placement change | Assert confirm state toggles color/text only, not width |
| dropdown editors | Parent panel width defines editor width | Any title above remains single-line | Action card, dropdown trigger, apply button, and option list are at least parent content width and visually aligned | Nested portal/menu stays viewport-safe | Assert `WorkspaceFlyoutActionCard`, dropdown trigger, and apply button all render `w-full` within same content slot |
| nested controls | Parent panel width defines nested control stack width | Title rules unchanged | Nested control stack occupies same resolved content width as surrounding action cards | Overflow only vertical | Assert nested stack outer box width matches sibling action-card width |
| metadata/subtitle line | Meta width participates in content-width resolution | Meta stays one line with ellipsis if capped | Action area widens to meta/title-resolved width | No overflow | Assert max(meta/title estimated width) drives panel width |
| action cards and buttons width consistency | Shared resolved content width across control types | Title rules unchanged | Card/button/dropdown surfaces align to same content width | No control narrower than title-expanded body | Assert no control row has width less than resolved content width |
| ellipsis behavior | Width caps before overflow | Long meta/title truncates with ellipsis, not wrap | Controls stay aligned to capped width | No horizontal scroll | Assert no header text wraps and no horizontal scrollbar appears |
| no wrapping behavior | Width may expand or cap, but text stays one line | Header/title/meta all `nowrap` | Controls remain width-coupled | Placement unchanged except vertical fit | Assert title line height remains single-line under long text |

## Width/Geometry Assertions
- `headerContentWidth` must be computed as `max(estimate(metaText, 72), estimate(titleText, 72))` per [frontend/src/components/shared/OperationalRowActionMenu.tsx](./src/components/shared/OperationalRowActionMenu.tsx) lines 65-70 and [frontend/src/components/shared/OperationalBulkContract.ts](./src/components/shared/OperationalBulkContract.ts) lines 43-45.
- `actionSetWidth` must resolve to `min(max(all row widths, 200), contentSafeWidth)` per [frontend/src/components/shared/OperationalRowActionGeometry.ts](./src/components/shared/OperationalRowActionGeometry.ts) lines 85-86.
- Shared-path panel width must resolve to `min(max(actionSetWidth, min(headerContentWidth, contentSafeWidth)) + panelPadding*2, viewportSafeWidth)` per [frontend/src/components/shared/OperationalRowActionGeometry.ts](./src/components/shared/OperationalRowActionGeometry.ts) lines 103-104.
- Shared-path left positioning must clamp inside viewport-safe bounds per [frontend/src/components/shared/OperationalRowActionGeometry.ts](./src/components/shared/OperationalRowActionGeometry.ts) lines 145-149.
- Shared-path vertical placement must choose below, above, or clipped max-height strictly from remaining viewport space per [frontend/src/components/shared/OperationalRowActionGeometry.ts](./src/components/shared/OperationalRowActionGeometry.ts) lines 122-138.
- Every rendered shared-path action row container must use `style.width = geometry.actionSetWidth` per [frontend/src/components/shared/OperationalRowActionMenu.tsx](./src/components/shared/OperationalRowActionMenu.tsx) lines 130-145.
- Legacy/manual menus currently have no equivalent width solver and therefore require explicit contract tests to catch drift before migration:
  - `AssetReal` has no width style on the row-action container and uses fixed `grid-cols-3` for quick actions.
  - `NetworkReal` renders from `rowActionMenu.style` but its point-open path stores no style payload.
  - `VendorsReal` renders from `rowActionMenu.style` but its point-open path stores no style payload.

## Title/Meta Assertions
- Shared-path header label "Row actions" is already single-line by content shape and must stay that way.
- Shared-path meta and selected-entity title explicitly use `truncate whitespace-nowrap` per [frontend/src/components/shared/OperationalRowActionMenu.tsx](./src/components/shared/OperationalRowActionMenu.tsx) lines 109-111. Contract assertion: both lines must expose one-line truncation under forced long strings.
- `AssetReal` is off-contract for the selected entity line because `ID {id} · {name}` lacks `truncate`, `nowrap`, and `text-overflow` classes per [frontend/src/components/AssetReal.tsx](./src/components/AssetReal.tsx) line 2639.
- `NetworkReal` is off-contract for the selected entity line because `ID {id} · {device_name}` lacks `truncate`, `nowrap`, and `text-overflow` classes per [frontend/src/components/NetworkReal.tsx](./src/components/NetworkReal.tsx) line 2579.
- `VendorsReal` is off-contract for both selected entity title and meta because neither line carries truncation or nowrap utilities per [frontend/src/components/VendorsReal.tsx](./src/components/VendorsReal.tsx) lines 1163-1164.
- Candidate assertion: force a 200+ character entity title and verify computed height of the title node remains one line in shared adopters; expected-fail until fixed in legacy/manual adopters.

## Button/Card/Dropdown Width Assertions
- Shared-path buttons inherit redistributed widths from geometry per [frontend/src/components/shared/OperationalRowActionGeometry.ts](./src/components/shared/OperationalRowActionGeometry.ts) lines 88-100 and [frontend/src/components/shared/OperationalRowActionMenu.tsx](./src/components/shared/OperationalRowActionMenu.tsx) lines 137-149.
- Disabled buttons are supported in the shared path via `disabled` plus `disabled:cursor-not-allowed disabled:opacity-60` per [frontend/src/components/shared/OperationalRowActionMenu.tsx](./src/components/shared/OperationalRowActionMenu.tsx) lines 142-143. Contract assertion: disabled state must not alter width.
- Destructive confirm state is supported via `item.confirming` and must not change width per [frontend/src/components/shared/OperationalRowActionMenu.tsx](./src/components/shared/OperationalRowActionMenu.tsx) lines 143-149.
- `MonitoringGrid` has a concrete disabled-row-action case on `knowledge` when no recovery document exists per [frontend/src/components/MonitoringGrid.tsx](./src/components/MonitoringGrid.tsx) line 2130.
- `External` has a concrete disabled destructive-row-action case when deleted entity purge is blocked per [frontend/src/components/External.tsx](./src/components/External.tsx) line 3114.
- Shared action-card template is already full width via `w-full` per [frontend/src/components/shared/WorkspaceFlyout.tsx](./src/components/shared/WorkspaceFlyout.tsx) line 17.
- Shared dropdown trigger is already full width via `w-full` per [frontend/src/components/shared/AppDropdown.tsx](./src/components/shared/AppDropdown.tsx) lines 133-144.
- Shared dropdown option rows are already full width via `w-full` per [frontend/src/components/shared/AppDropdown.tsx](./src/components/shared/AppDropdown.tsx) lines 171-189.
- Shared dropdown editor apply button does not declare `w-full`; it currently relies on the single-column grid parent in [frontend/src/components/shared/WorkspaceFlyout.tsx](./src/components/shared/WorkspaceFlyout.tsx) lines 47-61. Contract assertion: nested editor apply button width must equal dropdown trigger width.
- Legacy/manual adopters use fixed `grid-cols-2` or `grid-cols-3` quick-access layouts with no explicit width coupling to title-driven panel expansion:
  - `AssetReal` lines 2654-2675
  - `NetworkReal` lines 2594-2615
  - `VendorsReal` lines 1169-1176

## Workspace Adoption Matrix
| Component/File | Width source | Title nowrap? | Ellipsis? | Buttons share width? | Drift risk | Required test |
| --- | --- | --- | --- | --- | --- | --- |
| `shared/OperationalRowActionMenu.tsx` | Shared geometry from header text and action rows | Yes | Yes | Yes, at row-container level and redistributed child widths | Medium | Component contract test for long title, capped viewport, disabled/destructive rows |
| `shared/WorkspaceFlyout.tsx` | Parent width only | Cards: yes by layout; dropdown editor depends on parent | Card title currently no explicit truncate | Cards yes; apply button implicit | Medium | Nested-control contract test asserting card, dropdown trigger, and apply button alignment |
| `ServicesReal.tsx` | Shared `OperationalRowActionMenu` | Yes | Yes | Yes | Low | Long-title row action regression test with watch/pin and archive confirm |
| `MonitoringGrid.tsx` | Shared `OperationalRowActionMenu` | Yes | Yes | Yes | Low | Long-title plus many buttons, disabled knowledge action, narrow viewport |
| `External.tsx` | Shared `OperationalRowActionMenu` | Yes | Yes | Yes | Low | Long-title at viewport edge, disabled purge, links vs entities title variants |
| `AssetReal.tsx` | Manual container, no shared width solver | No on selected entity line | Partial on subtitle only | No guaranteed coupling | High | Expected-fail contract test for title nowrap and header/control width sync |
| `NetworkReal.tsx` | Manual anchored container, style path disconnected from point-open payload | No on selected entity line | Partial on title line only | No guaranteed coupling | High | Expected-fail contract test for title nowrap, width sync, and point-open placement |
| `VendorsReal.tsx` | Manual anchored container, style path disconnected from point-open payload | No | No | No guaranteed coupling | High | Expected-fail contract test for title nowrap, ellipsis, and quick-action width growth |

## Regression Failure Signatures
- Long selected-entity title wraps to two lines and pushes the quick-access grid downward.
- Header/title widens the panel but quick-action grid remains the old `grid-cols-2` or `grid-cols-3` width.
- Title line truncates visually but destructive or disabled action row remains narrower than the header slot.
- Panel reaches viewport edge and content overflows horizontally instead of clamping and ellipsizing.
- Disabled action changes text style only, but width shrinks due to different label or state class.
- Confirm/destructive action pulse state changes width because confirm label is longer and no width redistribution occurs.
- Dropdown trigger fills row width but nested apply button or option list remains narrower.
- Manual point-open row-action path renders offscreen or at fallback coordinates because no geometry/style payload was stored with the open state.

## Recommended Tests
1. Add a pure geometry unit suite for `computeRowActionGeometry` covering:
   `short title + few buttons`, `long title + few buttons`, `long title + many buttons`, `narrow viewport`, `viewport-edge clamp`, and `title beyond viewport-safe max`.
2. Add a component contract suite for `OperationalRowActionMenu` that mounts forced long `meta` and `title` strings and asserts:
   title node has one-line truncation classes, panel width grows when header width grows, every action row width equals the resolved content width, and destructive/disabled states preserve width.
3. Add a nested-control contract suite around `WorkspaceFlyoutActionCard` + `WorkspaceFlyoutDropdownEditor` asserting:
   card width, dropdown trigger width, apply button width, and opened option-list width all align to the same parent content width.
4. Add workspace-level DOM regression tests for shared adopters:
   `ServicesReal`, `MonitoringGrid`, and `External` should each open a row action menu for a long-title entity and assert no-wrap title behavior plus action-width coupling.
5. Add workspace-level expected-fail or migration-blocker tests for legacy/manual adopters:
   `AssetReal`, `NetworkReal`, and `VendorsReal` should be checked for title wrap, missing ellipsis, and header/control width drift until migrated to the shared row-action path.
6. Add a viewport regression matrix:
   1280px centered, 768px narrow, 390px mobile-like narrow, and right-edge cursor placement.
7. Add visual diff coverage for:
   disabled action row, destructive confirm row, long link title in `External`, and long monitor title with five quick-access buttons in `MonitoringGrid`.

## Grep/Proof Commands Used
```bash
rtk rg -n "OperationalRowAction|rowAction|RowAction|headerContentWidth|minWidth|maxWidth|width|white-space|nowrap|truncate|ellipsis|text-overflow|button|card|dropdown" frontend/src/components frontend/src
rtk rg -n "title|meta|header|action card|ActionCard|DropdownEditor|WorkspaceFlyout" frontend/src/components frontend/src
rtk rg -n "const \[rowActionMenu|OperationalRowActionMenu|row-action-menu-container|WorkspaceFlyoutActionCard|WorkspaceFlyoutDropdownEditor" frontend/src/components
rtk nl -ba frontend/src/components/shared/OperationalRowActionMenu.tsx | sed -n '1,220p'
rtk nl -ba frontend/src/components/shared/OperationalRowActionGeometry.ts | sed -n '1,220p'
rtk nl -ba frontend/src/components/shared/WorkspaceFlyout.tsx | sed -n '1,220p'
rtk nl -ba frontend/src/components/shared/AppDropdown.tsx | sed -n '1,220p'
rtk nl -ba frontend/src/components/ServicesReal.tsx | sed -n '2108,2165p'
rtk nl -ba frontend/src/components/MonitoringGrid.tsx | sed -n '2118,2178p'
rtk nl -ba frontend/src/components/External.tsx | sed -n '3030,3150p'
rtk nl -ba frontend/src/components/AssetReal.tsx | sed -n '920,950p'
rtk nl -ba frontend/src/components/AssetReal.tsx | sed -n '2627,2718p'
rtk nl -ba frontend/src/components/NetworkReal.tsx | sed -n '948,975p'
rtk nl -ba frontend/src/components/NetworkReal.tsx | sed -n '2569,2658p'
rtk nl -ba frontend/src/components/VendorsReal.tsx | sed -n '533,548p'
rtk nl -ba frontend/src/components/VendorsReal.tsx | sed -n '1157,1195p'
```
