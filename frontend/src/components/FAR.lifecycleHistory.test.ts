import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const farPath = resolve(process.cwd(), 'src/components/FAR.tsx')
const historyPath = resolve(process.cwd(), 'src/components/FARVersionHistory.tsx')
const schemaPath = resolve(process.cwd(), '../backend/app/schemas/schemas.py')
const farSource = readFileSync(farPath, 'utf8')
const historySource = readFileSync(historyPath, 'utf8')
const schemaSource = readFileSync(schemaPath, 'utf8')

describe('FAR lifecycle and version-history completion', () => {
  it('loads authoritative lifecycle truth and exposes an Active / Archived scope', () => {
    expect(farSource).toContain('/api/v1/far/modes?include_deleted=true')
    expect(farSource).toContain('HeaderScopeSwitch')
    expect(farSource).toContain("useState<'active' | 'archived'>('active')")
    expect(farSource).toContain("mode.is_deleted ? 'archived' : 'active'")
  })

  it('uses the existing archive/restore backend without introducing purge', () => {
    expect(farSource).toContain('/api/v1/far/modes/bulk-delete')
    expect(farSource).toContain('/api/v1/far/modes/bulk-restore')
    expect(farSource).toContain("action: 'restore'")
    expect(farSource).not.toContain('/api/v1/far/modes/bulk-purge')
  })

  it('keeps version history distinct from research history and lifecycle', () => {
    expect(farSource).toContain("{ id: 'versions', label: 'Version History'")
    expect(farSource).toContain("{ id: 'history', label: 'Research History'")
    expect(historySource).toContain("onUpdate('refresh')")
    expect(historySource).toContain('/restore/${version}')
    expect(historySource).toContain('Content restores preserve the independent Active / Archived lifecycle.')
  })

  it('exposes lifecycle/version fields and strips them from editable payloads', () => {
    expect(schemaSource).toContain('is_deleted: bool = False')
    expect(schemaSource).toContain('version: int = 1')
    expect(farSource).toContain('delete payload.version;')
    expect(farSource).toContain('delete payload.is_deleted;')
  })

  it('keeps the changed TSX and Python source syntactically valid', () => {
    for (const [path, source] of [[farPath, farSource], [historyPath, historySource]] as const) {
      const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      expect(parsed.parseDiagnostics, `${path} parse diagnostics`).toHaveLength(0)
    }
    const python = spawnSync('python3', ['-c', 'import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text())', schemaPath], { encoding: 'utf8' })
    expect(python.status, python.stderr).toBe(0)
  })
})
