import { describe, expect, it } from 'vitest'
import {
  buildFarOperatorLoopReceipt,
  buildFarOperatorLoopSnapshot,
  getFarOperatorLoopChangedFields,
  isFarOperatorLoopContextEquivalent,
  shouldDismissFarOperatorLoop,
  startFarOperatorLoop,
} from './FAR.operatorLoop'

const snapshot = (patch: Record<string, unknown> = {}) => buildFarOperatorLoopSnapshot({
  lifecycleScope: 'active',
  groupBy: 'system_name',
  searchTerm: 'pump',
  quickFilters: {
    system_name: ['Hydraulics'],
    failure_type: ['Hardware'],
    status: ['OPEN'],
    risk_band: ['critical'],
  },
  selectedIds: [9, 3, 9],
  selectedModeId: 9,
  selectedDetailTab: 'history',
  hiddenColumns: ['created_by_user_id', 'linked_rcas'],
  fontSize: 11,
  rowDensity: 8,
  routeQuery: 'view=team-risk&id=9&tab=history',
  ...patch,
} as any)

describe('FAR investigate → exchange → resume operator loop', () => {
  it('creates a deterministic workspace-context fingerprint', () => {
    const first = snapshot()
    const reordered = snapshot({
      selectedIds: [3, 9],
      hiddenColumns: ['linked_rcas', 'created_by_user_id', 'linked_rcas'],
      quickFilters: {
        status: ['OPEN'],
        failure_type: ['Hardware'],
        risk_band: ['critical'],
        system_name: ['Hydraulics'],
      },
    })

    expect(first.selectedIds).toEqual([3, 9])
    expect(first.hiddenColumns).toEqual(['created_by_user_id', 'linked_rcas'])
    expect(reordered.fingerprint).toBe(first.fingerprint)
    expect(isFarOperatorLoopContextEquivalent(first, reordered)).toBe(true)
  })

  it.each(['diagnostics', 'import', 'round_trip_export'] as const)(
    'preserves the same context through %s when no operator workspace state changes',
    (surface) => {
      const before = snapshot()
      const session = startFarOperatorLoop(surface, before)
      const after = snapshot()
      const receipt = buildFarOperatorLoopReceipt(session, after)

      expect(shouldDismissFarOperatorLoop(session, after)).toBe(false)
      expect(receipt).toMatchObject({
        schema: 'SYSGRID_FAR_OPERATOR_LOOP_RECEIPT_V1',
        surface,
        preserved: true,
        changedFields: [],
      })
      expect(receipt.beforeFingerprint).toBe(receipt.afterFingerprint)
    },
  )

  it('detects lifecycle, dossier, saved-view URL, search, filter, grouping, selection, and geometry drift', () => {
    const before = snapshot()
    const after = snapshot({
      lifecycleScope: 'archived',
      groupBy: 'risk_band',
      searchTerm: 'compressor',
      quickFilters: { system_name: [], failure_type: [], status: ['CLOSED'], risk_band: [] },
      selectedIds: [42],
      selectedModeId: 42,
      selectedDetailTab: 'roadmap',
      hiddenColumns: ['status'],
      fontSize: 12,
      rowDensity: 10,
      routeQuery: 'view=personal-audit&id=42&tab=roadmap',
    })
    const session = startFarOperatorLoop('diagnostics', before)
    const changed = getFarOperatorLoopChangedFields(before, after)

    expect(shouldDismissFarOperatorLoop(session, after)).toBe(true)
    expect(changed).toEqual([
      'lifecycleScope',
      'groupBy',
      'searchTerm',
      'quickFilters',
      'selectedIds',
      'selectedModeId',
      'selectedDetailTab',
      'hiddenColumns',
      'fontSize',
      'rowDensity',
      'routeQuery',
    ])
    expect(buildFarOperatorLoopReceipt(session, after)).toMatchObject({
      preserved: false,
      changedFields: changed,
    })
  })

  it('treats absent dossier identity as null instead of numeric zero', () => {
    const noDossier = snapshot({ selectedModeId: null, selectedDetailTab: 'causal', routeQuery: 'view=team-risk' })
    expect(noDossier.selectedModeId).toBeNull()
  })
})
