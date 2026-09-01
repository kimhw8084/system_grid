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
  for (const label of ['Overview', 'Work', 'Plan', 'Discuss', 'Evidence', 'Outcomes']) await expect(primary.getByRole('button', { name: label, exact: true })).toBeVisible()
  await expect(primary.getByRole('button')).toHaveCount(6)
}

test('P01 central-navigation rehearsal exposes six intents and persistent context @navigation-rehearsal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/projects?id=901&view=overview')
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('P01 — Yield Guardian')
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('420h saved')
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('Pilot')
  await expectIntentNav(page)
})

test('P01 Work progressively reveals Tasks and Board without losing project context @navigation-acceptance', async ({ page }) => {
  await page.goto('/projects?id=901&view=overview')
  const primary = page.locator('[data-project-primary-nav="true"]')
  await primary.getByRole('button', { name: 'Work', exact: true }).click()
  await expect(page).toHaveURL(/view=tasks/)
  const modes = page.locator('[data-project-progressive-modes="work"]')
  await expect(modes).toBeVisible(); await expect(modes.getByRole('button')).toHaveCount(2)
  await modes.getByRole('button', { name: 'Board', exact: true }).click()
  await expect(page).toHaveURL(/view=board/)
  await expect(page.locator('[data-project-execution-hub="true"]')).toBeVisible()
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('P01 — Yield Guardian')
})

test('P02 Plan Discuss Evidence are direct intent paths with persistent context @navigation-acceptance', async ({ page }) => {
  await page.goto('/projects?id=902&view=overview')
  const primary = page.locator('[data-project-primary-nav="true"]')
  await primary.getByRole('button', { name: 'Plan', exact: true }).click(); await expect(page).toHaveURL(/view=timeline/); await expect(page.locator('[data-project-flagship-gantt="true"]')).toBeVisible()
  await primary.getByRole('button', { name: 'Discuss', exact: true }).click(); await expect(page).toHaveURL(/view=updates/); await expect(page.locator('[data-project-updates-native="true"]')).toBeVisible()
  await primary.getByRole('button', { name: 'Evidence', exact: true }).click(); await expect(page).toHaveURL(/view=files/); await expect(page.locator('[data-project-files-foundation="true"]')).toBeVisible()
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('P02 — Recipe Release Guardrail')
})

test('P09 Outcomes reveals Reports and Insights and legacy governance link canonicalizes @navigation-acceptance', async ({ page }) => {
  await page.goto('/projects?id=909&view=overview')
  const primary = page.locator('[data-project-primary-nav="true"]')
  await primary.getByRole('button', { name: 'Outcomes', exact: true }).click()
  await expect(page).toHaveURL(/view=reports/)
  const modes = page.locator('[data-project-progressive-modes="outcomes"]')
  await expect(modes).toBeVisible(); await expect(modes.getByRole('button')).toHaveCount(2)
  await modes.getByRole('button', { name: 'Insights', exact: true }).click(); await expect(page).toHaveURL(/view=insights/); await expect(page.locator('[data-project-insights-hub="true"]')).toBeVisible()
  await page.goto('/projects?id=909&view=governance')
  await expect(page).toHaveURL(/view=insights.*section=governance|section=governance.*view=insights/)
  await expect(page.locator('[data-project-insights-hub="true"]')).toBeVisible()
})

test('central Add and Jump to menus reuse existing project flows @navigation-acceptance', async ({ page }) => {
  await page.goto('/projects?id=901&view=overview')
  const add = page.locator('[data-project-quick-add="true"]')
  await add.locator('summary').click(); await add.getByRole('button', { name: 'Update', exact: true }).click(); await expect(page).toHaveURL(/view=updates/)
  const jump = page.locator('[data-project-jump-menu="true"]')
  await jump.locator('summary').click(); await expect(jump.getByRole('button')).toHaveCount(8)
  await jump.getByRole('button', { name: 'Timeline', exact: true }).click(); await expect(page).toHaveURL(/view=timeline/)
  await expect(page.locator('[data-project-workbench-header="true"]')).toContainText('P01 — Yield Guardian')
})

test('Portfolio remains a separate cross-project utility @navigation-acceptance', async ({ page }) => {
  await page.goto('/projects?view=portfolio&section=control')
  await expect(page.locator('[data-project-portfolio-hub="true"]')).toBeVisible()
  await expect(page.locator('[data-project-workbench-header="true"]')).toHaveCount(0)
  await expect(page.locator('[data-project-primary-nav="true"]')).toHaveCount(0)
})
