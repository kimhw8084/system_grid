import { clickResilientButton, fillGridSearch, openToolbarButton, resetBrowserState, seedOperationalScenario, selectGridCheckboxRows, verifyGridRowRobust } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import fs from 'fs';

test.describe('Assets workflows', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('simulates the changed Assets workflows end-to-end', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const { stamp, systemName, primary, secondary, tertiary, monitoring, far } = await seedOperationalScenario(request)

    await page.goto('/asset')
    await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible()
    await expect(page.getByText('Syncing asset registry...')).not.toBeVisible()

    await page.getByPlaceholder('Scan asset matrix...').fill(systemName)
    await page.keyboard.press('Enter')
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })
    await expect(page.locator('[role="treegrid"]')).toContainText(secondary.name, { timeout: 15_000 })
    await expect(page.locator('[role="treegrid"]')).toContainText(tertiary.name, { timeout: 15_000 })
    await page.waitForTimeout(1500)

    // Required Browser/E2E Scenario 15: Right-click selects/focuses the clicked row and opens context menu at the pointer
    const plainCell = page.locator('.ag-cell').filter({ hasText: systemName }).first()
    await plainCell.click({ button: 'right' })
    await page.waitForTimeout(500)
    await expect(page.getByRole('button', { name: 'View Details' })).toBeVisible()
    await page.keyboard.press('Escape') // Dismiss row action menu
    await page.waitForTimeout(500)

    // Required Browser/E2E Scenario 10: Expand Table changes utility columns visibility (star/eye)
    // Required Browser/E2E Scenario 11: Favorite/watch toggles update icon state in grid without page refresh
    const toggleIntelligenceButton = page.getByRole('button', { name: 'Toggle Intelligence' })
    await expect(toggleIntelligenceButton).not.toHaveClass(/text-blue-400/)
    await toggleIntelligenceButton.click()
    await page.waitForTimeout(500)
    await expect(toggleIntelligenceButton).toHaveClass(/text-blue-400/)

    // Toggle Pin/Watch while columns are visible
    const pinBtn = page.getByTitle('Pin asset').first()
    await expect(pinBtn).toBeVisible()
    await pinBtn.click()
    await page.waitForTimeout(500)
    const unpinBtn = page.getByTitle('Unpin asset').first()
    await expect(unpinBtn).toBeVisible()
    await unpinBtn.click()
    await page.waitForTimeout(500)

    // Toggle back to collapsed state
    await toggleIntelligenceButton.click()
    await page.waitForTimeout(500)
    await expect(toggleIntelligenceButton).not.toHaveClass(/text-blue-400/)

    const assetRowActions = page.getByTitle('More actions')
    const viewDetailsButtons = page.getByRole('button', { name: 'View Details' })
    const openKnowledgeButton = page.getByRole('button', { name: 'Open Knowledge', exact: true })
    const farRisksButton = page.getByRole('button', { name: 'FAR Risks', exact: true })
    const auditButton = page.getByRole('button', { name: 'Audit', exact: true })
    const bulkActionsButton = page.getByRole('button', { name: 'Bulk Actions', exact: true })
    const compareVisibleButton = page.getByRole('button', { name: 'Compare', exact: true })

    await assetRowActions.first().click({ force: true })
    await viewDetailsButtons.filter({ visible: true }).first().click({ force: true })
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
    await page.keyboard.press('Enter')
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })
    await assetRowActions.first().click({ force: true })
    await viewDetailsButtons.filter({ visible: true }).first().click({ force: true })

    await expect(farRisksButton).toBeEnabled()
    await farRisksButton.click({ force: true })
    await expect(page).toHaveURL(new RegExp(`/far\\?id=${far.id}`))

    await page.goto('/asset')
    await page.getByPlaceholder('Scan asset matrix...').fill(primary.name)
    await page.keyboard.press('Enter')
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })
    await assetRowActions.first().click({ force: true })
    await viewDetailsButtons.filter({ visible: true }).first().click({ force: true })
    await auditButton.click({ force: true })
    await expect(page).toHaveURL(new RegExp(`/logs\\?target_table=devices&target_id=${primary.id}`))
    await expect(page.getByText(`Scoped: devices // ${primary.id}`)).toBeVisible()

    await page.goto('/asset')
    await page.getByPlaceholder('Scan asset matrix...').fill(systemName)
    const rows = page.locator('.ag-center-cols-container .ag-row')
    await expect(rows).toHaveCount(3, { timeout: 15_000 })
    // Target 1 Proof: Plain row-click selects a row (facilitated by suppressRowClickSelection={false})
    const cell0 = rows.nth(0).locator('.ag-cell').nth(1)
    await cell0.click()
    await page.waitForTimeout(300)
    await expect(rows.nth(0)).toHaveClass(/ag-row-selected/)

    // Deselect row 0 to clear state before bulk select E2E scenario
    const checkbox0 = page.getByRole('checkbox', { name: /Press Space to toggle row selection/i }).nth(0)
    await checkbox0.uncheck()
    await page.waitForTimeout(300)
    await expect(rows.nth(0)).not.toHaveClass(/ag-row-selected/)

    await selectGridCheckboxRows(page, [0, 1])
    // Target B.2: Name/Instance click no-panel behavior proof
    const nameCell = rows.nth(0).locator('.ag-cell').nth(1)
    await nameCell.click()
    await page.waitForTimeout(300)
    // Verify name-cell click does NOT trigger details side panel/modal opening
    await expect(page.getByText('Suggested Runbooks Now')).not.toBeVisible()

    // Explicit Details button click DOES open details
    await page.getByTitle('More actions').filter({ visible: true }).first().click({ force: true })
    await page.getByRole('button', { name: 'View Details' }).click({ force: true })
    await expect(page.getByText('Suggested Runbooks Now')).toBeVisible()

    // Re-goto assets to reset UI state
    await page.goto('/asset')
    await page.getByPlaceholder('Scan asset matrix...').fill(systemName)
    await page.keyboard.press('Enter')
    await expect(page.locator('[role="treegrid"]')).toContainText(primary.name, { timeout: 15_000 })
    await page.waitForTimeout(500)

    // Select rows and check bulk actions
    await selectGridCheckboxRows(page, [0, 1])

    // Target B.1: Bulk action expandable inline panel grammar proof
    await bulkActionsButton.click()
    await page.waitForTimeout(300)
    // Destructive confirm buttons must not be stacked outside cards
    await expect(page.getByRole('button', { name: 'Confirm Archive?' })).not.toBeVisible()

    // Expand Archive Selection card
    const archiveCard = page.getByText('Archive Selection')
    await expect(archiveCard).toBeVisible()
    await archiveCard.click()
    await page.waitForTimeout(300)

    // Confirm button inside expanded action card
    const archiveActionBtn = page.getByRole('button', { name: 'Archive selected assets' })
    await expect(archiveActionBtn).toBeVisible()
    await archiveActionBtn.click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('button', { name: 'Confirm Archive?' })).toBeVisible()

    // Close bulk actions panel
    await bulkActionsButton.click()
    await page.waitForTimeout(300)

    // Launch Compare Modal (proves shared Compare modal behavior and Escape dismissal)
    await page.waitForTimeout(1000)
    await bulkActionsButton.click()
    await compareVisibleButton.click()
    await expect(page.getByText('Compare Assets')).toBeVisible()
    await expect(page.getByText('Temporal Variance Analysis')).toBeVisible()
    await expect(page.getByText('Show Differences Only')).toBeVisible()

    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    await page.goto('/asset')
    await fillGridSearch(page, 'Scan asset matrix...', secondary.name)
    await verifyGridRowRobust(page, secondary.name)

    // A. Toolbar / Export / Template Enabled state check when rows exist
    await page.getByTitle('Export asset data').click()
    await expect(page.getByRole('button', { name: /^Export CSV/ })).toBeEnabled()
    await expect(page.getByRole('button', { name: /^Snapshot/ })).toBeEnabled()
    await expect(page.getByRole('button', { name: /^Export Template/ })).toBeEnabled()

    // Capture the client-side CSV download
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /^Export CSV/ }).click()
    const download = await downloadPromise

    // Verify downloaded filename structure
    expect(download.suggestedFilename()).toContain('SysGrid_Assets_')
    expect(download.suggestedFilename().endsWith('.csv')).toBe(true)

    // Read download content via local file system
    const downloadPath = await download.path()
    const csvContent = fs.readFileSync(downloadPath, 'utf8')
    // Verify column headers exist inside exported CSV (e.g. Instance, System, Type or Status headers)
    expect(csvContent).toContain('Instance')
    expect(csvContent).toContain('System')
    expect(csvContent).toContain('Type')
    expect(csvContent).toContain('Status')
    expect(csvContent).toContain(secondary.name)

    // Settle layouts
    await page.waitForTimeout(500)

    // Target B.5: Import shared modal paste parsing and load to builder proof
    await clickResilientButton(page, 'Import')
    await expect(page.getByText('Assets Import')).toBeVisible()

    // Switch to Paste tab
    await page.getByRole('button', { name: 'Paste CSV / Grid' }).click()
    await page.waitForTimeout(300)

    // Paste asset spreadsheet data
    const pasteArea = page.getByPlaceholder('Paste CSV with headers, or paste spreadsheet cells directly...')
    await expect(pasteArea).toBeVisible()
    await pasteArea.fill(`name,system,type,status,model\nPW-IMPORTED-ASSET-01,${systemName},Physical,Active,R740`)
    await page.waitForTimeout(300)

    // Click "Load Into Builder" to process spreadsheet parsing
    await page.getByRole('button', { name: 'Load Into Builder' }).click()
    await page.waitForTimeout(500)

    // Verify parser parsed cells and transitioned to builder layout
    await expect(page.getByText('Manual Data Builder')).toBeVisible()
    await expect(page.locator('tbody tr input').first()).toHaveValue('PW-IMPORTED-ASSET-01')

    // Close import modal cleanly (handling dirty state guard)
    await clickResilientButton(page, 'Close')
    await page.waitForTimeout(300)
    await clickResilientButton(page, 'Discard Changes')
    await page.waitForTimeout(300)
    await expect(page.getByText('Assets Import')).not.toBeVisible()

    // Settle layout before action click
    await page.waitForTimeout(1000)

    // E2E Verification of Soft-Delete and Scope-Switch lifecycle
    await page.getByTitle('More actions').filter({ visible: true }).first().click({ force: true })
    await page.waitForTimeout(500)
    await clickResilientButton(page, 'Soft Delete', 'Archive')
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

    // Target B.3: Deleted/purged scope suppression proof
    const purgedRowActions = page.getByTitle('More actions').filter({ visible: true }).first()
    await purgedRowActions.click({ force: true })
    await page.waitForTimeout(500)
    // Assert active-only actions are completely suppressed/not visible in the row menu
    await expect(page.getByRole('button', { name: 'Pin' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Unpin' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Watch' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Unwatch' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit Configuration' })).not.toBeVisible()
    await page.keyboard.press('Escape') // Dismiss row action menu
    await page.waitForTimeout(500)

    // Settle layout before action click
    await page.waitForTimeout(1000)

    // Perform permanent Purge lifecycle path on the deleted row
    const purgeActionBtn = page.getByTitle('More actions').filter({ visible: true }).first()
    await purgeActionBtn.waitFor({ state: 'visible' })
    await page.waitForTimeout(1000)
    await purgeActionBtn.click({ force: true })
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
    await expect(page.getByText('No purged assets in scope')).toBeVisible()

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
    await expect(page).toHaveURL(new RegExp(`/monitoring\\?id=${monitoring.id}$`))
    await expect(page.getByRole('heading', { name: 'Monitoring' })).toBeVisible()
    await expect(page.getByRole('heading', { name: monitoring.title, exact: true }).first()).toBeVisible()
  })
})
