import { test, expect, Page, Locator } from '@playwright/test'

type Project = Record<string, any>

const projectFixture = (): Project => ({
  id: 901,
  name: 'P01 — Accessible Projects Audit',
  parent_project_id: null,
  status: 'In Progress',
  priority: 'High',
  owner: 'Proof Operator',
  objective: 'Projects cross-surface accessibility audit fixture',
  expected_outcomes: ['Every required Projects-owned interactive control has a computed accessible name'],
  start_date: '2026-09-01',
  end_date: '2026-10-01',
  metadata_json: {
    adoption_state: 'Pilot',
    project_schedule_v2: {
      working_days: [1,2,3,4,5],
      baselines: [{ id: 'base-1', name: 'Audit baseline', captured_at: '2026-09-01T00:00:00Z', tasks: [] }],
      scenarios: [{ id: 'scenario-1', name: 'Audit scenario', task_id: '9012', slip_days: 2, status: 'PROPOSED' }],
    },
    project_updates_v1: [{ id: 'u1', author: 'Proof Operator', created_at: '2026-09-01T00:00:00Z', content: 'Audit update' }],
  },
  tasks: [
    { id: 9011, name: 'Audit task A', status: 'To Do', progress: 10, owner: 'Proof Operator', priority: 'High', start_date: '2026-09-01', end_date: '2026-09-04', order_index: 10, dependencies_json: [], metadata_json: {} },
    { id: 9012, name: 'Audit task B', status: 'In Progress', progress: 55, owner: 'Proof Operator', priority: 'High', start_date: '2026-09-05', end_date: '2026-09-09', order_index: 20, dependencies_json: [9011], description: 'Audit task description', metadata_json: { subtasks: [{ id: 'check-1', name: 'Verify audit', completed: false }] } },
    { id: 9013, name: 'Audit task C', status: 'Review', progress: 80, owner: 'Partner User', priority: 'Medium', start_date: '2026-09-10', end_date: '2026-09-13', order_index: 30, dependencies_json: [], metadata_json: {} },
  ],
})

const operators = [
  { id: 1, username: 'proof_operator', full_name: 'Proof Operator', team: 'Operations', team_id: 1 },
  { id: 2, username: 'partner.user', full_name: 'Partner User', team: 'Operations', team_id: 1 },
]

const installIdentity = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('sysgrid-theme', 'nordic-frost-v1')
    localStorage.setItem('SYSGRID_USER_ID', 'proof_operator')
  })
}

const installRoutes = async (page: Page) => {
  const project = projectFixture()
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const json = (value: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) })
    if (request.method() === 'GET' && path.endsWith('/settings/bootstrap')) return json({ VITE_API_BASE_URL: url.origin, DEFAULT_USER_ID: 'proof_operator' })
    if (request.method() === 'GET' && path === '/api/v1/settings/user/profile') return json({ id: 'proof_operator', username: 'proof_operator', full_name: 'Proof Operator', team: 'Operations', team_id: 1, is_admin: true, permissions: { all: 3, projects: 3 } })
    if (request.method() === 'GET' && path === '/api/v1/settings/user/settings') return json({ theme: 'nordic-frost-v1' })
    if (request.method() === 'GET' && path === '/api/v1/settings/operators') return json(operators)
    if (request.method() === 'GET' && path === '/api/v1/health') return json({ status: 'ok' })
    if (request.method() === 'GET' && path === '/api/v1/projects') return json([project])
    if (request.method() === 'GET' && path === '/api/v1/workspaces/projects/views') return json([])
    if (request.method() === 'GET') return json([])
    return json({})
  })
}

