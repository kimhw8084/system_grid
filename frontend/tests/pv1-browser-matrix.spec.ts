import { expect, test, type Page } from '@playwright/test'
import { isExpectedTelemetryRequest, isExpectedUnavailableConsoleError, isUnexpectedConsoleError, type BrowserResponseDescriptor } from '../src/observability/browserFailurePolicy'

const viewports = [
  [320, 568], [390, 844], [430, 932], [768, 1024], [1024, 768],
  [1280, 720], [1440, 900], [1920, 1080], [2560, 1440],
] as const
const themes = ['nordic-frost-v1', 'nordic-light-v1', 'midnight-v1'] as const

const story = {
  health: { level: 'On track', reason: 'Matrix fixture' },
  delivery: { percent: 50, label: '50%', method: 'Canonical task progress' },
  next_milestone: null,
  milestones: [], attention: [], attention_count: 0, acceptance_criteria: [],
  primary_metric: null, latest_update: null, governance: [],
  architecture: { assessment: 'Not assessed' }, resources: [],
  freshness: { updated_at: '2026-09-01T00:00:00Z', source: 'pv1-browser-matrix' },
  coverage: { resources: 'complete' },
}
const project = {
  id: 'matrix-1', display_key: 'PRJ-MATRIX-1', tenant_id: 1,
  name: 'Matrix Project with a deliberately long management-readable label',
  objective: 'Exercise the canonical Portfolio surface across the required viewport and theme cells.',
  owner_id: 'matrix_operator', team_id: 1, phase: 'Executing', run_state: 'Active', priority: 'High',
  target_date: '2026-12-18', architecture_assessment: 'Not assessed', outcome_phase: 'Planned', outcome_result: 'Unassessed',
  revision: 1, graph_revision: 1, capabilities: { view: true, edit: true, transition: true }, story,
}

const bootstrap = (origin: string) => ({ VITE_API_BASE_URL: origin, DEFAULT_USER_ID: 'matrix_operator' })
const json = (value: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(value) })

type MatrixState = 'typical' | 'empty' | 'unavailable'

async function installStrictRoutes(page: Page, state: () => MatrixState, unexpected: () => string[], allowedResponses: () => BrowserResponseDescriptor[]) {
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (!path.startsWith('/api/')) return route.continue()
    if (request.method() === 'POST' && path === '/api/v1/observability/performance') {
      return route.fulfill(json({ accepted: true }, 202))
    }
    if (request.method() !== 'GET') {
      unexpected().push(`${request.method()} ${path}`)
      await route.abort()
      return
    }
    if (path === '/api/v1/settings/bootstrap') return route.fulfill(json(bootstrap(url.origin)))
    if (path === '/api/v1/settings/user/profile') return route.fulfill(json({ id: 'matrix_operator', username: 'matrix_operator', full_name: 'Matrix Operator', is_admin: true, permissions: { all: 3, projects: 3 } }))
    if (path === '/api/v1/settings/user/settings') return route.fulfill(json({ theme: 'nordic-frost-v1' }))
    if (path === '/api/v1/health') return route.fulfill(json({ status: 'ok' }))
    if (path === '/api/v1/tenants/me') return route.fulfill(json([]))
    if (path === '/api/v1/settings/teams') return route.fulfill(json([{ id: 1, name: 'Matrix Team', is_archived: false }]))
    if (path === '/api/v1/settings/operators') return route.fulfill(json([{ id: 'matrix_operator', username: 'matrix_operator', full_name: 'Matrix Operator', team_id: 1 }]))
    if (path === '/api/v2/projects') {
      const currentState = state()
      if (currentState === 'unavailable') {
        allowedResponses().push({ method: request.method(), url: request.url(), status: 503, state: currentState })
        return route.fulfill(json({ code: 'SERVICE_UNAVAILABLE', message: 'Matrix outage' }, 503))
      }
      return route.fulfill(json({ items: currentState === 'empty' ? [] : [project], summary: {}, next_cursor: null, as_of: '2026-09-01T00:00:00Z', source_revision: 'matrix-fixture', coverage: { projects: 'complete' } }))
    }
    unexpected().push(`${request.method()} ${path}`)
    await route.abort()
  })
}

test('PV1 browser/state acceptance matrix covers required cells with strict request failure @pv1-browser-matrix', async ({ page }) => {
  const rawConsoleErrors: string[] = []
  const allowedConsoleFailures: Array<BrowserResponseDescriptor & { message: string; reason: string; allowlist_rule: string }> = []
  const pageErrors: string[] = []
  const requestFailures: string[] = []
  const unexpected: string[] = []
  const emptyUnexpected: string[] = []
  const unavailableUnexpected: string[] = []
  const allowedResponses: BrowserResponseDescriptor[] = []
  let state: MatrixState = 'typical'
  let activeUnexpected = unexpected
  page.on('console', (message) => {
    if (message.type() === 'error' && isUnexpectedConsoleError(message.text())) rawConsoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const pathname = new URL(request.url()).pathname
    if (isExpectedTelemetryRequest({ method: request.method(), url: request.url(), resourceType: request.resourceType() })) return
    requestFailures.push(`${request.method()} ${pathname}`)
  })
  await page.addInitScript(() => {
    localStorage.setItem('SYSGRID_USER_ID', 'matrix_operator')
    localStorage.setItem('SYSGRID_CONFIG_DEFAULT_USER_ID', 'matrix_operator')
    const theme = new URL(window.location.href).searchParams.get('pv1_theme')
    if (theme) localStorage.setItem('sysgrid-theme', theme)
  })
  await installStrictRoutes(page, () => state, () => activeUnexpected, () => allowedResponses)

  const cells: Array<{ viewport: string; theme: string; width: number; height: number }> = []
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height })
    for (const theme of themes) {
      await page.goto(`/projects?pv1_theme=${encodeURIComponent(theme)}`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('[data-p04-portfolio="true"]')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
      cells.push({ viewport: `${width}x${height}`, theme, width, height })
    }
  }

  state = 'empty'
  activeUnexpected = emptyUnexpected
  await page.goto('/projects', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No projects yet', { exact: true })).toBeVisible()

  state = 'unavailable'
  activeUnexpected = unavailableUnexpected
  await page.goto('/projects', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Portfolio unavailable', { exact: true })).toBeVisible()

  const remainingAllowedResponses = [...allowedResponses]
  const consoleErrors = rawConsoleErrors.filter((message) => {
    const index = remainingAllowedResponses.findIndex((response) => isExpectedUnavailableConsoleError(message, response))
    if (index < 0) return true
    const [response] = remainingAllowedResponses.splice(index, 1)
    allowedConsoleFailures.push({ ...response, message, reason: 'Intentional unavailable-state API fixture', allowlist_rule: 'GET /api/v2/projects -> 503 while state=unavailable' })
    return false
  })
  console.log(JSON.stringify({ schema: 'sysgrid.pv1.browser-matrix.v1', cells, data_states: ['typical', 'empty', 'api-unavailable'], mocked: true, unexpected_requests: [...unexpected, ...emptyUnexpected, ...unavailableUnexpected], console_errors: consoleErrors, allowed_console_failures: allowedConsoleFailures, page_errors: pageErrors, request_failures: requestFailures }))
  expect(unexpected, 'Unexpected mocked API requests must fail the matrix').toEqual([])
  expect(emptyUnexpected, 'Unexpected empty-state API requests must fail the matrix').toEqual([])
  expect(unavailableUnexpected, 'Unexpected unavailable-state API requests must fail the matrix').toEqual([])
  expect(consoleErrors).toEqual([])
  expect(pageErrors).toEqual([])
})
