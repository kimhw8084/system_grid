import { requireFarExpectedVersion } from './FAR.mutationIntegrity'

export type FarLifecycleAction = 'archive' | 'restore'
export type FarLifecycleVersionMap = Record<string, number>

export function isFarLifecycleAction(action: unknown): action is FarLifecycleAction {
  return action === 'archive' || action === 'restore'
}

export function getFarLifecycleEndpoint(action: FarLifecycleAction): string {
  return action === 'archive'
    ? '/api/v1/far/modes/bulk-archive'
    : '/api/v1/far/modes/bulk-restore'
}

export function getFarLifecycleRevertAction(action: FarLifecycleAction): FarLifecycleAction {
  return action === 'archive' ? 'restore' : 'archive'
}

export function buildFarLifecycleRequest(
  ids: number[],
  rows: Array<{ id?: unknown; version?: unknown }>,
  overrideVersions?: FarLifecycleVersionMap | null,
) {
  const normalizedIds = ids.map(Number)
  const byId = new Map(rows.map((row) => [Number(row.id), row]))
  const expected_versions: FarLifecycleVersionMap = {}

  for (const id of normalizedIds) {
    if (!Number.isInteger(id) || id <= 0) throw new Error('FAR lifecycle ids must be positive integers.')
    const override = overrideVersions?.[String(id)]
    const version = override ?? byId.get(id)?.version
    expected_versions[String(id)] = requireFarExpectedVersion(version)
  }

  return { ids: normalizedIds, expected_versions }
}

export function buildFarLifecycleRevertPayload(
  changedIds: number[],
  resultVersions: unknown,
): { expected_versions: FarLifecycleVersionMap } | null {
  if (!resultVersions || typeof resultVersions !== 'object' || Array.isArray(resultVersions)) return null
  try {
    const expected_versions: FarLifecycleVersionMap = {}
    for (const id of changedIds.map(Number)) {
      if (!Number.isInteger(id) || id <= 0) return null
      expected_versions[String(id)] = requireFarExpectedVersion((resultVersions as Record<string, unknown>)[String(id)])
    }
    return { expected_versions }
  } catch {
    return null
  }
}
