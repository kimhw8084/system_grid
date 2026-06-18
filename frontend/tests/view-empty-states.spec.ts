import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import { bootstrapBrowserTenant, getTestApiBase, getTestUserId, waitForAppIdle } from './helpers/sysgrid'
import { expectHealthyShell, expectNoAppFailures, installStrictAppMonitoring } from './helpers/sentinel'

test.describe('View empty states', () => {
  test('renders explicit empty-state guidance in a pristine tenant', async ({ page }) => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const apiBase = getTestApiBase()
    const userId = getTestUserId()

    const createResponse = await page.request.post(`${apiBase}/tenants/admin/create`, {
      data: { name: `Empty States ${stamp}`, db_name: `empty_states_${stamp}` },
      headers: { 'X-User-Id': userId, 'X-Tenant-Id': '1' },
    })
    expect(createResponse.ok()).toBeTruthy()
    const tenant = await createResponse.json()

    const selectResponse = await page.request.post(`${apiBase}/tenants/select`, {
      data: { tenant_id: tenant.id },
      headers: { 'X-User-Id': userId, 'X-Tenant-Id': String(tenant.id) },
    })
    expect(selectResponse.ok()).toBeTruthy()

    await bootstrapBrowserTenant(page, { tenantId: tenant.id })
    const failures = installStrictAppMonitoring(page)

    const expectations = [
      { path: '/asset', text: 'No Rows To Show' },
      { path: '/knowledge', text: 'No Intelligence Found' },
      { path: '/research', text: 'No Rows To Show' },
      { path: '/racks', text: 'No Racks in Scope' },
    ]

    for (const entry of expectations) {
      await page.goto(entry.path)
      await waitForAppIdle(page)
      await expect(page.getByText(entry.text)).toBeVisible()
      await expectHealthyShell(page)
    }

    await expectNoAppFailures(failures, 'empty-state matrix')
  })
})
