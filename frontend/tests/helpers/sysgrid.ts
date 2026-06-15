import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'
const apiOrigin = apiBase.replace(/\/api\/v1$/, '')
const testUserId = process.env.USER_ID || 'haewon.kim'

async function post(request: APIRequestContext, path: string, data: Record<string, any>) {
  const response = await request.post(`${apiBase}${path}`, { 
    data,
    headers: { 'X-User-Id': testUserId, 'X-Tenant-Id': '1' }
  })
  if (!response.ok()) {
     const text = await response.text()
     console.error(`POST ${path} FAILED: ${response.status()} ${text}`)
  }
  expect(response.ok()).toBeTruthy()
  const resData = await response.json()
  if (path === '/monitoring') {
     console.log(`SEED: Created monitoring item "${resData.title}" (ID: ${resData.id})`)
  }
  return resData
}

async function put(request: APIRequestContext, path: string, data: Record<string, any>) {
  const response = await request.put(`${apiBase}${path}`, { 
    data,
    headers: { 'X-User-Id': testUserId, 'X-Tenant-Id': '1' }
  })
  expect(response.ok()).toBeTruthy()
  return response.json()
}

async function get(request: APIRequestContext, path: string) {
  const response = await request.get(`${apiBase}${path}`, {
    headers: { 'X-User-Id': testUserId, 'X-Tenant-Id': '1' }
  })
  expect(response.ok()).toBeTruthy()
  return response.json()
}

async function ensureSettingOption(
  request: APIRequestContext,
  category: string,
  value: string,
  label = value,
) {
  const options = await get(request, `/settings/options?category=${encodeURIComponent(category)}`)
  const existing = Array.isArray(options)
    ? options.find((option: Record<string, any>) => option.value === value || option.label === label)
    : null
  if (existing) return existing
  return post(request, '/settings/options', { category, value, label })
}

