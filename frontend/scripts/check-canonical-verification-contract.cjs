const fs = require('fs')
const path = require('path')

const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const readRepo = (relative) => fs.readFileSync(path.resolve(repoRoot, relative), 'utf8')
const failures = []
const requireText = (source, needle, label) => {
  if (!source.includes(needle)) failures.push(label)
}

const verify = readRepo('scripts/verify-app.sh')
const playwrightConfig = readRepo('frontend/playwright.config.ts')
const helper = readRepo('frontend/tests/helpers/sysgrid.ts')
const fixture = readRepo('frontend/tests/helpers/sysgrid-test.ts')
const apiClient = readRepo('frontend/src/api/apiClient.ts')
const tenantSelector = readRepo('frontend/src/components/shared/TenantSelector.tsx')
const backendMain = readRepo('backend/app/main.py')
const monitoring = readRepo('frontend/src/components/MonitoringGrid.tsx')
const operationalStatus = readRepo('frontend/src/components/shared/OperationalDataStatus.tsx')
const externalDiagnostics = readRepo('frontend/src/components/settings/externalExportDiagnostics.ts')
const assetsVendorsBulk = readRepo('frontend/tests/assets-vendors-bulk-preview.spec.ts')
const emptyStates = readRepo('frontend/tests/view-empty-states.spec.ts')
const deeplinks = readRepo('frontend/tests/view-deeplink-matrix.spec.ts')
const shellSearch = readRepo('frontend/tests/shell-and-search.spec.ts')
const sentinel = readRepo('frontend/tests/sentinel_comprehensive.spec.ts')
const blankSlate = readRepo('frontend/tests/blank-slate-audit.spec.ts')
const seeded = readRepo('frontend/tests/golden-eight-seeded-visual-matrix.spec.ts')
const sentinelHelper = readRepo('frontend/tests/helpers/sentinel.ts')
const deviceApi = readRepo('backend/app/api/devices.py')
const deviceBulkTests = readRepo('backend/test_asset_vendor_bulk_workflows.py')
const importWorkflowTests = readRepo('backend/test_import_workflows.py')

