import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { resetBrowserState, seedOperationalScenario, waitForAppIdle } from './helpers/sysgrid'

test.describe('App shell and global search', () => {
  test('loads the dashboard and feature audit HUD', async ({ page }) => {
    await resetBrowserState(page)

    await page.goto('/')
    await expect(page.getByText('Stability Pulse')).toBeVisible()
    await expect(page.getByText('Defense Status')).toBeVisible()

    await clickResilientButton(page, /Patch Notes/i)
    await expect(page.getByText('Registry Updates')).toBeVisible()
  })

  test('navigates to seeded records through global search', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const { service, monitoring, knowledge } = await seedOperationalScenario(request)
    const searchInput = page.getByPlaceholder(/Search Assets, Projects, FAR, Services, Monitoring/i)
    const searchTrigger = page.locator('button').filter({ hasText: /Search assets, projects, or incidents/i }).first()

    await page.goto('/')
    await waitForAppIdle(page)
    await expect(page.getByText('Stability Pulse')).toBeVisible()

    await searchTrigger.click()
    await expect(searchInput).toBeVisible()
    await searchInput.fill(service.name)
    const serviceResult = page.locator('button').filter({ hasText: service.name }).first()
    await expect(serviceResult).toBeVisible()
    await serviceResult.click()
    await expect(page).toHaveURL(new RegExp(`/services\\?id=${service.id}`))
    const serviceDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { level: 2, name: service.name, exact: true }),
    }).last()
    await expect(serviceDialog).toBeVisible()
    await expect(serviceDialog.getByRole('heading', { level: 2, name: service.name, exact: true })).toBeVisible()

    await page.goto('/')
    await waitForAppIdle(page)
    await searchTrigger.click()
    await expect(searchInput).toBeVisible()
    await searchInput.fill(monitoring.title)
    const monitoringResult = page.locator('button').filter({ hasText: monitoring.title }).first()
    await expect(monitoringResult).toBeVisible()
    await monitoringResult.click()
    await expect(page).toHaveURL(new RegExp(`/monitoring\\?id=${monitoring.id}`))
    const monitoringDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { level: 2, name: monitoring.title, exact: true }),
    }).last()
    await expect(monitoringDialog).toBeVisible()
    await expect(monitoringDialog.getByRole('heading', { level: 2, name: monitoring.title, exact: true })).toBeVisible()

    await page.goto('/')
    await waitForAppIdle(page)
    await searchTrigger.click()
    await expect(searchInput).toBeVisible()
    await searchInput.fill(knowledge.title)
    const knowledgeResult = page.locator('button').filter({ hasText: knowledge.title }).first()
    await expect(knowledgeResult).toBeVisible()
    await knowledgeResult.click()
    await expect(page).toHaveURL(new RegExp(`/knowledge\\?id=${knowledge.id}`))
    await expect(page.locator('h1').filter({ hasText: knowledge.title })).toBeVisible()
  })
})

const goldenRoutes = [
  { path: '/monitoring', archetype: 'table' },
  { path: '/asset', archetype: 'table' },
  { path: '/services', archetype: 'table' },
  { path: '/external', archetype: 'table' },
  { path: '/network', archetype: 'hybrid' },
  { path: '/far', archetype: 'analytical' },
  { path: '/research', archetype: 'analytical' },
  { path: '/vendors', archetype: 'table' },
] as const

type GeometryBox = { x: number; y: number; width: number; height: number; right: number; bottom: number }

