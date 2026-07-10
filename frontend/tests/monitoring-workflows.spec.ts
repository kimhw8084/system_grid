import { expect, test } from '@playwright/test'
import { MonitoringView } from './pom/MonitoringView'
import {
  clickResilientButton,
  createMonitoring,
  expectToast,
  fillGridSearch,
  getPrimaryGrid,
  getWorkspaceRoot,
  gotoView,
  openToolbarButton,
  resetBrowserState,
  seedOperationalScenario,
  selectGridCheckboxRows
} from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'
const monitoringWorkspacePreferenceKey = 'monitoring_workspace_state_v2'

async function getColumnWidth(page: any, colId: string) {
  return page.evaluate((targetColId: string) => {
    // @ts-ignore
    const api = window.__DEBUG_MONITORING_GRID_API__
    const state = api?.getColumnState?.() || []
    const column = state.find((entry: any) => entry.colId === targetColId)
    if (!column?.width) {
      throw new Error(`Missing width for column ${targetColId}`)
    }
    return Math.round(column.width)
  }, colId)
}

async function dragHeaderResize(page: any, colId: string, deltaX: number) {
  const handle = page.locator(`.ag-header-cell[col-id="${colId}"] .ag-header-cell-resize`).first()
  await expect(handle).toBeVisible()
  const box = await handle.boundingBox()
  if (!box) throw new Error(`No resize handle box for column ${colId}`)
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + deltaX, startY, { steps: 18 })
  await page.mouse.up()
}

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

    await gotoView(page, '/monitoring', 'Monitoring', 'monitoring')
    
    // Wait for allItems in the frontend
    await page.waitForFunction(() => {
       // @ts-ignore
       return window.__DEBUG_ALL_ITEMS__ && window.__DEBUG_ALL_ITEMS__.length > 0
    }, { timeout: 30000 })

    const itemsInFrontend = await page.evaluate(() => {
       // @ts-ignore
       return window.__DEBUG_ALL_ITEMS__ || []
    })
    console.log(`DEBUG: Found ${itemsInFrontend.length} items in frontend window`)

    await fillGridSearch(page, 'Scan matrix...', monitoring.title, 'monitoring')
    await expect(getPrimaryGrid(page, 'monitoring')).toContainText(monitoring.title)
    await expect(getPrimaryGrid(page, 'monitoring')).toContainText('Existing')

    await getWorkspaceRoot(page, 'monitoring').getByTitle('Open details').first().click()
    await expect(page.getByRole('dialog').getByText(monitoring.title, { exact: true })).toBeVisible()
    await clickResilientButton(page, 'Recovery')
    await expect(page.getByText('Recovery Procedures').last()).toBeVisible()
    await expect(page.getByText(knowledge.title)).toBeVisible()

    await clickResilientButton(page, 'Link Procedure')
    await page.getByPlaceholder('Search Knowledge Base by title or category...').fill(extraKnowledge.title)
    const extraKnowledgeButton = page.getByRole('button', { name: new RegExp(extraKnowledge.title, 'i') }).first()
    await expect(extraKnowledgeButton).toBeVisible()
    await extraKnowledgeButton.click()
    await expect(page.getByText(extraKnowledge.title)).toBeVisible()
    await clickResilientButton(page, /Close Search/i)
    await page.getByRole('button').filter({ hasText: /^PW-RUNBOOK-/ }).click()
    await expect(page.getByText('Recovery procedure').first()).toBeVisible()
    await page.keyboard.press('Escape')

    await page.goto(`/knowledge?id=${knowledge.id}`)
    await expect(page).toHaveURL(new RegExp(`/knowledge\\?id=${knowledge.id}`))
    await expect(page.getByText('Recovery procedure')).toBeVisible()
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
      severity: 'Warning',
      owners: [
        { name: 'Alex Ops', external_id: 'alex.ops@sysgrid.test', role: 'Primary Support' },
        { name: 'Jordan SRE', external_id: 'jordan.sre@sysgrid.test', role: 'Escalation' }
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
        { name: 'Morgan Oncall', external_id: 'morgan.oncall@sysgrid.test', role: 'Primary Support' }
      ]
    })

    await gotoView(page, '/monitoring', 'Monitoring', 'monitoring')
    await fillGridSearch(page, 'Scan matrix...', titlePrefix, 'monitoring')
    await expect(getPrimaryGrid(page, 'monitoring')).toContainText(monitorA.title)
    await expect(getPrimaryGrid(page, 'monitoring')).toContainText(monitorB.title)

    await selectGridCheckboxRows(page, [0, 1])
    await expect(page.getByRole('button', { name: 'Compare' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Bulk Actions' }).first()).toBeEnabled()

    await openToolbarButton(page, 'Compare')
    const compareModal = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'Compare Monitors' }) })
    await expect(compareModal.getByRole('heading', { name: 'Compare Monitors' })).toBeVisible()
    await expect(compareModal.getByRole('heading', { name: monitorA.title })).toBeVisible()
    await expect(compareModal.getByRole('heading', { name: monitorB.title })).toBeVisible()
    await compareModal.locator('button').first().click()
    await expect(compareModal).not.toBeVisible()

    await fillGridSearch(page, 'Scan matrix...', titlePrefix, 'monitoring')
    await openToolbarButton(page, 'Display')
    const displayMenu = page.locator('.display-menu-container').last()
    await displayMenu.getByRole('button', { name: /Raw Rows/i }).click()
    await page.locator('button').filter({ hasText: /^Platform$/ }).last().click()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Sorted by Platform')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'ID' }).first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Target Asset' }).first()).toBeVisible()

    await page.goto('/asset')
    await gotoView(page, '/monitoring', 'Monitoring', 'monitoring')
  })

  test('edits an existing monitor without save errors and persists the updated fields', async ({ page, request }) => {
    await resetBrowserState(page)
    const { monitoring } = await seedOperationalScenario(request)
    const updatedTitle = `${monitoring.title}-EDITED`
    const updatedPurpose = 'Edited through Playwright regression coverage'

    await gotoView(page, '/monitoring', 'Monitoring', 'monitoring')
    await fillGridSearch(page, 'Scan matrix...', monitoring.title, 'monitoring')
    await getWorkspaceRoot(page, 'monitoring').getByTitle('Open details').first().click()
    await expect(page.getByRole('dialog').getByText(monitoring.title, { exact: true })).toBeVisible()
    await clickResilientButton(page, 'Edit Monitor')
    await expect(page.getByText('Update Monitoring')).toBeVisible()

    await page.getByPlaceholder('e.g. CORE-DB: High CPU Load Alert').fill(updatedTitle)
    await page.getByPlaceholder('Why are we monitoring this?').fill(updatedPurpose)
    await clickResilientButton(page, 'Save Monitoring')
    await expect(page.getByText('Update Monitoring')).not.toBeVisible()

    await gotoView(page, '/monitoring', 'Monitoring', 'monitoring')
    await fillGridSearch(page, 'Scan matrix...', monitoring.title, 'monitoring')
    await getWorkspaceRoot(page, 'monitoring').getByTitle('Open details').first().click()
    await expect(page.getByRole('dialog').getByText(updatedTitle, { exact: true })).toBeVisible()
    await expect(page.getByText(updatedPurpose)).toBeVisible()
  })

  test('keeps default title sizing dynamic and preserves human resized widths only in saved views', async ({ page, request }) => {
    await resetBrowserState(page)
    const { monitoring, primary } = await seedOperationalScenario(request)
    const originalTitle = monitoring.title
    const editedLongTitle = `${originalTitle} EXTREMELY LONG TITLE FOR PLAYWRIGHT DEFAULT WIDTH RECALC AFTER EDIT 0123456789`
    const createdLongTitle = `PW-MON-CREATED-LONG-${Date.now()}-THIS TITLE SHOULD FORCE A MUCH WIDER DEFAULT COLUMN AFTER CREATE WITH ADDITIONAL LONG SUFFIX SEGMENTS AAA BBB CCC DDD EEE FFF GGG HHH III JJJ`
    const viewName = `PW Width View ${Date.now()}`

    await gotoView(page, '/monitoring', 'Monitoring', 'monitoring')
    await fillGridSearch(page, 'Scan matrix...', originalTitle, 'monitoring')
    await expect(getPrimaryGrid(page, 'monitoring')).toContainText(originalTitle)

    const initialTitleWidth = await getColumnWidth(page, 'title')

    const updateResponse = await request.put(`${apiBase}/monitoring/${monitoring.id}`, {
      data: {
        ...monitoring,
        title: editedLongTitle,
      }
    })
    expect(updateResponse.ok()).toBeTruthy()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Monitoring' })).toBeVisible()
    await fillGridSearch(page, 'Scan matrix...', editedLongTitle, 'monitoring')
    await expect(getPrimaryGrid(page, 'monitoring')).toContainText(editedLongTitle)

    const editedTitleWidth = await getColumnWidth(page, 'title')
    expect(editedTitleWidth).toBeGreaterThan(initialTitleWidth + 40)

    await createMonitoring(request, {
      device_id: primary.id,
      category: 'Hardware',
      status: 'Existing',
      title: createdLongTitle,
      platform: 'Prometheus',
      purpose: 'Playwright create width regression',
      impact: 'Playwright create width regression',
      notification_method: 'Slack',
      severity: 'Warning',
    })

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Monitoring' })).toBeVisible()
    await fillGridSearch(page, 'Scan matrix...', createdLongTitle, 'monitoring')
    await expect(getPrimaryGrid(page, 'monitoring')).toContainText(createdLongTitle)

    const createdTitleWidth = await getColumnWidth(page, 'title')
    expect(createdTitleWidth).toBeGreaterThanOrEqual(170)
    expect(createdTitleWidth).toBeLessThanOrEqual(340)
    const titleHeader = getWorkspaceRoot(page, 'monitoring').locator('.ag-header-cell[col-id="title"]').first()
    const titleCell = getWorkspaceRoot(page, 'monitoring')
      .locator('.ag-pinned-left-cols-container .ag-row')
      .filter({ hasText: createdLongTitle })
      .first()
      .locator('.ag-cell[col-id="title"]')
      .first()
    await expect(titleHeader).toBeVisible()
    await expect(titleCell).toBeVisible()
    await expect.poll(async () => {
      const headerBox = await titleHeader.boundingBox()
      const cellBox = await titleCell.boundingBox()
      if (!headerBox || !cellBox) return false
      return Math.abs(headerBox.width - cellBox.width) <= 1
    }).toBeTruthy()

    const manualViewWidth = 420
    const restoredDefaultAssetWidth = await getColumnWidth(page, 'device_name')
    expect(restoredDefaultAssetWidth).toBeLessThan(manualViewWidth - 60)

    const workspacePreference = await page.evaluate(({ nextViewName, nextWidth }) => {
      // @ts-ignore
      const api = window.__DEBUG_MONITORING_GRID_API__
      const widthState = (api?.getColumnState?.() || []).map((column: any) => (
        column.colId === 'device_name'
          ? { ...column, width: nextWidth }
          : column
      ))

      const savedView = {
        id: `pw-width-view-${Date.now()}`,
        name: nextViewName,
        config: {
          fontSize: 11,
          rowDensity: 8,
          hiddenColumns: [],
          groupBy: 'raw',
          showFilterBar: true,
          columnLayoutState: widthState,
          quickFilter: '',
          quickFilters: { status: '', severity: '', platform: '', owner: '' },
          filterModel: {},
          sortModel: [],
        }
      }

      return {
        version: 2,
        savedViews: [savedView],
        activeViewId: null,
        favoriteIds: [],
        watchIds: [],
        uiState: {
          activeTab: 'active',
          fontSize: 11,
          rowDensity: 8,
          hiddenColumns: [],
          quickFilters: { status: [], severity: [], platform: [], owner: [] },
          groupBy: 'raw',
          showFilterBar: true,
          columnLayoutState: widthState,
          lastVisitedAt: 0,
          searchTerm: '',
        }
      }
    }, { nextViewName: viewName, nextWidth: manualViewWidth })

    const settingsResponse = await request.patch(`${apiBase}/settings/user/settings`, {
      data: { [monitoringWorkspacePreferenceKey]: workspacePreference }
    })
    expect(settingsResponse.ok()).toBeTruthy()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Monitoring' })).toBeVisible()
    await fillGridSearch(page, 'Scan matrix...', createdLongTitle, 'monitoring')
    await openToolbarButton(page, 'Views')
    const savedViewButton = page.getByRole('button', { name: new RegExp(`^${viewName}`) }).first()
    await expect(savedViewButton).toBeVisible()
    await savedViewButton.click()
    await page.keyboard.press('Escape')
    await fillGridSearch(page, 'Scan matrix...', createdLongTitle, 'monitoring')
    await expect.poll(async () => getColumnWidth(page, 'device_name')).toBe(manualViewWidth)
  })

  test('imports monitoring rows through the shared operational import modal', async ({ page, request }) => {
    await resetBrowserState(page)
    const { stamp, primary, knowledge, monitoring } = await seedOperationalScenario(request)
    const importTitle = `PW-IMPORT-MON-${stamp}`
    const invalidTitle = `PW-IMPORT-BAD-${stamp}`

    await gotoView(page, '/monitoring', 'Monitoring', 'monitoring')
    await openToolbarButton(page, 'Import')
    await expect(page.getByRole('heading', { name: 'Monitoring Import' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download Template' })).toBeVisible()

    await clickResilientButton(page, 'Paste CSV / Grid')
    await page.getByPlaceholder('Paste CSV with headers, or paste spreadsheet cells directly.').fill([
      'device_name,category,status,title,platform,owner_team,severity,recovery_doc_titles',
      `${primary.name},Hardware,Existing,${importTitle},Zabbix,,Warning,${knowledge.title}`,
      `UNKNOWN-ASSET,Hardware,Existing,${invalidTitle},Zabbix,,Warning,`,
    ].join('\n'))
    await clickResilientButton(page, 'Load Into Builder')
    await clickResilientButton(page, 'Initiate Audit')

    await expect(page.getByText('VALID').first()).toBeVisible()
    await expect(page.getByText('INVALID').first()).toBeVisible()
    await expect(page.getByText(/UNKNOWN-ASSET/i).first()).toBeVisible()

    const importButton = page.getByRole('button', { name: /^Import(?: \d+)?$/ }).last()
    await expect(importButton).toBeVisible()
    await expect(importButton).toBeEnabled()
    await importButton.click()
    await expectToast(page, /Imported 1 row/i)
    await expect(page.getByRole('heading', { name: 'Monitoring Import' })).not.toBeVisible()

    await fillGridSearch(page, 'Scan matrix...', importTitle, 'monitoring')
    await expect(getPrimaryGrid(page, 'monitoring')).toContainText(importTitle)

    await fillGridSearch(page, 'Scan matrix...', invalidTitle, 'monitoring')
    await expect(getPrimaryGrid(page, 'monitoring')).not.toContainText(invalidTitle)
  })
})
