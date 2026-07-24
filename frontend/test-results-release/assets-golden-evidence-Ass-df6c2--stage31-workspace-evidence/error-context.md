# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assets-golden-evidence.spec.ts >> Assets golden evidence capture >> captures stage31 workspace evidence
- Location: tests/assets-golden-evidence.spec.ts:690:3

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
            - generic [ref=e184]: 13ms
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
              - button "Existing (405)" [ref=e245] [cursor=pointer]
              - button "Purged (2)" [ref=e246] [cursor=pointer]
      - generic [ref=e248]:
        - generic [ref=e249]:
          - generic [ref=e250]:
            - img
            - textbox "Scan asset matrix..." [ref=e251]: PW-ASSET-A-1784873454776-x2fz3w
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
                  - checkbox [checked] [ref=e318]
                  - text: 
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
            - row "Press Space to toggle row selection (checked)  405 PW-ASSET-A-1784873454776-x2fz3w" [selected] [ref=e357]:
              - gridcell "Press Space to toggle row selection (checked) " [ref=e358]:
                - checkbox "Press Space to toggle row selection (checked)" [checked] [ref=e359]
                - text: 
              - gridcell "405" [ref=e360]
              - gridcell "PW-ASSET-A-1784873454776-x2fz3w" [ref=e361]:
                - generic [ref=e362]: PW-ASSET-A-1784873454776-x2fz3w
          - rowgroup [ref=e363]:
            - row "PW-SYS-1784873454776-x2fz3w Physical Maintenance Production Unowned N/A" [selected] [ref=e364]:
              - gridcell "PW-SYS-1784873454776-x2fz3w" [ref=e365]:
                - generic [ref=e366]: PW-SYS-1784873454776-x2fz3w
              - gridcell "Physical" [ref=e367]:
                - generic [ref=e368]: Physical
              - gridcell "Maintenance" [ref=e369]:
                - generic [ref=e371]: Maintenance
              - gridcell "Production" [ref=e372]:
                - generic [ref=e373]: Production
              - gridcell "Unowned" [ref=e374]:
                - generic [ref=e375]: Unowned
              - gridcell "N/A" [ref=e376]:
                - generic [ref=e377]: N/A
          - rowgroup [ref=e378]:
            - row [selected] [ref=e379]:
              - gridcell [ref=e380]:
                - generic [ref=e381]:
                  - button "Open details" [ref=e382] [cursor=pointer]:
                    - img [ref=e383]
                  - button "Edit asset" [ref=e388] [cursor=pointer]:
                    - img [ref=e389]
                  - button "Quick console" [ref=e391] [cursor=pointer]:
                    - img [ref=e392]
                  - button "More actions" [active] [ref=e394] [cursor=pointer]:
                    - img [ref=e395]
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
    - generic [ref=e399]:
      - generic [ref=e400]:
        - generic [ref=e401]:
          - img [ref=e402]
          - generic [ref=e405]: "YOUR TIME (America/Chicago): 01:13:54"
        - generic [ref=e406]:
          - img [ref=e407]
          - generic [ref=e410]: "SOUTH KOREA (KST): 15:13:54"
      - generic [ref=e411]: VERSION 1.2.6
