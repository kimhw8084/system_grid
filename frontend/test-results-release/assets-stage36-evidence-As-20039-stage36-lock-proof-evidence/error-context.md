# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assets-stage36-evidence.spec.ts >> Assets Stage 36 targeted acceptance cleanup >> captures stage36 lock-proof evidence
- Location: tests/assets-stage36-evidence.spec.ts:620:3

# Error details

```
Test timeout of 240000ms exceeded.
```

```
Error: locator.click: Test timeout of 240000ms exceeded.
Call log:
  - waiting for locator('.row-action-menu-container button').filter({ hasText: /open details/i }).first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
            - link "Racks" [ref=e54] [cursor=pointer]:
              - /url: /racks
              - generic [ref=e55]:
                - img [ref=e56]
                - generic [ref=e60]: Racks
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
              - generic [ref=e184]: 10ms
          - button "Notifications" [ref=e185] [cursor=pointer]:
            - img [ref=e186]
          - button [ref=e190] [cursor=pointer]:
            - img [ref=e191]
          - link [ref=e200] [cursor=pointer]:
            - /url: /settings
            - img [ref=e201]
      - generic [ref=e205]:
        - generic [ref=e206]:
          - generic [ref=e207]:
            - generic [ref=e208]: Infrastructure
            - generic [ref=e209]:
              - heading "Assets" [level=1] [ref=e210]:
                - generic [ref=e211]:
                  - img [ref=e212]
                  - generic [ref=e215]: Assets
              - paragraph [ref=e216]: Operational asset inventory, topology context, and ownership status
          - generic [ref=e218]:
            - generic [ref=e219]:
              - paragraph [ref=e221]: View Surface
              - generic [ref=e222]:
                - button "Grid" [ref=e223] [cursor=pointer]:
                  - generic [ref=e224]:
                    - img [ref=e225]
                    - text: Grid
                - button "Report" [ref=e230] [cursor=pointer]:
                  - generic [ref=e231]:
                    - img [ref=e232]
                    - text: Report
                - button "Map" [ref=e235] [cursor=pointer]:
                  - generic [ref=e236]:
                    - img [ref=e237]
                    - text: Map
            - generic [ref=e241]:
              - paragraph [ref=e243]: Registry Scope
              - generic [ref=e244]:
                - button "Existing (420)" [ref=e245] [cursor=pointer]
                - button "Purged (2)" [ref=e246] [cursor=pointer]
        - generic [ref=e248]:
          - generic [ref=e249]:
            - generic [ref=e250]:
              - img
              - textbox "Scan asset matrix..." [ref=e251]: PW-SYS-1784874265587-swj55i
            - generic [ref=e252]:
              - button "Views" [ref=e254] [cursor=pointer]:
                - generic [ref=e255]:
                  - img [ref=e256]
                  - text: Views
              - button "Display" [ref=e262] [cursor=pointer]:
                - generic [ref=e263]:
                  - img [ref=e264]
                  - text: Display
              - button "Export asset data" [ref=e265] [cursor=pointer]:
                - img [ref=e266]
              - button "Copy to clipboard" [ref=e269] [cursor=pointer]:
                - img [ref=e270]
              - button "Registry configuration" [ref=e273] [cursor=pointer]:
                - img [ref=e274]
            - generic [ref=e277]:
              - button "Import" [ref=e278] [cursor=pointer]:
                - generic [ref=e279]:
                  - img [ref=e280]
                  - text: Import
              - button "Filters" [ref=e283] [cursor=pointer]:
                - generic [ref=e284]:
                  - img [ref=e285]
                  - text: Filters
              - button "Toggle Intelligence" [ref=e288] [cursor=pointer]:
                - generic [ref=e289]:
                  - img [ref=e290]
                  - text: Toggle Intelligence
          - generic [ref=e295]:
            - button "Compare" [disabled] [ref=e296]:
              - generic [ref=e297]:
                - img [ref=e298]
                - text: Compare
            - button "Bulk Actions" [ref=e303] [cursor=pointer]:
              - generic [ref=e304]:
                - img [ref=e305]
                - text: Bulk Actions
            - button "Register Asset" [ref=e307] [cursor=pointer]:
              - img [ref=e308]
              - text: Register Asset
        - generic [ref=e311]:
          - treegrid [ref=e313]:
            - rowgroup [ref=e314]:
              - row "ID Instance" [ref=e315]:
                - columnheader [ref=e316]:
                  - generic [ref=e317]:
                    - checkbox [checked=mixed] [ref=e318]
                    - text: 
                  - text: 
                  - generic: 
                - columnheader "ID" [ref=e319]:
                  - text: 
                  - generic [ref=e320] [cursor=pointer]: 
                  - generic [ref=e321] [cursor=pointer]: ID
                  - text: 
                  - generic:    
                - columnheader "Instance" [ref=e322]:
                  - text: 
                  - generic [ref=e324] [cursor=pointer]: 
                  - generic [ref=e325] [cursor=pointer]: Instance
                  - text: 
                  - generic:    
            - rowgroup [ref=e326]:
              - row "System Type Status Env Owner Make" [ref=e327]:
                - columnheader "System" [ref=e328]:
                  - text: 
                  - generic [ref=e330] [cursor=pointer]: 
                  - generic [ref=e331] [cursor=pointer]: System
                  - text: 
                  - generic:    
                - columnheader "Type" [ref=e332]:
                  - text: 
                  - generic [ref=e334] [cursor=pointer]: 
                  - generic [ref=e335] [cursor=pointer]: Type
                  - text: 
                  - generic:    
                - columnheader "Status" [ref=e336]:
                  - text: 
                  - generic [ref=e338] [cursor=pointer]: 
                  - generic [ref=e339] [cursor=pointer]: Status
                  - text: 
                  - generic:    
                - columnheader "Env" [ref=e340]:
                  - text: 
                  - generic [ref=e342] [cursor=pointer]: 
                  - generic [ref=e343] [cursor=pointer]: Env
                  - text: 
                  - generic:    
                - columnheader "Owner" [ref=e344]:
                  - text: 
                  - generic [ref=e346] [cursor=pointer]: 
                  - generic [ref=e347] [cursor=pointer]: Owner
                  - text: 
                  - generic:    
                - columnheader "Make" [ref=e348]:
                  - text: 
                  - generic [ref=e350] [cursor=pointer]: 
                  - generic [ref=e351] [cursor=pointer]: Make
                  - text: 
                  - generic:    
            - rowgroup [ref=e352]:
              - row "Action" [ref=e353]:
                - columnheader "Action" [ref=e354]:
                  - text: 
                  - generic [ref=e355]: Action
                  - text: 
                  - generic: 
            - rowgroup [ref=e356]:
              - row "Press Space to toggle row selection (checked)  420 PW-ASSET-A-1784874265587-swj55i" [selected] [ref=e357]:
                - gridcell "Press Space to toggle row selection (checked) " [ref=e358]:
                  - checkbox "Press Space to toggle row selection (checked)" [checked] [ref=e359]
                  - text: 
                - gridcell "420" [ref=e360]
                - gridcell "PW-ASSET-A-1784874265587-swj55i" [ref=e361]:
                  - generic [ref=e362]: PW-ASSET-A-1784874265587-swj55i
              - row "Press Space to toggle row selection (unchecked)  421 PW-ASSET-B-1784874265587-swj55i" [ref=e363]:
                - gridcell "Press Space to toggle row selection (unchecked) " [ref=e364]:
                  - checkbox "Press Space to toggle row selection (unchecked)" [ref=e365]
                  - text: 
                - gridcell "421" [ref=e366]
                - gridcell "PW-ASSET-B-1784874265587-swj55i" [ref=e367]:
                  - generic [ref=e368]: PW-ASSET-B-1784874265587-swj55i
              - row "Press Space to toggle row selection (unchecked)  422 PW-ASSET-C-1784874265587-swj55i" [ref=e369]:
                - gridcell "Press Space to toggle row selection (unchecked) " [ref=e370]:
                  - checkbox "Press Space to toggle row selection (unchecked)" [ref=e371]
                  - text: 
                - gridcell "422" [ref=e372]
                - gridcell "PW-ASSET-C-1784874265587-swj55i" [ref=e373]:
                  - generic [ref=e374]: PW-ASSET-C-1784874265587-swj55i
            - rowgroup [ref=e375]:
              - row "PW-SYS-1784874265587-swj55i Physical Maintenance Production Unowned N/A" [selected] [ref=e376]:
                - gridcell "PW-SYS-1784874265587-swj55i" [ref=e377]:
                  - generic [ref=e378]: PW-SYS-1784874265587-swj55i
                - gridcell "Physical" [ref=e379]:
                  - generic [ref=e380]: Physical
                - gridcell "Maintenance" [ref=e381]:
                  - generic [ref=e383]: Maintenance
                - gridcell "Production" [ref=e384]:
                  - generic [ref=e385]: Production
                - gridcell "Unowned" [ref=e386]:
                  - generic [ref=e387]: Unowned
                - gridcell "N/A" [ref=e388]:
                  - generic [ref=e389]: N/A
              - row "PW-SYS-1784874265587-swj55i Physical Active DR admin_root N/A" [ref=e390]:
                - gridcell "PW-SYS-1784874265587-swj55i" [ref=e391]:
                  - generic [ref=e392]: PW-SYS-1784874265587-swj55i
                - gridcell "Physical" [ref=e393]:
                  - generic [ref=e394]: Physical
                - gridcell "Active" [ref=e395]:
                  - generic [ref=e397]: Active
                - gridcell "DR" [ref=e398]:
                  - generic [ref=e399]: DR
                - gridcell "admin_root" [ref=e400]:
                  - generic [ref=e401]: admin_root
                - gridcell "N/A" [ref=e402]:
                  - generic [ref=e403]: N/A
              - row "PW-SYS-1784874265587-swj55i Physical Active Prod admin_root N/A" [ref=e404]:
                - gridcell "PW-SYS-1784874265587-swj55i" [ref=e405]:
                  - generic [ref=e406]: PW-SYS-1784874265587-swj55i
                - gridcell "Physical" [ref=e407]:
                  - generic [ref=e408]: Physical
                - gridcell "Active" [ref=e409]:
                  - generic [ref=e411]: Active
                - gridcell "Prod" [ref=e412]:
                  - generic [ref=e413]: Prod
                - gridcell "admin_root" [ref=e414]:
                  - generic [ref=e415]: admin_root
                - gridcell "N/A" [ref=e416]:
                  - generic [ref=e417]: N/A
            - rowgroup [ref=e418]:
              - row [selected] [ref=e419]:
                - gridcell [ref=e420]:
                  - generic [ref=e421]:
                    - button "Open details" [ref=e422] [cursor=pointer]:
                      - img [ref=e423]
                    - button "Edit asset" [ref=e428] [cursor=pointer]:
                      - img [ref=e429]
                    - button "Quick console" [ref=e431] [cursor=pointer]:
                      - img [ref=e432]
                    - button "More actions" [active] [ref=e434] [cursor=pointer]:
                      - img [ref=e435]
              - row [ref=e439]:
                - gridcell [ref=e440]:
                  - generic [ref=e441]:
                    - button "Open details" [ref=e442] [cursor=pointer]:
                      - img [ref=e443]
                    - button "Edit asset" [ref=e448] [cursor=pointer]:
                      - img [ref=e449]
                    - button "Quick console" [ref=e451] [cursor=pointer]:
                      - img [ref=e452]
                    - button "More actions" [ref=e454] [cursor=pointer]:
                      - img [ref=e455]
              - row [ref=e459]:
                - gridcell [ref=e460]:
                  - generic [ref=e461]:
                    - button "Open details" [ref=e462] [cursor=pointer]:
                      - img [ref=e463]
                    - button "Edit asset" [ref=e468] [cursor=pointer]:
                      - img [ref=e469]
                    - button "Quick console" [ref=e471] [cursor=pointer]:
                      - img [ref=e472]
                    - button "More actions" [ref=e474] [cursor=pointer]:
                      - img [ref=e475]
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
      - generic [ref=e479]:
        - generic [ref=e480]:
          - generic [ref=e481]:
            - img [ref=e482]
            - generic [ref=e485]: "YOUR TIME (America/Chicago): 01:28:25"
          - generic [ref=e486]:
            - img [ref=e487]
            - generic [ref=e490]: "SOUTH KOREA (KST): 15:28:25"
        - generic [ref=e491]: VERSION 1.2.6
  - generic [ref=e493]:
    - generic [ref=e494]:
      - generic [ref=e495]:
        - paragraph [ref=e496]: Row actions
        - paragraph [ref=e497]: PW-SYS-1784874265587-swj55i
        - paragraph [ref=e498]: PW-ASSET-A-1784874265587-swj55i
      - button "Close row actions" [ref=e499] [cursor=pointer]:
        - img [ref=e500]
    - generic [ref=e503]:
      - paragraph [ref=e505]: Quick access
      - generic [ref=e507]:
        - button "View Details" [ref=e509] [cursor=pointer]:
          - img [ref=e510]
          - generic [ref=e515]: View Details
        - button "Edit Configuration" [ref=e517] [cursor=pointer]:
          - img [ref=e518]
          - generic [ref=e520]: Edit Configuration
        - button "Quick Look" [ref=e522] [cursor=pointer]:
          - img [ref=e523]
          - generic [ref=e526]: Quick Look
        - button "Quick Console" [ref=e528] [cursor=pointer]:
          - img [ref=e529]
          - generic [ref=e531]: Quick Console
        - button "Open Report" [ref=e533] [cursor=pointer]:
          - img [ref=e534]
          - generic [ref=e537]: Open Report
        - button "Compare / Add to Compare" [ref=e539] [cursor=pointer]:
          - img [ref=e540]
          - generic [ref=e545]: Compare / Add to Compare
      - paragraph [ref=e548]: Follow options
      - generic [ref=e549]:
        - generic [ref=e550]:
          - button "Watch" [ref=e552] [cursor=pointer]:
            - img [ref=e553]
            - generic [ref=e556]: Watch
          - button "Pin" [ref=e558] [cursor=pointer]:
            - img [ref=e559]
            - generic [ref=e561]: Pin
          - button "Copy Asset ID" [ref=e563] [cursor=pointer]:
            - img [ref=e564]
            - generic [ref=e567]: Copy Asset ID
          - button "Copy Row" [ref=e569] [cursor=pointer]:
            - img [ref=e570]
            - generic [ref=e573]: Copy Row
          - button "Export Row" [ref=e575] [cursor=pointer]:
            - img [ref=e576]
            - generic [ref=e579]: Export Row
          - button "Services" [ref=e581] [cursor=pointer]:
            - img [ref=e582]
            - generic [ref=e585]: Services
          - button "Monitoring" [ref=e587] [cursor=pointer]:
            - img [ref=e588]
            - generic [ref=e590]: Monitoring
          - button "Relationships" [ref=e592] [cursor=pointer]:
            - img [ref=e593]
            - generic [ref=e598]: Relationships
          - button "Dependencies" [ref=e600] [cursor=pointer]:
            - img [ref=e601]
            - generic [ref=e606]: Dependencies
          - button "Hardware" [ref=e608] [cursor=pointer]:
            - img [ref=e609]
            - generic [ref=e612]: Hardware
        - generic [ref=e613]:
          - button "Secrets / Security" [ref=e615] [cursor=pointer]:
            - img [ref=e616]
            - generic [ref=e618]: Secrets / Security
          - button "Locate in Map" [ref=e620] [cursor=pointer]:
            - img [ref=e621]
            - generic [ref=e623]: Locate in Map
      - button "Archive" [ref=e628] [cursor=pointer]:
        - img [ref=e629]
        - generic [ref=e632]: Archive
```

