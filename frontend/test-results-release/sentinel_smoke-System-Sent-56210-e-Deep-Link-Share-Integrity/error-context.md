# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sentinel_smoke.spec.ts >> System Sentinel (Zero-Tolerance Coverage) >> Monitoring View: Golden Template Deep Link & Share Integrity
- Location: tests/sentinel_smoke.spec.ts:42:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /id=/
Received string:  "http://127.0.0.1:5173/monitoring"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    32 × unexpected value "http://127.0.0.1:5173/monitoring"

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
  - text: Observability
  - heading "Monitoring" [level=1]:
    - img
    - text: Monitoring
  - paragraph: Centralized monitoring configuration and operational status
  - paragraph: Registry Scope
  - paragraph: 160 existing · 2 archived
  - button "Existing"
  - button "Archived"
  - img
  - textbox "Scan matrix..."
  - button "Views":
    - img
    - text: Views
  - button "Display":
    - img
    - text: Display
  - button "Export CSV":
    - img
  - button "Copy to clipboard":
    - img
  - button "Registry configuration":
    - img
  - button "Import":
    - img
    - text: Import
  - button "Filters":
    - img
    - text: Filters
  - button "Activity":
    - img
    - text: Activity
  - button "Compare" [disabled]:
    - img
    - text: Compare
  - button "Bulk Actions":
    - img
    - text: Bulk Actions
  - button "+ Add Monitoring"
  - text: Status Filter
  - button "All statuses":
    - text: All statuses
    - img
  - text: Severity Filter
  - button "All severities":
    - text: All severities
    - img
  - text: Platform Filter
  - button "All platforms":
    - text: All platforms
    - img
  - text: Owner Filter
  - button "All owners":
    - text: All owners
    - img
  - treegrid:
    - rowgroup:
      - row "ID Title":
        - columnheader
        - columnheader "ID"
        - columnheader "Title"
    - rowgroup:
      - row "Target Asset Status Owners Category":
        - columnheader "Target Asset"
        - columnheader "Status"
        - columnheader "Owners"
        - columnheader "Category"
    - rowgroup:
      - row "Action":
        - columnheader "Action"
    - rowgroup:
      - 'row "Press Space to toggle row selection (checked)  1 BI-ANALYTICS-P-161: Auth Error" [selected]':
        - gridcell "Press Space to toggle row selection (checked) ":
          - checkbox "Press Space to toggle row selection (checked)" [checked]
          - text: 
        - gridcell "1"
        - 'gridcell "BI-ANALYTICS-P-161: Auth Error"'
      - 'row "Press Space to toggle row selection (unchecked)  2 ERP-P-076: Latency Spike"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "2"
        - 'gridcell "ERP-P-076: Latency Spike"'
      - 'row "Press Space to toggle row selection (unchecked)  3 SECURITY-V-196: Auth Error"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "3"
        - 'gridcell "SECURITY-V-196: Auth Error"'
      - 'row "Press Space to toggle row selection (unchecked)  4 SECURITY-P-113: Disk Full"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "4"
        - 'gridcell "SECURITY-P-113: Disk Full"'
      - 'row "Press Space to toggle row selection (unchecked)  5 BI-ANALYTICS-S-190: Latency Spike"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "5"
        - 'gridcell "BI-ANALYTICS-S-190: Latency Spike"'
      - 'row "Press Space to toggle row selection (unchecked)  6 MANUFACTURING-P-119: CPU High"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "6"
        - 'gridcell "MANUFACTURING-P-119: CPU High"'
      - 'row "Press Space to toggle row selection (unchecked)  7 MANUFACTURING-P-102: Auth Error"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "7"
        - 'gridcell "MANUFACTURING-P-102: Auth Error"'
      - 'row "Press Space to toggle row selection (unchecked)  8 MES-P-030: Disk Full"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "8"
        - 'gridcell "MES-P-030: Disk Full"'
      - 'row "Press Space to toggle row selection (unchecked)  9 BI-ANALYTICS-P-016: Disk Full"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "9"
        - 'gridcell "BI-ANALYTICS-P-016: Disk Full"'
      - 'row "Press Space to toggle row selection (unchecked)  10 MES-P-022: Latency Spike"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "10"
        - 'gridcell "MES-P-022: Latency Spike"'
      - 'row "Press Space to toggle row selection (unchecked)  11 FINANCE-P-048: CPU High"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "11"
        - 'gridcell "FINANCE-P-048: CPU High"'
      - 'row "Press Space to toggle row selection (unchecked)  12 FINANCE-V-179: Auth Error"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "12"
        - 'gridcell "FINANCE-V-179: Auth Error"'
      - 'row "Press Space to toggle row selection (unchecked)  13 MANUFACTURING-S-083: Disk Full"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "13"
        - 'gridcell "MANUFACTURING-S-083: Disk Full"'
      - 'row "Press Space to toggle row selection (unchecked)  14 MES-P-116: Latency Spike"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "14"
        - 'gridcell "MES-P-116: Latency Spike"'
      - 'row "Press Space to toggle row selection (unchecked)  15 BI-ANALYTICS-V-154: Auth Error"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "15"
        - 'gridcell "BI-ANALYTICS-V-154: Auth Error"'
      - 'row "Press Space to toggle row selection (unchecked)  16 FINANCE-P-079: CPU High"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "16"
        - 'gridcell "FINANCE-P-079: CPU High"'
      - 'row "Press Space to toggle row selection (unchecked)  17 SCADA-P-046: Auth Error"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "17"
        - 'gridcell "SCADA-P-046: Auth Error"'
      - 'row "Press Space to toggle row selection (unchecked)  18 ERP-V-163: Disk Full"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "18"
        - 'gridcell "ERP-V-163: Disk Full"'
      - 'row "Press Space to toggle row selection (unchecked)  19 ERP-V-163: Auth Error"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "19"
        - 'gridcell "ERP-V-163: Auth Error"'
      - 'row "Press Space to toggle row selection (unchecked)  20 SCADA-P-032: Disk Full"':
        - gridcell "Press Space to toggle row selection (unchecked) ":
          - checkbox "Press Space to toggle row selection (unchecked)"
          - text: 
        - gridcell "20"
        - 'gridcell "SCADA-P-032: Disk Full"'
    - rowgroup:
      - row "BI-ANALYTICS-P-161 Existing Haewon Kim Hardware" [selected]:
        - gridcell "BI-ANALYTICS-P-161"
        - gridcell "Existing"
        - gridcell "Haewon Kim"
        - gridcell "Hardware"
      - row "ERP-P-076 Existing Haewon Kim Hardware":
        - gridcell "ERP-P-076"
        - gridcell "Existing"
        - gridcell "Haewon Kim"
        - gridcell "Hardware"
      - row "SECURITY-V-196 Planned Haewon Kim Application":
        - gridcell "SECURITY-V-196"
        - gridcell "Planned"
        - gridcell "Haewon Kim"
        - gridcell "Application"
      - row "SECURITY-P-113 Cancelled Haewon Kim Network":
        - gridcell "SECURITY-P-113"
        - gridcell "Cancelled"
        - gridcell "Haewon Kim"
        - gridcell "Network"
      - row "BI-ANALYTICS-S-190 Existing Haewon Kim Hardware":
        - gridcell "BI-ANALYTICS-S-190"
        - gridcell "Existing"
        - gridcell "Haewon Kim"
        - gridcell "Hardware"
      - row "MANUFACTURING-P-119 Planned Haewon Kim Network":
        - gridcell "MANUFACTURING-P-119"
        - gridcell "Planned"
        - gridcell "Haewon Kim"
        - gridcell "Network"
      - row "MANUFACTURING-P-102 Planned Haewon Kim Application":
        - gridcell "MANUFACTURING-P-102"
        - gridcell "Planned"
        - gridcell "Haewon Kim"
        - gridcell "Application"
      - row "MES-P-030 Cancelled Haewon Kim Synthetic":
        - gridcell "MES-P-030"
        - gridcell "Cancelled"
        - gridcell "Haewon Kim"
        - gridcell "Synthetic"
      - row "BI-ANALYTICS-P-016 Existing Haewon Kim Synthetic":
        - gridcell "BI-ANALYTICS-P-016"
        - gridcell "Existing"
        - gridcell "Haewon Kim"
        - gridcell "Synthetic"
      - row "MES-P-022 Cancelled Haewon Kim Hardware":
        - gridcell "MES-P-022"
        - gridcell "Cancelled"
        - gridcell "Haewon Kim"
        - gridcell "Hardware"
      - row "FINANCE-P-048 Existing Haewon Kim Hardware":
        - gridcell "FINANCE-P-048"
        - gridcell "Existing"
        - gridcell "Haewon Kim"
        - gridcell "Hardware"
      - row "FINANCE-V-179 Cancelled Haewon Kim Network":
        - gridcell "FINANCE-V-179"
        - gridcell "Cancelled"
        - gridcell "Haewon Kim"
        - gridcell "Network"
      - row "MANUFACTURING-S-083 Planned Haewon Kim Hardware":
        - gridcell "MANUFACTURING-S-083"
        - gridcell "Planned"
        - gridcell "Haewon Kim"
        - gridcell "Hardware"
      - row "MES-P-116 Cancelled Haewon Kim Synthetic":
        - gridcell "MES-P-116"
        - gridcell "Cancelled"
        - gridcell "Haewon Kim"
        - gridcell "Synthetic"
      - row "BI-ANALYTICS-V-154 Cancelled Haewon Kim Application":
        - gridcell "BI-ANALYTICS-V-154"
        - gridcell "Cancelled"
        - gridcell "Haewon Kim"
        - gridcell "Application"
      - row "FINANCE-P-079 Planned Haewon Kim Synthetic":
        - gridcell "FINANCE-P-079"
        - gridcell "Planned"
        - gridcell "Haewon Kim"
        - gridcell "Synthetic"
      - row "SCADA-P-046 Existing Haewon Kim Synthetic":
        - gridcell "SCADA-P-046"
        - gridcell "Existing"
        - gridcell "Haewon Kim"
        - gridcell "Synthetic"
      - row "ERP-V-163 Existing Haewon Kim Hardware":
        - gridcell "ERP-V-163"
        - gridcell "Existing"
        - gridcell "Haewon Kim"
        - gridcell "Hardware"
      - row "ERP-V-163 Existing Haewon Kim Hardware":
        - gridcell "ERP-V-163"
        - gridcell "Existing"
        - gridcell "Haewon Kim"
        - gridcell "Hardware"
      - row "SCADA-P-032 Existing Haewon Kim Synthetic":
        - gridcell "SCADA-P-032"
        - gridcell "Existing"
        - gridcell "Haewon Kim"
        - gridcell "Synthetic"
    - rowgroup:
      - row [selected]:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
      - row:
        - gridcell:
          - button "Open details":
            - img
          - button "Edit configuration":
            - img
          - button "View history":
            - img
          - button "Knowledge documents":
            - img
          - button "More actions":
            - img
    - rowgroup
    - rowgroup
    - rowgroup
    - rowgroup
    - rowgroup
    - rowgroup
    - rowgroup
    - rowgroup
    - rowgroup
  - img
  - text: "YOUR TIME (America/Chicago): 01:33:35"
  - img
  - text: "SOUTH KOREA (KST): 15:33:35 VERSION 1.2.6"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { DashboardView } from './pom/DashboardView';
  3  | import { MonitoringView } from './pom/MonitoringView';
  4  | import { AssetView } from './pom/AssetView';
  5  | import { ProjectView } from './pom/ProjectView';
  6  | import { SettingsView } from './pom/SettingsView';
  7  | 
  8  | test.describe('System Sentinel (Zero-Tolerance Coverage)', () => {
  9  |   
  10 |   test.beforeEach(async ({ page }) => {
  11 |     // 1. Strict Error Monitoring: Fail test if ANY console error occurs
  12 |     page.on('console', msg => {
  13 |       if (msg.type() === 'error') {
  14 |         throw new Error(`Browser Console Error: ${msg.text()}`);
  15 |       }
  16 |     });
  17 |     page.on('pageerror', err => {
  18 |       throw new Error(`Browser Runtime Error: ${err.message}`);
  19 |     });
  20 |   });
  21 | 
  22 |   const views = [
  23 |     { path: '/', pom: DashboardView, name: 'Dashboard' },
  24 |     { path: '/monitoring', pom: MonitoringView, name: 'Monitoring' },
  25 |     { path: '/assets', pom: AssetView, name: 'Assets' },
  26 |     { path: '/projects', pom: ProjectView, name: 'Projects' },
  27 |     { path: '/settings', pom: SettingsView, name: 'Settings' },
  28 |   ];
  29 | 
  30 |   for (const view of views) {
  31 |     test(`Integrity Check: ${view.name} loads and template is compliant`, async ({ page }) => {
  32 |       const pom = new view.pom(page);
  33 |       await page.goto(view.path);
  34 |       await pom.waitForAppIdle();
  35 | 
  36 |       // Check Golden Template Primitives
  37 |       // All views should have a main header or identity
  38 |       await expect(page.locator('h1').first()).toBeVisible();
  39 |     });
  40 |   }
  41 | 
  42 |   test('Monitoring View: Golden Template Deep Link & Share Integrity', async ({ page }) => {
  43 |     const monitoringView = new MonitoringView(page);
  44 |     await page.goto('/monitoring');
  45 |     await monitoringView.waitForAppIdle();
  46 | 
  47 |     // Select first item with wait
  48 |     const firstRow = page.locator('.ag-row').first();
  49 |     await firstRow.scrollIntoViewIfNeeded();
  50 |     await firstRow.waitFor({ state: 'visible' });
  51 |     await firstRow.click();
  52 |     
  53 |     // Verify Deep Linking
> 54 |     await expect(page).toHaveURL(/id=/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  55 | 
  56 |     // Verify Golden Template Header & Share functionality
  57 |     const modal = await monitoringView.getModal();
  58 |     await expect(modal).toBeVisible();
  59 |     const shareButton = modal.getByTitle('Share direct link');
  60 |     await expect(shareButton).toBeVisible();
  61 |     
  62 |     // Catch-all: Ensure no ReferenceError occurs in the modal
  63 |     await expect(modal.locator('h2')).toBeVisible();
  64 |   });
  65 | });
  66 | 
```