export async function resetBrowserState(page: Page) {
  const testResetToken = `pw-reset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const testUserId = process.env.USER_ID || 'haewon.kim'
  
  // Clear backend user settings
  try {
    await page.request.post(`${apiBase}/settings/user/settings`, {
      data: {
        monitoring_ui_state: null,
        asset_ui_state: null,
        project_ui_state: null,
        far_ui_state: null,
        rca_ui_state: null,
        investigation_ui_state: null,
        settings_ui_state: null,
      },
      headers: {
        'X-User-Id': testUserId
      }
    })
  } catch (e) {
    console.error('Failed to clear backend settings:', e)
  }

  await page.addInitScript(({ injectedApiOrigin, resetToken, userId }) => {
    const appliedToken = window.sessionStorage.getItem('__sysgrid_pw_bootstrap__')
    if (!appliedToken || appliedToken !== resetToken) {
      window.localStorage.clear()
      window.sessionStorage.clear()
      window.sessionStorage.setItem('__sysgrid_pw_bootstrap__', resetToken)
    }
    window.localStorage.setItem('SYSGRID_OVERRIDE_API_URL', injectedApiOrigin)
    window.localStorage.setItem('SYSGRID_USER_ID', userId)
  }, { injectedApiOrigin: apiOrigin, resetToken: testResetToken, userId: testUserId })
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
  if (!payload.internal_team_id && !payload.internal_operator_id) {
    const operators = await get(request, '/settings/operators')
    payload = {
      ownership_mode: 'individual',
      internal_operator_id: operators[0]?.id,
      contacts_json: [
        {
          role: 'Primary',
          full_name: 'Primary Contact',
          email: 'primary.contact@example.com',
          phone: '+1-555-0100',
          external_person_id: 'primary-contact',
          is_primary: true,
          is_escalation: false,
        },
      ],
      business_purpose: 'External dependency support',
      criticality: 'Low',
      dependency_tier: 'Tier 3',
      integration_mode: payload.type === 'API' ? 'API' : 'Manual',
      auth_method: payload.type === 'API' ? 'Token' : 'Manual',
      primary_endpoint_url: payload.type === 'API' ? 'https://partner.example.com' : undefined,
      risk_rating: 'Low',
      ...payload,
    }
  }
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
  let nextPayload = { ...payload }

  if (typeof nextPayload.category === 'string' && nextPayload.category.trim()) {
    await ensureSettingOption(request, 'MonitoringCategory', nextPayload.category.trim())
  }
  if (typeof nextPayload.platform === 'string' && nextPayload.platform.trim()) {
    await ensureSettingOption(request, 'MonitoringPlatform', nextPayload.platform.trim())
  }
  if (typeof nextPayload.notification_method === 'string' && nextPayload.notification_method.trim()) {
    await ensureSettingOption(request, 'NotificationMethod', nextPayload.notification_method.trim())
  }

  const ensureOwnershipSeed = async () => {
    let teams = await get(request, '/settings/teams').catch(() => [])
    let operators = await get(request, '/settings/operators').catch(() => [])

    if (!teams.length) {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const team = await post(request, '/settings/teams', {
        name: `PW Team ${stamp}`,
        description: 'Playwright monitoring ownership seed',
      })
      teams = [team]
    }

    if (!operators.length) {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const op1 = await post(request, '/settings/operators', {
        external_id: `pw1-${stamp}`,
        username: `pw1_${stamp}`,
        full_name: `Playwright Operator 1 ${stamp}`,
        email: `pw1-${stamp}@sysgrid.test`,
        department: 'Operations',
        team_id: teams[0]?.id,
      })
      const op2 = await post(request, '/settings/operators', {
        external_id: `pw2-${stamp}`,
        username: `pw2_${stamp}`,
        full_name: `Playwright Operator 2 ${stamp}`,
        email: `pw2-${stamp}@sysgrid.test`,
        department: 'Operations',
        team_id: teams[0]?.id,
      })
      operators = [op1, op2]
    }

    return { teams, operators }
  }

  if (Array.isArray(nextPayload.owners) && nextPayload.owners.length > 0 && !nextPayload.owners.every((owner: Record<string, any>) => owner.operator_id)) {
    const { operators } = await ensureOwnershipSeed()
    nextPayload = {
      ...nextPayload,
      owner_team: '',
      owners: nextPayload.owners.slice(0, operators.length).map((owner: Record<string, any>, index: number) => ({
        operator_id: operators[index].id,
        role: owner.role || 'Primary Support',
      })),
    }
  }

  if (!nextPayload.owner_team && (!Array.isArray(nextPayload.owners) || nextPayload.owners.length === 0)) {
    const { teams, operators } = await ensureOwnershipSeed()
    if (teams[0]?.name) {
      nextPayload = {
        ...nextPayload,
        owner_team: teams[0].name,
        owners: [],
      }
    } else {
      nextPayload = {
        ...nextPayload,
        owner_team: '',
        owners: operators[0]?.id
          ? [{ operator_id: operators[0].id, role: 'Primary Support' }]
          : [],
      }
    }
  }

  return post(request, '/monitoring', nextPayload)
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

  const monitoring = await createMonitoring(request, {
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

export async function getColumnWidth(page: Page, colId: string): Promise<number> {
  return page.evaluate((id) => {
    // @ts-ignore
    const api = window.__MONITORING_GRID_API__ || window.__ASSET_GRID_API__ || window.__PROJECT_GRID_API__
    if (!api) return 0
    const col = api.getColumnState().find((c: any) => c.colId === id)
    return col ? col.width : 0
  }, colId)
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
  await page.keyboard.press('Enter')
  // Wait for AgGrid to potentially filter
  await page.waitForTimeout(500)
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

export async function waitForAppIdle(page: Page) {
  const loaders = ['Scanning monitoring matrix...', 'Synchronizing Matrix...', 'Scanning infrastructure registry...', 'Loading...'];
  for (const loader of loaders) {
    await page.getByText(loader).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

export async function clickResilientButton(page: Page, ...names: (string | RegExp)[]) {
  for (const name of names) {
    const btn = page.getByRole('button', { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      return;
    }
  }
  for (const name of names) {
    const btn = page.getByText(name).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      return;
    }
  }
  throw new Error(`Could not find resilient button matching any of: ${names.join(', ')}`);
}

export async function verifyGridRowRobust(page: Page, searchString: string | RegExp) {
  const { expect } = require('@playwright/test');
  await expect(page.locator('.ag-cell').filter({ hasText: searchString }).first()).toBeVisible({ timeout: 15000 });
}
