import { expect, test } from '@playwright/test'
import { resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'

test.describe('App shell and global search', () => {
  test('loads the dashboard and feature audit HUD', async ({ page }) => {
    await resetBrowserState(page)

    await page.goto('/')
    await expect(page.getByText('Command Center')).toBeVisible()
    await expect(page.getByText(/Cockpit/).first()).toBeVisible()

    await page.getByRole('button', { name: /Feature Audit/i }).click()
    await expect(page.getByText('Feature Audit HUD v2')).toBeVisible()
    await expect(page.getByText('Leadership Cockpit')).toHaveCount(3)
  })

  test('navigates to seeded records through global search', async ({ page, request }) => {
    await resetBrowserState(page)
    const { service, monitoring, knowledge } = await seedOperationalScenario(request)

    await page.goto('/')

    await page.getByRole('button', { name: /Global ID Search/i }).click()
    await page.getByPlaceholder(/Search Assets, Projects, FAR, Services, Monitoring/i).fill(service.name)
    await page.getByRole('button', { name: new RegExp(service.name, 'i') }).click()
    await expect(page).toHaveURL(new RegExp(`/services\\?id=${service.id}`))
    await expect(page.getByText(service.name)).toBeVisible()

    await page.goto('/')
    await page.getByRole('button', { name: /Global ID Search/i }).click()
    await page.getByPlaceholder(/Search Assets, Projects, FAR, Services, Monitoring/i).fill(monitoring.title)
    await page.getByRole('button', { name: new RegExp(monitoring.title, 'i') }).click()
    await expect(page).toHaveURL(new RegExp(`/monitoring\\?id=${monitoring.id}`))
    await expect(page.getByText(monitoring.title)).toBeVisible()

    await page.goto('/')
    await page.getByRole('button', { name: /Global ID Search/i }).click()
    await page.getByPlaceholder(/Search Assets, Projects, FAR, Services, Monitoring/i).fill(knowledge.title)
    await page.getByRole('button', { name: new RegExp(knowledge.title, 'i') }).click()
    await expect(page).toHaveURL(new RegExp(`/knowledge\\?id=${knowledge.id}`))
    await expect(page.locator('h1').filter({ hasText: knowledge.title })).toBeVisible()
  })
})
