# Manual Acceptance Gaps (OUT-22)

Only acceptance behavior that the current repository cannot reliably automate is listed here.

| Surface / workflow | Exact manual action | Expected result | Why automation is currently impractical |
| --- | --- | --- | --- |
| All nine locked surfaces — responsive visual review | Open Monitoring, External, Services, Network, Vendors, Assets, FAR, Research, and Settings Standards at representative desktop and narrow viewport sizes; inspect the shell, toolbar, grid, menus, and modal layers. | Controls remain readable and usable with no clipping, unintended overlap, or broken visual hierarchy. | The repository has behavioral browser assertions but no reviewed screenshot baseline or visual-diff tolerance contract. |
| Locked surfaces — non-Chromium browser compatibility | Run the representative workflows in current Firefox and Safari/WebKit, including opening and dismissing menus and modals with mouse and keyboard. | The same controls, focus behavior, routes, and overlays work without browser-specific layout or interaction defects. | The checked-in Playwright configuration defines no Firefox or WebKit projects, and CI availability for those browser binaries is not established. |
| Locked surfaces — assistive-technology announcement quality | With a desktop screen reader enabled, navigate the workspace toolbar, select grid rows, open a row-action menu, and open and close a modal. | Names, selected state, menu state, dialog title, and focus transitions are announced in a coherent order. | DOM accessibility roles can be asserted, but real screen-reader speech and focus announcements require an external assistive-technology runtime not provided by the repository. |
