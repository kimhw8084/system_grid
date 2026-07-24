# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: racks-workflows.spec.ts >> Racks workflows >> handles spatial navigation, site decommission fallback, and sandbox collision safety
- Location: tests/racks-workflows.spec.ts:7:3

# Error details

```
Error: Could not find one visible, enabled button matching any of: /PW-RACK-SITE-A-1784874787452-zztzhu/
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - link "SYSGRID" [ref=e6] [cursor=pointer]:
        - /url: /
        - img [ref=e8]
        - generic [ref=e10]: SYSGRID
      - button [ref=e11] [cursor=pointer]:
        - img [ref=e12]
    - navigation [ref=e13]:
      - generic [ref=e14]:
        - button "OPERATIONS" [ref=e15] [cursor=pointer]:
          - generic [ref=e16]: OPERATIONS
          - img [ref=e17]
        - generic [ref=e20]:
          - link "Home" [ref=e21] [cursor=pointer]:
            - /url: /
            - generic [ref=e22]:
              - img [ref=e23]
              - generic [ref=e28]: Home
          - link "Projects" [ref=e29] [cursor=pointer]:
            - /url: /projects
            - generic [ref=e30]:
              - img [ref=e31]
              - generic [ref=e34]: Projects
          - link "Monitoring" [ref=e35] [cursor=pointer]:
            - /url: /monitoring
            - generic [ref=e36]:
              - img [ref=e37]
              - generic [ref=e39]: Monitoring
      - generic [ref=e40]:
        - button "INFRASTRUCTURE" [ref=e41] [cursor=pointer]:
          - generic [ref=e42]: INFRASTRUCTURE
          - img [ref=e43]
        - generic [ref=e46]:
          - link "Assets" [ref=e47] [cursor=pointer]:
            - /url: /asset
            - generic [ref=e48]:
              - img [ref=e49]
              - generic [ref=e52]: Assets
          - link "Racks" [ref=e53] [cursor=pointer]:
            - /url: /racks
            - generic [ref=e54]:
              - img [ref=e55]
              - generic [ref=e59]: Racks
          - link "Services" [ref=e61] [cursor=pointer]:
            - /url: /services
            - generic [ref=e62]:
              - img [ref=e63]
              - generic [ref=e67]: Services
          - link "External" [ref=e68] [cursor=pointer]:
            - /url: /external
            - generic [ref=e69]:
              - img [ref=e70]
              - generic [ref=e76]: External
      - generic [ref=e77]:
        - button "CONNECTIVITY" [ref=e78] [cursor=pointer]:
          - generic [ref=e79]: CONNECTIVITY
          - img [ref=e80]
        - generic [ref=e83]:
          - link "Network" [ref=e84] [cursor=pointer]:
            - /url: /network
            - generic [ref=e85]:
              - img [ref=e86]
              - generic [ref=e91]: Network
          - link "Architecture" [ref=e92] [cursor=pointer]:
            - /url: /architecture
            - generic [ref=e93]:
              - img [ref=e94]
              - generic [ref=e98]: Architecture
      - generic [ref=e99]:
        - button "ANALYSIS" [ref=e100] [cursor=pointer]:
          - generic [ref=e101]: ANALYSIS
          - img [ref=e102]
        - generic [ref=e105]:
          - link "FAR" [ref=e106] [cursor=pointer]:
            - /url: /far
            - generic [ref=e107]:
              - img [ref=e108]
              - generic [ref=e110]: FAR
          - link "Research" [ref=e111] [cursor=pointer]:
            - /url: /research
            - generic [ref=e112]:
              - img [ref=e113]
              - generic [ref=e116]: Research
      - generic [ref=e117]:
        - button "RESOURCES" [ref=e118] [cursor=pointer]:
          - generic [ref=e119]: RESOURCES
          - img [ref=e120]
        - generic [ref=e123]:
          - link "Vendors" [ref=e124] [cursor=pointer]:
            - /url: /vendors
            - generic [ref=e125]:
              - img [ref=e126]
              - generic [ref=e129]: Vendors
          - link "Knowledge" [ref=e130] [cursor=pointer]:
            - /url: /knowledge
            - generic [ref=e131]:
              - img [ref=e132]
              - generic [ref=e135]: Knowledge
    - generic [ref=e136]:
      - 'button "Haewon Kim ID: 1" [ref=e137] [cursor=pointer]':
        - img [ref=e139]
        - generic [ref=e142]:
          - generic [ref=e143]: Haewon Kim
          - generic [ref=e144]: "ID: 1"
      - generic [ref=e145]:
        - button "Dark" [ref=e146] [cursor=pointer]:
          - generic [ref=e148]: Dark
        - button "Light" [ref=e149] [cursor=pointer]:
          - generic [ref=e151]: Light
    - paragraph [ref=e153]: 1.2.6
  - main [ref=e154]:
    - generic [ref=e156]:
      - generic [ref=e157]:
        - button "Patch Notes" [ref=e158] [cursor=pointer]
        - button "Search assets, projects, or incidents... ⌘ K" [ref=e159] [cursor=pointer]:
          - img [ref=e160]
          - generic [ref=e163]: Search assets, projects, or incidents...
          - generic [ref=e164]:
            - generic [ref=e165]: ⌘
            - generic [ref=e166]: K
      - generic [ref=e167]:
        - button "Active Database Local Demo" [ref=e169] [cursor=pointer]:
          - img [ref=e171]
          - generic [ref=e175]:
            - generic [ref=e176]: Active Database
            - generic [ref=e177]: Local Demo
          - img [ref=e178]
        - generic [ref=e180]:
          - generic [ref=e181]: System Status
          - generic [ref=e182]:
            - generic [ref=e183]: Operational
            - generic [ref=e184]: 194ms
        - button "Notifications" [ref=e185] [cursor=pointer]:
          - img [ref=e186]
        - button [ref=e190] [cursor=pointer]:
          - img [ref=e191]
        - link [ref=e200] [cursor=pointer]:
          - /url: /settings
          - img [ref=e201]
    - generic [ref=e205]:
      - generic [ref=e206]:
        - generic [ref=e208]:
          - heading "Racks" [level=1] [ref=e209]
          - paragraph [ref=e210]: Physical Capacity & Spatial Intelligence
        - generic [ref=e211]:
          - button "Import Bulk" [ref=e212] [cursor=pointer]:
            - img [ref=e213]
          - button "Logs" [ref=e216] [cursor=pointer]:
            - img [ref=e217]
            - text: Logs
          - button "Add" [ref=e220] [cursor=pointer]:
            - img [ref=e221]
            - text: Add
      - generic [ref=e222]:
        - generic [ref=e223]:
          - generic [ref=e224]:
            - button "Active" [ref=e225] [cursor=pointer]
            - button "Purged" [ref=e226] [cursor=pointer]
          - generic [ref=e227]:
            - button "Elevation" [ref=e228] [cursor=pointer]
            - button "Spatial" [ref=e229] [cursor=pointer]
          - generic [ref=e230]:
            - img [ref=e231]
            - slider [ref=e235] [cursor=pointer]: "208"
            - generic [ref=e236]: 208px
        - generic [ref=e237]:
          - generic [ref=e238]:
            - img
            - textbox "Search racks & devices..." [ref=e239]
          - button "Time Machine / Diff" [ref=e240] [cursor=pointer]:
            - img [ref=e241]
          - button "View Plans" [ref=e245] [cursor=pointer]:
            - img [ref=e246]
          - generic [ref=e247]:
            - button "All" [ref=e248] [cursor=pointer]
            - button "Compare" [ref=e249] [cursor=pointer]
      - generic [ref=e250]:
        - generic [ref=e251]:
          - button "All 0" [ref=e252] [cursor=pointer]:
            - text: All
            - generic [ref=e253]: "0"
          - generic [ref=e254]:
            - button "HQ-01 0%" [ref=e255] [cursor=pointer]:
              - text: HQ-01
              - generic [ref=e256]: 0%
            - button [ref=e257] [cursor=pointer]:
              - img [ref=e258]
          - generic [ref=e262]:
            - button "FAB-08 0%" [ref=e263] [cursor=pointer]:
              - text: FAB-08
              - generic [ref=e264]: 0%
            - button [ref=e265] [cursor=pointer]:
              - img [ref=e266]
          - generic [ref=e270]:
            - button "DR-EAST 0%" [ref=e271] [cursor=pointer]:
              - text: DR-EAST
              - generic [ref=e272]: 0%
            - button [ref=e273] [cursor=pointer]:
              - img [ref=e274]
          - generic [ref=e278]:
            - button "PW-RACK-SITE-A-1784855544379-zswlze 0%" [ref=e279] [cursor=pointer]:
              - text: PW-RACK-SITE-A-1784855544379-zswlze
              - generic [ref=e280]: 0%
            - button [ref=e281] [cursor=pointer]:
              - img [ref=e282]
          - generic [ref=e286]:
            - button "PW-RACK-SITE-B-1784855544379-zswlze 0%" [ref=e287] [cursor=pointer]:
              - text: PW-RACK-SITE-B-1784855544379-zswlze
              - generic [ref=e288]: 0%
            - button [ref=e289] [cursor=pointer]:
              - img [ref=e290]
          - generic [ref=e294]:
            - button "PW-RACK-SITE-A-1784874787452-zztzhu 0%" [ref=e295] [cursor=pointer]:
              - text: PW-RACK-SITE-A-1784874787452-zztzhu
              - generic [ref=e296]: 0%
            - button [ref=e297] [cursor=pointer]:
              - img [ref=e298]
          - generic [ref=e302]:
            - button "PW-RACK-SITE-B-1784874787452-zztzhu 0%" [ref=e303] [cursor=pointer]:
              - text: PW-RACK-SITE-B-1784874787452-zztzhu
              - generic [ref=e304]: 0%
            - button [ref=e305] [cursor=pointer]:
              - img [ref=e306]
        - generic [ref=e310]:
          - generic [ref=e311]: "Status Legend:"
          - generic [ref=e313]: Active
          - generic [ref=e315]: Standby
          - generic [ref=e317]: Maintenance
          - generic [ref=e319]: Decommissioned
          - generic [ref=e321]: Offline
          - generic [ref=e323]: Reserved
      - generic [ref=e326]:
        - img [ref=e328]
        - generic [ref=e331]:
          - paragraph [ref=e332]: No Racks in Scope
          - paragraph [ref=e333]: No physical assets found matching the current filters or site selection.
    - generic [ref=e334]:
      - generic [ref=e335]:
        - generic [ref=e336]:
          - img [ref=e337]
          - generic [ref=e340]: "YOUR TIME (America/Chicago): 01:33:08"
        - generic [ref=e341]:
          - img [ref=e342]
          - generic [ref=e345]: "SOUTH KOREA (KST): 15:33:08"
      - generic [ref=e346]: VERSION 1.2.6
```

