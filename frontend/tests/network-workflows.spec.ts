import { test, expect } from '@playwright/test'
import { createAsset, createConnection, resetBrowserState } from './helpers/sysgrid'

test.describe('Network workflows', () => {
  test('supports deep-linked forensics, unit edits, and bulk sever from the grid', async ({ page, request }) => {
    await resetBrowserState(page)
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const farm = `PW-NET-${stamp}`

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
    await expect(page.getByText(source.name)).toBeVisible()
    await page.getByTitle('Edit Connection').click()
    await expect(page.getByText('MODIFY_LINK')).toBeVisible()
    const editModal = page.locator('.glass-panel').filter({ has: page.getByText('MODIFY_LINK') })
    await editModal.locator('input[type="number"]').nth(2).fill('100')
    await editModal.locator('select').nth(4).selectOption('Mbps')
    await page.getByRole('button', { name: /Synchronize Link Matrix/i }).click()
    await expect(page.getByText('Link Matrix Updated')).toBeVisible()
    await page.goto(`/network?id=${connA.id}`)
    await expect(page.getByText('100.0 Mbps')).toBeVisible()
    await page.goto('/network')

    await page.getByPlaceholder('SCAN FABRIC...').fill(farm)
    await page.getByRole('checkbox', { name: /Press Space to toggle row selection/i }).first().check()
    await page.getByRole('checkbox', { name: /Press Space to toggle row selection/i }).nth(1).check()
    await page.locator('.bulk-menu-container > button').click()
    await page.getByRole('button', { name: 'Bulk Sever Links' }).click()
    await page.getByRole('button', { name: 'Confirm Action' }).click()
    await expect(page.locator('[role="treegrid"]')).not.toContainText(farm)
  })
})
