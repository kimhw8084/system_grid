import { test, expect } from '@playwright/test'

test.describe('Projects golden evidence capture', () => {
  test('projects portfolio, board, responsive shell, and monitoring reference remain golden', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.goto('/projects?view=portfolio')

    const shell = page.locator('[data-golden-workspace-shell="true"][data-golden-archetype="hybrid"]')
    await expect(shell).toBeVisible()
    await expect(page.locator('[data-project-command-center="true"]')).toBeVisible()
    await expect(page.getByText('Project Command Center', { exact: false }).first()).toBeVisible()

    await page.getByRole('button', { name: /Execution Board/i }).first().click()
    await expect(page).toHaveURL(/view=board/)
    await expect(page.locator('[data-project-execution-board="true"]')).toBeVisible()

    await page.setViewportSize({ width: 820, height: 1180 })
    await expect(shell).toBeVisible()
    await expect(page.getByRole('button', { name: /Portfolio/i }).first()).toBeVisible()

    await page.goto('/monitoring')
    await expect(page.locator('[data-golden-workspace-shell="true"]')).toBeVisible()
    await expect(page.locator('[data-golden-archetype="table"]')).toBeVisible()
  })
})
