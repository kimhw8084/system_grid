import { expect, test } from '@playwright/test'
import { resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'

test.describe('Settings and audit workflows', () => {
  test('persists theme and loads major settings sections', async ({ page }) => {
    await resetBrowserState(page)

    await page.goto('/settings')
    await expect(page.getByText('Core Infrastructure')).toBeVisible()

    await page.getByRole('button', { name: /^Light$/ }).click()
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('pure-clarity')

    await page.reload()
    await expect(page.getByText('Core Infrastructure')).toBeVisible()
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('pure-clarity')

    await page.getByRole('button', { name: /Permission/i }).click()
    await expect(page.getByText('User Permission')).toBeVisible()
    await expect(page.getByPlaceholder('Filter Operators...')).toBeVisible()

    await page.getByRole('button', { name: /Tenants/i }).click()
    await expect(page.getByText('Tenant Management')).toBeVisible()
    await expect(page.getByRole('button', { name: /Create Database/i })).toBeVisible()
  })

  test('filters operators and keeps tenant input after a failed create attempt', async ({ page }) => {
    await resetBrowserState(page)

    await page.goto('/settings?tab=permissions')
    await expect(page.getByText('User Permission')).toBeVisible()
    await page.getByPlaceholder('Filter Operators...').fill('admin_root')
    await expect(page.locator('table')).toContainText('System Administrator')
    await expect(page.getByText('No operators match the current filter')).not.toBeVisible()

    await page.getByPlaceholder('Filter Operators...').fill('not-a-real-operator')
    await expect(page.getByText('No operators match the current filter')).toBeVisible()

    await page.getByRole('button', { name: /Tenants/i }).click()
    await expect(page.getByText('Tenant Management')).toBeVisible()
    const tenantInput = page.getByPlaceholder('e.g. Asia_Production')
    await tenantInput.fill('Default Engine')
    await page.getByRole('button', { name: /Create Database/i }).click()
    await expect(page.getByText(/Creation Failed/i)).toBeVisible()
    await expect(tenantInput).toHaveValue('Default Engine')
  })

  test('stores and exposes user-pool sync script history', async ({ page, request }) => {
    await resetBrowserState(page)
    const response = await request.post(`${apiBase}/settings/user-pool/refresh`, {
      data: { script: "print('playwright sync')" },
      headers: { 'X-User-Id': 'admin_root' }
    })
    expect(response.ok()).toBeTruthy()

    await page.goto('/settings?tab=permissions')
    await expect(page.getByText('User Permission')).toBeVisible()
    await page.getByRole('button', { name: /View Sync History/i }).click()
    await page.getByRole('button', { name: /View Script History/i }).first().click()
    await expect(page.getByText('Historical Sync Logic')).toBeVisible()
    await expect(page.getByRole('button', { name: /Restore to Editor/i })).toBeVisible()
  })

  test('renders scoped audit logs for seeded service activity', async ({ page, request }) => {
    await resetBrowserState(page)
    const { service } = await seedOperationalScenario(request)

    await page.goto(`/logs?target_table=logical_services&target_id=${service.id}`)
    await expect(page.getByText(`Scoped: logical_services // ${service.id}`)).toBeVisible()
    await expect(page.getByText(service.name)).toBeVisible()
    await expect(page.getByRole('button', { name: /Analytics/i })).toBeVisible()
  })
})
