import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const farPath = resolve(process.cwd(), 'src/components/FAR.tsx')
const farSource = readFileSync(farPath, 'utf8')

describe('FAR archived read-only integrity', () => {
  it('passes archived lifecycle state into every mutable detail domain surface', () => {
    expect(farSource).toContain("<CausalTab mode={mode} readOnly={Boolean(mode.is_deleted)}")
    expect(farSource).toContain("<RoadmapTab mode={mode} readOnly={Boolean(mode.is_deleted)}")
    expect(farSource).toContain("<HistoryTab mode={mode} readOnly={Boolean(mode.is_deleted)}")
    expect(farSource).toContain("activeTab === 'versions' && <FARVersionHistory mode={mode} onUpdate={onUpdate} />")
  })

  it('guards causal, roadmap, and research mutation entry points while preserving inspection', () => {
    expect(farSource).toContain('disabled={readOnly || (deleteCauseMutation.isPending && deleteCauseMutation.variables === c.id)}')
    expect(farSource).toContain('isOpen={!readOnly && activeModal?.isOpen}')
    expect(farSource).toContain('disabled={readOnly || !selectedCauseId}')
    expect(farSource).toContain('disabled={readOnly || deletingMitigationId !== null}')
    expect(farSource).toContain('isOpen={!readOnly && activeMitigationModal?.isOpen}')
    expect(farSource).toContain('isOpen={!readOnly && activePreventionModal?.isOpen}')
    expect(farSource).toContain('+ Link Research Artifact</button>')
    expect(farSource).toContain('{!readOnly && isLinking && (')
    expect(farSource).toContain('disabled={readOnly} className="p-2.5 bg-white/5 rounded-lg text-slate-500 hover:text-rose-500')
  })

  it('keeps the patched TSX syntactically valid', () => {
    const parsed = ts.createSourceFile(farPath, farSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(parsed.parseDiagnostics, 'FAR.tsx parse diagnostics').toHaveLength(0)
  })
})
