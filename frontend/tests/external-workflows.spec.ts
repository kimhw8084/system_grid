import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { createAsset, createExternalEntity, resetBrowserState } from './helpers/sysgrid'

test.describe('External workflows', () => {
  test('preserves metadata, supports credentials, and surfaces link failures clearly', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const internalAsset = await createAsset(request, {
      name: `PW-EXT-DEV-${stamp}`,
      system: `PW-EXT-SYS-${stamp}`,
      status: 'Active',
      model: 'R650',
      type: 'Physical',
      serial_number: `PW-EXT-SN-${stamp}`,
      asset_tag: `PW-EXT-TAG-${stamp}`,
      owner: 'external-owner',
      business_unit: 'Operations'
    })
    const externalEntity = await createExternalEntity(request, {
      name: `PW-EXT-${stamp}`,
      external_key: `pw-ext-${stamp}`.toLowerCase(),
      type: 'API',
      owner_organization: 'PartnerCo',
      owner_team: 'B2B',
      ownership_mode: 'individual',
      status: 'Active',
      environment: 'Production',
      description: 'Playwright external integration',
      contacts_json: [
        {
          role: 'Primary',
          full_name: 'Jane Doe',
          external_person_id: `JD-${stamp}`,
          email: 'jane.doe@example.com',
          phone: '+1-555-0101',
          is_primary: true,
          is_escalation: false,
        }
      ],
      business_purpose: 'Customer event ingestion',
      metadata_json: { version: 'v1', custom_note: 'retain-me' }
    })

    await page.goto('/external')
    await expect(page.getByRole('heading', { name: 'Partner IQ' })).toBeVisible()
    await page.getByPlaceholder('SCAN REGISTRY...').fill(externalEntity.name)
    await expect(page.locator('.ag-pinned-left-cols-container')).toContainText(externalEntity.name)

    const externalEntityRow = page.locator('.ag-row', { hasText: externalEntity.name })
    await externalEntityRow.getByTitle('View Details').click()
    const detailsPanel = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: externalEntity.name }) })
    await expect(detailsPanel.getByText('Mission Summary')).toBeVisible()
    await expect(detailsPanel).toContainText('Customer event ingestion')
    await expect(page.getByRole('button', { name: /Dependencies/i })).toBeVisible()

    await clickResilientButton(page, /Credentials/i)
    await page.getByPlaceholder('Partner production token').fill(`Partner token ${stamp}`)
    await page.getByPlaceholder('E.G. ADMIN_SVC').fill(`svc_${stamp}`)
    await page.getByPlaceholder('vault://partner/prod/token').fill(`vault://partner/${stamp}/token`)
    await page.getByPlaceholder('Readonly feed access').fill('Readonly feed access')
    await clickResilientButton(page, /Register Credential Reference/i)
    await expect(page.getByText('Credential Added')).toBeVisible()
    await expect(page.locator('table')).toContainText(`Partner token ${stamp}`)
    await expect(page.locator('table')).toContainText(`vault://partner/${stamp}/token`)

    await clickResilientButton(page, /Ownership & Contacts/i)
    const pocCard = page.locator('div').filter({ hasText: /Jane Doe/i }).first()
    const phoneButton = pocCard.getByRole('button').nth(1)
    await expect(phoneButton).toBeEnabled()
    await page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: externalEntity.name }) }).locator('div.border-b').first().getByRole('button').click()

    const entityRow = page.locator('.ag-row', { hasText: entity.name })
    await entityRow.getByTitle('Edit Entity').click()
    const editModal = page.locator('.glass-panel').filter({ has: page.getByText('Modify Entity Registry') })
    await editModal.locator('select').first().selectOption({ index: 1 })
    await expect(editModal.locator('input[value="hypervisor"]')).toBeVisible()
    await editModal.locator('div.border-b').first().getByRole('button').click()

    await clickResilientButton(page, 'Connectivity')
    await page.route('**/api/v1/intelligence/links', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Simulated interconnect failure' })
      })
    })
    await clickResilientButton(page, /Map Link/i)
    const linkModal = page.locator('.glass-panel').filter({ has: page.getByText('ESTABLISH_LINK') })
    await expect(linkModal.locator('select').first().locator('option').nth(1)).toContainText('API')
    await expect(linkModal.locator('select').first().locator('option').nth(1)).not.toContainText('No IP')
    await linkModal.locator('select').first().selectOption(String(externalEntity.id))
    await linkModal.locator('select').nth(2).selectOption(String(internalAsset.id))
    await linkModal.getByPlaceholder('e.g., Daily DB Synchronization Feed').fill('Partner feed ingress')
    await clickResilientButton(page, /Establish Interconnect Link/i)
    await expect(page.getByText('Simulated interconnect failure')).toBeVisible()
    await expect(page.getByText('ESTABLISH_LINK')).toBeVisible()
    await linkModal.locator('button').first().click()

    await page.unroute('**/api/v1/intelligence/links')
    await clickResilientButton(page, 'Connectivity')
    await clickResilientButton(page, /Map Link/i)
    const successLinkModal = page.locator('.glass-panel').filter({ has: page.getByText('ESTABLISH_LINK') })
    await successLinkModal.locator('select').first().selectOption(String(externalEntity.id))
    await successLinkModal.locator('select').nth(2).selectOption(String(internalAsset.id))
    await successLinkModal.getByPlaceholder('e.g., Daily DB Synchronization Feed').fill('Partner feed ingress')
    await successLinkModal.getByRole('button', { name: /Establish Interconnect Link/i }).click()
    await expect(page.getByText('Interconnect Established')).toBeVisible()

    await clickResilientButton(page, 'Registry')
    await page.locator('.ag-pinned-right-cols-container .ag-row').nth(await findEntityRowIndex()).getByTitle('View Details').click()
    await clickResilientButton(page, /Dependencies/i)
    await expect(page.getByText('Dependency Matrix')).toBeVisible()
    await expect(page.getByText(internalAsset.name)).toBeVisible()
  })
})
