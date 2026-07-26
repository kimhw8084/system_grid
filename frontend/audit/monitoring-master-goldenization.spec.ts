import fs from 'node:fs'
import path from 'node:path'
import { expect, type Locator, type Page } from '@playwright/test'
import { test } from '../tests/helpers/sysgrid-test'
import {
  createConnection,
  createExternalEntity,
  createInvestigation,
  ensureSettingOption,
  resetBrowserState,
  seedOperationalScenario,
  waitForAppIdle,
} from '../tests/helpers/sysgrid'
type ActionProbe = { kind: 'button' | 'title'; name: string }
type Target = {
  key: string
  label: string
  route: string
  heading: string
  routeComponent: string
  source: string
  archetype: 'table' | 'hybrid' | 'custom'
  searchPlaceholders: string[]
  preferredPanelActions: ActionProbe[]
  preferredModalActions: ActionProbe[]
  domainMustPreserve: string[]
}

const targetConfig = JSON.parse(
  fs.readFileSync(new URL('./monitoring-master-targets.json', import.meta.url), 'utf8'),
) as { master: Target; targets: Target[] }

const outputRoot = process.env.SYSGRID_GOLDEN_AUDIT_DIR
const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'
const apiOrigin = apiBase.replace(/\/api\/v1$/, '')
const testUserId = process.env.USER_ID || 'haewon.kim'

if (!outputRoot) throw new Error('SYSGRID_GOLDEN_AUDIT_DIR is required')


test.describe.configure({ mode: 'serial' })
test.use({ viewport: { width: 1920, height: 1080 } })

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function escapedRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function visibleCandidate(locator: Locator) {
  for (let index = 0; index < await locator.count(); index += 1) {
    const candidate = locator.nth(index)
    if (await candidate.isVisible().catch(() => false) && await candidate.isEnabled().catch(() => true)) return candidate
  }
  return null
}

async function findAction(page: Page, actions: ActionProbe[]) {
  for (const action of actions) {
    const locator = action.kind === 'title'
      ? page.getByTitle(action.name)
      : page.getByRole('button', { name: new RegExp(`^${escapedRegex(action.name)}$`, 'i') })
    const candidate = await visibleCandidate(locator)
    if (candidate) return { action, candidate }
  }
  return null
}

async function screenshot(page: Page, targetDir: string, name: string) {
  const filePath = path.join(targetDir, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled' })
  return path.relative(outputRoot!, filePath)
}

async function collectSignals(page: Page) {
  const buttons = await page.locator('button:visible').evaluateAll((nodes) => nodes.slice(0, 250).map((node) => {
    const element = node as HTMLElement
    return element.getAttribute('aria-label') || element.getAttribute('title') || element.innerText.trim()
  }).filter(Boolean))
  const placeholders = await page.locator('input:visible, textarea:visible').evaluateAll((nodes) => nodes.slice(0, 100).map((node) => node.getAttribute('placeholder') || '').filter(Boolean))
  const headings = await page.getByRole('heading').evaluateAll((nodes) => nodes.slice(0, 100).map((node) => (node as HTMLElement).innerText.trim()).filter(Boolean))
  const workspaceMarkers = await page.locator('[data-workspace]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-workspace')).filter(Boolean))
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  return {
    buttons,
    placeholders,
    headings,
    workspaceMarkers,
    treegridCount: await page.getByRole('treegrid').count(),
    rowCount: await page.locator('.ag-center-cols-container .ag-row').count(),
    selectionCheckboxCount: await page.locator('.ag-selection-checkbox:visible').count(),
    visibleDialogCount: await page.getByRole('dialog').filter({ visible: true }).count(),
    viewport,
  }
}

async function setBrowserTenant(page: Page, tenantId: string) {
  await page.goto('/')
  await page.evaluate(({ tenant, origin, user }) => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.localStorage.setItem('SYSGRID_OVERRIDE_API_URL', origin)
    window.localStorage.setItem('SYSGRID_USER_ID', user)
    window.localStorage.setItem('SYSGRID_TENANT_ID', tenant)
  }, { tenant: tenantId, origin: apiOrigin, user: testUserId })
}