if (/\\\s*\n\s*#/.test(verify)) failures.push('verify-app.sh contains a comment after a backslash continuation')
requireText(verify, 'PLAYWRIGHT_ENV_COMMAND=(', 'verify-app.sh must construct the Playwright environment as an array')
requireText(verify, '"SYSGRID_CANONICAL_GATE=1"', 'verify-app.sh must enable canonical-gate mode')
requireText(verify, '"SYSGRID_EXPECTED_FRONTEND_ORIGIN=$FRONTEND_ORIGIN"', 'verify-app.sh must declare the expected frontend origin')
requireText(verify, '"SYSGRID_EXPECTED_API_BASE=$BACKEND_ORIGIN/api/v1"', 'verify-app.sh must declare the expected API base')
requireText(verify, 'assert_local_playwright_runtime', 'verify-app.sh must verify the exact local Playwright package identity before expensive application verification')
requireText(verify, "require('./node_modules/@playwright/test/package.json').version", 'verify-app.sh must inspect the local @playwright/test version')
requireText(verify, "require('./node_modules/playwright/package.json').version", 'verify-app.sh must inspect the local Playwright runner version')
requireText(verify, '"${PLAYWRIGHT_ENV_COMMAND[@]}" "$FRONTEND_DIR/node_modules/.bin/playwright" test "${specs[@]}" --workers="$PLAYWRIGHT_WORKERS"', 'verify-app.sh must execute each canonical Playwright group through the exact local runner and environment array')
requireText(verify, 'split_playwright_specs', 'verify-app.sh must split affected promotion specs from the non-duplicated remaining canonical suite')
requireText(verify, 'REMAINING_SPECS', 'verify-app.sh must retain every non-promoted canonical spec for final acceptance')
requireText(verify, 'PLAYWRIGHT_WORKERS=1', 'verify-app.sh must preserve single-worker shared-tenant Playwright safety')
requireText(verify, 'cancel_heavy_validation_lanes', 'verify-app.sh must cancel independent expensive lanes after a deterministic affected-browser failure')
requireText(verify, 'verify_accelerator.py', 'verify-app.sh must bind the universal resource and impact planner')
if (verify.includes('npx playwright')) failures.push('Canonical Playwright must not use npx or permit network package substitution')
requireText(verify, 'run_validation_lanes', 'verify-app.sh must run independent static, backend, and frontend lanes concurrently')
requireText(verify, 'emit_progress static_started', 'verify-app.sh must publish static-lane progress')
requireText(verify, 'emit_progress backend_started', 'verify-app.sh must publish backend-lane progress')
requireText(verify, 'emit_progress frontend_started', 'verify-app.sh must publish frontend-lane progress')
requireText(verify, 'emit_progress playwright_started', 'verify-app.sh must publish Playwright progress')
requireText(verify, 'npm run test:coverage -- --maxWorkers "$FRONTEND_WORKERS"', 'verify-app.sh must consume the bounded frontend worker budget')
requireText(verify, 'VITE_API_BASE_URL="$BACKEND_ORIGIN" VITE_FRONTEND_ORIGIN="$FRONTEND_ORIGIN" npm run build', 'verify-app.sh must bind the production build to the canonical runtime')
requireText(verify, 'local vite_bin="$FRONTEND_DIR/node_modules/.bin/vite"', 'verify-app.sh must own the isolated production frontend through the direct Vite executable')
requireText(verify, '"$vite_bin" preview --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" --strictPort', 'verify-app.sh must serve the exact production build through direct Vite ownership')
requireText(verify, 'wait_for_listener "$FRONTEND_PORT" "isolated production frontend"', 'verify-app.sh must prove the isolated production frontend listener before HTTP readiness')
requireText(verify, 'wait_for_http "$FRONTEND_URL" "isolated production frontend"', 'verify-app.sh must prove isolated production frontend HTTP readiness')
requireText(verify, "curl --noproxy '*' --connect-timeout 1 --max-time 3 -fsS \"$url\"", 'verify-app.sh must bypass proxies and bound loopback HTTP probes')
requireText(verify, 'readiness_diagnostics', 'verify-app.sh must capture deterministic readiness diagnostics')
requireText(verify, 'launch_frontend_with_readiness', 'verify-app.sh must use the bounded frontend readiness launch path')
if (verify.includes('npm run preview --')) failures.push('verify-app.sh must not restore the npm preview wrapper')
if (/^\s*npm run check:shell-contracts\s*$/m.test(verify)) failures.push('verify-app.sh must not run the shell contract twice')
if (verify.includes('npm run dev --')) failures.push('verify-app.sh must not validate a development server after production build')
requireText(verify, 'assert_canonical_runtime_evidence', 'verify-app.sh must validate runtime-binding evidence')
requireText(verify, 'assert_populated_golden_eight_evidence', 'verify-app.sh must validate all populated Golden Eight screenshots')
requireText(verify, 'TENANTS_JSON="$tenants"', 'verify-app.sh must pass final tenant JSON independently of the Python heredoc stdin')
requireText(verify, 'curl -fsS -D - -o /dev/null', 'verify-app.sh must use a real GET when checking tenant response headers')

const canonicalSpecs = [
  'tests/sentinel_comprehensive.spec.ts',
  'tests/blank-slate-audit.spec.ts',
  'tests/external-services-bulk-preview.spec.ts',
  'tests/assets-vendors-bulk-preview.spec.ts',
  'tests/shell-and-search.spec.ts',
  'tests/golden-eight-seeded-visual-matrix.spec.ts',
  'tests/view-deeplink-matrix.spec.ts',
  'tests/view-empty-states.spec.ts',
]
for (const spec of canonicalSpecs) {
  if (!verify.includes(spec)) failures.push(`verify-app.sh is missing canonical spec ${spec}`)
  if (!fs.existsSync(path.resolve(frontendRoot, spec))) failures.push(`canonical spec does not exist: ${spec}`)
}

requireText(playwrightConfig, "const canonicalGate = process.env.SYSGRID_CANONICAL_GATE === '1'", 'Playwright config must recognize canonical-gate mode')
requireText(playwrightConfig, "throw new Error('Canonical SysGrid gate requires explicit frontend and API runtime bindings')", 'Playwright config must fail closed on missing canonical bindings')
requireText(playwrightConfig, "video: 'off'", 'Canonical Playwright must avoid unconditional video recording overhead')
if (playwrightConfig.includes("video: 'retain-on-failure'")) failures.push('Canonical Playwright must not record every test before deleting passing videos')
requireText(helper, 'Canonical API request escaped the isolated runtime', 'test API resolver must reject escaped canonical requests')
requireText(helper, 'options: { tenantId?: string; userId?: string } = {}', 'browser reset must support explicit tenant and user isolation')
requireText(helper, "request.post(`${apiBase}/tenants/select`", 'browser reset must synchronize the server-selected tenant before navigation')
requireText(helper, 'selectAndVerifyTestTenant', 'browser reset must select and verify its tenant before navigation')
requireText(helper, 'Failed to clear backend settings for tenant', 'browser reset must fail closed when backend state cleanup fails')
if (apiClient.includes('getExplicitTenantOverride') || apiClient.includes("localStorage.getItem('SYSGRID_TENANT_ID')")) failures.push('apiClient must never derive product tenant routing from browser storage')
requireText(apiClient, 'x-sysgrid-tenant-id', 'apiClient must consume the authoritative tenant response header')
requireText(apiClient, 'TENANT_CONTEXT_CHANGED_EVENT', 'apiClient must fail closed when the effective tenant changes mid-view')
requireText(tenantSelector, 'clearLegacyTenantBrowserState()', 'tenant selection must clear stale browser tenant routing before reload')
requireText(tenantSelector, 'SYSGRID_TENANT_SELECTION_REVISION', 'tenant selection must notify other open tabs')
requireText(tenantSelector, 'data-testid="active-tenant-name"', 'tenant selector must expose the authoritative active tenant for runtime proof')
for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
  requireText(fixture, `request.${method}(resolveTestApiUrl(path)`, `sysApi.${method} must resolve through the canonical API guard`)
}
requireText(sentinel, "testInfo.outputPath('canonical-runtime-binding.json')", 'runtime sentinel must emit canonical binding evidence')
requireText(sentinel, 'observedApiOrigins', 'runtime sentinel must observe browser API traffic')
requireText(blankSlate, "sysApi.post('/tenants/admin/create'", 'blank-slate audit must create a real tenant through the authoritative endpoint')
requireText(blankSlate, 'expect(createTenant.ok()).toBeTruthy()', 'blank-slate audit must verify tenant creation')
requireText(blankSlate, 'resetBrowserState(page, { tenantId: emptyTenantId', 'blank-slate audit must bootstrap the browser with the created tenant')
requireText(fixture, 'canonicalTenantGuard: [async', 'every canonical test must have an automatic tenant isolation guard')
requireText(fixture, 'await selectAndVerifyTestTenant(request, testTenantId, testUserId);\n      await use();', 'canonical tenant guard must establish the tenant before each test')
requireText(fixture, 'finally {\n      try {\n        await selectAndVerifyTestTenant(request, testTenantId, testUserId);', 'canonical tenant guard must restore the tenant after every test, including failures')
requireText(seeded, "`${route.key}-populated-desktop.png`", 'populated matrix must use route-labeled evidence filenames')
requireText(seeded, "getByTestId('active-tenant-name')", 'populated matrix must prove the displayed tenant matches the seeded tenant')
requireText(seeded, 'const tenantResponsePromise = page.waitForResponse', 'populated matrix must register the tenant response boundary before navigation')
requireText(seeded, "response.headers()['x-sysgrid-tenant-id'] === testTenantId", 'populated matrix must await an exact tenant-stamped response')
requireText(seeded, 'const tenantResponse = await tenantResponsePromise', 'populated matrix must await the tenant response before evaluating evidence')
requireText(sentinelHelper, "'ResizeObserver loop completed with undelivered notifications.'", 'strict monitoring must classify only the exact known ResizeObserver diagnostic')
requireText(sentinelHelper, '[known-browser-diagnostic]', 'known browser diagnostics must remain visible in test evidence')
if (sentinelHelper.includes("includes('ResizeObserver')") || sentinelHelper.includes('includes("ResizeObserver")')) failures.push('strict monitoring must not broadly suppress ResizeObserver errors')


