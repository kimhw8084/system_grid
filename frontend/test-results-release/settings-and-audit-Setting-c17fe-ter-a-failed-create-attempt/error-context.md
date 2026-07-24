# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings-and-audit.spec.ts >> Settings and audit workflows >> filters operators and keeps tenant input after a failed create attempt
- Location: tests/settings-and-audit.spec.ts:32:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('table > tbody > tr').first()
Expected substring: "System Administrator"
Received string:    "ADAdmin Rootadmin_rootIT—No GroupsADMINADMINADMINADMINADMINADMINADMINADMINADMINADMINADMINADMINADMINADMIN"
Timeout: 15000ms

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('table > tbody > tr').first()
    33 × locator resolved to <tr class="transition-colors border-b border-white/5 last:border-0 group hover:bg-white/5">…</tr>
       - unexpected value "ADAdmin Rootadmin_rootIT—No GroupsADMINADMINADMINADMINADMINADMINADMINADMINADMINADMINADMINADMINADMINADMIN"

```

```yaml
- row "AD Admin Root admin_root IT — No Groups ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN ADMIN":
  - cell:
    - checkbox
  - cell "AD Admin Root admin_root":
    - button "AD Admin Root admin_root":
      - text: AD
      - paragraph: Admin Root
      - paragraph: admin_root
  - cell "IT"
  - cell "—"
  - cell "No Groups"
  - cell:
    - checkbox [checked]
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell "ADMIN":
    - button "ADMIN"
  - cell:
    - button "Revoke Access":
      - img
```

# Test source

```ts
  1  | import { clickResilientButton } from './helpers/sysgrid';
  2  | import { expect } from '@playwright/test';
  3  | import { test } from './helpers/sysgrid-test';
  4  | import { resetBrowserState, seedOperationalScenario } from './helpers/sysgrid'
  5  | 
  6  | const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'
  7  | 
  8  | test.describe('Settings and audit workflows', () => {
  9  |   test('persists theme and loads major settings sections', async ({ page }) => {
  10 |     await resetBrowserState(page)
  11 | 
  12 |     await page.goto('/settings')
  13 |     await expect(page.getByText('Infrastructure Domain')).toBeVisible()
  14 | 
  15 |     await clickResilientButton(page, /^Light$/)
  16 |     await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('pure-clarity')
  17 | 
  18 |     await page.reload()
  19 |     await page.waitForLoadState('networkidle')
  20 |     await expect(page.getByText('Infrastructure Domain')).toBeVisible()
  21 |     await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('pure-clarity')
  22 | 
  23 |     await clickResilientButton(page, /Permission/i)
  24 |     await expect(page.getByText('Identity Sync Pipeline')).toBeVisible()
  25 |     await expect(page.getByPlaceholder('Search identity, department, or team...')).toBeVisible()
  26 | 
  27 |     await clickResilientButton(page, /Tenants/i)
  28 |     await expect(page.getByText('Tenant Registry')).toBeVisible()
  29 |     await expect(page.getByRole('button', { name: /Create Tenant/i })).toBeVisible()
  30 |   })
  31 | 
  32 |   test('filters operators and keeps tenant input after a failed create attempt', async ({ page }) => {
  33 |     await resetBrowserState(page)
  34 | 
  35 |     await page.goto('/settings?tab=permissions')
  36 |     await expect(page.getByText('Identity Sync Pipeline')).toBeVisible()
  37 |     await page.getByPlaceholder('Search identity, department, or team...').fill('admin_root')
> 38 |     await expect(page.locator('table > tbody > tr').first()).toContainText('System Administrator')
     |                                                              ^ Error: expect(locator).toContainText(expected) failed
  39 |     await expect(page.getByText('No operators match the current filter')).not.toBeVisible()
  40 | 
  41 |     await page.getByPlaceholder('Search identity, department, or team...').fill('not-a-real-operator')
  42 |     await expect(page.getByText('No operators match the current filter')).toBeVisible()
  43 | 
  44 |     await clickResilientButton(page, /Tenants/i)
  45 |     await expect(page.getByText('Tenant Registry')).toBeVisible()
  46 |     const tenantInput = page.getByPlaceholder('Tenant name')
  47 |     await tenantInput.fill('Default Engine')
  48 |     await clickResilientButton(page, /Create Tenant/i)
  49 |     await expect(page.getByText(/Failed to create tenant/i)).toBeVisible()
  50 |     await expect(tenantInput).toHaveValue('Default Engine')
  51 |   })
  52 | 
  53 |   test('stores and exposes user-pool sync script history', async ({ page, sysApi: request }) => {
  54 |     await resetBrowserState(page)
  55 |     const response = await request.post(`${apiBase}/settings/user-pool/refresh`, {
  56 |       data: { 
  57 |         records: [
  58 |           { external_id: 'pw.sync.1', username: 'pwsync1', full_name: 'PW Sync One', email: 'pwsync1@example.com', registration_status: 'Verified' }
  59 |         ],
  60 |         source: "playwright_test"
  61 |       },
  62 |       /* headers auto-injected */
  63 |     })
  64 |     if (!response.ok()) { console.error(await response.text()); }
  65 |     expect(response.ok()).toBeTruthy()
  66 | 
  67 |     await page.goto('/settings?tab=permissions')
  68 |     await expect(page.getByText('Identity Sync Pipeline')).toBeVisible()
  69 |     await clickResilientButton(page, /Identity Sync/i)
  70 |     await page.waitForTimeout(1000)
  71 |     await clickResilientButton(page, /View Sync History/i)
  72 |     await clickResilientButton(page, /View Script History/i)
  73 |     await expect(page.getByText('Historical Sync Logic')).toBeVisible()
  74 |     await expect(page.getByRole('button', { name: /Restore to Editor/i })).toBeVisible()
  75 |   })
  76 | 
  77 |   test('renders scoped audit logs for seeded service activity', async ({ page, sysApi: request }) => {
  78 |     await resetBrowserState(page)
  79 |     const { service } = await seedOperationalScenario(request)
  80 | 
  81 |     await page.goto(`/logs?target_table=logical_services&target_id=${service.id}`)
  82 |     await expect(page.getByText(`Scoped: logical_services // ${service.id}`)).toBeVisible()
  83 |     await expect(page.getByText(service.name)).toBeVisible()
  84 |     await expect(page.getByRole('button', { name: /Analytics/i })).toBeVisible()
  85 |   })
  86 | })
  87 | 
```