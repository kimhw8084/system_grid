import type { FarGroupBy, FarQuickFilters } from './FAR.workspaceModel'
import type { FarLifecycleScope } from './FAR.workspaceState'
import type { FarDossierTab } from './FAR.rowActions'

export type FarOperatorSurface = 'diagnostics' | 'import' | 'round_trip_export'

export type FarOperatorLoopSnapshotInput = {
  lifecycleScope: FarLifecycleScope
  groupBy: FarGroupBy
  searchTerm: string
  quickFilters: FarQuickFilters
  selectedIds: number[]
  selectedModeId: number | null
  selectedDetailTab: FarDossierTab
  hiddenColumns: string[]
  fontSize: number
  rowDensity: number
  routeQuery: string
}

export type FarOperatorLoopSnapshot = {
  lifecycleScope: FarLifecycleScope
  groupBy: FarGroupBy
  searchTerm: string
  quickFilters: FarQuickFilters
  selectedIds: number[]
  selectedModeId: number | null
  selectedDetailTab: FarDossierTab
  hiddenColumns: string[]
  fontSize: number
  rowDensity: number
  routeQuery: string
  fingerprint: string
}

export type FarOperatorLoopSession = {
  surface: FarOperatorSurface
  snapshot: FarOperatorLoopSnapshot
}

export type FarOperatorLoopReceipt = {
  schema: 'SYSGRID_FAR_OPERATOR_LOOP_RECEIPT_V1'
  surface: FarOperatorSurface
  preserved: boolean
  beforeFingerprint: string
  afterFingerprint: string
  changedFields: string[]
}

const sortedUniqueStrings = (values: unknown) => Array.from(new Set(
  (Array.isArray(values) ? values : [])
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
)).sort()

const sortedUniqueIds = (values: unknown) => Array.from(new Set(
  (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
)).sort((left, right) => left - right)

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)])
  )
}

const snapshotPayload = (snapshot: Omit<FarOperatorLoopSnapshot, 'fingerprint'>) => ({
  ...snapshot,
  quickFilters: stableValue(snapshot.quickFilters),
})

export function buildFarOperatorLoopSnapshot(input: FarOperatorLoopSnapshotInput): FarOperatorLoopSnapshot {
  const normalized = {
    lifecycleScope: input.lifecycleScope === 'archived' ? 'archived' : 'active',
    groupBy: input.groupBy,
    searchTerm: String(input.searchTerm || ''),
    quickFilters: stableValue(input.quickFilters) as FarQuickFilters,
    selectedIds: sortedUniqueIds(input.selectedIds),
    selectedModeId: input.selectedModeId == null ? null : (Number.isFinite(Number(input.selectedModeId)) ? Number(input.selectedModeId) : null),
    selectedDetailTab: input.selectedDetailTab,
    hiddenColumns: sortedUniqueStrings(input.hiddenColumns),
    fontSize: Number(input.fontSize),
    rowDensity: Number(input.rowDensity),
    routeQuery: String(input.routeQuery || ''),
  } satisfies Omit<FarOperatorLoopSnapshot, 'fingerprint'>

  return {
    ...normalized,
    fingerprint: JSON.stringify(snapshotPayload(normalized)),
  }
}

export function startFarOperatorLoop(
  surface: FarOperatorSurface,
  snapshot: FarOperatorLoopSnapshot,
): FarOperatorLoopSession {
  return { surface, snapshot }
}

export function isFarOperatorLoopContextEquivalent(
  before: FarOperatorLoopSnapshot,
  after: FarOperatorLoopSnapshot,
) {
  return before.fingerprint === after.fingerprint
}

export function getFarOperatorLoopChangedFields(
  before: FarOperatorLoopSnapshot,
  after: FarOperatorLoopSnapshot,
) {
  const fields: Array<keyof Omit<FarOperatorLoopSnapshot, 'fingerprint'>> = [
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
  ]
  return fields.filter((field) => JSON.stringify(stableValue(before[field])) !== JSON.stringify(stableValue(after[field])))
}

export function shouldDismissFarOperatorLoop(
  session: FarOperatorLoopSession | null,
  current: FarOperatorLoopSnapshot,
) {
  if (!session) return false
  return !isFarOperatorLoopContextEquivalent(session.snapshot, current)
}

export function buildFarOperatorLoopReceipt(
  session: FarOperatorLoopSession,
  current: FarOperatorLoopSnapshot,
): FarOperatorLoopReceipt {
  const changedFields = getFarOperatorLoopChangedFields(session.snapshot, current)
  return {
    schema: 'SYSGRID_FAR_OPERATOR_LOOP_RECEIPT_V1',
    surface: session.surface,
    preserved: changedFields.length === 0,
    beforeFingerprint: session.snapshot.fingerprint,
    afterFingerprint: current.fingerprint,
    changedFields,
  }
}
