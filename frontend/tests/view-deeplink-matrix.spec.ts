import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import {
  createConnection,
  createProject,
  resetBrowserState,
  seedOperationalScenario,
} from './helpers/sysgrid'
import { expectHealthyShell, expectNoAppFailures, installStrictAppMonitoring } from './helpers/sentinel'

test.describe('View deep-link matrix', () => {
  test('opens critical deep links without crashing and resolves the targeted record', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const failures = installStrictAppMonitoring(page)
    const { primary, secondary, service, knowledge, monitoring, far } = await seedOperationalScenario(request)
    const project = await createProject(request, {
      name: `PW-PROJ-DEEPLINK-${Date.now()}`,
      type: 'Strategic',
      status: 'Planning',
      priority: 'High',
      target_assets: [primary.id],
      target_services: [service.id],
    })
    const connection = await createConnection(request, {
      device_a_id: primary.id,
      source_port: 'eth10',
      device_b_id: secondary.id,
      target_port: 'eth11',
      link_type: 'Loopback',
      speed_gbps: 10,
      unit: 'Gbps',
      status: 'Active',
      farm: `PW-DEEPLINK-${Date.now()}`,
    })

    await page.goto(`/asset?id=${primary.id}&search=${encodeURIComponent(primary.name)}&status=${encodeURIComponent(primary.status)}`)
    await expect(page.getByRole('textbox', { name: 'Search assets...' })).toHaveValue(primary.name)
    await expect(page.getByRole('treegrid')).toContainText(primary.name)

    await page.goto(`/services?id=${service.id}`)
    await expect(page.getByRole('heading', { name: service.name })).toBeVisible()

    await page.goto(`/projects?id=${project.id}`)
    await expect(page.locator('h1').filter({ hasText: project.name })).toBeVisible()

    await page.goto(`/monitoring?id=${monitoring.id}`)
    await expect(page.getByText(monitoring.title)).toBeVisible()

    await page.goto(`/far?id=${far.id}`)
    await expect(page.getByRole('heading', { name: far.title })).toBeVisible()

    await page.goto(`/knowledge?device_id=${primary.id}`)
    await expect(page.getByText(knowledge.title).first()).toBeVisible()
    await expect(page.getByText('Suggested Knowledge Context')).toBeVisible()

    await page.goto(`/network?id=${connection.id}`)
    await expect(page.getByRole('heading', { name: 'Connection Forensics' })).toBeVisible()

    await page.goto(`/logs?target_table=logical_services&target_id=${service.id}`)
    await expect(page.getByText(`Scoped: logical_services // ${service.id}`)).toBeVisible()

    await page.goto('/settings?tab=permissions')
    await expect(page.getByText('Identity Sync Pipeline')).toBeVisible()

    await expectHealthyShell(page)
    await expectNoAppFailures(failures, 'deep-link matrix')
  })
})
