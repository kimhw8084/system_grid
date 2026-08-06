import { writeFile } from 'node:fs/promises'
import { expect, type APIRequestContext } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import {
  createConnection,
  createExternalEntity,
  createInvestigation,
  resetBrowserState,
  seedOperationalScenario,
  testApiBase,
  testApiHeaders,
  testTenantId,
  waitForAppIdle,
} from './helpers/sysgrid'
import { goldenWorkspaceRouteMatrix } from './helpers/routeMatrix'

const apiBase = testApiBase


const campaignTargetViews = (() => {
  if (process.env.SYSGRID_EXECUTION_PROFILE !== 'development_campaign') return null
  try {
    const parsed = JSON.parse(process.env.SYSGRID_TARGETED_VIEWS_JSON || '[]')
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set<string>()
  }
})()

const activeGoldenRoutes = campaignTargetViews && campaignTargetViews.size
  ? goldenWorkspaceRouteMatrix.filter((route) => campaignTargetViews.has(route.key))
  : goldenWorkspaceRouteMatrix
async function createVendor(request: APIRequestContext, stamp: string) {
  const response = await request.post(`${apiBase}/vendors`, {
    data: { name: `PW-SEED-VENDOR-${stamp}`, country: 'USA' },
    headers: testApiHeaders,
  })
  expect(response.ok()).toBeTruthy()
  return response.json()
}

async function seedGoldenEight(request: APIRequestContext) {
  const seeded = await seedOperationalScenario(request)
  const stamp = seeded.stamp
  await createConnection(request, {
    device_a_id: seeded.primary.id,
    source_port: 'eth0',
    device_b_id: seeded.secondary.id,
    target_port: 'eth1',
    link_type: 'Data',
    speed_gbps: 10,
    unit: 'Gbps',
    status: 'Active',
    farm: 'Prod',
  })
  await createExternalEntity(request, {
    name: `PW-SEED-EXTERNAL-${stamp}`,
    external_key: `pw-seed-external-${stamp}`.toLowerCase(),
    type: 'API',
    owner_organization: 'Seed Partner',
    ownership_mode: 'individual',
    status: 'Active',
    environment: 'Production',
    description: 'Representative populated external dependency',
    business_purpose: 'Golden Eight deterministic visual validation',
    metadata_json: { fixture: 'golden-eight-populated' },
  })
  await createInvestigation(request, {
    title: `PW-SEED-RESEARCH-${stamp}`,
    problem_statement: 'Representative populated research investigation',
    category: 'Research',
    status: 'Analyzing',
    priority: 'High',
    systems: [seeded.systemName],
    initiation_at: '2037-02-03T04:05:00',
  })
  await createVendor(request, stamp)
}

async function waitForSettledGoldenGeometry(page: any, workspace: any, commandBar: any, grid: any) {
  await expect(grid).toHaveAttribute('data-golden-grid-loading', 'false')
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  let previousSignature = ''
  let latest: { shellBox: any; commandBox: any; gridBox: any } | null = null
  await expect.poll(async () => {
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    const shellBox = await workspace.boundingBox()
    const commandBox = await commandBar.boundingBox()
    const gridBox = await grid.boundingBox()
    if (!shellBox || !commandBox || !gridBox) return false
    latest = { shellBox, commandBox, gridBox }
    const signature = JSON.stringify([
      shellBox.x, shellBox.y, shellBox.width, shellBox.height,
      commandBox.x, commandBox.y, commandBox.width, commandBox.height,
      gridBox.x, gridBox.y, gridBox.width, gridBox.height,
    ])
    const settled = signature === previousSignature
    previousSignature = signature
    return settled
  }, { timeout: 10_000 }).toBe(true)
  if (!latest) throw new Error('Golden workspace geometry did not become measurable')
  return latest
}

