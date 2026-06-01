import { expect, test } from '@playwright/test'
import { createProject, resetBrowserState } from './helpers/sysgrid'

test.describe('Projects workflows', () => {
  test('opens project config, keeps selection stable on delete, and blocks filtered reorder affordance', async ({ page, request }) => {
    await resetBrowserState(page)
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const first = await createProject(request, {
      name: `PW-PROJ-A-${stamp}`,
      type: 'Strategic',
      status: 'Planning',
      priority: 'Medium'
    })
    const second = await createProject(request, {
      name: `PW-PROJ-B-${stamp}`,
      type: 'Strategic',
      status: 'Planning',
      priority: 'High'
    })

    await page.goto(`/projects?id=${first.id}`)
    await expect(page.locator('h1').filter({ hasText: first.name })).toBeVisible()

    await page.locator('button:has(svg.lucide-settings)').first().click()
    await expect(page.getByText('Project Configuration')).toBeVisible()
    await page.locator('.glass-panel button:has(svg.lucide-x)').first().click()

    await page.getByPlaceholder('Filter vectors...').fill(first.name)
    await expect(page.getByText('Clear search and filters to reorder projects safely')).toBeVisible()

    await page.getByPlaceholder('Filter vectors...').fill('')
    await page.getByTitle('Decommission Project').click()
    await page.getByRole('button', { name: 'Decommission', exact: true }).click()
    await expect(page.getByText('Project Decommissioned')).toBeVisible()
    await expect(page.locator('h1').filter({ hasText: second.name })).toBeVisible()
    await expect(page).not.toHaveURL(new RegExp(`id=${first.id}`))
  })
})
