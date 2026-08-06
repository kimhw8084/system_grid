import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import { clickResilientButton, resetBrowserState, waitForAppIdle } from './helpers/sysgrid'

async function waitForFAR(page: any) {
  await waitForAppIdle(page)
  const workspace = page.locator('[data-workspace="far"]')
  await expect(workspace).toBeVisible({ timeout: 15_000 })
  await expect(workspace.locator('[data-far-loading="true"]')).toBeHidden({ timeout: 15_000 })
  return workspace
}

async function waitForSettledAnchoredGeometry(page: any, trigger: any, panel: any) {
  let previousSignature = ''
  let consecutiveMatches = 0
  let latest: { triggerBox: any; panelBox: any; scrollSurfaceBox: any; viewport: any } | null = null
  await expect.poll(async () => {
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    const panelHandle = await panel.elementHandle()
    if (!panelHandle) return false
    try {
      latest = await trigger.evaluate((triggerElement: HTMLElement, panelElement: HTMLElement) => {
        const triggerRect = triggerElement.getBoundingClientRect()
        const panelRect = panelElement.getBoundingClientRect()
        const scrollSurface = panelElement.querySelector<HTMLElement>('[data-workspace-panel-scroll-surface="true"]')
        const scrollRect = scrollSurface?.getBoundingClientRect()
        return {
          triggerBox: { x: triggerRect.x, y: triggerRect.y, width: triggerRect.width, height: triggerRect.height },
          panelBox: { x: panelRect.x, y: panelRect.y, width: panelRect.width, height: panelRect.height },
          scrollSurfaceBox: scrollRect ? { x: scrollRect.x, y: scrollRect.y, width: scrollRect.width, height: scrollRect.height } : null,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        }
      }, panelHandle)
    } finally {
      await panelHandle.dispose()
    }
    if (!latest?.scrollSurfaceBox) return false
    const { triggerBox, panelBox, scrollSurfaceBox, viewport } = latest
    const signature = JSON.stringify([
      triggerBox.x, triggerBox.y, triggerBox.width, triggerBox.height,
      panelBox.x, panelBox.y, panelBox.width, panelBox.height,
      scrollSurfaceBox.x, scrollSurfaceBox.y, scrollSurfaceBox.width, scrollSurfaceBox.height,
      viewport.width, viewport.height,
    ])
    if (signature === previousSignature) consecutiveMatches += 1
    else consecutiveMatches = 0
    previousSignature = signature
    return consecutiveMatches >= 2
  }, { timeout: 10_000 }).toBe(true)
  if (!latest) throw new Error('Anchored panel geometry did not become measurable')
  return latest
}

function findMissingHeaders(available: string[], required: string[]) {
  const normalized = new Set(available.map((label) => label.replace(/\s+/g, ' ').trim()).filter(Boolean))
  return required.filter((label) => !normalized.has(label))
}

