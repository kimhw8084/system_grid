import { test, expect, Page } from '@playwright/test'

type Project = Record<string, any>
const KEY = 'project_outcome_realization_v1'
const task = (id: number, progress = 100) => ({ id, name: `Task ${id}`, status: progress >= 100 ? 'Completed' : 'In Progress', progress, owner: 'Owner', metadata_json: {} })
const realization = (eligible: number, targetAdoption: number, currentAdoption: number | null, targetValue: number, currentValue: number | null, source: string) => ({
  adoption: { eligible_population: eligible, target_percent: targetAdoption, current_percent: currentAdoption, active_population: currentAdoption == null ? null : Math.round((eligible * currentAdoption) / 100), desired_frequency: 'Weekly', owner: 'Adoption Owner', measurement_source: currentAdoption == null ? null : source, measured_at: currentAdoption == null ? null : '2026-09-01T12:00:00.000Z', confidence: currentAdoption == null ? null : 'High' },
  value: { baseline: 20, target: targetValue, current: currentValue, unit: 'hours/year', annualization_rule: 'Measured trailing 30d × 12', measurement_source: currentValue == null ? null : source, measured_at: currentValue == null ? null : '2026-09-01T12:00:00.000Z', confidence: currentValue == null ? null : 'High', explanation: 'Measured operational benefit; no adoption multiplier.' },
  history: [],
})
const makeProject = (id: number, name: string, outcome: any | null, parent_project_id: number | null = null): Project => ({
  id, name, parent_project_id, status: 'Completed', priority: 'High', owner: `Owner ${id}`, objective: `Outcome ${id}`,
  start_date: '2026-08-01', end_date: '2026-09-01', man_hours_saved: id === 80101 ? 920 : 100, stoploss_minutes_saved: id === 80101 ? 460 : 20, wafers_gained: id === 80108 ? 180 : 10,
  metadata_json: outcome ? { [KEY]: outcome } : {}, tasks: [task(id * 10)],
})
const p01 = makeProject(80101, 'P01 — Yield Guardian', realization(100, 80, 92, 100, 135, 'Benefits ledger'))
const p03 = makeProject(80103, 'P03 — Adoption Risk', realization(120, 80, 20, 100, 120, 'Usage warehouse'))
const p08 = makeProject(80108, 'P08 — Realized Value', realization(200, 70, 88, 100, 150, 'Benefits ledger'))
const p04 = makeProject(80104, 'P04 — Not Measured', null)
const p08Child = makeProject(80181, 'P08 child outcome', realization(50, 80, 100, 100, 999, 'Child ledger'), p08.id)
let projects: Project[] = [p01, p03, p08, p04, p08Child]
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
    if (request.method() === 'PUT' && path.startsWith('/api/v1/projects/')) {
      lastPutBody = request.postDataJSON?.() || {}; const id = Number(path.split('/').pop()); const current = projects.find((row) => Number(row.id) === id) || {}; const next = { ...current, ...lastPutBody, id, tasks: lastPutBody.tasks || current.tasks || [] }; projects = projects.map((row) => Number(row.id) === id ? next : row)
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(next) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}

test.beforeEach(async ({ page }) => {
  projects = [structuredClone(p01), structuredClone(p03), structuredClone(p08), structuredClone(p04), structuredClone(p08Child)]; lastPutBody = null
  await page.addInitScript(() => { localStorage.setItem('sysgrid-theme', 'nordic-frost-v1'); localStorage.setItem('SYSGRID_USER_ID', 'proof_operator') })
  await installRoutes(page)
})

test('P03 completed delivery remains visibly at risk when adoption is weak @outcomes-rehearsal', async ({ page }) => {
  await page.goto('/projects?id=80103&view=overview')
  const state = page.locator('[data-project-outcome-state="true"]')
  await expect(state).toContainText('At Risk')
  await expect(page.locator('[data-project-outcome-realization="true"]')).toContainText('20%')
  await expect(page.locator('[data-project-outcome-realization="true"]')).toContainText('Usage warehouse')
})

test('P01 and P08 expose traceable measured adoption and realized value @outcomes-acceptance', async ({ page }) => {
  for (const [id, adoption, value] of [[80101, '92%', '135'], [80108, '88%', '150']] as const) {
    await page.goto(`/projects?id=${id}&view=overview`)
    const panel = page.locator('[data-project-outcome-realization="true"]')
    await expect(panel).toBeVisible(); await expect(panel).toContainText('Realized'); await expect(panel).toContainText(adoption); await expect(panel).toContainText(value); await expect(panel).toContainText('High confidence')
  }
})

test('missing outcome measurement renders Unknown and Not measured @outcomes-acceptance', async ({ page }) => {
  await page.goto('/projects?id=80104&view=overview')
  await expect(page.locator('[data-project-outcome-state="true"]')).toContainText('Unknown')
  const panel = page.locator('[data-project-outcome-realization="true"]')
  await expect(panel).toContainText('Not measured')
  await expect(panel).not.toContainText('0% adoption')
})

test('portfolio outcome summary excludes child population and child value @outcomes-acceptance', async ({ page }) => {
  await page.goto('/projects?view=portfolio&section=control')
  const summary = page.locator('[data-project-outcome-portfolio="true"]')
  await expect(summary).toBeVisible()
  await expect(summary).toContainText('420 measured population')
  await expect(summary).toContainText('2 realized')
  await expect(summary).toContainText('1 at risk')
  await expect(summary).not.toContainText('470 measured population')
  await expect(summary).not.toContainText('1364')
})

test('measurement edit uses canonical Project PUT and preserves legacy ROI fields @outcomes-acceptance', async ({ page }) => {
  await page.goto('/projects?id=80101&view=insights&section=review')
  await page.getByRole('button', { name: 'Measure outcome', exact: false }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const adoption = dialog.getByRole('spinbutton', { name: 'Current adoption percent' })
  await adoption.fill('94')
  await dialog.getByRole('button', { name: 'Save measurement', exact: true }).click()
  await expect.poll(() => lastPutBody?.metadata_json?.[KEY]?.adoption?.current_percent).toBe(94)
  expect(lastPutBody?.man_hours_saved).toBe(920)
  expect(lastPutBody?.stoploss_minutes_saved).toBe(460)
  expect(lastPutBody?.wafers_gained).toBe(10)
})

test('captured report snapshot freezes measured outcome values @outcomes-acceptance', async ({ page }) => {
  await page.goto('/projects?id=80101&view=reports')
  const captureButton = page.getByRole('button', { name: 'Capture snapshot', exact: true })
  await expect(captureButton).toBeVisible(); await expect(captureButton).toBeEnabled(); await captureButton.focus(); await expect(captureButton).toBeFocused(); await page.keyboard.press('Enter')
  const report = page.locator('[data-project-report-outcome="true"]')
  await expect(report).toBeVisible(); await expect(report).toContainText('92%'); await expect(report).toContainText('135')
  await expect.poll(() => lastPutBody?.metadata_json?.project_reporting_v1?.snapshots?.[0]?.summary?.outcomeRealization?.measurement?.adoption?.current_percent).toBe(92)
})
