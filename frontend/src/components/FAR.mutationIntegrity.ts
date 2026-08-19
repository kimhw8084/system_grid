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
