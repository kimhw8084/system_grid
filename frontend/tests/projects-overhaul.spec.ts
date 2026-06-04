import { expect, test } from '@playwright/test'
import { createProject, resetBrowserState } from './helpers/sysgrid'

test.describe('Projects Overhaul 2.0', () => {
  test('verifies shell and tab navigation', async ({ page, request }) => {
    const projectName = `AURORA-${Date.now()}`
    await createProject(request, {
      name: projectName,
      status: 'Planning'
    })

    await page.goto('/projects')
    
    // Wait for the specific project to appear in the sidebar
    const railItem = page.getByTitle(projectName)
    await expect(railItem).toBeVisible({ timeout: 20000 })
    await railItem.click()
    
    await expect(page.locator('h1').filter({ hasText: projectName })).toBeVisible()

    // Tab navigation
    await page.getByRole('button', { name: 'Gantt', exact: true }).click()
    await expect(page.getByText(/Gantt Visualization/i)).toBeVisible()

    await page.getByRole('button', { name: 'Log', exact: true }).click()
    await expect(page.getByText('Execution Ledger')).toBeVisible()
  })

  test('verifies dashboard view', async ({ page }) => {
    await page.goto('/projects')
    // Wait for dashboard button
    const dashboardBtn = page.getByRole('button').filter({ hasText: 'Operations Dashboard' })
    await expect(dashboardBtn).toBeVisible({ timeout: 20000 })
    await dashboardBtn.click()
    
    await expect(page.getByText('System-wide Execution Matrix')).toBeVisible()
  })
})
