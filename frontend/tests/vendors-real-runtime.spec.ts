import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import {
  clickResilientButton,
  expectToast,
  fillGridSearch,
  getPrimaryGrid,
  gotoView,
  openToolbarButton,
  resetBrowserState,
  seedOperationalScenario,
  selectGridCheckboxRows,
} from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'
const defaultHeaders = {
  'X-User-Id': process.env.USER_ID || 'haewon.kim',
  'X-Tenant-Id': '1',
}

async function createVendorCandidateScenario(request: APIRequestContext) {
  const seeded = await seedOperationalScenario(request)
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const vendorName = `PW-VREAL-${stamp}`
  const personnelName = `PW-PERSON-${stamp}`
  const personnelPhone = `+1-555-${stamp.slice(-4)}`
  const richContractTitle = `PW-RICH-CONTRACT-${stamp}`
  const portalUsername = `portal_${stamp}`
  const laptopName = `LAPTOP-${stamp}`
  const workDescription = `Patch cadence ${stamp}`

  const vendorResponse = await request.post(`${apiBase}/vendors`, {
    data: { name: vendorName, country: 'USA' },
    headers: defaultHeaders,
  })
  expect(vendorResponse.ok()).toBeTruthy()
  const vendor = await vendorResponse.json()

  const personnelResponse = await request.post(`${apiBase}/vendors/${vendor.id}/personnel`, {
    data: {
      name: personnelName,
      name_original: `원본-${stamp}`,
      position: 'Escalation Lead',
      team: 'Partner Ops',
      company_email: `${stamp}@vendor.example.com`,
      internal_email: `${stamp}@sysgrid.local`,
      phone: personnelPhone,
      accounts: [
        { type: 'Portal', username: portalUsername, purpose_description: 'Vendor support portal' },
        { type: 'VPN', username: `vpn_${stamp}`, purpose_description: 'Emergency remote access' },
      ],
      pcs: [
        { name: laptopName, type: 'Laptop', purpose_description: 'Field support laptop' },
        { name: `VDI-${stamp}`, type: 'VDI', purpose_description: 'Virtual support workstation' },
      ],
    },
    headers: defaultHeaders,
  })
  expect(personnelResponse.ok()).toBeTruthy()
  const personnel = await personnelResponse.json()

  const vendorUpdateResponse = await request.put(`${apiBase}/vendors/${vendor.id}`, {
    data: {
      name: vendorName,
      country: 'USA',
      primary_personnel_id: personnel.id,
    },
    headers: defaultHeaders,
  })
  expect(vendorUpdateResponse.ok()).toBeTruthy()

  const contractResponse = await request.post(`${apiBase}/vendors/contracts`, {
    data: {
      vendor_id: vendor.id,
      title: richContractTitle,
      contract_id: `PW-VC-${stamp}`,
      status: 'Completed',
      effective_date: '2030-01-01',
      expiry_date: '2030-12-31',
      covered_systems: [seeded.systemName],
      covered_assets: [seeded.primary.id],
      scope_of_work: [
        {
          work_description: workDescription,
          frequency: 'Weekly',
          response: '4h',
          objective_description: 'Stabilize patch operations',
          importance: 'High',
        },
      ],
      schedule: {
        work_schedule: '24x7',
        oncall_method: 'Pager rotation',
        holiday_policy: 'Holiday coverage requires named backup',
      },
      document_link: `https://contracts.example.com/${stamp}`,
      previous_contract_changes: `Expanded scope for ${seeded.systemName}`,
    },
    headers: defaultHeaders,
  })
  expect(contractResponse.ok()).toBeTruthy()
  const contract = await contractResponse.json()

  return {
    ...seeded,
    contract,
    laptopName,
    personnel,
    personnelName,
    portalUsername,
    richContractTitle,
    vendor,
    vendorName,
    workDescription,
  }
}

function getVisibleRowActionMenu(page: Page) {
  return page.locator('.row-action-menu-container:visible').filter({
    has: page.getByLabel('Close row actions'),
  })
}

function getDetailDialog(page: Page, vendorName: string) {
  return page.getByRole('dialog').filter({ has: page.getByText(vendorName) })
}

function getGlassPanelByHeading(page: Page, heading: string) {
  return page.locator('.glass-panel').filter({
    has: page.getByRole('heading', { name: heading }),
  })
}

