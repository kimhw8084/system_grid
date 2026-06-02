import { expect, test } from '@playwright/test'
import { createAsset, createExternalEntity, resetBrowserState } from './helpers/sysgrid'

test.describe('External workflows', () => {
  test('preserves metadata, supports credentials, and surfaces link failures clearly', async ({ page, request }) => {
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
      type: 'API',
      owner_organization: 'PartnerCo',
      owner_team: 'B2B',
      status: 'Active',
      environment: 'Production',
      description: 'Playwright external integration',
      poc_json: [
        {
          first_name: 'Jane',
          last_name: 'Doe',
          id: `JD-${stamp}`,
          email: 'jane.doe@example.com',
          phone: '+1-555-0101'
        }
      ],
      metadata_json: {
        base_url: 'https://partner.example.com',
        auth_type: 'token',
        version: 'v1',
        custom_note: 'retain-me',
        business_purpose: 'Customer event ingestion',
        dependency_tier: 'Tier 1',
        criticality: 'Critical',
        review_status: 'Approved',
        last_reviewed_at: '2026-05-01',
        next_review_due: '2026-08-01',
        runbook_url: 'https://wiki.example.com/ext-runbook'
      }
    })

    await page.goto('/external')
    await expect(page.getByRole('heading', { name: 'Partner IQ' })).toBeVisible()
    await page.getByPlaceholder('SCAN REGISTRY...').fill(externalEntity.name)
    await expect(page.locator('.ag-pinned-left-cols-container')).toContainText(externalEntity.name)

    const findEntityRowIndex = async () => {
      const visibleRowTexts = await page.locator('.ag-pinned-left-cols-container .ag-row').allTextContents()
      const rowIndex = visibleRowTexts.findIndex(text => text.includes(externalEntity.name))
      expect(rowIndex).toBeGreaterThanOrEqual(0)
      return rowIndex
    }

    await page.locator('.ag-pinned-right-cols-container .ag-row').nth(await findEntityRowIndex()).getByTitle('View Details').click()
    const detailsPanel = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: externalEntity.name }) })
    await expect(detailsPanel.getByText('Mission Summary')).toBeVisible()
    await expect(detailsPanel.getByText('Customer event ingestion')).toBeVisible()
    await expect(detailsPanel.getByText('Tier 1', { exact: true })).toBeVisible()
    await expect(detailsPanel.getByText('Approved', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Dependencies/i })).toBeVisible()

    await page.getByRole('button', { name: /Credentials/i }).click()
    await page.getByPlaceholder('E.G. ADMIN_SVC').fill(`svc_${stamp}`)
    await page.getByPlaceholder('••••••••').fill('super-secret')
    await page.getByPlaceholder('E.G. READ-ONLY API ACCESS').fill('Readonly feed access')
    await page.getByRole('button', { name: /Inject Secret into Vault/i }).click()
    await expect(page.getByText('Credential Added')).toBeVisible()
    await expect(page.locator('table')).toContainText(`svc_${stamp}`)
    await expect(page.locator('table')).toContainText('Readonly feed access')

    await page.getByRole('button', { name: /Governance/i }).click()
    await expect(page.getByText('Governance Controls')).toBeVisible()
    await expect(page.getByText('Review cycle')).toBeVisible()

    await page.getByRole('button', { name: /Organization & POCs/i }).click()
    const pocCard = page.locator('div').filter({ hasText: /Jane Doe/i }).first()
    const phoneButton = pocCard.getByRole('button').nth(1)
    await expect(phoneButton).toBeEnabled()
    await page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: externalEntity.name }) }).locator('div.border-b').first().getByRole('button').click()

    await page.locator('.ag-pinned-right-cols-container .ag-row').nth(await findEntityRowIndex()).getByTitle('Edit').click()
    const editModal = page.locator('.glass-panel').filter({ has: page.getByText('Modify Entity Registry') })
    await editModal.locator('select').first().selectOption('Virtual Server')
    await expect(editModal.locator('input[value="custom_note"]')).toBeVisible()
    await editModal.locator('div.border-b').first().getByRole('button').click()

    await page.getByRole('button', { name: 'Connectivity', exact: true }).click()
    await page.route('**/api/v1/intelligence/links', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Simulated interconnect failure' })
      })
    })
    await page.getByRole('button', { name: /\+ Map Link/i }).click()
    const linkModal = page.locator('.glass-panel').filter({ has: page.getByText('ESTABLISH_LINK') })
    await expect(linkModal.locator('select').first().locator('option').nth(1)).toContainText('API')
    await expect(linkModal.locator('select').first().locator('option').nth(1)).not.toContainText('No IP')
    await linkModal.locator('select').first().selectOption(String(externalEntity.id))
    await linkModal.locator('select').nth(2).selectOption(String(internalAsset.id))
    await page.getByRole('button', { name: /Establish Interconnect Link/i }).click()
    await expect(page.getByText('Simulated interconnect failure')).toBeVisible()
    await expect(page.getByText('ESTABLISH_LINK')).toBeVisible()
    await linkModal.locator('button').first().click()

    await page.unroute('**/api/v1/intelligence/links')
    await page.getByRole('button', { name: 'Connectivity', exact: true }).click()
    await page.getByRole('button', { name: /\+ Map Link/i }).click()
    const successLinkModal = page.locator('.glass-panel').filter({ has: page.getByText('ESTABLISH_LINK') })
    await successLinkModal.locator('select').first().selectOption(String(externalEntity.id))
    await successLinkModal.locator('select').nth(2).selectOption(String(internalAsset.id))
    await successLinkModal.getByRole('button', { name: /Establish Interconnect Link/i }).click()
    await expect(page.getByText('Interconnect Established')).toBeVisible()

    await page.getByRole('button', { name: 'Registry', exact: true }).click()
    await page.locator('.ag-pinned-right-cols-container .ag-row').nth(await findEntityRowIndex()).getByTitle('View Details').click()
    await page.getByRole('button', { name: /Dependencies/i }).click()
    await expect(page.getByText('Dependency Matrix')).toBeVisible()
    await expect(page.getByText(internalAsset.name)).toBeVisible()
  })
})
