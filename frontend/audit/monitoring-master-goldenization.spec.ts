import fs from 'node:fs'
import path from 'node:path'
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { test } from '../tests/helpers/sysgrid-test'
import {
  createAsset,
  createConnection,
  createExternalEntity,
  createFarMode,
  createInvestigation,
  createService,
  ensureSettingOption,
  resetBrowserState,
  waitForAppIdle,
} from '../tests/helpers/sysgrid'

type SurfaceExpectation = { kind: 'workspace-panel' | 'text'; name?: string }
type ActionProbe = { kind: 'button' | 'title'; name: string; expected: SurfaceExpectation }
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
type AuditTenant = { id: string; name: string; backendSelected: boolean; activeLabelVerified: boolean }
type ProbeResult = {
  attempted: ActionProbe[]
  matched: ActionProbe | null
  expected: SurfaceExpectation | null
  beforeCount: number
  afterCount: number
  opened: boolean
  verified: boolean
  closeAttempts?: string[]
  closeMethod?: 'not-required' | 'escape' | 'toggle' | 'named-button' | 'nearby-button' | 'route-reload' | 'failed'
  closedBeforeModal?: boolean
  closedBeforeResponsive?: boolean
}

const targetConfig = JSON.parse(
  fs.readFileSync(new URL('./monitoring-master-targets.json', import.meta.url), 'utf8'),
) as { master: Target; targets: Target[] }

const outputRoot = process.env.SYSGRID_GOLDEN_AUDIT_DIR
const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'
const apiOrigin = apiBase.replace(/\/api\/v1$/, '')
const testUserId = process.env.USER_ID || 'haewon.kim'
const WORKSPACE_PANEL_SELECTOR = '[data-workspace-panel], body > .views-menu-container, body > .display-menu-container, body > .bulk-menu-container'
if (!outputRoot) throw new Error('SYSGRID_GOLDEN_AUDIT_DIR is required')

test.describe.configure({ mode: 'serial' })
test.use({ viewport: { width: 1920, height: 1080 } })

function ensureDir(dir: string) { fs.mkdirSync(dir, { recursive: true }) }
function escapedRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

