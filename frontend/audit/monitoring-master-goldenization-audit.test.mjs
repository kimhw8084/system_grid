import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { buildReport, classify, importClosure, routeEvidence, scanSignals } from './monitoring-master-goldenization-audit.mjs'

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sysgrid-golden-audit-'))
  const source = path.join(root, 'frontend', 'src')
  fs.mkdirSync(path.join(source, 'components', 'shared'), { recursive: true })
  fs.writeFileSync(path.join(source, 'App.tsx'), `import MonitoringGrid from './components/MonitoringGrid'\nimport VendorsReal from './components/VendorsReal'\n<Route path="/monitoring" element={<MonitoringGrid />} />\n<Route path="/vendors" element={<VendorsReal />} />\n`)
  fs.writeFileSync(path.join(source, 'components', 'MonitoringGrid.tsx'), `import './shared/golden'\nexport default function MonitoringGrid(){return <div data-workspace="monitoring" role="treegrid"/>}`)
  fs.writeFileSync(path.join(source, 'components', 'VendorsReal.tsx'), `import './shared/golden'\nexport default function VendorsReal(){return <div data-workspace="vendors" role="treegrid"/>}`)
  fs.writeFileSync(path.join(source, 'components', 'shared', 'golden.tsx'), `export const x = 'OperationalWorkspaceShell WorkspaceCommandBar Views Display OperationalRowActionMenu Bulk Actions WorkspaceFlyout WorkspaceModal dirty OperationalDataState ImportModal Export CSV localStorage'`)
  return root
}

test('follows transitive local imports and detects shared golden signals', () => {
  const root = fixture()
  const entry = path.join(root, 'frontend', 'src', 'components', 'MonitoringGrid.tsx')
  const files = importClosure(entry, path.join(root, 'frontend', 'src'))
  assert.equal(files.length, 2)
  const signals = scanSignals(files)
  assert.equal(signals.shell, true)
  assert.equal(signals.commandBar, true)
  assert.equal(signals.importExport, true)
})

test('requires the configured component on the configured route', () => {
  const app = `import VendorsReal from './components/VendorsReal'\n<Route path="/vendors" element={<VendorsReal />} />`
  assert.deepEqual(routeEvidence(app, { route: '/vendors', routeComponent: 'VendorsReal' }), {
    routeLiteralPresent: true,
    routeComponentPresent: true,
    componentImportPresent: true,
  })
  assert.equal(routeEvidence(app, { route: '/vendors', routeComponent: 'Vendor' }).routeComponentPresent, false)
})

test('builds an eight-view report and keeps visual/domain proof partial without runtime evidence', () => {
  const root = fixture()
  const config = {
    master: { key: 'monitoring', label: 'Monitoring', route: '/monitoring', heading: 'Monitoring', routeComponent: 'MonitoringGrid', source: 'frontend/src/components/MonitoringGrid.tsx', archetype: 'table', searchPlaceholders: [], preferredPanelActions: [], preferredModalActions: [], domainMustPreserve: [] },
    targets: [{ key: 'vendors', label: 'Vendors', route: '/vendors', heading: 'Vendors', routeComponent: 'VendorsReal', source: 'frontend/src/components/VendorsReal.tsx', archetype: 'table', searchPlaceholders: [], preferredPanelActions: [], preferredModalActions: [], domainMustPreserve: [] }],
    acceptanceCategories: ['route-and-source-wiring', 'domain-preservation', 'responsive-layout'],
    implementationOrder: [],
  }
  const report = buildReport({ repoRoot: root, config, runtimeDir: null })
  assert.equal(report.views.length, 2)
  assert.equal(report.views[1].classification['route-and-source-wiring'], 'PARTIAL')
  assert.equal(report.views[1].classification['domain-preservation'], 'FAIL')
})


test('accepts configured domain-specific search text when the search actually filters', () => {
  const target = { archetype: 'table', searchPlaceholders: ['Search services, hosts, or metadata...'] }
  const source = { route: { routeLiteralPresent: true, routeComponentPresent: true, componentImportPresent: true }, files: ['x'], signals: { shell: true, commandBar: true, savedViews: true, display: true, grid: true, rowActions: true, bulk: true, flyout: true, modal: true, dirty: true, lifecycle: true, importExport: true } }
  const runtime = { routeLoaded: true, seeded: { headingVisible: true, placeholders: ['Search services, hosts, or metadata...'], buttons: ['Views', 'Display', 'Import'], filteredToSeed: true, treegridCount: 1, rowCount: 1, selectionCheckboxCount: 1, domainSeedCreated: true }, panelProbe: { verified: true }, modalProbe: { verified: true, closedBeforeResponsive: true }, blank: { captured: true, headingVisible: true, tenant: { backendSelected: true, activeLabelVerified: true } }, constrained: { captured: true, baseSurfaceClean: true, modalClosedBeforeCapture: true, tenant: { activeLabelVerified: true } } }
  assert.equal(classify(target, source, runtime)['search-filter-saved-display'], 'PASS')
})

