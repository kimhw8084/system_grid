import { writeFile } from 'node:fs/promises'
import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import {
  resetBrowserState,
  testApiBase,
  testFrontendOrigin,
  testTenantId,
  testUserId,
  waitForAppIdle,
} from './helpers/sysgrid'
import { expectNoAppFailures, installStrictAppMonitoring } from './helpers/sentinel'

test.describe('System Sentinel (Zero-Tolerance Coverage - Comprehensive)', () => {
  test('proves the canonical gate is bound to the isolated frontend, API, and tenant', async ({ page, sysApi }, testInfo) => {
    const appMonitoring = installStrictAppMonitoring(page)
    const observedApiOrigins = new Set<string>()
    const observedTenantIds = new Set<string>()
    const browserTenantHeaders: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!url.pathname.startsWith('/api/')) return
      const tenantHeader = request.headers()['x-tenant-id']
      if (tenantHeader) browserTenantHeaders.push(tenantHeader)
    })
    page.on('response', (response) => {
      const url = new URL(response.url())
      if (url.pathname.startsWith('/api/')) {
        observedApiOrigins.add(url.origin)
        const tenantId = response.headers()['x-sysgrid-tenant-id']
        if (tenantId) observedTenantIds.add(tenantId)
      }
    })

    await resetBrowserState(page)
    await page.goto('/')
    await waitForAppIdle(page)

    expect(new URL(page.url()).origin).toBe(testFrontendOrigin)
    await expect(page.getByTestId('active-tenant-name')).toHaveText('Playwright Gate')
    const browserHealthStatus = await page.evaluate(async ({ apiBase, headers }) => {
      const response = await fetch(`${apiBase}/health`, { headers })
      return response.status
    }, {
      apiBase: testApiBase,
      headers: { 'X-User-Id': testUserId },
    })
    expect(browserHealthStatus).toBe(200)
    const health = await sysApi.get('/health')
    expect(health.ok()).toBeTruthy()
    const tenantResponse = await sysApi.get('/tenants/me')
    expect(tenantResponse.ok()).toBeTruthy()
    const tenants = await tenantResponse.json()
    expect(tenants).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: Number(testTenantId), name: 'Playwright Gate', is_selected: true }),
    ]))
    expect([...observedApiOrigins]).toEqual([new URL(testApiBase).origin])
    expect([...observedTenantIds]).toEqual([testTenantId])
    expect(browserTenantHeaders).toEqual([])
    await expectNoAppFailures(appMonitoring, 'canonical runtime binding')

    await writeFile(testInfo.outputPath('canonical-runtime-binding.json'), `${JSON.stringify({
      frontendOrigin: testFrontendOrigin,
      apiBase: testApiBase,
      tenantId: testTenantId,
      tenantName: 'Playwright Gate',
      activeTenantName: await page.getByTestId('active-tenant-name').innerText(),
      observedApiOrigins: [...observedApiOrigins],
      observedTenantIds: [...observedTenantIds],
      browserTenantHeaders,
    }, null, 2)}
`, 'utf8')
  })

  const views = [
    { path: '/', name: 'Dashboard' },
    { path: '/monitoring', name: 'Monitoring', workspace: 'monitoring' },
    { path: '/asset', name: 'Assets', workspace: 'assets' },
    { path: '/projects', name: 'Projects' },
    { path: '/settings', name: 'Settings' },
  ] as const

  for (const view of views) {
    test(`Comprehensive Check: ${view.name} loads the intended route`, async ({ page }) => {
      const appMonitoring = installStrictAppMonitoring(page)
      await resetBrowserState(page)
      await page.goto(view.path)
      await waitForAppIdle(page)
      await expect.poll(() => new URL(page.url()).pathname).toBe(view.path)
      if ('workspace' in view) {
        await expect(page.locator(`[data-workspace="${view.workspace}"]`)).toBeVisible()
      } else {
        await expect(page.locator('h1').first()).toBeVisible()
      }
      await expectNoAppFailures(appMonitoring, `${view.name} route sentinel`)
    })
  }
})
