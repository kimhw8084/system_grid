import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import { resetBrowserState, testApiHeaders, waitForAppIdle } from './helpers/sysgrid'

const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'
const storageKey = 'sysgrid_projects_workbench_v1'

test.use({ viewport: { width: 900, height: 900 } })

const installProjectState = async (page: any, state: Record<string, unknown>) => {
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)), { key: storageKey, value: state })
}

const readProjectState = async (page: any) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || '{}'), storageKey)

test.describe('Projects shared saved views', () => {
  test('hydrates without applying, then applies a normalized remote view only after explicit selection', async ({ page }) => {
    await resetBrowserState(page)
    const create = await page.request.post(`${apiBase}/workspaces/projects/views`, {
      headers: testApiHeaders,
      data: {
        name: 'Daily Focus',
        scope: 'personal',
        definition: {
          searchTerm: 'remote needle',
          filters: { status: ['In Progress'], priority: ['High'], watch: ['watched'] },
          activeTab: 'portfolio',
          mode: 'deadline',
        },
        schema_version: 1,
      },
    })
    expect(create.ok()).toBeTruthy()

    await installProjectState(page, {
      search: 'active local',
      statusFilter: 'ALL',
      priorityFilter: 'ALL',
      sortMode: 'order',
      watchedOnly: false,
      savedViews: [{ id: 'legacy-1', name: 'Daily Focus', search: 'legacy local', view: 'tasks' }],
      lastView: 'overview',
    })

    await page.goto('/projects?view=overview')
    await waitForAppIdle(page)
    await expect(page).toHaveURL(/view=overview/)
    await expect(page.getByPlaceholder('Find projects, objectives, owners…')).toHaveValue('active local')

    await page.getByRole('button', { name: 'Saved views', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Daily Focus · Synced', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Daily Focus · Local', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Daily Focus · Synced', exact: true }).click()

    await expect(page).toHaveURL(/view=portfolio/)
    await expect(page.getByPlaceholder('Find projects, objectives, owners…')).toHaveValue('remote needle')
    await expect.poll(async () => {
      const state = await readProjectState(page)
      return [state.statusFilter, state.priorityFilter, state.sortMode, state.watchedOnly]
    }).toEqual(['In Progress', 'High', 'deadline', true])
  })

  test('preserves active state and local saved-view use when remote hydration fails', async ({ page }) => {
    await resetBrowserState(page)
    await installProjectState(page, {
      search: 'active fallback',
      statusFilter: 'ALL',
      priorityFilter: 'ALL',
      sortMode: 'order',
      watchedOnly: false,
      savedViews: [{
        id: 'local-7',
        name: 'Local Fallback',
        search: 'local saved search',
        statusFilter: 'Planning',
        priorityFilter: 'Medium',
        sortMode: 'health',
        watchedOnly: false,
        view: 'tasks',
      }],
      lastView: 'overview',
    })
    await page.route('**/api/v1/workspaces/projects/views*', async (route) => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'proof outage' }) })
    })

    await page.goto('/projects?view=overview')
    await waitForAppIdle(page)
    await expect(page).toHaveURL(/view=overview/)
    await expect(page.getByPlaceholder('Find projects, objectives, owners…')).toHaveValue('active fallback')

    await page.getByRole('button', { name: 'Saved views', exact: true }).click()
    await page.getByRole('button', { name: 'Local Fallback · Local', exact: true }).click()
    await expect(page).toHaveURL(/view=tasks/)
    await expect(page.getByPlaceholder('Find projects, objectives, owners…')).toHaveValue('local saved search')
  })
})
