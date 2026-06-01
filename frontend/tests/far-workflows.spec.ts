import { test, expect } from '@playwright/test'
import {
  createFarCause,
  createFarMitigation,
  createFarMode,
  createInvestigation,
  resetBrowserState,
  seedOperationalScenario,
  updateFarMode,
} from './helpers/sysgrid'

test.describe('FAR workflows', () => {
  test('opens deep links and refreshes the wizard when the selected mode changes', async ({ page, request }) => {
    await resetBrowserState(page)
    const { systemName, far } = await seedOperationalScenario(request)
    const secondMode = await createFarMode(request, {
      system_name: systemName,
      title: `PW-FAR-ALT-${Date.now()}`,
      effect: 'Alternate failure mode',
      severity: 6,
      occurrence: 2,
      detection: 2,
    })

    await page.goto(`/far?id=${far.id}`)
    await expect(page.getByRole('button', { name: /Causal Forensics/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: far.title })).toBeVisible()

    await page.getByTitle('Edit Matrix Configuration').click()
    const titleInput = page.getByPlaceholder('E.G., DATABASE_CONNECTION_TIMEOUT')
    await expect(titleInput).toHaveValue(far.title)

    await page.evaluate((modeId) => {
      window.history.pushState({}, '', `/far?id=${modeId}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, secondMode.id)
    await expect(titleInput).toHaveValue(secondMode.title)
    await expect(page.getByText('Edit Failure Mode')).toBeVisible()
  })

  test('removes causes and mitigations from the active FAR detail view', async ({ page, request }) => {
    await resetBrowserState(page)
    const { far } = await seedOperationalScenario(request)
    const cause = await createFarCause(request, {
      cause_text: 'Transient dependency fault',
      occurrence_level: 4,
      responsible_team: 'Operations',
      mode_ids: [far.id],
    })
    await createFarMitigation(request, {
      mitigation_type: 'Monitoring',
      mitigation_steps: 'Watch the service and alert on regression',
      responsible_team: 'Operations',
      status: 'Not Started',
      cause_id: cause.id,
      mode_ids: [far.id],
    })

    await page.goto(`/far?id=${far.id}`)
    await page.getByRole('button', { name: /Strategic Roadmap/i }).click()
    const mitigationRow = page.locator('tr', { hasText: 'Watch the service and alert on regression' })
    await mitigationRow.hover()
    await mitigationRow.getByRole('button').click()
    await expect(page.getByText('No mitigation shields active for this cause')).toBeVisible()

    await page.getByRole('button', { name: /Causal Forensics/i }).click()
    const causeRow = page.locator('tr', { hasText: 'Transient dependency fault' })
    await causeRow.hover()
    await causeRow.getByRole('button').nth(1).click()
    await expect(page.getByText('No attribution traces linked to this vector')).toBeVisible()
  })

  test('navigates to Research and can unlink linked research artifacts', async ({ page, request }) => {
    await resetBrowserState(page)
    const { far } = await seedOperationalScenario(request)
    const investigation = await createInvestigation(request, {
      title: `PW-RES-${Date.now()}`,
      problem_statement: 'Investigation linked from FAR',
      category: 'Research',
      status: 'Analyzing',
      priority: 'High',
      systems: [far.system_name],
    })
    await updateFarMode(request, far.id, {
      metadata_json: { linked_research_ids: [investigation.id] },
    })

    await page.goto(`/far?id=${far.id}`)
    await page.getByRole('button', { name: /Research History/i }).click()
    await expect(page.getByRole('heading', { name: investigation.title })).toBeVisible()

    const artifactCard = page.getByRole('heading', { name: investigation.title }).locator('xpath=ancestor::div[contains(@class,"group")][1]')
    await artifactCard.hover()
    await artifactCard.getByRole('button').nth(1).click()
    await expect(page.getByRole('heading', { name: investigation.title })).not.toBeVisible()
    await expect(page.getByText('No historical research artifacts currently mapped to this failure vector')).toBeVisible()

    await page.getByRole('button', { name: '+ Link Research Artifact' }).click()
    await page.getByPlaceholder('Search research artifacts...').fill(investigation.title)
    await page.getByRole('button', { name: new RegExp(investigation.title) }).click()
    await expect(page.getByRole('heading', { name: investigation.title })).toBeVisible()

    const relinkedCard = page.getByRole('heading', { name: investigation.title }).locator('xpath=ancestor::div[contains(@class,"group")][1]')
    await relinkedCard.hover()
    await relinkedCard.getByRole('button').first().click()
    await expect(page).toHaveURL(/\/research$/)
  })
})
