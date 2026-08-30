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

const listProjectViews = async (page: any) => {
  const response = await page.request.get(`${apiBase}/workspaces/projects/views`, { headers: testApiHeaders })
  expect(response.ok()).toBeTruthy()
  return response.json()
}

const findRemoteView = async (page: any, name: string) => {
  const payload = await listProjectViews(page)
  return payload.views.find((view: any) => view.name === name)
}

const projectViewDefinition = (searchTerm: string, activeTab = 'overview', mode = 'order') => ({
  searchTerm,
  filters: { status: [], priority: [], watch: [] },
  activeTab,
  mode,
})

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
    await expect(page.locator('[data-project-saved-view-status="synced"]')).toBeVisible()
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

  test('creates and updates an explicit personal synced Project view, then reloads a stale-revision conflict without clobbering the client draft', async ({ page }) => {
    await resetBrowserState(page)
    await installProjectState(page, {
      search: 'initial lens',
      statusFilter: 'ALL',
      priorityFilter: 'ALL',
      sortMode: 'order',
      watchedOnly: false,
      savedViews: [{ id: 'legacy-keep', name: 'Legacy Keep', search: 'local only', view: 'tasks' }],
      lastView: 'overview',
    })

    await page.goto('/projects?view=overview')
    await waitForAppIdle(page)
    await page.getByRole('button', { name: 'Save view', exact: true }).click()
    await page.getByLabel('View name').fill('Writable Focus')
    await page.getByRole('button', { name: 'Save synced', exact: true }).click()
    await expect(page.locator('[data-project-saved-view-status="synced"]')).toBeVisible()

    let remote = await findRemoteView(page, 'Writable Focus')
    expect(remote).toBeTruthy()
    expect(remote.revision).toBe(1)
    expect(remote.definition.searchTerm).toBe('initial lens')

    await page.getByPlaceholder('Find projects, objectives, owners…').fill('updated lens')
    await expect(page.locator('[data-project-saved-view-status="unsaved"]')).toBeVisible()
    await page.getByRole('button', { name: 'Update synced', exact: true }).click()
    await expect(page.locator('[data-project-saved-view-status="synced"]')).toBeVisible()

    remote = await findRemoteView(page, 'Writable Focus')
    expect(remote.revision).toBe(2)
    expect(remote.definition.searchTerm).toBe('updated lens')

    const externalUpdate = await page.request.put(`${apiBase}/workspaces/views/${remote.id}`, {
      headers: testApiHeaders,
      data: {
        name: remote.name,
        scope: 'personal',
        team_id: null,
        definition: projectViewDefinition('server newer', 'tasks', 'health'),
        schema_version: 1,
        revision: remote.revision,
      },
    })
    expect(externalUpdate.ok()).toBeTruthy()

    await page.getByPlaceholder('Find projects, objectives, owners…').fill('client draft')
    await page.getByRole('button', { name: 'Update synced', exact: true }).click()
    await expect(page.getByText('Saved View Conflict', { exact: true })).toBeVisible()
    await expect(page.getByPlaceholder('Find projects, objectives, owners…')).toHaveValue('client draft')
    await expect(page.getByText(/Server revision 3/)).toBeVisible()
    await page.getByRole('button', { name: 'Reload server copy', exact: true }).click()

    await expect(page.getByPlaceholder('Find projects, objectives, owners…')).toHaveValue('server newer')
    await expect(page).toHaveURL(/view=tasks/)
    await expect(page.locator('[data-project-saved-view-status="synced"]')).toBeVisible()
    expect((await readProjectState(page)).savedViews).toEqual([{ id: 'legacy-keep', name: 'Legacy Keep', search: 'local only', view: 'tasks' }])
  })

  test('saves a stale client draft as a new synced copy and deletes that copy explicitly without touching legacy local views', async ({ page }) => {
    await resetBrowserState(page)
    const create = await page.request.post(`${apiBase}/workspaces/projects/views`, {
      headers: testApiHeaders,
      data: {
        name: 'Conflict Source',
        scope: 'personal',
        definition: projectViewDefinition('source lens'),
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
      savedViews: [{ id: 'legacy-keep', name: 'Legacy Keep', search: 'local only', view: 'tasks' }],
      lastView: 'overview',
    })

    await page.goto('/projects?view=overview')
    await waitForAppIdle(page)
    await page.getByRole('button', { name: 'Saved views', exact: true }).click()
    await page.getByRole('button', { name: 'Conflict Source · Synced', exact: true }).click()
    await page.getByPlaceholder('Find projects, objectives, owners…').fill('copy draft')

    const source = await findRemoteView(page, 'Conflict Source')
    const externalUpdate = await page.request.put(`${apiBase}/workspaces/views/${source.id}`, {
      headers: testApiHeaders,
      data: {
        name: source.name,
        scope: 'personal',
        team_id: null,
        definition: projectViewDefinition('server branch'),
        schema_version: 1,
        revision: source.revision,
      },
    })
    expect(externalUpdate.ok()).toBeTruthy()

    await page.getByRole('button', { name: 'Update synced', exact: true }).click()
    await expect(page.getByText('Saved View Conflict', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Save as copy', exact: true }).click()
    await expect(page.locator('[data-project-saved-view-status="synced"]')).toBeVisible()

    const copied = await findRemoteView(page, 'Conflict Source copy')
    expect(copied).toBeTruthy()
    expect(copied.definition.searchTerm).toBe('copy draft')

    await page.getByRole('button', { name: 'Delete synced', exact: true }).click()
    await expect(page.getByText('Delete Synced Project View', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Delete synced view', exact: true }).click()
    await expect(page.getByText('Delete Synced Project View', { exact: true })).not.toBeVisible()

    const payload = await listProjectViews(page)
    expect(payload.views.some((view: any) => view.name === 'Conflict Source copy')).toBe(false)
    expect(payload.views.some((view: any) => view.name === 'Conflict Source')).toBe(true)
    expect((await readProjectState(page)).savedViews).toEqual([{ id: 'legacy-keep', name: 'Legacy Keep', search: 'local only', view: 'tasks' }])

    await page.getByRole('button', { name: 'Saved views', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Legacy Keep · Local', exact: true })).toBeVisible()
  })
})
