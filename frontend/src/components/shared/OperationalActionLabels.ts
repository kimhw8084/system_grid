import { OPERATIONAL_LIFECYCLE_ACTION_LABELS } from './OperationalLifecycleContract'

export const OPERATIONAL_ACTION_LABELS = {
  archive: OPERATIONAL_LIFECYCLE_ACTION_LABELS.archive,
  archiveConfirm: 'Confirm Archive?',
  archiveSelection: 'Archive Selection',
  archiveSelectionConfirm: 'Confirm Archive?',
  restore: OPERATIONAL_LIFECYCLE_ACTION_LABELS.restore,
  purge: OPERATIONAL_LIFECYCLE_ACTION_LABELS.purge,
  purgeConfirm: 'Confirm Purge?',
  purgeSelection: OPERATIONAL_LIFECYCLE_ACTION_LABELS.purge,
  purgeSelectionConfirm: 'Confirm Permanent Purge?',
} as const
