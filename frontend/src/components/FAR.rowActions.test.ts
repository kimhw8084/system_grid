import { readFileSync } from 'node:fs'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  FAR_CONTEXT_DETAIL_TABS,
  getFarContextActionState,
} from './FAR.rowActions'

const readSource = (path: string) => readFileSync(path, 'utf8')

const syntaxErrors = (source: string, fileName: string) => {
  const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const diagnostics = (
    parsed as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] }
  ).parseDiagnostics ?? []
  return diagnostics
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

describe('FAR linked/history row actions', () => {
  it('maps context destinations onto existing dossier tabs', () => {
    expect(FAR_CONTEXT_DETAIL_TABS).toEqual({
      detail: 'causal',
      versionHistory: 'versions',
      researchHistory: 'history',
    })
  })

  it('normalizes linked incidents and availability without mutating the row', () => {
    const linked = [{ id: 11, title: 'Power event' }, { id: 12, title: 'Timeout' }]
    const row = { linked_rcas: linked }
    const state = getFarContextActionState(row)

    expect(state.linkedIncidentCount).toBe(2)
    expect(state.canOpenLinkedIncidents).toBe(true)
    expect(state.linkedIncidents).toEqual(linked)
    expect(state.linkedIncidents).not.toBe(linked)

    expect(getFarContextActionState({ linked_rcas: null })).toEqual({
      linkedIncidents: [],
      linkedIncidentCount: 0,
      canOpenLinkedIncidents: false,
    })
  })

  it('adds direct Version, Research, and Linked Incident actions to the shared row menu', () => {
    const controls = readSource('src/components/FARGoldenWorkspaceControls.tsx')
    expect(controls).toContain("id: 'followOptions'")
    expect(controls).toContain("label: 'Version history'")
    expect(controls).toContain("label: 'Research history'")
    expect(controls).toContain('Linked incidents (${contextActions.linkedIncidentCount})')
    expect(controls).toContain('disabled: !contextActions.canOpenLinkedIncidents')
    expect(controls).toContain("disabledReason: 'No linked incidents'")
    expect(controls).toContain('onOpenIncidents(contextActions.linkedIncidents)')
  })

  it('routes context history actions into existing dossier tabs', () => {
    const controls = readSource('src/components/FARGoldenWorkspaceControls.tsx')
    const far = readSource('src/components/FAR.tsx')

    expect(controls).toContain('onOpenDetailTab(Number(item.id), FAR_CONTEXT_DETAIL_TABS.detail)')
    expect(controls).toContain('onOpenDetailTab(Number(item.id), FAR_CONTEXT_DETAIL_TABS.versionHistory)')
    expect(controls).toContain('onOpenDetailTab(Number(item.id), FAR_CONTEXT_DETAIL_TABS.researchHistory)')
    expect(far).toContain('onOpenDetailTab: (id, tab) => { setSelectedDetailTab(tab); setSelectedModeId(id) }')
    expect(far).toContain('initialTab={selectedDetailTab}')
    expect(far).toContain('const [activeTab, setActiveTab] = useState<FarDossierTab>(initialTab)')
    expect(far).toContain('setActiveTab(initialTab)')
    expect(far).toContain("activeTab === 'versions' && <FARVersionHistory")
    expect(far).toContain("activeTab === 'history' && <HistoryTab")
  })

  it('preserves the existing non-history context actions and lifecycle boundary', () => {
    const controls = readSource('src/components/FARGoldenWorkspaceControls.tsx')
    const far = readSource('src/components/FAR.tsx')

    for (const label of ['Open details', 'Edit', 'Copy row', 'Retire failure vector']) {
      expect(controls).toContain(`label: '${label}'`)
    }
    expect(far).toContain("contextMenu={lifecycleScope === 'active' ? goldenWorkspace.contextMenu : undefined}")
  })

  it('keeps every modified TypeScript source syntactically valid', () => {
    const sources = [
      ['src/components/FAR.tsx', 'FAR.tsx'],
      ['src/components/FARGoldenWorkspaceControls.tsx', 'FARGoldenWorkspaceControls.tsx'],
      ['src/components/FAR.rowActions.ts', 'FAR.rowActions.ts'],
    ] as const

    const errors = sources.flatMap(([path, fileName]) => syntaxErrors(readSource(path), fileName))
    expect(errors).toEqual([])
  })
})
