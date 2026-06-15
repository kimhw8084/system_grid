import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'

test.describe('Settings and audit workflows', () => {
  test('persists theme and loads major settings sections', async ({ page }) => {
    await resetBrowserState(page)

    await page.goto('/settings')
    await expect(page.getByText('Infrastructure Domain')).toBeVisible()

    await clickResilientButton(page, /^Light$/)
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('pure-clarity')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Infrastructure Domain')).toBeVisible()
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('pure-clarity')

    await clickResilientButton(page, /Permission/i)
    await expect(page.getByText('Identity Sync Pipeline')).toBeVisible()
    await expect(page.getByPlaceholder('Search identity, department, or team...')).toBeVisible()

    await clickResilientButton(page, /Tenants/i)
    await expect(page.getByText('Tenant Registry')).toBeVisible()
    await expect(page.getByRole('button', { name: /Create Tenant/i })).toBeVisible()
  })

  test('filters operators and keeps tenant input after a failed create attempt', async ({ page }) => {
    await resetBrowserState(page)

    await page.goto('/settings?tab=permissions')
    await expect(page.getByText('Identity Sync Pipeline')).toBeVisible()
    await page.getByPlaceholder('Search identity, department, or team...').fill('admin_root')
    await expect(page.locator('table > tbody > tr').first()).toContainText('System Administrator')
    await expect(page.getByText('No operators match the current filter')).not.toBeVisible()

    await page.getByPlaceholder('Search identity, department, or team...').fill('not-a-real-operator')
    await expect(page.getByText('No operators match the current filter')).toBeVisible()

    await clickResilientButton(page, /Tenants/i)
    await expect(page.getByText('Tenant Registry')).toBeVisible()
    const tenantInput = page.getByPlaceholder('Tenant name')
    await tenantInput.fill('Default Engine')
    await clickResilientButton(page, /Create Tenant/i)
    await expect(page.getByText(/Failed to create tenant/i)).toBeVisible()
    await expect(tenantInput).toHaveValue('Default Engine')
  })

  test('stores and exposes user-pool sync script history', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const response = await request.post(`${apiBase}/settings/user-pool/refresh`, {
      data: { 
        records: [
          { external_id: 'pw.sync.1', username: 'pwsync1', full_name: 'PW Sync One', email: 'pwsync1@example.com', registration_status: 'Verified' }
        ],
        source: "playwright_test"
      },
      /* headers auto-injected */
    })
    if (!response.ok()) { console.error(await response.text()); }
    expect(response.ok()).toBeTruthy()

    await page.goto('/settings?tab=permissions')
    await expect(page.getByText('Identity Sync Pipeline')).toBeVisible()
    await clickResilientButton(page, /Identity Sync/i)
    await page.waitForTimeout(1000)
    await clickResilientButton(page, /View Sync History/i)
    await clickResilientButton(page, /View Script History/i)
    await expect(page.getByText('Historical Sync Logic')).toBeVisible()
    await expect(page.getByRole('button', { name: /Restore to Editor/i })).toBeVisible()
  })

  test('renders scoped audit logs for seeded service activity', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const { service } = await seedOperationalScenario(request)

    await page.goto(`/logs?target_table=logical_services&target_id=${service.id}`)
    await expect(page.getByText(`Scoped: logical_services // ${service.id}`)).toBeVisible()
    await expect(page.getByText(service.name)).toBeVisible()
    await expect(page.getByRole('button', { name: /Analytics/i })).toBeVisible()
  })
})
