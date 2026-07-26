import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { buildReport, importClosure, routeEvidence, scanSignals } from './monitoring-master-goldenization-audit.mjs'

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
