import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import { getWorkspaceLogicalRowByText, getWorkspaceRoot, resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'

test.describe('Assets Revert lifecycle', () => {
  test('reverts the immutable completed row operation after selection changes', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const { primary, secondary, systemName } = await seedOperationalScenario(request)

    await page.goto('/asset')
    await expect(getWorkspaceRoot(page, 'assets')).toBeVisible()
    await page.getByPlaceholder('Scan asset matrix...').fill(systemName)
    await expect((await getWorkspaceLogicalRowByText(page, 'assets', secondary.name)).center!).toBeVisible()

    const secondaryRow = await getWorkspaceLogicalRowByText(page, 'assets', secondary.name)
    await secondaryRow.action('More actions').click()
    await page.getByRole('button', { name: 'Archive', exact: true }).click()
    const archiveRequest = page.waitForRequest((entry) => entry.url().includes('/api/v1/devices/bulk-action'))
    const archiveResponse = page.waitForResponse((entry) => entry.url().includes('/api/v1/devices/bulk-action') && entry.status() === 200)
    await page.getByRole('button', { name: 'Confirm Archive?', exact: true }).click()
    expect((await archiveRequest).postDataJSON()).toMatchObject({ ids: [secondary.id], action: 'delete' })
    await archiveResponse

    const primaryRow = await getWorkspaceLogicalRowByText(page, 'assets', primary.name)
    await (await primaryRow.cell('name')).click()
    await expect(primaryRow.center!).toHaveClass(/ag-row-selected/)

    await expect(page.getByTitle(/Revert.*asset/i)).toHaveCount(0)
    const revert = page.getByRole('button', { name: 'Revert', exact: true })
    await expect(revert).toBeVisible()
    const restoreRequest = page.waitForRequest((entry) => entry.url().includes('/api/v1/devices/bulk-action'))
    const restoreResponse = page.waitForResponse((entry) => entry.url().includes('/api/v1/devices/bulk-action') && entry.status() === 200)
    await revert.click()
    await page.getByRole('button', { name: 'Confirm Undo?', exact: true }).click()
    expect((await restoreRequest).postDataJSON()).toMatchObject({ ids: [secondary.id], action: 'restore' })
    await restoreResponse
    await expect((await getWorkspaceLogicalRowByText(page, 'assets', secondary.name)).center!).toBeVisible()
    await expect(primaryRow.center!).toHaveClass(/ag-row-selected/)
  })
})
