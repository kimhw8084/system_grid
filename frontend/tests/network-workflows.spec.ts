import {
  clickResilientButton,
  getColumnWidth,
  isColumnVisible,
  expectColumnRenderedWidth,
  expectHeaderBodyAligned,
  expectNoBrokenGridOverflow,
  expectMenuAnchoredNearTrigger,
  getGridHeaderBox,
  getGridCellBox,
  createAsset,
  createConnection,
  ensureSettingOption,
  resetBrowserState,
  getPrimaryGrid,
} from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';

test.describe('Network workflows', () => {
  test('supports deep-linked forensics, unit edits, and bulk sever from the grid', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    await page.setViewportSize({ width: 1920, height: 1080 })
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const farm = `PW-NET-${stamp}`
    await ensureSettingOption(request, 'NetworkFarm', farm)

    const source = await createAsset(request, {
      name: `PW-NET-SRC-${stamp}`,
      system: `PW-NET-SYS-${stamp}`,
      status: 'Active',
      model: 'R650',
      type: 'Physical',
      serial_number: `PW-NET-SRC-SN-${stamp}`,
      asset_tag: `PW-NET-SRC-AT-${stamp}`,
      owner: 'net-owner',
      business_unit: 'Operations'
    })
    const peerA = await createAsset(request, {
      name: `PW-NET-PEER-A-${stamp}`,
      system: `PW-NET-SYS-${stamp}`,
      status: 'Active',
      model: 'R650',
      type: 'Physical',
      serial_number: `PW-NET-PEER-A-SN-${stamp}`,
      asset_tag: `PW-NET-PEER-A-AT-${stamp}`,
      owner: 'net-owner',
      business_unit: 'Operations'
    })
    const peerB = await createAsset(request, {
      name: `PW-NET-PEER-B-${stamp}`,
      system: `PW-NET-SYS-${stamp}`,
      status: 'Active',
      model: 'R650',
      type: 'Physical',
      serial_number: `PW-NET-PEER-B-SN-${stamp}`,
      asset_tag: `PW-NET-PEER-B-AT-${stamp}`,
      owner: 'net-owner',
      business_unit: 'Operations'
    })

    const connA = await createConnection(request, {
      device_a_id: source.id,
      source_port: 'eth0',
      device_b_id: peerA.id,
      target_port: 'eth1',
      link_type: 'Data',
      speed_gbps: 10,
      unit: 'Gbps',
      status: 'Active',
      farm
    })
    await createConnection(request, {
      device_a_id: source.id,
      source_port: 'eth2',
      device_b_id: peerB.id,
      target_port: 'eth3',
      link_type: 'Management',
      speed_gbps: 1,
      unit: 'Gbps',
      status: 'Planned',
      farm
    })

    await page.goto(`/network?id=${connA.id}`)
    await expect(page.getByRole('heading', { name: 'Connection Forensics' })).toBeVisible()
    await expect(page.getByText(source.name).first()).toBeVisible()
    await clickResilientButton(page, 'Edit Connection')
    await expect(page.getByText('Edit Network Connection')).toBeVisible()
    const editModal = page.locator('.glass-panel').filter({ has: page.getByText('Edit Network Connection') })
    await editModal.locator('input[type="number"]').nth(2).fill('100')
    await editModal.getByRole('button', { name: 'Gbps' }).first().click()
    
    const mbpsButton = page.getByRole('button', { name: 'Mbps', exact: true })
    await expect(mbpsButton).toBeVisible({ timeout: 5000 })
    await mbpsButton.click()
    
    await clickResilientButton(page, 'Save Connection')
    await expect(page.getByText('Edit Network Connection')).not.toBeVisible()
    await page.goto(`/network?id=${connA.id}`)
    await expect(page.getByText('100.0 Mbps').first()).toBeVisible()
    await page.goto('/network')
    await expect(page.getByText('Scanning network matrix...')).not.toBeVisible({ timeout: 15000 })
    await page.getByPlaceholder('Scan matrix...').fill(farm)
    const rows = page.locator('.ag-center-cols-container .ag-row')
    await expect(rows).toHaveCount(2, { timeout: 15000 })
    const pinnedRows = page.locator('.ag-pinned-left-cols-container .ag-row')
    await pinnedRows.nth(0).locator('.ag-selection-checkbox').first().click()
    await expect(pinnedRows.nth(0)).toHaveClass(/ag-row-selected/)
    await pinnedRows.nth(1).locator('.ag-selection-checkbox').first().click()
    await expect(pinnedRows.nth(1)).toHaveClass(/ag-row-selected/)
    
    const bulkTrigger = page.getByRole('button', { name: 'Bulk Actions' })
    await bulkTrigger.click()
    const bulkMenu = page.locator('.bulk-menu-container')
    await expect(bulkMenu).toBeVisible({ timeout: 5000 })
    
    // Assert bulk menu anchoring geometry near its trigger
    await expectMenuAnchoredNearTrigger(page, bulkTrigger, bulkMenu)

    const deactBtn = bulkMenu.getByText('De-activate Selection').first()
    await expect(deactBtn).toBeVisible({ timeout: 5000 })
    await deactBtn.click({ force: true })

    const confirmBtn = page.getByRole('button', { name: 'Confirm De-activation?' }).first()
    await expect(confirmBtn).toBeVisible({ timeout: 5000 })
    await confirmBtn.click({ force: true })
    await expect(page.locator('[role="treegrid"]')).not.toContainText(farm, { timeout: 30000 })
  })

  test('supports manual selection, modifiers, menu overlays, display configurations, and grouped grid parity', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    await page.setViewportSize({ width: 1920, height: 1080 })
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const farm = `PW-NET-MANUAL-${stamp}`
    await ensureSettingOption(request, 'NetworkFarm', farm)

    const source = await createAsset(request, {
      name: `PW-MAN-SRC-${stamp}`,
      system: `PW-MAN-SYS-${stamp}`,
      status: 'Active',
      model: 'R650',
      type: 'Physical',
      serial_number: `PW-MAN-SRC-SN-${stamp}`,
      asset_tag: `PW-MAN-SRC-AT-${stamp}`,
      owner: 'net-owner',
      business_unit: 'Operations'
    })
    const peerA = await createAsset(request, {
      name: `PW-MAN-PEER-A-${stamp}`,
      system: `PW-MAN-SYS-${stamp}`,
      status: 'Active',
      model: 'R650',
      type: 'Physical',
      serial_number: `PW-MAN-PEER-A-SN-${stamp}`,
      asset_tag: `PW-MAN-PEER-A-AT-${stamp}`,
      owner: 'net-owner',
      business_unit: 'Operations'
    })
    const peerB = await createAsset(request, {
      name: `PW-MAN-PEER-B-${stamp}`,
      system: `PW-MAN-SYS-${stamp}`,
      status: 'Active',
      model: 'R650',
      type: 'Physical',
      serial_number: `PW-MAN-PEER-B-SN-${stamp}`,
      asset_tag: `PW-MAN-PEER-B-AT-${stamp}`,
      owner: 'net-owner',
      business_unit: 'Operations'
    })

    const connA = await createConnection(request, {
      device_a_id: source.id,
      source_port: 'eth0',
      device_b_id: peerA.id,
      target_port: 'eth1',
      link_type: 'Data',
      speed_gbps: 10,
      unit: 'Gbps',
      status: 'Active',
      farm
    })
    const connB = await createConnection(request, {
      device_a_id: source.id,
      source_port: 'eth2',
      device_b_id: peerB.id,
      target_port: 'eth3',
      link_type: 'Management',
      speed_gbps: 1,
      unit: 'Gbps',
      status: 'Planned',
      farm
    })
    const connC = await createConnection(request, {
      device_a_id: source.id,
      source_port: 'eth4',
      device_b_id: peerB.id,
      target_port: 'eth5',
      link_type: 'Backup',
      speed_gbps: 5,
      unit: 'Gbps',
      status: 'Maintenance',
      farm
    })

    // 1. Verify Deep-linked route opens detail modal with visible dynamic identity
    await page.goto(`/network?id=${connA.id}`)
    await expect(page.getByRole('heading', { name: 'Connection Forensics' })).toBeVisible()
    const expectedTitle = `${source.name}:eth0 ↔ ${peerA.name}:eth1`
    await expect(page.getByRole('heading', { name: expectedTitle })).toBeVisible()
    
    // Close the detail modal via footer close button
    await clickResilientButton(page, 'Close')
    await expect(page.getByRole('heading', { name: 'Connection Forensics' })).not.toBeVisible()

    // 2. Load the network grid
    await page.goto('/network')
    await expect(page.getByText('Scanning network matrix...')).not.toBeVisible({ timeout: 15000 })
    await page.getByPlaceholder('Scan matrix...').fill(farm)

    const rows = page.locator('.ag-center-cols-container .ag-row')
    await expect(rows).toHaveCount(3, { timeout: 15000 })

    // 3. Prove manual normal row selection (single click)
    await rows.nth(0).locator('.ag-cell').first().click()
    await expect(rows.nth(0)).toHaveClass(/ag-row-selected/)
    await expect(rows.nth(1)).not.toHaveClass(/ag-row-selected/)
    await expect(rows.nth(2)).not.toHaveClass(/ag-row-selected/)

    // 4. Prove Ctrl/Cmd toggle selection
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await rows.nth(1).locator('.ag-cell').first().click({ modifiers: [modifier] })
    await expect(rows.nth(0)).toHaveClass(/ag-row-selected/)
    await expect(rows.nth(1)).toHaveClass(/ag-row-selected/)
    await expect(rows.nth(2)).not.toHaveClass(/ag-row-selected/)

    // 5. Prove Shift range selection
    // Single click on Row 0 first to clear other selections
    await rows.nth(0).locator('.ag-cell').first().click()
    await expect(rows.nth(0)).toHaveClass(/ag-row-selected/)
    await expect(rows.nth(1)).not.toHaveClass(/ag-row-selected/)
    await expect(rows.nth(2)).not.toHaveClass(/ag-row-selected/)

    // Shift-click Row 2
    await rows.nth(2).locator('.ag-cell').first().click({ modifiers: ['Shift'] })
    await expect(rows.nth(0)).toHaveClass(/ag-row-selected/)
    await expect(rows.nth(1)).toHaveClass(/ag-row-selected/)
    await expect(rows.nth(2)).toHaveClass(/ag-row-selected/)

    // 6. Prove bulk menu enables after selection
    const bulkTrigger = page.getByRole('button', { name: 'Bulk Actions' })
    await bulkTrigger.click()
    const bulkMenu = page.locator('.bulk-menu-container')
    await expect(bulkMenu).toBeVisible({ timeout: 5000 })
    
    // Assert bulk menu is anchored near its trigger
    await expectMenuAnchoredNearTrigger(page, bulkTrigger, bulkMenu)

    // Close the bulk menu by pressing Escape to avoid pointer interception
    await page.keyboard.press('Escape')
    await expect(bulkMenu).not.toBeVisible()

    // 7. Prove row action menu opens from a row
    const rowActionTrigger = page.locator('.row-action-trigger').first()
    await rowActionTrigger.click()
    const rowActionMenu = page.locator('div.row-action-menu-container')
    await expect(rowActionMenu).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Row actions')).toBeVisible()

    // Assert row action menu is anchored near its trigger
    await expectMenuAnchoredNearTrigger(page, rowActionTrigger, rowActionMenu)

    // Close row action menu via Escape
    await page.keyboard.press('Escape')
    await expect(rowActionMenu).not.toBeVisible()

    // 8. Prove display menu opens
    const displayTrigger = page.getByRole('button', { name: 'Display' })
    await displayTrigger.click()
    const displayMenu = page.locator('.display-menu-container').filter({ hasText: 'Display density' })
    await expect(displayMenu).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Display density')).toBeVisible()

    // Assert display menu is anchored near its trigger
    await expectMenuAnchoredNearTrigger(page, displayTrigger, displayMenu)

    // 9. Prove Grouped grid renders and grouped selection works
    // Change Group By in Display menu to "Status"
    await page.getByRole('button', { name: 'Raw Rows' }).click()
    await page.getByRole('button', { name: 'Status', exact: true }).click()
    
    // The grid should now show grouped layout
    await expect(page.getByText('Grouped network matrix')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Active' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Planned' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Maintenance' })).toBeVisible()

    // Select a row inside "Active" group and see aggregation updates
    const activeSection = page.locator('section.glass-panel').filter({ has: page.getByRole('heading', { name: 'Active' }) })
    const activeRow = activeSection.locator('.ag-center-cols-container .ag-row').nth(0)
    await activeRow.locator('.ag-cell').first().click()
    await expect(activeRow).toHaveClass(/ag-row-selected/)
    await expect(activeSection.getByText('1 connections · 1 selected')).toBeVisible()

    // Cancel grouping
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Grouped network matrix')).not.toBeVisible()

    // Wait until raw rows are fully rendered and visible again
    await expect(rows).toHaveCount(3, { timeout: 15000 })

    // 10. Prove saved views menu opens
    const viewsTrigger = page.getByRole('button', { name: 'Views' })
    await viewsTrigger.click()
    const viewsMenu = page.locator('.views-menu-container').filter({ hasText: 'Saved views' })
    await expect(viewsMenu).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Saved views')).toBeVisible()

    // Assert saved views menu is anchored near its trigger
    await expectMenuAnchoredNearTrigger(page, viewsTrigger, viewsMenu)

    // Dismiss views menu by pressing escape
    await page.keyboard.press('Escape')
    await expect(viewsMenu).not.toBeVisible()

    // 11. Prove column-width and grid geometry assertions
    // Verify initial column geometry (intelligence collapsed)
    const selectWidth = await getColumnWidth(page, 'select')
    const idWidth = await getColumnWidth(page, 'id')
    const favoriteWidth = await getColumnWidth(page, 'favorite')
    const actionWidth = await getColumnWidth(page, 'row_actions')

    const selectVisible = await isColumnVisible(page, 'select')
    const idVisible = await isColumnVisible(page, 'id')
    const favoriteVisible = await isColumnVisible(page, 'favorite')
    const watchVisible = await isColumnVisible(page, 'watch')
    const recentVisible = await isColumnVisible(page, 'recent_change')
    const actionVisible = await isColumnVisible(page, 'row_actions')

    expect(selectVisible).toBe(true)
    expect(selectWidth).toBe(64)
    
    expect(idVisible).toBe(true)
    expect(idWidth).toBe(90)
    
    expect(favoriteVisible).toBe(true)
    expect(favoriteWidth).toBe(80) // Favorite remains visible by default
    
    expect(watchVisible).toBe(false) // Watch is hidden/collapsed by default
    expect(recentVisible).toBe(false) // Recent Change is hidden/collapsed by default
    
    expect(actionVisible).toBe(true)
    expect(actionWidth).toBe(208)

    // Prove actual rendered DOM geometry and widths in collapsed state
    const states = await page.evaluate(() => {
      // @ts-ignore
      const api = window.__DEBUG_NETWORK_GRID_API__
      return api ? api.getColumnState() : []
    })
    console.log('COLUMN STATES AT GEOMETRY ASSERTION TIME:', JSON.stringify(states, null, 2))

    await expectColumnRenderedWidth(page, 'select', 64, 64)
    await expectColumnRenderedWidth(page, 'id', 90, 90)
    await expectColumnRenderedWidth(page, 'favorite', 80, 80)
    await expectColumnRenderedWidth(page, 'row_actions', 208, 208)

    // Scroll status into view using AG Grid API to ensure it is rendered and visible in DOM
    await page.evaluate(() => {
      // @ts-ignore
      const api = window.__DEBUG_NETWORK_GRID_API__
      if (api) api.ensureColumnVisible('status')
    })

    // Verify first main data column (status) is not collapsed and has substantial width
    const statusBox = await getGridHeaderBox(page, 'status')
    expect(statusBox.width).toBeGreaterThanOrEqual(100)

    // Prove header-body alignment for utility and status columns
    await expectHeaderBodyAligned(page, 'select')
    await expectHeaderBodyAligned(page, 'id')
    await expectHeaderBodyAligned(page, 'favorite')
    await expectHeaderBodyAligned(page, 'status')

    // Scroll farm into view using AG Grid API to handle virtualization
    await page.evaluate(() => {
      // @ts-ignore
      const api = window.__DEBUG_NETWORK_GRID_API__
      if (api) api.ensureColumnVisible('farm')
    })

    // Now 'farm' column is scrolled into view and rendered in the DOM
    const farmBox = await getGridHeaderBox(page, 'farm')
    expect(farmBox.width).toBeGreaterThanOrEqual(100)
    await expectHeaderBodyAligned(page, 'farm')

    // Scroll back status into view
    await page.evaluate(() => {
      // @ts-ignore
      const api = window.__DEBUG_NETWORK_GRID_API__
      if (api) api.ensureColumnVisible('status')
    })

    // Prove no broken grid overflow or clipping in the main grid shell
    await expectNoBrokenGridOverflow(page, getPrimaryGrid(page))

    // Expand intelligence columns
    await page.getByTitle('Show Activity Columns').click()

    // Wait until watch column is visible in DOM instead of a fixed timeout
    await expect(page.locator('.ag-header-cell[col-id="watch"]').first()).toBeVisible({ timeout: 10000 })

    // Verify expanded column geometry from state
    const watchVisibleExpanded = await isColumnVisible(page, 'watch')
    const recentVisibleExpanded = await isColumnVisible(page, 'recent_change')
    
    const watchWidthExpanded = await getColumnWidth(page, 'watch')
    const recentWidthExpanded = await getColumnWidth(page, 'recent_change')
    
    expect(watchVisibleExpanded).toBe(true)
    expect(watchWidthExpanded).toBe(85)
    
    expect(recentVisibleExpanded).toBe(true)
    expect(recentWidthExpanded).toBe(80)

    // Prove actual rendered DOM geometry and alignment for watch and recent_change in expanded state
    await expectColumnRenderedWidth(page, 'watch', 85, 85)
    await expectColumnRenderedWidth(page, 'recent_change', 80, 80)
    await expectHeaderBodyAligned(page, 'watch')
    await expectHeaderBodyAligned(page, 'recent_change')

    // Collapse back
    await page.getByTitle('Hide Activity Columns').click()
    
    // Wait until watch column is no longer visible in DOM instead of a fixed timeout
    await expect(page.locator('.ag-header-cell[col-id="watch"]').first()).not.toBeVisible({ timeout: 10000 })
    
    expect(await isColumnVisible(page, 'watch')).toBe(false)
    expect(await isColumnVisible(page, 'recent_change')).toBe(false)
  })
})
