import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { resetBrowserState, seedOperationalScenario, waitForAppIdle } from './helpers/sysgrid'

test.describe('App shell and global search', () => {
  test('loads the dashboard and feature audit HUD', async ({ page }) => {
    await resetBrowserState(page)

    await page.goto('/')
    await expect(page.getByText('Stability Pulse')).toBeVisible()
    await expect(page.getByText('Defense Status')).toBeVisible()

    await clickResilientButton(page, /Patch Notes/i)
    await expect(page.getByText('Registry Updates')).toBeVisible()
  })

  test('navigates to seeded records through global search', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const { service, monitoring, knowledge } = await seedOperationalScenario(request)
    const searchInput = page.getByPlaceholder(/Search Assets, Projects, FAR, Services, Monitoring/i)
    const searchTrigger = page.locator('button').filter({ hasText: /Search assets, projects, or incidents/i }).first()

    await page.goto('/')
    await waitForAppIdle(page)
    await expect(page.getByText('Stability Pulse')).toBeVisible()

    await searchTrigger.click()
    await expect(searchInput).toBeVisible()
    await searchInput.fill(service.name)
    const serviceResult = page.locator('button').filter({ hasText: service.name }).first()
    await expect(serviceResult).toBeVisible()
    await serviceResult.click()
    await expect(page).toHaveURL(new RegExp(`/services\\?id=${service.id}`))
    await expect(page.getByText(service.name)).toBeVisible()

    await page.goto('/')
    await waitForAppIdle(page)
    await searchTrigger.click()
    await expect(searchInput).toBeVisible()
    await searchInput.fill(monitoring.title)
    const monitoringResult = page.locator('button').filter({ hasText: monitoring.title }).first()
    await expect(monitoringResult).toBeVisible()
    await monitoringResult.click()
    await expect(page).toHaveURL(new RegExp(`/monitoring\\?id=${monitoring.id}`))
    await expect(page.getByText(monitoring.title)).toBeVisible()

    await page.goto('/')
    await waitForAppIdle(page)
    await searchTrigger.click()
    await expect(searchInput).toBeVisible()
    await searchInput.fill(knowledge.title)
    const knowledgeResult = page.locator('button').filter({ hasText: knowledge.title }).first()
    await expect(knowledgeResult).toBeVisible()
    await knowledgeResult.click()
    await expect(page).toHaveURL(new RegExp(`/knowledge\\?id=${knowledge.id}`))
    await expect(page.locator('h1').filter({ hasText: knowledge.title })).toBeVisible()
  })
})
