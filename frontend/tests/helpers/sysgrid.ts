import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'
const apiOrigin = apiBase.replace(/\/api\/v1$/, '')

async function post(request: APIRequestContext, path: string, data: Record<string, any>) {
  const response = await request.post(`${apiBase}${path}`, { data })
  expect(response.ok()).toBeTruthy()
  return response.json()
}

async function put(request: APIRequestContext, path: string, data: Record<string, any>) {
  const response = await request.put(`${apiBase}${path}`, { data })
  expect(response.ok()).toBeTruthy()
  return response.json()
}

export async function resetBrowserState(page: Page) {
  const testResetToken = `pw-reset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  await page.addInitScript(({ injectedApiOrigin, resetToken }) => {
    const appliedToken = window.sessionStorage.getItem('__sysgrid_pw_bootstrap__')
    if (!appliedToken || appliedToken !== resetToken) {
      window.localStorage.clear()
      window.sessionStorage.clear()
      window.sessionStorage.setItem('__sysgrid_pw_bootstrap__', resetToken)
    }
    window.localStorage.setItem('SYSGRID_OVERRIDE_API_URL', injectedApiOrigin)
  }, { injectedApiOrigin: apiOrigin, resetToken: testResetToken })
}

export async function createAsset(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/devices', payload)
}

export async function createFarCause(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/far/causes', payload)
}

export async function createFarMode(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/far/modes', payload)
}

export async function createFarMitigation(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/far/mitigations', payload)
}

export async function createInvestigation(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/investigations', payload)
}

export async function updateFarMode(request: APIRequestContext, modeId: number, payload: Record<string, any>) {
  return put(request, `/far/modes/${modeId}`, payload)
}

export async function createConnection(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/networks/connections', payload)
}

export async function createExternalEntity(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/intelligence/entities', payload)
}

export async function addExternalSecret(request: APIRequestContext, entityId: number, payload: Record<string, any>) {
  return post(request, `/intelligence/entities/${entityId}/secrets`, payload)
}

export async function createProject(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/projects', payload)
}

export async function updateProject(request: APIRequestContext, projectId: number, payload: Record<string, any>) {
  return put(request, `/projects/${projectId}`, payload)
}

export async function createService(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/logical-services', payload)
}

export async function createMonitoring(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/monitoring', payload)
}

export async function updateService(request: APIRequestContext, serviceId: number, payload: Record<string, any>) {
  return put(request, `/logical-services/${serviceId}`, payload)
}

export async function updateConnection(request: APIRequestContext, connectionId: number, payload: Record<string, any>) {
  return put(request, `/networks/connections/${connectionId}`, payload)
}

export async function createSite(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/sites', payload)
}

export async function createRack(request: APIRequestContext, payload: Record<string, any>) {
  return post(request, '/racks', payload)
}

export async function mountRackDevice(request: APIRequestContext, rackId: number, payload: Record<string, any>) {
  return post(request, `/racks/${rackId}/mount`, payload)
}

export async function seedOperationalScenario(request: APIRequestContext) {
  const stamp = Date.now()
  const nonce = `${stamp}-${Math.random().toString(36).slice(2, 8)}`
  const ipSeed = stamp % 200
  const systemName = `PW-SYS-${nonce}`

  const primary = await createAsset(request, {
    name: `PW-ASSET-A-${nonce}`,
    system: systemName,
    status: 'Maintenance',
    model: 'R740',
    type: 'Physical',
    serial_number: `PW-SN-A-${nonce}`,
    asset_tag: `PW-TAG-A-${nonce}`,
    owner: '',
    business_unit: 'Operations',
    primary_ip: `10.0.${ipSeed}.10`,
    management_ip: `10.0.${ipSeed}.11`
  })

  const secondary = await createAsset(request, {
    name: `PW-ASSET-B-${nonce}`,
    system: systemName,
    status: 'Active',
    model: 'R740',
    type: 'Physical',
    serial_number: `PW-SN-B-${nonce}`,
    asset_tag: `PW-TAG-B-${nonce}`,
    owner: 'admin_root',
    business_unit: 'Operations',
    primary_ip: `10.0.${ipSeed}.12`,
    management_ip: `10.0.${ipSeed}.13`,
    environment: 'DR'
  })

  const service = await post(request, '/logical-services', {
    name: `PW-SVC-${nonce}`,
    service_type: 'Database',
    status: 'Active',
    version: '16.0',
    environment: 'Production',
    device_id: primary.id,
    purpose: 'Playwright validation service'
  })

  const knowledge = await post(request, '/knowledge', {
    category: 'BKM',
    title: `PW-RUNBOOK-${nonce}`,
    content: 'Recovery procedure',
    tags: ['Playwright'],
    linked_device_ids: [primary.id]
  })

  const monitoring = await post(request, '/monitoring', {
    device_id: primary.id,
    category: 'Hardware',
    status: 'Existing',
    title: `PW-MON-${nonce}`,
    platform: 'Zabbix',
    purpose: 'Playwright validation',
    impact: 'Simulated degradation path',
    notification_method: 'Slack',
    severity: 'Critical',
    recovery_docs: [knowledge.id]
  })

  const maintenance = await post(request, '/maintenance', {
    device_id: primary.id,
    title: `PW-MAINT-${nonce}`,
    start_time: '2030-01-01T00:00:00Z',
    end_time: '2030-01-01T02:00:00Z',
    ticket_number: `PW-CHG-${nonce}`,
    coordinator: 'Playwright',
    status: 'Scheduled'
  })

  const far = await post(request, '/far/modes', {
    system_name: systemName,
    title: `PW-FAR-${nonce}`,
    effect: 'Simulated failure mode',
    severity: 8,
    occurrence: 4,
    detection: 3,
    affected_assets: [primary.id]
  })

  return { stamp: nonce, systemName, primary, secondary, service, knowledge, monitoring, maintenance, far }
}

export async function seedRackScenario(request: APIRequestContext) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const siteA = await createSite(request, {
    name: `PW-RACK-SITE-A-${stamp}`,
    address: 'Primary hall',
    color: '#2563eb'
  })
  const siteB = await createSite(request, {
    name: `PW-RACK-SITE-B-${stamp}`,
    address: 'Secondary hall',
    color: '#059669'
  })

  const rackA1 = await createRack(request, {
    site_id: siteA.id,
    name: `PW-RACK-A1-${stamp}`,
    aisle: 'A',
    row: '1',
    total_u: 12,
    max_power_kw: 10
  })
  const rackA2 = await createRack(request, {
    site_id: siteA.id,
    name: `PW-RACK-A2-${stamp}`,
    aisle: 'A',
    row: '1',
    total_u: 12,
    max_power_kw: 10
  })
  const rackBConflict = await createRack(request, {
    site_id: siteB.id,
    name: rackA1.name,
    aisle: 'B',
    row: '1',
    total_u: 12,
    max_power_kw: 10
  })

  const devicePrimary = await createAsset(request, {
    name: `PW-RACK-DEV-A-${stamp}`,
    system: `PW-RACK-SYS-${stamp}`,
    status: 'Active',
    model: 'R640',
    type: 'Physical',
    serial_number: `PW-RACK-SN-A-${stamp}`,
    asset_tag: `PW-RACK-TAG-A-${stamp}`,
    owner: 'rack-owner',
    business_unit: 'Operations'
  })
  const deviceSecondary = await createAsset(request, {
    name: `PW-RACK-DEV-B-${stamp}`,
    system: `PW-RACK-SYS-${stamp}`,
    status: 'Active',
    model: 'R640',
    type: 'Physical',
    serial_number: `PW-RACK-SN-B-${stamp}`,
    asset_tag: `PW-RACK-TAG-B-${stamp}`,
    owner: 'rack-owner',
    business_unit: 'Operations'
  })

  await mountRackDevice(request, rackA1.id, {
    device_id: devicePrimary.id,
    start_u: 1,
    size_u: 2,
    orientation: 'Front',
    depth: 'Full'
  })

  return { stamp, siteA, siteB, rackA1, rackA2, rackBConflict, devicePrimary, deviceSecondary }
}

export async function gotoView(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path)
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
}

export function getPrimaryGrid(page: Page): Locator {
  return page.locator('[role="treegrid"]')
}

export async function fillGridSearch(page: Page, placeholder: string | RegExp, value: string) {
  const search = page.getByPlaceholder(placeholder)
  await search.fill(value)
  return search
}

export async function selectGridCheckboxRows(page: Page, indices: number[]) {
  const checkboxes = page.getByRole('checkbox', { name: /Press Space to toggle row selection/i })
  for (const index of indices) {
    await checkboxes.nth(index).check()
  }
}

export async function openToolbarButton(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name }).first().click()
}

export async function expectToast(page: Page, message: string | RegExp) {
  await expect(page.getByText(message).last()).toBeVisible()
}
