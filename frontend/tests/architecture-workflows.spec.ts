import { expect, test } from '@playwright/test'
import { createExternalEntity, createService, resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'

test.describe('Architecture workflows', () => {
  test('creates an architecture, adds internal and external inventory, and persists the manifest', async ({ page, request }) => {
    await resetBrowserState(page)
    const { primary, knowledge, monitoring, far } = await seedOperationalScenario(request)
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const externalEntity = await createExternalEntity(request, {
      name: `PW-ARCH-EXT-${stamp}`,
      type: 'API',
      owner_organization: 'PartnerCo',
      owner_team: 'Architecture',
      status: 'Active',
      environment: 'Production',
      description: 'Playwright architecture dependency'
    })
    const vendorResponse = await request.post(`${apiBase}/vendors`, {
      data: {
        name: `PW-ARCH-VENDOR-${stamp}`,
        country: 'United States',
      },
    })
    expect(vendorResponse.ok()).toBeTruthy()
    const vendor = await vendorResponse.json()
    const architectureName = `PW-ARCH-${stamp}`

    await page.goto('/architecture')
    await expect(page.getByRole('heading', { name: 'Architecture Matrix' })).toBeVisible()

    await page.getByRole('button', { name: /New Architecture/i }).click()
    const architectureModal = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'New Architecture' }) })
    await expect(architectureModal).toBeVisible()
    await architectureModal.getByPlaceholder('e.g. CORE-PAYMENT-INGRESS').fill(architectureName)
    await architectureModal.getByPlaceholder('Describe the business and technical purpose...').fill('Playwright architecture coverage')
    await architectureModal.getByPlaceholder('e.g. Core Platform').fill('Core Platform')
    await architectureModal.getByPlaceholder('Critical / High / Medium / Low').fill('Critical')
    await architectureModal.getByPlaceholder('Tier 1 / Tier 2 / Tier 3').fill('Tier 1')
    await architectureModal.getByPlaceholder('Approved / Needs Review / Exception').fill('Approved')
    await architectureModal.getByPlaceholder('https://wiki.example.com/runbook').fill('https://wiki.example.com/architecture-runbook')
    await architectureModal.getByRole('button', { name: /Create Architecture/i }).scrollIntoViewIfNeeded()
    await architectureModal.getByRole('button', { name: /Create Architecture/i }).evaluate((node: HTMLButtonElement) => node.click())

    await expect(page.getByText('Manifest Persistent in Core Registry')).toBeVisible()
    await expect(page.getByRole('button', { name: /Back/i })).toBeVisible()
    await expect(page.getByText('Inventory')).toBeVisible()
    await expect(page.getByText('Core Platform')).toBeVisible()
    await expect(page.getByText('Critical', { exact: true })).toBeVisible()
    await expect(page.getByText('Approved', { exact: true })).toBeVisible()

    await page.getByPlaceholder('Search...').fill(primary.name)
    await page.getByRole('button', { name: new RegExp(primary.name, 'i') }).click()
    await expect(page.getByText('Added')).toBeVisible()

    await page.getByRole('button', { name: 'External', exact: true }).click()
    await page.getByPlaceholder('Search...').fill(externalEntity.name)
    await page.getByRole('button', { name: new RegExp(externalEntity.name, 'i') }).click()

    await page.getByRole('button', { name: /Commit Changes/i }).click()
    await expect(page.getByText('Manifest Persistent in Core Registry')).toBeVisible()

    const flowsRes = await request.get(`${apiBase}/data-flows`)
    expect(flowsRes.ok()).toBeTruthy()
    const flows = await flowsRes.json()
    const flow = flows.find((entry: any) => entry.name === architectureName)
    expect(flow).toBeTruthy()

    const updateRes = await request.put(`${apiBase}/data-flows/${flow.id}`, {
      data: {
        metadata: {
          ...flow.metadata,
          review_status: 'Needs Review',
          links: {
            knowledge_ids: [knowledge.id],
            monitoring_ids: [monitoring.id],
            far_ids: [far.id],
            vendor_ids: [vendor.id],
            project_ids: [],
          },
        },
        nodes: flow.nodes,
        edges: flow.edges,
        viewport: flow.viewport,
        change_summary: 'Linked operating context',
      },
    })
    expect(updateRes.ok()).toBeTruthy()

    await page.goto('/architecture')
    await expect(page.getByRole('heading', { name: 'Architecture Matrix' })).toBeVisible()
    await page.getByPlaceholder('Search architectures...').fill(architectureName)
    await expect(page.locator('.ag-center-cols-container')).toContainText(architectureName)
    await expect(page.locator('.ag-center-cols-container')).toContainText('Core Platform')
    await page.getByRole('button', { name: /Initialize/i }).click()
    await expect(page.getByText('Needs Review', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /History/i }).click()
    await expect(page.getByRole('heading', { name: 'Version History' })).toBeVisible()
    await expect(page.getByText('Linked operating context')).toBeVisible()
    await page.getByRole('button', { name: /Approve Current Version/i }).click()
    await expect(page.getByText('Architecture Approved')).toBeVisible()
    await expect(page.getByText('Approved', { exact: true })).toBeVisible()
    await page.getByLabel('Close history').click()

    await page.getByTitle('Report Mode').click()
    await expect(page.getByRole('heading', { name: 'Architecture Report' })).toBeVisible()
    await expect(page.getByText('Knowledge: 1')).toBeVisible()
    await expect(page.getByText('Monitoring: 1')).toBeVisible()
    await expect(page.getByText('FAR: 1')).toBeVisible()
    await expect(page.getByText('Vendors: 1')).toBeVisible()
    await page.getByLabel('Close report').click()

    await page.selectOption('select', 'ATTENTION_ONLY')
    await expect(page.getByText('ATTENTION ONLY')).toBeVisible()

    await page.getByTitle('Presentation Mode').click()
    await expect(page.getByText('Presentation Mode Active')).toBeVisible()
    await page.getByTitle('Presentation Mode').click()

    await page.locator('[data-testid^="rf__node-device-"]').first().click({ force: true })
    await page.getByRole('link', { name: 'Asset' }).click()
    await expect(page).toHaveURL(/\/asset$/)
  })

  test('persists service-level swimlane workflows and protects against accidental exit', async ({ page, request }) => {
    await resetBrowserState(page)
    const { primary, secondary, service } = await seedOperationalScenario(request)
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const targetService = await createService(request, {
      name: `PW-SVC-TGT-${stamp}`,
      service_type: 'Web API',
      status: 'Active',
      version: '1.0',
      environment: 'Production',
      device_id: secondary.id,
      purpose: 'Target service for swimlane persistence'
    })
    const flowName = `PW-ARCH-SVC-${stamp}`
    const flowResponse = await request.post(`${apiBase}/data-flows`, {
      data: {
        name: flowName,
        description: 'Service swimlane persistence flow',
        category: 'Service',
        status: 'Planned',
        metadata: {
          owner_team: 'Payments Engineering',
          criticality: 'Critical',
          dependency_tier: 'Tier 1',
          review_status: 'Approved',
          business_purpose: 'Service choreography validation',
          runbook_url: 'https://wiki.example.com/swimlane-runbook'
        },
        nodes: [
          {
            id: `device-${primary.id}`,
            type: 'device',
            position: { x: 120, y: 200 },
            data: {
              ...primary,
              name: primary.name,
              status: primary.status,
              ip_address: primary.primary_ip || '',
              logical_services: [],
              all_available_services: [service]
            }
          },
          {
            id: `device-${secondary.id}`,
            type: 'device',
            position: { x: 620, y: 200 },
            data: {
              ...secondary,
              name: secondary.name,
              status: secondary.status,
              ip_address: secondary.primary_ip || '',
              logical_services: [],
              all_available_services: [targetService]
            }
          }
        ],
        edges: [
          {
            id: `edge-${stamp}`,
            source: `device-${primary.id}`,
            target: `device-${secondary.id}`,
            type: 'labeled',
            data: {
              type: 'DATA',
              label: 'SYNC_PATH',
              protocol: 'HTTPS',
              logic_json: { lanes: [], flow: { nodes: [], edges: [] } }
            },
            animated: true
          }
        ],
        viewport: { x: 0, y: 0, zoom: 1 }
      }
    })
    expect(flowResponse.ok()).toBeTruthy()

    await page.goto('/architecture')
    await page.getByPlaceholder('Search architectures...').fill(flowName)
    await page.getByRole('button', { name: /Initialize/i }).click()
    await expect(page.getByText('Payments Engineering')).toBeVisible()

    await page.getByText('SYNC_PATH', { exact: true }).click()
    await page.getByRole('button', { name: /Service Logic Builder/i }).click()
    await expect(page.getByRole('heading', { name: 'Service Logic' })).toBeVisible()
    await page.getByRole('button', { name: new RegExp(targetService.name, 'i') }).click()
    await page.getByLabel(`Move ${targetService.name} lane left`).click()
    await page.getByRole('button', { name: /^Logic$/ }).first().click()
    await expect(page.getByText('Orphan Steps: 1')).toBeVisible()
    await page.getByRole('button', { name: /Undo/i }).click()
    await expect(page.locator('input[value="NEW STEP"]')).not.toBeVisible()
    await page.getByRole('button', { name: /Redo/i }).click()
    await expect(page.locator('input[value="NEW STEP"]')).toBeVisible()
    await page.locator('input[value="NEW STEP"]').fill('VALIDATE PAYLOAD')

    await page.getByRole('button', { name: 'Exit', exact: true }).click()
    await expect(page.getByText('Unsaved Workflow')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()

    await page.getByRole('button', { name: /Sync Workflow/i }).click()
    await expect(page.getByText('Workflow Manifest Synchronized')).toBeVisible()
    await page.getByRole('button', { name: 'Exit', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Service Logic' })).not.toBeVisible()

    await page.getByText('SYNC_PATH', { exact: true }).click()
    await page.getByRole('button', { name: /Service Logic Builder/i }).click()
    await expect(page.getByText(targetService.name)).toBeVisible()
    await expect(page.locator('input[value="VALIDATE PAYLOAD"]')).toBeVisible()
  })
})
