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
    await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible()
    await expect(page.getByText('Syncing asset registry...')).not.toBeVisible()

    await page.getByPlaceholder('Scan asset matrix...').fill(systemName)
    await page.keyboard.press('Enter')
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })
    await expect(page.locator('[role="treegrid"]')).toContainText(secondary.name, { timeout: 15_000 })

    const assetRowActions = page.getByTitle('More actions')
    const viewDetailsButtons = page.getByRole('button', { name: 'View Details' })
    const openKnowledgeButton = page.getByRole('button', { name: 'Open Knowledge', exact: true })
    const farRisksButton = page.getByRole('button', { name: 'FAR Risks', exact: true })
    const auditButton = page.getByRole('button', { name: 'Audit', exact: true })
    const bulkActionsButton = page.getByRole('button', { name: 'Bulk Actions', exact: true })
    const compareVisibleButton = page.getByRole('button', { name: 'Compare Visible', exact: true })

    await assetRowActions.first().click({ force: true })
    await viewDetailsButtons.last().click({ force: true })
    await expect(page.getByText(primary.name).first()).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Suggested Runbooks Now')).toBeVisible()
    await expect(farRisksButton).toBeVisible()
    await expect(farRisksButton).toBeEnabled()
    await expect(auditButton).toBeVisible()
    await expect(page.getByText(`PW-MON-${stamp}`)).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(`PW-RUNBOOK-${stamp}`, 'i') }).first()).toBeVisible()
    await expect(page.getByText(`PW-MAINT-${stamp}`)).toBeVisible()
    await openKnowledgeButton.click({ force: true })
    await expect(page).toHaveURL(new RegExp(`/knowledge\\?device_id=${primary.id}`))

    await page.goto('/asset')
    await page.getByPlaceholder('Scan asset matrix...').fill(primary.name)
    await assetRowActions.first().click()
    await viewDetailsButtons.last().click({ force: true })

    await expect(farRisksButton).toBeEnabled()
    await farRisksButton.click({ force: true })
    await expect(page).toHaveURL(new RegExp(`/far\\?id=${far.id}`))

    await page.goto('/asset')
    await page.getByPlaceholder('Scan asset matrix...').fill(primary.name)
    await assetRowActions.first().click()
    await viewDetailsButtons.last().click({ force: true })
    await auditButton.click({ force: true })
    await expect(page).toHaveURL(new RegExp(`/logs\\?target_table=devices&target_id=${primary.id}`))
    await expect(page.getByText(`Scoped: devices // ${primary.id}`)).toBeVisible()

    await page.goto('/asset')
    await page.getByPlaceholder('Scan asset matrix...').fill(systemName)
    const rows = page.locator('.ag-center-cols-container .ag-row')
    await expect(rows).toHaveCount(2, { timeout: 15_000 })
    await bulkActionsButton.click()
    await compareVisibleButton.click()
    await expect(page.getByText('System Matrix Comparison')).toBeVisible()

    await page.getByTitle('Sync all to this Environment').first().click()
    await expect(page.getByText('Sync Preview')).toBeVisible()
    await clickResilientButton(page, 'Apply Sync')

    await page.goto('/asset')
    await page.getByPlaceholder('Scan asset matrix...').fill(secondary.name)
    await expect(page.locator('[role="treegrid"]')).toContainText(secondary.name)

    await page.goto(`/monitoring?id=${monitoring.id}`)
    await expect(page).toHaveURL(/\/monitoring$/)
    await expect(page.getByRole('heading', { name: 'Monitoring' })).toBeVisible()
  })
})