# Test source

```ts
  876  |     throw new Error(`Resolved ${workspace} logical row "${escapedText}" (${rowIdentity.selector}=${rowIdentity.value}) but could not find pinned or center row fragments.`)
  877  |   }
  878  | 
  879  |   const action = (name: string | RegExp) => {
  880  |     const fragments = [pinned, center, actions].filter((fragment): fragment is Locator => fragment !== null)
  881  |     const candidates = fragments.map((fragment) => fragment.getByRole('button', { name }))
  882  |     const rowAction = candidates.slice(1).reduce((combined, candidate) => combined.or(candidate), candidates[0])
  883  |     return rowAction.describe(`${workspace} logical row ${rowIdentity.selector}=${rowIdentity.value} action ${String(name)}`)
  884  |   }
  885  | 
  886  |   const cell = async (columnId: string) => {
  887  |     const fragments = [pinned, center, actions].filter((fragment): fragment is Locator => fragment !== null)
  888  |     const candidates = fragments.map((fragment) => fragment.locator(`.ag-cell[col-id="${columnId}"]`))
  889  |     const counts = await Promise.all(candidates.map((candidate) => candidate.count()))
  890  |     const total = counts.reduce((sum, count) => sum + count, 0)
  891  |     if (total !== 1) {
  892  |       throw new Error(`Expected exactly one ${workspace} logical row ${rowIdentity.selector}=${rowIdentity.value} cell for col-id="${columnId}" across pinned, center, and action fragments; found ${total}.`)
  893  |     }
  894  |     return candidates[counts.findIndex((count) => count === 1)]
  895  |   }
  896  | 
  897  |   return {
  898  |     rowKey: rowIdentity.value,
  899  |     pinned,
  900  |     center,
  901  |     cell,
  902  |     action,
  903  |   }
  904  | }
  905  | 
  906  | export function getWorkspaceRowByText(page: Page, workspace: WorkspaceId, text: string | RegExp): Locator {
  907  |   return getWorkspaceRoot(page, workspace)
  908  |     .locator('.ag-pinned-left-cols-container .ag-row, .ag-center-cols-container .ag-row')
  909  |     .filter({ hasText: text })
  910  |     .first()
  911  | }
  912  | 
  913  | export async function expectWorkspaceRoute(page: Page, path: string | RegExp) {
  914  |   await expect(page).toHaveURL(typeof path === 'string' ? new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?|$)`) : path)
  915  | }
  916  | 
  917  | export async function gotoView(page: Page, path: string, heading: string | RegExp, workspace?: WorkspaceId) {
  918  |   await page.goto(path)
  919  |   if (workspace) {
  920  |     await expectWorkspaceRoute(page, path.split('?')[0])
  921  |     await expect(getWorkspaceRoot(page, workspace)).toBeVisible()
  922  |   }
  923  |   await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  924  | }
  925  | 
  926  | export function getPrimaryGrid(page: Page, workspace?: WorkspaceId): Locator {
  927  |   return workspace ? getWorkspaceGrid(page, workspace) : page.locator('[role="treegrid"]').first()
  928  | }
  929  | 
  930  | export async function fillGridSearch(page: Page, placeholder: string | RegExp, value: string, workspace?: WorkspaceId) {
  931  |   const search = (workspace ? getWorkspaceRoot(page, workspace) : page).getByPlaceholder(placeholder)
  932  |   await search.fill(value)
  933  |   await page.keyboard.press('Enter')
  934  |   await expect(search).toHaveValue(value)
  935  |   return search
  936  | }
  937  | 
  938  | export async function selectGridCheckboxRows(page: Page, indices: number[]) {
  939  |   const checkboxes = page.locator('.ag-selection-checkbox')
  940  |   for (const index of indices) {
  941  |     await checkboxes.nth(index).click()
  942  |   }
  943  | }
  944  | 
  945  | export async function openToolbarButton(page: Page, name: string | RegExp) {
  946  |   await page.getByRole('button', { name }).first().click()
  947  | }
  948  | 
  949  | export async function expectToast(page: Page, message: string | RegExp) {
  950  |   await expect(page.getByText(message).last()).toBeVisible()
  951  | }
  952  | 
  953  | export async function waitForAppIdle(page: Page) {
  954  |   const loaders = ['Scanning monitoring matrix...', 'Synchronizing Matrix...', 'Scanning infrastructure registry...', 'Synchronizing Intelligence Matrix...', 'Loading...']
  955  |   for (const loader of loaders) {
  956  |     await page.getByText(loader).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  957  |   }
  958  | }
  959  | 
  960  | export async function clickResilientButton(page: Page, ...names: (string | RegExp)[]) {
  961  |   for (const name of names) {
  962  |     const candidates = page.getByRole('button', { name, exact: typeof name === 'string' })
  963  |     const visibleEnabled: Locator[] = []
  964  |     for (let index = 0; index < await candidates.count(); index += 1) {
  965  |       const candidate = candidates.nth(index)
  966  |       if (await candidate.isVisible() && await candidate.isEnabled()) visibleEnabled.push(candidate)
  967  |     }
  968  |     if (visibleEnabled.length > 1) {
  969  |       throw new Error(`Ambiguous button ${String(name)}: found ${visibleEnabled.length} visible, enabled matches`)
  970  |     }
  971  |     if (visibleEnabled.length === 1) {
  972  |       await visibleEnabled[0].click()
  973  |       return
  974  |     }
  975  |   }
> 976  |   throw new Error(`Could not find one visible, enabled button matching any of: ${names.join(', ')}`)
       |         ^ Error: Could not find one visible, enabled button matching any of: /PW-RACK-SITE-A-1784874787452-zztzhu/
  977  | }
  978  | 
  979  | export async function verifyGridRowRobust(page: Page, searchString: string | RegExp) {
  980  |   await expect(page.locator('.ag-cell').filter({ hasText: searchString }).first()).toBeVisible({ timeout: 15000 })
  981  | }
  982  | 
  983  | export async function waitForColumnRendered(page: Page, colId: string, timeout = 10000) {
  984  |   const selector = `.ag-header-cell[col-id="${colId}"]`
  985  |   const loc = page.locator(selector).first()
  986  |   await loc.waitFor({ state: 'visible', timeout })
  987  |   
  988  |   await expect.poll(async () => {
  989  |     const box = await loc.boundingBox()
  990  |     return box && box.width > 0 && box.height > 0
  991  |   }, {
  992  |     message: `Waiting for column "${colId}" to render with a non-zero bounding box`,
  993  |     timeout,
  994  |   }).toBeTruthy()
  995  | }
  996  | 
  997  | export async function waitForColumnHidden(page: Page, colId: string, timeout = 10000) {
  998  |   const selector = `.ag-header-cell[col-id="${colId}"]`
  999  |   
  1000 |   await expect.poll(async () => {
  1001 |     const loc = page.locator(selector)
  1002 |     const count = await loc.count()
  1003 |     if (count === 0) return true
  1004 |     for (let i = 0; i < count; i++) {
  1005 |       const isVisible = await loc.nth(i).isVisible()
  1006 |       if (isVisible) {
  1007 |         const box = await loc.nth(i).boundingBox()
  1008 |         if (box && box.width > 0) {
  1009 |           return false
  1010 |         }
  1011 |       }
  1012 |     }
  1013 |     return true
  1014 |   }, {
  1015 |     message: `Waiting for column "${colId}" to be hidden`,
  1016 |     timeout,
  1017 |   }).toBeTruthy()
  1018 | }
  1019 | 
```