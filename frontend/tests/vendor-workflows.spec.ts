import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { resetBrowserState } from './helpers/sysgrid'

test.describe('Vendor workflows', () => {
  test('creates a vendor, updates the profile, and registers a contract', async ({ page }) => {
    await resetBrowserState(page)
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const vendorName = `PW-VENDOR-${stamp}`
    const contractTitle = `PW-CONTRACT-${stamp}`

    await page.goto('/vendors')
    await expect(page.getByRole('heading', { name: 'Vendors' })).toBeVisible()

    await clickResilientButton(page, /\+ Add Vendor/i)
    const vendorModal = page.locator('.glass-panel').filter({ has: page.getByText('New Vendor') })
    await expect(vendorModal).toBeVisible()
    await vendorModal.locator('input').first().fill(vendorName)
    await vendorModal.locator('select').first().selectOption('USA')
    await vendorModal.getByRole('button', { name: /Save Vendor/i }).click()

    await expect(page.getByText('Vendor record saved')).toBeVisible()
    await page.getByPlaceholder('Search vendors...').fill(vendorName)
    await expect(page.locator('.ag-pinned-left-cols-container')).toContainText(vendorName)
    await page.locator('.ag-pinned-right-cols-container').getByTitle('Open details').first().click()
    const detailsPanel = page.getByRole('dialog').filter({ hasText: vendorName })
    await expect(detailsPanel).toBeVisible()

    await detailsPanel.getByRole('button', { name: /Edit Vendor/i }).click()
    await detailsPanel.locator('select').first().selectOption('South Korea')
    await detailsPanel.getByRole('button', { name: /Save Changes/i }).click()
    await expect(detailsPanel.getByRole('button', { name: /Edit Vendor/i })).toBeVisible()
    await expect(detailsPanel.locator('p').filter({ hasText: /^South Korea$/ }).first()).toBeVisible()

    await detailsPanel.getByRole('button', { name: 'Contracts', exact: true }).click()
    await detailsPanel.getByRole('button', { name: /Register New Contract/i }).click()
    const contractModal = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'New Contract' }) })
    await expect(contractModal).toBeVisible()
    await contractModal.locator('input').first().fill(contractTitle)
    await contractModal.locator('input').nth(1).fill(`PW-CID-${stamp}`)
    await contractModal.locator('select').first().selectOption('Completed')
    await contractModal.locator('input[type="date"]').first().fill('2030-01-01')
    await contractModal.locator('input[type="date"]').nth(1).fill('2030-12-31')
    await contractModal.getByRole('button', { name: /Register Contract/i }).click({ force: true })

    await expect(page.getByText('Contract Synchronized')).toBeVisible()
    await expect(detailsPanel.getByText(contractTitle)).toBeVisible()
  })
})
