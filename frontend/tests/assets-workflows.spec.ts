import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'

test.describe('Assets workflows', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('simulates the changed Assets workflows end-to-end', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const { stamp, systemName, primary, secondary, monitoring, far } = await seedOperationalScenario(request)

    await page.goto('/asset')
    await expect(page.getByRole('heading', { name: 'Infrastructure Registry' })).toBeVisible()
    await expect(page.getByText('Scanning infrastructure registry...')).not.toBeVisible()

    await page.getByPlaceholder('Search assets...').fill(systemName)
    await page.keyboard.press('Enter')
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })

    await clickResilientButton(page, 'Unowned')
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })

    await clickResilientButton(page, 'All')
    await expect(page.locator('[role="treegrid"]')).toContainText(secondary.name, { timeout: 15_000 })
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })

    await clickResilientButton(page, 'Needs Docs')
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })

    await page.getByTitle('View Details').first().click({ force: true })
    await expect(page.getByText(primary.name).first()).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Suggested Runbooks Now')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open FAR' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Audit Trail' })).toBeVisible()
    await expect(page.getByText(`PW-MON-${stamp}`)).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(`PW-RUNBOOK-${stamp}`, 'i') }).first()).toBeVisible()
    await expect(page.getByText(`PW-MAINT-${stamp}`)).toBeVisible()
    await clickResilientButton(page, 'Open Knowledge Context')
    await expect(page).toHaveURL(new RegExp(`/knowledge\\?device_id=${primary.id}`))

    await page.goto('/asset')
    await page.getByPlaceholder('Search assets...').fill(primary.name)
    await page.getByTitle('View Details').first().click()

    await clickResilientButton(page, 'Open FAR')
    await expect(page).toHaveURL(new RegExp(`/far\\?id=${far.id}`))

    await page.goto('/asset')
    await page.getByPlaceholder('Search assets...').fill(primary.name)
    await page.getByTitle('View Details').first().click()
    await clickResilientButton(page, 'Audit Trail')
    await expect(page).toHaveURL(new RegExp(`/logs\\?target_table=devices&target_id=${primary.id}`))
    await expect(page.getByText(`Scoped: devices // ${primary.id}`)).toBeVisible()

    await page.goto('/asset')
    await clickResilientButton(page, 'All')
    await page.getByPlaceholder('Search assets...').fill(systemName)
    const rows = page.locator('.ag-center-cols-container .ag-row')
    await expect(rows).toHaveCount(2, { timeout: 15_000 })
    await page.locator('.bulk-menu-container > button').click()
    await clickResilientButton(page, /Compare Visible/i)
    await expect(page.getByText('System Matrix Comparison')).toBeVisible()

    await page.getByTitle('Sync all to this Environment').first().click()
    await expect(page.getByText('Sync Preview')).toBeVisible()
    await clickResilientButton(page, 'Apply Sync')

    await page.goto('/asset')
    await page.getByPlaceholder('Search assets...').fill(secondary.name)
    await clickResilientButton(page, 'All')
    await expect(page.locator('[role="treegrid"]')).toContainText(secondary.name)

    await page.goto(`/monitoring?id=${monitoring.id}`)
    await expect(page.getByText(`PW-MON-${stamp}`)).toBeVisible()
  })
})
