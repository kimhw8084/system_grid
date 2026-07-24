# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: projects-workflows.spec.ts >> Projects workflows >> opens project config, keeps selection stable on delete, and blocks filtered reorder affordance
- Location: tests/projects-workflows.spec.ts:7:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByTitle('Dismiss Workspace')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - link "SYSGRID" [ref=e6] [cursor=pointer]:
          - /url: /
          - img [ref=e8]
          - generic [ref=e10]: SYSGRID
        - button [ref=e11] [cursor=pointer]:
          - img [ref=e12]
      - navigation [ref=e13]:
        - generic [ref=e14]:
          - button "OPERATIONS" [ref=e15] [cursor=pointer]:
            - generic [ref=e16]: OPERATIONS
            - img [ref=e17]
          - generic [ref=e20]:
            - link "Home" [ref=e21] [cursor=pointer]:
              - /url: /
              - generic [ref=e22]:
                - img [ref=e23]
                - generic [ref=e28]: Home
            - link "Projects" [ref=e29] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e30]:
                - img [ref=e31]
                - generic [ref=e34]: Projects
            - link "Monitoring" [ref=e36] [cursor=pointer]:
              - /url: /monitoring
              - generic [ref=e37]:
                - img [ref=e38]
                - generic [ref=e40]: Monitoring
        - generic [ref=e41]:
          - button "INFRASTRUCTURE" [ref=e42] [cursor=pointer]:
            - generic [ref=e43]: INFRASTRUCTURE
            - img [ref=e44]
          - generic [ref=e47]:
            - link "Assets" [ref=e48] [cursor=pointer]:
              - /url: /asset
              - generic [ref=e49]:
                - img [ref=e50]
                - generic [ref=e53]: Assets
            - link "Racks" [ref=e54] [cursor=pointer]:
              - /url: /racks
              - generic [ref=e55]:
                - img [ref=e56]
                - generic [ref=e60]: Racks
            - link "Services" [ref=e61] [cursor=pointer]:
              - /url: /services
              - generic [ref=e62]:
                - img [ref=e63]
                - generic [ref=e67]: Services
            - link "External" [ref=e68] [cursor=pointer]:
              - /url: /external
              - generic [ref=e69]:
                - img [ref=e70]
                - generic [ref=e76]: External
        - generic [ref=e77]:
          - button "CONNECTIVITY" [ref=e78] [cursor=pointer]:
            - generic [ref=e79]: CONNECTIVITY
            - img [ref=e80]
          - generic [ref=e83]:
            - link "Network" [ref=e84] [cursor=pointer]:
              - /url: /network
              - generic [ref=e85]:
                - img [ref=e86]
                - generic [ref=e91]: Network
            - link "Architecture" [ref=e92] [cursor=pointer]:
              - /url: /architecture
              - generic [ref=e93]:
                - img [ref=e94]
                - generic [ref=e98]: Architecture
        - generic [ref=e99]:
          - button "ANALYSIS" [ref=e100] [cursor=pointer]:
            - generic [ref=e101]: ANALYSIS
            - img [ref=e102]
          - generic [ref=e105]:
            - link "FAR" [ref=e106] [cursor=pointer]:
              - /url: /far
              - generic [ref=e107]:
                - img [ref=e108]
                - generic [ref=e110]: FAR
            - link "Research" [ref=e111] [cursor=pointer]:
              - /url: /research
              - generic [ref=e112]:
                - img [ref=e113]
                - generic [ref=e116]: Research
        - generic [ref=e117]:
          - button "RESOURCES" [ref=e118] [cursor=pointer]:
            - generic [ref=e119]: RESOURCES
            - img [ref=e120]
          - generic [ref=e123]:
            - link "Vendors" [ref=e124] [cursor=pointer]:
              - /url: /vendors
              - generic [ref=e125]:
                - img [ref=e126]
                - generic [ref=e129]: Vendors
            - link "Knowledge" [ref=e130] [cursor=pointer]:
              - /url: /knowledge
              - generic [ref=e131]:
                - img [ref=e132]
                - generic [ref=e135]: Knowledge
      - generic [ref=e136]:
        - 'button "Haewon Kim ID: 1" [ref=e137] [cursor=pointer]':
          - img [ref=e139]
          - generic [ref=e142]:
            - generic [ref=e143]: Haewon Kim
            - generic [ref=e144]: "ID: 1"
        - generic [ref=e145]:
          - button "Dark" [ref=e146] [cursor=pointer]:
            - generic [ref=e148]: Dark
          - button "Light" [ref=e149] [cursor=pointer]:
            - generic [ref=e151]: Light
      - paragraph [ref=e153]: 1.2.6
    - main [ref=e154]:
      - generic [ref=e156]:
        - generic [ref=e157]:
          - button "Patch Notes" [ref=e158] [cursor=pointer]
          - button "Search assets, projects, or incidents... ⌘ K" [ref=e159] [cursor=pointer]:
            - img [ref=e160]
            - generic [ref=e163]: Search assets, projects, or incidents...
            - generic [ref=e164]:
              - generic [ref=e165]: ⌘
              - generic [ref=e166]: K
        - generic [ref=e167]:
          - button "Active Database Local Demo" [ref=e169] [cursor=pointer]:
            - img [ref=e171]
            - generic [ref=e175]:
              - generic [ref=e176]: Active Database
              - generic [ref=e177]: Local Demo
            - img [ref=e178]
          - generic [ref=e180]:
            - generic [ref=e181]: System Status
            - generic [ref=e182]:
              - generic [ref=e183]: Operational
              - generic [ref=e184]: 26ms
          - button "Notifications" [ref=e185] [cursor=pointer]:
            - img [ref=e186]
          - button [ref=e190] [cursor=pointer]:
            - img [ref=e191]
          - link [ref=e200] [cursor=pointer]:
            - /url: /settings
            - img [ref=e201]
      - generic [ref=e205]:
        - generic [ref=e206]:
          - generic [ref=e208]:
            - img [ref=e210]
            - generic [ref=e214]:
              - generic [ref=e215]:
                - heading "PW-PROJ-A-1784874726368-h88y2a" [level=1] [ref=e216]
                - button "Share direct link" [ref=e217] [cursor=pointer]:
                  - img [ref=e218]
              - generic [ref=e221]:
                - generic [ref=e222]: Strategic
                - generic [ref=e223]: •
                - generic [ref=e224]: Planning
          - generic [ref=e226]:
            - button "Unlock Editor" [ref=e228] [cursor=pointer]:
              - img [ref=e229]
              - text: Unlock Editor
            - generic [ref=e232]:
              - button "Decommission Project" [ref=e233] [cursor=pointer]:
                - img [ref=e234]
              - button [active] [ref=e237] [cursor=pointer]:
                - img [ref=e238]
        - generic [ref=e241]:
          - generic [ref=e242]:
            - button "Workbench" [ref=e243] [cursor=pointer]:
              - img [ref=e244]
              - generic [ref=e248]: Workbench
            - button "Precision Gantt" [ref=e249] [cursor=pointer]:
              - img [ref=e250]
              - generic [ref=e252]: Precision Gantt
            - button "Stream" [ref=e253] [cursor=pointer]:
              - img [ref=e254]
              - generic [ref=e258]: Stream
            - button "Adoption" [ref=e259] [cursor=pointer]:
              - img [ref=e260]
              - generic [ref=e263]: Adoption
          - generic [ref=e264]:
            - button "Project Configuration" [ref=e265] [cursor=pointer]:
              - img [ref=e266]
            - button "Full Screen View" [ref=e269] [cursor=pointer]:
              - img [ref=e270]
            - generic [ref=e278]: Operational
        - generic [ref=e279]:
          - generic [ref=e280]:
            - generic [ref=e281]:
              - generic [ref=e282]:
                - button "New Vector" [ref=e283] [cursor=pointer]:
                  - img [ref=e284]
                  - text: New Vector
                - button [ref=e285] [cursor=pointer]:
                  - img [ref=e286]
              - button "Tactical Huddle" [ref=e288] [cursor=pointer]:
                - img [ref=e289]
                - generic [ref=e294]: Tactical Huddle
              - generic [ref=e295]:
                - generic [ref=e296]:
                  - img [ref=e297]
                  - textbox "Filter vectors..." [ref=e300]
                - generic [ref=e301]:
                  - combobox [ref=e302]:
                    - option "ALL STATUS" [selected]
                    - option "Not Started"
                    - option "Planning"
                    - option "In Progress"
                    - option "Paused"
                    - option "Blocked"
                    - option "Cancelled"
                    - option "Completed"
                  - combobox [ref=e303]:
                    - option "ALL PRIORITY" [selected]
                    - option "Low"
                    - option "Medium"
                    - option "High"
                    - option "Highest"
            - list [ref=e305]:
              - listitem [ref=e306]:
                - button "PW-PROJ-A-1784874726368-h88y2a Planning Strategic • Medium Unassigned Jul 24" [ref=e307]:
                  - generic [ref=e308]:
                    - heading "PW-PROJ-A-1784874726368-h88y2a" [level=3] [ref=e309]
                    - generic [ref=e311]: Planning
                  - generic [ref=e312]:
                    - generic [ref=e313]: Strategic
                    - generic [ref=e314]: •
                    - generic [ref=e315]: Medium
                  - generic [ref=e316]:
                    - generic [ref=e317]: Unassigned
                    - generic [ref=e318]:
                      - img [ref=e319]
                      - generic [ref=e322]: Jul 24
                    - img [ref=e323]
              - listitem [ref=e330]:
                - button "PW-PROJ-B-1784874726368-h88y2a Planning Strategic • High Unassigned Jul 24" [ref=e331]:
                  - generic [ref=e332]:
                    - heading "PW-PROJ-B-1784874726368-h88y2a" [level=3] [ref=e333]
                    - generic [ref=e335]: Planning
                  - generic [ref=e336]:
                    - generic [ref=e337]: Strategic
                    - generic [ref=e338]: •
                    - generic [ref=e339]: High
                  - generic [ref=e340]:
                    - generic [ref=e341]: Unassigned
                    - generic [ref=e342]:
                      - img [ref=e343]
                      - generic [ref=e346]: Jul 24
                    - img [ref=e347]
              - listitem [ref=e354]:
                - button "AURORA-1784874692549 Planning N/A • Medium Unassigned Jul 24" [ref=e355]:
                  - generic [ref=e356]:
                    - heading "AURORA-1784874692549" [level=3] [ref=e357]
                    - generic [ref=e359]: Planning
                  - generic [ref=e360]:
                    - generic [ref=e361]: N/A
                    - generic [ref=e362]: •
                    - generic [ref=e363]: Medium
                  - generic [ref=e364]:
                    - generic [ref=e365]: Unassigned
                    - generic [ref=e366]:
                      - img [ref=e367]
                      - generic [ref=e370]: Jul 24
                    - img [ref=e371]
              - listitem [ref=e378]:
                - button "PW-PROJ-DEEPLINK-1784857130174 Planning Strategic • High Unassigned Jul 23" [ref=e379]:
                  - generic [ref=e380]:
                    - heading "PW-PROJ-DEEPLINK-1784857130174" [level=3] [ref=e381]
                    - generic [ref=e383]: Planning
                  - generic [ref=e384]:
                    - generic [ref=e385]: Strategic
                    - generic [ref=e386]: •
                    - generic [ref=e387]: High
                  - generic [ref=e388]:
                    - generic [ref=e389]: Unassigned
                    - generic [ref=e390]:
                      - img [ref=e391]
                      - generic [ref=e394]: Jul 23
                    - img [ref=e395]
              - listitem [ref=e402]:
                - button "PW-CHAOS-PROJ-1784855613289 Planning Strategic • Medium Unassigned Jul 23" [ref=e403]:
                  - generic [ref=e404]:
                    - heading "PW-CHAOS-PROJ-1784855613289" [level=3] [ref=e405]
                    - generic [ref=e407]: Planning
                  - generic [ref=e408]:
                    - generic [ref=e409]: Strategic
                    - generic [ref=e410]: •
                    - generic [ref=e411]: Medium
                  - generic [ref=e412]:
                    - generic [ref=e413]: Unassigned
                    - generic [ref=e414]:
                      - img [ref=e415]
                      - generic [ref=e418]: Jul 23
                    - img [ref=e419]
              - listitem [ref=e426]:
                - button "PW-PROJ-A-1784855483255-7rdrjr Planning Strategic • Medium Unassigned Jul 23" [ref=e427]:
                  - generic [ref=e428]:
                    - heading "PW-PROJ-A-1784855483255-7rdrjr" [level=3] [ref=e429]
                    - generic [ref=e431]: Planning
                  - generic [ref=e432]:
                    - generic [ref=e433]: Strategic
                    - generic [ref=e434]: •
                    - generic [ref=e435]: Medium
                  - generic [ref=e436]:
                    - generic [ref=e437]: Unassigned
                    - generic [ref=e438]:
                      - img [ref=e439]
                      - generic [ref=e442]: Jul 23
                    - img [ref=e443]
              - listitem [ref=e450]:
                - button "PW-PROJ-B-1784855483255-7rdrjr Planning Strategic • High Unassigned Jul 23" [ref=e451]:
                  - generic [ref=e452]:
                    - heading "PW-PROJ-B-1784855483255-7rdrjr" [level=3] [ref=e453]
                    - generic [ref=e455]: Planning
                  - generic [ref=e456]:
                    - generic [ref=e457]: Strategic
                    - generic [ref=e458]: •
                    - generic [ref=e459]: High
                  - generic [ref=e460]:
                    - generic [ref=e461]: Unassigned
                    - generic [ref=e462]:
                      - img [ref=e463]
                      - generic [ref=e466]: Jul 23
                    - img [ref=e467]
              - listitem [ref=e474]:
                - button "AURORA-1784855449688 Planning N/A • Medium Unassigned Jul 23" [ref=e475]:
                  - generic [ref=e476]:
                    - heading "AURORA-1784855449688" [level=3] [ref=e477]
                    - generic [ref=e479]: Planning
                  - generic [ref=e480]:
                    - generic [ref=e481]: N/A
                    - generic [ref=e482]: •
                    - generic [ref=e483]: Medium
                  - generic [ref=e484]:
                    - generic [ref=e485]: Unassigned
                    - generic [ref=e486]:
                      - img [ref=e487]
                      - generic [ref=e490]: Jul 23
                    - img [ref=e491]
              - listitem [ref=e498]:
                - 'button "Mass Initiative 1: Migration In Progress Maintenance • Low haewon.kim Jul 22" [ref=e499]':
                  - generic [ref=e500]:
                    - 'heading "Mass Initiative 1: Migration" [level=3] [ref=e501]'
                    - generic [ref=e503]: In Progress
                  - generic [ref=e504]:
                    - generic [ref=e505]: Maintenance
                    - generic [ref=e506]: •
                    - generic [ref=e507]: Low
                  - generic [ref=e508]:
                    - generic [ref=e509]: haewon.kim
                    - generic [ref=e510]:
                      - img [ref=e511]
                      - generic [ref=e514]: Jul 22
                    - img [ref=e515]
              - listitem [ref=e522]:
                - 'button "Mass Initiative 2: Upgrade In Progress Maintenance • Medium haewon.kim Jul 22" [ref=e523]':
                  - generic [ref=e524]:
                    - 'heading "Mass Initiative 2: Upgrade" [level=3] [ref=e525]'
                    - generic [ref=e527]: In Progress
                  - generic [ref=e528]:
                    - generic [ref=e529]: Maintenance
                    - generic [ref=e530]: •
                    - generic [ref=e531]: Medium
                  - generic [ref=e532]:
                    - generic [ref=e533]: haewon.kim
                    - generic [ref=e534]:
                      - img [ref=e535]
                      - generic [ref=e538]: Jul 22
                    - img [ref=e539]
              - listitem [ref=e546]:
                - 'button "Mass Initiative 3: Migration In Progress Strategic • Low haewon.kim Jul 22" [ref=e547]':
                  - generic [ref=e548]:
                    - 'heading "Mass Initiative 3: Migration" [level=3] [ref=e549]'
                    - generic [ref=e551]: In Progress
                  - generic [ref=e552]:
                    - generic [ref=e553]: Strategic
                    - generic [ref=e554]: •
                    - generic [ref=e555]: Low
                  - generic [ref=e556]:
                    - generic [ref=e557]: haewon.kim
                    - generic [ref=e558]:
                      - img [ref=e559]
                      - generic [ref=e562]: Jul 22
                    - img [ref=e563]
              - listitem [ref=e570]:
                - 'button "Mass Initiative 4: Migration In Progress Strategic • High haewon.kim Jul 22" [ref=e571]':
                  - generic [ref=e572]:
                    - 'heading "Mass Initiative 4: Migration" [level=3] [ref=e573]'
                    - generic [ref=e575]: In Progress
                  - generic [ref=e576]:
                    - generic [ref=e577]: Strategic
                    - generic [ref=e578]: •
                    - generic [ref=e579]: High
                  - generic [ref=e580]:
                    - generic [ref=e581]: haewon.kim
                    - generic [ref=e582]:
                      - img [ref=e583]
                      - generic [ref=e586]: Jul 22
                    - img [ref=e587]
              - listitem [ref=e594]:
                - 'button "Mass Initiative 5: Expansion In Progress Strategic • Low haewon.kim Jul 22" [ref=e595]':
                  - generic [ref=e596]:
                    - 'heading "Mass Initiative 5: Expansion" [level=3] [ref=e597]'
                    - generic [ref=e599]: In Progress
                  - generic [ref=e600]:
                    - generic [ref=e601]: Strategic
                    - generic [ref=e602]: •
                    - generic [ref=e603]: Low
                  - generic [ref=e604]:
                    - generic [ref=e605]: haewon.kim
                    - generic [ref=e606]:
                      - img [ref=e607]
                      - generic [ref=e610]: Jul 22
                    - img [ref=e611]
          - generic [ref=e622]:
            - generic [ref=e623]:
              - generic [ref=e625]:
                - generic [ref=e626]:
                  - text: Project Title
                  - paragraph [ref=e627]: PW-PROJ-A-1784874726368-h88y2a
                - generic [ref=e629]:
                  - text: Status
                  - generic [ref=e631]: Planning
                - generic [ref=e633]:
                  - text: Priority
                  - paragraph [ref=e634]: Medium
              - generic [ref=e635]:
                - generic [ref=e636]:
                  - heading "Problem Statement" [level=4] [ref=e638]
                  - generic [ref=e639]:
                    - paragraph: "\"No problem statement defined.\""
                - generic [ref=e640]:
                  - heading "Strategic Objective" [level=4] [ref=e642]
                  - generic [ref=e643]:
                    - paragraph: "\"No objective defined.\""
              - generic [ref=e644]:
                - generic [ref=e645]:
                  - generic [ref=e648]: Strategic Context & Boundaries
                  - generic [ref=e649]:
                    - generic [ref=e652]: Systems
                    - generic [ref=e656]: Assets
                    - generic [ref=e660]: Services
                - generic [ref=e662]:
                  - generic [ref=e663]:
                    - generic [ref=e666]: Stakeholders
                    - textbox "Enter team identifiers..." [ref=e668]
                  - generic [ref=e669]:
                    - generic [ref=e672]: Strategic Owners
                    - generic [ref=e673]:
                      - generic [ref=e674] [cursor=pointer]:
                        - checkbox "Haewon Kim" [ref=e675]
                        - generic [ref=e676]: Haewon Kim
                      - generic [ref=e677] [cursor=pointer]:
                        - checkbox "Admin Root" [ref=e678]
                        - generic [ref=e679]: Admin Root
                      - generic [ref=e680] [cursor=pointer]:
                        - checkbox "PW Sync One" [ref=e681]
                        - generic [ref=e682]: PW Sync One
            - generic [ref=e683]:
              - generic [ref=e684]:
                - heading "Jira Links" [level=4] [ref=e685]
                - generic [ref=e688]:
                  - textbox "Label (e.g. PROJ-123)" [ref=e689]
                  - textbox "Link URL" [ref=e690]
                  - button [ref=e691] [cursor=pointer]:
                    - img
              - generic [ref=e692]:
                - heading "Stakeholders" [level=4] [ref=e693]
                - generic [ref=e694]:
                  - text: Comma-separated team names
                  - textbox "Security, Infra, DevOps..." [ref=e695]
            - generic [ref=e697]:
              - generic [ref=e698]:
                - img [ref=e700]
                - heading "Strategic Designs" [level=4] [ref=e704]
              - button "+ New Design" [ref=e705] [cursor=pointer]
            - generic [ref=e706]:
              - generic [ref=e707]:
                - generic [ref=e709]:
                  - img [ref=e711]
                  - heading "Artifacts & Evidence" [level=4] [ref=e715]
                - generic [ref=e717] [cursor=pointer]:
                  - img [ref=e719]
                  - paragraph [ref=e722]: Select to attach evidence
              - generic [ref=e723]:
                - generic [ref=e724]:
                  - img [ref=e726]
                  - heading "Strategic References" [level=4] [ref=e729]
                - button "Establish Reference Link" [ref=e731] [cursor=pointer]
          - generic [ref=e732]:
            - generic [ref=e734]:
              - heading "ROI Metrics" [level=4] [ref=e735]:
                - img [ref=e736]
                - text: ROI Metrics
              - button [ref=e738] [cursor=pointer]:
                - img [ref=e739]
            - generic [ref=e744]:
              - img [ref=e745]
              - paragraph [ref=e747]: No ROI streams selected
      - generic [ref=e748]:
        - generic [ref=e749]:
          - generic [ref=e750]:
            - img [ref=e751]
            - generic [ref=e754]: "YOUR TIME (America/Chicago): 01:33:05"
          - generic [ref=e755]:
            - img [ref=e756]
            - generic [ref=e759]: "SOUTH KOREA (KST): 15:33:05"
        - generic [ref=e760]: VERSION 1.2.6
  - dialog [ref=e761]:
    - generic [ref=e762]:
      - generic [ref=e765]:
        - generic [ref=e766]:
          - button "Close" [ref=e768] [cursor=pointer]:
            - img [ref=e769]
          - button "Maximize" [ref=e772] [cursor=pointer]:
            - img [ref=e773]
        - img [ref=e779]
        - generic [ref=e783]:
          - heading "Project Configuration" [level=2] [ref=e784]
          - generic [ref=e786]: Global System Parameters & Enumerations
      - generic [ref=e787]:
        - paragraph [ref=e790]: Forensic Registry Lineage
        - generic [ref=e794] [cursor=pointer]:
          - generic [ref=e795]:
            - img [ref=e797]
            - generic [ref=e800]:
              - img [ref=e801]
              - heading "Project Types" [level=3] [ref=e805]
          - generic [ref=e806]:
            - generic [ref=e807]:
              - generic [ref=e808]: "0"
              - generic [ref=e809]: Entries
            - button [ref=e810]:
              - img [ref=e811]
        - paragraph [ref=e814]: SysGrid Core Configuration Node // v3.0.0
      - button "Close" [ref=e819] [cursor=pointer]
