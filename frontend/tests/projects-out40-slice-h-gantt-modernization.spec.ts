import { test, expect, Page, Locator } from '@playwright/test'

type Project = Record<string, any>
type State = { getProject: () => Project; getPutCount: () => number; getProjectGetCount: () => number; resetWrites: () => void }

const iso = (ordinal: number) => new Date(ordinal * 86_400_000).toISOString().slice(0, 10)
const baseOrdinal = Math.floor(Date.UTC(2026, 8, 1) / 86_400_000)
const projectFixture = (): Project => {
  const tasks = Array.from({ length: 120 }, (_, index) => {
    const id = 1001 + index
    const start = baseOrdinal + index * 2
    const dependencyType = index === 1 ? 'FS' : (['FS', 'SS', 'FF', 'SF'] as const)[index % 4]
    const dependency = index === 0 ? [] : [{ id: String(id - 1), type: dependencyType, lag_days: index % 7 === 0 ? 1 : 0 }]
    return {
      id,
      name: `Gantt task ${index + 1}`,
      status: index % 17 === 0 ? 'Blocked' : index % 5 === 0 ? 'Review' : 'In Progress',
      progress: (index * 13) % 95,
      owner: `Planner ${index % 4}`,
      priority: index % 9 === 0 ? 'High' : 'Medium',
      start_date: iso(start),
      end_date: iso(start + (index === 4 ? 7 : 1)),
      order_index: (index + 1) * 10,
      dependencies_json: dependency,
      metadata_json: index === 2 ? { wbs_parent_id: 1002 } : {},
    }
  })
  return {
    id: 901,
    name: 'P01 — Flagship Gantt Modernization',
    parent_project_id: null,
    status: 'In Progress',
    priority: 'High',
    owner: 'Proof Operator',
    objective: 'One connected, modern planning surface',
    expected_outcomes: ['World-class Gantt acceptance'],
    start_date: iso(baseOrdinal),
    end_date: iso(baseOrdinal + 241),
    metadata_json: {
      adoption_state: 'Pilot',
      project_schedule_v2: {
        working_days: [1, 2, 3, 4, 5],
        baselines: [{ id: 'base-1', name: 'Approved baseline', captured_at: '2026-09-01T00:00:00Z', tasks: tasks.map((task: any) => ({ id: String(task.id), start_date: task.start_date, end_date: task.end_date })) }],
      },
    },
    tasks,
  }
}

const installIdentity = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('sysgrid-theme', 'nordic-frost-v1')
    localStorage.setItem('SYSGRID_USER_ID', 'proof_operator')
  })
}

const installRoutes = async (page: Page): Promise<State> => {
  let project = structuredClone(projectFixture())
  let putCount = 0
  let projectGetCount = 0
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname
    const json = (value: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) })
    if (request.method() === 'GET' && path.endsWith('/settings/bootstrap')) return json({ VITE_API_BASE_URL: url.origin, DEFAULT_USER_ID: 'proof_operator' })
    if (request.method() === 'GET' && path === '/api/v1/settings/user/profile') return json({ id: 'proof_operator', username: 'proof_operator', full_name: 'Proof Operator', team: 'Operations', team_id: 1, is_admin: true, permissions: { all: 3, projects: 3 } })
    if (request.method() === 'GET' && path === '/api/v1/settings/user/settings') return json({ theme: 'nordic-frost-v1' })
    if (request.method() === 'GET' && path === '/api/v1/settings/operators') return json([{ id: 1, username: 'proof_operator', full_name: 'Proof Operator', team: 'Operations', team_id: 1 }])
    if (request.method() === 'GET' && path === '/api/v1/health') return json({ status: 'ok' })
    if (request.method() === 'GET' && path === '/api/v1/projects') { projectGetCount += 1; return json([project]) }
    if (request.method() === 'PUT' && path === '/api/v1/projects/901') { putCount += 1; project = structuredClone(request.postDataJSON?.() || JSON.parse(request.postData() || '{}')); return json(project) }
    if (request.method() === 'GET') return json([])
    return json({})
  })
  return { getProject: () => project, getPutCount: () => putCount, getProjectGetCount: () => projectGetCount, resetWrites: () => { putCount = 0 } }
}

