import { test, expect, Page } from '@playwright/test'

type RuntimeState = { getProject: () => any; getLastPut: () => any }

const projectFixture = () => ({
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
    { id: 9011, name: 'Yield Guardian task A', status: 'Completed', progress: 100, owner: 'Proof Operator', priority: 'High', start_date: '2026-09-01', end_date: '2026-09-08', order_index: 10, dependencies_json: [], metadata_json: {} },
    { id: 9012, name: 'Yield Guardian task B', status: 'In Progress', progress: 55, owner: 'Proof Operator', priority: 'High', start_date: '2026-09-01', end_date: '2026-09-08', order_index: 20, dependencies_json: [], metadata_json: {} },
  ],
})

const installRoutes = async (page: Page): Promise<RuntimeState> => {
  let project = structuredClone(projectFixture())
  let lastPut: any = null
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
      project = structuredClone(lastPut)
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) })
    }
    if (request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  return { getProject: () => project, getLastPut: () => lastPut }
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

test('OUT-40 Slice C Board move alternatives expose exact names and minimum targets @out40-slice-c-rehearsal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await installIdentity(page)
  await installRoutes(page)
  await page.goto('/projects?id=901&view=board')

  const card = page.locator('[data-project-board-card="true"][data-task-id="9012"]')
  await expect(card).toBeVisible()
  const move = card.getByRole('button', { name: 'Move Yield Guardian task B to Blocked', exact: true })
  await expect(move).toBeVisible()
  const box = await move.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(40)
  expect(box!.height).toBeGreaterThanOrEqual(40)
  await expect(page.locator('[data-project-board-live-status="true"]')).toHaveAttribute('aria-live', 'polite')
})

test('OUT-40 Slice C keyboard status move persists canonical PUT, announces success, and restores focus @out40-slice-c-acceptance', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const failures = collectRuntimeFailures(page)
  await installIdentity(page)
  const state = await installRoutes(page)
  await page.goto('/projects?id=901&view=board')

  const sourceCard = page.locator('[data-project-board-card="true"][data-task-id="9012"]')
  const move = sourceCard.getByRole('button', { name: 'Move Yield Guardian task B to Blocked', exact: true })
  await move.focus()
  await expect(move).toBeFocused()
  await move.press('Enter')

  await expect.poll(() => state.getLastPut()?.tasks?.find((task: any) => task.id === 9012)?.status).toBe('Blocked')
  expect(state.getProject().tasks.find((task: any) => task.id === 9012).status).toBe('Blocked')

  const blockedColumn = page.locator('[data-project-board-column="Blocked"]')
  const movedCard = blockedColumn.locator('[data-project-board-card="true"][data-task-id="9012"]')
  await expect(movedCard).toBeVisible()
  await expect(page.locator('[data-project-board-live-status="true"]')).toHaveText('Yield Guardian task B moved to Blocked')
  await expect(movedCard).toBeFocused()
  await expect(movedCard.getByRole('button', { name: 'Move Yield Guardian task B to Review', exact: true })).toBeVisible()
  expect(failures).toEqual([])
})
