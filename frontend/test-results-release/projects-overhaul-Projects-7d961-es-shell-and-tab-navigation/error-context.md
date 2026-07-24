# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: projects-overhaul.spec.ts >> Projects Overhaul 2.0 >> verifies shell and tab navigation
- Location: tests/projects-overhaul.spec.ts:9:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Activity/i }).first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('button', { name: /Activity/i }).first()

```

```yaml
- complementary:
  - link "SYSGRID":
    - /url: /
    - img
    - text: SYSGRID
  - button:
    - img
  - navigation:
    - button "OPERATIONS":
      - text: OPERATIONS
      - img
    - link "Home":
      - /url: /
      - img
      - text: Home
    - link "Projects":
      - /url: /projects
      - img
      - text: Projects
    - link "Monitoring":
      - /url: /monitoring
      - img
      - text: Monitoring
    - button "INFRASTRUCTURE":
      - text: INFRASTRUCTURE
      - img
    - link "Assets":
      - /url: /asset
      - img
      - text: Assets
    - link "Racks":
      - /url: /racks
      - img
      - text: Racks
    - link "Services":
      - /url: /services
      - img
      - text: Services
    - link "External":
      - /url: /external
      - img
      - text: External
    - button "CONNECTIVITY":
      - text: CONNECTIVITY
      - img
    - link "Network":
      - /url: /network
      - img
      - text: Network
    - link "Architecture":
      - /url: /architecture
      - img
      - text: Architecture
    - button "ANALYSIS":
      - text: ANALYSIS
      - img
    - link "FAR":
      - /url: /far
      - img
      - text: FAR
    - link "Research":
      - /url: /research
      - img
      - text: Research
    - button "RESOURCES":
      - text: RESOURCES
      - img
    - link "Vendors":
      - /url: /vendors
      - img
      - text: Vendors
    - link "Knowledge":
      - /url: /knowledge
      - img
      - text: Knowledge
  - 'button "Haewon Kim ID: 1"':
    - img
    - text: "Haewon Kim ID: 1"
  - button "Dark"
  - button "Light"
  - paragraph: 1.2.6
