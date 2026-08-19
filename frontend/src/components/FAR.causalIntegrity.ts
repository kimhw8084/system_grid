import { withFarExpectedVersion } from './FAR.mutationIntegrity'

export function requireFarContextModeId(value: unknown) {
  const modeId = Number(value)
  if (!Number.isInteger(modeId) || modeId <= 0) {
    throw new Error('A current positive FAR mode id is required before causal mutation.')
  }
  return modeId
}

export function buildFarContextMutationRequest<T extends Record<string, unknown>>(
  modeIdValue: unknown,
  version: unknown,
  payload: T = {} as T,
): T & { mode_id: number; expected_version: number } {
  const modeId = requireFarContextModeId(modeIdValue)
  return withFarExpectedVersion(version, { ...payload, mode_id: modeId })
}

export function buildFarCauseMutationRequest<T extends Record<string, unknown>>(
  modeIdValue: unknown,
  version: unknown,
  payload: T,
) {
  const modeId = requireFarContextModeId(modeIdValue)
  return buildFarContextMutationRequest(modeId, version, { ...payload, mode_ids: [modeId] })
}
