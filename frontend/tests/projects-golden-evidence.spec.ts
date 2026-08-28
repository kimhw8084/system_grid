import { test, expect } from '@playwright/test'

test.describe('Projects member-first foundation evidence', () => {
  test('unified project workbench exposes eight direct project surfaces, preserves portfolio intelligence, and leaves Monitoring unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 })

    await page.goto('/projects?view=overview')
    const shell = page.locator('[data-golden-workspace-shell="true"][data-golden-archetype="hybrid"]')
    await expect(shell).toBeVisible()
    await expect(page.locator('[data-project-unified-shell="true"]')).toBeVisible()
    await expect(page.locator('[data-project-workbench-rail="true"]')).toBeVisible()
    await expect(page.locator('[data-project-workbench-header="true"]')).toBeVisible()
    await expect(page.locator('[data-project-primary-nav="true"]')).toBeVisible()
    await expect(page.locator('[data-project-overview="true"]')).toBeVisible()

    await page.getByRole('button', { name: 'Tasks', exact: true }).click()
    await expect(page.locator('[data-project-tasks-foundation="true"]')).toBeVisible()

    await page.getByRole('button', { name: 'Timeline', exact: true }).first().click()
    await expect(page.locator('[data-project-direct-surface="gantt"]')).toBeVisible()
    await expect(page.locator('[data-project-embedded-rail="true"]')).toBeHidden()
    await expect(page.locator('[data-project-embedded-hud="true"]')).toBeHidden()
    await expect(page.locator('[data-project-embedded-tabs="true"]')).toBeHidden()

    await page.getByRole('button', { name: 'Board', exact: true }).click()
    await expect(page.locator('[data-project-execution-board="true"]')).toBeVisible()

    await page.getByRole('button', { name: 'Files', exact: true }).click()
    await expect(page.locator('[data-project-files-foundation="true"]')).toBeVisible()

    await page.getByRole('button', { name: 'Updates', exact: true }).first().click()
    await expect(page.locator('[data-project-direct-surface="activity"]')).toBeVisible()

    await page.getByRole('button', { name: 'Reports', exact: true }).click()
    await expect(page.locator('[data-project-report-preview="true"]')).toBeVisible()
    await expect(page.getByText('Live Project Report', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Insights', exact: true }).click()
    await expect(page.locator('[data-project-insights-hub="true"]')).toBeVisible()
    await expect(page.locator('[data-project-review-mode="true"]')).toBeVisible()
    await page.getByRole('button', { name: 'Governance & Forecast', exact: true }).click()
    await expect(page.locator('[data-project-governance="true"]')).toBeVisible()
    await expect(page.locator('[data-project-forecast="true"]')).toBeVisible()

    await page.goto('/projects?view=roadmap')
    await expect(page.locator('[data-project-portfolio-hub="true"]')).toBeVisible()
    await expect(page.locator('[data-project-roadmap="true"]')).toBeVisible()

    await page.goto('/projects?view=owners')
    await expect(page.locator('[data-project-owner-cockpit="true"]')).toBeVisible()

    await page.goto('/projects?view=workspace')
    await expect(page.locator('[data-project-direct-surface="gantt"]')).toBeVisible()

    await page.setViewportSize({ width: 820, height: 1180 })
    await page.goto('/projects?view=overview')
    await expect(shell).toBeVisible()
    await expect(page.locator('[data-project-unified-shell="true"]')).toBeVisible()
    await expect(page.locator('[data-project-workbench-rail="true"]')).toBeHidden()
    await expect(page.locator('[data-project-overview="true"]')).toBeVisible()

    await page.goto('/monitoring')
    await expect(page.locator('[data-golden-workspace-shell="true"]')).toBeVisible()
    await expect(page.locator('[data-golden-archetype="table"]')).toBeVisible()
  })
})