async function visibleCount(locator: Locator) {
  let count = 0
  for (let index = 0; index < await locator.count(); index += 1) {
    if (await locator.nth(index).isVisible().catch(() => false)) count += 1
  }
  return count
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

function workspacePanelLocator(page: Page) {
  return page.locator(WORKSPACE_PANEL_SELECTOR)
}

function expectedLocator(page: Page, expected: SurfaceExpectation) {
  if (expected.kind === 'workspace-panel') return workspacePanelLocator(page)
  return page.getByText(new RegExp(`^${escapedRegex(expected.name || '')}$`, 'i'))
}

async function expectedSurfaceCount(page: Page, expected: SurfaceExpectation) {
  return visibleCount(expectedLocator(page, expected))
}

async function probeAction(page: Page, actions: ActionProbe[]): Promise<ProbeResult> {
  const match = await findAction(page, actions)
  const result = {
    attempted: actions,
    matched: match?.action || null,
    expected: match?.action.expected || null,
    beforeCount: 0,
    afterCount: 0,
    opened: false,
    verified: false,
  }
  if (!match) return result
  result.beforeCount = await expectedSurfaceCount(page, match.action.expected)
  await match.candidate.click().catch(() => {})
  await page.waitForTimeout(250)
  result.afterCount = await expectedSurfaceCount(page, match.action.expected)
  result.opened = result.afterCount > 0
  result.verified = result.afterCount > result.beforeCount
  return result
}

async function waitForSurfaceClosed(
  page: Page,
  expected: SurfaceExpectation,
  baselineCount: number,
  timeoutMs = 1_200,
) {
  const deadline = Date.now() + timeoutMs
  while (!page.isClosed() && Date.now() < deadline) {
    if (await expectedSurfaceCount(page, expected) <= baselineCount) return true
    await page.waitForTimeout(75).catch(() => {})
  }
  return !page.isClosed() && await expectedSurfaceCount(page, expected) <= baselineCount
}

async function clickWithinBudget(locator: Locator, timeoutMs = 1_200) {
  const candidate = await visibleCandidate(locator)
  if (!candidate) return false
  return candidate.click({ timeout: timeoutMs, force: true }).then(() => true).catch(() => false)
}

async function clickCloseNearExpected(page: Page, expected: SurfaceExpectation) {
  const marker = await visibleCandidate(expectedLocator(page, expected))
  if (!marker) return false
  const container = marker.locator('xpath=ancestor::*[self::div or self::section][.//button][1]')
  const buttons = container.locator('button')
  for (let index = (await buttons.count()) - 1; index >= 0; index -= 1) {
    const button = buttons.nth(index)
    if (!await button.isVisible().catch(() => false)) continue
    if (await button.click({ timeout: 1_200, force: true }).then(() => true).catch(() => false)) return true
  }
  return false
}

async function closeProbedSurface(page: Page, probe: ProbeResult, kind: 'panel' | 'modal', route: string) {
  probe.closeAttempts = []
  if (!probe?.verified || !probe?.expected) {
    probe.closeMethod = 'not-required'
    return true
  }
  const expected = probe.expected as SurfaceExpectation
  const closedAfter = async (attempt: string, method: ProbeResult['closeMethod']) => {
    probe.closeAttempts!.push(attempt)
    if (!await waitForSurfaceClosed(page, expected, probe.beforeCount)) return false
    probe.closeMethod = method
    return true
  }

  await page.keyboard.press('Escape').catch(() => {})
  if (await closedAfter('escape', 'escape')) return true

  if (kind === 'panel' && probe.matched) {
    const match = await findAction(page, [probe.matched as ActionProbe])
    if (match && await clickWithinBudget(match.candidate) && await closedAfter('toggle-trigger', 'toggle')) return true
  }

  if (kind === 'modal') {
    for (const name of ['Abort Initialization', 'Abort', 'Cancel', 'Close', 'Dismiss']) {
      const close = page.getByRole('button', { name: new RegExp(`^${escapedRegex(name)}$`, 'i') })
      if (await clickWithinBudget(close) && await closedAfter(`named-button:${name}`, 'named-button')) return true
    }
  }

  if (await clickCloseNearExpected(page, expected) && await closedAfter('nearby-header-button', 'nearby-button')) return true

  probe.closeAttempts.push('route-reload')
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 8_000 }).catch(() => {})
  await waitForAppIdle(page).catch(() => {})
  if (await waitForSurfaceClosed(page, expected, probe.beforeCount, 2_000)) {
    probe.closeMethod = 'route-reload'
    return true
  }

  probe.closeMethod = 'failed'
  return false
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
    visibleDialogCount: await visibleCount(page.getByRole('dialog')),
    visibleWorkspacePanelCount: await visibleCount(workspacePanelLocator(page)),
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

function scopedTenantRequest(request: APIRequestContext, tenantId: string) {
  const withTenant = (options: any = {}) => ({
    ...options,
    headers: { ...(options.headers || {}), 'X-Tenant-Id': tenantId },
  })
  return {
    get: (url: string, options?: any) => request.get(url, withTenant(options)),
    post: (url: string, options?: any) => request.post(url, withTenant(options)),
    put: (url: string, options?: any) => request.put(url, withTenant(options)),
    patch: (url: string, options?: any) => request.patch(url, withTenant(options)),
    delete: (url: string, options?: any) => request.delete(url, withTenant(options)),
  } as unknown as APIRequestContext
}

async function createAuditTenant(request: APIRequestContext, target: Target, phase: 'Seed' | 'Blank') {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const slug = `golden-audit-${phase.toLowerCase()}-${target.key}-${stamp}`
  const name = `Golden Audit ${phase} ${target.label} ${stamp}`
  const response = await request.post(`${apiBase}/tenants/admin/create`, { data: { name, db_name: slug } })
  const body = await response.text()
  expect(response.ok(), `${phase} tenant creation failed for ${target.label}: ${response.status()} ${body}`).toBeTruthy()
  const tenant = JSON.parse(body) as { id: number | string; name?: string }
  return { id: String(tenant.id), name: tenant.name || name }
}