- main:
  - button "Patch Notes"
  - button "Search assets, projects, or incidents... ⌘ K":
    - img
    - text: Search assets, projects, or incidents... ⌘ K
  - button "Active Database Local Demo":
    - img
    - text: Active Database Local Demo
    - img
  - text: System Status Operational 3ms
  - button "Notifications":
    - img
  - button:
    - img
  - link:
    - /url: /settings
    - img
  - img
  - heading "AURORA-1784874692549" [level=1]
  - button "Share direct link":
    - img
  - text: • Planning
  - button "Unlock Editor":
    - img
    - text: Unlock Editor
  - button "Decommission Project":
    - img
  - button:
    - img
  - button "Workbench":
    - img
    - text: Workbench
  - button "Precision Gantt":
    - img
    - text: Precision Gantt
  - button "Stream":
    - img
    - text: Stream
  - button "Adoption":
    - img
    - text: Adoption
  - button "Project Configuration":
    - img
  - button "Full Screen View":
    - img
  - text: Operational
  - button "New Vector":
    - img
    - text: New Vector
  - button:
    - img
  - button "Tactical Huddle":
    - img
    - text: Tactical Huddle
  - img
  - textbox "Filter vectors..."
  - combobox:
    - option "ALL STATUS" [selected]
    - option "Not Started"
    - option "Planning"
    - option "In Progress"
    - option "Paused"
    - option "Blocked"
    - option "Cancelled"
    - option "Completed"
  - combobox:
    - option "ALL PRIORITY" [selected]
    - option "Low"
    - option "Medium"
    - option "High"
    - option "Highest"
  - list:
    - listitem:
      - button "AURORA-1784874692549 Planning N/A • Medium Unassigned Jul 24":
        - heading "AURORA-1784874692549" [level=3]
        - text: Planning N/A • Medium Unassigned
        - img
        - text: Jul 24
        - img
    - listitem:
      - button "PW-PROJ-DEEPLINK-1784857130174 Planning Strategic • High Unassigned Jul 23":
        - heading "PW-PROJ-DEEPLINK-1784857130174" [level=3]
        - text: Planning Strategic • High Unassigned
        - img
        - text: Jul 23
        - img
    - listitem:
      - button "PW-CHAOS-PROJ-1784855613289 Planning Strategic • Medium Unassigned Jul 23":
        - heading "PW-CHAOS-PROJ-1784855613289" [level=3]
        - text: Planning Strategic • Medium Unassigned
        - img
        - text: Jul 23
        - img
    - listitem:
      - button "PW-PROJ-A-1784855483255-7rdrjr Planning Strategic • Medium Unassigned Jul 23":
        - heading "PW-PROJ-A-1784855483255-7rdrjr" [level=3]
        - text: Planning Strategic • Medium Unassigned
        - img
        - text: Jul 23
        - img
    - listitem:
      - button "PW-PROJ-B-1784855483255-7rdrjr Planning Strategic • High Unassigned Jul 23":
        - heading "PW-PROJ-B-1784855483255-7rdrjr" [level=3]
        - text: Planning Strategic • High Unassigned
        - img
        - text: Jul 23
        - img
    - listitem:
      - button "AURORA-1784855449688 Planning N/A • Medium Unassigned Jul 23":
        - heading "AURORA-1784855449688" [level=3]
        - text: Planning N/A • Medium Unassigned
        - img
        - text: Jul 23
        - img
    - listitem:
      - 'button "Mass Initiative 1: Migration In Progress Maintenance • Low haewon.kim Jul 22"':
        - 'heading "Mass Initiative 1: Migration" [level=3]'
        - text: In Progress Maintenance • Low haewon.kim
        - img
        - text: Jul 22
        - img
    - listitem:
      - 'button "Mass Initiative 2: Upgrade In Progress Maintenance • Medium haewon.kim Jul 22"':
        - 'heading "Mass Initiative 2: Upgrade" [level=3]'
        - text: In Progress Maintenance • Medium haewon.kim
        - img
        - text: Jul 22
        - img
    - listitem:
      - 'button "Mass Initiative 3: Migration In Progress Strategic • Low haewon.kim Jul 22"':
        - 'heading "Mass Initiative 3: Migration" [level=3]'
        - text: In Progress Strategic • Low haewon.kim
        - img
        - text: Jul 22
        - img
    - listitem:
      - 'button "Mass Initiative 4: Migration In Progress Strategic • High haewon.kim Jul 22"':
        - 'heading "Mass Initiative 4: Migration" [level=3]'
        - text: In Progress Strategic • High haewon.kim
        - img
        - text: Jul 22
        - img
    - listitem:
      - 'button "Mass Initiative 5: Expansion In Progress Strategic • Low haewon.kim Jul 22"':
        - 'heading "Mass Initiative 5: Expansion" [level=3]'
        - text: In Progress Strategic • Low haewon.kim
        - img
        - text: Jul 22
        - img
  - button "Performance Graph":
    - img
  - button "DAYS"
  - button "WEEKS"
  - button "MONTHS"
  - button "Standard Mode"
  - button:
    - img
  - button:
    - img
  - text: 20.0PX
  - button "New Task":
    - img
    - text: New Task
  - text: Execution Vectors
  - list
  - text: Jul 1 Jul 2 Jul 3 Jul 4 Jul 5 Jul 6 Jul 7 Jul 8 Jul 9 Jul 10 Jul 11 Jul 12 Jul 13 Jul 14 Jul 15 Jul 16 Jul 17 Jul 18 Jul 19 Jul 20 Jul 21 Jul 22 Jul 23 Jul 24 Jul 25 Jul 26 Jul 27 Jul 28 Jul 29 Jul 30 Jul 31 Aug 1 Aug 2 Aug 3 Aug 4 Aug 5 Aug 6 Aug 7 Aug 8 Aug 9 Aug 10 Aug 11 Aug 12 Aug 13 Aug 14 Aug 15 Aug 16 Aug 17 Aug 18 Aug 19 Aug 20 Aug 21 Aug 22 Aug 23 Aug 24 Aug 25 Aug 26 Aug 27 Aug 28 Aug 29 Aug 30 Aug 31 Sep 1 Sep 2 Sep 3 Sep 4 Sep 5 Sep 6 Sep 7 Sep 8 Sep 9 Sep 10 Sep 11 Sep 12 Sep 13 Sep 14 Sep 15 Sep 16 Sep 17 Sep 18 Sep 19 Sep 20 Sep 21 Sep 22 Sep 23 Sep 24 Sep 25 Sep 26 Sep 27 Sep 28 Sep 29 Sep 30 Oct 1 Oct 2 Oct 3 Oct 4 Oct 5 Oct 6 Oct 7 Oct 8 Oct 9 Oct 10 Oct 11 Oct 12 Oct 13 Oct 14 Oct 15 Oct 16 Oct 17 Oct 18 Oct 19 Oct 20 Oct 21 Oct 22 Oct 23 Oct 24 Oct 25 Oct 26 Oct 27 Oct 28 Oct 29 Oct 30 Oct 31 TODAY
  - img
  - heading "ROI Metrics" [level=4]:
    - img
    - text: ROI Metrics
  - button:
    - img
  - img
  - paragraph: No ROI streams selected
  - img
  - text: "YOUR TIME (America/Chicago): 01:31:47"
  - img
  - text: "SOUTH KOREA (KST): 15:31:47 VERSION 1.2.6"
