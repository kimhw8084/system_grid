import { clickResilientButton, resetBrowserState, seedOperationalScenario, selectGridCheckboxRows } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';

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
    const compareVisibleButton = page.getByRole('button', { name: 'Compare', exact: true })

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
    await selectGridCheckboxRows(page, [0, 1])
    await bulkActionsButton.click()
    await compareVisibleButton.click()
    await expect(page.getByText('Compare Assets')).toBeVisible()

    await page.keyboard.press('Escape')

    await page.goto('/asset')
    await page.getByPlaceholder('Scan asset matrix...').fill(secondary.name)
    await expect(page.locator('[role="treegrid"]')).toContainText(secondary.name)

    // E2E Verification of Soft-Delete, Scope-Switch, and Restore lifecycle
    const moreActions = page.getByTitle('More actions').first()
    await moreActions.click({ force: true })
    await page.getByRole('button', { name: 'Soft Delete' }).click({ force: true })
    await page.getByRole('button', { name: 'Confirm', exact: true }).click({ force: true })

    // Switch to Purged Tab and verify row is present in Deleted scope
    await page.getByRole('button', { name: /Purged/ }).click({ force: true })
    await page.getByPlaceholder('Scan asset matrix...').fill(secondary.name)
    await expect(page.locator('[role="treegrid"]')).toContainText(secondary.name)

    // Restore back to Existing scope
    await moreActions.click({ force: true })
    await page.getByRole('button', { name: 'Restore' }).click({ force: true })
    await page.getByRole('button', { name: 'Confirm', exact: true }).click({ force: true })

    // Switch back to Existing tab and verify restored row is present
    await page.getByRole('button', { name: /Existing/ }).click({ force: true })
    await page.getByPlaceholder('Scan asset matrix...').fill(secondary.name)
    await expect(page.locator('[role="treegrid"]')).toContainText(secondary.name)

    // E2E Verification of Toolbar Export flyout and Import modal reachability
    const exportBtn = page.getByTitle('Export asset data')
    await exportBtn.click({ force: true })
    await expect(page.getByText('Export CSV')).toBeVisible()
    await expect(page.getByText('Export Template')).toBeVisible()

    // Dismiss export flyout by clicking outside
    await page.mouse.click(10, 10)
    await expect(page.getByText('Export CSV')).not.toBeVisible()

    // Open and close import modal cleanly
    await page.getByRole('button', { name: 'Import' }).click({ force: true })
    await expect(page.getByText('Data Ingestion Pipeline')).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).last().click({ force: true })
    await expect(page.getByText('Data Ingestion Pipeline')).not.toBeVisible()

    await page.goto(`/monitoring?id=${monitoring.id}`)
    await expect(page).toHaveURL(/\/monitoring$/)
    await expect(page.getByRole('heading', { name: 'Monitoring' })).toBeVisible()
  })
})
