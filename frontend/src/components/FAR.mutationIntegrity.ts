export type FarMutationConflictDetail = {
  code?: string
  id?: number
  expected_version?: number
  actual_version?: number
}

export function requireFarExpectedVersion(value: unknown) {
  const version = Number(value)
  if (!Number.isInteger(version) || version <= 0) {
    throw new Error('A current positive FAR record version is required before mutation.')
  }
  return version
}

export function withFarExpectedVersion<T extends Record<string, unknown>>(
  version: unknown,
  payload: T = {} as T,
): T & { expected_version: number } {
  return {
    ...payload,
    expected_version: requireFarExpectedVersion(version),
  }
}

export function getFarMutationFailureMessage(payload: unknown, status?: number) {
  const source = payload && typeof payload === 'object' ? payload as Record<string, any> : {}
  const detail = source.detail
  if (detail && typeof detail === 'object') {
    const conflict = detail as FarMutationConflictDetail
    if (conflict.code === 'far_mode_version_conflict') {
      return `Failure vector changed since this view was loaded (expected v${conflict.expected_version ?? '—'}, current v${conflict.actual_version ?? '—'}). Refresh and reapply your change.`
    }
    if (conflict.code === 'far_mode_archived_read_only') {
      return 'Archived failure vectors are read-only. Restore the vector lifecycle before changing content.'
    }
    if (conflict.code === 'far_lifecycle_precondition_failed') {
      const versionConflicts = Array.isArray((detail as any).version_conflicts) ? (detail as any).version_conflicts : []
      const missingIds = Array.isArray((detail as any).missing_ids) ? (detail as any).missing_ids : []
      if (versionConflicts.length) {
        const first = versionConflicts[0] || {}
        return `FAR lifecycle selection changed since preview (${versionConflicts.length} version conflict${versionConflicts.length === 1 ? '' : 's'}; first expected v${first.expected_version ?? '—'}, current v${first.actual_version ?? '—'}). Refresh and retry.`
      }
      if (missingIds.length) {
        return `FAR lifecycle selection is stale (${missingIds.length} record${missingIds.length === 1 ? '' : 's'} no longer available). Refresh and retry.`
      }
      return 'FAR lifecycle selection no longer matches current data. Refresh and retry.'
    }
    if (conflict.code === 'far_history_no_core_change') {
      return 'Selected FAR history version has no restorable core-content difference. Lifecycle and intervention lineage remain preserved.'
    }
    if (conflict.code === 'far_history_restore_missing_assets') {
      const missingIds = Array.isArray((detail as any).missing_ids) ? (detail as any).missing_ids : []
      return `Historical FAR restore cannot be applied because ${missingIds.length || 'referenced'} asset record${missingIds.length === 1 ? '' : 's'} no longer ${missingIds.length === 1 ? 'exists' : 'exist'}. Reconcile the historical references before retrying.`
    }
    if (conflict.code === 'far_history_restore_missing_causes') {
      const missingIds = Array.isArray((detail as any).missing_ids) ? (detail as any).missing_ids : []
      return `Historical FAR restore cannot be applied because ${missingIds.length || 'referenced'} root-cause record${missingIds.length === 1 ? '' : 's'} no longer ${missingIds.length === 1 ? 'exists' : 'exist'}. Reconcile the historical references before retrying.`
    }
  }
  if (typeof detail === 'string' && detail.trim()) return detail
  return `FAR mutation failed${status ? ` (${status})` : ''}`
}

export async function readFarMutationFailureMessage(response: Response) {
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  return getFarMutationFailureMessage(payload, response.status)
}
