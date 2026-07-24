# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assets-workflows.spec.ts >> Assets workflows >> simulates the changed Assets workflows end-to-end
- Location: tests/assets-workflows.spec.ts:9:3

# Error details

```
Error: Expected a visible assets grid row matching "PW-ASSET-A-1784874508597-pbjy66"

expect(locator).toBeVisible() failed

Locator: locator('[data-workspace="assets"]:visible').filter({ has: getByRole('heading') }).first().locator('.ag-pinned-left-cols-container .ag-row, .ag-center-cols-container .ag-row').filter({ hasText: 'PW-ASSET-A-1784874508597-pbjy66' }).first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expected a visible assets grid row matching "PW-ASSET-A-1784874508597-pbjy66" with timeout 15000ms
  - waiting for locator('[data-workspace="assets"]:visible').filter({ has: getByRole('heading') }).first().locator('.ag-pinned-left-cols-container .ag-row, .ag-center-cols-container .ag-row').filter({ hasText: 'PW-ASSET-A-1784874508597-pbjy66' }).first()

```

```yaml
- complementary:
  - link "SYSGRID":
    - /url: /
    - img
    - text: SYSGRID
  - button:
    - img
  - navigation:
    - button "OPERATIONS":
      - text: OPERATIONS
      - img
    - link "Home":
      - /url: /
      - img
      - text: Home
    - link "Projects":
      - /url: /projects
      - img
      - text: Projects
    - link "Monitoring":
      - /url: /monitoring
      - img
      - text: Monitoring
    - button "INFRASTRUCTURE":
      - text: INFRASTRUCTURE
      - img
    - link "Assets":
      - /url: /asset
      - img
      - text: Assets
    - link "Racks":
      - /url: /racks
      - img
      - text: Racks
    - link "Services":
      - /url: /services
      - img
      - text: Services
    - link "External":
      - /url: /external
      - img
      - text: External
    - button "CONNECTIVITY":
      - text: CONNECTIVITY
      - img
    - link "Network":
      - /url: /network
      - img
      - text: Network
    - link "Architecture":
      - /url: /architecture
      - img
      - text: Architecture
    - button "ANALYSIS":
      - text: ANALYSIS
      - img
    - link "FAR":
      - /url: /far
      - img
      - text: FAR
    - link "Research":
      - /url: /research
      - img
      - text: Research
    - button "RESOURCES":
      - text: RESOURCES
      - img
    - link "Vendors":
      - /url: /vendors
      - img
      - text: Vendors
    - link "Knowledge":
      - /url: /knowledge
      - img
      - text: Knowledge
  - 'button "Haewon Kim ID: 1"':
    - img
    - text: "Haewon Kim ID: 1"
  - button "Dark"
  - button "Light"
  - paragraph: 1.2.6
- main:
  - button "Patch Notes"
  - button "Search assets, projects, or incidents... ⌘ K":
    - img
    - text: Search assets, projects, or incidents... ⌘ K
  - button "Active Database Local Demo":
    - img
    - text: Active Database Local Demo
    - img
  - text: System Status Operational 3ms
  - button "Notifications":
    - img
  - button:
    - img
  - link:
    - /url: /settings
    - img
  - text: Infrastructure
  - heading "Assets" [level=1]:
    - img
    - text: Assets
  - paragraph: Operational asset inventory, topology context, and ownership status
  - paragraph: View Surface
  - button "Grid":
    - img
    - text: Grid
  - button "Report":
    - img
    - text: Report
  - button "Map":
    - img
    - text: Map
  - paragraph: Registry Scope
  - button "Existing (422)"
  - button "Purged (3)"
  - img
  - textbox "Scan asset matrix...": PW-ASSET-B-1784874508597-pbjy66
  - button "Views":
    - img
    - text: Views
  - button "Display":
    - img
    - text: Display
  - button "Export asset data":
    - img
  - button "No visible asset rows to copy" [disabled]:
    - img
  - button "Registry configuration":
    - img
  - button "Import":
    - img
    - text: Import
  - button "Filters":
    - img
    - text: Filters
  - button "Toggle Intelligence":
    - img
    - text: Toggle Intelligence
  - button "Compare" [disabled]:
    - img
    - text: Compare
  - button "Bulk Actions" [disabled]:
    - img
    - text: Bulk Actions
  - button "Register Asset":
    - img
    - text: Register Asset
  - img
  - paragraph: No assets match the current working view
  - paragraph: Clear filters, search terms, or apply a broader saved view to bring assets back into scope.
  - img
  - text: "YOUR TIME (America/Chicago): 01:28:55"
  - img
  - text: "SOUTH KOREA (KST): 15:28:55 VERSION 1.2.6"
```