async function assertActiveTenant(page: Page, tenantName: string) {
  const selector = page.locator('button').filter({ hasText: 'Active Database' }).filter({ hasText: tenantName }).first()
  await expect(selector, `Active Database did not show ${tenantName}`).toBeVisible({ timeout: 15_000 })
  return (await selector.innerText()).trim()
}

async function selectTenantForEvidence(request: APIRequestContext, page: Page, tenant: { id: string; name: string }, route: string): Promise<AuditTenant> {
  const response = await request.post(`${apiBase}/tenants/select`, { data: { tenant_id: Number(tenant.id) } })
  const body = await response.text()
  expect(response.ok(), `Tenant selection failed for ${tenant.name}: ${response.status()} ${body}`).toBeTruthy()
  const tenantsResponse = await request.get(`${apiBase}/tenants/me`)
  const tenantsBody = await tenantsResponse.text()
  expect(tenantsResponse.ok(), `Tenant list failed after selecting ${tenant.name}: ${tenantsResponse.status()} ${tenantsBody}`).toBeTruthy()
  const tenants = JSON.parse(tenantsBody) as Array<{ id: number | string; name?: string; is_selected?: boolean }>
  const selected = tenants.find((item) => String(item.id) === tenant.id && item.is_selected === true)
  expect(selected, `Backend did not mark ${tenant.name} (${tenant.id}) selected`).toBeTruthy()
  await setBrowserTenant(page, tenant.id)
  await page.goto(route)
  await waitForAppIdle(page)
  await assertActiveTenant(page, tenant.name)
  return { ...tenant, backendSelected: true, activeLabelVerified: true }
}

