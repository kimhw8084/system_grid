# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assets-stage35-evidence.spec.ts >> Assets Stage 35 evidence capture >> captures stage35 lock-proof evidence
- Location: tests/assets-stage35-evidence.spec.ts:709:3

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
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
            - generic [ref=e184]: 12ms
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
              - button "Existing (417)" [ref=e245] [cursor=pointer]
              - button "Purged (2)" [ref=e246] [cursor=pointer]
      - generic [ref=e248]:
        - generic [ref=e249]:
          - generic [ref=e250]:
            - img
            - textbox "Scan asset matrix..." [active] [ref=e251]: PW-SYS-1784874083118-l7n381
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
          - button "Bulk Actions" [disabled] [ref=e303]:
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
                  - checkbox [ref=e318]
                  - text: 
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
            - row "Press Space to toggle row selection (unchecked)  417 PW-ASSET-A-1784874083118-l7n381" [ref=e357]:
              - gridcell "Press Space to toggle row selection (unchecked) " [ref=e358]:
                - checkbox "Press Space to toggle row selection (unchecked)" [ref=e359]
                - text: 
              - gridcell "417" [ref=e360]
              - gridcell "PW-ASSET-A-1784874083118-l7n381" [ref=e361]:
                - generic [ref=e362]: PW-ASSET-A-1784874083118-l7n381
            - row "Press Space to toggle row selection (unchecked)  418 PW-ASSET-B-1784874083118-l7n381" [ref=e363]:
              - gridcell "Press Space to toggle row selection (unchecked) " [ref=e364]:
                - checkbox "Press Space to toggle row selection (unchecked)" [ref=e365]
                - text: 
              - gridcell "418" [ref=e366]
              - gridcell "PW-ASSET-B-1784874083118-l7n381" [ref=e367]:
                - generic [ref=e368]: PW-ASSET-B-1784874083118-l7n381
            - row "Press Space to toggle row selection (unchecked)  419 PW-ASSET-C-1784874083118-l7n381" [ref=e369]:
              - gridcell "Press Space to toggle row selection (unchecked) " [ref=e370]:
                - checkbox "Press Space to toggle row selection (unchecked)" [ref=e371]
                - text: 
              - gridcell "419" [ref=e372]
              - gridcell "PW-ASSET-C-1784874083118-l7n381" [ref=e373]:
                - generic [ref=e374]: PW-ASSET-C-1784874083118-l7n381
          - rowgroup [ref=e375]:
            - row "PW-SYS-1784874083118-l7n381 Physical Maintenance Production Unowned N/A" [ref=e376]:
              - gridcell "PW-SYS-1784874083118-l7n381" [ref=e377]:
                - generic [ref=e378]: PW-SYS-1784874083118-l7n381
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
            - row "PW-SYS-1784874083118-l7n381 Physical Active DR admin_root N/A" [ref=e390]:
              - gridcell "PW-SYS-1784874083118-l7n381" [ref=e391]:
                - generic [ref=e392]: PW-SYS-1784874083118-l7n381
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
            - row "PW-SYS-1784874083118-l7n381 Physical Active Prod admin_root N/A" [ref=e404]:
              - gridcell "PW-SYS-1784874083118-l7n381" [ref=e405]:
                - generic [ref=e406]: PW-SYS-1784874083118-l7n381
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
            - row [ref=e419]:
              - gridcell [ref=e420]:
                - generic [ref=e421]:
                  - button "Open details" [ref=e422] [cursor=pointer]:
                    - img [ref=e423]
                  - button "Edit asset" [ref=e428] [cursor=pointer]:
                    - img [ref=e429]
                  - button "Quick console" [ref=e431] [cursor=pointer]:
                    - img [ref=e432]
                  - button "More actions" [ref=e434] [cursor=pointer]:
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
          - generic [ref=e485]: "YOUR TIME (America/Chicago): 01:24:23"
        - generic [ref=e486]:
          - img [ref=e487]
          - generic [ref=e490]: "SOUTH KOREA (KST): 15:24:23"
      - generic [ref=e491]: VERSION 1.2.6
