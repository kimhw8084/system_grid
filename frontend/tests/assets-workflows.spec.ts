import { test, expect } from '@playwright/test'
import { resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'

test.describe('Assets workflows', () => {
  test('simulates the changed Assets workflows end-to-end', async ({ page, request }) => {
    await resetBrowserState(page)
    const { stamp, systemName, primary, secondary, monitoring, far } = await seedOperationalScenario(request)

    await page.goto('/asset')
    await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible()
    await page.getByPlaceholder('Search assets...').fill(primary.name)
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })

    await page.getByRole('button', { name: 'Unowned' }).click()
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })

    await page.getByRole('button', { name: 'At Risk' }).click()
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })

    await page.getByRole('button', { name: 'Needs Docs' }).click()
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })

    await page.getByTitle('View Details').first().click()
    await expect(page.getByText('Asset Command Workspace')).toBeVisible()
    await expect(page.getByText('Suggested Runbooks Now')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open FAR' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Audit Trail' })).toBeVisible()
    await expect(page.getByText(`PW-MON-${stamp}`)).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(`PW-RUNBOOK-${stamp}`, 'i') }).first()).toBeVisible()
    await expect(page.getByText(`PW-MAINT-${stamp}`)).toBeVisible()
    await page.getByRole('button', { name: 'Open Knowledge Context' }).click()
    await expect(page).toHaveURL(new RegExp(`/knowledge\\?device_id=${primary.id}`))

    await page.goto('/asset')
    await page.getByPlaceholder('Search assets...').fill(primary.name)
    await page.getByTitle('View Details').first().click()

    await page.getByRole('button', { name: 'Open FAR' }).click()
    await expect(page).toHaveURL(new RegExp(`/far\\?id=${far.id}`))

    await page.goto('/asset')
    await page.getByPlaceholder('Search assets...').fill(primary.name)
    await page.getByTitle('View Details').first().click()
    await page.getByRole('button', { name: 'Audit Trail' }).click()
    await expect(page).toHaveURL(new RegExp(`/logs\\?target_table=devices&target_id=${primary.id}`))
    await expect(page.getByText(`Scoped: devices // ${primary.id}`)).toBeVisible()

    await page.goto('/asset')
    await page.getByRole('button', { name: 'All' }).click()
    await page.getByPlaceholder('Search assets...').fill(systemName)
    const rows = page.locator('.ag-center-cols-container .ag-row')
    await expect(rows).toHaveCount(2, { timeout: 15_000 })
    await page.locator('.bulk-menu-container > button').click()
    await page.getByRole('button', { name: /Compare Visible/i }).click()
    await expect(page.getByText('System Matrix Comparison')).toBeVisible()

    await page.getByTitle('Sync all to this Environment').first().click()
    await expect(page.getByText('Sync Preview')).toBeVisible()
    await page.getByRole('button', { name: 'Apply Sync' }).click()

    await page.goto('/asset')
    await page.getByPlaceholder('Search assets...').fill(secondary.name)
    await page.getByRole('button', { name: 'All' }).click()
    await expect(page.locator('[role="treegrid"]')).toContainText(secondary.name)

    await page.goto(`/monitoring?id=${monitoring.id}`)
    await expect(page.getByText(`PW-MON-${stamp}`)).toBeVisible()
  })
})