async function postAuditJson<T extends Record<string, any>>(
  request: APIRequestContext,
  pathOrUrl: string,
  data: Record<string, any>,
  label: string,
): Promise<T> {
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${apiBase}${pathOrUrl}`
  const response = await request.post(url, { data })
  const responseBody = await response.text()
  expect(
    response.ok(),
    `${label} failed: POST ${url} -> ${response.status()} ${responseBody}`,
  ).toBeTruthy()
  try {
    return JSON.parse(responseBody) as T
  } catch {
    throw new Error(`${label} returned non-JSON success body: ${responseBody}`)
  }
}

function auditAssetPayload(stamp: string, suffix: string, ipTail: number) {
  const ipSeed = Date.now() % 200
  return {
    name: `AUDIT-ASSET-${suffix}-${stamp}`,
    system: `AUDIT-SYS-${stamp}`,
    status: 'Active',
    model: 'R740',
    type: 'Physical',
    serial_number: `AUDIT-SN-${suffix}-${stamp}`,
    asset_tag: `AUDIT-TAG-${suffix}-${stamp}`,
    owner: '',
    business_unit: 'Operations',
    primary_ip: `10.91.${ipSeed}.${ipTail}`,
    management_ip: `10.92.${ipSeed}.${ipTail}`,
    environment: 'Prod',
  }
}

async function seedTarget(target: Target, request: APIRequestContext) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  if (target.key === 'monitoring') {
    const asset = await createAsset(request, auditAssetPayload(stamp, 'MON', 10))
    const monitoring = await postAuditJson<{ id: number; title: string }>(request, '/monitoring', {
      device_id: asset.id,
      category: 'Hardware',
      status: 'Existing',
      title: `AUDIT-MON-${stamp}`,
      purpose: 'Monitoring-master goldenization audit seed',
      impact: 'Audit-only seeded monitoring evidence',
      severity: 'Warning',
      owners: [],
      recovery_docs: [],
    }, 'Monitoring seed')
    return { seedLabel: monitoring.title, deepLinkId: monitoring.id, domainSeedCreated: true }
  }

  if (target.key === 'assets') {
    const asset = await createAsset(request, auditAssetPayload(stamp, 'ASSET', 11))
    return { seedLabel: asset.name, deepLinkId: asset.id, domainSeedCreated: true }
  }

  if (target.key === 'services') {
    const asset = await createAsset(request, auditAssetPayload(stamp, 'SERVICE', 12))
    const service = await createService(request, {
      name: `AUDIT-SVC-${stamp}`,
      service_type: 'Database',
      status: 'Active',
      version: '16.0',
      environment: 'Production',
      device_id: asset.id,
      purpose: 'Monitoring-master goldenization audit seed',
    })
    return { seedLabel: service.name, deepLinkId: service.id, domainSeedCreated: true }
  }

  if (target.key === 'far') {
    const asset = await createAsset(request, auditAssetPayload(stamp, 'FAR', 13))
    const failureMode = await createFarMode(request, {
      system_name: asset.system,
      title: `AUDIT-FAR-${stamp}`,
      effect: 'Audit-only simulated failure mode',
      severity: 8,
      occurrence: 4,
      detection: 3,
      affected_assets: [asset.id],
    })
    return { seedLabel: failureMode.title, deepLinkId: failureMode.id, domainSeedCreated: true }
  }

  if (target.key === 'external') {
    const entity = await createExternalEntity(request, {
      name: `AUDIT-EXT-${stamp}`, external_key: `audit-ext-${stamp}`.toLowerCase(), type: 'API',
      owner_organization: 'Audit Partner', ownership_mode: 'individual', status: 'Active', environment: 'Production',
      description: 'Monitoring-master goldenization audit seed',
    })
    return { seedLabel: entity.name, deepLinkId: entity.id, domainSeedCreated: true }
  }

  if (target.key === 'network') {
    const sourceAsset = await createAsset(request, auditAssetPayload(stamp, 'NET-A', 14))
    const targetAsset = await createAsset(request, auditAssetPayload(stamp, 'NET-B', 15))
    const farm = `AUDIT-NET-${stamp}`
    await ensureSettingOption(request, 'NetworkFarm', farm)
    const connection = await createConnection(request, {
      device_a_id: sourceAsset.id, source_port: 'audit0', device_b_id: targetAsset.id,
      target_port: 'audit1', link_type: 'Data', speed_gbps: 10, unit: 'Gbps', status: 'Active', farm,
    })
    return { seedLabel: farm, deepLinkId: connection.id, domainSeedCreated: true }
  }

  if (target.key === 'research') {
    const investigation = await createInvestigation(request, {
      title: `AUDIT-RESEARCH-${stamp}`, status: 'ANALYZING', priority: 'HIGH',
      systems: [`AUDIT-SYS-${stamp}`], initiation_at: '2037-02-03T04:05:00',
    })
    return { seedLabel: investigation.title, deepLinkId: investigation.id, domainSeedCreated: true }
  }

  if (target.key === 'vendors') {
    const vendor = await postAuditJson<{ id: number; name: string }>(request, '/vendors', {
      name: `AUDIT-VENDOR-${stamp}`,
      country: 'USA',
    }, 'Vendor seed')
    return { seedLabel: vendor.name, deepLinkId: vendor.id, domainSeedCreated: true }
  }

  return { seedLabel: null, domainSeedCreated: false }
}

async function filterToSeed(page: Page, target: Target, seedLabel: string | null) {
  if (!seedLabel) return { matchedPlaceholder: null, filtered: false }
  for (const placeholder of target.searchPlaceholders) {
    const candidate = await visibleCandidate(page.getByPlaceholder(placeholder))
    if (!candidate) continue
    await candidate.fill(seedLabel)
    await page.keyboard.press('Enter')
    return { matchedPlaceholder: placeholder, filtered: true }
  }
  return { matchedPlaceholder: null, filtered: false }
}

for (const target of [targetConfig.master, ...targetConfig.targets]) {
  test(`${target.label} evidence rebaseline`, async ({ page, sysApi: request }) => {
    test.setTimeout(150_000)
    const targetDir = path.join(outputRoot!, target.key)
    ensureDir(targetDir)
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await resetBrowserState(page)
    const seededTenantBase = await createAuditTenant(request, target, 'Seed')
    const seededTenant = await selectTenantForEvidence(request, page, seededTenantBase, target.route)
    const tenantRequest = scopedTenantRequest(request, seededTenant.id)
    const seed = await seedTarget(target, tenantRequest)
    await page.goto(target.route)
    await waitForAppIdle(page)
    await assertActiveTenant(page, seededTenant.name)
    const heading = page.getByRole('heading', { name: new RegExp(escapedRegex(target.heading), 'i') }).first()
    await expect(heading).toBeVisible()
    const searchProbe = await filterToSeed(page, target, seed.seedLabel)
    await waitForAppIdle(page)
    const seeded = {
      ...(await collectSignals(page)),
      headingVisible: await heading.isVisible(),
      domainSeedCreated: seed.domainSeedCreated,
      seedLabel: seed.seedLabel,
      filteredToSeed: searchProbe.filtered,
      matchedSearchPlaceholder: searchProbe.matchedPlaceholder,
      tenant: seededTenant,
    }
    const screenshots: string[] = []
    screenshots.push(await screenshot(page, targetDir, 'seeded-default'))

    const firstCheckbox = await visibleCandidate(page.locator('.ag-selection-checkbox'))
    let selectionClicked = false
    if (firstCheckbox) { await firstCheckbox.click().catch(() => {}); selectionClicked = true }
    screenshots.push(await screenshot(page, targetDir, 'selection-state'))

    const panelProbe = await probeAction(page, target.preferredPanelActions)
    screenshots.push(await screenshot(page, targetDir, 'panel-probe'))
    panelProbe.closedBeforeModal = await closeProbedSurface(page, panelProbe, 'panel', target.route)
    expect(panelProbe.closedBeforeModal, `${target.label} panel teardown did not close or reset the verified surface`).toBeTruthy()

    const modalProbe = await probeAction(page, target.preferredModalActions)
    screenshots.push(await screenshot(page, targetDir, 'modal-probe'))
    modalProbe.closedBeforeResponsive = await closeProbedSurface(page, modalProbe, 'modal', target.route)
    expect(modalProbe.closedBeforeResponsive, `${target.label} modal teardown did not close or reset the verified surface`).toBeTruthy()

    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto(target.route)
    await waitForAppIdle(page)
    const constrainedTenantLabel = await assertActiveTenant(page, seededTenant.name)
    const constrainedSignals = await collectSignals(page)
    const expectedPanelSurfaceCount = panelProbe.expected ? await expectedSurfaceCount(page, panelProbe.expected) : 0
    const expectedModalSurfaceCount = modalProbe.expected ? await expectedSurfaceCount(page, modalProbe.expected) : 0
    const constrained = {
      ...constrainedSignals,
      captured: true,
      tenant: seededTenant,
      activeTenantLabel: constrainedTenantLabel,
      modalClosedBeforeCapture: modalProbe.closedBeforeResponsive,
      panelClosedBeforeCapture: panelProbe.closedBeforeModal,
      expectedPanelSurfaceCount,
      expectedModalSurfaceCount,
      baseSurfaceClean: constrainedSignals.visibleDialogCount === 0
        && constrainedSignals.visibleWorkspacePanelCount === 0
        && expectedPanelSurfaceCount === 0
        && expectedModalSurfaceCount === 0,
    }
    expect(constrained.baseSurfaceClean, `${target.label} constrained capture was contaminated by an open modal/panel`).toBeTruthy()
    screenshots.push(await screenshot(page, targetDir, 'constrained-width'))

    const blankTenantBase = await createAuditTenant(request, target, 'Blank')
    await page.setViewportSize({ width: 1920, height: 1080 })
    const blankTenant = await selectTenantForEvidence(request, page, blankTenantBase, target.route)
    const blankHeading = page.getByRole('heading', { name: new RegExp(escapedRegex(target.heading), 'i') }).first()
    await expect(blankHeading).toBeVisible()
    const blank = {
      ...(await collectSignals(page)),
      captured: true,
      headingVisible: await blankHeading.isVisible(),
      tenant: blankTenant,
    }
    screenshots.push(await screenshot(page, targetDir, 'blank-state'))

    expect(pageErrors, `React/page errors on ${target.route}`).toEqual([])
    const record = {
      schemaVersion: 2,
      key: target.key,
      label: target.label,
      route: target.route,
      routeLoaded: true,
      capturedAt: new Date().toISOString(),
      seededTenant,
      blankTenant,
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
