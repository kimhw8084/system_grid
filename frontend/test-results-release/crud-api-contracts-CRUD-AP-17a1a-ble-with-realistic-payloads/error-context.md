# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: crud-api-contracts.spec.ts >> CRUD API contracts >> keeps network, external, and FAR CRUD flows stable with realistic payloads
- Location: tests/crud-api-contracts.spec.ts:161:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1   | import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
  2   | 
  3   | const apiBase = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1'
  4   | const apiOrigin = apiBase.replace(/\/api\/v1$/, '')
  5   | const testUserId = process.env.USER_ID || 'haewon.kim'
  6   | export type WorkspaceId = 'monitoring' | 'network' | 'assets' | 'vendors'
  7   | export type LogicalGridRow = {
  8   |   rowKey: string
  9   |   pinned: Locator | null
  10  |   center: Locator | null
  11  |   cell: (columnId: string) => Promise<Locator>
  12  |   action: (name: string | RegExp) => Locator
  13  | }
  14  | 
  15  | const browserStateKeys = [
  16  |   'monitoring_workspace_state_v2',
  17  |   'asset_real_workspace_state_v1',
  18  |   'network_workspace_state_v1',
  19  |   'services_workspace_state_v1',
  20  |   'vendor_workspace_state_v1',
  21  |   'monitoring_ui_state',
  22  |   'asset_ui_state',
  23  |   'project_ui_state',
  24  |   'far_ui_state',
  25  |   'rca_ui_state',
  26  |   'investigation_ui_state',
  27  |   'settings_ui_state',
  28  |   'sysgrid_monitoring_views_v1',
  29  |   'sysgrid_monitoring_active_view_v1',
  30  |   'sysgrid_monitoring_favorites_v1',
  31  |   'sysgrid_monitoring_ui_state_v1',
  32  |   'sysgrid_monitoring_watch_v1',
  33  |   'sysgrid_monitoring_session_init',
  34  | ].join('|')
  35  | 
  36  | async function post(request: APIRequestContext, path: string, data: Record<string, any>) {
  37  |   const response = await request.post(`${apiBase}${path}`, { 
  38  |     data,
  39  |     headers: { 'X-User-Id': testUserId, 'X-Tenant-Id': '1' }
  40  |   })
  41  |   if (!response.ok()) {
  42  |      const text = await response.text()
  43  |      console.error(`POST ${path} FAILED: ${response.status()} ${text}`)
  44  |   }
> 45  |   expect(response.ok()).toBeTruthy()
      |                         ^ Error: expect(received).toBeTruthy()
  46  |   const resData = await response.json()
  47  |   if (path === '/monitoring') {
  48  |      console.log(`SEED: Created monitoring item "${resData.title}" (ID: ${resData.id})`)
  49  |   }
  50  |   return resData
  51  | }
  52  | 
  53  | async function put(request: APIRequestContext, path: string, data: Record<string, any>) {
  54  |   const response = await request.put(`${apiBase}${path}`, { 
  55  |     data,
  56  |     headers: { 'X-User-Id': testUserId, 'X-Tenant-Id': '1' }
  57  |   })
  58  |   expect(response.ok()).toBeTruthy()
  59  |   return response.json()
  60  | }
  61  | 
  62  | async function get(request: APIRequestContext, path: string) {
  63  |   const response = await request.get(`${apiBase}${path}`, {
  64  |     headers: { 'X-User-Id': testUserId, 'X-Tenant-Id': '1' }
  65  |   })
  66  |   expect(response.ok()).toBeTruthy()
  67  |   return response.json()
  68  | }
  69  | 
  70  | export async function ensureSettingOption(
  71  |   request: APIRequestContext,
  72  |   category: string,
  73  |   value: string,
  74  |   label = value,
  75  | ) {
  76  |   const options = await get(request, `/settings/options?category=${encodeURIComponent(category)}`)
  77  |   const existing = Array.isArray(options)
  78  |     ? options.find((option: Record<string, any>) => option.value === value || option.label === label)
  79  |     : null
  80  |   if (existing) return existing
  81  |   return post(request, '/settings/options', { category, value, label })
  82  | }
  83  | 
  84  | export async function resetBrowserState(page: Page) {
  85  |   const testResetToken = `pw-reset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  86  |   const testUserId = process.env.USER_ID || 'haewon.kim'
  87  |   
  88  |   const cleanState = {
  89  |     savedViews: [],
  90  |     activeViewId: null,
  91  |     favoriteIds: [],
  92  |     watchIds: [],
  93  |     uiState: {
  94  |       activeTab: 'active',
  95  |       fontSize: 11,
  96  |       rowDensity: 8,
  97  |       hiddenColumns: [],
  98  |       quickFilters: { status: [], severity: [], platform: [], owner: [] },
  99  |       groupBy: 'raw',
  100 |       showFilterBar: true,
  101 |       columnLayoutState: [],
  102 |       lastVisitedAt: 0,
  103 |       searchTerm: '',
  104 |     }
  105 |   }
  106 | 
  107 |   // Clear backend user settings
  108 |   try {
  109 |     await page.request.post(`${apiBase}/settings/user/settings`, {
  110 |       data: {
  111 |         monitoring_workspace_state_v2: cleanState,
  112 |         asset_real_workspace_state_v1: cleanState,
  113 |         network_workspace_state_v1: cleanState,
  114 |         services_workspace_state_v1: cleanState,
  115 |         vendor_workspace_state_v1: cleanState,
  116 |         monitoring_ui_state: null,
  117 |         asset_ui_state: null,
  118 |         project_ui_state: null,
  119 |         far_ui_state: null,
  120 |         rca_ui_state: null,
  121 |         investigation_ui_state: null,
  122 |         settings_ui_state: null,
  123 |       },
  124 |       headers: {
  125 |         'X-User-Id': testUserId
  126 |       }
  127 |     })
  128 |   } catch (e) {
  129 |     console.error('Failed to clear backend settings:', e)
  130 |   }
  131 | 
  132 |   // Direct clean up of localStorage and sessionStorage on the app origin
  133 |   try {
  134 |     await page.goto('/')
  135 |     await page.evaluate(() => {
  136 |       const keysToRemove = Object.keys(window.localStorage).filter((key) => (
  137 |         key.startsWith('sysgrid_') || key.startsWith('SYSGRID_') || key.startsWith('__sysgrid_')
  138 |       ))
  139 |       keysToRemove.forEach((key) => window.localStorage.removeItem(key))
  140 |       Object.keys(window.sessionStorage)
  141 |         .filter((key) => key.startsWith('sysgrid_') || key.startsWith('__sysgrid_'))
  142 |         .forEach((key) => window.sessionStorage.removeItem(key))
  143 |     })
  144 |   } catch (e) {
  145 |     // ignore
```