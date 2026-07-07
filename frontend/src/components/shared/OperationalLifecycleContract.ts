export type OperationalLifecycleActionId = 'archive' | 'restore' | 'purge'

export type OperationalLifecycleRevertMode =
  | 'supported'
  | 'blocked_backend'
  | 'unsupported'

export type OperationalLifecycleActionSpec = {
  actionId: OperationalLifecycleActionId
  label: string
  backendAction: string
  revertMode: OperationalLifecycleRevertMode
  revertAction?: string
  requiresSnapshot?: boolean
  successToast: string
  revertedToast: string
}

export const OPERATIONAL_LIFECYCLE_ACTION_LABELS = {
  archive: 'Archive',
  restore: 'Restore',
  purge: 'Purge',
} as const

export const OPERATIONAL_LIFECYCLE_ACTION_SPECS: Record<OperationalLifecycleActionId, OperationalLifecycleActionSpec> = {
  archive: {
    actionId: 'archive',
    label: OPERATIONAL_LIFECYCLE_ACTION_LABELS.archive,
    backendAction: 'delete',
    revertMode: 'supported',
    revertAction: 'restore',
    successToast: 'Archived',
    revertedToast: 'Bulk operation reverted.',
  },
  restore: {
    actionId: 'restore',
    label: OPERATIONAL_LIFECYCLE_ACTION_LABELS.restore,
    backendAction: 'restore',
    revertMode: 'supported',
    revertAction: 'delete',
    successToast: 'Restored',
    revertedToast: 'Bulk operation reverted.',
  },
  purge: {
    actionId: 'purge',
    label: OPERATIONAL_LIFECYCLE_ACTION_LABELS.purge,
    backendAction: 'purge',
    revertMode: 'unsupported',
    requiresSnapshot: true,
    successToast: 'Permanently purged',
    revertedToast: 'Bulk operation reverted.',
  },
}

export const getOperationalLifecycleActionSpec = (actionId: OperationalLifecycleActionId | 'delete') => {
  const resolvedId = actionId === 'delete' ? 'archive' : actionId
  return OPERATIONAL_LIFECYCLE_ACTION_SPECS[resolvedId as OperationalLifecycleActionId]
}
