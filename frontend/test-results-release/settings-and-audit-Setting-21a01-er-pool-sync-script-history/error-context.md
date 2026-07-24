# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings-and-audit.spec.ts >> Settings and audit workflows >> stores and exposes user-pool sync script history
- Location: tests/settings-and-audit.spec.ts:53:3

# Error details

```
Error: Could not find one visible, enabled button matching any of: /View Sync History/i
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
          - link "Services" [ref=e60] [cursor=pointer]:
            - /url: /services
            - generic [ref=e61]:
              - img [ref=e62]
              - generic [ref=e66]: Services
          - link "External" [ref=e67] [cursor=pointer]:
            - /url: /external
            - generic [ref=e68]:
              - img [ref=e69]
              - generic [ref=e75]: External
      - generic [ref=e76]:
        - button "CONNECTIVITY" [ref=e77] [cursor=pointer]:
          - generic [ref=e78]: CONNECTIVITY
          - img [ref=e79]
        - generic [ref=e82]:
          - link "Network" [ref=e83] [cursor=pointer]:
            - /url: /network
            - generic [ref=e84]:
              - img [ref=e85]
              - generic [ref=e90]: Network
          - link "Architecture" [ref=e91] [cursor=pointer]:
            - /url: /architecture
            - generic [ref=e92]:
              - img [ref=e93]
              - generic [ref=e97]: Architecture
      - generic [ref=e98]:
        - button "ANALYSIS" [ref=e99] [cursor=pointer]:
          - generic [ref=e100]: ANALYSIS
          - img [ref=e101]
        - generic [ref=e104]:
          - link "FAR" [ref=e105] [cursor=pointer]:
            - /url: /far
            - generic [ref=e106]:
              - img [ref=e107]
              - generic [ref=e109]: FAR
          - link "Research" [ref=e110] [cursor=pointer]:
            - /url: /research
            - generic [ref=e111]:
              - img [ref=e112]
              - generic [ref=e115]: Research
      - generic [ref=e116]:
        - button "RESOURCES" [ref=e117] [cursor=pointer]:
          - generic [ref=e118]: RESOURCES
          - img [ref=e119]
        - generic [ref=e122]:
          - link "Vendors" [ref=e123] [cursor=pointer]:
            - /url: /vendors
            - generic [ref=e124]:
              - img [ref=e125]
              - generic [ref=e128]: Vendors
          - link "Knowledge" [ref=e129] [cursor=pointer]:
            - /url: /knowledge
            - generic [ref=e130]:
              - img [ref=e131]
              - generic [ref=e134]: Knowledge
    - generic [ref=e135]:
      - 'button "Haewon Kim ID: 1" [ref=e136] [cursor=pointer]':
        - img [ref=e138]
        - generic [ref=e141]:
          - generic [ref=e142]: Haewon Kim
          - generic [ref=e143]: "ID: 1"
      - generic [ref=e144]:
        - button "Dark" [ref=e145] [cursor=pointer]:
          - generic [ref=e147]: Dark
        - button "Light" [ref=e148] [cursor=pointer]:
          - generic [ref=e150]: Light
    - paragraph [ref=e152]: 1.2.6
  - main [ref=e153]:
    - generic [ref=e155]:
      - generic [ref=e156]:
        - button "Patch Notes" [ref=e157] [cursor=pointer]
        - button "Search assets, projects, or incidents... ⌘ K" [ref=e158] [cursor=pointer]:
          - img [ref=e159]
          - generic [ref=e162]: Search assets, projects, or incidents...
          - generic [ref=e163]:
            - generic [ref=e164]: ⌘
            - generic [ref=e165]: K
      - generic [ref=e166]:
        - button "Active Database Local Demo" [ref=e168] [cursor=pointer]:
          - img [ref=e170]
          - generic [ref=e174]:
            - generic [ref=e175]: Active Database
            - generic [ref=e176]: Local Demo
          - img [ref=e177]
        - generic [ref=e179]:
          - generic [ref=e180]: System Status
          - generic [ref=e181]:
            - generic [ref=e182]: Operational
            - generic [ref=e183]: 14ms
        - button "Notifications" [ref=e184] [cursor=pointer]:
          - img [ref=e185]
        - button [ref=e189] [cursor=pointer]:
          - img [ref=e190]
        - link [ref=e199] [cursor=pointer]:
          - /url: /settings
          - img [ref=e200]
    - generic [ref=e204]:
      - generic [ref=e205]:
        - generic [ref=e207]:
          - heading "Settings" [level=1] [ref=e208]:
            - generic [ref=e209]:
              - img [ref=e210]
              - generic [ref=e213]: Settings
          - paragraph [ref=e214]: System Configuration & Golden Template
        - button "Golden Template" [ref=e217] [cursor=pointer]:
          - img [ref=e218]
          - generic [ref=e220]: Golden Template
      - generic [ref=e221]:
        - button "Parameters" [ref=e222] [cursor=pointer]
        - button "Permissions" [ref=e223] [cursor=pointer]
        - button "Groups" [ref=e224] [cursor=pointer]
        - button "Metadata" [ref=e225] [cursor=pointer]
        - button "Analysis" [ref=e226] [cursor=pointer]
        - button "System Diagnostics" [ref=e227] [cursor=pointer]
        - button "Tenants" [ref=e228] [cursor=pointer]
        - button "Standards" [ref=e229] [cursor=pointer]
      - generic [ref=e231]:
        - generic [ref=e232]:
          - button "Identity Sync Pipeline PYTHON-DRIVEN Automated synchronization of operators, departments, and teams from LDAP/AD providers" [active] [ref=e233] [cursor=pointer]:
            - generic [ref=e234]:
              - img [ref=e236]
              - generic [ref=e239]:
                - heading "Identity Sync Pipeline PYTHON-DRIVEN" [level=3] [ref=e240]:
                  - text: Identity Sync Pipeline
                  - generic [ref=e241]: PYTHON-DRIVEN
                - paragraph [ref=e242]: Automated synchronization of operators, departments, and teams from LDAP/AD providers
            - img [ref=e245]
          - generic [ref=e249]:
            - generic [ref=e250]:
              - generic [ref=e251]:
                - generic [ref=e252]:
                  - img [ref=e254]
                  - heading "Synchronization Logic" [level=4] [ref=e256]
                - generic [ref=e257]:
                  - button "Modify Logic" [ref=e258] [cursor=pointer]:
                    - generic [ref=e259]:
                      - img [ref=e260]
                      - text: Modify Logic
                  - button "Dry Run Preview" [ref=e262] [cursor=pointer]:
                    - generic [ref=e263]:
                      - img [ref=e264]
                      - text: Dry Run Preview
              - generic [ref=e269]:
                - textbox [ref=e270]: "# Provide real identity-source records to the backend refresh endpoint. # Expected record fields: # external_id, username, full_name, email, department, team, registration_status"
                - generic:
                  - generic:
                    - img
                    - generic: Logic Encrypted/Locked
            - generic [ref=e272]:
              - generic [ref=e273]:
                - img [ref=e274]
                - paragraph [ref=e276]: Schema Requirements
              - paragraph [ref=e277]: "Pipeline output must be a sequence of dictionaries containing exactly these mapped keys:"
              - generic [ref=e278]:
                - generic [ref=e279]:
                  - code [ref=e280]: .id
                  - generic [ref=e281]: Unique LDAP/External Key
                - generic [ref=e282]:
                  - code [ref=e283]: .username
                  - generic [ref=e284]: System Identity ID
                - generic [ref=e285]:
                  - code [ref=e286]: .full_name
                  - generic [ref=e287]: Natural Case Display Name
                - generic [ref=e288]:
                  - code [ref=e289]: .email
                  - generic [ref=e290]: Verified Contact Address
                - generic [ref=e291]:
                  - code [ref=e292]: .department
                  - generic [ref=e293]: LDAP Department Mapping
                - generic [ref=e294]:
                  - code [ref=e295]: .team
                  - generic [ref=e296]: LDAP Team Mapping
        - generic [ref=e297]:
          - generic [ref=e298]:
            - generic [ref=e299]:
              - img
              - textbox "Search identity, department, or team..." [ref=e300]
            - generic [ref=e302]:
              - generic [ref=e303]: Sort
              - combobox [ref=e304]:
                - option "Identity" [selected]
                - option "Primary Team"
                - option "Admin First"
          - generic [ref=e306]:
            - button "Revision History" [ref=e307] [cursor=pointer]:
              - generic [ref=e308]:
                - img [ref=e309]
                - text: Revision History
            - button "Bulk Actions" [disabled] [ref=e313]:
              - generic [ref=e314]:
                - img [ref=e315]
                - text: Bulk Actions
        - table [ref=e319]:
          - rowgroup [ref=e320]:
            - row "Select Identity Department Team Group(s) Admin Status projects racks assets services external network architecture research far monitoring vendors knowledge logs settings Action" [ref=e321]:
              - columnheader "Select" [ref=e322]
              - columnheader "Identity" [ref=e323]
              - columnheader "Department" [ref=e324]
              - columnheader "Team" [ref=e325]
              - columnheader "Group(s)" [ref=e326]
              - columnheader "Admin Status" [ref=e327]
              - columnheader "projects" [ref=e328]
              - columnheader "racks" [ref=e329]
              - columnheader "assets" [ref=e330]
              - columnheader "services" [ref=e331]
              - columnheader "external" [ref=e332]
              - columnheader "network" [ref=e333]
              - columnheader "architecture" [ref=e334]
              - columnheader "research" [ref=e335]
              - columnheader "far" [ref=e336]
              - columnheader "monitoring" [ref=e337]
              - columnheader "vendors" [ref=e338]
              - columnheader "knowledge" [ref=e339]
              - columnheader "logs" [ref=e340]
              - columnheader "settings" [ref=e341]
              - columnheader "Action" [ref=e342]
          - rowgroup [ref=e343]:
            - row "AD Admin Root admin_root IT — No Groups ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN" [ref=e344]:
              - cell [ref=e345]:
                - checkbox [ref=e347]
              - cell "AD Admin Root admin_root" [ref=e348]:
                - button "AD Admin Root admin_root" [ref=e349] [cursor=pointer]:
                  - generic [ref=e350]: AD
                  - generic [ref=e351]:
                    - paragraph [ref=e352]: Admin Root
                    - paragraph [ref=e353]: admin_root
              - cell "IT" [ref=e354]
              - cell "—" [ref=e355]
              - cell "No Groups" [ref=e356]:
                - generic [ref=e359]: No Groups
              - cell [ref=e360]:
                - checkbox [checked] [ref=e363]
              - cell "ADMIN" [ref=e365]:
                - button "ADMIN" [ref=e367] [cursor=pointer]
              - cell "ADMIN" [ref=e368]:
                - button "ADMIN" [ref=e370] [cursor=pointer]
              - cell "ADMIN" [ref=e371]:
                - button "ADMIN" [ref=e373] [cursor=pointer]
              - cell "ADMIN" [ref=e374]:
                - button "ADMIN" [ref=e376] [cursor=pointer]
              - cell "ADMIN" [ref=e377]:
                - button "ADMIN" [ref=e379] [cursor=pointer]
              - cell "ADMIN" [ref=e380]:
                - button "ADMIN" [ref=e382] [cursor=pointer]
              - cell "ADMIN" [ref=e383]:
                - button "ADMIN" [ref=e385] [cursor=pointer]
              - cell "ADMIN" [ref=e386]:
                - button "ADMIN" [ref=e388] [cursor=pointer]
              - cell "ADMIN" [ref=e389]:
                - button "ADMIN" [ref=e391] [cursor=pointer]
              - cell "ADMIN" [ref=e392]:
                - button "ADMIN" [ref=e394] [cursor=pointer]
              - cell "ADMIN" [ref=e395]:
                - button "ADMIN" [ref=e397] [cursor=pointer]
              - cell "ADMIN" [ref=e398]:
                - button "ADMIN" [ref=e400] [cursor=pointer]
              - cell "ADMIN" [ref=e401]:
                - button "ADMIN" [ref=e403] [cursor=pointer]
              - cell "ADMIN" [ref=e404]:
                - button "ADMIN" [ref=e406] [cursor=pointer]
              - cell [ref=e407]:
                - button "Revoke Access" [ref=e408] [cursor=pointer]:
                  - img [ref=e409]
            - row "HA Haewon Kim You haewon.kim Infrastructure — No Groups ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN" [ref=e412]:
              - cell [ref=e413]:
                - checkbox [ref=e415]
              - cell "HA Haewon Kim You haewon.kim" [ref=e416]:
                - button "HA Haewon Kim You haewon.kim" [ref=e417] [cursor=pointer]:
                  - generic [ref=e418]: HA
                  - generic [ref=e419]:
                    - paragraph [ref=e420]:
                      - text: Haewon Kim
                      - generic [ref=e421]: You
                    - paragraph [ref=e422]: haewon.kim
              - cell "Infrastructure" [ref=e423]
              - cell "—" [ref=e424]
              - cell "No Groups" [ref=e425]:
                - generic [ref=e428]: No Groups
              - cell [ref=e429]:
                - checkbox [checked] [ref=e432]
              - cell "ADMIN" [ref=e434]:
                - button "ADMIN" [ref=e436] [cursor=pointer]
              - cell "ADMIN" [ref=e437]:
                - button "ADMIN" [ref=e439] [cursor=pointer]
              - cell "ADMIN" [ref=e440]:
                - button "ADMIN" [ref=e442] [cursor=pointer]
              - cell "ADMIN" [ref=e443]:
                - button "ADMIN" [ref=e445] [cursor=pointer]
              - cell "ADMIN" [ref=e446]:
                - button "ADMIN" [ref=e448] [cursor=pointer]
              - cell "ADMIN" [ref=e449]:
                - button "ADMIN" [ref=e451] [cursor=pointer]
              - cell "ADMIN" [ref=e452]:
                - button "ADMIN" [ref=e454] [cursor=pointer]
              - cell "ADMIN" [ref=e455]:
                - button "ADMIN" [ref=e457] [cursor=pointer]
              - cell "ADMIN" [ref=e458]:
                - button "ADMIN" [ref=e460] [cursor=pointer]
              - cell "ADMIN" [ref=e461]:
                - button "ADMIN" [ref=e463] [cursor=pointer]
              - cell "ADMIN" [ref=e464]:
                - button "ADMIN" [ref=e466] [cursor=pointer]
              - cell "ADMIN" [ref=e467]:
                - button "ADMIN" [ref=e469] [cursor=pointer]
              - cell "ADMIN" [ref=e470]:
                - button "ADMIN" [ref=e472] [cursor=pointer]
              - cell "ADMIN" [ref=e473]:
                - button "ADMIN" [ref=e475] [cursor=pointer]
              - cell [ref=e476]:
                - generic "Protected Identity" [ref=e477]:
                  - img [ref=e478]
            - row "PW PW Sync One pwsync1 — — No Groups NONE NONE NONE NONE NONE NONE NONE NONE NONE NONE NONE NONE NONE NONE" [ref=e481]:
              - cell [ref=e482]:
                - checkbox [ref=e484]
              - cell "PW PW Sync One pwsync1" [ref=e485]:
                - button "PW PW Sync One pwsync1" [ref=e486] [cursor=pointer]:
                  - generic [ref=e487]: PW
                  - generic [ref=e488]:
                    - paragraph [ref=e489]: PW Sync One
                    - paragraph [ref=e490]: pwsync1
              - cell "—" [ref=e491]
              - cell "—" [ref=e492]
              - cell "No Groups" [ref=e493]:
                - generic [ref=e496]: No Groups
              - cell [ref=e497]:
                - checkbox [ref=e500]
              - cell "NONE" [ref=e502]:
                - button "NONE" [ref=e504] [cursor=pointer]
              - cell "NONE" [ref=e505]:
                - button "NONE" [ref=e507] [cursor=pointer]
              - cell "NONE" [ref=e508]:
                - button "NONE" [ref=e510] [cursor=pointer]
              - cell "NONE" [ref=e511]:
                - button "NONE" [ref=e513] [cursor=pointer]
              - cell "NONE" [ref=e514]:
                - button "NONE" [ref=e516] [cursor=pointer]
              - cell "NONE" [ref=e517]:
                - button "NONE" [ref=e519] [cursor=pointer]
              - cell "NONE" [ref=e520]:
                - button "NONE" [ref=e522] [cursor=pointer]
              - cell "NONE" [ref=e523]:
                - button "NONE" [ref=e525] [cursor=pointer]
              - cell "NONE" [ref=e526]:
                - button "NONE" [ref=e528] [cursor=pointer]
              - cell "NONE" [ref=e529]:
                - button "NONE" [ref=e531] [cursor=pointer]
              - cell "NONE" [ref=e532]:
                - button "NONE" [ref=e534] [cursor=pointer]
              - cell "NONE" [ref=e535]:
                - button "NONE" [ref=e537] [cursor=pointer]
              - cell "NONE" [ref=e538]:
                - button "NONE" [ref=e540] [cursor=pointer]
              - cell "NONE" [ref=e541]:
                - button "NONE" [ref=e543] [cursor=pointer]
              - cell [ref=e544]:
                - button "Revoke Access" [ref=e545] [cursor=pointer]:
                  - img [ref=e546]
    - generic [ref=e549]:
      - generic [ref=e550]:
        - generic [ref=e551]:
          - img [ref=e552]
          - generic [ref=e555]: "YOUR TIME (America/Chicago): 01:34:01"
        - generic [ref=e556]:
          - img [ref=e557]
          - generic [ref=e560]: "SOUTH KOREA (KST): 15:34:01"
      - generic [ref=e561]: VERSION 1.2.6
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
       |         ^ Error: Could not find one visible, enabled button matching any of: /View Sync History/i
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