async function readGoldenGeometry(page: any) {
  const shell = page.locator('[data-golden-workspace-shell="true"]:visible').first()
  const header = shell.locator('[data-golden-page-header="true"]').first()
  const commandBar = shell.locator('[data-golden-command-bar="true"]').first()
  const toolbar = commandBar.locator('[data-golden-page-toolbar="true"]').first()
  const grid = shell.locator('[data-golden-grid-surface="true"]').first()

  await expect(shell).toBeVisible()
  await expect(header).toBeVisible()
  await expect(commandBar).toBeVisible()
  await expect(toolbar).toBeVisible()
  await expect(grid).toBeVisible()

  const boxes = await Promise.all([shell, header, commandBar, toolbar, grid].map(async (locator) => {
    const box = await locator.boundingBox()
    if (!box) throw new Error('Golden geometry target did not produce a bounding box')
    return { ...box, right: box.x + box.width, bottom: box.y + box.height } satisfies GeometryBox
  }))

  return {
    shell,
    boxes: {
      shell: boxes[0],
      header: boxes[1],
      commandBar: boxes[2],
      toolbar: boxes[3],
      grid: boxes[4],
    },
  }
}

function expectAligned(actual: number, expected: number, tolerance = 2) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

test.describe('Golden Eight rendered geometry', () => {
  test('keeps desktop shell, command bar, and grid alignment invariant on every golden route', async ({ page }, testInfo) => {
    await resetBrowserState(page)
    await page.setViewportSize({ width: 1440, height: 1000 })

    for (const route of goldenRoutes) {
      await page.goto(route.path)
      await waitForAppIdle(page)
      const { shell, boxes } = await readGoldenGeometry(page)

      await expect(shell).toHaveAttribute('data-golden-geometry-version', '1')
      await expect(shell).toHaveAttribute('data-golden-archetype', route.archetype)
      expect(boxes.header.y).toBeLessThan(boxes.commandBar.y)
      expect(boxes.commandBar.bottom).toBeLessThanOrEqual(boxes.grid.y + 1)
      expect(boxes.grid.height).toBeGreaterThanOrEqual(350)
      expectAligned(boxes.header.x, boxes.shell.x)
      expectAligned(boxes.header.right, boxes.shell.right)
      expectAligned(boxes.commandBar.x, boxes.shell.x)
      expectAligned(boxes.commandBar.right, boxes.shell.right)
      expectAligned(boxes.grid.x, boxes.shell.x)
      expectAligned(boxes.grid.right, boxes.shell.right)

      const slug = route.path.slice(1)
      await page.screenshot({
        path: testInfo.outputPath(`${slug}-default-desktop.png`),
        fullPage: true,
      })

      for (const control of ['Display', 'Filters', 'Insights'] as const) {
        await page.goto(route.path)
        await waitForAppIdle(page)
        const button = page.getByRole('button', { name: new RegExp(`^${control}$`, 'i') }).first()
        if (await button.count()) {
          await expect(button).toBeVisible()
          await button.click()
          await waitForAppIdle(page)
          await page.screenshot({
            path: testInfo.outputPath(`${slug}-${control.toLowerCase()}-toggled-desktop.png`),
            fullPage: true,
          })
        }
      }
    }
  })

  test('keeps narrow-screen stacking and overflow containment invariant on every golden route', async ({ page }, testInfo) => {
    await resetBrowserState(page)
    await page.setViewportSize({ width: 390, height: 844 })

    for (const route of goldenRoutes) {
      await page.goto(route.path)
      await waitForAppIdle(page)
      const { shell, boxes } = await readGoldenGeometry(page)

      await expect(shell).toHaveAttribute('data-golden-geometry-version', '1')
      await expect(shell).toHaveAttribute('data-golden-archetype', route.archetype)
      expect(boxes.header.y).toBeLessThan(boxes.commandBar.y)
      expect(boxes.commandBar.bottom).toBeLessThanOrEqual(boxes.grid.y + 1)
      expect(boxes.grid.height).toBeGreaterThanOrEqual(350)
      expectAligned(boxes.header.x, boxes.shell.x)
      expectAligned(boxes.commandBar.x, boxes.shell.x)
      expectAligned(boxes.grid.x, boxes.shell.x)
      expectAligned(boxes.header.width, boxes.shell.width)
      expectAligned(boxes.commandBar.width, boxes.shell.width)
      expectAligned(boxes.grid.width, boxes.shell.width)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(2)

    }
  })
})
