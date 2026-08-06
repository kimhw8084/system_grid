import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import { resetBrowserState, testUserId, waitForAppIdle } from './helpers/sysgrid'

test.describe('Blank Slate Crash Audit', () => {
  test('navigates all views in a verified pristine tenant without fatal React failures', async ({ page, sysApi }) => {
    test.setTimeout(90_000)
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const createTenant = await sysApi.post('/tenants/admin/create', {
      data: { name: `Playwright Blank Slate ${stamp}` },
    })
    expect(createTenant.ok()).toBeTruthy()
    const tenant = await createTenant.json()
    expect(Number.isInteger(tenant.id)).toBeTruthy()

    const emptyTenantId = String(tenant.id)
    const emptyHeaders = { 'X-User-Id': testUserId, 'X-Tenant-Id': emptyTenantId }

    const emptyEndpoints = [
      '/devices?include_deleted=true',
      '/logical-services?include_deleted=true',
      '/intelligence/entities?include_deleted=true',
      '/networks/connections?include_deleted=true',
      '/far/modes',
      '/investigations',
      '/monitoring?include_deleted=true',
      '/vendors?include_deleted=true',
    ]
    for (const endpoint of emptyEndpoints) {
      const response = await sysApi.get(endpoint, { headers: emptyHeaders })
      expect(response.ok(), `${endpoint} should be readable in the blank tenant`).toBeTruthy()
      expect(await response.json(), `${endpoint} should start empty`).toEqual([])
    }

    await resetBrowserState(page, { tenantId: emptyTenantId, userId: testUserId })

    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await waitForAppIdle(page)
    await expect(page.getByTestId('active-tenant-name')).toHaveText(tenant.name)

    const navigationLinks = page.locator('nav a[href^="/"]')
    await expect(navigationLinks.first()).toBeVisible({ timeout: 15_000 })
    const navLinks = await navigationLinks.evaluateAll((links) => (
      Array.from(new Set(links.map((link) => link.getAttribute('href')).filter(
        (href): href is string => Boolean(href) && href.length > 1 && !href.startsWith('http'),
      )))
    ))
    expect(navLinks.length).toBeGreaterThan(0)

    for (const route of navLinks) {
      await page.goto(route)
      await waitForAppIdle(page)
      await expect.poll(() => new URL(page.url()).pathname).toBe(route)
      await expect(page.locator('main, #root, #app-root').first()).toBeVisible()
      await expect(page.getByTestId('active-tenant-name')).toHaveText(tenant.name)
      expect(errors).toEqual([])
    }
  })
})