const collectFailures = (page: Page) => {
  const failures: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console:${message.text()}`) })
  page.on('pageerror', (error) => failures.push(`pageerror:${error.message}`))
  page.on('requestfailed', (request) => failures.push(`requestfailed:${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`))
  return failures
}

const center = async (locator: Locator) => {
  const box = await locator.boundingBox(); expect(box).not.toBeNull()
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
}
const expectMinTarget = async (locator: Locator, label = 'control') => {
  const box = await locator.boundingBox(); expect(box).not.toBeNull()
  const style = await locator.evaluate((element) => { const node = element as HTMLElement; const computed = getComputedStyle(node); return { tag: node.tagName, minHeight: computed.minHeight, height: computed.height, transform: computed.transform, zoom: (computed as any).zoom || '1' } })
  expect(box!.width, `${label} width ${JSON.stringify(style)}`).toBeGreaterThanOrEqual(40); expect(box!.height, `${label} height ${JSON.stringify(style)}`).toBeGreaterThanOrEqual(40)
}
const dependencyIds = (task: any) => (task?.dependencies_json || []).map((dep: any) => String(dep?.id ?? dep?.task_id ?? dep))

const openTimeline = async (page: Page) => {
  await page.goto('/projects?id=901&view=timeline')
  const gantt = page.locator('[data-project-modern-gantt="true"]')
  await expect(gantt).toBeVisible()
  await expect(gantt).toHaveCount(1)
  return gantt
}

test('OUT-40 Slice H P10 Gantt is bounded, aligned and connector-anchored @out40-slice-h-rehearsal', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const failures = collectFailures(page); await installIdentity(page); await installRoutes(page); const gantt = await openTimeline(page)

  const rows = gantt.locator('[data-project-timeline-row="true"]')
  const bars = gantt.locator('[data-project-timeline-bar="true"]')
  const connectors = gantt.locator('[data-project-timeline-dependency-connector="true"]')
  const gridNodes = gantt.locator('[data-project-timeline-tick="true"], [data-project-timeline-grid="true"]')
  expect(await rows.count()).toBeLessThanOrEqual(40)
  expect(await bars.count()).toBeLessThanOrEqual(40)
  expect(await connectors.count()).toBeLessThanOrEqual(80)
  expect(await gridNodes.count()).toBeLessThanOrEqual(64)

  const row = gantt.locator('[data-project-timeline-row="true"][data-task-id="1001"]')
  const bar = gantt.locator('[data-project-semantic-id="task-bar-1001"]')
  const rc = await center(row); const bc = await center(bar)
  expect(Math.abs(rc.y - bc.y)).toBeLessThanOrEqual(1)

  await expect(gantt.locator('[data-project-semantic-id="dependency-1001:1002:FS:0"]')).toBeVisible()
  const sourceEndpoint = gantt.locator('[data-project-connector-endpoint="source"][data-project-relation-key="1001:1002:FS:0"]')
  const targetEndpoint = gantt.locator('[data-project-connector-endpoint="target"][data-project-relation-key="1001:1002:FS:0"]')
  const sourcePort = gantt.locator('[data-project-timeline-row="true"][data-task-id="1001"] [data-project-dependency-port="true"][data-edge="finish"]')
  const targetPort = gantt.locator('[data-project-timeline-row="true"][data-task-id="1002"] [data-project-dependency-port="true"][data-edge="start"]')
  for (const [endpoint, port] of [[sourceEndpoint, sourcePort], [targetEndpoint, targetPort]] as const) {
    const ec = await center(endpoint); const pc = await center(port)
    expect(Math.hypot(ec.x - pc.x, ec.y - pc.y)).toBeLessThanOrEqual(2)
  }
  expect(failures).toEqual([])
})

test('OUT-40 Slice H keyboard dependency add/remove is explicit, canonical and focus-stable @out40-slice-h-acceptance', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const failures = collectFailures(page); await installIdentity(page); const state = await installRoutes(page); const gantt = await openTimeline(page)
  state.resetWrites()

  const source = page.getByRole('button', { name: 'Start dependency from Gantt task 1', exact: true })
  await expectMinTarget(source); await source.focus(); await source.press('Enter')
  await expect(gantt.locator('[data-project-timeline-live-status="true"]')).toHaveText('Dependency source selected: Gantt task 1')
  const target = page.getByRole('button', { name: 'Add dependency from Gantt task 1 to Gantt task 4', exact: true })
  await expectMinTarget(target); await target.press('Enter')
  await expect.poll(() => state.getPutCount()).toBe(1)
  await expect.poll(() => dependencyIds(state.getProject().tasks.find((task: any) => task.id === 1004))).toContain('1001')
  await expect(gantt.locator('[data-project-timeline-live-status="true"]')).toHaveText('Dependency added: Gantt task 1 → Gantt task 4')
  await expect(gantt.locator('[data-project-timeline-row="true"][data-task-id="1004"] button[data-project-timeline-dependency-keyboard="true"]')).toBeFocused()

  const connector = gantt.locator('[data-project-timeline-dependency-connector="true"][data-source-task-id="1001"][data-target-task-id="1004"]')
  await expect(connector).toBeVisible(); await connector.focus(); await connector.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Dependency details', exact: true })
  await expect(dialog).toBeVisible()
  const remove = dialog.getByRole('button', { name: 'Remove dependency', exact: true })
  await expectMinTarget(remove); await remove.focus(); await remove.press('Enter')
  await expect.poll(() => state.getPutCount()).toBe(2)
  await expect.poll(() => dependencyIds(state.getProject().tasks.find((task: any) => task.id === 1004))).not.toContain('1001')
  await expect(gantt.locator('[data-project-timeline-live-status="true"]')).toHaveText('Dependency removed: Gantt task 1 → Gantt task 4')
  await expect(gantt.locator('[data-project-semantic-id="dependency-source-1004"]')).toBeFocused()
  expect(failures).toEqual([])
})

test('OUT-40 Slice H scroll zoom filter collapse are mutation-free and stay bounded @out40-slice-h-acceptance', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const failures = collectFailures(page); await installIdentity(page); const state = await installRoutes(page); const gantt = await openTimeline(page)
  const initialGets = state.getProjectGetCount(); state.resetWrites()
  const scrollport = gantt.locator('[data-project-timeline-scrollport="true"]')
  for (let cycle = 0; cycle < 20; cycle += 1) {
    const elapsed = await gantt.evaluate(async (root, index) => {
      const scroll = root.querySelector<HTMLElement>('[data-project-timeline-scrollport="true"]')!
      scroll.scrollTop = (index % 6) * 620
      scroll.scrollLeft = (index % 5) * 420
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }))
      const value = index % 2 === 0 ? 'month' : 'week'
      const select = root.querySelector<HTMLSelectElement>('select[aria-label="Timeline zoom"]')!
      const started = performance.now(); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      return performance.now() - started
    }, cycle)
    expect(elapsed).toBeLessThanOrEqual(250)
  }
  await gantt.getByRole('button', { name: 'Filters', exact: true }).click()
  await page.getByLabel('Find timeline tasks or owners').fill('Gantt task 2')
  await page.getByLabel('Find timeline tasks or owners').fill('')
  const collapse = gantt.getByRole('button', { name: 'Collapse Gantt task 2', exact: true })
  await collapse.click(); await gantt.getByRole('button', { name: 'Expand Gantt task 2', exact: true }).click()
  await expect.poll(() => state.getPutCount()).toBe(0)
  expect(state.getProjectGetCount()).toBe(initialGets)
  expect(await gantt.locator('[data-project-timeline-row="true"]').count()).toBeLessThanOrEqual(40)
  expect(await gantt.locator('[data-project-timeline-dependency-connector="true"]').count()).toBeLessThanOrEqual(80)
  expect(await gantt.locator('[data-project-timeline-tick="true"], [data-project-timeline-grid="true"]').count()).toBeLessThanOrEqual(64)
  expect(failures).toEqual([])
})

test('OUT-40 Slice H bar move and resize each commit one Project PUT @out40-slice-h-acceptance', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const failures = collectFailures(page); await installIdentity(page); const state = await installRoutes(page); const gantt = await openTimeline(page)
  state.resetWrites()
  const bar = gantt.locator('[data-project-semantic-id="task-bar-1001"]')
  const box = await bar.boundingBox(); expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2); await page.mouse.down(); await page.mouse.move(box!.x + box!.width / 2 + 28, box!.y + box!.height / 2, { steps: 3 }); await page.mouse.up()
  await expect.poll(() => state.getPutCount()).toBe(1)
  const movedStart = state.getProject().tasks.find((task: any) => task.id === 1001).start_date
  expect(movedStart).not.toBe(iso(baseOrdinal))

  await page.goto('/projects?id=901&view=timeline'); await expect(gantt).toBeVisible(); state.resetWrites()
  const resize = gantt.locator('[data-project-semantic-id="resize-end-1005"]')
  await expectMinTarget(resize)
  const rb = await resize.boundingBox(); expect(rb).not.toBeNull()
  await page.mouse.move(rb!.x + rb!.width / 2, rb!.y + rb!.height / 2); await page.mouse.down(); await page.mouse.move(rb!.x + rb!.width / 2 + 28, rb!.y + rb!.height / 2, { steps: 3 }); await page.mouse.up()
  await expect.poll(() => state.getPutCount()).toBe(1)
  expect(failures).toEqual([])
})

test('OUT-40 Slice H narrow Gantt contains page overflow and keeps primary controls >=40px @out40-slice-h-acceptance', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const failures = collectFailures(page); await installIdentity(page); await installRoutes(page); const gantt = await openTimeline(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  const narrowControls: Array<[string, Locator]> = [
    ['Today', gantt.getByRole('button', { name: 'Today', exact: true })],
    ['Fit', gantt.getByRole('button', { name: 'Fit', exact: true })],
    ['Timeline zoom', gantt.getByLabel('Timeline zoom', { exact: true })],
    ['Filters', gantt.getByRole('button', { name: 'Filters', exact: true })],
    ['Dependency start', gantt.getByRole('button', { name: 'Start dependency from Gantt task 1', exact: true })],
  ]
  for (const [label, control] of narrowControls) await expectMinTarget(control, label)
  const scrollport = gantt.locator('[data-project-timeline-scrollport="true"]'); const scrollBox = await scrollport.boundingBox(); expect(scrollBox).not.toBeNull(); expect(scrollBox!.x).toBeGreaterThanOrEqual(0); expect(scrollBox!.x + scrollBox!.width).toBeLessThanOrEqual(391)
  expect(failures).toEqual([])
})
