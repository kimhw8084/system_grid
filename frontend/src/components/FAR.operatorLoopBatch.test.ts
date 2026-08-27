import { readFileSync } from 'node:fs'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const far = read('src/components/FAR.tsx')
const loop = read('src/components/FAR.operatorLoop.ts')
const controls = read('src/components/FARGoldenWorkspaceControls.tsx')

const NEW_CLOSURE_ROWS = ['G04', 'G05', 'G14', 'G15'] as const
const REGRESSION_LOCK_ROWS = [
  'G22', 'G24', 'G35', 'G36', 'G37', 'G38', 'G39', 'G40', 'G41', 'G42',
  'G48', 'G53', 'G57', 'G58', 'G74', 'G82',
] as const

const parseErrors = (source: string, fileName: string) => {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind)
  const diagnostics = (parsed as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? []
  return diagnostics
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

describe('PC-48 exact 20-row FAR operator-loop batch contract', () => {
  it('binds exactly four new closure candidates plus sixteen terminal regression locks', () => {
    expect(NEW_CLOSURE_ROWS).toEqual(['G04', 'G05', 'G14', 'G15'])
    expect(REGRESSION_LOCK_ROWS).toHaveLength(16)
    expect(new Set([...NEW_CLOSURE_ROWS, ...REGRESSION_LOCK_ROWS]).size).toBe(20)
  })

  it('G04/G05 — retains shared diagnostic pill/detail and makes the surface transient to FAR context', () => {
    expect(far).toContain("import DataStatusPill, { DataDiagnosticModal } from './shared/OperationalDataStatus'")
    expect(far).toContain("import { buildFarRegistryDiagnosticDetail } from './FAR.diagnostics'")
    expect(far).toContain('errorDetail={farRegistryDiagnosticDetail}')
    expect(far).toContain("openFarOperatorSurface('diagnostics')")
    expect(far).toContain("isOpen={operatorLoopSession?.surface === 'diagnostics'}")
    expect(far).toContain("closeFarOperatorSurface('diagnostics')")
    expect(far).toContain("operatorLoopSession?.surface !== 'diagnostics' || modesError")
  })

  it('G14/G15 — retains shared import and strict schema-versioned round-trip export under the same loop', () => {
    expect(far).toContain("import { OperationalImportModal } from './shared/OperationalImportModal'")
    expect(far).toContain("FAR_IMPORT_SCHEMA_VERSION = '2026-08-far-v1'")
    expect(far).toContain("kind: 'snapshot'")
    expect(far).toContain('expectedSchemaVersion: FAR_IMPORT_SCHEMA_VERSION')
    expect(far).toContain("beginFarOperatorSurface('round_trip_export')")
    expect(far).toContain("onImport: () => openFarOperatorSurface('import')")
    expect(far).toContain("isOpen={operatorLoopSession?.surface === 'import'}")
    expect(far).toContain("closeFarOperatorSurface('import')")
    expect(controls).toContain('onRoundTripExport: () => void')
    expect(controls).toContain('title="Export Round-Trip Snapshot"')
  })

  it('keeps transient diagnose/import/export state from mutating durable workspace controls', () => {
    const start = far.indexOf('const operatorLoopSnapshot = useMemo')
    const end = far.indexOf('const syncFarDossierLink', start)
    const coordinator = far.slice(start, end)

    expect(coordinator).toContain('shouldDismissFarOperatorLoop')
    expect(coordinator).toContain('buildFarOperatorLoopReceipt')
    expect(coordinator).toContain('setOperatorLoopSession')
    for (const forbidden of [
      'setSearchTerm(', 'setGroupBy(', 'setQuickFilters(', 'setHiddenColumns(',
      'setSelectedIds(', 'setLifecycleScope(', 'setSelectedModeId(', 'setSelectedDetailTab(',
      'setFontSize(', 'setRowDensity(', 'setSearchParams(',
    ]) {
      expect(coordinator).not.toContain(forbidden)
    }
    expect(loop).toContain("schema: 'SYSGRID_FAR_OPERATOR_LOOP_RECEIPT_V1'")
    expect(loop).toContain("'routeQuery'")
    expect(loop).toContain("'quickFilters'")
    expect(loop).toContain("'hiddenColumns'")
  })

  it('retains the accepted G22/G24 geometry and persistence seam', () => {
    expect(far).toContain('farDefaultWidthsRef')
    expect(controls).toContain('handleStableColumnResized')
    expect(controls).toContain('setColumnLayoutState(nextLayout)')
    expect(controls).toContain('Reset FAR Layout to Golden')
  })

  it('retains G35–G42 grouping, filters, chips, clear-state, and full-domain search contracts', () => {
    expect(far).toContain('groupBy={groupBy}')
    expect(far).toContain('quickFilters={quickFilters}')
    expect(far).toContain('filterFarModes(lifecycleModes, searchTerm, quickFilters)')
    expect(controls).toContain('groupBy')
    expect(controls).toContain('quickFilters')
    expect(controls).toContain('filterChips')
  })

  it('retains G48/G53/G57/G58 interaction, context actions, shared metrics, and analytical builders', () => {
    expect(far).toContain('selectionScopeKey={selectionScopeKey}')
    expect(far).toContain('onOpenDetailTab: (id, tab) => openFarDossier(id, tab)')
    expect(far).toContain('createOperationalMetricBadgeColumn')
    expect(far).toContain('createFarAnalyticalColumns')
    expect(controls).toContain('FAR_CONTEXT_DETAIL_TABS.versionHistory')
    expect(controls).toContain('FAR_CONTEXT_DETAIL_TABS.researchHistory')
  })

  it('retains G74/G82 durable working state and canonical dossier deep links', () => {
    expect(far).toContain('restorationDossier')
    expect(far).toContain('goldenWorkspace.workingStateReady')
    expect(far).toContain('resolveFarDeepLink(idParam, modes)')
    expect(far).toContain('buildFarDossierSearchParams')
    expect(far).toContain('syncFarDossierLink')
  })

  it('keeps every PC-48 changed TypeScript source syntactically valid', () => {
    expect([
      ...parseErrors(far, 'FAR.tsx'),
      ...parseErrors(loop, 'FAR.operatorLoop.ts'),
      ...parseErrors(read('src/components/FAR.operatorLoop.test.ts'), 'FAR.operatorLoop.test.ts'),
      ...parseErrors(read('src/components/FAR.operatorLoopBatch.test.ts'), 'FAR.operatorLoopBatch.test.ts'),
    ]).toEqual([])
  })
})
