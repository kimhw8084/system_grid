import { expect, test } from '@playwright/test'
import { resetBrowserState, seedOperationalScenario, createInvestigation } from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'

test.describe('Knowledge workflows', () => {
  test('supports command-center summaries, architecture linkage, export, and operational actions', async ({ page, request }) => {
    await resetBrowserState(page)
    const { primary, service, monitoring } = await seedOperationalScenario(request)

    const vendorResponse = await request.post(`${apiBase}/vendors`, {
      data: { name: `PW-VENDOR-${Date.now()}` }
    })
    expect(vendorResponse.ok()).toBeTruthy()
    const vendor = await vendorResponse.json()
    const flowResponse = await request.post(`${apiBase}/data-flows`, {
      data: {
        name: `PW-KNOWLEDGE-FLOW-${Date.now()}`,
        description: 'Knowledge architecture linkage',
        category: 'System',
        status: 'Up to date',
        metadata: {
          owner_team: 'Architecture',
          criticality: 'Critical',
          review_status: 'Approved'
        },
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      }
    })
    expect(flowResponse.ok()).toBeTruthy()
    const flow = await flowResponse.json()

    const research = await createInvestigation(request, {
      title: `PW-RESEARCH-${Date.now()}`,
      status: 'Analyzing',
      initiation_at: '2036-01-01T00:00:00Z',
      systems: [primary.system]
    })

    const knowledgeResponse = await request.post(`${apiBase}/knowledge`, {
      data: {
        category: 'BKM',
        title: `PW-KNOWLEDGE-CONTEXT-${Date.now()}`,
        content: 'Operational knowledge',
        linked_device_ids: [primary.id],
        metadata_json: {
          criticality: 'Critical',
          ownership: { owner: 'ops_lead', review_team: 'Operations' },
          verification: { state: 'Needs Review', next_review_at: '2036-01-02' },
          links: {
            data_flow_ids: [flow.id],
            service_ids: [service.id],
            monitoring_ids: [monitoring.id],
            research_ids: [research.id],
            vendor_ids: [vendor.id]
          }
        },
        content_json: {
          purpose: 'Restore the monitored node',
          steps: [{ task: 'Check health', description: 'Validate node responsiveness', tool: 'ssh' }],
          rollback: 'Revert the config change.',
          validation: 'Alert clears and synthetic checks pass.',
          incident_mode: { first_five_minutes: 'Check alert fan-out and node health.' }
        }
      }
    })
    expect(knowledgeResponse.ok()).toBeTruthy()
    const knowledge = await knowledgeResponse.json()

    const updatedKnowledgeResponse = await request.put(`${apiBase}/knowledge/${knowledge.id}`, {
      data: {
        ...knowledge,
        title: `${knowledge.title}-V2`,
        content: 'Operational knowledge updated'
      }
    })
    expect(updatedKnowledgeResponse.ok()).toBeTruthy()
    const updatedKnowledge = await updatedKnowledgeResponse.json()
    expect(updatedKnowledge.metadata_json.version_history.length).toBeGreaterThan(1)

    await page.goto(`/knowledge?device_id=${primary.id}&monitoring_id=${monitoring.id}&research_id=${research.id}`)
    await expect(page.getByText('Suggested Knowledge Context')).toBeVisible()
    await expect(page.getByText('Knowledge Action Queue')).toBeVisible()
    await expect(page.getByText('Review Queue')).toBeVisible()
    await expect(page.getByText(/PW-KNOWLEDGE-CONTEXT/i).first()).toBeVisible()

    await page.locator('button').filter({ hasText: /PW-KNOWLEDGE-CONTEXT/i }).first().click({ force: true })
    await expect(page.locator('h1').filter({ hasText: knowledge.title })).toBeVisible()
    await expect(page.getByText('Operational Readiness')).toBeVisible()

    await page.getByRole('button', { name: 'Mark Verified' }).click()
    await expect(page.getByText('Verified').first()).toBeVisible()

    await page.getByRole('button', { name: 'Worked', exact: true }).click()
    await expect(page.getByText('Worked').first()).toBeVisible()

    await page.getByRole('button', { name: 'Incident Mode' }).click()
    await expect(page.getByText('First Five Minutes')).toBeVisible()
    await expect(page.getByRole('button', { name: flow.name })).toBeVisible()

    await page.getByRole('button', { name: /Export Briefing/i }).click()
    await expect(page.getByRole('heading', { name: 'Knowledge Briefing' })).toBeVisible()
    await expect(page.locator('textarea').last()).toHaveValue(new RegExp(knowledge.title))
    await page.getByLabel('Close briefing').click()

    await page.getByRole('button', { name: /PW-MON-/i }).click()
    await expect(page).toHaveURL(new RegExp(`/monitoring\\?id=${monitoring.id}`))
  })

  test('supports richer Q&A collaboration and answer verification', async ({ page, request }) => {
    await resetBrowserState(page)
    const questionResponse = await request.post(`${apiBase}/knowledge`, {
      data: {
        category: 'Q&A',
        title: `PW-KNOWLEDGE-QA-${Date.now()}`,
        question_context: 'Why is the sync path intermittently delayed?',
        content: 'Need a concrete operator answer.',
        status: 'Draft',
        metadata_json: {
          ownership: { owner: 'qa_lead', review_team: 'Operations' },
          verification: { state: 'Needs Review' }
        }
      }
    })
    expect(questionResponse.ok()).toBeTruthy()
    const question = await questionResponse.json()

    await page.goto(`/knowledge?id=${question.id}`)
    await expect(page.locator('h1').filter({ hasText: question.title })).toBeVisible()

    await page.getByPlaceholder('AUTHOR').fill('playwright_ops')
    await page.getByPlaceholder('TEAM').fill('reliability')
    await page.locator('select').nth(0).selectOption('HQ')
    await page.locator('select').nth(1).selectOption('Answer')
    await page.getByLabel('Answer').check()
    await page.getByLabel('Verified').check()
    await page.getByPlaceholder('Inject new collaborative node...').fill('This is caused by queue back-pressure. Drain the backlog and recheck consumer lag.')
    await page.getByLabel('Send knowledge reply').click()

    await expect(page.getByText('playwright_ops')).toBeVisible()
    await expect(page.getByText('VERIFIED_DRI')).toBeVisible()
    await expect(page.getByText('queue back-pressure', { exact: false })).toBeVisible()
  })
})
