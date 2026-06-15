import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { createProject, resetBrowserState } from './helpers/sysgrid'

test.describe('Projects Overhaul 2.0', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('verifies shell and tab navigation', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const stamp = Date.now()
    const projectName = `AURORA-${stamp}`
    
    await createProject(request, {
      name: projectName,
      status: 'Planning'
    })

    await page.goto('/projects')
    await expect(page.getByText('Synchronizing Matrix...')).not.toBeVisible()
    
    // Wait for the specific project to appear in the sidebar
    const railItem = page.locator('h3').filter({ hasText: projectName })
    await expect(railItem).toBeVisible({ timeout: 20000 })
    await railItem.click()
    
    await expect(page.locator('h1').filter({ hasText: projectName })).toBeVisible()

    // Tab navigation
    const ganttBtn = page.getByRole('button', { name: /Gantt/i }).first()
    await expect(ganttBtn).toBeVisible({ timeout: 15000 })
    await ganttBtn.click({ force: true })
    await expect(page.getByText(/Execution Vectors/i)).toBeVisible({ timeout: 15000 })

    const activityBtn = page.getByRole('button', { name: /Activity/i }).first()
    await expect(activityBtn).toBeVisible({ timeout: 15000 })
    await activityBtn.click({ force: true })
    await expect(page.getByText('Strategic Evolution Stream')).toBeVisible({ timeout: 15000 })
  })

  test('verifies dashboard view', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByText('Synchronizing Matrix...')).not.toBeVisible()
    // Wait for dashboard button
    const dashboardBtn = page.getByRole('button').filter({ hasText: 'Tactical Huddle' })
    await expect(dashboardBtn).toBeVisible({ timeout: 20000 })
    await dashboardBtn.click()
    
    await expect(page.getByText(/Aggregated live execution stream/i)).toBeVisible()
  })
})
