import { expect, test } from '@playwright/test'
import { createAsset, createService, resetBrowserState } from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'

test.describe('Service workflows', () => {
  test('tolerates malformed metadata and clears deep-link state on close', async ({ page, request }) => {
    await resetBrowserState(page)
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const host = await createAsset(request, {
      name: `PW-SVC-HOST-${stamp}`,
      system: `PW-SVC-SYS-${stamp}`,
      status: 'Active',
      model: 'R740',
      type: 'Physical',
      serial_number: `PW-SVC-SN-${stamp}`,
      asset_tag: `PW-SVC-AT-${stamp}`,
      owner: 'ops',
      business_unit: 'Platform'
    })

    const activeService = await createService(request, {
      name: `PW-SVC-ACTIVE-${stamp}`,
      service_type: 'Database',
      status: 'Active',
      environment: 'Production',
      device_id: host.id,
      license_key: 'LIC-PW-1234',
      config_json: '{bad json'
    })

    const purgedService = await createService(request, {
      name: `PW-SVC-PURGED-${stamp}`,
      service_type: 'Web Server',
      status: 'Stopped',
      environment: 'DR'
    })

    const purgeResponse = await request.delete(`${apiBase}/logical-services/${purgedService.id}`)
    expect(purgeResponse.ok()).toBeTruthy()

    await page.goto(`/services?id=${activeService.id}`)
    await expect(page.getByText(activeService.name)).toBeVisible()
    await page.getByRole('button', { name: 'Editor' }).click()
    await expect(page.getByText('Commit Metadata')).toBeVisible()
    await page.locator('.fixed.inset-0.z-50 .glass-panel').filter({ hasText: activeService.name }).locator('.flex.items-center.justify-between.border-b > button').first().click()
    await expect(page).not.toHaveURL(new RegExp(`id=${activeService.id}`))

    await page.goto(`/services?id=${purgedService.id}`)
    await expect(page.getByRole('button', { name: 'Purged' })).toBeVisible()
    await expect(page.getByRole('heading', { name: purgedService.name })).toBeVisible()
    await page.locator('.fixed.inset-0.z-50 .glass-panel').filter({ hasText: purgedService.name }).locator('.flex.items-center.justify-between.border-b > button').first().click()
    await expect(page).not.toHaveURL(new RegExp(`id=${purgedService.id}`))
  })
})
