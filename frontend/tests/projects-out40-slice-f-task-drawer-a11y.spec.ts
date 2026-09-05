import { test, expect, Page, Locator } from '@playwright/test'

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
  metadata_json: { adoption_state: 'Pilot' },
  tasks: [
    { id: 9011, name: 'Yield Guardian task A', status: 'To Do', progress: 0, owner: 'Proof Operator', priority: 'High', start_date: '2026-09-01', end_date: '2026-09-04', order_index: 10, dependencies_json: [], metadata_json: {} },
    { id: 9012, name: 'Yield Guardian task B', status: 'In Progress', progress: 55, owner: 'Proof Operator', priority: 'High', start_date: '2026-09-05', end_date: '2026-09-09', order_index: 20, dependencies_json: [9011], description: 'Threshold validation work', metadata_json: { subtasks: [{ id: 'check-1', name: 'Verify threshold', completed: false }] } },
    { id: 9013, name: 'Yield Guardian task C', status: 'To Do', progress: 0, owner: 'Proof Operator', priority: 'Medium', start_date: '2026-09-10', end_date: '2026-09-12', order_index: 30, dependencies_json: [], metadata_json: {} },
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

const expectMinTarget = async (control: Locator) => {
  const box = await control.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(40)
  expect(box!.height).toBeGreaterThanOrEqual(40)
}

const expectAllDrawerControlsNamed = async (drawer: Locator) => {
  const controls = drawer.locator('button, input:not([type="hidden"]), select, textarea, a[href], [role="button"], [role="link"], [role="option"]')
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index)
    if (!(await control.isVisible())) continue
    await expect(control, `drawer control ${index} must have a computed accessible name`).toHaveAccessibleName(/\S/)
  }
}

test('OUT-40 Slice F Task Drawer required controls are explicitly named and icon targets are >=40px @out40-slice-f-rehearsal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await installIdentity(page)
  await installRoutes(page)
  await page.goto('/projects?id=901&view=tasks&task=9012')

  const drawer = page.locator('[data-project-task-drawer="true"]')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('textbox', { name: 'Description for Yield Guardian task B', exact: true })).toBeVisible()
  await expect(drawer.getByRole('checkbox', { name: 'Toggle checklist item Verify threshold', exact: true })).toBeVisible()
  await expect(drawer.getByRole('textbox', { name: 'Add checklist item for Yield Guardian task B', exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Remove checklist item Verify threshold', exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Add checklist item for Yield Guardian task B', exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Remove dependency Yield Guardian task A', exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Add selected dependency to Yield Guardian task B', exact: true })).toBeVisible()

  for (const control of [
    drawer.getByRole('button', { name: 'Undo task change', exact: true }),
    drawer.getByRole('button', { name: 'Redo task change', exact: true }),
    drawer.getByRole('button', { name: 'Close task drawer', exact: true }),
    drawer.getByRole('button', { name: 'Remove checklist item Verify threshold', exact: true }),
    drawer.getByRole('button', { name: 'Add checklist item for Yield Guardian task B', exact: true }),
    drawer.getByRole('button', { name: 'Remove dependency Yield Guardian task A', exact: true }),
    drawer.getByRole('button', { name: 'Add selected dependency to Yield Guardian task B', exact: true }),
  ]) await expectMinTarget(control)

  await expectAllDrawerControlsNamed(drawer)
})

test('OUT-40 Slice F named dependency removal keeps native Enter activation and canonical Project PUT @out40-slice-f-acceptance', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const failures = collectRuntimeFailures(page)
  await installIdentity(page)
  const state = await installRoutes(page)
  await page.goto('/projects?id=901&view=tasks&task=9012')

  const drawer = page.locator('[data-project-task-drawer="true"]')
  await expect(drawer).toBeVisible()
  await expectAllDrawerControlsNamed(drawer)

  const removeDependency = drawer.getByRole('button', { name: 'Remove dependency Yield Guardian task A', exact: true })
  await removeDependency.focus()
  await expect(removeDependency).toBeFocused()
  await removeDependency.press('Enter')

  await expect.poll(() => state.getPutCount()).toBe(1)
  const saved = state.getLastPut()!
  expect(saved.id).toBe(901)
  expect(saved.name).toBe('P01 — Yield Guardian')
  expect(saved.objective).toBe('Yield Guardian independently valuable outcome')
  expect(saved.expected_outcomes).toEqual(['Yield Guardian accepted'])
  expect(saved.metadata_json?.adoption_state).toBe('Pilot')
  expect(saved.tasks).toHaveLength(3)
  expect(saved.tasks.find((task: any) => task.id === 9012)?.dependencies_json).toEqual([])
  expect(saved.tasks.find((task: any) => task.id === 9012)?.metadata_json?.subtasks).toEqual([{ id: 'check-1', name: 'Verify threshold', completed: false }])

  await expect(drawer.getByRole('button', { name: 'Remove dependency Yield Guardian task A', exact: true })).toHaveCount(0)
  await expectAllDrawerControlsNamed(drawer)
  expect(failures).toEqual([])
})
