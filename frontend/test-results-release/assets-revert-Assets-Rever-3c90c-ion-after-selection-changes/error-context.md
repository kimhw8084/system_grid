# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assets-revert.spec.ts >> Assets Revert lifecycle >> reverts the immutable completed row operation after selection changes
- Location: tests/assets-revert.spec.ts:6:3

# Error details

```
Error: expect(locator).toHaveClass(expected) failed

Locator: locator('[data-workspace="assets"]:visible').filter({ has: getByRole('heading') }).first().locator('.ag-center-cols-container .ag-row[row-id=\\34 08]').first()
Expected pattern: /ag-row-selected/
Received string:  "ag-row-even ag-row ag-row-level-0 operational-grid-row-even ag-row-position-absolute ag-row-first ag-row-not-inline-editing ag-row-focus"
Timeout: 15000ms

Call log:
  - Expect "toHaveClass" with timeout 15000ms
  - waiting for locator('[data-workspace="assets"]:visible').filter({ has: getByRole('heading') }).first().locator('.ag-center-cols-container .ag-row[row-id=\\34 08]').first()
    33 × locator resolved to <div role="row" row-id="408" row-index="0" aria-rowindex="2" aria-selected="false" class="ag-row-even ag-row ag-row-level-0 operational-grid-row-even ag-row-position-absolute ag-row-first ag-row-not-inline-editing ag-row-focus">…</div>
       - unexpected value "ag-row-even ag-row ag-row-level-0 operational-grid-row-even ag-row-position-absolute ag-row-first ag-row-not-inline-editing ag-row-focus"

```

```yaml
- row "PW-SYS-1784873636514-b73jjx Physical Maintenance Production Unowned":
  - gridcell "PW-SYS-1784873636514-b73jjx"
  - gridcell "Physical"
  - gridcell "Maintenance"
  - gridcell "Production"
  - gridcell "Unowned"
```

# Test source

```ts
  1  | import { expect } from '@playwright/test'
  2  | import { test } from './helpers/sysgrid-test'
  3  | import { getWorkspaceLogicalRowByText, getWorkspaceRoot, resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'
  4  | 
  5  | test.describe('Assets Revert lifecycle', () => {
  6  |   test('reverts the immutable completed row operation after selection changes', async ({ page, sysApi: request }) => {
  7  |     await resetBrowserState(page)
  8  |     const { primary, secondary, systemName } = await seedOperationalScenario(request)
  9  | 
  10 |     await page.goto('/asset')
  11 |     await expect(getWorkspaceRoot(page, 'assets')).toBeVisible()
  12 |     await page.getByPlaceholder('Scan asset matrix...').fill(systemName)
  13 |     await expect((await getWorkspaceLogicalRowByText(page, 'assets', secondary.name)).center!).toBeVisible()
  14 | 
  15 |     const secondaryRow = await getWorkspaceLogicalRowByText(page, 'assets', secondary.name)
  16 |     await secondaryRow.action('More actions').click()
  17 |     await page.getByRole('button', { name: 'Archive', exact: true }).click()
  18 |     const archiveRequest = page.waitForRequest((entry) => entry.url().includes('/api/v1/devices/bulk-action'))
  19 |     const archiveResponse = page.waitForResponse((entry) => entry.url().includes('/api/v1/devices/bulk-action') && entry.status() === 200)
  20 |     await page.getByRole('button', { name: 'Confirm Archive?', exact: true }).click()
  21 |     expect((await archiveRequest).postDataJSON()).toMatchObject({ ids: [secondary.id], action: 'delete' })
  22 |     await archiveResponse
  23 | 
  24 |     const primaryRow = await getWorkspaceLogicalRowByText(page, 'assets', primary.name)
  25 |     await (await primaryRow.cell('name')).click()
  26 |     await expect(primaryRow.center!).toHaveClass(/ag-row-selected/)
  27 | 
  28 |     await expect(page.getByTitle(/Revert.*asset/i)).toHaveCount(0)
  29 |     const revert = page.getByRole('button', { name: 'Revert', exact: true })
  30 |     await expect(revert).toBeVisible()
  31 |     const restoreRequest = page.waitForRequest((entry) => entry.url().includes('/api/v1/devices/bulk-action'))
  32 |     const restoreResponse = page.waitForResponse((entry) => entry.url().includes('/api/v1/devices/bulk-action') && entry.status() === 200)
  33 |     await revert.click()
  34 |     await page.getByRole('button', { name: 'Confirm Undo?', exact: true }).click()
  35 |     expect((await restoreRequest).postDataJSON()).toMatchObject({ ids: [secondary.id], action: 'restore' })
  36 |     await restoreResponse
  37 |     await expect((await getWorkspaceLogicalRowByText(page, 'assets', secondary.name)).center!).toBeVisible()
> 38 |     await expect(primaryRow.center!).toHaveClass(/ag-row-selected/)
     |                                      ^ Error: expect(locator).toHaveClass(expected) failed
  39 |   })
  40 | })
  41 | 
```