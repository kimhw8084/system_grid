export type FarLifecycleAction = 'archive' | 'restore'

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
