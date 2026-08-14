import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const farPath = resolve(process.cwd(), 'src/components/FAR.tsx')
const controlsPath = resolve(process.cwd(), 'src/components/FARGoldenWorkspaceControls.tsx')
const farSource = readFileSync(farPath, 'utf8')
const controlsSource = readFileSync(controlsPath, 'utf8')

describe('FAR archived workspace read-only integrity', () => {
  it('propagates Archived scope into the golden workspace controls', () => {
    expect(farSource).toContain("readOnly: lifecycleScope === 'archived'")
    expect(controlsSource).toContain('readOnly: boolean')
  })

  it('disables only FAR data/config mutation entry points while Archived', () => {
    expect(controlsSource).toContain('<ToolbarIconButton onClick={onSettings} disabled={readOnly} title="Matrix Registry Enums">')
    expect(controlsSource).toContain('<ToolbarButton onClick={onImport} disabled={readOnly} title="Import Bulk Risk Data">')
    expect(controlsSource).toContain('<ToolbarButton variant="primary" onClick={onAdd} disabled={readOnly} ariaLabel="Add Failure Mode">')
    expect(controlsSource).toContain('<ToolbarIconButton onClick={onExport} title="Export CSV">')
    expect(controlsSource).toContain('active={showFilterBar}')
    expect(controlsSource).toContain('active={showInsights}')
  })

  it('keeps both changed TSX files syntactically valid', () => {
    for (const [path, source] of [[farPath, farSource], [controlsPath, controlsSource]] as const) {
      const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      expect(parsed.parseDiagnostics, `${path} parse diagnostics`).toHaveLength(0)
    }
  })
})
