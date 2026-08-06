import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
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
  test('opens deep links and refreshes the wizard when the selected mode changes', async ({ page, sysApi: request }) => {
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

    await page.goto(`/far?far=${far.id}`)
    await expect(page.locator('[data-workspace="far"]')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/far\\?far=${far.id}$`))
    await expect(page.getByRole('button', { name: /Causal Forensics/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: far.title })).toBeVisible()

    await page.getByTitle('Edit Matrix Configuration').click()
    const titleInput = page.getByPlaceholder('E.G., DATABASE_CONNECTION_TIMEOUT')
    await expect(titleInput).toHaveValue(far.title)

    await page.evaluate((modeId) => {
      window.history.pushState({}, '', `/far?far=${modeId}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, secondMode.id)
    await expect(titleInput).toHaveValue(secondMode.title)
    await expect(page.getByText('Edit Failure Mode')).toBeVisible()
  })

  test('uses the golden grid and previews failure-vector retirement without changing data', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const { far } = await seedOperationalScenario(request)

    await page.goto('/far')
    const workspace = page.locator('[data-workspace="far"]')
    const gridSurface = workspace.locator('[data-golden-grid-surface="true"]')
    await expect(gridSurface).toBeVisible()
    await expect(workspace.getByRole('button', { name: /Display/i })).toBeVisible()
    await expect(workspace.getByRole('button', { name: /Filters/i })).toBeVisible()
    await expect(workspace.getByRole('button', { name: /Insights/i })).toBeVisible()
    await expect(workspace.getByTitle('Export filtered FAR CSV')).toBeVisible()
    await expect(workspace.getByTitle('Copy to Clipboard')).toBeVisible()
    await expect(workspace.getByText(/failure vectors in scope/i)).toHaveCount(0)
    await expect(workspace.getByText('Failure Inventory Maturity Profile')).not.toBeVisible()
    await workspace.getByRole('button', { name: /Insights/i }).click()
    await expect(workspace.getByText('Failure Inventory Maturity Profile')).toBeVisible()
    await workspace.getByRole('button', { name: /Insights/i }).click()
    await expect(workspace.getByText('Failure Inventory Maturity Profile')).not.toBeVisible()
    const farSearch = page.getByRole('textbox', { name: 'Search FAR failure modes' })
    await expect(farSearch).toHaveAttribute('placeholder', 'Scan failure modes, causes, controls, owners...')
    await farSearch.fill(far.title)
    const centerRow = workspace.locator('.ag-center-cols-container .ag-row').filter({ hasText: far.title })
    await expect(centerRow).toBeVisible()
    const rowIndex = await centerRow.getAttribute('row-index')
    if (rowIndex === null) throw new Error('FAR row is missing row-index')
    const actionRow = workspace.locator(`.ag-pinned-right-cols-container .ag-row[row-index="${rowIndex}"]`)
    await expect(actionRow).toBeVisible()
    const retirementAction = actionRow.getByTitle('Select for evidence-preserving retirement')
    await expect(retirementAction).toBeVisible()
    await expect(retirementAction).toBeEnabled()
    await retirementAction.click()

    await expect(page.getByRole('heading', { name: 'FAR bulk preview' })).toBeVisible()
    await expect(page.getByText('Retire failure vectors', { exact: true })).toBeVisible()
    const retirementReason = page.getByRole('textbox', { name: 'Retirement reason' })
    await expect(retirementReason).toHaveCount(1)
    await retirementReason.fill('Superseded failure vector retained for audit evidence')
    await clickResilientButton(page, 'Prepare retirement preview')
    await expect(page.getByRole('heading', { name: 'FAR bulk preview' })).toBeVisible()
    await expect(page.getByText('Retire failure vectors', { exact: true })).toBeVisible()
    await clickResilientButton(page, 'Cancel')
    await expect(centerRow).toBeVisible()
  })

  test('removes causes and mitigations from the active FAR detail view', async ({ page, sysApi: request }) => {
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

    await page.goto(`/far?far=${far.id}`)
    const roadmapTab = page.getByRole('button', { name: /Strategic Roadmap/i })
    await expect(roadmapTab).toBeVisible()
    await roadmapTab.click()
    const mitigationRow = page.locator('tr', { hasText: 'Watch the service and alert on regression' })
    let lifecycleReason = 'Playwright evidence-preserving lifecycle change'
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') await dialog.accept(lifecycleReason)
      else await dialog.accept()
    })
    await mitigationRow.hover()
    await mitigationRow.getByTitle('Retire mitigation (evidence is retained)').click()
    await expect(page.getByText('No mitigation shields active for this cause')).toBeVisible()

    await clickResilientButton(page, /Causal Forensics/i)
    const causeRow = page.locator('tr', { hasText: 'Transient dependency fault' })
    await causeRow.hover()
    lifecycleReason = 'Playwright cause attribution superseded'
    await causeRow.getByTitle('Unlink attribution (evidence is retained)').click()
    await expect(page.getByText('No attribution traces linked to this vector')).toBeVisible()
  })

  test('navigates to Research and can unlink linked research artifacts', async ({ page, sysApi: request }) => {
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

    await page.goto(`/far?far=${far.id}`)
    const researchTab = page.getByRole('button', { name: /Research History/i })
    await expect(researchTab).toBeVisible()
    await researchTab.click()
    await expect(page.getByRole('heading', { name: investigation.title })).toBeVisible()

    const artifactCard = page.getByRole('heading', { name: investigation.title }).locator('xpath=ancestor::div[contains(@class,"group")][1]')
    await artifactCard.hover()
    await artifactCard.getByRole('button').nth(1).click()
    await expect(page.getByRole('heading', { name: investigation.title })).not.toBeVisible()
    await expect(page.getByText('No historical research artifacts currently mapped to this failure vector')).toBeVisible()

    await clickResilientButton(page, '+ Link Research Artifact')
    await page.getByPlaceholder('Search research artifacts...').fill(investigation.title)
    await clickResilientButton(page, new RegExp(investigation.title))
    await expect(page.getByRole('heading', { name: investigation.title })).toBeVisible()

    const relinkedCard = page.getByRole('heading', { name: investigation.title }).locator('xpath=ancestor::div[contains(@class,"group")][1]')
    await relinkedCard.hover()
    await relinkedCard.getByRole('button').first().click()
    await expect(page).toHaveURL(new RegExp(`/research\\?type=research&id=${investigation.id}$`))
  })
})
