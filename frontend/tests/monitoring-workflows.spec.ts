import { expect, test } from '@playwright/test'
import {
  createMonitoring,
  expectToast,
  fillGridSearch,
  getPrimaryGrid,
  gotoView,
  openToolbarButton,
  resetBrowserState,
  seedOperationalScenario,
  selectGridCheckboxRows
} from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'

test.describe('Monitoring workflows', () => {
  test('preserves lifecycle status, recovery linking, and knowledge jump paths', async ({ page, request }) => {
    await resetBrowserState(page)
    const { stamp, monitoring, knowledge } = await seedOperationalScenario(request)

    const extraKnowledgeResponse = await request.post(`${apiBase}/knowledge`, {
      data: {
        category: 'BKM',
        title: `PW-RECOVERY-EXTRA-${stamp}`,
        content: 'Expanded recovery path'
      }
    })
    expect(extraKnowledgeResponse.ok()).toBeTruthy()
    const extraKnowledge = await extraKnowledgeResponse.json()

    await page.goto('/monitoring')
    await expect(page.getByRole('heading', { name: 'Monitoring Matrix' })).toBeVisible()
    await page.getByPlaceholder('SCAN MATRIX...').fill(monitoring.title)
    await expect(page.locator('.ag-center-cols-container')).toContainText(monitoring.title)
    await expect(page.locator('.ag-center-cols-container')).toContainText('Existing')

    await page.goto(`/monitoring?id=${monitoring.id}`)
    await expect(page.getByText(monitoring.title)).toBeVisible()
    await page.getByRole('button', { name: 'Recovery', exact: true }).click()
    await expect(page.getByText('Recovery Procedures').last()).toBeVisible()
    await expect(page.getByText(knowledge.title)).toBeVisible()

    await page.getByRole('button', { name: 'Link Procedure', exact: true }).click()
    await page.getByPlaceholder('Search Knowledge Base...').fill(extraKnowledge.title)
    await page.getByRole('button', { name: new RegExp(extraKnowledge.title, 'i') }).click()
    await expect(page.getByText(extraKnowledge.title)).toBeVisible()
    await page.getByRole('button', { name: /Close Search/i }).click()
    await page.getByRole('button').filter({ hasText: /^PW-RUNBOOK-/ }).click()
    await expect(page.getByText('Operational Triage Instruction')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.goto(`/monitoring?id=${monitoring.id}`)
    await expect(page.getByText(monitoring.title)).toBeVisible()
    await page.getByRole('button', { name: /Open Recovery BKM/i }).click()
    await expect(page).toHaveURL(new RegExp(`/knowledge\\?id=${knowledge.id}`))
  })

  test('supports bulk undo, compare, and persisted display state', async ({ page, request }) => {
    await resetBrowserState(page)
    const { stamp, primary } = await seedOperationalScenario(request)
    const titlePrefix = `PW-MON-OPS-${stamp}`

    const monitorA = await createMonitoring(request, {
      device_id: primary.id,
      category: 'Hardware',
      status: 'Existing',
      title: `${titlePrefix}-A`,
      platform: 'Prometheus',
      purpose: 'Bulk workflow validation A',
      impact: 'Synthetic validation path A',
      notification_method: 'Slack',
      severity: 'Critical',
      owners: [
        { name: 'Alex Ops', external_id: 'alex.ops@sysgrid.test', role: 'Primary Owner' },
        { name: 'Jordan SRE', external_id: 'jordan.sre@sysgrid.test', role: 'Escalation Owner' }
      ]
    })

    const monitorB = await createMonitoring(request, {
      device_id: primary.id,
      category: 'Hardware',
      status: 'Existing',
      title: `${titlePrefix}-B`,
      platform: 'Prometheus',
      purpose: 'Bulk workflow validation B',
      impact: 'Synthetic validation path B',
      notification_method: 'PagerDuty',
      severity: 'Warning',
      owners: [
        { name: 'Morgan Oncall', external_id: 'morgan.oncall@sysgrid.test', role: 'Primary Owner' }
      ]
    })

    await gotoView(page, '/monitoring', 'Monitoring Matrix')
    await fillGridSearch(page, 'Scan matrix...', titlePrefix)
    await expect(getPrimaryGrid(page)).toContainText(monitorA.title)
    await expect(getPrimaryGrid(page)).toContainText(monitorB.title)
    const rawRowHeight = await page.locator('.ag-center-cols-container .ag-row').first().evaluate((node) => Math.round(node.getBoundingClientRect().height))

    await selectGridCheckboxRows(page, [0, 1])
    await expect(page.getByRole('button', { name: 'Compare' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Bulk Actions' }).first()).toBeEnabled()

    await openToolbarButton(page, 'Compare')
    const compareModal = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'Compare Monitors' }) })
    await expect(compareModal.getByRole('heading', { name: 'Compare Monitors' })).toBeVisible()
    await expect(compareModal.getByRole('heading', { name: monitorA.title })).toBeVisible()
    await expect(compareModal.getByRole('heading', { name: monitorB.title })).toBeVisible()
    await expect(compareModal.getByText('Alex Ops, Jordan SRE')).toBeVisible()
    await compareModal.locator('button').first().click()
    await expect(compareModal).not.toBeVisible()

    await openToolbarButton(page, 'Bulk Actions')
    await page.getByRole('button', { name: 'Set Severity' }).click()
    const bulkMenu = page.locator('.bulk-menu-container').last()
    await bulkMenu.locator('select').selectOption('Info')
    await expect(bulkMenu.getByText('This change will align the current selection to Info.')).toBeVisible()
    await bulkMenu.getByRole('button', { name: 'Apply Severity' }).scrollIntoViewIfNeeded()
    await bulkMenu.getByRole('button', { name: 'Apply Severity' }).click({ force: true })
    await expectToast(page, 'Bulk Operation Complete')
    await page.getByRole('button', { name: 'Undo' }).last().click()
    await expectToast(page, 'Undo complete')

    await fillGridSearch(page, 'Scan matrix...', titlePrefix)
    await openToolbarButton(page, 'Display')
    const displayMenu = page.locator('.display-menu-container').last()
    await displayMenu.locator('select').nth(0).selectOption('platform')
    await page.keyboard.press('Escape')
    await expect(page.getByText('Grouped by Platform')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'ID' }).first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Target Asset' }).first()).toBeVisible()
    const groupedRowHeight = await page.locator('table tbody tr').first().evaluate((node) => Math.round(node.getBoundingClientRect().height))
    expect(groupedRowHeight).toBeGreaterThanOrEqual(rawRowHeight)
    expect(groupedRowHeight - rawRowHeight).toBeLessThanOrEqual(40)

    await page.goto('/asset')
    await gotoView(page, '/monitoring', 'Monitoring Matrix')
    await expect(page.getByPlaceholder('Scan matrix...')).toHaveValue(titlePrefix)
    await expect(page.getByText('Grouped by Platform')).toBeVisible()
  })

  test('edits an existing monitor without save errors and persists the updated fields', async ({ page, request }) => {
    await resetBrowserState(page)
    const { monitoring } = await seedOperationalScenario(request)
    const updatedTitle = `${monitoring.title}-EDITED`
    const updatedPurpose = 'Edited through Playwright regression coverage'

    await gotoView(page, `/monitoring?id=${monitoring.id}`, 'Monitoring Matrix')
    await expect(page.getByText(monitoring.title)).toBeVisible()
    await page.getByRole('button', { name: 'Edit Monitor' }).click()
    await expect(page.getByText('Update Monitoring')).toBeVisible()

    await page.getByPlaceholder('e.g. CORE-DB: High CPU Load Alert').fill(updatedTitle)
    await page.getByPlaceholder('Why are we monitoring this? How does it help the team?').fill(updatedPurpose)
    await page.getByRole('button', { name: 'Save Monitoring' }).click()
    await expect(page.getByText('Update Monitoring')).not.toBeVisible()

    await gotoView(page, `/monitoring?id=${monitoring.id}`, 'Monitoring Matrix')
    await expect(page.getByText(updatedTitle)).toBeVisible()
    await expect(page.getByText(updatedPurpose)).toBeVisible()
  })
})