requireText(backendMain, 'X-SysGrid-Tenant-Id', 'backend must identify the effective tenant on every tenant-routed response')
requireText(backendMain, 'f"{ROUND_TRIP_EXPOSE_HEADERS}, X-SysGrid-Tenant-Id"', 'round-trip exports must expose the authoritative tenant header without weakening their exact header contract')
requireText(importWorkflowTests, '"x-sysgrid-tenant-id"', 'backend round-trip tests must lock tenant-header exposure')
for (const [name, source] of [
  ['Monitoring diagnostics', monitoring],
  ['Operational diagnostics', operationalStatus],
  ['External diagnostics', externalDiagnostics],
]) {
  if (source.includes("localStorage.getItem('SYSGRID_TENANT_ID')") || source.includes("|| '1'")) {
    failures.push(`${name} must not report a guessed tenant id from browser storage`)
  }
}
if (helper.includes("console.error('Failed to clear backend settings:'") || helper.includes('// ignore')) failures.push('canonical browser reset must not ignore state-cleanup failures')
if (helper.includes(".catch(() => [])")) failures.push('canonical seed helpers must not convert API failures into empty fixture lists')
if (emptyStates.includes('.catch(() => {})')) failures.push('canonical empty-state proof must not ignore interaction failures')
if (deeplinks.includes('waitForTimeout(')) failures.push('canonical deep-link proof must use state assertions rather than fixed sleeps')
if (shellSearch.includes('waitForTimeout(250)')) failures.push('canonical API inventory must await observed responses rather than use a fixed sleep')
requireText(assetsVendorsBulk, 'assetsBeforeResponse.ok()', 'Assets bulk proof must fail at the authoritative API read boundary')
requireText(assetsVendorsBulk, 'vendorsBeforeResponse.ok()', 'Vendors bulk proof must fail at the authoritative API read boundary')

