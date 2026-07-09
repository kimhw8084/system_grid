import { clickResilientButton, getColumnWidth, isColumnVisible } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { createAsset, createConnection, ensureSettingOption, resetBrowserState } from './helpers/sysgrid'

test.describe('Network workflows', () => {
  test('supports deep-linked forensics, unit edits, and bulk sever from the grid', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
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
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Mbps', exact: true }).click()
    await page.waitForTimeout(300)
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
    await page.waitForTimeout(300)
    await pinnedRows.nth(1).locator('.ag-selection-checkbox').first().click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Bulk Actions' }).click()
    await expect(page.locator('.bulk-menu-container')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    await clickResilientButton(page, 'De-activate Selection')
    await page.waitForTimeout(500)
    await clickResilientButton(page, 'Confirm De-activation?')
    await expect(page.locator('[role="treegrid"]')).not.toContainText(farm, { timeout: 30000 })
  })

  test('supports manual selection, modifiers, menu overlays, display configurations, and grouped grid parity', async ({ page, sysApi: request }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()))
    page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err))
    await resetBrowserState(page)
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
    await page.getByRole('button', { name: 'Bulk Actions' }).click()
    await expect(page.locator('.bulk-menu-container')).toBeVisible({ timeout: 5000 })
    // Close the bulk menu by pressing Escape to avoid pointer interception
    await page.keyboard.press('Escape')
    await expect(page.locator('.bulk-menu-container')).not.toBeVisible()

    // 7. Prove row action menu opens from a row
    await page.locator('.row-action-trigger').first().click()
    await expect(page.locator('div.row-action-menu-container')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Row actions')).toBeVisible()
    // Close row action menu via Escape
    await page.keyboard.press('Escape')
    await expect(page.locator('div.row-action-menu-container')).not.toBeVisible()

    // 8. Prove display menu opens
    await page.getByRole('button', { name: 'Display' }).click()
    await expect(page.getByText('Display density')).toBeVisible({ timeout: 5000 })

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
    await activeSection.locator('.ag-center-cols-container .ag-row').nth(0).locator('.ag-cell').first().click()
    await expect(activeSection.locator('.ag-center-cols-container .ag-row').nth(0)).toHaveClass(/ag-row-selected/)
    await expect(activeSection.getByText('1 connections · 1 selected')).toBeVisible()

    // Cancel grouping
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Grouped network matrix')).not.toBeVisible()

    // 10. Prove saved views menu opens
    await page.getByRole('button', { name: 'Views' }).click()
    await expect(page.getByText('Saved views')).toBeVisible({ timeout: 5000 })
    // Dismiss views menu by pressing escape
    await page.keyboard.press('Escape')

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

    // Expand intelligence columns
    await page.getByTitle('Show Activity Columns').click()
    await page.waitForTimeout(200) // Wait for AG Grid layout and render

    // Verify expanded column geometry
    const watchVisibleExpanded = await isColumnVisible(page, 'watch')
    const recentVisibleExpanded = await isColumnVisible(page, 'recent_change')
    
    const watchWidthExpanded = await getColumnWidth(page, 'watch')
    const recentWidthExpanded = await getColumnWidth(page, 'recent_change')
    
    expect(watchVisibleExpanded).toBe(true)
    expect(watchWidthExpanded).toBe(85)
    
    expect(recentVisibleExpanded).toBe(true)
    expect(recentWidthExpanded).toBe(80)

    // Collapse back
    await page.getByTitle('Hide Activity Columns').click()
    await page.waitForTimeout(200)
    
    expect(await isColumnVisible(page, 'watch')).toBe(false)
    expect(await isColumnVisible(page, 'recent_change')).toBe(false)
  })
})