async function seedTarget(target: Target, request: any) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  if (target.key === 'monitoring' || target.key === 'assets' || target.key === 'services' || target.key === 'far') {
    const scenario = await seedOperationalScenario(request)
    return {
      seedLabel: target.key === 'monitoring'
        ? scenario.monitoring.title
        : target.key === 'assets'
          ? scenario.primary.name
          : target.key === 'services'
            ? scenario.service.name
            : scenario.far.title,
      domainSeedCreated: true,
    }
  }
  if (target.key === 'external') {
    const entity = await createExternalEntity(request, {
      name: `AUDIT-EXT-${stamp}`,
      external_key: `audit-ext-${stamp}`.toLowerCase(),
      type: 'API',
      owner_organization: 'Audit Partner',
      ownership_mode: 'individual',
      status: 'Active',
      environment: 'Production',
      description: 'Monitoring-master goldenization audit seed',
    })
    return { seedLabel: entity.name, domainSeedCreated: true }
  }
  if (target.key === 'network') {
    const scenario = await seedOperationalScenario(request)
    const farm = `AUDIT-NET-${stamp}`
    await ensureSettingOption(request, 'NetworkFarm', farm)
    const connection = await createConnection(request, {
      device_a_id: scenario.primary.id,
      source_port: 'audit0',
      device_b_id: scenario.secondary.id,
      target_port: 'audit1',
      link_type: 'Data',
      speed_gbps: 10,
      unit: 'Gbps',
      status: 'Active',
      farm,
    })
    return { seedLabel: farm, deepLinkId: connection.id, domainSeedCreated: true }
  }
  if (target.key === 'research') {
    const investigation = await createInvestigation(request, {
      title: `AUDIT-RESEARCH-${stamp}`,
      status: 'ANALYZING',
      priority: 'HIGH',
      systems: [`AUDIT-SYS-${stamp}`],
      initiation_at: '2037-02-03T04:05:00',
    })
    return { seedLabel: investigation.title, deepLinkId: investigation.id, domainSeedCreated: true }
  }
  if (target.key === 'vendors') {
    const response = await request.post(`${apiBase}/vendors`, { data: { name: `AUDIT-VENDOR-${stamp}`, country: 'USA' } })
    const responseBody = await response.text()
    expect(response.ok(), `Vendor seed failed: ${response.status()} ${responseBody}`).toBeTruthy()
    const vendor = JSON.parse(responseBody)
    return { seedLabel: vendor.name, deepLinkId: vendor.id, domainSeedCreated: true }
  }
  return { seedLabel: null, domainSeedCreated: false }
}

async function filterToSeed(page: Page, target: Target, seedLabel: string | null) {
  if (!seedLabel) return false
  for (const placeholder of target.searchPlaceholders) {
    const candidate = await visibleCandidate(page.getByPlaceholder(placeholder))
    if (!candidate) continue
    await candidate.fill(seedLabel)
    await page.keyboard.press('Enter')
    return true
  }
  return false
}

