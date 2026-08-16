export type FarDeepLinkRecord = {
  id: number
  is_deleted?: boolean
  title?: string
  [key: string]: unknown
}

export type FarDeepLinkResolution<T extends FarDeepLinkRecord = FarDeepLinkRecord> =
  | { kind: 'absent' }
  | { kind: 'invalid'; message: string }
  | { kind: 'pending'; targetId: number }
  | { kind: 'unavailable'; targetId: number; message: string }
  | { kind: 'resolved'; targetId: number; mode: T; lifecycleScope: 'active' | 'archived' }

export type FarDeepLinkNotice = {
  tone: 'warning' | 'error'
  title: string
  description: string
}

export type FarGridDataState = {
  kind: 'query-error' | 'filtered-empty' | 'ready'
  noRowsLabel: string
  title?: string
  description?: string
  notice?: FarDeepLinkNotice
}

const STRICT_POSITIVE_INTEGER = /^[1-9]\d*$/
const INVALID_MESSAGE = 'The FAR deep link is invalid. Use a positive whole-number record ID.'
const UNAVAILABLE_MESSAGE = 'This failure vector was not found or is unavailable in your scope.'

export function parseFarDeepLinkId(value: string | null):
  | { kind: 'absent' }
  | { kind: 'invalid'; message: string }
  | { kind: 'valid'; targetId: number } {
  if (value === null) return { kind: 'absent' }
  if (!STRICT_POSITIVE_INTEGER.test(value)) return { kind: 'invalid', message: INVALID_MESSAGE }

  const targetId = Number(value)
  if (!Number.isSafeInteger(targetId) || targetId <= 0) {
    return { kind: 'invalid', message: INVALID_MESSAGE }
  }

  return { kind: 'valid', targetId }
}

export function resolveFarDeepLink<T extends FarDeepLinkRecord>(
  value: string | null,
  visibleModes: readonly T[] | undefined,
): FarDeepLinkResolution<T> {
  const parsed = parseFarDeepLinkId(value)
  if (parsed.kind === 'absent' || parsed.kind === 'invalid') return parsed
  if (!visibleModes) return { kind: 'pending', targetId: parsed.targetId }

  const mode = visibleModes.find((candidate) => Number(candidate.id) === parsed.targetId)
  if (!mode) {
    return {
      kind: 'unavailable',
      targetId: parsed.targetId,
      message: UNAVAILABLE_MESSAGE,
    }
  }

  return {
    kind: 'resolved',
    targetId: parsed.targetId,
    mode,
    lifecycleScope: mode.is_deleted ? 'archived' : 'active',
  }
}

export function getFarDeepLinkNotice(
  resolution: FarDeepLinkResolution,
): FarDeepLinkNotice | undefined {
  if (resolution.kind === 'invalid') {
    return {
      tone: 'error',
      title: 'Invalid FAR deep link',
      description: resolution.message,
    }
  }
  if (resolution.kind === 'unavailable') {
    return {
      tone: 'warning',
      title: 'Failure vector unavailable',
      description: resolution.message,
    }
  }
  return undefined
}

export function getFarGridDataState({
  modesError,
  modesLoading,
  filteredModeCount,
  lifecycleScope,
  deepLinkNotice,
}: {
  modesError: boolean
  modesLoading: boolean
  filteredModeCount: number
  lifecycleScope: 'active' | 'archived'
  deepLinkNotice?: FarDeepLinkNotice
}): FarGridDataState {
  if (modesError) {
    return {
      kind: 'query-error',
      noRowsLabel: 'No failure modes in scope',
      title: 'Failure analysis registry unavailable',
      description: 'The FAR registry could not be loaded. Retry from the workspace navigation.',
    }
  }

  if (!modesLoading && filteredModeCount === 0) {
    return {
      kind: 'filtered-empty',
      noRowsLabel: lifecycleScope === 'archived' ? 'No archived failure modes' : 'No failure modes in scope',
      title: lifecycleScope === 'archived' ? 'No archived failure modes' : 'No failure modes in scope',
      description: lifecycleScope === 'archived'
        ? 'Archived failure vectors will appear here and can be restored without losing forensic history.'
        : 'Create a failure mode or adjust the current filters.',
      notice: deepLinkNotice,
    }
  }

  return {
    kind: 'ready',
    noRowsLabel: 'No failure modes in scope',
    notice: deepLinkNotice,
  }
}