async function paintedPixelEvidence(locator: any) {
  return locator.evaluate((element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const intersects = (box: DOMRect) => box.bottom > rect.top && box.top < rect.bottom && box.right > rect.left && box.left < rect.right
    const isPaintable = (node: HTMLElement, box: DOMRect) => {
      const nodeStyle = getComputedStyle(node)
      return intersects(box) && box.width > 1 && box.height > 1 && Number(nodeStyle.opacity || '1') > 0 && nodeStyle.visibility !== 'hidden' && nodeStyle.display !== 'none'
    }
    const rows = [...element.querySelectorAll<HTMLElement>('.ag-center-cols-container .ag-row')]
      .map((row) => {
        const box = row.getBoundingClientRect()
        const rowStyle = getComputedStyle(row)
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
          opacity: Number(rowStyle.opacity || '1'),
          visibility: rowStyle.visibility,
          display: rowStyle.display,
          intersectsViewport: intersects(box),
        }
      })
    const headers = [...element.querySelectorAll<HTMLElement>('.ag-header-cell')].map((header) => {
      const box = header.getBoundingClientRect()
      return { text: header.textContent?.trim() || '', width: box.width, height: box.height, intersectsViewport: intersects(box), paintable: isPaintable(header, box) }
    })
    const cells = [...element.querySelectorAll<HTMLElement>('.ag-cell[role="gridcell"]')].map((cell) => {
      const box = cell.getBoundingClientRect()
      const text = cell.textContent?.replace(/\s+/g, ' ').trim() || ''
      const visibleLeft = Math.max(box.left, rect.left)
      const visibleRight = Math.min(box.right, rect.right)
      const visibleTop = Math.max(box.top, rect.top)
      const visibleBottom = Math.min(box.bottom, rect.bottom)
      const sampleX = (visibleLeft + visibleRight) / 2
      const sampleY = (visibleTop + visibleBottom) / 2
      const hit = visibleRight > visibleLeft && visibleBottom > visibleTop
        ? document.elementFromPoint(sampleX, sampleY)
        : null
      return {
        colId: cell.getAttribute('col-id'),
        text: text.slice(0, 160),
        width: box.width,
        height: box.height,
        intersectsViewport: intersects(box),
        paintable: isPaintable(cell, box),
        hitTested: !!hit && (hit === cell || cell.contains(hit)),
      }
    })
    const centerViewport = element.querySelector<HTMLElement>('.ag-center-cols-viewport')
    const centerContainer = element.querySelector<HTMLElement>('.ag-center-cols-container')
    const centerViewportWidth = centerViewport?.getBoundingClientRect().width || 0
    const centerContentWidth = centerContainer?.getBoundingClientRect().width || 0
    const visiblePopulatedCells = cells.filter((cell) => cell.text.length > 0 && cell.paintable && cell.hitTested).length
    const paintedHeaderLabels = headers.filter((header) => header.text.length > 0 && header.paintable).length
    return {
      box: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
      style: { display: style.display, visibility: style.visibility, opacity: Number(style.opacity || '1'), overflowX: style.overflowX, overflowY: style.overflowY },
      rowCount: rows.length,
      paintedRows: rows.filter((row) => row.intersectsViewport && row.width > 1 && row.height > 1 && row.opacity > 0 && row.visibility !== 'hidden' && row.display !== 'none').length,
      paintedHeaders: headers.filter((header) => header.paintable).length,
      paintedHeaderLabels,
      visiblePopulatedCells,
      centerViewportWidth,
      centerContentWidth,
      centerWidthRatio: centerViewportWidth > 0 ? centerContentWidth / centerViewportWidth : null,
      cells: cells.slice(0, 80),
      rows,
    }
  })
}

