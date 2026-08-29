import { test, expect, Page } from '@playwright/test'

const supportProjectApis = async (page: Page, initialProject: any, operators: any[] = []) => {
  let project = structuredClone(initialProject)
  let lastPut: any = null
  await page.route('**/api/v1/projects', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([project]) })
    return route.continue()
  })
  await page.route(`**/api/v1/projects/${initialProject.id}`, async (route) => {
    if (route.request().method() === 'PUT') {
      lastPut = JSON.parse(route.request().postData() || '{}')
      project = structuredClone(lastPut)
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) })
    }
    return route.continue()
  })
  for (const path of ['devices', 'logical-services', 'settings/options']) {
    await page.route(`**/api/v1/${path}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  }
  await page.route('**/api/v1/settings/operators', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(operators) }))
  return { getProject: () => project, getLastPut: () => lastPut }
}

const baseProject = () => ({
  id: 1001,
  name: 'Collaboration Foundation Proof',
  status: 'In Progress',
  priority: 'High',
  owner: 'Alice',
  objective: 'Prove collaboration and report history on canonical Project truth',
  start_date: '2026-08-28',
  end_date: '2026-09-20',
  metadata_json: {},
  tasks: [
    { id: 101, name: 'Review release plan', owner: 'Alice', status: 'In Progress', priority: 'High', progress: 40, start_date: '2026-08-28', end_date: '2026-09-02', order_index: 10, dependencies_json: [], metadata_json: {} },
    { id: 102, name: 'Approve release', owner: 'Bob', status: 'To Do', priority: 'Medium', progress: 0, start_date: '2026-09-03', end_date: '2026-09-05', order_index: 20, dependencies_json: [101], metadata_json: {} },
  ],
})

test.describe('Projects Iteration 4A collaboration and reporting foundation', () => {
  test('Iteration 4A task comment authoring persists exact comment and @mentions on canonical task truth', async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1050 })
    const state = await supportProjectApis(page, baseProject())

    await page.goto('/projects?id=1001&view=tasks&task=101')
    await expect(page.locator('[data-project-task-drawer="true"]')).toBeVisible()
    await page.getByLabel('Add task comment').fill('Coordinate with @Alice and @bob before release')
    await page.getByRole('button', { name: 'Post comment', exact: true }).click()

    await expect.poll(() => state.getLastPut()?.tasks?.find((task: any) => task.id === 101)?.metadata_json?.comments?.at(-1)?.content).toBe('Coordinate with @Alice and @bob before release')
    await expect.poll(() => state.getLastPut()?.tasks?.find((task: any) => task.id === 101)?.metadata_json?.comments?.at(-1)?.mentions).toEqual(['@Alice', '@bob'])
    await expect(page.getByText('Coordinate with @Alice and @bob before release', { exact: true })).toBeVisible()
    await expect(page.getByText('@Alice', { exact: true })).toBeVisible()
    await expect(page.getByText('@bob', { exact: true })).toBeVisible()
  })

  test('Iteration 4A project material authoring persists one exact link through canonical Project PUT', async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1050 })
    const state = await supportProjectApis(page, baseProject())

    await page.goto('/projects?id=1001&view=files')
    await expect(page.locator('[data-project-material-authoring="true"]')).toBeVisible()
    await page.getByLabel('Project material title').fill('Release decision log')
    await page.getByLabel('Project material URL').fill('https://example.test/release/decision')
    await page.getByRole('button', { name: 'Add material', exact: true }).click()

    await expect.poll(() => state.getLastPut()?.metadata_json?.links?.at(-1)?.title).toBe('Release decision log')
    await expect.poll(() => state.getLastPut()?.metadata_json?.links?.at(-1)?.url).toBe('https://example.test/release/decision')
    await expect(page.getByText('Release decision log', { exact: true })).toBeVisible()
    await expect(page.getByText('https://example.test/release/decision', { exact: true })).toBeVisible()
  })

  test('Iteration 4A report capture creates immutable history and restores the exact snapshot by deep link', async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1050 })
    const state = await supportProjectApis(page, baseProject())

    await page.goto('/projects?id=1001&view=reports')
    await expect(page.locator('[data-project-report-history="true"]')).toBeVisible()
    await page.getByRole('button', { name: 'Capture snapshot', exact: true }).click()

    await expect.poll(() => state.getLastPut()?.metadata_json?.project_reporting_v1?.snapshots?.length).toBe(1)
    const snapshotId = state.getLastPut().metadata_json.project_reporting_v1.snapshots[0].id
    await expect.poll(() => new URL(page.url()).searchParams.get('report')).toBe(snapshotId)
    const snapshotRow = page.locator(`[data-project-report-snapshot="${snapshotId}"]`)
    await expect(snapshotRow).toBeVisible()
    await expect(page.getByText(/Report Snapshot ·/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy share link', exact: true })).toBeEnabled()

    await page.goto(`/projects?id=1001&view=reports&report=${encodeURIComponent(snapshotId)}`)
    await expect(page.locator(`[data-project-report-snapshot="${snapshotId}"]`)).toBeVisible()
    await expect(page.getByText(/Report Snapshot ·/)).toBeVisible()
    expect(state.getProject().metadata_json.project_reporting_v1.snapshots[0].id).toBe(snapshotId)
  })
})


test.describe('Projects Iteration 4B authoritative mention interaction', () => {
  const operators = [
    { id: 11, username: 'alice', name: 'Alice Nguyen', email: 'alice@example.test', is_active: true },
    { id: 12, username: 'alicia', name: 'Alicia Park', email: 'apark@example.test', is_active: true },
    { id: 13, username: 'bob', name: 'Bob Stone', email: 'bob@example.test', is_active: true },
  ]

  test('Iteration 4B mention click selection persists the exact canonical operator username', async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1050 })
    const state = await supportProjectApis(page, baseProject(), operators)

    await page.goto('/projects?id=1001&view=tasks&task=101')
    const composer = page.getByLabel('Add task comment')
    await composer.fill('Coordinate with @ali')
    const suggestions = page.getByRole('listbox', { name: 'Mention suggestions' })
    await expect(suggestions).toBeVisible()
    await expect(page.getByRole('option', { name: 'Mention @alice · Alice Nguyen', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Mention @alicia · Alicia Park', exact: true })).toBeVisible()
    await page.getByRole('option', { name: 'Mention @alice · Alice Nguyen', exact: true }).click()
    await expect(composer).toHaveValue('Coordinate with @alice ')
    await composer.fill('Coordinate with @alice before release')
    await page.getByRole('button', { name: 'Post comment', exact: true }).click()

    await expect.poll(() => state.getLastPut()?.tasks?.find((task: any) => task.id === 101)?.metadata_json?.comments?.at(-1)?.content).toBe('Coordinate with @alice before release')
    await expect.poll(() => state.getLastPut()?.tasks?.find((task: any) => task.id === 101)?.metadata_json?.comments?.at(-1)?.mentions).toEqual(['@alice'])
  })

  test('Iteration 4B mention keyboard selection inserts one canonical handle before persistence', async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1050 })
    const state = await supportProjectApis(page, baseProject(), operators)

    await page.goto('/projects?id=1001&view=tasks&task=101')
    const composer = page.getByLabel('Add task comment')
    await composer.fill('Escalate to @bo')
    await expect(page.getByRole('option', { name: 'Mention @bob · Bob Stone', exact: true })).toBeVisible()
    await composer.press('Enter')
    await expect(composer).toHaveValue('Escalate to @bob ')
    expect(state.getLastPut()).toBeNull()
    await composer.fill('Escalate to @bob today')
    await page.getByRole('button', { name: 'Post comment', exact: true }).click()

    await expect.poll(() => state.getLastPut()?.tasks?.find((task: any) => task.id === 101)?.metadata_json?.comments?.at(-1)?.mentions).toEqual(['@bob'])
    await expect(page.getByText('Escalate to @bob today', { exact: true })).toBeVisible()
  })
})
