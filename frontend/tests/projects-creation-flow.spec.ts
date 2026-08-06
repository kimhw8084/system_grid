import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { resetBrowserState, seedOperationalScenario, testApiBase } from './helpers/sysgrid'

test.describe('Projects Creation Workflow', () => {
  test('should create a new project with cascading multi-selects and month/year dates', async ({ page, sysApi: request }) => {
    // 1. Seed data
    const seed = await seedOperationalScenario(request)
    const nonce = seed.stamp
    const systemName = seed.systemName
    const assetName = seed.primary.name
    const serviceName = seed.service.name
    
    // Seed the system option so it shows up in ProjectForm
    await request.post(`${testApiBase}/settings/options`, {
      data: {
        category: 'LogicalSystem',
        label: systemName,
        value: systemName
      }
    })
    
    await resetBrowserState(page)
    await page.goto('/projects')
    
    // 2. Start project creation
    const newVectorButton = page.getByRole('button', { name: 'New Vector', exact: true })
    await expect(newVectorButton).toBeVisible({ timeout: 20000 })
    await newVectorButton.click()
    await expect(page.getByText('Strategic Matrix Configuration')).toBeVisible()
    
    const projectName = `PW-PROJECT-${nonce}`
    await page.getByPlaceholder('Enter project name...').fill(projectName)
    
    // 3. Test month/year inputs for dates
    // Initialization (Start Date)
    const monthSelects = page.locator('select').filter({ has: page.locator('option', { hasText: 'JAN' }) })
    const yearSelects = page.locator('select').filter({ has: page.locator('option', { hasText: '2026' }) })
    
    const startMonth = monthSelects.first()
    const startYear = yearSelects.first()
    
    await startMonth.selectOption({ label: 'MAR' })
    await startYear.selectOption({ label: '2026' })
    
    // Termination (End Date)
    const endMonth = monthSelects.nth(1)
    const endYear = yearSelects.nth(1)
    
    await endMonth.selectOption({ label: 'OCT' })
    await endYear.selectOption({ label: '2027' })
    
    // 4. Test cascading multi-selects
    // The cascading lists are independently scrollable. Trigger the native checkbox
    // click directly so this test verifies React state propagation rather than pointer
    // geometry inside nested scroll containers.
    const selectCascadingOption = async (labelText: string) => {
      const checkbox = page
        .locator('label')
        .filter({ hasText: labelText })
        .locator('input[type="checkbox"]')
        .first()
      await expect(checkbox).toBeAttached({ timeout: 15000 })
      await checkbox.evaluate((element: HTMLInputElement) => {
        if (!element.checked) element.click()
      })
      await expect(checkbox).toBeChecked()
    }

    await selectCascadingOption(systemName)

    // The asset becomes available only after its system is selected.
    await selectCascadingOption(assetName)

    // The service becomes available only after its asset is selected.
    await selectCascadingOption(serviceName)

    // 5. Commit Project
    await clickResilientButton(page, 'Commit Strategic Vector')
    
    // 6. Verify success
    await expect(page.getByText('Strategic Matrix Synchronized')).toBeVisible()
    
    // 7. Verify details in workbench (auto-redirect)
    await expect(page.locator('h1').filter({ hasText: projectName })).toBeVisible()
    
    // 8. Verify project in rail
    // The rail item has the project name as text
    await expect(page.getByText(projectName, { exact: true }).first()).toBeVisible()
    
    // 9. Verify Strategic Context reflects seeded data
    await expect(page.getByText(systemName)).toBeVisible()
    await expect(page.getByText(assetName)).toBeVisible()
    await expect(page.getByText(serviceName)).toBeVisible()
  })
})