# Test source

```ts
  752 |   await expect(menuLocator).toBeVisible()
  753 | 
  754 |   const triggerBox = await triggerLocator.boundingBox()
  755 |   const menuBox = await menuLocator.boundingBox()
  756 | 
  757 |   if (!triggerBox || triggerBox.width === 0 || triggerBox.height === 0) {
  758 |     throw new Error('Trigger box is either null or has zero size')
  759 |   }
  760 |   if (!menuBox || menuBox.width === 0 || menuBox.height === 0) {
  761 |     throw new Error('Menu box is either null or has zero size')
  762 |   }
  763 | 
  764 |   // Get viewport dimensions
  765 |   const viewportSize = page.viewportSize()
  766 |   if (viewportSize) {
  767 |     // 1. Viewport containment checks
  768 |     if (
  769 |       menuBox.x < margin ||
  770 |       menuBox.y < margin ||
  771 |       menuBox.x + menuBox.width > viewportSize.width - margin ||
  772 |       menuBox.y + menuBox.height > viewportSize.height - margin
  773 |     ) {
  774 |       throw new Error(
  775 |         `Menu is not contained within the viewport boundaries (margin ${margin}px).\n` +
  776 |         `Viewport: ${viewportSize.width}x${viewportSize.height}\n` +
  777 |         `Menu: x=${menuBox.x}, y=${menuBox.y}, w=${menuBox.width}, h=${menuBox.height}`
  778 |       )
  779 |     }
  780 |   }
  781 | 
  782 |   // 2. Center-to-center distance check
  783 |   const tx = triggerBox.x + triggerBox.width / 2
  784 |   const ty = triggerBox.y + triggerBox.height / 2
  785 |   const mx = menuBox.x + menuBox.width / 2
  786 |   const my = menuBox.y + menuBox.height / 2
  787 |   const dist = Math.sqrt(Math.pow(tx - mx, 2) + Math.pow(ty - my, 2))
  788 | 
  789 |   if (dist > maxDistance) {
  790 |     throw new Error(`Menu is detached from trigger (distance ${dist.toFixed(1)}px exceeds limit of ${maxDistance}px)`)
  791 |   }
  792 | 
  793 |   // 3. Side constraints check
  794 |   if (allowedSide === 'bottom') {
  795 |     if (menuBox.y < triggerBox.y + triggerBox.height - 10) {
  796 |       throw new Error(`Menu expected to be below trigger, but menu y (${menuBox.y}) is above trigger bottom (${triggerBox.y + triggerBox.height})`)
  797 |     }
  798 |   } else if (allowedSide === 'top') {
  799 |     if (menuBox.y + menuBox.height > triggerBox.y + 10) {
  800 |       throw new Error(`Menu expected to be above trigger, but menu bottom (${menuBox.y + menuBox.height}) is below trigger top (${triggerBox.y})`)
  801 |     }
  802 |   } else if (allowedSide === 'right') {
  803 |     if (menuBox.x < triggerBox.x - 10) {
  804 |       throw new Error(`Menu expected to be aligned right of trigger, but menu x (${menuBox.x}) is left of trigger x (${triggerBox.x})`)
  805 |     }
  806 |   } else if (allowedSide === 'left') {
  807 |     if (menuBox.x + menuBox.width > triggerBox.x + triggerBox.width + 10) {
  808 |       throw new Error(`Menu expected to be aligned left of trigger, but menu right (${menuBox.x + menuBox.width}) is right of trigger right (${triggerBox.x + triggerBox.width})`)
  809 |     }
  810 |   }
  811 | 
  812 |   // 4. Verify menu does not overlap unrelated fixed utility grid controls (e.g. pinned-left column headers) unless triggered by them
  813 |   const isTriggerInPinnedLeft = await triggerLocator.evaluate((el) => {
  814 |     return !!el.closest('.ag-pinned-left-header') || !!el.closest('.ag-pinned-left-cols-container')
  815 |   }).catch(() => false)
  816 | 
  817 |   if (!isTriggerInPinnedLeft) {
  818 |     const pinnedLeftHeader = page.locator('.ag-pinned-left-header').first()
  819 |     if (await pinnedLeftHeader.isVisible().catch(() => false)) {
  820 |       const plBox = await pinnedLeftHeader.boundingBox()
  821 |       if (plBox && plBox.width > 0) {
  822 |         // Cap standard utility column width boundaries at 350px to allow pinned domain columns (like Src Node)
  823 |         const maxAllowedUtilityWidth = Math.min(plBox.width, 350)
  824 |         if (menuBox.x < plBox.x + maxAllowedUtilityWidth - 2) {
  825 |           throw new Error(`Unanchored menu overlaps the pinned left utility column headers! Menu x: ${menuBox.x}, Pinned right: ${plBox.x + maxAllowedUtilityWidth}`)
  826 |         }
  827 |       }
  828 |     }
  829 |   }
  830 | }
  831 | 
  832 | export function getWorkspaceRoot(page: Page, workspace: WorkspaceId): Locator {
  833 |   return page.locator(`[data-workspace="${workspace}"]:visible`).filter({ has: page.getByRole('heading') }).first()
  834 | }
  835 | 
  836 | export function getWorkspaceGrid(page: Page, workspace: WorkspaceId): Locator {
  837 |   return getWorkspaceRoot(page, workspace).getByRole('treegrid').first()
  838 | }
  839 | 
  840 | export function getWorkspaceRows(page: Page, workspace: WorkspaceId): Locator {
  841 |   return getWorkspaceGrid(page, workspace).locator('.ag-center-cols-container .ag-row')
  842 | }
  843 | 
  844 | export async function getWorkspaceLogicalRowByText(page: Page, workspace: WorkspaceId, text: string | RegExp): Promise<LogicalGridRow> {
  845 |   const root = getWorkspaceRoot(page, workspace)
  846 |   const escapedText = typeof text === 'string' ? text : text.source
  847 |   const matchedRow = root
  848 |     .locator('.ag-pinned-left-cols-container .ag-row, .ag-center-cols-container .ag-row')
  849 |     .filter({ hasText: text })
  850 |     .first()
  851 | 
> 852 |   await expect(matchedRow, `Expected a visible ${workspace} grid row matching "${escapedText}"`).toBeVisible({ timeout: 15000 })
      |                                                                                                  ^ Error: Expected a visible assets grid row matching "PW-ASSET-A-1784874508597-pbjy66"
  853 | 
  854 |   const rowIdentity = await matchedRow.evaluate((node) => {
  855 |     const rowId = node.getAttribute('row-id')
  856 |     if (rowId) return { selector: 'row-id', value: rowId }
  857 |     const rowIndex = node.getAttribute('row-index')
  858 |     if (rowIndex) return { selector: 'row-index', value: rowIndex }
  859 |     return null
  860 |   })
  861 | 
  862 |   if (!rowIdentity) {
  863 |     throw new Error(`Matched ${workspace} grid row for "${escapedText}" is missing both row-id and row-index attributes.`)
  864 |   }
  865 | 
  866 |   const escapedValue = await page.evaluate((value) => CSS.escape(value), rowIdentity.value)
  867 |   const selector = `.ag-row[${rowIdentity.selector}=${escapedValue}]`
  868 |   const pinnedLocator = root.locator(`.ag-pinned-left-cols-container ${selector}`)
  869 |   const centerLocator = root.locator(`.ag-center-cols-container ${selector}`)
  870 |   const actionLocator = root.locator(`.ag-pinned-right-cols-container ${selector}`)
  871 |   const pinned = await pinnedLocator.count() > 0 ? pinnedLocator.first() : null
  872 |   const center = await centerLocator.count() > 0 ? centerLocator.first() : null
  873 |   const actions = await actionLocator.count() > 0 ? actionLocator.first() : null
  874 | 
  875 |   if (!pinned && !center) {
  876 |     throw new Error(`Resolved ${workspace} logical row "${escapedText}" (${rowIdentity.selector}=${rowIdentity.value}) but could not find pinned or center row fragments.`)
  877 |   }
  878 | 
  879 |   const action = (name: string | RegExp) => {
  880 |     const fragments = [pinned, center, actions].filter((fragment): fragment is Locator => fragment !== null)
  881 |     const candidates = fragments.map((fragment) => fragment.getByRole('button', { name }))
  882 |     const rowAction = candidates.slice(1).reduce((combined, candidate) => combined.or(candidate), candidates[0])
  883 |     return rowAction.describe(`${workspace} logical row ${rowIdentity.selector}=${rowIdentity.value} action ${String(name)}`)
  884 |   }
  885 | 
  886 |   const cell = async (columnId: string) => {
  887 |     const fragments = [pinned, center, actions].filter((fragment): fragment is Locator => fragment !== null)
  888 |     const candidates = fragments.map((fragment) => fragment.locator(`.ag-cell[col-id="${columnId}"]`))
  889 |     const counts = await Promise.all(candidates.map((candidate) => candidate.count()))
  890 |     const total = counts.reduce((sum, count) => sum + count, 0)
  891 |     if (total !== 1) {
  892 |       throw new Error(`Expected exactly one ${workspace} logical row ${rowIdentity.selector}=${rowIdentity.value} cell for col-id="${columnId}" across pinned, center, and action fragments; found ${total}.`)
  893 |     }
  894 |     return candidates[counts.findIndex((count) => count === 1)]
  895 |   }
  896 | 
  897 |   return {
  898 |     rowKey: rowIdentity.value,
  899 |     pinned,
  900 |     center,
  901 |     cell,
  902 |     action,
  903 |   }
  904 | }
  905 | 
  906 | export function getWorkspaceRowByText(page: Page, workspace: WorkspaceId, text: string | RegExp): Locator {
  907 |   return getWorkspaceRoot(page, workspace)
  908 |     .locator('.ag-pinned-left-cols-container .ag-row, .ag-center-cols-container .ag-row')
  909 |     .filter({ hasText: text })
  910 |     .first()
  911 | }
  912 | 
  913 | export async function expectWorkspaceRoute(page: Page, path: string | RegExp) {
  914 |   await expect(page).toHaveURL(typeof path === 'string' ? new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?|$)`) : path)
  915 | }
  916 | 
  917 | export async function gotoView(page: Page, path: string, heading: string | RegExp, workspace?: WorkspaceId) {
  918 |   await page.goto(path)
  919 |   if (workspace) {
  920 |     await expectWorkspaceRoute(page, path.split('?')[0])
  921 |     await expect(getWorkspaceRoot(page, workspace)).toBeVisible()
  922 |   }
  923 |   await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  924 | }
  925 | 
  926 | export function getPrimaryGrid(page: Page, workspace?: WorkspaceId): Locator {
  927 |   return workspace ? getWorkspaceGrid(page, workspace) : page.locator('[role="treegrid"]').first()
  928 | }
  929 | 
  930 | export async function fillGridSearch(page: Page, placeholder: string | RegExp, value: string, workspace?: WorkspaceId) {
  931 |   const search = (workspace ? getWorkspaceRoot(page, workspace) : page).getByPlaceholder(placeholder)
  932 |   await search.fill(value)
  933 |   await page.keyboard.press('Enter')
  934 |   await expect(search).toHaveValue(value)
  935 |   return search
  936 | }
  937 | 
  938 | export async function selectGridCheckboxRows(page: Page, indices: number[]) {
  939 |   const checkboxes = page.locator('.ag-selection-checkbox')
  940 |   for (const index of indices) {
  941 |     await checkboxes.nth(index).click()
  942 |   }
  943 | }
  944 | 
  945 | export async function openToolbarButton(page: Page, name: string | RegExp) {
  946 |   await page.getByRole('button', { name }).first().click()
  947 | }
  948 | 
  949 | export async function expectToast(page: Page, message: string | RegExp) {
  950 |   await expect(page.getByText(message).last()).toBeVisible()
  951 | }
  952 | 
```