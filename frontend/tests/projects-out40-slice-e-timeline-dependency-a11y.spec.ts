import { test, expect, Page } from '@playwright/test'

type Project = Record<string, any>
type RuntimeState = { getProject: () => Project; getLastPut: () => Project | null; getPutCount: () => number }

const projectFixture = (): Project => ({
  id: 901,
  name: 'P01 — Timeline Dependency Keyboard MVP',
  parent_project_id: null,
  status: 'In Progress',
  priority: 'High',
  owner: 'Proof Operator',
  objective: 'Make Timeline dependency editing operable without pointer-only interaction.',
  expected_outcomes: ['Timeline dependency keyboard acceptance'],
  start_date: '2026-09-01',
  end_date: '2026-10-01',
  metadata_json: { adoption_state: 'Pilot' },
  tasks: [
    { id: 9011, name: 'Timeline task A', status: 'In Progress', progress: 45, owner: 'Proof Operator', priority: 'High', start_date: '2026-09-01', end_date: '2026-09-04', order_index: 10, dependencies_json: [], metadata_json: {} },
    { id: 9012, name: 'Timeline task B', status: 'To Do', progress: 0, owner: 'Proof Operator', priority: 'Medium', start_date: '2026-09-05', end_date: '2026-09-09', order_index: 20, dependencies_json: [9011], metadata_json: {} },
    { id: 9013, name: 'Timeline task C', status: 'To Do', progress: 0, owner: 'Proof Operator', priority: 'Medium', start_date: '2026-09-10', end_date: '2026-09-13', order_index: 30, dependencies_json: [], metadata_json: {} },
  ],
})

const dependencyIds = (task: any) => (Array.isArray(task?.dependencies_json) ? task.dependencies_json : [])
  .map((dependency: any) => String(dependency?.id ?? dependency?.task_id ?? dependency))
  .filter(Boolean)

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

const taskById = (project: Project, id: number) => (project.tasks || []).find((task: any) => task.id === id)

const expectMinimumTarget = async (locator: ReturnType<Page['locator']>) => {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(40)
  expect(box!.height).toBeGreaterThanOrEqual(40)
}

test('OUT-40 Slice E Timeline controls expose keyboard dependency and named Gantt interactions @out40-slice-e-rehearsal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await installIdentity(page)
  await installRoutes(page)
  await page.goto('/projects?id=901&view=timeline')

  const gantt = page.locator('[data-project-flagship-gantt="true"]')
  await expect(gantt).toBeVisible()
  const source = page.getByRole('button', { name: 'Start dependency from Timeline task A', exact: true })
  const target = page.getByRole('button', { name: 'Start dependency from Timeline task C', exact: true })
  await expect(source).toBeVisible()
  await expect(target).toBeVisible()
  await expectMinimumTarget(source)
  await expectMinimumTarget(target)
  await expect(page.locator('[data-project-timeline-live-status="true"]')).toHaveAttribute('aria-live', 'polite')

  const bar = page.getByRole('button', { name: 'Open Timeline task B timeline task', exact: true })
  await expect(bar).toBeVisible()
  await bar.focus()
  await expect(bar).toBeFocused()
  await bar.press('Enter')
  await expect(page).toHaveURL(/(?:\?|&)task=9012(?:&|$)/)

  const existingConnector = page.getByRole('button', { name: 'Remove dependency Timeline task A → Timeline task B', exact: true })
  await expect(existingConnector).toBeVisible()
})

test('OUT-40 Slice E Enter add/remove uses canonical PUT, announces, and restores target focus @out40-slice-e-acceptance', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const failures = collectRuntimeFailures(page)
  await installIdentity(page)
  const state = await installRoutes(page)
  await page.goto('/projects?id=901&view=timeline')

  const source = page.getByRole('button', { name: 'Start dependency from Timeline task A', exact: true })
  await source.focus()
  await expect(source).toBeFocused()
  await source.press('Enter')
  await expect(page.locator('[data-project-timeline-live-status="true"]')).toHaveText('Dependency source selected: Timeline task A')

  const addTarget = page.getByRole('button', { name: 'Add dependency from Timeline task A to Timeline task C', exact: true })
  await expect(addTarget).toBeVisible()
  await expectMinimumTarget(addTarget)
  await addTarget.focus()
  await addTarget.press('Enter')

  await expect.poll(() => state.getPutCount()).toBe(1)
  await expect.poll(() => dependencyIds(taskById(state.getProject(), 9013))).toContain('9011')
  const addPut = state.getLastPut()!
  expect(addPut.id).toBe(901)
  expect(addPut.name).toBe('P01 — Timeline Dependency Keyboard MVP')
  expect(addPut.objective).toBe('Make Timeline dependency editing operable without pointer-only interaction.')
  expect(addPut.expected_outcomes).toEqual(['Timeline dependency keyboard acceptance'])
  expect(addPut.metadata_json?.adoption_state).toBe('Pilot')
  expect(addPut.tasks).toHaveLength(3)
  expect(taskById(addPut, 9012)?.name).toBe('Timeline task B')
  expect(dependencyIds(taskById(addPut, 9012))).toEqual(['9011'])
  expect(dependencyIds(taskById(addPut, 9013))).toContain('9011')
  expect(addPut.metadata_json?.project_governance_v1?.audit).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'Timeline dependency added', detail: 'Timeline task A → Timeline task C' }),
  ]))

  await expect(page.locator('[data-project-timeline-live-status="true"]')).toHaveText('Dependency added: Timeline task A → Timeline task C')
  const restoredAfterAdd = page.locator('[data-project-timeline-row="true"][data-task-id="9013"] button[data-project-timeline-dependency-keyboard="true"]')
  await expect(restoredAfterAdd).toBeFocused()
  await expectMinimumTarget(restoredAfterAdd)

  const connector = page.getByRole('button', { name: 'Remove dependency Timeline task A → Timeline task C', exact: true })
  await expect(connector).toBeVisible()
  await connector.focus()
  await expect(connector).toBeFocused()
  await connector.press('Enter')

  await expect.poll(() => state.getPutCount()).toBe(2)
  await expect.poll(() => dependencyIds(taskById(state.getProject(), 9013))).not.toContain('9011')
  const removePut = state.getLastPut()!
  expect(removePut.metadata_json?.adoption_state).toBe('Pilot')
  expect(dependencyIds(taskById(removePut, 9012))).toEqual(['9011'])
  expect(dependencyIds(taskById(removePut, 9013))).not.toContain('9011')
  expect(removePut.metadata_json?.project_governance_v1?.audit).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'Timeline dependency removed', detail: 'Timeline task A → Timeline task C' }),
  ]))

  await expect(page.locator('[data-project-timeline-live-status="true"]')).toHaveText('Dependency removed: Timeline task A → Timeline task C')
  const restoredAfterRemove = page.locator('[data-project-timeline-row="true"][data-task-id="9013"] button[data-project-timeline-dependency-keyboard="true"]')
  await expect(restoredAfterRemove).toBeFocused()
  await expectMinimumTarget(restoredAfterRemove)
  await expect(connector).toHaveCount(0)
  expect(failures).toEqual([])
})
