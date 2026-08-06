import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const componentsRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(componentsRoot, '../../..')
const readComponent = (relative: string) => fs.readFileSync(path.join(componentsRoot, relative), 'utf8')
const readRepo = (relative: string) => fs.readFileSync(path.join(repoRoot, relative), 'utf8')

const views = [
  { file: 'MonitoringGrid.tsx', key: 'monitoring', route: '/monitoring', archetype: 'table', definitionArchetype: 'table' },
  { file: 'assets/AssetGoldenShellScaffold.tsx', key: 'assets', route: '/asset', archetype: 'table', definitionArchetype: 'table' },
  { file: 'ServicesReal.tsx', key: 'services', route: '/services', archetype: 'table', definitionArchetype: 'table' },
  { file: 'External.tsx', key: 'external', route: '/external', archetype: 'table', definitionArchetype: 'table' },
  { file: 'NetworkReal.tsx', key: 'network', route: '/network', archetype: 'hybrid', definitionArchetype: 'topology_hybrid' },
  { file: 'FAR.tsx', key: 'far', route: '/far', archetype: 'analytical', definitionArchetype: 'investigation' },
  { file: 'Research.tsx', key: 'research', route: '/research', archetype: 'analytical', definitionArchetype: 'research' },
  { file: 'vendors/VendorGoldenOperationalWorkspace.tsx', key: 'vendors', route: '/vendors', archetype: 'table', definitionArchetype: 'table' },
] as const

describe('Golden workspace shell contract', () => {
  it('seals workspace identity and archetype as required shared-shell inputs', () => {
    const shell = readComponent('shared/OperationalWorkspaceShells.tsx')
    expect(shell).toContain('workspace: GoldenWorkspaceKey')
    expect(shell).toContain('archetype: GoldenWorkspaceArchetype')
    expect(shell).not.toContain('workspace?: string')
    expect(shell).not.toContain('archetype?: GoldenWorkspaceArchetype')
    expect(shell).toContain('data-golden-workspace-shell="true"')
    expect(shell).toContain('data-golden-archetype={archetype}')
    expect(shell).toContain('data-golden-grid-surface="true"')
  })

  it.each(views)('$file declares exact workspace identity, archetype, route, and avoids local grid reconstruction', (view) => {
    const source = readComponent(view.file)
    const app = readRepo('frontend/src/App.tsx')
    const backend = readRepo('backend/app/api/workspaces.py')
    const routeMatrix = readRepo('frontend/tests/helpers/routeMatrix.ts')

    expect(source).toContain(`workspace="${view.key}"`)
    expect(source).toContain(`archetype="${view.archetype}"`)
    expect(source).not.toContain('className="monitoring-grid-shell monitoring-grid')
    expect(source).not.toContain('AgGridReact')
    expect(app).toContain(`<Route path="${view.route}"`)
    expect(backend).toContain(`"${view.key}", "${view.route}", "${view.definitionArchetype}"`)
    expect(routeMatrix).toContain(`key: '${view.key}', path: '${view.route}'`)
  })

  it('contains no stale plural Assets route in active source or tests', () => {
    expect(readRepo('frontend/src/App.tsx')).not.toContain('path="/assets"')
    expect(readRepo('backend/app/api/workspaces.py')).not.toContain('"assets", "/assets"')
    expect(readRepo('frontend/tests/sentinel_comprehensive.spec.ts')).not.toContain("'/assets'")
    expect(readRepo('frontend/tests/sentinel_smoke.spec.ts')).not.toContain("'/assets'")
  })
})