```

# Test source

```ts
  1  | import { clickResilientButton } from './helpers/sysgrid';
  2  | import { expect } from '@playwright/test';
  3  | import { test } from './helpers/sysgrid-test';
  4  | import { createProject, resetBrowserState } from './helpers/sysgrid'
  5  | 
  6  | test.describe('Projects Overhaul 2.0', () => {
  7  |   test.use({ viewport: { width: 1920, height: 1080 } })
  8  | 
  9  |   test('verifies shell and tab navigation', async ({ page, sysApi: request }) => {
  10 |     await resetBrowserState(page)
  11 |     const stamp = Date.now()
  12 |     const projectName = `AURORA-${stamp}`
  13 |     
  14 |     await createProject(request, {
  15 |       name: projectName,
  16 |       status: 'Planning'
  17 |     })
  18 | 
  19 |     await page.goto('/projects')
  20 |     await expect(page.getByText('Synchronizing Matrix...')).not.toBeVisible()
  21 |     
  22 |     // Wait for the specific project to appear in the sidebar
  23 |     const railItem = page.locator('h3').filter({ hasText: projectName })
  24 |     await expect(railItem).toBeVisible({ timeout: 20000 })
  25 |     await railItem.click()
  26 |     
  27 |     await expect(page.locator('h1').filter({ hasText: projectName })).toBeVisible()
  28 | 
  29 |     // Tab navigation
  30 |     const ganttBtn = page.getByRole('button', { name: /Gantt/i }).first()
  31 |     await expect(ganttBtn).toBeVisible({ timeout: 15000 })
  32 |     await ganttBtn.click({ force: true })
  33 |     await expect(page.getByText(/Execution Vectors/i)).toBeVisible({ timeout: 15000 })
  34 | 
  35 |     const activityBtn = page.getByRole('button', { name: /Activity/i }).first()
> 36 |     await expect(activityBtn).toBeVisible({ timeout: 15000 })
     |                               ^ Error: expect(locator).toBeVisible() failed
  37 |     await activityBtn.click({ force: true })
  38 |     await expect(page.getByText('Strategic Evolution Stream')).toBeVisible({ timeout: 15000 })
  39 |   })
  40 | 
  41 |   test('verifies dashboard view', async ({ page }) => {
  42 |     await page.goto('/projects')
  43 |     await expect(page.getByText('Synchronizing Matrix...')).not.toBeVisible()
  44 |     // Wait for dashboard button
  45 |     const dashboardBtn = page.getByRole('button').filter({ hasText: 'Tactical Huddle' })
  46 |     await expect(dashboardBtn).toBeVisible({ timeout: 20000 })
  47 |     await dashboardBtn.click()
  48 |     
  49 |     await expect(page.getByText(/Aggregated live execution stream/i)).toBeVisible()
  50 |   })
  51 | })
  52 | 
```