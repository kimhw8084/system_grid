import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import { clickResilientButton } from './helpers/sysgrid'
import fs from 'node:fs/promises'
import path from 'node:path'

type CaptureMetrics = {
  route: string
  viewport: { width: number; height: number }
  screenshotType: 'full-page' | 'full-viewport'
  screenshotPath: string
  screenshotSize: { width: number; height: number }
  documentSize: { width: number; height: number }
  workspaceRoot: DOMRectLike | null
  header: DOMRectLike | null
  commandBar: DOMRectLike | null
  table: DOMRectLike | null
  firstRow: DOMRectLike | null
  actionZone: DOMRectLike | null
  visibleTexts: string[]
  isFullWorkspaceCapture: boolean
  consoleCounts: { warning: number; error: number; pageError: number }
}

type DOMRectLike = {
  x: number
  y: number
  width: number
  height: number
}

const CAPTURE_DIR = path.resolve(process.cwd(), 'stage23-evidence')

const toRect = (value: any): DOMRectLike | null => {
  if (!value) return null
  return {
    x: Math.round(value.x),
    y: Math.round(value.y),
    width: Math.round(value.width),
    height: Math.round(value.height),
  }
}

const captureMetrics = async (page: any, screenshotType: 'full-page' | 'full-viewport', screenshotPath: string): Promise<CaptureMetrics> => {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const node = document.querySelector(selector)
      if (!node) return null
      const box = node.getBoundingClientRect()
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      }
    }

    const rectFromNode = (node: Element | null | undefined) => {
      if (!node) return null
      const box = node.getBoundingClientRect()
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      }
    }

    const treegrid = document.querySelector('[role="treegrid"]')
    const commandBarNode =
      treegrid?.parentElement?.previousElementSibling ||
      document.querySelector('input[placeholder*="Search"]')?.closest('div')

    const texts = Array.from(document.querySelectorAll('h1, h2, button, [role="columnheader"]'))
      .map((node) => node.textContent?.trim() || '')
      .filter(Boolean)
      .slice(0, 80)

    return {
      route: window.location.pathname + window.location.search,
      documentSize: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      workspaceRoot: rect('main [class*="space-y-4"], main > div:last-child'),
      header: rect('main h1') ?? rect('main header'),
      commandBar: rectFromNode(commandBarNode),
      table: rect('[role="treegrid"]'),
      firstRow: rect('.ag-center-cols-container .ag-row'),
      actionZone: rect('main [class*="bulk-menu-trigger"]') ?? rect('main [class*="HeaderScopeSwitch"]'),
      visibleTexts: texts,
    }
  })

  const screenshotSize = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

  return {
    route: metrics.route,
    viewport: screenshotSize,
    screenshotType,
    screenshotPath,
    screenshotSize,
    documentSize: metrics.documentSize,
    workspaceRoot: toRect(metrics.workspaceRoot),
    header: toRect(metrics.header),
    commandBar: toRect(metrics.commandBar),
    table: toRect(metrics.table),
    firstRow: toRect(metrics.firstRow),
    actionZone: toRect(metrics.actionZone),
    visibleTexts: metrics.visibleTexts,
    isFullWorkspaceCapture: screenshotType === 'full-page' || (metrics.documentSize.height <= screenshotSize.height && metrics.documentSize.width <= screenshotSize.width),
    consoleCounts: { warning: 0, error: 0, pageError: 0 },
  }
}

const ensureWorkspaceVisible = async (page: any, heading: string) => {
  const failureHeading = page.getByRole('heading', { name: 'Connection Failure' })
  if (await failureHeading.isVisible().catch(() => false)) {
    await clickResilientButton(page, 'Ignore Error & Launch')
    await expect(failureHeading).toBeHidden()
  }
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
}

test.describe('Assets golden evidence capture', () => {
  test('captures stage23 workspace evidence', async ({ page }) => {
    await fs.mkdir(CAPTURE_DIR, { recursive: true })
    await page.addInitScript((payload) => {
      window.localStorage.clear()
      window.sessionStorage.clear()
      window.localStorage.setItem('SYSGRID_USER_ID', payload.userId)
      window.localStorage.setItem('SYSGRID_OVERRIDE_API_URL', payload.apiBase)
    }, {
      apiBase: process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1',
      userId: 'haewon.kim',
    })

    const phase = process.env.STAGE23_CAPTURE_PHASE || 'before'
    const assetViewport = process.env.STAGE23_CAPTURE_VIEWPORT === '960x720'
      ? { width: 960, height: 720 }
      : { width: 1440, height: 1200 }

    await page.setViewportSize(assetViewport)

  const captures: Record<string, CaptureMetrics> = {}
    const consoleCounts = { warning: 0, error: 0, pageError: 0 }
    page.on('console', (message: any) => {
      if (message.type() === 'warning') consoleCounts.warning += 1
      if (message.type() === 'error') consoleCounts.error += 1
    })
    page.on('pageerror', () => {
      consoleCounts.pageError += 1
    })

    if (phase === 'before') {
      await page.goto('/asset')
      await ensureWorkspaceVisible(page, 'Asset Registry')
      const assetFullPagePath = path.join(CAPTURE_DIR, 'before-asset-fullpage.png')
      await page.screenshot({ path: assetFullPagePath, fullPage: true })
      captures.beforeAsset = await captureMetrics(page, 'full-page', assetFullPagePath)
      captures.beforeAsset.consoleCounts = { ...consoleCounts }

      await page.goto('/monitoring')
      await ensureWorkspaceVisible(page, 'Monitoring')
      const goldenFullPagePath = path.join(CAPTURE_DIR, 'golden-monitoring-fullpage.png')
      await page.screenshot({ path: goldenFullPagePath, fullPage: true })
      captures.goldenReference = await captureMetrics(page, 'full-page', goldenFullPagePath)
      captures.goldenReference.consoleCounts = { ...consoleCounts }
    } else {
      await page.goto('/asset')
      await ensureWorkspaceVisible(page, 'Asset Registry')

      const suffix = process.env.STAGE23_CAPTURE_VIEWPORT === '960x720' ? '960x720' : 'desktop'
      const screenshotType = process.env.STAGE23_CAPTURE_VIEWPORT === '960x720' ? 'full-viewport' : 'full-page'
      const screenshotPath = path.join(CAPTURE_DIR, `after-asset-${suffix}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: screenshotType === 'full-page' })
      captures.afterAsset = await captureMetrics(page, screenshotType, screenshotPath)
      captures.afterAsset.consoleCounts = { ...consoleCounts }

      await page.goto('/asset-real')
      captures.assetRealRedirect = {
        ...(await captureMetrics(page, 'full-viewport', screenshotPath)),
        consoleCounts: { ...consoleCounts },
      }
    }

    await fs.writeFile(
      path.join(CAPTURE_DIR, `${phase}-${process.env.STAGE23_CAPTURE_VIEWPORT || 'full'}.json`),
      JSON.stringify(captures, null, 2)
    )
  })
})
