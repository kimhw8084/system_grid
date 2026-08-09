import { expect, test } from '@playwright/test'

test.describe('FAR visible grid contract', () => {
  test('paints seeded FAR headers and cells with non-zero geometry', async ({ page }) => {
    const modesResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return response.request().method() === 'GET' && url.pathname === '/api/v1/far/modes'
    })

    await page.goto('/far', { waitUntil: 'domcontentloaded' })
    const modesResponse = await modesResponsePromise
    expect(modesResponse.ok()).toBeTruthy()

    const modes = await modesResponse.json()
    expect(Array.isArray(modes)).toBeTruthy()
    expect(modes.length).toBeGreaterThan(0)

    const shell = page.locator('[data-golden-workspace-shell="true"][data-workspace="far"]')
    const surface = shell.locator('[data-golden-grid-surface="true"]')
    const header = surface.locator('.ag-header').first()
    const bodyViewport = surface.locator('.ag-body-viewport').first()
    const firstRow = surface.locator('.ag-center-cols-container .ag-row').first()
    const firstTextCell = surface
      .locator('.ag-center-cols-container .ag-row .ag-cell')
      .filter({ hasText: /\S/ })
      .first()

    await expect(shell).toBeVisible()
    await expect(surface).toBeVisible()
    await expect(header).toBeVisible()
    await expect(bodyViewport).toBeVisible()
    await expect(firstRow).toBeVisible()
    await expect(firstTextCell).toBeVisible()

    await expect.poll(async () => (await surface.boundingBox())?.height ?? 0).toBeGreaterThan(300)
    await expect.poll(async () => (await header.boundingBox())?.height ?? 0).toBeGreaterThan(20)
    await expect.poll(async () => (await bodyViewport.boundingBox())?.height ?? 0).toBeGreaterThan(100)
    await expect.poll(async () => (await firstRow.boundingBox())?.height ?? 0).toBeGreaterThan(10)
    await expect.poll(async () => (await firstTextCell.boundingBox())?.width ?? 0).toBeGreaterThan(20)

    expect((await firstTextCell.innerText()).trim().length).toBeGreaterThan(0)
  })
})