```

# Test source

```ts
  1  | import { clickResilientButton } from './helpers/sysgrid';
  2  | import { expect } from '@playwright/test';
  3  | import { test } from './helpers/sysgrid-test';
  4  | import { createProject, resetBrowserState } from './helpers/sysgrid'
  5  | 
  6  | test.describe('Projects workflows', () => {
  7  |   test('opens project config, keeps selection stable on delete, and blocks filtered reorder affordance', async ({ page, sysApi: request }) => {
  8  |     await resetBrowserState(page)
  9  |     const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  10 |     const first = await createProject(request, {
  11 |       name: `PW-PROJ-A-${stamp}`,
  12 |       type: 'Strategic',
  13 |       status: 'Planning',
  14 |       priority: 'Medium'
  15 |     })
  16 |     const second = await createProject(request, {
  17 |       name: `PW-PROJ-B-${stamp}`,
  18 |       type: 'Strategic',
  19 |       status: 'Planning',
  20 |       priority: 'High'
  21 |     })
  22 | 
  23 |     await page.goto(`/projects?id=${first.id}`)
  24 |     await expect(page.locator('h1').filter({ hasText: first.name })).toBeVisible()
  25 | 
  26 |     await page.locator('button:has(svg.lucide-settings)').first().click()
  27 |     await expect(page.getByText('Project Configuration')).toBeVisible()
> 28 |     await page.getByTitle('Dismiss Workspace').click()
     |                                                ^ Error: locator.click: Test timeout of 60000ms exceeded.
  29 | 
  30 |     await page.getByPlaceholder('Search Projects...').fill(first.name)
  31 |     await expect(page.getByText(/Clear search and filters to reorder projects/i)).toBeVisible()
  32 | 
  33 |     await page.getByPlaceholder('Search Projects...').fill('')
  34 |     await page.getByTitle('Archive Project').click()
  35 |     await clickResilientButton(page, 'Archive Project')
  36 |     await expect(page.getByText('Project Decommissioned')).toBeVisible()
  37 |     await expect(page.locator('h1').filter({ hasText: second.name })).toBeVisible()
  38 |     await expect(page).not.toHaveURL(new RegExp(`id=${first.id}`))
  39 |   })
  40 | })
  41 | 
```