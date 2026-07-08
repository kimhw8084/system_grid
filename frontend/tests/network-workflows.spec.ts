import { clickResilientButton } from './helpers/sysgrid';
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
    await clickResilientButton(page, 'De-activate Selection')
    await clickResilientButton(page, 'Confirm De-activation?')
    await expect(page.locator('[role="treegrid"]')).not.toContainText(farm, { timeout: 30000 })
  })
})