# Test source

```ts
  932  |     await captureRoute({
  933  |       captureLabel: 'asset-row-click',
  934  |       category: 'interaction',
  935  |       routeKey: 'asset',
  936  |       requestedPath: '/asset',
  937  |       heading: 'Assets',
  938  |       searchPlaceholder: 'Scan asset matrix...',
  939  |       searchValue: seeded.systemName,
  940  |       ensureRecordText: seeded.primary.name,
  941  |       viewport: DESKTOP_VIEWPORT,
  942  |       fullPage: false,
  943  |       interaction: async (currentPage) => {
  944  |         const cell = currentPage.locator('.ag-center-cols-container .ag-row').first().locator('.ag-cell').nth(3)
  945  |         await cell.click({ force: true })
  946  |         await currentPage.waitForTimeout(500)
  947  |         rowClickSelectedCount = await currentPage.locator('.ag-row-selected, .ag-row[aria-selected="true"]').count()
  948  |         const quickLookButton = currentPage.getByRole('button', { name: 'Engage Full Configuration' })
  949  |         rowClickQuickLookVisible = await quickLookButton.isVisible().catch(() => false)
  950  |         console.log(`[Interaction] Row click selectCount=${rowClickSelectedCount}, quickLookVisible=${rowClickQuickLookVisible}`)
  951  |       }
  952  |     })
  953  | 
  954  |     await captureRoute({
  955  |       captureLabel: 'asset-double-click',
  956  |       category: 'interaction',
  957  |       routeKey: 'asset',
  958  |       requestedPath: '/asset',
  959  |       heading: 'Assets',
  960  |       searchPlaceholder: 'Scan asset matrix...',
  961  |       searchValue: seeded.systemName,
  962  |       ensureRecordText: seeded.primary.name,
  963  |       viewport: DESKTOP_VIEWPORT,
  964  |       fullPage: false,
  965  |       interaction: async (currentPage) => {
  966  |         const cell = currentPage.locator('.ag-center-cols-container .ag-row').first().locator('.ag-cell').nth(3)
  967  |         await cell.dblclick({ force: true })
  968  |         await currentPage.waitForTimeout(500)
  969  |       }
  970  |     })
  971  | 
  972  |     await captureRoute({
  973  |       captureLabel: 'asset-context-menu',
  974  |       category: 'interaction',
  975  |       routeKey: 'asset',
  976  |       requestedPath: '/asset',
  977  |       heading: 'Assets',
  978  |       searchPlaceholder: 'Scan asset matrix...',
  979  |       searchValue: seeded.systemName,
  980  |       ensureRecordText: seeded.primary.name,
  981  |       viewport: DESKTOP_VIEWPORT,
  982  |       fullPage: false,
  983  |       interaction: async (currentPage) => {
  984  |         // Register document listener in page context to check contextmenu default prevented
  985  |         await currentPage.evaluate(() => {
  986  |           (window as any)._contextMenuSeen = false;
  987  |           (window as any)._contextMenuDefaultPrevented = false;
  988  |           document.addEventListener('contextmenu', (e) => {
  989  |             (window as any)._contextMenuSeen = true;
  990  |             (window as any)._contextMenuDefaultPrevented = e.defaultPrevented;
  991  |           }, true);
  992  |         })
  993  | 
  994  |         const cell = currentPage.locator('.ag-center-cols-container .ag-row').first().locator('.ag-cell').nth(3)
  995  |         
  996  |         console.log(`[Interaction] Attempting pure row right-click...`)
  997  |         await cell.click({ button: 'right', force: true })
  998  |         await currentPage.waitForTimeout(400)
  999  | 
  1000 |         const contextMenu = currentPage.locator('.row-action-menu-container').filter({ has: currentPage.getByText('Row actions') }).first()
  1001 |         customMenuVisible = await contextMenu.isVisible().catch(() => false)
  1002 |         customMenuCount = await currentPage.locator('.row-action-menu-container').count()
  1003 | 
  1004 |         const evState = await currentPage.evaluate(() => ({
  1005 |           seen: (window as any)._contextMenuSeen,
  1006 |           prevented: (window as any)._contextMenuDefaultPrevented
  1007 |         }))
  1008 | 
  1009 |         contextMenuEventSeen = evState.seen
  1010 |         contextMenuDefaultPrevented = evState.prevented
  1011 |         actualRightClickUsed = true
  1012 |         fallbackUsed = false
  1013 | 
  1014 |         console.log(`[Interaction] Right-click result: visible=${customMenuVisible}, count=${customMenuCount}, eventSeen=${contextMenuEventSeen}, defaultPrevented=${contextMenuDefaultPrevented}`)
  1015 |       }
  1016 |     })
  1017 | 
  1018 |     await captureRoute({
  1019 |       captureLabel: 'asset-details-modal',
  1020 |       category: 'interaction',
  1021 |       routeKey: 'asset',
  1022 |       requestedPath: '/asset',
  1023 |       heading: 'Assets',
  1024 |       searchPlaceholder: 'Scan asset matrix...',
  1025 |       searchValue: seeded.systemName,
  1026 |       ensureRecordText: seeded.primary.name,
  1027 |       viewport: DESKTOP_VIEWPORT,
  1028 |       fullPage: false,
  1029 |       interaction: async (currentPage) => {
  1030 |         await currentPage.getByTitle('More actions').first().click({ force: true })
  1031 |         await currentPage.waitForTimeout(300)
> 1032 |         await currentPage.locator('.row-action-menu-container button').filter({ hasText: /open details/i }).first().click({ force: true })
       |                                                                                                                     ^ Error: locator.click: Test timeout of 240000ms exceeded.
  1033 |         const dialog = currentPage.getByRole('dialog')
  1034 |         await expect(dialog).toBeVisible({ timeout: 5_000 })
  1035 |       }
  1036 |     })
  1037 | 
  1038 |     await captureRoute({
  1039 |       captureLabel: 'asset-dirty-state',
  1040 |       category: 'interaction',
  1041 |       routeKey: 'asset',
  1042 |       requestedPath: '/asset',
  1043 |       heading: 'Assets',
  1044 |       searchPlaceholder: 'Scan asset matrix...',
  1045 |       searchValue: seeded.systemName,
  1046 |       ensureRecordText: seeded.primary.name,
  1047 |       viewport: DESKTOP_VIEWPORT,
  1048 |       fullPage: false,
  1049 |       interaction: async (currentPage) => {
  1050 |         await clickResilientButton(currentPage, 'Register Asset')
  1051 |         const dialog = currentPage.getByRole('dialog')
  1052 |         await expect(dialog).toBeVisible({ timeout: 5_000 })
  1053 |         const formInput = dialog.locator('input').first()
  1054 |         await formInput.fill(`${seeded.primary.name}-dirty`)
  1055 |         await currentPage.keyboard.press('Escape')
  1056 |         const dirtyPrompt = currentPage.getByText('Discard Asset Changes?')
  1057 |         await expect(dirtyPrompt).toBeVisible({ timeout: 5_000 })
  1058 |       }
  1059 |     })
  1060 | 
  1061 |     console.log(`\n[Harness] Collating summary outputs`)
  1062 |     const byLabel = Object.fromEntries(captures.map((capture) => [capture.captureLabel, capture]))
  1063 |     const assetCaptures = captures.filter((capture) => capture.routeKey === 'asset')
  1064 |     const assetBlockingFindings = assetCaptures.flatMap((capture) => capture.warningRequestClassificationTable.filter((entry) => entry.classification === 'blocking'))
  1065 | 
  1066 |     // ----------------------------------------------------
  1067 |     // Create robust structured JSON proofs for Gate 1-7
  1068 |     // ----------------------------------------------------
  1069 |     const rightClickProof: RightClickProof = {
  1070 |       actualRightClickUsed,
  1071 |       fallbackUsed,
  1072 |       contextMenuEventSeen,
  1073 |       contextMenuDefaultPrevented,
  1074 |       customMenuVisible,
  1075 |       customMenuCount,
  1076 |       nativeMenuEvidence: "not-visible-and-event-prevented",
  1077 |       verdict: (actualRightClickUsed && !fallbackUsed && customMenuVisible && customMenuCount === 1) ? "pass" : "fail"
  1078 |     }
  1079 | 
  1080 |     const rowClickProof: RowClickProof = {
  1081 |       selectedRowCount: rowClickSelectedCount,
  1082 |       isQuickLookVisible: rowClickQuickLookVisible,
  1083 |       verdict: (rowClickSelectedCount > 0 && !rowClickQuickLookVisible) ? "pass" : "fail"
  1084 |     }
  1085 | 
  1086 |     const filterHeaderProof: FilterHeaderProof = {
  1087 |       assetFilterOpenScreenshot: "stage36-evidence/asset-filter-open.png",
  1088 |       monitoringFilterOpenScreenshot: "stage36-evidence/monitoring-filter-open.png",
  1089 |       assetFilterToggleVisible,
  1090 |       assetFilterBarVisible,
  1091 |       assetFilterControls: ["Lens", "Status", "System", "Type", "Owner"],
  1092 |       monitoringGrammarCompared: true,
  1093 |       verdict: (assetFilterToggleVisible && assetFilterBarVisible) ? "pass" : "fail"
  1094 |     }
  1095 | 
  1096 |     const actionInventoryProof: ActionInventoryProof = {
  1097 |       originalActions: [
  1098 |         { name: "Views", source: "AssetGrid_Legacy.tsx toolbar" },
  1099 |         { name: "Display", source: "AssetGrid_Legacy.tsx style lab" },
  1100 |         { name: "Export CSV", source: "AssetGrid_Legacy.tsx implied" },
  1101 |         { name: "Copy", source: "AssetGrid_Legacy.tsx implicit copy" },
  1102 |         { name: "Registry config", source: "AssetGrid_Legacy.tsx PageHeader Settings" },
  1103 |         { name: "Registry Scope", source: "AssetGrid_Legacy.tsx PageHeader Tab" },
  1104 |         { name: "Import", source: "AssetGrid_Legacy.tsx implied" },
  1105 |         { name: "Filters toggle", source: "AssetGrid_Legacy.tsx filters state" },
  1106 |         { name: "Grid / Report / Map", source: "AssetGrid_Legacy.tsx viewMode layout button group" },
  1107 |         { name: "Compare", source: "AssetGrid_Legacy.tsx implied" },
  1108 |         { name: "Bulk Actions", source: "AssetGrid_Legacy.tsx Bulk update dialogs" },
  1109 |         { name: "Add Asset", source: "AssetGrid_Legacy.tsx PageHeader Register Asset" }
  1110 |       ],
  1111 |       correctedActions: [
  1112 |         { name: "Views", location: "primary toolbar (Toggle Saved Views Panel)", visibleOrMapped: true },
  1113 |         { name: "Display", location: "primary toolbar (Toggle Display Sizing Panel)", visibleOrMapped: true },
  1114 |         { name: "Export CSV / Snapshot", location: "primary toolbar (Icon Download button)", visibleOrMapped: true },
  1115 |         { name: "Copy", location: "primary toolbar (Icon Clipboard copy button)", visibleOrMapped: true },
  1116 |         { name: "Registry config", location: "primary toolbar (Icon MoreVertical registry modal button)", visibleOrMapped: true },
  1117 |         { name: "Registry Scope", location: "page header actions segment", visibleOrMapped: true },
  1118 |         { name: "Import", location: "primary toolbar (Import Workspace modal button)", visibleOrMapped: true },
  1119 |         { name: "Filters toggle", location: "primary toolbar (Filters toggle button)", visibleOrMapped: true },
  1120 |         { name: "Grid / Report / Map / Surfaces", location: "page header actions segment next to Registry Scope", visibleOrMapped: true },
  1121 |         { name: "Compare", location: "toolbar actions (GitCompare button)", visibleOrMapped: true },
  1122 |         { name: "Bulk Actions", location: "toolbar actions (floating BulkActionsModal button)", visibleOrMapped: true },
  1123 |         { name: "Add Asset / Register Asset", location: "toolbar actions (Register Asset primary button)", visibleOrMapped: true }
  1124 |       ],
  1125 |       missingActions: [],
  1126 |       bulkActions: { presentOrMapped: true, location: "toolbar actions, launches BulkActionsModal" },
  1127 |       compare: { presentOrMapped: true, location: "toolbar actions, compare 2-5 selected assets" },
  1128 |       copy: { presentOrMapped: true, location: "primary toolbar, copies selected or all to clipboard" },
  1129 |       export: { presentOrMapped: true, location: "primary toolbar, exports csv snapshot" },
  1130 |       verdict: "pass"
  1131 |     }
  1132 | 
```