async function openVendorBySearch(page: Page, routePath: string, vendorName: string) {
  await gotoView(page, routePath, 'Vendors')
  await fillGridSearch(page, 'Search vendors...', vendorName)
  await expect(getPrimaryGrid(page)).toContainText(vendorName)
}

async function openVendorByDeepLink(page: Page, routePath: string, vendorId: number, vendorName: string) {
  await gotoView(page, `${routePath}?id=${vendorId}`, 'Vendors')
  const detailDialog = getDetailDialog(page, vendorName)
  await expect(detailDialog).toBeVisible()
  return detailDialog
}

test.describe('VendorsReal canonical runtime', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('preserves shell actions, import/export/copy, row actions, context menu, and details on /vendors', async ({ page, request, context }) => {
    await resetBrowserState(page)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const scenario = await createVendorCandidateScenario(request)

    await openVendorBySearch(page, '/vendors', scenario.vendorName)
    await expect(page.getByRole('button', { name: 'Views' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Display' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bulk Actions' })).toBeVisible()
    await expect(page.getByTitle('Export CSV')).toBeVisible()
    await expect(page.getByTitle('Copy to clipboard')).toBeVisible()

    await openToolbarButton(page, 'Import')
    await expect(page.getByRole('heading', { name: 'Vendors Import' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download Template' })).toBeVisible()
    await page.keyboard.press('Escape')

    await selectGridCheckboxRows(page, [0])
    await page.getByTitle('Copy to clipboard').click()
    await expectToast(page, /Table data copied to clipboard/i)
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain(scenario.vendorName)

    const downloadPromise = page.waitForEvent('download')
    await page.getByTitle('Export CSV').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^SysGrid_Vendors_/)

    await page.getByTitle('More actions').first().click()
    const clickMenu = getVisibleRowActionMenu(page)
    await expect(clickMenu).toBeVisible()
    await expect(clickMenu).toContainText('Details')
    await expect(clickMenu).toContainText('Edit')
    await clickMenu.getByLabel('Close row actions').click()
    await expect(page.getByLabel('Close row actions')).toHaveCount(0)

    const vendorCell = page.locator('.ag-cell').filter({ hasText: scenario.vendorName }).first()
    await expect(vendorCell).toBeVisible()
    const cellBox = await vendorCell.boundingBox()
    expect(cellBox).not.toBeNull()
    const cursorX = (cellBox?.x || 0) + Math.min((cellBox?.width || 0) / 2, 120)
    const cursorY = (cellBox?.y || 0) + Math.min((cellBox?.height || 0) / 2, 20)
    await page.mouse.click(cursorX, cursorY, { button: 'right' })

    const contextMenu = getVisibleRowActionMenu(page)
    await expect(contextMenu).toBeVisible()
    const contextMenuBox = await contextMenu.boundingBox()
    expect(contextMenuBox).not.toBeNull()
    expect(Math.abs((contextMenuBox?.x || 0) - cursorX)).toBeLessThan(420)
    expect(Math.abs((contextMenuBox?.y || 0) - cursorY)).toBeLessThan(260)

    await clickResilientButton(page, 'Details')
    const detailDialog = getDetailDialog(page, scenario.vendorName)
    await expect(detailDialog).toBeVisible()
    await expect(detailDialog.getByRole('button', { name: 'Overview', exact: true })).toBeVisible()
    await expect(detailDialog.getByRole('button', { name: 'Contracts', exact: true })).toBeVisible()
    await expect(detailDialog.getByRole('button', { name: 'Personnel', exact: true })).toBeVisible()
    await expect(detailDialog).toContainText(scenario.personnelName)
  })

  test('preserves /vendors?id= deep-link dossier and personnel accounts/pcs behavior', async ({ page, request }) => {
    await resetBrowserState(page)
    const scenario = await createVendorCandidateScenario(request)
    const detailDialog = await openVendorByDeepLink(page, '/vendors', scenario.vendor.id, scenario.vendorName)

    await expect(detailDialog.getByText(`Partner ID: ${scenario.vendor.id}`, { exact: false })).toBeVisible()
    await clickResilientButton(page, 'Personnel')
    await expect(detailDialog).toContainText('System Accounts (2)')
    await expect(detailDialog).toContainText(scenario.portalUsername)
    await expect(detailDialog).toContainText(scenario.laptopName)

    const personnelCard = detailDialog
      .locator('div[class*="bg-white/5"]')
      .filter({ hasText: scenario.personnelName })
      .filter({ hasText: scenario.portalUsername })
      .first()
    await personnelCard.locator('button').first().click()

    const personnelModal = getGlassPanelByHeading(page, 'Personnel Info')
    await expect(personnelModal).toBeVisible()
    await clickResilientButton(page, 'Edit Personnel')
    await expect(personnelModal).toContainText('System Accounts')
    await expect(personnelModal).toContainText('Managed Assets')
    await expect(personnelModal).toContainText(scenario.portalUsername)
    await expect(personnelModal).toContainText(scenario.laptopName)
  })

  test('registers a contract and preserves rich contract detail behavior on /vendors', async ({ page, request }) => {
    await resetBrowserState(page)
    const scenario = await createVendorCandidateScenario(request)
    const newContractTitle = `PW-NEW-CONTRACT-${scenario.vendor.id}`
    const detailDialog = await openVendorByDeepLink(page, '/vendors', scenario.vendor.id, scenario.vendorName)

    await clickResilientButton(page, 'Contracts')
    await expect(detailDialog).toContainText(scenario.richContractTitle)
    await expect(detailDialog).toContainText(scenario.systemName)
    await expect(detailDialog).toContainText('Assets')

    await clickResilientButton(page, /Register New Contract/i)
    const newContractModal = getGlassPanelByHeading(page, 'New Contract')
    await expect(newContractModal).toBeVisible()
    const registrationTextInputs = newContractModal.locator('input:not([type="date"])')
    await registrationTextInputs.nth(0).fill(newContractTitle)
    await registrationTextInputs.nth(1).fill(`PW-REG-${scenario.vendor.id}`)
    await newContractModal.getByRole('combobox').selectOption('Completed')
    const registerContractButton = newContractModal.getByRole('button', { name: /Register Contract/i })
    const createContractResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/api/v1/vendors/contracts')
    )
    await registerContractButton.evaluate((button: HTMLButtonElement) => button.click())
    const createContractResponse = await createContractResponsePromise
    expect(createContractResponse.ok()).toBeTruthy()
    await expect(detailDialog).toContainText(newContractTitle)
    await expect(detailDialog).toContainText(scenario.richContractTitle)

    const richContractCard = detailDialog
      .locator('div[class*="bg-white/5"]')
      .filter({ hasText: scenario.richContractTitle })
      .first()
    await expect(richContractCard).toContainText(scenario.systemName)
    await expect(richContractCard).toContainText('1')
    await richContractCard.click()

    const contractDetailsModal = getGlassPanelByHeading(page, 'Contract Details')
    await expect(contractDetailsModal).toBeVisible()
    await expect(contractDetailsModal).toContainText('24x7')
    await expect(contractDetailsModal).toContainText('Pager rotation')
    await expect(contractDetailsModal).toContainText('Holiday coverage requires named backup')
    await clickResilientButton(page, 'Infrastructure Coverage')
    await expect(contractDetailsModal).toContainText(scenario.systemName)
    await contractDetailsModal
      .getByText(scenario.workDescription, { exact: false })
      .evaluate((element: HTMLElement) => element.click())
    await expect(contractDetailsModal).toContainText('Weekly')
    await expect(contractDetailsModal).toContainText('4h')
    await expect(contractDetailsModal).toContainText('Stabilize patch operations')
    await expect(contractDetailsModal).toContainText('Expanded scope for')
  })

  test('retains /vendors-real alias as a VendorsReal smoke route', async ({ page, request }) => {
    await resetBrowserState(page)
    const scenario = await createVendorCandidateScenario(request)

    await openVendorBySearch(page, '/vendors-real', scenario.vendorName)
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bulk Actions' })).toBeVisible()
    await expect(page.getByTitle('Export CSV')).toBeVisible()

    const detailDialog = await openVendorByDeepLink(page, '/vendors-real', scenario.vendor.id, scenario.vendorName)
    await expect(detailDialog.getByText(`Partner ID: ${scenario.vendor.id}`, { exact: false })).toBeVisible()
  })
})
