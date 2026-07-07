import { clickResilientButton, fillGridSearch, openToolbarButton, resetBrowserState, seedOperationalScenario, selectGridCheckboxRows, verifyGridRowRobust } from './helpers/sysgrid';
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
    await fillGridSearch(page, 'Scan asset matrix...', secondary.name)
    await verifyGridRowRobust(page, secondary.name)

    // A. Toolbar / Export / Template Enabled state check when rows exist
    await page.getByTitle('Export asset data').click()
    await expect(page.getByRole('button', { name: /^Export CSV/ })).toBeEnabled()
    await expect(page.getByRole('button', { name: /^Snapshot/ })).toBeEnabled()
    await expect(page.getByRole('button', { name: /^Export Template/ })).toBeEnabled()
    // Dismiss export flyout by clicking outside
    await page.mouse.click(10, 10)
    await expect(page.getByRole('button', { name: /^Export CSV/ })).not.toBeVisible()

    // Settle layout before action click
    await page.waitForTimeout(1000)

    // E2E Verification of Soft-Delete and Scope-Switch lifecycle
    await page.getByTitle('More actions').filter({ visible: true }).first().click({ force: true })
    await page.waitForTimeout(500)
    await clickResilientButton(page, 'Soft Delete')
    await page.waitForTimeout(500)

    const deleteResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/v1/devices/bulk-action') && response.status() === 200
    )
    await clickResilientButton(page, 'Confirm Archive?')
    await deleteResponsePromise

    // Settle React state before tab switch
    await page.waitForTimeout(1000)

    // Switch to Purged Tab and verify row is present in Deleted scope
    await openToolbarButton(page, /Purged/)
    await fillGridSearch(page, 'Scan asset matrix...', secondary.name)
    await verifyGridRowRobust(page, secondary.name)

    // Settle layout before action click
    await page.waitForTimeout(1000)

    // Perform permanent Purge lifecycle path on the deleted row
    await page.getByTitle('More actions').filter({ visible: true }).first().click({ force: true })
    await page.waitForTimeout(500)
    await clickResilientButton(page, /^Purge$/)
    await page.waitForTimeout(500)

    const purgeResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/v1/devices/bulk-action') && response.status() === 200
    )
    await clickResilientButton(page, 'Confirm Purge?')
    await purgeResponsePromise

    // Verify row has disappeared completely from Purged scope by reloading the page
    await page.goto('/asset')
    await openToolbarButton(page, /Purged/)
    await fillGridSearch(page, 'Scan asset matrix...', secondary.name)
    await expect(page.getByText('No assets match the current working view')).toBeVisible()

    // Verify row has not returned to Existing scope either on clean reload
    await openToolbarButton(page, /Existing/)
    await fillGridSearch(page, 'Scan asset matrix...', secondary.name)
    await expect(page.getByText('No assets match the current working view')).toBeVisible()

    // B. Toolbar / Export / Template Disabled state check when the registry is empty or filtered-empty
    await page.getByTitle('Export asset data').click()
    await expect(page.getByRole('button', { name: /^Export CSV/ })).toBeDisabled()
    await expect(page.getByRole('button', { name: /^Snapshot/ })).toBeDisabled()
    await expect(page.getByRole('button', { name: /^Export Template/ })).toBeEnabled()
    // Dismiss export flyout by clicking outside
    await page.mouse.click(10, 10)

    // Open and close import modal cleanly
    await clickResilientButton(page, 'Import')
    await expect(page.getByText('Assets Import')).toBeVisible()
    await clickResilientButton(page, 'Close')
    await expect(page.getByText('Assets Import')).not.toBeVisible()

    await page.goto(`/monitoring?id=${monitoring.id}`)
    await expect(page).toHaveURL(/\/monitoring$/)
    await expect(page.getByRole('heading', { name: 'Monitoring' })).toBeVisible()
  })
})