async function collectReachableHeaders(page: any, grid: any, required: string[]) {
  const centerViewport = grid.locator('.ag-center-cols-viewport')
  await expect(centerViewport).toBeAttached()

  const headers = new Set<string>()
  const collectInstantiatedHeaders = async () => {
    for (const text of await grid.locator('.ag-header-cell').allTextContents()) {
      const normalized = text.replace(/\s+/g, ' ').trim()
      if (normalized) headers.add(normalized)
    }
  }
  await collectInstantiatedHeaders()

  const metrics = await centerViewport.evaluate((element: HTMLElement) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    maxScrollLeft: Math.max(0, element.scrollWidth - element.clientWidth),
  }))
  expect(metrics.clientWidth, 'FAR center-column viewport must have measurable width').toBeGreaterThan(0)
  expect(metrics.scrollWidth).toBeGreaterThanOrEqual(metrics.clientWidth)
  const initiallyMissing = findMissingHeaders([...headers], required)
  if (initiallyMissing.length > 0) {
    expect(
      metrics.maxScrollLeft,
      `FAR center-column viewport must overflow when required headers are virtualized. Initially missing: ${initiallyMissing.join(', ')}`,
    ).toBeGreaterThan(0)

    const firstCell = grid.locator('.ag-center-cols-container .ag-row .ag-cell').first()
    await expect(firstCell).toBeVisible()
    await firstCell.click()
    const maximumKeyboardSteps = Math.min(512, Math.max(96, Math.ceil(metrics.maxScrollLeft / 10) + 32))
    const leadingScrollPositions: number[] = []
    for (let index = 0; index < maximumKeyboardSteps; index += 1) {
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      const position = await centerViewport.evaluate((element: HTMLElement) => element.scrollLeft)
      leadingScrollPositions.push(position)
      if (position <= 2) break
      await page.keyboard.press('ArrowLeft')
    }
    expect(
      Math.min(...leadingScrollPositions),
      `Keyboard traversal must establish the FAR leading edge before scanning. Observed: ${leadingScrollPositions.join(', ')}`,
    ).toBeLessThanOrEqual(2)

    const observedScrollPositions: number[] = []
    for (let index = 0; index < maximumKeyboardSteps; index += 1) {
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await collectInstantiatedHeaders()
      const position = await centerViewport.evaluate((element: HTMLElement) => element.scrollLeft)
      observedScrollPositions.push(position)
      if (position >= metrics.maxScrollLeft - 2 && findMissingHeaders([...headers], required).length === 0) break
      await page.keyboard.press('ArrowRight')
    }
    expect(
      Math.max(...observedScrollPositions),
      `Keyboard traversal must reach the measured FAR maximum ${metrics.maxScrollLeft}. Observed: ${observedScrollPositions.join(', ')}`,
    ).toBeGreaterThanOrEqual(metrics.maxScrollLeft - 2)

    const restoredScrollPositions: number[] = []
    for (let index = 0; index < maximumKeyboardSteps; index += 1) {
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      const position = await centerViewport.evaluate((element: HTMLElement) => element.scrollLeft)
      restoredScrollPositions.push(position)
      if (position <= 2) break
      await page.keyboard.press('ArrowLeft')
    }
    expect(
      Math.min(...restoredScrollPositions),
      `Keyboard traversal must restore the measured FAR leading edge. Observed: ${restoredScrollPositions.join(', ')}`,
    ).toBeLessThanOrEqual(2)
  }

  return [...headers]
}

async function expectReachableHeaders(page: any, grid: any, required: string[]) {
  const available = await collectReachableHeaders(page, grid, required)
  expect(findMissingHeaders(available, required), `Missing reachable FAR headers. Available: ${available.join(', ')}`).toEqual([])
  return available
}