test.describe.parallel('Golden Eight non-short-circuit populated validation matrix', () => {
  for (const route of activeGoldenRoutes) {
    test(`${route.key}: geometry, tenant, paint, and populated evidence`, async ({ page, sysApi: request }, testInfo) => {
      await resetBrowserState(page)
      await seedGoldenEight(request)
      await page.setViewportSize({ width: 1440, height: 1000 })

      const routeTenantIds = new Set<string>()
      const captureTenant = (response: any) => {
        const url = new URL(response.url())
        if (!url.pathname.startsWith('/api/')) return
        const tenantId = response.headers()['x-sysgrid-tenant-id']
        if (tenantId) routeTenantIds.add(tenantId)
      }
      page.on('response', captureTenant)
      const tenantResponsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url())
        return (
          url.pathname.startsWith('/api/') &&
          response.status() < 500 &&
          response.headers()['x-sysgrid-tenant-id'] === testTenantId
        )
      })

      const failures: string[] = []
      try {
        await page.goto(route.path)
        await waitForAppIdle(page)
        const tenantResponse = await tenantResponsePromise
        const observedTenantId = tenantResponse.headers()['x-sysgrid-tenant-id']
        if (observedTenantId) routeTenantIds.add(observedTenantId)
        const workspace = page.locator(`[data-workspace="${route.key}"]`)
        const grid = workspace.getByTestId('golden-grid-surface').first()
        const commandBar = workspace.locator('[data-workspace-command-bar="true"]').first()

        const tenantName = await page.getByTestId('active-tenant-name').textContent().catch(() => null)
        if (tenantName?.trim() !== 'Playwright Gate') failures.push(`tenant label: expected Playwright Gate, got ${tenantName}`)
        if (JSON.stringify([...routeTenantIds]) !== JSON.stringify([testTenantId])) failures.push(`response tenants: ${JSON.stringify([...routeTenantIds])}`)
        if (!(await workspace.isVisible().catch(() => false))) failures.push('workspace not visible')
        if (!(await grid.isVisible().catch(() => false))) failures.push('shared grid surface not visible')
        await expect(grid.locator('.ag-center-cols-container .ag-row').first()).toBeVisible({ timeout: 30_000 })

        const { shellBox, gridBox, commandBox } = await waitForSettledGoldenGeometry(page, workspace, commandBar, grid)
        if (!shellBox || !gridBox) failures.push('missing shell/grid bounding box')
        if (shellBox && gridBox) {
          const leftDelta = Math.abs(gridBox.x - shellBox.x)
          const rightDelta = Math.abs((gridBox.x + gridBox.width) - (shellBox.x + shellBox.width))
          if (leftDelta > 2) failures.push(`grid left delta ${leftDelta}`)
          if (rightDelta > 2) failures.push(`grid right delta ${rightDelta}`)
        }
        if (shellBox && commandBox) {
          const leftDelta = Math.abs(commandBox.x - shellBox.x)
          const rightDelta = Math.abs((commandBox.x + commandBox.width) - (shellBox.x + shellBox.width))
          if (leftDelta > 2) failures.push(`command left delta ${leftDelta}`)
          if (rightDelta > 2) failures.push(`command right delta ${rightDelta}`)
        }

        const paint = await paintedPixelEvidence(grid)
        if (paint.paintedHeaders < 1) failures.push('no painted header cells in grid viewport')
        if (paint.paintedHeaderLabels < 1) failures.push('no visible labeled header in grid viewport')
        if (paint.paintedRows < 1) failures.push('no painted rows in grid viewport')
        if (paint.visiblePopulatedCells < 1) failures.push('no visible populated cell survives viewport hit testing')
        if (paint.centerWidthRatio !== null && paint.centerWidthRatio > 8) failures.push(`pathological center-column width ratio ${paint.centerWidthRatio}`)
        if (paint.box.width < 100 || paint.box.height < 100) failures.push(`invalid grid viewport ${paint.box.width}x${paint.box.height}`)
        if (paint.style.opacity <= 0 || paint.style.visibility === 'hidden' || paint.style.display === 'none') failures.push('grid hidden by computed style')

        const result = {
          schemaVersion: 2,
          workspace: route.key,
          route: route.path,
          tenantName,
          responseTenantIds: [...routeTenantIds],
          shellBox,
          commandBox,
          gridBox,
          paint,
          failures,
          status: failures.length ? 'FAIL' : 'PASS',
        }
        await writeFile(testInfo.outputPath(`${route.key}-matrix-result.json`), JSON.stringify(result, null, 2))
        await testInfo.attach(`${route.key}-matrix-result`, { path: testInfo.outputPath(`${route.key}-matrix-result.json`), contentType: 'application/json' })
        await grid.screenshot({ path: testInfo.outputPath(`${route.key}-grid-populated-desktop.png`), animations: 'disabled' })
        await page.screenshot({ path: testInfo.outputPath(`${route.key}-populated-desktop.png`), fullPage: false, animations: 'disabled' })
        expect(failures, JSON.stringify(result, null, 2)).toEqual([])
      } finally {
        page.off('response', captureTenant)
      }
    })
  }
})
