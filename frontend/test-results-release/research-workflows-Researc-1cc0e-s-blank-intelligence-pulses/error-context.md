# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: research-workflows.spec.ts >> Research workflows >> filters by real years and rejects blank intelligence pulses
- Location: tests/research-workflows.spec.ts:23:3

# Error details

```
Error: Could not find one visible, enabled button matching any of: INTELLIGENCE STREAM
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
            - generic [ref=e184]: 213ms
        - button "Notifications" [ref=e185] [cursor=pointer]:
          - img [ref=e186]
        - button [ref=e190] [cursor=pointer]:
          - img [ref=e191]
        - link [ref=e200] [cursor=pointer]:
          - /url: /settings
          - img [ref=e201]
    - generic [ref=e205]:
      - generic [ref=e207]:
        - generic [ref=e208]: Analysis
        - generic [ref=e209]:
          - heading "Research Matrix" [level=1] [ref=e210]:
            - generic [ref=e211]:
              - img [ref=e212]
              - generic [ref=e214]: Research Matrix
          - paragraph [ref=e215]: Unified System Intelligence & RCA Engine
        - generic [ref=e217]: 32 mixed records
      - generic [ref=e218]:
        - generic [ref=e219]:
          - generic [ref=e220]:
            - generic [ref=e221]:
              - img
              - textbox "Scan research..." [ref=e222]: PW-RESEARCH-A-1784874789308-97dp91
            - generic [ref=e223]:
              - button "Toggle Style Lab" [ref=e224] [cursor=pointer]:
                - img [ref=e225]
              - button "Column Picker" [ref=e227] [cursor=pointer]:
                - img [ref=e228]
              - button "Research Config" [ref=e229] [cursor=pointer]:
                - img [ref=e230]
          - generic [ref=e234]:
            - button "Export CSV" [ref=e235] [cursor=pointer]:
              - img [ref=e236]
            - button "Copy to Clipboard" [ref=e239] [cursor=pointer]:
              - img [ref=e240]
            - button "Add Research" [ref=e243] [cursor=pointer]:
              - img [ref=e244]
              - text: Add Research
        - generic [ref=e248]:
          - generic [ref=e249]: Record year
          - button "ALL" [ref=e250] [cursor=pointer]
          - button "2038" [ref=e251] [cursor=pointer]
          - button "2037" [ref=e252] [cursor=pointer]
          - button "2036" [ref=e253] [cursor=pointer]
          - button "2026" [ref=e254] [cursor=pointer]
      - generic [ref=e256]:
        - generic [ref=e257]:
          - generic [ref=e258]:
            - img [ref=e259]
            - generic [ref=e261]: Density Laboratory
          - generic [ref=e262]:
            - generic [ref=e263]:
              - generic [ref=e264]: Font Size
              - slider [ref=e265] [cursor=pointer]: "11"
              - generic [ref=e266]: 11px
            - generic [ref=e267]:
              - generic [ref=e268]: Row Density
              - slider [ref=e269] [cursor=pointer]: "10"
              - generic [ref=e270]: 10px
        - button [ref=e271] [cursor=pointer]:
          - img [ref=e272]
      - generic [ref=e276]:
        - generic [ref=e277]:
          - generic [ref=e278]:
            - paragraph [ref=e279]: Total Intelligence
            - paragraph [ref=e280]: "4"
          - img [ref=e282]
        - generic [ref=e284]:
          - generic [ref=e285]:
            - paragraph [ref=e286]: Under Analysis
            - paragraph [ref=e287]: "4"
          - img [ref=e289]
        - generic [ref=e291]:
          - generic [ref=e292]:
            - paragraph [ref=e293]: Root Cause Records
            - paragraph [ref=e294]: "2"
          - img [ref=e296]
        - generic [ref=e298]:
          - generic [ref=e299]:
            - paragraph [ref=e300]: Highest Priority
            - paragraph [ref=e301]: "0"
          - img [ref=e303]
      - generic [ref=e306]:
        - generic [ref=e307]: Press SPACE to select this row.
        - treegrid [ref=e308]:
          - rowgroup [ref=e309]:
            - row "ID" [ref=e310]:
              - columnheader "ID" [ref=e311]:
                - text: 
                - generic [ref=e313] [cursor=pointer]: 
                - generic [ref=e314] [cursor=pointer]: ID
                - text: 
                - generic:    
              - columnheader [ref=e315]:
                - generic [ref=e316]:
                  - checkbox [checked=mixed] [ref=e317]
                  - text: 
                - text: 
                - generic: 
          - rowgroup [ref=e318]:
            - row "Involved System Title Type Priority Status Initiation Created Last Updated Owner Problem Statement Incident Type Created By Edited By" [ref=e319]:
              - columnheader "Involved System" [ref=e320]:
                - text: 
                - generic [ref=e322] [cursor=pointer]: 
                - generic [ref=e323] [cursor=pointer]: Involved System
                - text: 
                - generic:    
              - columnheader "Title" [ref=e324]:
                - text: 
                - generic [ref=e326] [cursor=pointer]: 
                - generic [ref=e327] [cursor=pointer]: Title
                - text: 
                - generic:    
              - columnheader "Type" [ref=e328]:
                - text: 
                - generic [ref=e330] [cursor=pointer]: 
                - generic [ref=e331] [cursor=pointer]: Type
                - text: 
                - generic:    
              - columnheader "Priority" [ref=e332]:
                - text: 
                - generic [ref=e334] [cursor=pointer]: 
                - generic [ref=e335] [cursor=pointer]: Priority
                - text: 
                - generic:    
              - columnheader "Status" [ref=e336]:
                - text: 
                - generic [ref=e338] [cursor=pointer]: 
                - generic [ref=e339] [cursor=pointer]: Status
                - text: 
                - generic:    
              - columnheader "Initiation" [ref=e340]:
                - text: 
                - generic [ref=e342] [cursor=pointer]: 
                - generic [ref=e343] [cursor=pointer]: Initiation
                - text: 
                - generic:    
              - columnheader "Created" [ref=e344]:
                - text: 
                - generic [ref=e346] [cursor=pointer]: 
                - generic [ref=e347] [cursor=pointer]: Created
                - text: 
                - generic:    
              - columnheader "Last Updated" [ref=e348]:
                - text: 
                - generic [ref=e350] [cursor=pointer]: 
                - generic [ref=e351] [cursor=pointer]: Last Updated
                - text: 
                - generic:    
              - columnheader "Owner" [ref=e352]:
                - text: 
                - generic [ref=e354] [cursor=pointer]: 
                - generic [ref=e355] [cursor=pointer]: Owner
                - text: 
                - generic:    
              - columnheader "Problem Statement" [ref=e356]:
                - text: 
                - generic [ref=e358] [cursor=pointer]: 
                - generic [ref=e359] [cursor=pointer]: Problem Statement
                - text: 
                - generic:    
              - columnheader "Incident Type" [ref=e360]:
                - text: 
                - generic [ref=e362] [cursor=pointer]: 
                - generic [ref=e363] [cursor=pointer]: Incident Type
                - text: 
                - generic:    
              - columnheader "Created By" [ref=e364]:
                - text: 
                - generic [ref=e366] [cursor=pointer]: 
                - generic [ref=e367] [cursor=pointer]: Created By
                - text: 
                - generic:    
              - columnheader "Edited By" [ref=e368]:
                - text: 
                - generic [ref=e370] [cursor=pointer]: 
                - generic [ref=e371] [cursor=pointer]: Edited By
                - text: 
                - generic:    
          - rowgroup [ref=e372]:
            - row "Action" [ref=e373]:
              - columnheader "Action" [ref=e374]:
                - text: 
                - generic [ref=e375] [cursor=pointer]: Action
                - text: 
                - generic:    
          - rowgroup [ref=e376]:
            - row "RES-21 Press Space to toggle row selection (checked) " [selected] [ref=e377]:
              - gridcell "RES-21" [ref=e378]
              - gridcell "Press Space to toggle row selection (checked) " [ref=e379]:
                - checkbox "Press Space to toggle row selection (checked)" [checked] [ref=e380]
                - text: 
          - rowgroup [ref=e381]:
            - row "PW-SYS-A-1784874789308-97dp91 PW-RESEARCH-A-1784874789308-97dp91 Research HIGH Analyzing 02/02/2037, 10:05:00 PM 07/24/2026, 01:33:09 AM 07/24/2026, 01:33:09 AM N/A N/A SYSTEM N/A" [selected] [ref=e382]:
              - gridcell "PW-SYS-A-1784874789308-97dp91" [ref=e383]:
                - generic [ref=e385]: PW-SYS-A-1784874789308-97dp91
              - gridcell "PW-RESEARCH-A-1784874789308-97dp91" [ref=e386]
              - gridcell "Research" [ref=e387]
              - gridcell "HIGH" [ref=e388]:
                - generic [ref=e391]: HIGH
              - gridcell "Analyzing" [ref=e392]:
                - generic [ref=e395]: Analyzing
              - gridcell "02/02/2037, 10:05:00 PM" [ref=e396]
              - gridcell "07/24/2026, 01:33:09 AM" [ref=e397]
              - gridcell "07/24/2026, 01:33:09 AM" [ref=e398]
              - gridcell "N/A" [ref=e399]
              - gridcell [ref=e400]
              - gridcell "N/A" [ref=e401]
              - gridcell "SYSTEM" [ref=e402]
              - gridcell "N/A" [ref=e403]
          - rowgroup [ref=e404]:
            - row [selected] [ref=e405]:
              - gridcell [ref=e406]:
                - generic [ref=e408]:
                  - button "Inspect Record" [ref=e409] [cursor=pointer]:
                    - img [ref=e410]
                  - button "Purge Record" [ref=e413] [cursor=pointer]:
                    - img [ref=e414]
          - rowgroup
          - rowgroup
          - rowgroup
          - rowgroup
          - rowgroup
          - rowgroup
          - rowgroup
          - rowgroup
          - rowgroup
        - text:    
      - generic [ref=e418]:
        - generic [ref=e419]:
          - generic [ref=e420]:
            - generic [ref=e421]: INV
            - generic [ref=e422]:
              - generic [ref=e423]:
                - generic [ref=e424]:
                  - generic [ref=e425]: RESEARCH_21
                  - generic [ref=e426]: "PRIORITY: HIGH"
                - generic [ref=e428]: "Pulse: 07/24/2026, 01:33:09 AM"
              - heading "PW-RESEARCH-A-1784874789308-97dp91" [level=1] [ref=e429]
          - generic [ref=e430]:
            - button "Enter Research Mode" [ref=e431] [cursor=pointer]:
              - img [ref=e432]
              - text: Enter Research Mode
            - button [ref=e434] [cursor=pointer]:
              - img [ref=e435]
        - generic [ref=e438]:
          - generic [ref=e439]:
            - img [ref=e441]
            - generic [ref=e443]:
              - generic [ref=e444]: Current Status
              - generic [ref=e445]: ANALYZING
          - generic [ref=e446]:
            - img [ref=e448]
            - generic [ref=e451]:
              - generic [ref=e452]: Primary POC
              - generic [ref=e453]: SYSTEM_AUTO
          - generic [ref=e454]:
            - img [ref=e456]
            - generic [ref=e460]:
              - generic [ref=e461]: Impacted Systems
              - generic [ref=e462]: "1"
          - generic [ref=e463]:
            - img [ref=e465]
            - generic [ref=e467]:
              - generic [ref=e468]: Intelligence Density
              - generic [ref=e469]: "0"
        - generic [ref=e470]:
          - button "System Context" [ref=e471] [cursor=pointer]:
            - img [ref=e472]
            - text: System Context
          - button "Intelligence Stream" [ref=e477] [cursor=pointer]:
            - img [ref=e478]
            - text: Intelligence Stream
        - generic [ref=e483]:
          - generic [ref=e484]:
            - generic:
              - generic:
                - generic: Priority Spectrum
                - generic: MAJOR IMPACT / SIGNIFICANT DEGRADATION
              - generic:
                - button "LOW":
                  - generic: LOW
                - button "MEDIUM":
                  - generic: MEDIUM
                - button "HIGH":
                  - generic: HIGH
                - button "HIGHEST":
                  - generic: HIGHEST
            - generic [ref=e485]:
              - generic [ref=e486]:
                - img [ref=e487]
                - heading "Logical Definition" [level=3] [ref=e489]
              - generic [ref=e490]:
                - generic [ref=e491]:
                  - generic [ref=e492]: Lifecycle Status
                  - generic [ref=e493]:
                    - combobox [disabled] [ref=e494]:
                      - option "ANALYZING" [selected]
                      - option "OPEN"
                      - option "INVESTIGATION"
                      - option "RESOLVED"
                      - option "CLOSED"
                      - option "ESCALATED"
                      - option "MONITORING"
                    - generic:
                      - img
                - generic [ref=e495]:
                  - generic [ref=e496]: Assigned Team
                  - textbox [ref=e497]
            - generic [ref=e498]:
              - generic [ref=e499]:
                - img [ref=e500]
                - heading "Problem Statement" [level=3] [ref=e503]
              - textbox [ref=e504]
            - generic [ref=e505]:
              - generic [ref=e506]:
                - img [ref=e507]
                - heading "Investigation Triggers" [level=3] [ref=e509]
              - textbox [ref=e510]
          - generic [ref=e511]:
            - generic [ref=e512]:
              - generic [ref=e513]:
                - img [ref=e514]
                - heading "Discovery & Analysis Findings" [level=3] [ref=e517]
              - textbox "RECORD CRITICAL SYSTEM DISCOVERIES AND LOGICAL OBSERVATIONS..." [ref=e518]
            - generic [ref=e519]:
              - generic [ref=e520]:
                - img [ref=e521]
                - heading "Proposed Mitigation Architecture" [level=3] [ref=e524]
              - textbox "DEFINE RESOLUTION STRATEGY AND ARCHITECTURAL SAFEGUARDS..." [ref=e525]
    - generic [ref=e526]:
      - generic [ref=e527]:
        - generic [ref=e528]:
          - img [ref=e529]
          - generic [ref=e532]: "YOUR TIME (America/Chicago): 01:33:09"
        - generic [ref=e533]:
          - img [ref=e534]
          - generic [ref=e537]: "SOUTH KOREA (KST): 15:33:09"
      - generic [ref=e538]: VERSION 1.2.6
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
       |         ^ Error: Could not find one visible, enabled button matching any of: INTELLIGENCE STREAM
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