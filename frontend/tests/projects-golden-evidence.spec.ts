import { test, expect } from '@playwright/test'

test.describe('Projects complete task workbench evidence', () => {
  test('unified project workbench exposes eight direct project surfaces, preserves portfolio intelligence, and leaves Monitoring unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 })

    await page.goto('/projects?view=overview')
    const shell = page.locator('[data-golden-workspace-shell="true"][data-golden-archetype="hybrid"]')
    await expect(shell).toBeVisible()
    await expect(page.locator('[data-project-unified-shell="true"]')).toBeVisible()
    await expect(page.locator('[data-project-workbench-rail="true"]')).toBeVisible()
    await expect(page.locator('[data-project-workbench-header="true"]')).toBeVisible()
    await expect(page.locator('[data-project-primary-nav="true"]')).toBeVisible()
    await expect(page.locator('[data-project-overview="true"]')).toBeVisible()

    await page.getByRole('button', { name: 'Tasks', exact: true }).click()
    await expect(page.locator('[data-project-tasks-foundation="true"]')).toBeVisible()

    await page.getByRole('button', { name: 'Timeline', exact: true }).first().click()
    await expect(page.locator('[data-project-direct-surface="gantt"]')).toBeVisible()
    await expect(page.locator('[data-project-embedded-rail="true"]')).toBeHidden()
    await expect(page.locator('[data-project-embedded-hud="true"]')).toBeHidden()
    await expect(page.locator('[data-project-embedded-tabs="true"]')).toBeHidden()

    await page.getByRole('button', { name: 'Board', exact: true }).click()
    await expect(page.locator('[data-project-execution-board="true"]')).toBeVisible()

    await page.getByRole('button', { name: 'Files', exact: true }).click()
    await expect(page.locator('[data-project-files-foundation="true"]')).toBeVisible()

    await page.getByRole('button', { name: 'Updates', exact: true }).first().click()
    await expect(page.locator('[data-project-direct-surface="activity"]')).toBeVisible()

    await page.getByRole('button', { name: 'Reports', exact: true }).click()
    await expect(page.locator('[data-project-report-preview="true"]')).toBeVisible()
    await expect(page.getByText('Live Project Report', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Insights', exact: true }).click()
    await expect(page.locator('[data-project-insights-hub="true"]')).toBeVisible()
    await expect(page.locator('[data-project-review-mode="true"]')).toBeVisible()
    await page.getByRole('button', { name: 'Governance & Forecast', exact: true }).click()
    await expect(page.locator('[data-project-governance="true"]')).toBeVisible()
    await expect(page.locator('[data-project-forecast="true"]')).toBeVisible()

    await page.goto('/projects?view=roadmap')
    await expect(page.locator('[data-project-portfolio-hub="true"]')).toBeVisible()
    await expect(page.locator('[data-project-roadmap="true"]')).toBeVisible()

    await page.goto('/projects?view=owners')
    await expect(page.locator('[data-project-owner-cockpit="true"]')).toBeVisible()

    await page.goto('/projects?view=workspace')
    await expect(page.locator('[data-project-direct-surface="gantt"]')).toBeVisible()

    await page.setViewportSize({ width: 820, height: 1180 })
    await page.goto('/projects?view=overview')
    await expect(shell).toBeVisible()
    await expect(page.locator('[data-project-unified-shell="true"]')).toBeVisible()
    await expect(page.locator('[data-project-workbench-rail="true"]')).toBeHidden()
    await expect(page.locator('[data-project-overview="true"]')).toBeVisible()

    await page.goto('/monitoring')
    await expect(page.locator('[data-golden-workspace-shell="true"]')).toBeVisible()
    await expect(page.locator('[data-golden-archetype="table"]')).toBeVisible()
  })

  test('task workbench supports inline edit, WBS indent, bulk selection, paste, editable drawer and undo on candidate UI', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 })
    let project: any = {
      id: 501, name: 'Workbench Proof', status: 'In Progress', priority: 'High', owner: 'Alice', objective: 'Prove fast member authoring', start_date: '2026-08-28', end_date: '2026-09-30', metadata_json: {},
      tasks: [
        { id: 101, name: 'Prepare chamber', owner: 'Alice', status: 'In Progress', priority: 'High', progress: 25, start_date: '2026-08-28', end_date: '2026-09-01', order_index: 10, dependencies_json: [], metadata_json: {} },
        { id: 102, name: 'Run qualification', owner: 'Bob', status: 'To Do', priority: 'Highest', progress: 0, start_date: '2026-09-02', end_date: '2026-09-05', order_index: 20, dependencies_json: [101], metadata_json: {} },
        { id: 103, name: 'Release milestone', owner: 'Carol', status: 'To Do', priority: 'Medium', progress: 0, start_date: '2026-09-06', end_date: '2026-09-06', order_index: 30, dependencies_json: [102], metadata_json: { is_milestone: true } },
      ],
    }
    let lastPut: any = null
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([project]) })
      return route.continue()
    })
    await page.route('**/api/v1/projects/501', async (route) => {
      if (route.request().method() === 'PUT') {
        lastPut = JSON.parse(route.request().postData() || '{}'); project = lastPut
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) })
      }
      return route.continue()
    })
    for (const path of ['devices', 'logical-services', 'settings/options']) await page.route(`**/api/v1/${path}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/projects?id=501&view=tasks')
    await expect(page.locator('[data-project-task-workbench="true"]')).toBeVisible()
    await expect(page.locator('[data-project-task-row="true"]')).toHaveCount(3)
    await expect(page.getByLabel('Quick add task')).toBeVisible()

    const owner = page.getByLabel('Owner 101')
    await owner.fill('Dana')
    await owner.press('Tab')
    await expect.poll(() => lastPut?.tasks?.find((task: any) => task.id === 101)?.owner).toBe('Dana')

    await page.getByLabel('Indent Run qualification').click()
    await expect.poll(() => lastPut?.tasks?.find((task: any) => task.id === 102)?.metadata_json?.wbs_parent_id).toBe(101)
    await expect(page.locator('[data-task-id="102"]')).toHaveAttribute('data-task-depth', '1')

    await page.getByLabel('Select Prepare chamber').check()
    await page.getByLabel('Select Run qualification').check()
    await expect(page.locator('[data-project-task-bulkbar="true"]')).toBeVisible()
    await page.locator('[data-project-task-bulkbar="true"]').getByText('2 selected', { exact: true }).waitFor()

    await page.getByRole('button', { name: 'Paste', exact: true }).click()
    await expect(page.locator('[data-project-task-paste="true"]')).toBeVisible()
    await page.locator('[data-project-task-paste="true"] textarea').fill('Task\tOwner\tStatus\tPriority\tStart\tFinish\tProgress\nThermal test\tDana\tTo Do\tHigh\t2026-09-07\t2026-09-08\t0\nDocument result\tBob\tTo Do\tMedium\t2026-09-09\t2026-09-10\t0')
    await expect(page.getByText('2', { exact: true }).last()).toBeVisible()
    await page.getByRole('button', { name: 'Add 2 tasks', exact: true }).click()
    await expect(page.locator('[data-project-task-row="true"]')).toHaveCount(5)

    await page.locator('[data-task-id="101"]').evaluate((element: HTMLElement) => element.click())
    await expect(page.locator('[data-project-task-drawer-editable="true"]')).toBeVisible()
    await expect(page.locator('[data-project-task-checklist="true"]')).toBeVisible()
    await expect(page.locator('[data-project-task-dependencies="true"]')).toBeVisible()
    const drawerName = page.getByLabel('Drawer task name 101')
    await drawerName.fill('Prepare chamber safely')
    await drawerName.press('Tab')
    await expect.poll(() => lastPut?.tasks?.find((task: any) => task.id === 101)?.name).toBe('Prepare chamber safely')
    await page.getByRole('button', { name: 'Undo task change', exact: true }).click()
    await expect.poll(() => lastPut?.tasks?.find((task: any) => task.id === 101)?.name).toBe('Prepare chamber')
  })

})
