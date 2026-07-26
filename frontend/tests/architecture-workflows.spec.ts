import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { createExternalEntity, createService, resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'

test.describe('Architecture workflows', () => {
  test('creates an architecture, adds internal and external inventory, and persists the manifest', async ({ page, sysApi: request }) => {
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

    await clickResilientButton(page, /New Architecture/i)
    const architectureModal = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'New Architecture' }) })
    await expect(architectureModal).toBeVisible()
    await architectureModal.getByPlaceholder(/core payment ingress/i).fill(architectureName)
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
    const primaryBtn = page.getByRole('button', { name: new RegExp(primary.name, 'i') })
    await expect(primaryBtn).toBeVisible({ timeout: 20000 })
    await primaryBtn.click()
    await expect(page.getByText('Added')).toBeVisible()

    await clickResilientButton(page, 'External')
    await page.getByPlaceholder('Search...').fill(externalEntity.name)
    const externalBtn = page.getByRole('button', { name: new RegExp(externalEntity.name, 'i') })
    await expect(externalBtn).toBeVisible({ timeout: 20000 })
    await externalBtn.click()

    const commitResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return response.request().method() === 'PUT'
        && /^\/api\/v1\/data-flows\/\d+\/?$/.test(url.pathname)
    })
    await clickResilientButton(page, /Commit Changes/i)
    const commitResponse = await commitResponsePromise
    const committedFlow = await commitResponse.json()
    expect(commitResponse.ok(), JSON.stringify(committedFlow)).toBeTruthy()
    expect(committedFlow.name).toBe(architectureName)
    expect(committedFlow.nodes.some((node: any) => node.id === `device-${primary.id}`)).toBeTruthy()
    expect(committedFlow.nodes.some((node: any) => node.id === `external-${externalEntity.id}`)).toBeTruthy()
    const flow = committedFlow

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
    const updatedFlow = await updateRes.json()
    expect(updateRes.ok(), JSON.stringify(updatedFlow)).toBeTruthy()
    expect(updatedFlow.nodes.some((node: any) => node.id === `device-${primary.id}`)).toBeTruthy()
    expect(updatedFlow.nodes.some((node: any) => node.id === `external-${externalEntity.id}`)).toBeTruthy()

    await page.goto('/architecture')
    await expect(page.getByRole('heading', { name: 'Architecture Matrix' })).toBeVisible()
    await page.getByPlaceholder('Search architectures...').fill(architectureName)
    await expect(page.locator('.ag-center-cols-container')).toContainText(architectureName)
    await expect(page.locator('.ag-center-cols-container')).toContainText('Core Platform')
    await clickResilientButton(page, /Initialize/i)
    await expect(page.getByText('Needs Review', { exact: true })).toBeVisible()

    await clickResilientButton(page, /History/i)
    await expect(page.getByRole('heading', { name: 'Version History' })).toBeVisible()
    await expect(page.getByText('Linked operating context')).toBeVisible()
    await clickResilientButton(page, /Approve Current Version/i)
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

    const scenarioSelect = page.locator('select').filter({ has: page.locator('option[value="ATTENTION_ONLY"]') }).first()
    await scenarioSelect.selectOption('ATTENTION_ONLY')
    await expect(page.getByText('ATTENTION ONLY')).toBeVisible()

    await page.getByTitle('Presentation Mode').click()
    await expect(page.getByText('Presentation Mode Active')).toBeVisible()
    await page.getByTitle('Presentation Mode').click()

    await scenarioSelect.selectOption('all')
    await expect(scenarioSelect).toHaveValue('all')
    const primaryNode = page.locator('.react-flow__node').filter({ hasText: primary.name }).first()
    await expect(primaryNode).toBeVisible({ timeout: 20000 })
    await primaryNode.click({ force: true })
    const assetLink = page.getByRole('link', { name: 'Asset', exact: true })
    await expect(assetLink).toBeVisible()
    await assetLink.click()
    await expect(page).toHaveURL(/\/asset/)
  })

  test('persists service-level swimlane workflows and protects against accidental exit', async ({ page, sysApi: request }) => {
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
    await expect(page.getByRole('heading', { name: 'Architecture Matrix' })).toBeVisible()
    await page.getByPlaceholder('Search architectures...').fill(flowName)
    const flowRow = page.locator('.ag-center-cols-container .ag-row').filter({ hasText: flowName }).first()
    await expect(flowRow).toBeVisible({ timeout: 20_000 })
    await flowRow.getByRole('button', { name: 'Initialize', exact: true }).click()
    await expect(page.getByText('Payments Engineering')).toBeVisible()

    await clickResilientButton(page, 'Select edge SYNC_PATH')
    await clickResilientButton(page, /Service Logic Builder/i)
    await expect(page.getByRole('heading', { name: 'Service Logic' })).toBeVisible()
    await clickResilientButton(page, new RegExp(targetService.name, 'i'))
    await page.getByLabel(`Move ${targetService.name} lane left`).click()
    await clickResilientButton(page, `Add logic step to ${targetService.name}`)
    await expect(page.getByText('Orphan Steps: 1')).toBeVisible()
    await clickResilientButton(page, /Undo/i)
    await expect(page.locator('input[value="NEW STEP"]')).not.toBeVisible()
    await clickResilientButton(page, /Redo/i)
    await expect(page.locator('input[value="NEW STEP"]')).toBeVisible()
    await page.locator('input[value="NEW STEP"]').fill('VALIDATE PAYLOAD')

    await clickResilientButton(page, 'Exit')
    await expect(page.getByText('Unsaved Workflow')).toBeVisible()
    await clickResilientButton(page, 'Continue Editing')

    await clickResilientButton(page, /Sync Workflow/i)
    await expect(page.getByText('Workflow Manifest Synchronized')).toBeVisible()
    await clickResilientButton(page, 'Exit')
    await expect(page.getByRole('heading', { name: 'Service Logic' })).not.toBeVisible()

    await clickResilientButton(page, 'Select edge SYNC_PATH')
    await clickResilientButton(page, /Service Logic Builder/i)
    await expect(page.getByText(targetService.name)).toBeVisible()
    await expect(page.locator('input[value="VALIDATE PAYLOAD"]')).toBeVisible()
  })
})
