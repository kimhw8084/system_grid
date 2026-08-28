import { test, expect } from '@playwright/test'

test.describe('Projects governance and forecasting evidence', () => {
  test('seven management views render inside the candidate-bound golden shell and Monitoring remains unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 })

    await page.goto('/projects?view=portfolio')
    const shell = page.locator('[data-golden-workspace-shell="true"][data-golden-archetype="hybrid"]')
    await expect(shell).toBeVisible()
    await expect(page.locator('[data-project-control-tower="true"]')).toBeVisible()
    await expect(page.locator('[data-project-attention-queue="true"]')).toBeVisible()

    await page.goto('/projects?view=roadmap')
    await expect(page.locator('[data-project-roadmap="true"]')).toBeVisible()
    await expect(page.getByText('Portfolio Roadmap', { exact: true })).toBeVisible()

    await page.goto('/projects?view=owners')
    await expect(page.locator('[data-project-owner-cockpit="true"]')).toBeVisible()
    await expect(page.locator('[data-project-my-work="true"]')).toBeVisible()

    await page.goto('/projects?view=board')
    await expect(page.locator('[data-project-execution-board="true"]')).toBeVisible()
    await expect(page.getByText('WIP limits', { exact: false }).first()).toBeVisible()

    await page.goto('/projects?view=review')
    await expect(page.locator('[data-project-review-mode="true"]')).toBeVisible()
    await expect(page.locator('[data-project-change-intelligence="true"]')).toBeVisible()
    await expect(page.getByText('Capture review snapshot', { exact: true })).toBeVisible()

    await page.goto('/projects?view=governance')
    await expect(page.locator('[data-project-governance="true"]')).toBeVisible()
    await expect(page.locator('[data-project-forecast="true"]')).toBeVisible()
    await expect(page.locator('[data-project-raid="true"]')).toBeVisible()
    await expect(page.locator('[data-project-stage-gates="true"]')).toBeVisible()
    await expect(page.getByText('Decision & change log', { exact: true })).toBeVisible()

    await page.goto('/projects?view=workspace')
    await expect(page.locator('[data-project-deep-workspace="true"]')).toBeVisible()
    await expect(page.locator('[data-project-embedded-host="true"]')).toBeVisible()
    await expect(page.locator('[data-project-embedded-rail="true"]')).toBeHidden()

    await page.setViewportSize({ width: 820, height: 1180 })
    await page.goto('/projects?view=governance')
    await expect(shell).toBeVisible()
    await expect(page.locator('[data-project-governance="true"]')).toBeVisible()

    await page.goto('/monitoring')
    await expect(page.locator('[data-golden-workspace-shell="true"]')).toBeVisible()
    await expect(page.locator('[data-golden-archetype="table"]')).toBeVisible()
  })
})
