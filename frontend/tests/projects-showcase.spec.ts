import { test, expect, Page } from '@playwright/test'

type Project = Record<string, any>
const seed: Project = {
  id: 3901,
  name: 'P01 Executive Value Proof',
  status: 'Completed',
  priority: 'High',
  owner: 'Program Lead',
  objective: 'Deliver measurable value while preserving risk and evidence truth.',
  start_date: '2026-08-01',
  end_date: '2026-08-31',
  expected_outcomes: [{ name: 'Adoption and realized value' }],
  metadata_json: {
    project_schedule_v2: { capacity_by_owner: { 'Program Lead': 1, Analyst: 2 }, working_days: [1,2,3,4,5] },
    project_outcome_realization_v1: {
      adoption: { eligible_population: 100, target_percent: 80, current_percent: 64, active_population: 64, measurement_source: 'Authoritative product analytics', measured_at: '2026-09-01T18:00:00Z', confidence: 'High' },
      value: { baseline: 0, target: 40, current: 24, unit: 'hours', measurement_source: 'Authoritative operations ledger', measured_at: '2026-09-01T18:00:00Z', confidence: 'High', explanation: 'Measured hours defended.' },
      history: [],
    },
    files: [{ id: 'f1', title: 'Qualification evidence', url: 'https://evidence.local/qualification' }],
    links: [{ id: 'l1', title: 'Decision memo', url: 'https://evidence.local/decision' }],
    project_governance_v1: {
      raid: [{ id: 'r1', type: 'Risk', title: 'Approver availability', status: 'Open', impact: 'High', owner: 'Program Lead' }],
      stage_gates: [{ id: 'g1', name: 'Release', status: 'Ready', evidence: [{ id: 'e1', label: 'Qualification evidence', complete: true }] }],
      decisions: [{ id: 'd1', kind: 'Decision', title: 'Use canonical reporting', status: 'Approved', rationale: 'Avoid duplicate truth.' }],
      audit: [],
    },
    project_updates_v1: [{ id: 'u1', author: 'Program Lead', content: 'Launch is complete; adoption measurement is current.', created_at: '2026-09-01T19:00:00Z', mentions: ['@analyst'] }],
  },
  tasks: [
    { id: 1, name: 'Foundation', status: 'Completed', progress: 100, owner: 'Program Lead', start_date: '2026-08-01', end_date: '2026-08-05', dependencies_json: [], metadata_json: { milestone: true } },
    { id: 2, name: 'Launch', status: 'Completed', progress: 100, owner: 'Analyst', start_date: '2026-08-06', end_date: '2026-08-15', dependencies_json: [{ id: '1', type: 'FS', lag_days: 0 }], metadata_json: { milestone: true } },
    { id: 3, name: 'Adoption follow-through', status: 'Blocked', progress: 50, owner: 'Program Lead', start_date: '2026-08-16', end_date: '2026-08-30', dependencies_json: [{ id: '2', type: 'FS', lag_days: 0 }], metadata_json: {} },
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
    if (request.method() === 'PUT' && path === '/api/v1/projects/3901') {
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

test('executive showcase is question-driven, truthful and sparse @showcase-rehearsal', async ({ page }) => {
  await page.goto('/projects?id=3901&view=reports')
  await expect(page.locator('[data-project-overview="true"]')).toHaveCount(0)
  const open = page.getByRole('button', { name: 'Executive showcase', exact: true })
  await expect(open).toBeVisible(); await open.click()
  await expect(page.locator('[data-project-showcase="executive"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Outcome & progress', exact: true })).toBeVisible()
  await expect(page.locator('[data-project-visual-source="true"]').first()).toBeVisible()
  await expect(page.locator('[data-project-visual-fallback="true"]').first()).toBeVisible()

  const next = page.getByRole('button', { name: 'Next', exact: true })
  await next.click()
  await expect(page.getByRole('heading', { name: 'Schedule & capacity', exact: true })).toBeVisible()
  await expect(page.locator('[data-project-visual-id="schedule-health"]')).toBeVisible()

  await next.click()
  await expect(page.getByRole('heading', { name: 'Risk, evidence & next actions', exact: true })).toBeVisible()
  await expect(page.locator('[data-project-visual-id="risk-pressure"]')).toContainText('blocker')
  await expect(page.locator('[data-project-visual-id="collaboration-evidence"]')).toBeVisible()
})

test('visual pins use canonical full Project PUT and preserve existing reporting metadata @showcase-acceptance', async ({ page }) => {
  await page.goto('/projects?id=3901&view=reports&showcase=team')
  await expect(page.locator('[data-project-showcase="team"]')).toBeVisible()
  const next = page.getByRole('button', { name: 'Next', exact: true })
  await next.click()
  await expect(page.getByRole('heading', { name: 'Schedule & capacity', exact: true })).toBeVisible()
  const schedule = page.locator('[data-project-visual-id="schedule-health"]')
  await schedule.getByRole('button', { name: /Pin Schedule health/i }).click()
  await expect.poll(() => lastPutBody?.metadata_json?.project_reporting_v1?.pinned_visual_ids).toContain('schedule-health')
  expect(lastPutBody.metadata_json.project_outcome_realization_v1.adoption.current_percent).toBe(64)

  await next.click()
  await expect(page.getByRole('heading', { name: 'Risk, evidence & next actions', exact: true })).toBeVisible()
  await expect(page.locator('[data-project-visual-id="collaboration-evidence"]')).toBeVisible()
})

test('captured report showcase stays frozen and does not borrow live schedule truth @showcase-acceptance', async ({ page }) => {
  await page.goto('/projects?id=3901&view=reports')
  await page.getByRole('button', { name: /Capture snapshot/i }).click()
  await expect.poll(() => lastPutBody?.metadata_json).toBeTruthy()
  await expect(page.locator('[data-project-report-snapshot]').first()).toBeVisible()
  await page.getByRole('button', { name: 'Executive showcase', exact: true }).click()
  await expect(page.locator('[data-project-showcase-snapshot="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Schedule & capacity', exact: true })).toBeVisible()
  await expect(page.locator('[data-project-visual-id="schedule-health"]')).toContainText(/not captured|not borrowed/i)
  await expect(page.locator('[data-project-visual-id="schedule-health"] [data-project-visual-fallback="true"]')).toBeVisible()
  await expect(page).toHaveURL(/report=.*showcase=executive|showcase=executive.*report=/)
})
