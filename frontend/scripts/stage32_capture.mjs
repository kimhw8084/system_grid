import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const FRONTEND_ROOT = process.cwd()
const EVIDENCE_DIR = path.join(FRONTEND_ROOT, 'stage32-evidence')
const HTML_PATH = path.join(FRONTEND_ROOT, 'OUT-26_ITERATION_34_STAGE32_EVIDENCE.html')

const BASE_URL = process.env.STAGE32_BASE_URL || 'http://127.0.0.1:5174'

const ensureCleanDir = async (dir) => {
  await fs.rm(dir, { recursive: true, force: true })
  await fs.mkdir(dir, { recursive: true })
}

const toDataUrl = async (filePath) => {
  const buffer = await fs.readFile(filePath)
  return `data:image/png;base64,${buffer.toString('base64')}`
}

const safeBox = async (page, selector) => {
  const locator = page.locator(selector).first()
  if (!await locator.count()) return null
  const box = await locator.boundingBox()
  return box ? Object.fromEntries(Object.entries(box).map(([key, value]) => [key, Number(value.toFixed(2))])) : null
}

const visibleTextInventory = async (page) => {
  const text = await page.locator('body').innerText().catch(() => '')
  return text.split('\n').map((entry) => entry.trim()).filter(Boolean).slice(0, 80)
}

const captureState = async (page, name, route, viewport, interaction) => {
  await page.setViewportSize(viewport)
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' })
  if (interaction) await interaction(page)
  await page.waitForTimeout(400)

  const filePath = path.join(EVIDENCE_DIR, `${name}.png`)
  const fullPage = name.includes('full')
  await page.screenshot({ path: filePath, fullPage })

  const dimensions = await page.evaluate(() => ({
    url: window.location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    document: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    },
  }))

  const warnings = []
  page.on('pageerror', (error) => warnings.push({ type: 'pageerror', message: error.message }))
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') {
      warnings.push({ type: message.type(), message: message.text() })
    }
  })

  return {
    name,
    route,
    finalUrl: dimensions.url,
    screenshotPath: filePath,
    viewport: dimensions.viewport,
    document: dimensions.document,
    visibleText: await visibleTextInventory(page),
    bounds: {
      workspaceRoot: await safeBox(page, '.operational-grid-shell, main, #root > div'),
      header: await safeBox(page, 'section.flex.items-start.justify-between, h1'),
      actionStatusZone: await safeBox(page, '[class*=\"HeaderScopeSwitch\"], button:has-text(\"Existing\"), button:has-text(\"Purged\")'),
      commandRegion: await safeBox(page, 'section[class*=\"rounded-lg border border-white/5 bg-black/20\"], .display-menu-container'),
      table: await safeBox(page, '.operational-grid-shell'),
      firstRow: await safeBox(page, '.ag-center-cols-container .ag-row'),
      rowActionRegion: await safeBox(page, '.row-action-trigger'),
      contextMenu: await safeBox(page, '.row-action-menu-container'),
      quickLook: await safeBox(page, 'text=Network Vector'),
      detailsPanel: await safeBox(page, '[role=\"dialog\"]'),
    },
    warnings,
  }
}

const main = async () => {
  await ensureCleanDir(EVIDENCE_DIR)
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/haewonkim/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  })
  const page = await browser.newPage()

  const captures = []
  captures.push(await captureState(page, 'asset_desktop_full', '/asset', { width: 1440, height: 1200 }))
  captures.push(await captureState(page, 'asset_desktop_viewport', '/asset', { width: 1440, height: 900 }))
  captures.push(await captureState(page, 'asset_960x720', '/asset', { width: 960, height: 720 }))
  captures.push(await captureState(page, 'monitoring_desktop_full', '/monitoring', { width: 1440, height: 1200 }))
  captures.push(await captureState(page, 'monitoring_desktop_viewport', '/monitoring', { width: 1440, height: 900 }))
  captures.push(await captureState(page, 'monitoring_960x720', '/monitoring', { width: 960, height: 720 }))
  captures.push(await captureState(page, 'asset_real_redirect', '/asset-real', { width: 1440, height: 900 }))

  captures.push(await captureState(page, 'asset_context_menu', '/asset', { width: 1440, height: 900 }, async (currentPage) => {
    const row = currentPage.locator('.ag-center-cols-container .ag-row').first()
    await row.click({ button: 'right' })
  }))
  captures.push(await captureState(page, 'asset_row_click', '/asset', { width: 1440, height: 900 }, async (currentPage) => {
    await currentPage.locator('.ag-center-cols-container .ag-row').first().click()
  }))
  captures.push(await captureState(page, 'asset_quicklook', '/asset', { width: 1440, height: 900 }, async (currentPage) => {
    await currentPage.locator('.ag-center-cols-container .ag-row').first().click()
  }))
  captures.push(await captureState(page, 'asset_details_modal', '/asset', { width: 1440, height: 900 }, async (currentPage) => {
    await currentPage.locator('.ag-center-cols-container .ag-row').first().dblclick()
  }))

  await browser.close()

  const cards = await Promise.all(captures.map(async (capture) => {
    const dataUrl = await toDataUrl(capture.screenshotPath)
    return `
      <section style="margin:24px 0;padding:16px;border:1px solid #334155;border-radius:16px;background:#020617;">
        <h2 style="margin:0 0 12px;font:700 18px/1.2 sans-serif;color:#e2e8f0;">${capture.name}</h2>
        <p style="font:600 12px/1.4 sans-serif;color:#94a3b8;">${capture.finalUrl}</p>
        <img src="${dataUrl}" alt="${capture.name}" style="max-width:100%;border-radius:12px;border:1px solid #1e293b;" />
        <pre style="white-space:pre-wrap;color:#cbd5e1;background:#0f172a;border-radius:12px;padding:12px;font:12px/1.4 monospace;">${JSON.stringify(capture, null, 2)}</pre>
      </section>
    `
  }))

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Stage 32 Evidence</title>
  <style>
    body { margin: 0; padding: 32px; background: #020617; color: #e2e8f0; font-family: ui-sans-serif, system-ui, sans-serif; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { margin: 0 0 16px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>OUT-26 Iteration 34 Stage 32 Evidence</h1>
  <p>Base URL: ${BASE_URL}</p>
  ${cards.join('\n')}
</body>
</html>`

  await fs.writeFile(HTML_PATH, html)
  console.log(JSON.stringify({ captures, htmlPath: HTML_PATH, evidenceDir: EVIDENCE_DIR }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
