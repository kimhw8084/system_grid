import { expect, test } from '@playwright/test'

const PERSISTED_FAR_COLUMN_IDS = ['id', 'system_name', 'failure_type', 'title', 'severity', 'occurrence', 'detection', 'rpn', 'status', 'linked_rcas', 'created_by_user_id']

test.describe('FAR visible grid contract', () => {
  test('repairs persisted collapse and paints analytical cells in the operator viewport', async ({ page }) => {
    await page.addInitScript(({ columnIds }) => {
      localStorage.setItem('sysgrid_far_collaborative_views_v1_migrated', '1')
      localStorage.setItem('sysgrid_far_active_view_v2', JSON.stringify('local-collapsed'))
      localStorage.setItem('sysgrid_far_views_v2', JSON.stringify([{
        id: 'local-collapsed', name: 'Collapsed legacy layout', source: 'local',
        config: {
          fontSize: 11, rowDensity: 10, hiddenColumns: [], quickFilter: '',
          quickFilters: { system_name: [] }, filterModel: {}, sortModel: [],
          columnLayoutState: columnIds.map((colId: string) => ({ colId, hide: false, pinned: 'left', width: 2000 })),
        },
      }]))
    }, { columnIds: PERSISTED_FAR_COLUMN_IDS })

    const modesResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return response.request().method() === 'GET' && url.pathname === '/api/v1/far/modes'
    })

    await page.goto('/far?view=local-collapsed', { waitUntil: 'domcontentloaded' })
    const modesResponse = await modesResponsePromise
    expect(modesResponse.ok()).toBeTruthy()

    const modes = await modesResponse.json()
    expect(Array.isArray(modes)).toBeTruthy()
    expect(modes.length).toBeGreaterThan(0)

    const shell = page.locator('[data-golden-workspace-shell="true"][data-workspace="far"]')
    const surface = shell.locator('[data-golden-grid-surface="true"]')
    const header = surface.locator('.ag-header').first()
    const bodyViewport = surface.locator('.ag-body-viewport').first()
    const centerViewport = surface.locator('.ag-center-cols-viewport').first()
    const firstRow = surface.locator('.ag-center-cols-container .ag-row').first()
    const titleCell = surface.locator('.ag-center-cols-container .ag-row .ag-cell[col-id="title"]').filter({ hasText: /\S/ }).first()

    await expect(shell).toBeVisible()
    await expect(surface).toBeVisible()
    await expect(header).toBeVisible()
    await expect(bodyViewport).toBeVisible()
    await expect(centerViewport).toBeVisible()
    await expect(firstRow).toBeVisible()
    await expect(titleCell).toBeVisible()

    await expect.poll(async () => (await surface.boundingBox())?.height ?? 0).toBeGreaterThan(300)
    await expect.poll(async () => (await header.boundingBox())?.height ?? 0).toBeGreaterThan(20)
    await expect.poll(async () => (await bodyViewport.boundingBox())?.height ?? 0).toBeGreaterThan(100)
    await expect.poll(async () => (await centerViewport.boundingBox())?.width ?? 0).toBeGreaterThan(240)
    await expect.poll(async () => (await firstRow.boundingBox())?.height ?? 0).toBeGreaterThan(10)

    const viewportBox = await centerViewport.boundingBox()
    const cellBox = await titleCell.boundingBox()
    expect(viewportBox).not.toBeNull()
    expect(cellBox).not.toBeNull()
    if (!viewportBox || !cellBox) throw new Error('FAR viewport geometry unavailable')
    expect(Math.min(viewportBox.x + viewportBox.width, cellBox.x + cellBox.width) - Math.max(viewportBox.x, cellBox.x)).toBeGreaterThan(20)
    expect(Math.min(viewportBox.y + viewportBox.height, cellBox.y + cellBox.height) - Math.max(viewportBox.y, cellBox.y)).toBeGreaterThan(10)
    expect((await titleCell.innerText()).trim().length).toBeGreaterThan(0)
  })
})
