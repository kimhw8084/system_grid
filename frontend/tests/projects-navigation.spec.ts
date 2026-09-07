import { test, expect, Page } from '@playwright/test'

type Project = Record<string, any>
const task = (id: number, name: string, status = 'In Progress') => ({
  id, name, status, progress: status === 'Completed' ? 100 : 55, owner: 'Proof Operator', priority: 'High',
  start_date: '2026-09-01', end_date: '2026-09-08', order_index: id * 10, dependencies_json: [], metadata_json: {},
})
const makeProject = (id: number, code: string, name: string, status = 'In Progress'): Project => ({
  id, name: `${code} — ${name}`, parent_project_id: null, status, priority: 'High', owner: 'Proof Operator',
  objective: `${name} independently valuable outcome`, expected_outcomes: [`${name} accepted`], start_date: '2026-09-01', end_date: '2026-10-01',
  man_hours_saved: id === 901 ? 420 : 0, wafers_gained: id === 909 ? 32 : 0,
  metadata_json: { adoption_state: id === 909 ? 'Scaling' : 'Pilot' },
  tasks: [task(id * 10 + 1, `${name} task A`, 'Completed'), task(id * 10 + 2, `${name} task B`)],
})

const projects = [
  makeProject(901, 'P01', 'Yield Guardian'),
  makeProject(902, 'P02', 'Recipe Release Guardrail', 'Blocked'),
  makeProject(909, 'P09', 'Operator Adoption Loop'),
]

const installRoutes = async (page: Page) => {
  await page.route('**/api/v2/**', async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname
    const json = (value: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) })
    if (request.method() === 'GET' && path === '/api/v2/projects') return json({
      items: projects.map((project, index) => ({ id: String(project.id), display_key: `PRJ-${project.id}`, name: project.name, objective: project.objective, owner_id: 'proof_operator', team_id: 1, phase: project.status === 'Blocked' ? 'Executing' : 'Planning', run_state: 'Active', outcome_phase: 'Planned', outcome_result: null, priority: project.priority, target_date: project.end_date, parent_project_id: null, child_count: 0, updated_at: '2026-09-01T00:00:00Z', capabilities: { edit: true }, story: { attention_count: project.status === 'Blocked' ? 1 : 0, attention: project.status === 'Blocked' ? [{ id: `attention-${index}`, kind: 'Blocker', reason: 'Fixture blocker', accountable: 'Proof Operator', action: 'Open work' }] : [], health: { level: project.status === 'Blocked' ? 'At risk' : 'On track', reason: 'Navigation fixture' }, delivery: { percent: 50, label: '50%', method: 'Canonical task progress' }, next_milestone: null, milestones: [], acceptance_criteria: [], primary_metric: null, latest_update: null, governance: [], architecture: { assessment: 'Not assessed' }, resources: [], freshness: { updated_at: '2026-09-01T00:00:00Z', source: 'navigation-fixture' }, coverage: { resources: 'complete' } } })),
      summary: { Planned: 2, Active: 1, Delivered: 0, Paused: 0, Cancelled: 0, 'Needs attention': 1, Measuring: 0, Realized: 0, 'Closed below target': 0 }, as_of: '2026-09-01T00:00:00Z', source_revision: 'navigation-fixture', coverage: { projects: 'complete', rollups: 'complete', resources: 'complete' }, next_cursor: null,
    })
    if (request.method() === 'GET' && path === '/api/v2/focus') return json({ scope: 'project', engine_version: 'pv-focus-1', total: 0, items: [], all_priorities: [] })
    const work = path.match(/^\/api\/v2\/projects\/(\d+)\/work$/)
    if (request.method() === 'GET' && work) {
      const project = projects.find((item) => String(item.id) === work[1])!
      return json({ project_id: work[1], project_revision: 1, graph_revision: 1, items: project.tasks.map((item: any, index: number) => ({ id: String(item.id), title: item.name, kind: 'Task', parent_task_id: null, order_key: String((index + 1) * 1024), owner_id: 'proof_operator', status: item.status === 'Completed' ? 'Done' : item.status === 'In Progress' ? 'In progress' : item.status, progress: item.progress, revision: 1, start_date: item.start_date, end_date: item.end_date })), blockers: [] })
    }
    const plan = path.match(/^\/api\/v2\/projects\/(\d+)\/plan$/)
    if (request.method() === 'GET' && plan) {
      const project = projects.find((item) => String(item.id) === plan[1])!
      return json({ brief: { problem: 'Navigation fixture', objective: project.objective, in_scope: 'Canonical route proof', out_of_scope: 'Feature implementation', delivery_acceptance: [] }, milestones: [], work_breakdown: [], architecture: { assessment: 'Not assessed' }, governance: [], resources: [], guidance: [] })
    }
    if (request.method() === 'GET') return json({})
    return json({ status: 'applied' })
  })
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname
    if (request.method() === 'GET' && path.endsWith('/settings/bootstrap')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ VITE_API_BASE_URL: url.origin, DEFAULT_USER_ID: 'proof_operator' }) })
    if (request.method() === 'GET' && path === '/api/v1/settings/user/profile') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'proof_operator', username: 'proof_operator', full_name: 'Proof Operator', team: 'Operations', team_id: 1, is_admin: true, permissions: { all: 3, projects: 3 } }) })
    if (request.method() === 'GET' && path === '/api/v1/settings/user/settings') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ theme: 'nordic-frost-v1' }) })
    if (request.method() === 'GET' && path === '/api/v1/health') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    if (request.method() === 'GET' && path === '/api/v1/projects') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(projects) })
    if (request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    if (request.method() === 'PUT' && path.startsWith('/api/v1/projects/')) {
      const body = request.postDataJSON?.() || {}
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sysgrid-theme', 'nordic-frost-v1')
    localStorage.setItem('SYSGRID_USER_ID', 'proof_operator')
  })
  await installRoutes(page)
})