for (const target of [targetConfig.master, ...targetConfig.targets]) {
  test(`${target.label} evidence rebaseline`, async ({ page, sysApi: request }) => {
    test.setTimeout(120_000)
    const targetDir = path.join(outputRoot!, target.key)
    ensureDir(targetDir)
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await resetBrowserState(page)
    await setBrowserTenant(page, '1')
    const seed = await seedTarget(target, request)
    await page.goto(target.route)
    await waitForAppIdle(page)
    const heading = page.getByRole('heading', { name: new RegExp(escapedRegex(target.heading), 'i') }).first()
    await expect(heading).toBeVisible()
    const filteredToSeed = await filterToSeed(page, target, seed.seedLabel)
    await waitForAppIdle(page)
    const seeded = {
      ...(await collectSignals(page)),
      headingVisible: await heading.isVisible(),
      domainSeedCreated: seed.domainSeedCreated,
      seedLabel: seed.seedLabel,
      filteredToSeed,
    }
    const screenshots: string[] = []
    screenshots.push(await screenshot(page, targetDir, 'seeded-default'))

    const firstCheckbox = await visibleCandidate(page.locator('.ag-selection-checkbox'))
    let selectionClicked = false
    if (firstCheckbox) {
      await firstCheckbox.click().catch(() => {})
      selectionClicked = true
    }
    screenshots.push(await screenshot(page, targetDir, 'selection-state'))

    const panelMatch = await findAction(page, target.preferredPanelActions as ActionProbe[])
    const panelProbe = { attempted: target.preferredPanelActions, matched: panelMatch?.action || null, opened: false }
    if (panelMatch) {
      await panelMatch.candidate.click().catch(() => {})
      await page.waitForTimeout(150)
      panelProbe.opened = true
    }
    screenshots.push(await screenshot(page, targetDir, 'panel-probe'))
    await page.keyboard.press('Escape').catch(() => {})

    const modalMatch = await findAction(page, target.preferredModalActions as ActionProbe[])
    const modalProbe = { attempted: target.preferredModalActions, matched: modalMatch?.action || null, opened: false, dialogVisible: false }
    if (modalMatch) {
      await modalMatch.candidate.click().catch(() => {})
      await page.waitForTimeout(150)
      modalProbe.opened = true
      modalProbe.dialogVisible = await page.getByRole('dialog').filter({ visible: true }).count() > 0 || await page.locator('.glass-panel:visible').count() > 0
    }
    screenshots.push(await screenshot(page, targetDir, 'modal-probe'))
    await page.keyboard.press('Escape').catch(() => {})

    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(100)
    const constrained = { ...(await collectSignals(page)), captured: true }
    screenshots.push(await screenshot(page, targetDir, 'constrained-width'))

    const blankTenantSlug = `golden-audit-${target.key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const tenantResponse = await request.post(`${apiBase}/tenants/admin/create`, {
      data: {
        name: `Golden Audit ${target.label} ${blankTenantSlug}`,
        db_name: blankTenantSlug,
      },
    })
    const tenantResponseBody = await tenantResponse.text()
    expect(
      tenantResponse.ok(),
      `Blank tenant creation failed for ${target.label}: ${tenantResponse.status()} ${tenantResponseBody}`,
    ).toBeTruthy()
    const blankTenant = JSON.parse(tenantResponseBody) as { id: number | string }
    const blankTenantId = String(blankTenant.id)
    await page.setViewportSize({ width: 1920, height: 1080 })
    await setBrowserTenant(page, blankTenantId)
    await page.goto(target.route)
    await waitForAppIdle(page)
    const blankHeading = page.getByRole('heading', { name: new RegExp(escapedRegex(target.heading), 'i') }).first()
    await expect(blankHeading).toBeVisible()
    const blank = {
      ...(await collectSignals(page)),
      captured: true,
      headingVisible: await blankHeading.isVisible(),
      tenantId: blankTenantId,
    }
    screenshots.push(await screenshot(page, targetDir, 'blank-state'))

    expect(pageErrors, `React/page errors on ${target.route}`).toEqual([])
    const record = {
      schemaVersion: 1,
      key: target.key,
      label: target.label,
      route: target.route,
      routeLoaded: true,
      capturedAt: new Date().toISOString(),
      seeded,
      selectionProbe: { available: Boolean(firstCheckbox), clicked: selectionClicked },
      panelProbe,
      modalProbe,
      constrained,
      blank,
      pageErrors,
      screenshots,
      recordPath: path.relative(outputRoot!, path.join(outputRoot!, `${target.key}.json`)),
    }
    fs.writeFileSync(path.join(outputRoot!, `${target.key}.json`), `${JSON.stringify(record, null, 2)}\n`)
  })
}
