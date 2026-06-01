import { expect, test } from '@playwright/test'
import { resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'

test.describe('Projects Creation Workflow', () => {
  test('should create a new project with cascading multi-selects and month/year dates', async ({ page, request }) => {
    // 1. Seed data
    const seed = await seedOperationalScenario(request)
    const nonce = seed.stamp
    const systemName = seed.systemName
    const assetName = seed.primary.name
    const serviceName = seed.service.name
    
    // Seed the system option so it shows up in ProjectForm
    await request.post('http://127.0.0.1:8000/api/v1/settings/options', {
      data: {
        category: 'LogicalSystem',
        label: systemName,
        value: systemName
      }
    })
    
    await resetBrowserState(page)
    await page.goto('/projects')
    
    // 2. Start project creation
    await page.getByRole('button', { name: 'New Vector' }).click()
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
    // Select System by clicking its checkbox
    await page.waitForTimeout(1000) // Wait for animation
    const systemCheckbox = page.locator('label').filter({ hasText: systemName }).locator('input[type="checkbox"]')
    await systemCheckbox.check({ force: true })
    
    // Verify Asset is visible (it belongs to this system)
    const assetCheckbox = page.locator('label').filter({ hasText: assetName }).locator('input[type="checkbox"]')
    await expect(assetCheckbox).toBeVisible()
    await assetCheckbox.check({ force: true })
    
    // Verify Service is visible (it belongs to this asset)
    const serviceCheckbox = page.locator('label').filter({ hasText: serviceName }).locator('input[type="checkbox"]')
    await expect(serviceCheckbox).toBeVisible()
    await serviceCheckbox.check({ force: true })
    
    // 5. Commit Project
    await page.getByRole('button', { name: 'Commit Strategic Vector' }).click()
    
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
