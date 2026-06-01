import { expect, test } from '@playwright/test'
import { resetBrowserState, seedRackScenario } from './helpers/sysgrid'

test.describe('Racks workflows', () => {
  test('handles spatial navigation, site decommission fallback, and sandbox collision safety', async ({ page, request }) => {
    await resetBrowserState(page)
    const { siteA, rackA1, rackA2, devicePrimary, deviceSecondary } = await seedRackScenario(request)
    const rackCard = (id: number) => page.locator(`.glass-panel[data-rack-id="${id}"]`)

    await page.goto('/racks')
    await expect(page.getByRole('heading', { name: 'Racks' })).toBeVisible()

    await page.getByRole('button', { name: new RegExp(siteA.name) }).click()
    await expect(rackCard(rackA1.id)).toBeVisible()

    await page.getByTitle('Spatial Map').click()
    await page.getByText(rackA2.name, { exact: true }).click()
    await expect(rackCard(rackA2.id)).toBeVisible()

    const siteChip = page.locator('div.group\\/site').filter({ hasText: siteA.name }).first()
    await siteChip.getByRole('button').nth(1).click({ force: true })
    await page.getByRole('button', { name: /Decommission/i }).click()
    await page.getByRole('button', { name: 'Decommission Site' }).click()
    await expect(rackCard(rackA1.id)).toBeVisible()

    await page.getByTitle('View Plans').click()
    await page.getByRole('button', { name: /New Blank Plan/i }).click()
    await expect(page.getByText('Ghost Planner')).toBeVisible()

    await rackCard(rackA1.id).locator('[data-u="1"] > div').first().click()
    await expect(page.getByRole('heading', { name: 'Mount Asset' })).toBeVisible()
    await page.getByPlaceholder('Filter by name, type, or system...').fill(devicePrimary.name)
    await page.getByText(devicePrimary.name, { exact: true }).click()
    await page.getByRole('button', { name: 'Mount Asset' }).click()
    await expect(page.getByText('Ghost Planner')).toBeVisible()

    await rackCard(rackA1.id).locator('[data-u="1"] > div').first().click()
    await page.getByPlaceholder('Filter by name, type, or system...').fill(deviceSecondary.name)
    await page.getByText(deviceSecondary.name, { exact: true }).click()
    await page.getByRole('button', { name: 'Mount Asset' }).click()
    await expect(page.getByText(/Collision with/i)).toBeVisible()
    await expect(rackCard(rackA1.id)).toContainText(devicePrimary.name)
    await expect(rackCard(rackA1.id)).not.toContainText(deviceSecondary.name)
  })
})
