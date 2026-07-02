import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import {
  clickResilientButton,
  expectToast,
  fillGridSearch,
  getPrimaryGrid,
  gotoView,
  openToolbarButton,
  resetBrowserState,
  selectGridCheckboxRows,
  seedOperationalScenario,
} from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'
const defaultHeaders = {
  'X-User-Id': process.env.USER_ID || 'haewon.kim',
  'X-Tenant-Id': '1',
}

async function createVendorCandidateScenario(request: any) {
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
    data: {
      name: vendorName,
      country: 'USA',
    },
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
    vendor,
    vendorName,
    personnel,
    personnelName,
    portalUsername,
    laptopName,
    richContractTitle,
    contract,
    workDescription,
  }
}

test.describe('VendorsReal candidate runtime', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })
  test.setTimeout(120000)

  test('validates the /vendors-real candidate route without flipping /vendors', async ({ page, request }) => {
    await resetBrowserState(page)
    const scenario = await createVendorCandidateScenario(request)
    const newContractTitle = `PW-NEW-CONTRACT-${scenario.vendor.id}`

    await gotoView(page, '/vendors-real', 'Vendors')
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

    await fillGridSearch(page, 'Search vendors...', scenario.vendorName)
    await expect(getPrimaryGrid(page)).toContainText(scenario.vendorName)
    await selectGridCheckboxRows(page, [0])

    await page.getByTitle('Copy to clipboard').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByTitle('Export CSV').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^SysGrid_Vendors_/)

    await page.getByTitle('More actions').first().click()
    const clickMenu = page.locator('.row-action-menu-container:visible').filter({
      has: page.getByLabel('Close row actions'),
    })
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

    const contextMenu = page.locator('.row-action-menu-container:visible').filter({
      has: page.getByLabel('Close row actions'),
    })
    await expect(contextMenu).toBeVisible()
    const contextMenuBox = await contextMenu.boundingBox()
    expect(contextMenuBox).not.toBeNull()
    expect(Math.abs((contextMenuBox?.x || 0) - cursorX)).toBeLessThan(420)
    expect(Math.abs((contextMenuBox?.y || 0) - cursorY)).toBeLessThan(260)

    await clickResilientButton(page, 'Details')
    const detailModal = page.getByRole('dialog').filter({ has: page.getByText(scenario.vendorName) }).last()
    await expect(detailModal).toBeVisible()
    await expect(detailModal.getByRole('button', { name: 'Overview', exact: true })).toBeVisible()
    await expect(detailModal.getByRole('button', { name: 'Contracts', exact: true })).toBeVisible()
    await expect(detailModal.getByRole('button', { name: 'Personnel', exact: true })).toBeVisible()
    await expect(detailModal).toContainText(scenario.personnelName)

    await gotoView(page, `/vendors-real?id=${scenario.vendor.id}`, 'Vendors')
    const deeplinkModal = page.getByRole('dialog').filter({ has: page.getByText(scenario.vendorName) }).last()
    await expect(deeplinkModal).toBeVisible()
    await expect(deeplinkModal.getByText(`Partner ID: ${scenario.vendor.id}`, { exact: false })).toBeVisible()

    await clickResilientButton(page, 'Personnel')
    await expect(deeplinkModal).toContainText('System Accounts (2)')
    await expect(deeplinkModal).toContainText(scenario.portalUsername)
    await expect(deeplinkModal).toContainText(scenario.laptopName)

    const personnelCard = deeplinkModal
      .locator('div[class*="bg-white/5"]')
      .filter({ hasText: scenario.personnelName })
      .filter({ hasText: scenario.portalUsername })
      .first()
    await personnelCard.locator('button').first().click()
    const personnelModal = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'Personnel Info' }) }).last()
    await expect(personnelModal).toBeVisible()
    await clickResilientButton(page, 'Edit Personnel')
    await expect(personnelModal).toContainText('System Accounts')
    await expect(personnelModal).toContainText('Managed Assets')
    await expect(personnelModal).toContainText(scenario.portalUsername)
    await expect(personnelModal).toContainText(scenario.laptopName)
    await page.keyboard.press('Escape')

    await clickResilientButton(page, 'Contracts')
    await clickResilientButton(page, /Register New Contract/i)
    const newContractModal = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'New Contract' }) }).last()
    await expect(newContractModal).toBeVisible()
    await newContractModal.locator('input').nth(0).fill(newContractTitle)
    await newContractModal.locator('input').nth(1).fill(`PW-REG-${scenario.vendor.id}`)
    await newContractModal.locator('select').first().selectOption('Completed')
    await newContractModal.locator('input[type="date"]').nth(0).fill('2031-01-01')
    await newContractModal.locator('input[type="date"]').nth(1).fill('2031-12-31')
    await clickResilientButton(page, /Register Contract/i)
    await expectToast(page, /Contract Synchronized/i)
    await expect(deeplinkModal).toContainText(newContractTitle)
    await expect(deeplinkModal).toContainText(scenario.richContractTitle)

    await deeplinkModal.getByText(scenario.richContractTitle, { exact: false }).click()
    const contractDetailsModal = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'Contract Details' }) }).last()
    await expect(contractDetailsModal).toBeVisible()
    await expect(contractDetailsModal).toContainText('24x7')
    await expect(contractDetailsModal).toContainText('Pager rotation')
    await expect(contractDetailsModal).toContainText('Holiday coverage requires named backup')
    await clickResilientButton(page, 'Infrastructure Coverage')
    await expect(contractDetailsModal).toContainText(scenario.systemName)
    await expect(contractDetailsModal).toContainText(scenario.primary.name)
    await contractDetailsModal.getByText(scenario.workDescription, { exact: false }).click()
    await expect(contractDetailsModal).toContainText('Weekly')
    await expect(contractDetailsModal).toContainText('4h')
    await expect(contractDetailsModal).toContainText('Stabilize patch operations')
    await expect(contractDetailsModal).toContainText('Expanded scope for')
  })
})
