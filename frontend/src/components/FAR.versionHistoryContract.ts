export type FarHistoryRestoreActionInput = {
  isArchived: boolean
  isCurrent: boolean
  isPending: boolean
  coreRestoreAvailable: boolean
  version: number
}

export function formatFarHistoryValue(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    if (!value.length) return '—'
    if (value.every((item) => item == null || ['string', 'number', 'boolean'].includes(typeof item))) {
      return value.map(String).join(', ')
    }
    return JSON.stringify(value)
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function getFarHistoryRestoreAction({
  isArchived,
  isCurrent,
  isPending,
  coreRestoreAvailable,
  version,
}: FarHistoryRestoreActionInput) {
  if (isArchived) {
    return {
      disabled: true,
      label: 'Restore lifecycle first',
      title: 'Restore the failure vector lifecycle before restoring historical core content',
    }
  }
  if (isCurrent) {
    return { disabled: true, label: 'Current content', title: 'This is the current FAR version' }
  }
  if (!coreRestoreAvailable) {
    return {
      disabled: true,
      label: 'No core change',
      title: 'This version differs only in lifecycle or forensic intervention state; intervention objects are preserved rather than recreated by history restore.',
    }
  }
  if (isPending) {
    return { disabled: true, label: `Restore core v${version}`, title: 'A core content restore is already in progress' }
  }
  return {
    disabled: false,
    label: `Restore core v${version}`,
    title: 'Restore FAR-owned core content while preserving current intervention objects and lifecycle state',
  }
}
