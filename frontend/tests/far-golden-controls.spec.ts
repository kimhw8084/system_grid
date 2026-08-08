import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import { clickResilientButton, resetBrowserState, waitForAppIdle } from './helpers/sysgrid'

test.describe('FAR Monitoring-golden controls', () => {
  test('keeps FAR domain depth while exposing the golden command and interaction surfaces', async ({ page, sysApi }) => {
    await resetBrowserState(page)

    const stamp = Date.now()
    const title = `PA16-FAR-GOLDEN-A-${stamp}`
    const secondTitle = `PA16-FAR-GOLDEN-B-${stamp}`
    for (const [index, modeTitle] of [title, secondTitle].entries()) {
      const create = await sysApi.post('/far/modes', {
        data: {
          system_name: 'PA16-GOLDEN-SYS',
          title: modeTitle,
          effect: 'Golden workspace interaction proof',
          severity: 8 - index,
          occurrence: 4 + index,
          detection: 3,
        },
      })
      expect(create.ok()).toBeTruthy()
    }

    await page.goto('/far')
    await waitForAppIdle(page)

    const shell = page.locator('[data-golden-workspace-shell="true"][data-workspace="far"]')
    await expect(shell).toBeVisible()
    await expect(shell).toHaveAttribute('data-golden-archetype', 'analytical')
    await expect(shell.locator('[data-golden-grid-surface="true"]')).toBeVisible()
    await expect(shell.getByText(title)).toBeVisible()

    for (const label of ['Views', 'Display', 'Filters', 'Insights', 'Activity', 'Compare', 'Bulk Actions', 'Import', 'Add Failure Mode']) {
      await expect(shell.getByRole('button', { name: new RegExp(label, 'i') }).first()).toBeVisible()
    }
    await expect(shell.getByTitle('Export CSV')).toBeVisible()
    await expect(shell.getByTitle('Copy to Clipboard')).toBeVisible()
    await expect(shell.getByTitle('Matrix Registry Enums')).toBeVisible()

    await shell.getByRole('button', { name: /^Views$/i }).click()
    await expect(page.getByText('Saved views', { exact: true })).toBeVisible()
    await expect(page.getByText('Current FAR workspace', { exact: true })).toBeVisible()
    await clickResilientButton(page, 'Close saved views')

    await shell.getByRole('button', { name: /^Display$/i }).click()
    await expect(page.getByText('Display density', { exact: true })).toBeVisible()
    await expect(page.getByText('Columns', { exact: true })).toBeVisible()
    await shell.getByRole('button', { name: /^Display$/i }).click()

    await shell.getByRole('button', { name: /^Filters$/i }).click()
    await expect(shell.getByRole('button', { name: /^ALL$/i })).toBeVisible()

    await shell.getByRole('button', { name: /^Insights$/i }).click()
    await expect(shell.getByText('Reliability Index', { exact: true })).toBeVisible()

    await shell.getByRole('button', { name: /^Activity$/i }).click()
    await expect(shell.getByTestId('far-activity-panel')).toBeVisible()
    await expect(shell.getByText('FAR Activity', { exact: true })).toBeVisible()

    const row = shell.locator('.ag-row').filter({ hasText: title }).first()
    const secondRow = shell.locator('.ag-row').filter({ hasText: secondTitle }).first()
    await expect(row).toBeVisible()
    await expect(secondRow).toBeVisible()
    await row.locator('.ag-selection-checkbox').click()
    await secondRow.locator('.ag-selection-checkbox').click()

    const compare = shell.getByRole('button', { name: /^Compare$/i })
    const bulk = shell.getByRole('button', { name: /Bulk Actions/i })
    await expect(compare).toBeEnabled()
    await compare.click()
    const compareDialog = page.getByRole('dialog').filter({ hasText: 'Compare Failure Modes' })
    await expect(compareDialog).toBeVisible()
    await expect(compareDialog.getByText(title, { exact: true })).toBeVisible()
    await expect(compareDialog.getByText(secondTitle, { exact: true })).toBeVisible()
    await compareDialog.getByRole('button', { name: /Close/i }).last().click()

    await expect(bulk).toBeEnabled()
    await bulk.click()
    await expect(page.getByText('Bulk actions', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Copy selected/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Export selected/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Retire selected/i })).toBeVisible()
    await bulk.click()

    await row.click({ button: 'right' })
    await expect(page.getByText('Row actions', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Open details/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Edit/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Copy row/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Retire failure vector/i })).toBeVisible()
  })
})
