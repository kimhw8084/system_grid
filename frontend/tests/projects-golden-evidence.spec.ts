import { test, expect } from '@playwright/test'

test.describe('Projects complete planning and execution evidence', () => {
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
    await expect(page.locator('[data-project-flagship-gantt="true"]')).toBeVisible()
    await expect(page.locator('[data-project-timeline-scroll="true"]')).toBeVisible()

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
    await expect(page.locator('[data-project-flagship-gantt="true"]')).toBeVisible()

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
    await expect(page.locator('[data-project-task-paste="true"]').getByText('2', { exact: true })).toBeVisible()
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

  test('Timeline real-user bar movement updates canonical schedule truth', async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1050 })
    let project: any = {
      id: 701, name: 'Planning Proof', status: 'In Progress', priority: 'High', owner: 'Alice', objective: 'Prove synchronized planning and execution', start_date: '2026-08-28', end_date: '2026-09-20', metadata_json: {},
      tasks: [
        { id: 101, name: 'Prepare chamber', owner: 'Alice', status: 'In Progress', priority: 'High', progress: 25, start_date: '2026-08-28', end_date: '2026-09-01', order_index: 10, dependencies_json: [], metadata_json: {} },
        { id: 102, name: 'Run qualification', owner: 'Bob', status: 'To Do', priority: 'Highest', progress: 0, start_date: '2026-09-02', end_date: '2026-09-05', order_index: 20, dependencies_json: [101], metadata_json: {} },
        { id: 103, name: 'Release milestone', owner: 'Alice', status: 'To Do', priority: 'Medium', progress: 0, start_date: '2026-09-06', end_date: '2026-09-06', order_index: 30, dependencies_json: [102], metadata_json: { milestone: true } },
      ],
    }
    let lastPut: any = null
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([project]) })
      return route.continue()
    })
    await page.route('**/api/v1/projects/701', async (route) => {
      if (route.request().method() === 'PUT') {
        lastPut = JSON.parse(route.request().postData() || '{}'); project = lastPut
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) })
      }
      return route.continue()
    })
    for (const path of ['devices', 'logical-services', 'settings/options']) await page.route(`**/api/v1/${path}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/projects?id=701&view=timeline')
    await expect(page.locator('[data-project-flagship-gantt="true"]')).toBeVisible()
    const row = page.locator('[data-project-timeline-row="true"][data-task-id="101"]')
    const bar = row.locator('[data-project-timeline-bar="true"]')
    await bar.scrollIntoViewIfNeeded()
    await expect(bar).toBeInViewport()
    const box = await bar.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width / 2 + 24, box!.y + box!.height / 2, { steps: 4 })
    await page.mouse.up()

    await expect.poll(() => lastPut?.tasks?.find((task: any) => task.id === 101)?.start_date).toBe('2026-08-30')
    await expect.poll(() => lastPut?.tasks?.find((task: any) => task.id === 101)?.end_date).toBe('2026-09-03')
    await expect(row.locator('[data-project-timeline-bar="true"]')).toBeVisible()
  })

  test('Board real-user drag moves the exact task with canonical PUT truth and visible destination placement', async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1050 })
    let project: any = {
      id: 801, name: 'Board Drag Proof', status: 'In Progress', priority: 'High', owner: 'Alice', metadata_json: {},
      tasks: [
        { id: 301, name: 'Release readiness', owner: 'Alice', status: 'In Progress', priority: 'High', progress: 60, start_date: '2026-08-28', end_date: '2026-08-30', order_index: 10, dependencies_json: [], metadata_json: {} },
      ],
    }
    let lastPut: any = null
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([project]) })
      return route.continue()
    })
    await page.route('**/api/v1/projects/801', async (route) => {
      if (route.request().method() === 'PUT') {
        lastPut = JSON.parse(route.request().postData() || '{}'); project = lastPut
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) })
      }
      return route.continue()
    })
    for (const path of ['devices', 'logical-services', 'settings/options']) await page.route(`**/api/v1/${path}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/projects?id=801&view=board')
    const sourceCard = page.locator('[data-project-board-card="true"][data-task-id="301"]')
    const reviewColumn = page.locator('[data-project-board-column="Review"]')
    await expect(sourceCard).toBeVisible()
    await expect(reviewColumn).toBeVisible()

    await sourceCard.dragTo(reviewColumn)

    await expect.poll(() => lastPut?.tasks?.find((task: any) => task.id === 301)?.status).toBe('Review')
    const destinationCard = reviewColumn.locator('[data-project-board-card="true"][data-task-id="301"]')
    await expect(destinationCard).toHaveCount(1)
    await expect(destinationCard).toBeVisible()
  })

  test('My Work and Needs Update stay exact-project/task identity scoped', async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1050 })
    const projects: any[] = [
      {
        id: 701, name: 'Planning Proof', status: 'In Progress', priority: 'High', owner: 'Alice', metadata_json: {},
        tasks: [
          { id: 101, name: 'Prepare chamber', owner: 'Alice', status: 'In Progress', priority: 'High', progress: 25, start_date: '2026-08-28', end_date: '2026-09-01', order_index: 10, dependencies_json: [], metadata_json: {} },
        ],
      },
      {
        id: 702, name: 'Cross Project Work', status: 'In Progress', priority: 'Medium', owner: 'Alice', metadata_json: {},
        tasks: [
          { id: 201, name: 'Resolve blocker', owner: 'Alice', status: 'Blocked', priority: 'High', progress: 30, start_date: '2026-08-25', end_date: '2026-08-28', order_index: 10, dependencies_json: [], metadata_json: {} },
        ],
      },
    ]
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(projects) })
      return route.continue()
    })
    for (const path of ['devices', 'logical-services', 'settings/options']) await page.route(`**/api/v1/${path}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/projects?id=701&view=board')
    await page.getByRole('button', { name: 'My Work', exact: true }).click()
    await expect(page.locator('[data-project-my-work-execution="true"]')).toBeVisible()
    await page.getByLabel('My Work owner').fill('Alice')

    const planningCard = page.locator('[data-project-my-work-card="true"][data-project-id="701"][data-task-id="101"]')
    const blockedCard = page.locator('[data-project-my-work-card="true"][data-project-id="702"][data-task-id="201"]')
    await expect(planningCard).toBeVisible()
    await expect(blockedCard).toBeVisible()

    await page.getByRole('button', { name: /Needs Update/ }).click()
    await expect(page.locator('[data-project-my-work-card="true"][data-project-id="702"][data-task-id="201"]')).toBeVisible()
    await expect(page.locator('[data-project-my-work-card="true"][data-project-id="702"][data-task-id="201"]').locator('small')).toContainText('Blocked')
  })

  test('Board drag event chain @diagnostic', async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1050 })
    let project: any = {
      id: 901, name: 'Board Diagnostic', status: 'In Progress', priority: 'High', owner: 'Alice', metadata_json: {},
      tasks: [
        { id: 401, name: 'Diagnostic task', owner: 'Alice', status: 'In Progress', priority: 'High', progress: 50, start_date: '2026-08-28', end_date: '2026-08-30', order_index: 10, dependencies_json: [], metadata_json: {} },
      ],
    }
    let lastPut: any = null
    await page.route('**/api/v1/projects', async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([project]) })
      return route.continue()
    })
    await page.route('**/api/v1/projects/901', async (route) => {
      if (route.request().method() === 'PUT') {
        lastPut = JSON.parse(route.request().postData() || '{}'); project = lastPut
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) })
      }
      return route.continue()
    })
    for (const path of ['devices', 'logical-services', 'settings/options']) await page.route(`**/api/v1/${path}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/projects?id=901&view=board')
    await page.evaluate(() => {
      const state: any = { input_event: [], resolved_target: [], handler_invocation: false }
      ;(window as any).__sysgridBoardDiagnostic = state
      for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
        document.addEventListener(type, (event: any) => {
          const target = event.target as HTMLElement | null
          const column = target?.closest?.('[data-project-board-column]') as HTMLElement | null
          state.input_event.push({ type, x: event.clientX, y: event.clientY })
          state.resolved_target.push({
            type,
            taskId: target?.closest?.('[data-project-board-card]')?.getAttribute?.('data-task-id') || null,
            column: column?.getAttribute?.('data-project-board-column') || null,
          })
        }, true)
      }
      const card = document.querySelector('[data-project-board-card="true"][data-task-id="401"]')
      if (card) new MutationObserver(() => {
        if ((card as HTMLElement).className.includes('cursor-grabbing')) state.handler_invocation = true
      }).observe(card, { attributes: true, attributeFilter: ['class'] })
    })

    const sourceCard = page.locator('[data-project-board-card="true"][data-task-id="401"]')
    const reviewColumn = page.locator('[data-project-board-column="Review"]')
    await sourceCard.dragTo(reviewColumn)

    const destinationCard = reviewColumn.locator('[data-project-board-card="true"][data-task-id="401"]')
    const rendered = await destinationCard.isVisible()
    const browserChain = await page.evaluate(() => (window as any).__sysgridBoardDiagnostic)
    const chain = {
      input_event: browserChain.input_event,
      resolved_target: browserChain.resolved_target,
      handler_invocation: browserChain.handler_invocation,
      canonical_mutation: lastPut?.tasks?.find((task: any) => task.id === 401)?.status || null,
      request_body: lastPut,
      optimistic_cache: rendered ? 'rendered destination reflects authoritative mutation' : 'destination not rendered',
      rendered_result: { destination: 'Review', taskId: 401, visible: rendered },
    }
    console.log(`SYSGRID_BOARD_DIAGNOSTIC=${JSON.stringify(chain)}`)
    expect(chain.canonical_mutation).toBe('Review')
    expect(chain.rendered_result.visible).toBe(true)
  })
})
