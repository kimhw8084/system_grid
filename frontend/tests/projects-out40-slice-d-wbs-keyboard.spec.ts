import { test, expect, Page } from '@playwright/test'

type Project = Record<string, any>
type RuntimeState = { getProject: () => Project; getLastPut: () => Project | null; getPutCount: () => number }

const projectFixture = (): Project => ({
  id: 901,
  name: 'P01 — Yield Guardian',
  parent_project_id: null,
  status: 'In Progress',
  priority: 'High',
  owner: 'Proof Operator',
  objective: 'Yield Guardian independently valuable outcome',
  expected_outcomes: ['Yield Guardian accepted'],
  start_date: '2026-09-01',
  end_date: '2026-10-01',
  man_hours_saved: 420,
  wafers_gained: 0,
  metadata_json: { adoption_state: 'Pilot' },
  tasks: [
    { id: 9011, name: 'Yield Guardian task A', status: 'To Do', progress: 0, owner: 'Proof Operator', priority: 'High', start_date: '2026-09-01', end_date: '2026-09-04', order_index: 10, dependencies_json: [], metadata_json: {} },
    { id: 9012, name: 'Yield Guardian task B', status: 'In Progress', progress: 55, owner: 'Proof Operator', priority: 'High', start_date: '2026-09-05', end_date: '2026-09-09', order_index: 20, dependencies_json: [], metadata_json: {} },
    { id: 90121, name: 'Yield Guardian task B child', status: 'To Do', progress: 0, owner: 'Proof Operator', priority: 'Medium', start_date: '2026-09-06', end_date: '2026-09-08', order_index: 30, dependencies_json: [], metadata_json: { wbs_parent_id: 9012 } },
    { id: 9013, name: 'Yield Guardian task C', status: 'To Do', progress: 0, owner: 'Proof Operator', priority: 'Medium', start_date: '2026-09-10', end_date: '2026-09-12', order_index: 40, dependencies_json: [], metadata_json: {} },
  ],
})

const installRoutes = async (page: Page): Promise<RuntimeState> => {
  let project = structuredClone(projectFixture())
  let lastPut: Project | null = null
  let putCount = 0
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (request.method() === 'GET' && path.endsWith('/settings/bootstrap')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ VITE_API_BASE_URL: url.origin, DEFAULT_USER_ID: 'proof_operator' }) })
    if (request.method() === 'GET' && path === '/api/v1/settings/user/profile') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'proof_operator', username: 'proof_operator', full_name: 'Proof Operator', team: 'Operations', team_id: 1, is_admin: true, permissions: { all: 3, projects: 3 } }) })
    if (request.method() === 'GET' && path === '/api/v1/settings/user/settings') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ theme: 'nordic-frost-v1' }) })
    if (request.method() === 'GET' && path === '/api/v1/health') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    if (request.method() === 'GET' && path === '/api/v1/projects') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([project]) })
    if (request.method() === 'PUT' && path === '/api/v1/projects/901') {
      lastPut = request.postDataJSON?.() || JSON.parse(request.postData() || '{}')
      putCount += 1
      project = structuredClone(lastPut)
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) })
    }
    if (request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  return { getProject: () => project, getLastPut: () => lastPut, getPutCount: () => putCount }
}

const installIdentity = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('sysgrid-theme', 'nordic-frost-v1')
    localStorage.setItem('SYSGRID_USER_ID', 'proof_operator')
  })
}

const collectRuntimeFailures = (page: Page) => {
  const failures: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console:${message.text()}`) })
  page.on('pageerror', (error) => failures.push(`pageerror:${error.message}`))
  page.on('requestfailed', (request) => failures.push(`requestfailed:${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`))
  return failures
}

const rootOrder = (project: Project) => [...(project.tasks || [])]
  .filter((task: any) => task?.metadata_json?.wbs_parent_id == null && task?.parent_task_id == null)
  .sort((left: any, right: any) => (Number(left.order_index) || 0) - (Number(right.order_index) || 0))
  .map((task: any) => task.id)

test('OUT-40 Slice D WBS keyboard reorder exposes exact native controls and minimum targets @out40-slice-d-rehearsal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await installIdentity(page)
  await installRoutes(page)
  await page.goto('/projects?id=901&view=tasks')

  const workbench = page.locator('[data-project-task-workbench="true"]')
  await expect(workbench).toBeVisible()
  const row = page.locator('[data-project-task-row="true"][data-task-id="9012"]')
  await expect(row).toBeVisible()
  const earlier = row.getByRole('button', { name: 'Move Yield Guardian task B earlier', exact: true })
  const later = row.getByRole('button', { name: 'Move Yield Guardian task B later', exact: true })
  await expect(earlier).toBeEnabled()
  await expect(later).toBeEnabled()
  for (const control of [earlier, later]) {
    const box = await control.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(40)
    expect(box!.height).toBeGreaterThanOrEqual(40)
  }
  await expect(page.locator('[data-project-task-live-status="true"]')).toHaveAttribute('aria-live', 'polite')
})

test('OUT-40 Slice D Enter reorder persists canonical PUT, preserves subtree, announces, and restores row focus @out40-slice-d-acceptance', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const failures = collectRuntimeFailures(page)
  await installIdentity(page)
  const state = await installRoutes(page)
  await page.goto('/projects?id=901&view=tasks')

  const rowB = page.locator('[data-project-task-row="true"][data-task-id="9012"]')
  const earlier = rowB.getByRole('button', { name: 'Move Yield Guardian task B earlier', exact: true })
  await earlier.focus()
  await expect(earlier).toBeFocused()
  await earlier.press('Enter')

  await expect.poll(() => state.getPutCount()).toBe(1)
  await expect.poll(() => rootOrder(state.getProject())).toEqual([9012, 9011, 9013])

  const saved = state.getLastPut()!
  expect(saved.id).toBe(901)
  expect(saved.name).toBe('P01 — Yield Guardian')
  expect(saved.objective).toBe('Yield Guardian independently valuable outcome')
  expect(saved.expected_outcomes).toEqual(['Yield Guardian accepted'])
  expect(saved.metadata_json?.adoption_state).toBe('Pilot')
  expect(saved.metadata_json?.project_governance_v1?.audit).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'Task reordered', detail: '9012 moved before Yield Guardian task A' }),
  ]))
  expect(saved.tasks).toHaveLength(4)
  expect(saved.tasks.find((task: any) => task.id === 90121)?.metadata_json?.wbs_parent_id).toBe(9012)

  const renderedOrder = await page.locator('[data-project-task-row="true"]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-task-id')))
  expect(renderedOrder.slice(0, 4)).toEqual(['9012', '90121', '9011', '9013'])
  await expect(page.locator('[data-project-task-live-status="true"]')).toHaveText('Yield Guardian task B moved earlier')

  const movedRow = page.locator('[data-project-task-row="true"][data-task-id="9012"]')
  await expect(movedRow).toBeFocused()
  const movedEarlier = movedRow.getByRole('button', { name: 'Move Yield Guardian task B earlier', exact: true })
  const movedLater = movedRow.getByRole('button', { name: 'Move Yield Guardian task B later', exact: true })
  await expect(movedEarlier).toBeDisabled()
  await expect(movedLater).toBeEnabled()
  const box = await movedLater.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(40)
  expect(box!.height).toBeGreaterThanOrEqual(40)
  expect(failures).toEqual([])
})
