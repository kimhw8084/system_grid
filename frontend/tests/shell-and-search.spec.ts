import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'

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

    await page.goto('/')

    await clickResilientButton(page, /Search assets, projects, or incidents.../i)
    await page.getByPlaceholder(/Search assets, projects, or incidents.../i).fill(service.name)
    await clickResilientButton(page, new RegExp(service.name, 'i'))
    await expect(page).toHaveURL(new RegExp(`/services\\?id=${service.id}`))
    await expect(page.getByText(service.name)).toBeVisible()

    await page.goto('/')
    await clickResilientButton(page, /Search assets, projects, or incidents.../i)
    await page.getByPlaceholder(/Search Matrix Context.../i).fill(monitoring.title)
    await clickResilientButton(page, new RegExp(monitoring.title, 'i'))
    await expect(page).toHaveURL(new RegExp(`/monitoring\\?id=${monitoring.id}`))
    await expect(page.getByText(monitoring.title)).toBeVisible()

    await page.goto('/')
    await clickResilientButton(page, /Search assets, projects, or incidents.../i)
    await page.getByPlaceholder(/Search Matrix Context.../i).fill(knowledge.title)
    await clickResilientButton(page, new RegExp(knowledge.title, 'i'))
    await expect(page).toHaveURL(new RegExp(`/knowledge\\?id=${knowledge.id}`))
    await expect(page.locator('h1').filter({ hasText: knowledge.title })).toBeVisible()
  })
})