test.describe('FAR whole-view golden workspace', () => {
  test('retains the detailed FAR runtime inside the Monitoring-protected shell', async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await resetBrowserState(page)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/far')
    const workspace = await waitForFAR(page)

    await expect(workspace.locator('[data-golden-command-bar="true"]')).toBeVisible()
    await expect(workspace.getByRole('button', { name: 'Add Failure Mode' })).toBeEnabled()
    await expect(workspace.locator('[data-far-summary="true"]')).toHaveCount(0)
    await expect(workspace.locator('[data-far-mode-control="true"]')).toBeVisible()

    const grid = workspace.locator('[data-far-grid="true"]')
    await expect(grid).toBeVisible()
    const canonicalHeaders = ['Failure Mode', 'Risk', 'Status', 'Owner', 'System', 'Type', 'Effect', 'Affected Scope', 'RPN']
    const failureModeHeaders = await expectReachableHeaders(page, grid, canonicalHeaders)
    expect(findMissingHeaders(['Failure Mode', 'Risk'], ['Failure Mode', 'RPN'])).toEqual(['RPN'])
    expect(findMissingHeaders(failureModeHeaders, canonicalHeaders)).toEqual([])

    await workspace.getByRole('tab', { name: 'Causes' }).click()
    await expect(grid.getByRole('columnheader', { name: 'Causes', exact: true })).toBeVisible()
    await expectReachableHeaders(page, grid, [...canonicalHeaders, 'Causes'])
    await workspace.getByRole('tab', { name: 'Mitigations' }).click()
    await expectReachableHeaders(page, grid, [...canonicalHeaders, 'Mitigations'])
    await workspace.getByRole('tab', { name: 'Prevention' }).click()
    await expectReachableHeaders(page, grid, [...canonicalHeaders, 'Prevention'])
    await workspace.getByRole('tab', { name: 'Failure Modes' }).click()
    await expectReachableHeaders(page, grid, canonicalHeaders)

    const gridBoxBeforeInsights = await grid.boundingBox()
    await clickResilientButton(page, 'Insights')
    await expect(workspace.locator('[data-far-insights="true"]')).toBeVisible()
    const totalMetric = workspace.locator('[data-far-metric="failure-modes"]')
    await expect.poll(async () => Number((await totalMetric.locator('h4').textContent()) || 0)).toBeGreaterThan(0)
    expect(await grid.boundingBox()).toEqual(gridBoxBeforeInsights)
    await clickResilientButton(page, 'Insights')
    await expect(workspace.locator('[data-far-insights="true"]')).toHaveCount(0)

    await clickResilientButton(page, 'Display')
    await expect(page.locator('[data-far-display-controls="true"]')).toBeVisible()
    await clickResilientButton(page, 'Display')
    await clickResilientButton(page, 'Filters')
    await expect(page.locator('[data-far-filter-bar="true"]')).toBeVisible()
    await clickResilientButton(page, 'Filters')
    await expect(page.locator('[data-far-filter-bar="true"]')).toHaveCount(0)

    const riskHeader = grid.getByRole('columnheader', { name: 'Risk', exact: true })
    await riskHeader.click()
    await expect(riskHeader).toHaveAttribute('aria-sort', /ascending|descending/)

    const rows = grid.locator('.ag-center-cols-container .ag-row')
    await expect.poll(() => rows.count()).toBeGreaterThan(0)
    const firstRow = rows.first()
    const firstTitle = ((await firstRow.locator('[col-id="title"]').textContent()) || '').trim()
    expect(firstTitle.length).toBeGreaterThan(0)
    const gridBoxBeforeDossier = await grid.boundingBox()
    await grid.locator('.ag-pinned-right-cols-container .ag-row').first().locator('button[title="Matrix Detail"]').click()

    const detail = workspace.locator('[data-far-detail-record]')
    await expect(detail).toBeVisible()
    await expect(detail).toHaveAttribute('aria-label', 'Failure mode dossier')
    expect(await grid.boundingBox()).toEqual(gridBoxBeforeDossier)
    await expect(detail.getByText('Effect Forensics:')).toBeVisible()
    await expect(detail.getByRole('button', { name: /Causal Forensics/i })).toBeVisible()
    await expect.poll(() => new URL(page.url()).searchParams.get('far')).not.toBeNull()

    const deepLink = page.url()
    await page.reload()
    await waitForFAR(page)
    await expect(page.locator('[data-far-detail-record]')).toBeVisible()
    expect(page.url()).toBe(deepLink)

    await clickResilientButton(page, 'Close failure mode dossier')
    const viewsButton = workspace.getByRole('button', { name: 'Views', exact: true })
    await viewsButton.click()
    const viewsPanel = page.locator('[data-workspace-panel-key="views-menu"]')
    await expect(viewsPanel).toBeVisible()
    await expect(page.getByTestId('workspace-view-sync-status')).toContainText(/Synced|Loading|Saving|Unsaved/)
    const { triggerBox: viewsButtonBox, panelBox: viewsPanelBox, viewport } = await waitForSettledAnchoredGeometry(page, viewsButton, viewsPanel)
    const expectedLeft = Math.max(12, Math.min(viewsButtonBox.x, viewport.width - viewsPanelBox.width - 12))
    expect(Math.abs(viewsPanelBox.x - expectedLeft)).toBeLessThanOrEqual(2)
    expect(viewsPanelBox.y).toBeGreaterThanOrEqual(viewsButtonBox.y + viewsButtonBox.height + 6)
    expect(viewsPanelBox.x).toBeGreaterThanOrEqual(12)
    expect(viewsPanelBox.x + viewsPanelBox.width).toBeLessThanOrEqual(viewport.width - 12)
    const desktopScrollBox = (await waitForSettledAnchoredGeometry(page, viewsButton, viewsPanel)).scrollSurfaceBox
    expect(Math.abs(desktopScrollBox.width - viewsPanelBox.width)).toBeLessThanOrEqual(1)
    await clickResilientButton(page, 'Close saved views')

    const search = page.getByLabel('Search FAR failure modes')
    const query = firstTitle.split(/\s+/)[0]
    await search.fill(query)
    await expect.poll(() => rows.count()).toBeGreaterThan(0)
    await search.fill('')

    await page.context().setOffline(true)
    await expect(workspace.locator('[data-far-sync-state="offline"]')).toBeVisible()
    await expect(workspace.getByText('Read-only offline fallback')).toBeVisible()
    await page.context().setOffline(false)
    await expect.poll(async () => workspace.locator('[data-far-grid="true"]').getAttribute('data-far-sync-state')).not.toBe('offline')

    await page.screenshot({ path: testInfo.outputPath('far-whole-view-golden-desktop.png'), fullPage: false, animations: 'disabled' })

    await page.goto('/far?far=999999999')
    await waitForFAR(page)
    await expect(page.getByText('The requested FAR record is unavailable or outside the active tenant.')).toBeVisible()
  })

  test('preserves golden geometry and keyboard mode navigation at narrow breakpoints', async ({ page }, testInfo) => {
    await resetBrowserState(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/far')
    const workspace = await waitForFAR(page)

    const workspaceBox = await workspace.boundingBox()
    const commandBox = await workspace.locator('[data-golden-command-bar="true"]').boundingBox()
    const gridBox = await workspace.locator('[data-far-grid="true"]').boundingBox()
    expect(workspaceBox).not.toBeNull()
    expect(commandBox).not.toBeNull()
    expect(gridBox).not.toBeNull()
    if (workspaceBox && commandBox && gridBox) {
      expect(Math.abs(commandBox.x - workspaceBox.x)).toBeLessThanOrEqual(2)
      expect(Math.abs((commandBox.x + commandBox.width) - (workspaceBox.x + workspaceBox.width))).toBeLessThanOrEqual(2)
      expect(Math.abs(gridBox.x - workspaceBox.x)).toBeLessThanOrEqual(2)
      expect(Math.abs((gridBox.x + gridBox.width) - (workspaceBox.x + workspaceBox.width))).toBeLessThanOrEqual(2)
    }

    const search = page.getByRole('textbox', { name: 'Search FAR failure modes' })
    await expect(search).toBeVisible()
    await expect(search).toHaveAttribute('placeholder', 'Scan failure modes, causes, controls, owners...')
    const firstMode = workspace.getByRole('tab', { name: 'Failure Modes' })
    await firstMode.focus()
    await page.keyboard.press('ArrowRight')
    await expect(workspace.getByRole('tab', { name: 'Causes' })).toHaveAttribute('aria-selected', 'true')
    await expect(workspace.locator('[data-far-summary="true"]')).toHaveCount(0)
    const narrowGrid = workspace.locator('[data-far-grid="true"]')
    await expect(narrowGrid.getByRole('columnheader', { name: 'Causes', exact: true })).toBeVisible()
    await expectReachableHeaders(page, narrowGrid, ['Failure Mode', 'Causes'])

    const narrowViewsButton = workspace.getByRole('button', { name: 'Views', exact: true })
    await narrowViewsButton.click()
    const narrowViewsPanel = page.locator('[data-workspace-panel-key="views-menu"]')
    await expect(narrowViewsPanel).toBeVisible()
    const { panelBox: narrowPanelBox, scrollSurfaceBox: narrowScrollBox, viewport: narrowViewport } = await waitForSettledAnchoredGeometry(page, narrowViewsButton, narrowViewsPanel)
    expect(narrowPanelBox.x).toBeGreaterThanOrEqual(12)
    expect(narrowPanelBox.x + narrowPanelBox.width).toBeLessThanOrEqual(narrowViewport.width - 12)
    expect(Math.abs(narrowScrollBox.width - narrowPanelBox.width)).toBeLessThanOrEqual(1)
    await clickResilientButton(page, 'Close saved views')

    await page.screenshot({ path: testInfo.outputPath('far-whole-view-golden-narrow.png'), fullPage: false, animations: 'disabled' })
  })

  test('renders actionable empty and query-error recovery states', async ({ page }, testInfo) => {
    await resetBrowserState(page)
    await page.route('**/api/v1/far/modes*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.goto('/far')
    await waitForFAR(page)
    await expect(page.locator('[data-far-empty="true"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('far-whole-view-empty.png'), fullPage: false, animations: 'disabled' })

    await page.unroute('**/api/v1/far/modes*')
    await page.route('**/api/v1/far/modes*', async (route) => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'FAR service unavailable' }) })
    })
    await page.reload()
    await expect(page.locator('[data-far-error="true"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
    await expect(page.locator('[data-far-error="true"]')).toContainText('FAR service unavailable')
    await page.screenshot({ path: testInfo.outputPath('far-whole-view-error.png'), fullPage: false, animations: 'disabled' })
  })
})
