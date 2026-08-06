import { expect, type APIRequestContext } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import {
  createConnection,
  createExternalEntity,
  createInvestigation,
  resetBrowserState,
  seedOperationalScenario,
  testApiHeaders,
  waitForAppIdle,
} from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'

async function createVendor(request: APIRequestContext, stamp: string) {
  const response = await request.post(`${apiBase}/vendors`, {
    data: {
      name: `PW-SEED-VENDOR-${stamp}`,
      country: 'USA',
    },
    headers: testApiHeaders,
  })
  expect(response.ok()).toBeTruthy()
  return response.json()
}

test.describe('Golden Eight deterministic populated visual matrix', () => {
  test('renders representative populated desktop states for every completed target view', async ({ page, sysApi: request }, testInfo) => {
    await resetBrowserState(page)
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
      farm: `PW-SEED-FARM-${stamp}`,
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

    const routes = [
      { key: 'monitoring', path: '/monitoring', workspace: 'monitoring' },
      { key: 'assets', path: '/assets', workspace: 'assets' },
      { key: 'services', path: '/services', workspace: 'services' },
      { key: 'external', path: '/external', workspace: 'external' },
      { key: 'network', path: '/network', workspace: 'network' },
      { key: 'far', path: '/far', workspace: 'far' },
      { key: 'research', path: '/research', workspace: 'research' },
      { key: 'vendors', path: '/vendors', workspace: 'vendors' },
    ] as const

    await page.setViewportSize({ width: 1440, height: 1000 })

    for (const route of routes) {
      await page.goto(route.path)
      await waitForAppIdle(page)
      const workspace = page.locator(`[data-workspace="${route.workspace}"]`)
      await expect(workspace, `${route.key} workspace should render`).toBeVisible()
      await expect(
        workspace.locator('.ag-center-cols-container .ag-row').first(),
        `${route.key} should render at least one representative seeded row`,
      ).toBeVisible()
      await page.screenshot({
        path: testInfo.outputPath(`${route.key}-populated-desktop.png`),
        fullPage: true,
      })
    }
  })
})
