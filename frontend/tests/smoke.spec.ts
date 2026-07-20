import { test, expect } from '@playwright/test'
import { resetBrowserState } from './helpers/sysgrid'
import { OPERATIONAL_WORKSPACE_MATRIX } from './helpers/operational-matrix'

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await resetBrowserState(page)
  })

  // Canonical route coverage based on operational matrix
  for (const workspace of OPERATIONAL_WORKSPACE_MATRIX) {
    test(`Canonical Page Load: ${workspace.key} (${workspace.route})`, async ({ page }) => {
      await page.goto(workspace.route)
      
      // Ensure the canonical selector is visible, indicating the page loaded correctly
      await expect(page.locator(workspace.selector)).toBeVisible({ timeout: 30000 })
      
      // Ensure the URL matches the canonical route (allowing for query params)
      await expect(page).toHaveURL(new RegExp(workspace.route.split('?')[0]))
    })
  }

  // Legacy/Dashboard coverage
  const otherRoutes = [
    { path: '/', expectedText: /Stability Index/i },
    { path: '/projects', expectedText: /Strategic/i },
    { path: '/racks', expectedText: /Racks/i },
  ]

  for (const route of otherRoutes) {
    test(`Page Load: ${route.path}`, async ({ page }) => {
      await page.goto(route.path)
      await expect(page.locator('body')).toContainText(route.expectedText, { timeout: 30000 })
    })
  }
})