const collectRuntimeFailures = (page: Page) => {
  const failures: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console:${message.text()}`) })
  page.on('pageerror', (error) => failures.push(`pageerror:${error.message}`))
  page.on('requestfailed', (request) => failures.push(`requestfailed:${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`))
  return failures
}

const requiredControls = (root: Locator) => root.locator(':is(button,input:not([type="hidden"]),select,textarea,summary,a[href],[role="button"],[role="link"],[role="option"],[role="checkbox"],[role="combobox"],[role="textbox"])')

const expectAllRequiredControlsNamed = async (root: Locator, scope: string) => {
  const controls = requiredControls(root)
  const count = await controls.count()
  expect(count, `${scope} must render at least one required interactive control`).toBeGreaterThan(0)
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index)
    if (!(await control.isVisible())) continue
    await expect(control, `${scope} required control ${index} must have a computed accessible name`).toHaveAccessibleName(/\S/)
  }
}

const openProjects = async (page: Page, path: string) => {
  await page.goto(path)
  const workspace = page.locator('[data-workspace="projects"]')
  await expect(workspace).toBeVisible()
  return workspace
}

const auditStaticRoute = async (page: Page, path: string, label: string) => {
  const workspace = await openProjects(page, path)
  await expectAllRequiredControlsNamed(workspace, label)
}

test('OUT-40 Slice G persistent Projects surfaces have no unnamed required controls @out40-slice-g-rehearsal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await installIdentity(page)
  await installRoutes(page)
  const routes = [
    ['/projects?view=portfolio&section=control', 'portfolio control'],
    ['/projects?view=portfolio&section=roadmap', 'portfolio roadmap'],
    ['/projects?view=portfolio&section=owners', 'portfolio owners'],
    ['/projects?id=901&view=overview', 'overview'],
    ['/projects?id=901&view=tasks', 'tasks'],
    ['/projects?id=901&view=timeline', 'timeline'],
    ['/projects?id=901&view=board', 'board'],
    ['/projects?id=901&view=files', 'files'],
    ['/projects?id=901&view=updates', 'updates'],
    ['/projects?id=901&view=reports', 'reports'],
    ['/projects?id=901&view=insights&section=review', 'insights review'],
    ['/projects?id=901&view=insights&section=governance', 'insights governance'],
  ] as const
  for (const [path, label] of routes) await auditStaticRoute(page, path, label)
})

test('OUT-40 Slice G transient Projects surfaces have no unnamed required controls @out40-slice-g-acceptance', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const failures = collectRuntimeFailures(page)
  await installIdentity(page)
  await installRoutes(page)

  await openProjects(page, '/projects?id=901&view=tasks&task=9012')
  await expectAllRequiredControlsNamed(page.locator('[data-project-task-drawer="true"]'), 'task drawer')

  await openProjects(page, '/projects?id=901&view=tasks')
  await page.getByRole('button', { name: 'Paste', exact: true }).click()
  await expectAllRequiredControlsNamed(page.locator('[data-project-task-paste="true"]'), 'task paste')

  await openProjects(page, '/projects?id=901&view=overview')
  await page.locator('[data-project-quick-add="true"] summary').click()
  await expectAllRequiredControlsNamed(page.locator('[data-project-quick-add="true"]'), 'quick add menu')
  await page.locator('[data-project-jump-menu="true"] summary').click()
  await expectAllRequiredControlsNamed(page.locator('[data-project-jump-menu="true"]'), 'jump menu')

  const saveView = page.getByRole('button', { name: /Save view/i }).first()
  await saveView.click()
  const saveDialog = page.getByRole('dialog').last()
  await expect(saveDialog).toBeVisible()
  await expectAllRequiredControlsNamed(saveDialog, 'save project view dialog')
  await page.keyboard.press('Escape')

  const newProject = page.getByRole('button', { name: 'New Project', exact: true }).first()
  await newProject.click()
  const createDialog = page.getByRole('dialog').last()
  await expect(createDialog).toBeVisible()
  await expectAllRequiredControlsNamed(createDialog, 'create project dialog')
  await page.keyboard.press('Escape')

  await openProjects(page, '/projects?id=901&view=updates')
  const update = page.getByRole('textbox', { name: 'Add project update', exact: true })
  await update.fill('@p')
  const mentionList = page.getByRole('listbox', { name: 'Project update mention suggestions', exact: true })
  await expect(mentionList).toBeVisible()
  await expectAllRequiredControlsNamed(mentionList, 'update mention listbox')

  await openProjects(page, '/projects?id=901&view=timeline')
  await page.getByRole('button', { name: 'Schedule control', exact: true }).click()
  const scheduleDialog = page.getByRole('dialog', { name: 'Scheduling, capacity & scenarios', exact: true })
  await expect(scheduleDialog).toBeVisible()
  await expectAllRequiredControlsNamed(scheduleDialog, 'schedule control')

  await openProjects(page, '/projects?id=901&view=reports&showcase=executive')
  const showcase = page.locator('[data-project-showcase]')
  await expect(showcase).toBeVisible()
  await expectAllRequiredControlsNamed(showcase, 'project showcase')

  expect(failures).toEqual([])
})
