import { test, expect, Page } from '@playwright/test'

type Project = Record<string, any>
const makeTask = (id: number, name: string, start: string, end: string, deps: any[] = []) => ({ id, name, status: 'In Progress', progress: 50, owner: 'Planner', start_date: start, end_date: end, dependencies_json: deps, metadata_json: {} })
const seed: Project = {
  id: 3801,
  name: 'OUT-38 Browser Proof',
  status: 'In Progress',
  priority: 'High',
  owner: 'Planner',
  start_date: '2026-01-05',
  end_date: '2026-01-31',
  metadata_json: {},
  tasks: [
    makeTask(1, 'Foundation', '2026-01-05', '2026-01-06'),
    makeTask(2, 'Delivery', '2026-01-07', '2026-01-08', [1]),
  ],
}
let projects: Project[] = []
let lastPutBody: any = null

const installRoutes = async (page: Page) => {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname
    if (request.method() === 'GET' && path.endsWith('/settings/bootstrap')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ VITE_API_BASE_URL: url.origin, DEFAULT_USER_ID: 'proof_operator' }) })
    if (request.method() === 'GET' && path === '/api/v1/settings/user/profile') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'proof_operator', username: 'proof_operator', full_name: 'Proof Operator', is_admin: true, permissions: { all: 3, projects: 3 } }) })
    if (request.method() === 'GET' && path === '/api/v1/settings/user/settings') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ theme: 'nordic-frost-v1' }) })
    if (request.method() === 'GET' && path === '/api/v1/health') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    if (request.method() === 'GET' && path === '/api/v1/projects') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(projects) })
    if (request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    if (request.method() === 'PUT' && path === '/api/v1/projects/3801') {
      lastPutBody = request.postDataJSON(); projects = [{ ...projects[0], ...lastPutBody }]
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(projects[0]) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}

test.beforeEach(async ({ page }) => {
  projects = [structuredClone(seed)]; lastPutBody = null
  await page.addInitScript(() => { localStorage.setItem('sysgrid-theme', 'nordic-frost-v1'); localStorage.setItem('SYSGRID_USER_ID', 'proof_operator') })
  await installRoutes(page)
})

test('advanced schedule control completes the existing Timeline without replacing it @scheduling-rehearsal', async ({ page }) => {
  await page.goto('/projects?id=3801&view=timeline')
  await expect(page.locator('[data-projects-scheduling-completion="true"]')).toBeVisible()
  await expect(page.locator('[data-project-timeline="true"]')).toBeVisible()
  await page.locator('[data-project-schedule-control-toggle="true"]').click()
  await expect(page.locator('[data-project-schedule-control-drawer="true"]')).toBeVisible()
  await expect(page.locator('[data-project-schedule-network="true"]')).toContainText('Typed relationship + lag')
  await expect(page.locator('[data-project-schedule-analysis="true"]')).toContainText('Typed-edge CPM')
  await expect(page.locator('[data-project-schedule-capacity="true"]')).toContainText('Capacity Unknown')
})

test('typed dependency and calendar save through canonical Project PUT @scheduling-acceptance', async ({ page }) => {
  await page.goto('/projects?id=3801&view=timeline')
  await page.locator('[data-project-schedule-control-toggle="true"]').click()
  const network = page.locator('[data-project-schedule-network="true"]')
  await network.getByLabel('Task').selectOption('2')
  await network.getByLabel('Predecessor').selectOption('1')
  await network.getByLabel('Type').selectOption('SS')
  await network.getByRole('spinbutton').fill('2')
  await network.getByRole('button', { name: /Save dependency/i }).click()
  await expect.poll(() => lastPutBody?.tasks?.find((task: any) => task.id === 2)?.dependencies_json?.[0]?.type).toBe('SS')
  expect(lastPutBody.tasks.find((task: any) => task.id === 2).dependencies_json[0].lag_days).toBe(2)

  const constraints = page.locator('[data-project-schedule-constraints="true"]')
  await constraints.getByRole('button', { name: 'Sat', exact: true }).click()
  await constraints.getByRole('button', { name: /Save calendar/i }).click()
  await expect.poll(() => lastPutBody?.metadata_json?.project_schedule_v2?.working_days).toEqual([1, 2, 3, 4, 5, 6])
})

test('scenario preview is non-mutating, save is metadata-only, and Apply changes live dates @scheduling-acceptance', async ({ page }) => {
  await page.goto('/projects?id=3801&view=timeline')
  await page.locator('[data-project-schedule-control-toggle="true"]').click()
  const scenarios = page.locator('[data-project-schedule-scenarios="true"]')
  await expect(scenarios.locator('[data-project-scenario-preview="true"]')).toContainText('Preview is mutation-free')
  await scenarios.getByPlaceholder('Scenario name').fill('Two-day slip')
  await scenarios.getByRole('spinbutton', { name: 'Scenario slip days' }).fill('2')
  await scenarios.getByRole('button', { name: /Save scenario/i }).click()
  await expect.poll(() => lastPutBody?.metadata_json?.project_schedule_v2?.scenarios?.[0]?.status).toBe('PROPOSED')
  expect(lastPutBody.tasks[0].start_date).toBe('2026-01-05')
  await scenarios.getByRole('button', { name: /Apply/i }).click()
  await expect.poll(() => lastPutBody?.metadata_json?.project_schedule_v2?.scenarios?.[0]?.status).toBe('APPLIED')
  expect(lastPutBody.tasks[0].start_date).toBe('2026-01-07')
})

test('baseline history is additive and capacity stays Unknown without authority @scheduling-acceptance', async ({ page }) => {
  await page.goto('/projects?id=3801&view=timeline')
  await page.locator('[data-project-schedule-control-toggle="true"]').click()
  const baselines = page.locator('[data-project-schedule-baselines="true"]')
  await baselines.getByPlaceholder('Baseline name').fill('Gate baseline')
  await baselines.getByRole('button', { name: 'Capture', exact: true }).click()
  await expect.poll(() => lastPutBody?.metadata_json?.project_schedule_v2?.baselines?.length).toBe(1)
  await expect(page.locator('[data-project-schedule-capacity="true"]')).toContainText('Capacity Unknown')
})