const dryRunReturn = deviceApi.indexOf('if dry_run or not changed_ids:')
const firstMutation = deviceApi.indexOf('if action == "update":', dryRunReturn + 1)
if (dryRunReturn < 0 || firstMutation < 0 || dryRunReturn > firstMutation) {
  failures.push('asset bulk API must return dry-run evidence before any mutation branch')
}
requireText(deviceBulkTests, '"dry_run": True', 'backend bulk tests must exercise dry-run mode')
requireText(deviceBulkTests, '== ["Production", "Production"]', 'backend bulk tests must prove asset preview does not mutate')

const staleRoute = /['"]\/assets(?:['"?])/
const defaultRuntime = /(?:127\.0\.0\.1|localhost):(?:5173|8000)/
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(directory, entry.name)
  return entry.isDirectory() ? walk(absolute) : [absolute]
})
for (const file of walk(path.resolve(frontendRoot, 'tests')).filter((file) => file.endsWith('.spec.ts'))) {
  const source = fs.readFileSync(file, 'utf8')
  const relative = path.relative(frontendRoot, file)
  if (staleRoute.test(source)) failures.push(`${relative} contains stale /assets routing`)
  if (defaultRuntime.test(source)) failures.push(`${relative} hard-codes a development runtime`)
}
for (const spec of canonicalSpecs) {
  const source = fs.readFileSync(path.resolve(frontendRoot, spec), 'utf8')
  if (/\.catch\(\(\) => \{?\}?\)/.test(source)) failures.push(`${spec} swallows an interaction or assertion failure`)
  if (/waitForTimeout\(/.test(source)) failures.push(`${spec} uses a fixed sleep instead of an observable state boundary`)
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}
console.log('Canonical verification contract validated: runtime, routing, fixtures, bulk dry-run, suite, and evidence are fail-closed.')