```

# Test source

```ts
  543 |   await page.goto(detailPath)
  544 |   await expect(page.getByText(recordText).first()).toBeVisible({ timeout: 20_000 })
  545 |   const dialog = page.getByRole('dialog')
  546 |   if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
  547 |     note('dialog visible after direct detail route')
  548 |     return attempts
  549 |   }
  550 |   note('dialog not visible after direct detail route')
  551 | 
  552 |   if (routeKey === 'asset') {
  553 |     note('goto /asset')
  554 |     await page.goto('/asset')
  555 |     await fillGridSearch(page, 'Scan asset matrix...', recordText)
  556 |     note(`fill search Scan asset matrix... => ${recordText}`)
  557 |     const moreActions = page.getByTitle('More actions').first()
  558 |     if (await moreActions.isVisible({ timeout: 5_000 }).catch(() => false)) {
  559 |       note('click [title="More actions"]')
  560 |       await moreActions.click({ force: true })
  561 |       const viewDetails = page.locator('.row-action-menu-container').filter({ has: page.getByText('Row actions') }).getByRole('button', { name: 'View Details' }).first()
  562 |       if (await viewDetails.isVisible({ timeout: 5_000 }).catch(() => false)) {
  563 |         note('click button(View Details)')
  564 |         await viewDetails.click({ force: true })
  565 |       } else {
  566 |         note('button(View Details) not visible after row actions open')
  567 |       }
  568 |     } else {
  569 |       note('[title="More actions"] not visible on /asset')
  570 |     }
  571 |   } else if (routeKey === 'monitoring') {
  572 |     note('goto /monitoring')
  573 |     await page.goto('/monitoring')
  574 |     await fillGridSearch(page, 'Scan matrix...', recordText)
  575 |     note(`fill search Scan matrix... => ${recordText}`)
  576 |     const viewDetails = page.getByTitle('View Details').first()
  577 |     if (await viewDetails.isVisible({ timeout: 5_000 }).catch(() => false)) {
  578 |       note('click [title="View Details"]')
  579 |       await viewDetails.click({ force: true })
  580 |     } else {
  581 |       note('[title="View Details"] not visible on /monitoring')
  582 |     }
  583 |   }
  584 | 
  585 |   if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
  586 |     note('dialog visible after interactive attempts')
  587 |   } else {
  588 |     note('dialog still not visible after interactive attempts')
  589 |   }
  590 | 
  591 |   return attempts
  592 | }
  593 | 
  594 | const captureAssetInteractionProofs = async (page: any, recordText: string) => {
  595 |   const rowClickAttempts: string[] = []
  596 |   const contextMenuAttempts: string[] = []
  597 |   const quickLookAttempts: string[] = []
  598 | 
  599 |   await page.goto('/asset')
  600 |   await ensureWorkspaceVisible(page, 'Assets')
  601 |   await fillGridSearch(page, 'Scan asset matrix...', recordText)
  602 |   await expect(page.locator('[role="treegrid"]')).toContainText(recordText, { timeout: 20_000 })
  603 | 
  604 |   const firstRow = page.locator('.ag-center-cols-container .ag-row').first()
  605 |   const interactionCell = firstRow.locator('.ag-cell').nth(2)
  606 |   rowClickAttempts.push('click first visible asset row system cell')
  607 |   await interactionCell.click({ force: true })
  608 | 
  609 |   const bulkActionsButton = page.getByRole('button', { name: 'Bulk Actions', exact: true })
  610 |   await expect(bulkActionsButton).toBeEnabled({ timeout: 3_000 }).catch(() => {})
  611 |   const rowClickProof = {
  612 |     selectedRowCount: await page.locator('.ag-row-selected, .ag-row[aria-selected="true"]').count(),
  613 |     selectedText: await interactionCell.textContent(),
  614 |     bulkActionsEnabled: await bulkActionsButton.isEnabled(),
  615 |   }
  616 | 
  617 |   contextMenuAttempts.push('right-click first visible asset row')
  618 |   const interactionBox = await interactionCell.boundingBox()
  619 |   if (interactionBox) {
  620 |     await page.mouse.click(
  621 |       interactionBox.x + interactionBox.width / 2,
  622 |       interactionBox.y + interactionBox.height / 2,
  623 |       { button: 'right' }
  624 |     )
  625 |   }
  626 |   const contextMenu = page.locator('.row-action-menu-container').filter({ has: page.getByText('Row actions') }).first()
  627 |   let contextMenuVisible = await contextMenu.isVisible({ timeout: 5_000 }).catch(() => false)
  628 |   if (!contextMenuVisible) {
  629 |     contextMenuAttempts.push('native right click did not open menu; click explicit row action trigger')
  630 |     await page.getByTitle('More actions').first().click({ force: true })
  631 |     contextMenuVisible = await contextMenu.isVisible({ timeout: 5_000 }).catch(() => false)
  632 |   }
  633 |   const contextMenuBox = contextMenuVisible ? await contextMenu.boundingBox() : null
  634 | 
  635 |   if (contextMenuVisible) {
  636 |     contextMenuAttempts.push('row action menu visible')
  637 |     await page.keyboard.press('Escape').catch(() => {})
  638 |   } else {
  639 |     contextMenuAttempts.push('row action menu did not open after native or explicit menu trigger')
  640 |   }
  641 | 
  642 |   quickLookAttempts.push('click explicit quick-look trigger')
> 643 |   await page.getByTitle('Open quick look').first().click({ force: true })
      |                                                    ^ Error: locator.click: Test timeout of 180000ms exceeded.
  644 |   const quickLookButton = page.getByRole('button', { name: 'Engage Full Configuration' })
  645 |   const quickLookVisible = await quickLookButton.isVisible({ timeout: 5_000 }).catch(() => false)
  646 |   const quickLookBox = quickLookVisible
  647 |     ? await quickLookButton.evaluate((node) => {
  648 |         const panel = node.closest('.fixed') as HTMLElement | null
  649 |         const rect = panel?.getBoundingClientRect()
  650 |         return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null
  651 |       })
  652 |     : null
  653 | 
  654 |   if (quickLookVisible) {
  655 |     quickLookAttempts.push('quick look panel visible after explicit quick-look trigger')
  656 |     await page.keyboard.press('Escape').catch(() => {})
  657 |   } else {
  658 |     quickLookAttempts.push('quick look panel did not open after explicit quick-look trigger')
  659 |   }
  660 | 
  661 |   return {
  662 |     rowClickProof: {
  663 |       ...rowClickProof,
  664 |       attempts: rowClickAttempts,
  665 |     },
  666 |     contextMenuProof: {
  667 |       opened: contextMenuVisible,
  668 |       attempts: contextMenuAttempts,
  669 |       bounds: contextMenuBox ? {
  670 |         x: Math.round(contextMenuBox.x),
  671 |         y: Math.round(contextMenuBox.y),
  672 |         width: Math.round(contextMenuBox.width),
  673 |         height: Math.round(contextMenuBox.height),
  674 |       } : null,
  675 |     },
  676 |     quickLookProof: {
  677 |       opened: quickLookVisible,
  678 |       attempts: quickLookAttempts,
  679 |       bounds: quickLookBox ? {
  680 |         x: Math.round(quickLookBox.x),
  681 |         y: Math.round(quickLookBox.y),
  682 |         width: Math.round(quickLookBox.width),
  683 |         height: Math.round(quickLookBox.height),
  684 |       } : null,
  685 |     },
  686 |   }
  687 | }
  688 | 
  689 | test.describe('Assets golden evidence capture', () => {
  690 |   test('captures stage31 workspace evidence', async ({ page, sysApi: request }) => {
  691 |     test.setTimeout(180_000)
  692 |     await fs.rm(CAPTURE_DIR, { recursive: true, force: true })
  693 |     await fs.mkdir(CAPTURE_DIR, { recursive: true })
  694 | 
  695 |     await resetBrowserState(page)
  696 |     const seeded = await seedOperationalScenario(request)
  697 | 
  698 |     const routeConfigs: Array<{
  699 |       routeKey: RouteKey
  700 |       requestedPath: string
  701 |       heading: string
  702 |       searchPlaceholder: string
  703 |       recordText: string
  704 |       searchValue: string
  705 |       detailPath: string
  706 |       redirectOnly?: boolean
  707 |     }> = [
  708 |       {
  709 |         routeKey: 'asset',
  710 |         requestedPath: '/asset',
  711 |         heading: 'Assets',
  712 |         searchPlaceholder: 'Scan asset matrix...',
  713 |         recordText: seeded.primary.name,
  714 |         searchValue: seeded.systemName,
  715 |         detailPath: `/asset?id=${seeded.primary.id}&search=${encodeURIComponent(seeded.primary.name)}&status=${encodeURIComponent(seeded.primary.status)}`,
  716 |       },
  717 |       {
  718 |         routeKey: 'monitoring',
  719 |         requestedPath: '/monitoring',
  720 |         heading: 'Monitoring',
  721 |         searchPlaceholder: 'Scan matrix...',
  722 |         recordText: seeded.monitoring.title,
  723 |         searchValue: seeded.monitoring.title,
  724 |         detailPath: `/monitoring?id=${seeded.monitoring.id}`,
  725 |       },
  726 |       {
  727 |         routeKey: 'asset-real',
  728 |         requestedPath: '/asset-real',
  729 |         heading: 'Assets',
  730 |         searchPlaceholder: 'Scan asset matrix...',
  731 |         recordText: seeded.primary.name,
  732 |         searchValue: seeded.primary.name,
  733 |         detailPath: `/asset?id=${seeded.primary.id}&search=${encodeURIComponent(seeded.primary.name)}&status=${encodeURIComponent(seeded.primary.status)}`,
  734 |         redirectOnly: true,
  735 |       },
  736 |     ]
  737 | 
  738 |     const viewportConfigs: Array<{
  739 |       viewportKey: ViewportKey
  740 |       viewport: { width: number; height: number }
  741 |       screenshotType: ScreenshotType
  742 |     }> = [
  743 |       {
```