test('does not accept click success as floating-panel proof without a verified surface transition', () => {
  const target = { archetype: 'table', searchPlaceholders: [] }
  const source = { route: { routeLiteralPresent: true, routeComponentPresent: true, componentImportPresent: true }, files: ['x'], signals: { shell: true, commandBar: true, savedViews: true, display: true, grid: true, rowActions: true, bulk: true, flyout: true, modal: true, dirty: true, lifecycle: true, importExport: true } }
  const runtime = { routeLoaded: true, seeded: { headingVisible: true, placeholders: [], buttons: ['Views', 'Display', 'Import'], treegridCount: 1, rowCount: 1, selectionCheckboxCount: 1, domainSeedCreated: true }, panelProbe: { opened: true, verified: false }, modalProbe: { verified: true, closedBeforeResponsive: true }, blank: { captured: true, headingVisible: true, tenant: { backendSelected: true, activeLabelVerified: true } }, constrained: { captured: true, baseSurfaceClean: true, modalClosedBeforeCapture: true, tenant: { activeLabelVerified: true } } }
  assert.equal(classify(target, source, runtime)['floating-panels'], 'FAIL')
})

test('rejects responsive evidence contaminated by an open modal', () => {
  const target = { archetype: 'custom', searchPlaceholders: [] }
  const source = { route: { routeLiteralPresent: true, routeComponentPresent: true, componentImportPresent: true }, files: ['x'], signals: { shell: true, commandBar: true, workspaceMarker: true, flyout: true, modal: true, dirty: true, lifecycle: true } }
  const runtime = { routeLoaded: true, seeded: { headingVisible: true, workspaceMarkers: ['research'], domainSeedCreated: true }, panelProbe: { verified: true }, modalProbe: { verified: true, closedBeforeResponsive: false }, blank: { captured: true, headingVisible: true, tenant: { backendSelected: true, activeLabelVerified: true } }, constrained: { captured: true, baseSurfaceClean: false, modalClosedBeforeCapture: false, tenant: { activeLabelVerified: true } } }
  assert.equal(classify(target, source, runtime)['responsive-layout'], 'FAIL')
})


test('uses isolated target-specific seeds instead of the broad operational scenario', () => {
  const spec = fs.readFileSync(new URL('./monitoring-master-goldenization.spec.ts', import.meta.url), 'utf8')
  assert.equal(spec.includes('seedOperationalScenario'), false)
  assert.match(spec, /postAuditJson<\{ id: number; title: string \}>\(request, '\/monitoring'/)
  assert.match(spec, /severity: 'Warning'/)
  assert.match(spec, /owners: \[\]/)
  assert.match(spec, /`\$\{label\} failed: POST \$\{url\} -> \$\{response.status\(\)\}/)
})

test('does not mutate code-managed Monitoring category settings during isolated seeding', () => {
  const spec = fs.readFileSync(new URL('./monitoring-master-goldenization.spec.ts', import.meta.url), 'utf8')
  assert.equal(spec.includes("ensureSettingOption(request, 'MonitoringCategory'"), false)
  assert.match(spec, /postAuditJson<\{ id: number; title: string \}>\(request, '\/monitoring'/)
  assert.match(spec, /category: 'Hardware'/)
})


test('counts only real portaled Views and Display overlays as workspace panels', () => {
  const spec = fs.readFileSync(new URL('./monitoring-master-goldenization.spec.ts', import.meta.url), 'utf8')
  assert.match(spec, /WORKSPACE_PANEL_SELECTOR = '\[data-workspace-panel\], body > \.views-menu-container, body > \.display-menu-container, body > \.bulk-menu-container'/)
  assert.equal(spec.includes("[data-workspace-panel], .views-menu-container"), false)
  assert.match(spec, /visibleWorkspacePanelCount: await visibleCount\(workspacePanelLocator\(page\)\)/)
})

test('treats a surface as closed when its visible count returns to the pre-open baseline', () => {
  const spec = fs.readFileSync(new URL('./monitoring-master-goldenization.spec.ts', import.meta.url), 'utf8')
  assert.match(spec, /baselineCount: number/)
  assert.match(spec, /expectedSurfaceCount\(page, expected\) <= baselineCount/)
  assert.equal(spec.includes('expectedSurfaceCount(page, expected) === 0'), false)
})

test('passes the probe baseline through bounded teardown and route-reload verification', () => {
  const spec = fs.readFileSync(new URL('./monitoring-master-goldenization.spec.ts', import.meta.url), 'utf8')
  assert.match(spec, /waitForSurfaceClosed\(page, expected, probe\.beforeCount\)/)
  assert.match(spec, /waitForSurfaceClosed\(page, expected, probe\.beforeCount, 2_000\)/)
})

test('uses bounded target-specific teardown with deterministic route reload fallback', () => {
  const spec = fs.readFileSync(new URL('./monitoring-master-goldenization.spec.ts', import.meta.url), 'utf8')
  assert.match(spec, /click\(\{ timeout: 1_200, force: true \}\)/)
  assert.match(spec, /page\.goto\(route, \{ waitUntil: 'domcontentloaded', timeout: 8_000 \}\)/)
  assert.match(spec, /probe\.closeMethod = 'route-reload'/)
  assert.equal(spec.includes("page.locator('.glass-panel:visible')"), false)
})

test('asserts teardown immediately and proves expected surfaces are absent from responsive evidence', () => {
  const spec = fs.readFileSync(new URL('./monitoring-master-goldenization.spec.ts', import.meta.url), 'utf8')
  assert.match(spec, /expect\(panelProbe\.closedBeforeModal/)
  assert.match(spec, /expect\(modalProbe\.closedBeforeResponsive/)
  assert.match(spec, /expectedPanelSurfaceCount === 0/)
  assert.match(spec, /expectedModalSurfaceCount === 0/)
})