```

# Test source

```ts
  472 |       ? 'Missing favicon response is unrelated to route render and lock eligibility.'
  473 |       : 'Non-OK response remains blocking until proven unrelated.',
  474 |     affectsAssetLockEligibility: !unrelated,
  475 |   }
  476 | }
  477 | 
  478 | const buildClassificationTable = (routeLabel: string, events: RuntimeEvent[]) => {
  479 |   const grouped = new Map<string, ClassificationEntry>()
  480 | 
  481 |   for (const event of events) {
  482 |     const classified = classifyEvent(routeLabel, event)
  483 |     const existing = grouped.get(classified.key)
  484 |     if (existing) {
  485 |       existing.count += 1
  486 |       continue
  487 |     }
  488 |     grouped.set(classified.key, {
  489 |       routeLabel: classified.routeLabel,
  490 |       sourceType: classified.sourceType,
  491 |       exactMessage: classified.exactMessage,
  492 |       count: 1,
  493 |       classification: classified.classification,
  494 |       reason: classified.reason,
  495 |       affectsAssetLockEligibility: classified.affectsAssetLockEligibility,
  496 |     })
  497 |   }
  498 | 
  499 |   return [...grouped.values()]
  500 | }
  501 | 
  502 | const buildEventBuckets = (events: RuntimeEvent[]) => ({
  503 |   consoleWarnings: events.filter((event): event is ConsoleEvent => event.kind === 'console' && event.channel === 'warning').map((event) => event.text),
  504 |   consoleErrors: events.filter((event): event is ConsoleEvent => event.kind === 'console' && event.channel === 'error').map((event) => event.text),
  505 |   pageErrors: events.filter((event): event is PageErrorEvent => event.kind === 'page-error').map((event) => event.text),
  506 |   requestFailures: events.filter((event): event is RequestFailedEvent => event.kind === 'request-failure').map((event) => `${event.method} ${event.url} :: ${event.failureText || 'unknown failure'}`),
  507 |   nonOkResponses: events.filter((event): event is NonOkResponseEvent => event.kind === 'non-ok-response').map((event) => `${event.method} ${event.url} :: ${event.status} ${event.statusText}`),
  508 |   duplicateKeyWarningCount: events.filter((event) => event.kind === 'console' && DUPLICATE_KEY_PATTERN.test(event.text)).length,
  509 |   pageErrorCount: events.filter((event) => event.kind === 'page-error').length,
  510 | })
  511 | 
  512 | const captureAssetContextMenu = async (page: any) => {
  513 |   const attempts: string[] = []
  514 |   console.log(`[Interaction] Starting context menu capture`)
  515 |   const firstRow = page.locator('.ag-center-cols-container .ag-row').first()
  516 |   const interactionCell = firstRow.locator('.ag-cell').nth(2)
  517 |   attempts.push('right-click first visible asset row')
  518 |   const interactionBox = await interactionCell.boundingBox()
  519 |   if (interactionBox) {
  520 |     await page.mouse.click(interactionBox.x + interactionBox.width / 2, interactionBox.y + interactionBox.height / 2, { button: 'right' })
  521 |   }
  522 |   const contextMenu = page.locator('.row-action-menu-container').filter({ has: page.getByText('Row actions') }).first()
  523 |   let opened = await contextMenu.isVisible({ timeout: 3_000 }).catch(() => false)
  524 |   if (!opened) {
  525 |     attempts.push('native right-click did not open menu; click explicit row action trigger')
  526 |     await page.getByTitle('More actions').first().click({ force: true })
  527 |     opened = await contextMenu.isVisible({ timeout: 3_000 }).catch(() => false)
  528 |   }
  529 |   attempts.push(opened ? 'row action menu visible' : 'row action menu not visible')
  530 |   console.log(`[Interaction] Context menu result: ${opened ? 'pass' : 'fail'}`)
  531 |   return {
  532 |     verdict: opened ? 'pass' : 'fail',
  533 |     attempts,
  534 |     bounds: toRect(opened ? await contextMenu.boundingBox() : null),
  535 |     details: { opened },
  536 |   } satisfies InteractionProof
  537 | }
  538 | 
  539 | const captureAssetRowClick = async (page: any) => {
  540 |   const attempts: string[] = []
  541 |   console.log(`[Interaction] Starting row click capture`)
  542 |   const firstRow = page.locator('.ag-center-cols-container .ag-row').first()
  543 |   const interactionCell = firstRow.locator('.ag-cell').nth(2)
  544 |   attempts.push('click first visible asset row')
  545 |   await interactionCell.click({ force: true })
  546 |   
  547 |   await page.waitForTimeout(500)
  548 |   
  549 |   const selectedRowCount = await page.locator('.ag-row-selected, .ag-row[aria-selected="true"]').count()
  550 |   attempts.push(`selectedRowCount=${selectedRowCount}`)
  551 |   
  552 |   const quickLookButton = page.getByRole('button', { name: 'Engage Full Configuration' })
  553 |   const isQuickLookVisible = await quickLookButton.isVisible().catch(() => false)
  554 |   attempts.push(`isQuickLookVisible=${isQuickLookVisible}`)
  555 |   
  556 |   console.log(`[Interaction] Row click result: selectedCount=${selectedRowCount}, isQuickLookVisible=${isQuickLookVisible}`)
  557 |   return {
  558 |     verdict: (selectedRowCount > 0 && !isQuickLookVisible) ? 'pass' : 'fail',
  559 |     attempts,
  560 |     bounds: toRect(await firstRow.boundingBox()),
  561 |     details: {
  562 |       selectedRowCount,
  563 |       isQuickLookVisible,
  564 |     },
  565 |   } satisfies InteractionProof
  566 | }
  567 | 
  568 | const captureAssetQuickLook = async (page: any) => {
  569 |   const attempts: string[] = []
  570 |   console.log(`[Interaction] Starting quick-look panel capture`)
  571 |   attempts.push('click explicit quick-look trigger')
> 572 |   await page.getByTitle('Open quick look').first().click({ force: true })
      |                                                    ^ Error: locator.click: Test timeout of 180000ms exceeded.
  573 |   const quickLookButton = page.getByRole('button', { name: 'Engage Full Configuration' })
  574 |   const opened = await quickLookButton.isVisible({ timeout: 5_000 }).catch(() => false)
  575 |   attempts.push(opened ? 'quick-look panel visible' : 'quick-look panel not visible')
  576 |   const bounds = opened
  577 |     ? await quickLookButton.evaluate((node) => {
  578 |         const panel = node.closest('.fixed') as HTMLElement | null
  579 |         const rect = panel?.getBoundingClientRect()
  580 |         return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null
  581 |       })
  582 |     : null
  583 |   console.log(`[Interaction] Quick look result: ${opened ? 'pass' : 'fail'}`)
  584 |   return {
  585 |     verdict: opened ? 'pass' : 'fail',
  586 |     attempts,
  587 |     bounds: toRect(bounds),
  588 |     details: { opened },
  589 |   } satisfies InteractionProof
  590 | }
  591 | 
  592 | const captureAssetDetails = async (page: any, detailPath: string, recordText: string) => {
  593 |   const attempts: string[] = []
  594 |   console.log(`[Interaction] Starting details modal capture`)
  595 |   attempts.push(`goto ${detailPath}`)
  596 |   await page.goto(detailPath)
  597 |   await expect(page.getByText(recordText).first()).toBeVisible({ timeout: 20_000 })
  598 |   const dialog = page.getByRole('dialog')
  599 |   let opened = await dialog.isVisible({ timeout: 5_000 }).catch(() => false)
  600 |   if (!opened) {
  601 |     attempts.push('detail route did not show dialog; retry via row double-click')
  602 |     await page.goto('/asset')
  603 |     await ensureWorkspaceVisible(page, 'Assets')
  604 |     await fillGridSearch(page, 'Scan asset matrix...', recordText)
  605 |     await page.locator('.ag-center-cols-container .ag-row').first().dblclick()
  606 |     opened = await dialog.isVisible({ timeout: 5_000 }).catch(() => false)
  607 |   }
  608 |   attempts.push(opened ? 'details dialog visible' : 'details dialog not visible')
  609 |   console.log(`[Interaction] Details dialog result: ${opened ? 'pass' : 'fail'}`)
  610 |   return {
  611 |     verdict: opened ? 'pass' : 'fail',
  612 |     attempts,
  613 |     bounds: toRect(opened ? await dialog.boundingBox() : null),
  614 |     details: { opened },
  615 |   } satisfies InteractionProof
  616 | }
  617 | 
  618 | const captureDirtyStateProof = async (page: any, dirtyValue: string) => {
  619 |   const attempts: string[] = []
  620 |   console.log(`[Interaction] Starting dirty state behavior capture`)
  621 |   await page.goto('/asset')
  622 |   await ensureWorkspaceVisible(page, 'Assets')
  623 |   attempts.push('open asset form from canonical /asset toolbar')
  624 |   await clickResilientButton(page, 'Register Asset')
  625 |   const dialog = page.getByRole('dialog')
  626 |   await expect(dialog).toBeVisible({ timeout: 5_000 })
  627 |   const formInput = dialog.locator('input').first()
  628 |   attempts.push('edit first asset form input to create dirty state')
  629 |   await formInput.fill(dirtyValue)
  630 |   attempts.push('press Escape to request close while dirty')
  631 |   await page.keyboard.press('Escape')
  632 |   const dirtyPrompt = page.getByText('Discard Asset Changes?')
  633 |   const guardPresented = await dirtyPrompt.isVisible({ timeout: 5_000 }).catch(() => false)
  634 |   const dialogStillOpen = await dialog.isVisible({ timeout: 5_000 }).catch(() => false)
  635 |   attempts.push(guardPresented ? 'dirty guard prompt visible' : 'dirty guard prompt missing')
  636 |   attempts.push(dialogStillOpen ? 'asset modal remained open while prompt displayed' : 'asset modal closed unexpectedly')
  637 |   console.log(`[Interaction] Dirty state guard result: guardPresented=${guardPresented}, modalStillOpen=${dialogStillOpen}`)
  638 |   return {
  639 |     verdict: guardPresented && dialogStillOpen ? 'pass' : 'fail',
  640 |     attempts,
  641 |     guardPresented,
  642 |     dialogStillOpen,
  643 |     promptBounds: toRect(guardPresented ? await dirtyPrompt.boundingBox() : null),
  644 |     modalBounds: toRect(dialogStillOpen ? await dialog.boundingBox() : null),
  645 |   } satisfies DirtyStateProof
  646 | }
  647 | 
  648 | const attachRouteScopedListeners = (page: any, sink: RuntimeEvent[]) => {
  649 |   const consoleListener = (message: any) => {
  650 |     if (message.type() !== 'warning' && message.type() !== 'error') return
  651 |     const location = message.location?.()
  652 |     sink.push({
  653 |       kind: 'console',
  654 |       channel: message.type(),
  655 |       text: message.text(),
  656 |       source: location?.url ? `${location.url}:${location.lineNumber ?? 0}` : null,
  657 |     })
  658 |   }
  659 |   const pageErrorListener = (error: Error) => {
  660 |     sink.push({
  661 |       kind: 'page-error',
  662 |       text: error.message,
  663 |       source: error.stack?.split('\n')[1]?.trim() ?? null,
  664 |     })
  665 |   }
  666 |   const requestFailedListener = (request: any) => {
  667 |     sink.push({
  668 |       kind: 'request-failure',
  669 |       url: request.url(),
  670 |       method: request.method(),
  671 |       resourceType: request.resourceType?.() ?? null,
  672 |       status: request.response()?.status?.() ?? null,
```