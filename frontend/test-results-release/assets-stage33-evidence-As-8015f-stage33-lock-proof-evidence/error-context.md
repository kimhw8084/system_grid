# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assets-stage33-evidence.spec.ts >> Assets Stage 33 evidence capture >> captures stage33 lock-proof evidence
- Location: tests/assets-stage33-evidence.spec.ts:694:3

# Error details

```
Test timeout of 240000ms exceeded.
```

```
Error: locator.click: Test timeout of 240000ms exceeded.
Call log:
  - waiting for getByTitle('Open quick look').first()

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
            - generic [ref=e184]: 20ms
        - button "Notifications" [ref=e185] [cursor=pointer]:
          - img [ref=e186]
        - button "2" [ref=e190] [cursor=pointer]:
          - img [ref=e191]
          - generic [ref=e200]: "2"
        - link [ref=e201] [cursor=pointer]:
          - /url: /settings
          - img [ref=e202]
    - generic [ref=e206]:
      - generic [ref=e207]:
        - generic [ref=e208]:
          - generic [ref=e209]: Infrastructure
          - generic [ref=e210]:
            - heading "Assets" [level=1] [ref=e211]:
              - generic [ref=e212]:
                - img [ref=e213]
                - generic [ref=e216]: Assets
            - paragraph [ref=e217]: Operational asset inventory, topology context, and ownership status
        - generic [ref=e219]:
          - generic [ref=e220]:
            - paragraph [ref=e222]: View Surface
            - generic [ref=e223]:
              - button "Grid" [ref=e224] [cursor=pointer]:
                - generic [ref=e225]:
                  - img [ref=e226]
                  - text: Grid
              - button "Report" [ref=e231] [cursor=pointer]:
                - generic [ref=e232]:
                  - img [ref=e233]
                  - text: Report
              - button "Map" [ref=e236] [cursor=pointer]:
                - generic [ref=e237]:
                  - img [ref=e238]
                  - text: Map
          - generic [ref=e242]:
            - paragraph [ref=e244]: Registry Scope
            - generic [ref=e245]:
              - button "Existing (411)" [ref=e246] [cursor=pointer]
              - button "Purged (2)" [ref=e247] [cursor=pointer]
      - generic [ref=e249]:
        - generic [ref=e250]:
          - generic [ref=e251]:
            - img
            - textbox "Scan asset matrix..." [active] [ref=e252]: PW-SYS-1784873657203-cxn44e
          - generic [ref=e253]:
            - button "Views" [ref=e255] [cursor=pointer]:
              - generic [ref=e256]:
                - img [ref=e257]
                - text: Views
            - button "Display" [ref=e263] [cursor=pointer]:
              - generic [ref=e264]:
                - img [ref=e265]
                - text: Display
            - button "Export asset data" [ref=e266] [cursor=pointer]:
              - img [ref=e267]
            - button "Copy to clipboard" [ref=e270] [cursor=pointer]:
              - img [ref=e271]
            - button "Registry configuration" [ref=e274] [cursor=pointer]:
              - img [ref=e275]
          - generic [ref=e278]:
            - button "Import" [ref=e279] [cursor=pointer]:
              - generic [ref=e280]:
                - img [ref=e281]
                - text: Import
            - button "Filters" [ref=e284] [cursor=pointer]:
              - generic [ref=e285]:
                - img [ref=e286]
                - text: Filters
            - button "Toggle Intelligence" [ref=e289] [cursor=pointer]:
              - generic [ref=e290]:
                - img [ref=e291]
                - text: Toggle Intelligence
        - generic [ref=e296]:
          - button "Compare" [disabled] [ref=e297]:
            - generic [ref=e298]:
              - img [ref=e299]
              - text: Compare
          - button "Bulk Actions" [disabled] [ref=e304]:
            - generic [ref=e305]:
              - img [ref=e306]
              - text: Bulk Actions
          - button "Register Asset" [ref=e308] [cursor=pointer]:
            - img [ref=e309]
            - text: Register Asset
      - generic [ref=e312]:
        - treegrid [ref=e314]:
          - rowgroup [ref=e315]:
            - row "ID Instance" [ref=e316]:
              - columnheader [ref=e317]:
                - generic [ref=e318]:
                  - checkbox [ref=e319]
                  - text: 
                - text: 
                - generic: 
              - columnheader "ID" [ref=e320]:
                - text: 
                - generic [ref=e321] [cursor=pointer]: 
                - generic [ref=e322] [cursor=pointer]: ID
                - text: 
                - generic:    
              - columnheader "Instance" [ref=e323]:
                - text: 
                - generic [ref=e325] [cursor=pointer]: 
                - generic [ref=e326] [cursor=pointer]: Instance
                - text: 
                - generic:    
          - rowgroup [ref=e327]:
            - row "System Type Status Env Owner Make" [ref=e328]:
              - columnheader "System" [ref=e329]:
                - text: 
                - generic [ref=e331] [cursor=pointer]: 
                - generic [ref=e332] [cursor=pointer]: System
                - text: 
                - generic:    
              - columnheader "Type" [ref=e333]:
                - text: 
                - generic [ref=e335] [cursor=pointer]: 
                - generic [ref=e336] [cursor=pointer]: Type
                - text: 
                - generic:    
              - columnheader "Status" [ref=e337]:
                - text: 
                - generic [ref=e339] [cursor=pointer]: 
                - generic [ref=e340] [cursor=pointer]: Status
                - text: 
                - generic:    
              - columnheader "Env" [ref=e341]:
                - text: 
                - generic [ref=e343] [cursor=pointer]: 
                - generic [ref=e344] [cursor=pointer]: Env
                - text: 
                - generic:    
              - columnheader "Owner" [ref=e345]:
                - text: 
                - generic [ref=e347] [cursor=pointer]: 
                - generic [ref=e348] [cursor=pointer]: Owner
                - text: 
                - generic:    
              - columnheader "Make" [ref=e349]:
                - text: 
                - generic [ref=e351] [cursor=pointer]: 
                - generic [ref=e352] [cursor=pointer]: Make
                - text: 
                - generic:    
          - rowgroup [ref=e353]:
            - row "Action" [ref=e354]:
              - columnheader "Action" [ref=e355]:
                - text: 
                - generic [ref=e356]: Action
                - text: 
                - generic: 
          - rowgroup [ref=e357]:
            - row "Press Space to toggle row selection (unchecked)  411 PW-ASSET-A-1784873657203-cxn44e" [ref=e358]:
              - gridcell "Press Space to toggle row selection (unchecked) " [ref=e359]:
                - checkbox "Press Space to toggle row selection (unchecked)" [ref=e360]
                - text: 
              - gridcell "411" [ref=e361]
              - gridcell "PW-ASSET-A-1784873657203-cxn44e" [ref=e362]:
                - generic [ref=e363]: PW-ASSET-A-1784873657203-cxn44e
            - row "Press Space to toggle row selection (unchecked)  412 PW-ASSET-B-1784873657203-cxn44e" [ref=e364]:
              - gridcell "Press Space to toggle row selection (unchecked) " [ref=e365]:
                - checkbox "Press Space to toggle row selection (unchecked)" [ref=e366]
                - text: 
              - gridcell "412" [ref=e367]
              - gridcell "PW-ASSET-B-1784873657203-cxn44e" [ref=e368]:
                - generic [ref=e369]: PW-ASSET-B-1784873657203-cxn44e
            - row "Press Space to toggle row selection (unchecked)  413 PW-ASSET-C-1784873657203-cxn44e" [ref=e370]:
              - gridcell "Press Space to toggle row selection (unchecked) " [ref=e371]:
                - checkbox "Press Space to toggle row selection (unchecked)" [ref=e372]
                - text: 
              - gridcell "413" [ref=e373]
              - gridcell "PW-ASSET-C-1784873657203-cxn44e" [ref=e374]:
                - generic [ref=e375]: PW-ASSET-C-1784873657203-cxn44e
          - rowgroup [ref=e376]:
            - row "PW-SYS-1784873657203-cxn44e Physical Maintenance Production Unowned N/A" [ref=e377]:
              - gridcell "PW-SYS-1784873657203-cxn44e" [ref=e378]:
                - generic [ref=e379]: PW-SYS-1784873657203-cxn44e
              - gridcell "Physical" [ref=e380]:
                - generic [ref=e381]: Physical
              - gridcell "Maintenance" [ref=e382]:
                - generic [ref=e384]: Maintenance
              - gridcell "Production" [ref=e385]:
                - generic [ref=e386]: Production
              - gridcell "Unowned" [ref=e387]:
                - generic [ref=e388]: Unowned
              - gridcell "N/A" [ref=e389]:
                - generic [ref=e390]: N/A
            - row "PW-SYS-1784873657203-cxn44e Physical Active DR admin_root N/A" [ref=e391]:
              - gridcell "PW-SYS-1784873657203-cxn44e" [ref=e392]:
                - generic [ref=e393]: PW-SYS-1784873657203-cxn44e
              - gridcell "Physical" [ref=e394]:
                - generic [ref=e395]: Physical
              - gridcell "Active" [ref=e396]:
                - generic [ref=e398]: Active
              - gridcell "DR" [ref=e399]:
                - generic [ref=e400]: DR
              - gridcell "admin_root" [ref=e401]:
                - generic [ref=e402]: admin_root
              - gridcell "N/A" [ref=e403]:
                - generic [ref=e404]: N/A
            - row "PW-SYS-1784873657203-cxn44e Physical Active Prod admin_root N/A" [ref=e405]:
              - gridcell "PW-SYS-1784873657203-cxn44e" [ref=e406]:
                - generic [ref=e407]: PW-SYS-1784873657203-cxn44e
              - gridcell "Physical" [ref=e408]:
                - generic [ref=e409]: Physical
              - gridcell "Active" [ref=e410]:
                - generic [ref=e412]: Active
              - gridcell "Prod" [ref=e413]:
                - generic [ref=e414]: Prod
              - gridcell "admin_root" [ref=e415]:
                - generic [ref=e416]: admin_root
              - gridcell "N/A" [ref=e417]:
                - generic [ref=e418]: N/A
          - rowgroup [ref=e419]:
            - row [ref=e420]:
              - gridcell [ref=e421]:
                - generic [ref=e422]:
                  - button "Open details" [ref=e423] [cursor=pointer]:
                    - img [ref=e424]
                  - button "Edit asset" [ref=e429] [cursor=pointer]:
                    - img [ref=e430]
                  - button "Quick console" [ref=e432] [cursor=pointer]:
                    - img [ref=e433]
                  - button "More actions" [ref=e435] [cursor=pointer]:
                    - img [ref=e436]
            - row [ref=e440]:
              - gridcell [ref=e441]:
                - generic [ref=e442]:
                  - button "Open details" [ref=e443] [cursor=pointer]:
                    - img [ref=e444]
                  - button "Edit asset" [ref=e449] [cursor=pointer]:
                    - img [ref=e450]
                  - button "Quick console" [ref=e452] [cursor=pointer]:
                    - img [ref=e453]
                  - button "More actions" [ref=e455] [cursor=pointer]:
                    - img [ref=e456]
            - row [ref=e460]:
              - gridcell [ref=e461]:
                - generic [ref=e462]:
                  - button "Open details" [ref=e463] [cursor=pointer]:
                    - img [ref=e464]
                  - button "Edit asset" [ref=e469] [cursor=pointer]:
                    - img [ref=e470]
                  - button "Quick console" [ref=e472] [cursor=pointer]:
                    - img [ref=e473]
                  - button "More actions" [ref=e475] [cursor=pointer]:
                    - img [ref=e476]
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
    - generic [ref=e480]:
      - generic [ref=e481]:
        - generic [ref=e482]:
          - img [ref=e483]
          - generic [ref=e486]: "YOUR TIME (America/Chicago): 01:18:18"
        - generic [ref=e487]:
          - img [ref=e488]
          - generic [ref=e491]: "SOUTH KOREA (KST): 15:18:18"
      - generic [ref=e492]: VERSION 1.2.6
```

