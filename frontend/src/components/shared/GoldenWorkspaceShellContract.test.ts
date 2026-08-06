import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8')

const views = [
  ['MonitoringGrid.tsx', 'table'],
  ['AssetReal.tsx', 'table'],
  ['ServicesReal.tsx', 'table'],
  ['External.tsx', 'table'],
  ['NetworkReal.tsx', 'hybrid'],
  ['FAR.tsx', 'analytical'],
  ['Research.tsx', 'analytical'],
  ['vendors/VendorGoldenOperationalWorkspace.tsx', 'table'],
] as const

describe('Golden workspace shell contract', () => {
  it('seals the shared shell and grid with machine-readable ownership markers', () => {
    const shell = read('shared/OperationalWorkspaceShells.tsx')
    expect(shell).toContain('data-golden-workspace-shell="true"')
    expect(shell).toContain('data-golden-archetype={archetype}')
    expect(shell).toContain('data-golden-grid-surface="true"')
    expect(shell).toContain("variant?: 'golden' | 'attached-panel'")
  })

  it.each(views)('%s declares the approved archetype and avoids local golden-grid reconstruction', (file, archetype) => {
    const source = read(file)
    expect(source).toContain(`archetype="${archetype}"`)
    expect(source).not.toContain('className="monitoring-grid-shell monitoring-grid')
    expect(source).not.toContain('AgGridReact')
  })

  it('permits attached-panel geometry only through the shared named variant', () => {
    const far = read('FAR.tsx')
    expect(far).not.toContain('surfaceVariant="attached-panel"')
    expect(far).not.toContain('rounded-t-none border-x border-b border-white/5')
  })
})
