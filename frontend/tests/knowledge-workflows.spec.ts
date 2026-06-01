import { expect, test } from '@playwright/test'
import { resetBrowserState, seedOperationalScenario, createInvestigation } from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'

test.describe('Knowledge workflows', () => {
  test('supports suggested context, verification, feedback, and version history', async ({ page, request }) => {
    await resetBrowserState(page)
    const { primary, service, monitoring } = await seedOperationalScenario(request)

    const vendorResponse = await request.post(`${apiBase}/vendors`, {
      data: { name: `PW-VENDOR-${Date.now()}` }
    })
    expect(vendorResponse.ok()).toBeTruthy()
    const vendor = await vendorResponse.json()

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
    await expect(page.getByRole('button', { name: /PW-KNOWLEDGE-CONTEXT/i })).toBeVisible()

    await page.getByRole('button', { name: /PW-KNOWLEDGE-CONTEXT/i }).click()
    await expect(page.locator('h1').filter({ hasText: knowledge.title })).toBeVisible()

    await page.getByRole('button', { name: 'Mark Verified' }).click()
    await expect(page.getByText('Verified').first()).toBeVisible()

    await page.getByRole('button', { name: 'Worked', exact: true }).click()
    await expect(page.getByText('Worked').first()).toBeVisible()

    await page.getByRole('button', { name: 'Incident Mode' }).click()
    await expect(page.getByText('First Five Minutes')).toBeVisible()

    await page.getByRole('button', { name: /PW-MON-/i }).click()
    await expect(page).toHaveURL(new RegExp(`/monitoring\\?id=${monitoring.id}`))
  })
})