const expectIntentNav = async (page: Page) => {
  const primary = page.locator('[data-project-primary-nav="true"] > nav')
  await expect(primary).toBeVisible()
  for (const label of ['Home', 'Work', 'Plan', 'Timeline', 'Updates', 'Outcomes']) await expect(primary.getByRole('link', { name: label, exact: true })).toBeVisible()
  await expect(primary.getByRole('link')).toHaveCount(6)
}

test('P01 central-navigation rehearsal exposes six intents and persistent context @navigation-rehearsal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/projects?id=901&view=overview')
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('P01 — Yield Guardian')
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('420h saved')
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('Pilot')
  await expectIntentNav(page)
})

test('P01 Work deep link opens the canonical task graph and Board projection @navigation-acceptance', async ({ page }) => {
  await page.goto('/projects?id=901&view=overview')
  const primary = page.locator('[data-project-primary-nav="true"]')
  await primary.getByRole('link', { name: 'Work', exact: true }).click()
  await expect(page).toHaveURL(/\/projects\/901\/work\?layout=list$/)
  await expect(page.getByRole('treegrid', { name: 'Project work breakdown' })).toBeVisible()
  await page.getByRole('link', { name: 'Board', exact: true }).click()
  await expect(page).toHaveURL(/\/projects\/901\/work\?layout=board/)
  await expect(page.getByLabel('Move Yield Guardian task B to')).toBeVisible()
})

test('P02 fixed project navigation exposes canonical Plan, Timeline, Updates and Outcomes deep links @navigation-acceptance', async ({ page }) => {
  await page.goto('/projects?id=902&view=overview')
  const primary = page.locator('[data-project-primary-nav="true"]')
  await expect(primary.getByRole('link', { name: 'Plan', exact: true })).toHaveAttribute('href', '/projects/902/plan?section=brief')
  await expect(primary.getByRole('link', { name: 'Timeline', exact: true })).toHaveAttribute('href', '/projects/902/timeline')
  await expect(primary.getByRole('link', { name: 'Updates', exact: true })).toHaveAttribute('href', '/projects/902/updates?section=updates')
  await expect(primary.getByRole('link', { name: 'Outcomes', exact: true })).toHaveAttribute('href', '/projects/902/outcomes?section=summary')
  await primary.getByRole('link', { name: 'Plan', exact: true }).click(); await expect(page).toHaveURL(/\/projects\/902\/plan\?section=brief$/); await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeVisible()
  await page.goto('/projects?id=902&view=timeline'); await expect(page.locator('[data-project-flagship-gantt="true"]')).toBeVisible()
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('P02 — Recipe Release Guardrail')
})

test('P09 Outcomes reveals Reports and Insights and legacy governance link canonicalizes @navigation-acceptance', async ({ page }) => {
  await page.goto('/projects?id=909&view=overview')
  const primary = page.locator('[data-project-primary-nav="true"]')
  await expect(primary.getByRole('link', { name: 'Outcomes', exact: true })).toHaveAttribute('href', '/projects/909/outcomes?section=summary')
  await page.goto('/projects?id=909&view=governance')
  await expect(page).toHaveURL(/view=insights.*section=governance|section=governance.*view=insights/)
  await expect(page.locator('[data-project-insights-hub="true"]')).toBeVisible()
})

test('central Add/edit and intent navigation reuse existing project flows @navigation-acceptance', async ({ page }) => {
  await page.goto('/projects?id=901&view=overview')
  const addEdit = page.locator('.sg-context-actions details')
  await addEdit.locator('summary').click(); await addEdit.getByRole('button', { name: 'Write update', exact: true }).click(); await expect(page).toHaveURL(/\/projects\/901\/updates\?section=updates$/)
  await page.goto('/projects?id=901&view=overview')
  const primary = page.locator('[data-project-primary-nav="true"]')
  await expect(primary.getByRole('link', { name: 'Timeline', exact: true })).toHaveAttribute('href', '/projects/901/timeline')
  await page.goto('/projects?id=901&view=timeline'); await expect(page.locator('[data-project-flagship-gantt="true"]')).toBeVisible()
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('P01 — Yield Guardian')
})

test('Portfolio remains a separate cross-project utility @navigation-acceptance', async ({ page }) => {
  await page.goto('/projects?view=portfolio&section=control')
  await expect(page.locator('[data-p04-portfolio="true"]')).toBeVisible()
  await expect(page.locator('[data-project-workbench-header="true"]')).toHaveCount(0)
  await expect(page.locator('[data-project-primary-nav="true"]')).toHaveCount(0)
})