# Test source

```ts
  462 |   const unrelated = event.status === 404 && /favicon\.ico$/i.test(event.url)
  463 |   return {
  464 |     key: `${event.kind}:${event.method}:${event.url}:${event.status}:${event.resourceType || ''}`,
  465 |     routeLabel,
  466 |     sourceType: 'non-ok-response',
  467 |     exactMessage,
  468 |     classification: unrelated ? 'unrelated' : 'blocking',
  469 |     reason: unrelated
  470 |       ? 'Missing favicon response is unrelated to route render and lock eligibility.'
  471 |       : 'Non-OK response remains blocking until proven unrelated.',
  472 |     affectsAssetLockEligibility: !unrelated,
  473 |   }
  474 | }
  475 | 
  476 | const buildClassificationTable = (routeLabel: string, events: RuntimeEvent[]) => {
  477 |   const grouped = new Map<string, ClassificationEntry>()
  478 | 
  479 |   for (const event of events) {
  480 |     const classified = classifyEvent(routeLabel, event)
  481 |     const existing = grouped.get(classified.key)
  482 |     if (existing) {
  483 |       existing.count += 1
  484 |       continue
  485 |     }
  486 |     grouped.set(classified.key, {
  487 |       routeLabel: classified.routeLabel,
  488 |       sourceType: classified.sourceType,
  489 |       exactMessage: classified.exactMessage,
  490 |       count: 1,
  491 |       classification: classified.classification,
  492 |       reason: classified.reason,
  493 |       affectsAssetLockEligibility: classified.affectsAssetLockEligibility,
  494 |     })
  495 |   }
  496 | 
  497 |   return [...grouped.values()]
  498 | }
  499 | 
  500 | const buildEventBuckets = (events: RuntimeEvent[]) => ({
  501 |   consoleWarnings: events.filter((event): event is ConsoleEvent => event.kind === 'console' && event.channel === 'warning').map((event) => event.text),
  502 |   consoleErrors: events.filter((event): event is ConsoleEvent => event.kind === 'console' && event.channel === 'error').map((event) => event.text),
  503 |   pageErrors: events.filter((event): event is PageErrorEvent => event.kind === 'page-error').map((event) => event.text),
  504 |   requestFailures: events.filter((event): event is RequestFailedEvent => event.kind === 'request-failure').map((event) => `${event.method} ${event.url} :: ${event.failureText || 'unknown failure'}`),
  505 |   nonOkResponses: events.filter((event): event is NonOkResponseEvent => event.kind === 'non-ok-response').map((event) => `${event.method} ${event.url} :: ${event.status} ${event.statusText}`),
  506 |   duplicateKeyWarningCount: events.filter((event) => event.kind === 'console' && DUPLICATE_KEY_PATTERN.test(event.text)).length,
  507 |   pageErrorCount: events.filter((event) => event.kind === 'page-error').length,
  508 | })
  509 | 
  510 | const captureAssetContextMenu = async (page: any) => {
  511 |   const attempts: string[] = []
  512 |   const firstRow = page.locator('.ag-center-cols-container .ag-row').first()
  513 |   const interactionCell = firstRow.locator('.ag-cell').nth(2)
  514 |   attempts.push('right-click first visible asset row')
  515 |   const interactionBox = await interactionCell.boundingBox()
  516 |   if (interactionBox) {
  517 |     await page.mouse.click(interactionBox.x + interactionBox.width / 2, interactionBox.y + interactionBox.height / 2, { button: 'right' })
  518 |   }
  519 |   const contextMenu = page.locator('.row-action-menu-container').filter({ has: page.getByText('Row actions') }).first()
  520 |   let opened = await contextMenu.isVisible({ timeout: 5_000 }).catch(() => false)
  521 |   if (!opened) {
  522 |     attempts.push('native right-click did not open menu; click explicit row action trigger')
  523 |     await page.getByTitle('More actions').first().click({ force: true })
  524 |     opened = await contextMenu.isVisible({ timeout: 5_000 }).catch(() => false)
  525 |   }
  526 |   attempts.push(opened ? 'row action menu visible' : 'row action menu not visible')
  527 |   return {
  528 |     verdict: opened ? 'pass' : 'fail',
  529 |     attempts,
  530 |     bounds: toRect(opened ? await contextMenu.boundingBox() : null),
  531 |     details: { opened },
  532 |   } satisfies InteractionProof
  533 | }
  534 | 
  535 | const captureAssetRowClick = async (page: any) => {
  536 |   const attempts: string[] = []
  537 |   const firstRow = page.locator('.ag-center-cols-container .ag-row').first()
  538 |   const interactionCell = firstRow.locator('.ag-cell').nth(2)
  539 |   attempts.push('click first visible asset row')
  540 |   await interactionCell.click({ force: true })
  541 |   const bulkActionsButton = page.getByRole('button', { name: 'Bulk Actions', exact: true })
  542 |   await expect(bulkActionsButton).toBeEnabled({ timeout: 3_000 }).catch(() => {})
  543 |   const selectedRowCount = await page.locator('.ag-row-selected, .ag-row[aria-selected="true"]').count()
  544 |   const bulkActionsEnabled = await bulkActionsButton.isEnabled().catch(() => false)
  545 |   attempts.push(`selectedRowCount=${selectedRowCount}`)
  546 |   attempts.push(`bulkActionsEnabled=${String(bulkActionsEnabled)}`)
  547 |   return {
  548 |     verdict: selectedRowCount > 0 && bulkActionsEnabled ? 'pass' : 'fail',
  549 |     attempts,
  550 |     bounds: toRect(await firstRow.boundingBox()),
  551 |     details: {
  552 |       selectedRowCount,
  553 |       bulkActionsEnabled,
  554 |       selectedText: await interactionCell.textContent(),
  555 |     },
  556 |   } satisfies InteractionProof
  557 | }
  558 | 
  559 | const captureAssetQuickLook = async (page: any) => {
  560 |   const attempts: string[] = []
  561 |   attempts.push('click explicit quick-look trigger')
> 562 |   await page.getByTitle('Open quick look').first().click({ force: true })
      |                                                    ^ Error: locator.click: Test timeout of 240000ms exceeded.
  563 |   const quickLookButton = page.getByRole('button', { name: 'Engage Full Configuration' })
  564 |   const opened = await quickLookButton.isVisible({ timeout: 5_000 }).catch(() => false)
  565 |   attempts.push(opened ? 'quick-look panel visible' : 'quick-look panel not visible')
  566 |   const bounds = opened
  567 |     ? await quickLookButton.evaluate((node) => {
  568 |         const panel = node.closest('.fixed') as HTMLElement | null
  569 |         const rect = panel?.getBoundingClientRect()
  570 |         return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null
  571 |       })
  572 |     : null
  573 |   return {
  574 |     verdict: opened ? 'pass' : 'fail',
  575 |     attempts,
  576 |     bounds: toRect(bounds),
  577 |     details: { opened },
  578 |   } satisfies InteractionProof
  579 | }
  580 | 
  581 | const captureAssetDetails = async (page: any, detailPath: string, recordText: string) => {
  582 |   const attempts: string[] = []
  583 |   attempts.push(`goto ${detailPath}`)
  584 |   await page.goto(detailPath)
  585 |   await expect(page.getByText(recordText).first()).toBeVisible({ timeout: 20_000 })
  586 |   const dialog = page.getByRole('dialog')
  587 |   let opened = await dialog.isVisible({ timeout: 5_000 }).catch(() => false)
  588 |   if (!opened) {
  589 |     attempts.push('detail route did not show dialog; retry via row double-click')
  590 |     await page.goto('/asset')
  591 |     await ensureWorkspaceVisible(page, 'Assets')
  592 |     await fillGridSearch(page, 'Scan asset matrix...', recordText)
  593 |     await page.locator('.ag-center-cols-container .ag-row').first().dblclick()
  594 |     opened = await dialog.isVisible({ timeout: 5_000 }).catch(() => false)
  595 |   }
  596 |   attempts.push(opened ? 'details dialog visible' : 'details dialog not visible')
  597 |   return {
  598 |     verdict: opened ? 'pass' : 'fail',
  599 |     attempts,
  600 |     bounds: toRect(opened ? await dialog.boundingBox() : null),
  601 |     details: { opened },
  602 |   } satisfies InteractionProof
  603 | }
  604 | 
  605 | const captureDirtyStateProof = async (page: any, dirtyValue: string) => {
  606 |   const attempts: string[] = []
  607 |   await page.goto('/asset')
  608 |   await ensureWorkspaceVisible(page, 'Assets')
  609 |   attempts.push('open asset form from canonical /asset toolbar')
  610 |   await clickResilientButton(page, 'Add Asset')
  611 |   const dialog = page.getByRole('dialog')
  612 |   await expect(dialog).toBeVisible({ timeout: 5_000 })
  613 |   const formInput = dialog.locator('input').first()
  614 |   attempts.push('edit first asset form input to create dirty state')
  615 |   await formInput.fill(dirtyValue)
  616 |   attempts.push('press Escape to request close while dirty')
  617 |   await page.keyboard.press('Escape')
  618 |   const dirtyPrompt = page.getByText('Discard Asset Changes?')
  619 |   const guardPresented = await dirtyPrompt.isVisible({ timeout: 5_000 }).catch(() => false)
  620 |   const dialogStillOpen = await dialog.isVisible({ timeout: 5_000 }).catch(() => false)
  621 |   attempts.push(guardPresented ? 'dirty guard prompt visible' : 'dirty guard prompt missing')
  622 |   attempts.push(dialogStillOpen ? 'asset modal remained open while prompt displayed' : 'asset modal closed unexpectedly')
  623 |   return {
  624 |     verdict: guardPresented && dialogStillOpen ? 'pass' : 'fail',
  625 |     attempts,
  626 |     guardPresented,
  627 |     dialogStillOpen,
  628 |     promptBounds: toRect(guardPresented ? await dirtyPrompt.boundingBox() : null),
  629 |     modalBounds: toRect(dialogStillOpen ? await dialog.boundingBox() : null),
  630 |   } satisfies DirtyStateProof
  631 | }
  632 | 
  633 | const attachRouteScopedListeners = (page: any, sink: RuntimeEvent[]) => {
  634 |   const consoleListener = (message: any) => {
  635 |     if (message.type() !== 'warning' && message.type() !== 'error') return
  636 |     const location = message.location?.()
  637 |     sink.push({
  638 |       kind: 'console',
  639 |       channel: message.type(),
  640 |       text: message.text(),
  641 |       source: location?.url ? `${location.url}:${location.lineNumber ?? 0}` : null,
  642 |     })
  643 |   }
  644 |   const pageErrorListener = (error: Error) => {
  645 |     sink.push({
  646 |       kind: 'page-error',
  647 |       text: error.message,
  648 |       source: error.stack?.split('\n')[1]?.trim() ?? null,
  649 |     })
  650 |   }
  651 |   const requestFailedListener = (request: any) => {
  652 |     sink.push({
  653 |       kind: 'request-failure',
  654 |       url: request.url(),
  655 |       method: request.method(),
  656 |       resourceType: request.resourceType?.() ?? null,
  657 |       status: request.response()?.status?.() ?? null,
  658 |       failureText: request.failure()?.errorText ?? null,
  659 |     })
  660 |   }
  661 |   const responseListener = (response: any) => {
  662 |     if (response.ok()) return
```