export type FarBulkScoreField = 'severity' | 'occurrence' | 'detection'

export type FarBulkScorePayload = Partial<Record<FarBulkScoreField, number>> & {
  _expected_versions?: Record<string, number>
}

type FarBulkScoreRow = {
  id: number
  version?: number
  is_deleted?: boolean
  severity: number
  occurrence: number
  detection: number
  [key: string]: any
}

export const FAR_BULK_SCORE_FIELDS: FarBulkScoreField[] = ['severity', 'occurrence', 'detection']

const uniqueIds = (ids: readonly number[]) => Array.from(new Set(
  ids.map(Number).filter((id) => Number.isInteger(id) && id > 0),
))

export const normalizeFarBulkScorePayload = (payload: FarBulkScorePayload) => {
  const entries = FAR_BULK_SCORE_FIELDS
    .filter((field) => payload[field] !== undefined)
    .map((field) => [field, payload[field]] as const)

  if (entries.length !== 1) throw new Error('Choose exactly one FAR score field.')
  const [field, value] = entries[0]
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 10) {
    throw new Error('FAR score must be an integer from 1 to 10.')
  }
  return { field, value: Number(value) }
}

const rowsById = (rows: readonly FarBulkScoreRow[]) => new Map(
  rows.map((row) => [Number(row.id), row]),
)

export const buildFarBulkScorePreview = (
  ids: readonly number[],
  rows: readonly FarBulkScoreRow[],
  payload: FarBulkScorePayload,
) => {
  const selectedIds = uniqueIds(ids)
  const { field, value } = normalizeFarBulkScorePayload(payload)
  const current = rowsById(rows)
  const missingIds = selectedIds.filter((id) => !current.has(id))
  const blockedIds = selectedIds.filter((id) => Boolean(current.get(id)?.is_deleted))
  const changedIds = selectedIds.filter((id) => {
    const row = current.get(id)
    return Boolean(row) && !row?.is_deleted && Number(row?.[field]) !== value
  })
  const changed = new Set(changedIds)
  const blocked = new Set(blockedIds)
  const unchangedIds = selectedIds.filter((id) => current.has(id) && !changed.has(id) && !blocked.has(id))

  return {
    action: 'update',
    selected_count: selectedIds.length,
    matched_count: selectedIds.length - missingIds.length,
    changed_count: changedIds.length,
    unchanged_count: unchangedIds.length,
    blocked_count: blockedIds.length,
    missing_count: missingIds.length,
    changed_ids: changedIds,
    unchanged_ids: unchangedIds,
    missing_ids: missingIds,
    blockers: blockedIds.map((id) => ({ id, reason: 'Archived failure vectors are read-only.' })),
    can_execute: changedIds.length > 0 && blockedIds.length === 0 && missingIds.length === 0,
  }
}

export const buildFarBulkScoreRequest = (
  ids: readonly number[],
  rows: readonly FarBulkScoreRow[],
  payload: FarBulkScorePayload,
) => {
  const selectedIds = uniqueIds(ids)
  if (!selectedIds.length) throw new Error('Select at least one failure vector.')
  const { field, value } = normalizeFarBulkScorePayload(payload)
  const current = rowsById(rows)
  const overrideVersions = payload._expected_versions || {}
  const expectedVersions: Record<string, number> = {}

  for (const id of selectedIds) {
    const row = current.get(id)
    if (!row) throw new Error(`Failure vector ${id} is no longer available.`)
    if (row.is_deleted) throw new Error(`Failure vector ${id} is archived and read-only.`)
    const version = Number(overrideVersions[String(id)] ?? row.version)
    if (!Number.isInteger(version) || version <= 0) {
      throw new Error(`Failure vector ${id} is missing an optimistic version.`)
    }
    expectedVersions[String(id)] = version
  }

  return {
    ids: selectedIds,
    field,
    value,
    expected_versions: expectedVersions,
  }
}

export const applyFarBulkScoreResultVersions = <TRow extends { id: number; version?: number }>(
  rows: readonly TRow[],
  versions: Record<string, number> | undefined,
) => rows.map((row) => {
  const version = Number(versions?.[String(row.id)])
  return Number.isInteger(version) && version > 0 ? { ...row, version } : row
})

export const buildFarBulkScoreRevertPayload = (
  changedSnapshots: readonly FarBulkScoreRow[],
  payload: FarBulkScorePayload,
  versions: Record<string, number> | undefined,
): FarBulkScorePayload | null => {
  if (!changedSnapshots.length) return null
  const { field } = normalizeFarBulkScorePayload(payload)
  const previousValues = Array.from(new Set(changedSnapshots.map((row) => Number(row[field]))))
  if (previousValues.length !== 1) return null

  const expectedVersions: Record<string, number> = {}
  for (const row of changedSnapshots) {
    const version = Number(versions?.[String(row.id)])
    if (!Number.isInteger(version) || version <= 0) return null
    expectedVersions[String(row.id)] = version
  }

  return {
    [field]: previousValues[0],
    _expected_versions: expectedVersions,
  }
}
