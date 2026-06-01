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

const apiBase = 'http://127.0.0.1:8000/api/v1'

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

  test('supports bulk undo, compare, owner peek, and persisted display state', async ({ page, request }) => {
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

    await fillGridSearch(page, 'Scan matrix...', monitorA.title)
    await expect(getPrimaryGrid(page)).toContainText(monitorA.title)
    await page.getByText('Alex Ops +1').click()
    const ownerModal = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'Owner Contacts' }) })
    await expect(ownerModal.getByRole('heading', { name: 'Owner Contacts' })).toBeVisible()
    await expect(page.getByText('alex.ops@sysgrid.test')).toBeVisible()
    await expect(page.getByText('jordan.sre@sysgrid.test')).toBeVisible()
    await ownerModal.locator('button').last().click()
    await expect(ownerModal).not.toBeVisible()

    await fillGridSearch(page, 'Scan matrix...', titlePrefix)
    await openToolbarButton(page, 'Display')
    const displayMenu = page.locator('.display-menu-container').last()
    await displayMenu.locator('select').nth(0).selectOption('platform')
    await page.keyboard.press('Escape')
    await expect(page.getByText('Grouped by Platform')).toBeVisible()

    await page.goto('/asset')
    await gotoView(page, '/monitoring', 'Monitoring Matrix')
    await expect(page.getByPlaceholder('Scan matrix...')).toHaveValue(titlePrefix)
    await expect(page.getByText('Grouped by Platform')).toBeVisible()
  })
})
