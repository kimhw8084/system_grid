import { showWorkspaceToast } from './WorkspaceToast'

export type OperationalBulkAction = 'update' | 'archive' | 'restore' | 'purge'

type ShowOperationalBulkResultOptions = {
  action: OperationalBulkAction
  totalSelected: number
  changedCount: number
  unchangedCount?: number
  fieldLabel?: string
  onRevert?: () => void | Promise<void>
}

const CHAR_WIDTH = 8

export const BULK_NO_CHANGES_MESSAGE = 'No changes made. Selected records already match the chosen value.'
export const BULK_REVERTED_MESSAGE = 'Bulk operation reverted.'
export const BULK_REVERT_FAILED_MESSAGE = 'Bulk revert failed.'

const getSelectedRecordLabel = () => 'selected records'

const toDisplayLabel = (value: string) => (
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
)

export const resolveBulkFieldLabel = (payload: Record<string, any>, fieldLabels: Record<string, string>) => {
  const [fieldKey] = Object.entries(payload || {}).find(([, value]) => value !== undefined) || []
  if (!fieldKey) return 'Field'
  return fieldLabels[fieldKey] || toDisplayLabel(fieldKey)
}

export const normalizeBulkValue = (value: any) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const countSemanticBulkChanges = (snapshots: any[], payload: Record<string, any>) => {
  const entries = Object.entries(payload || {}).filter(([, value]) => value !== undefined)
  if (entries.length === 0) return 0
  return snapshots.filter((snapshot) => (
    entries.some(([key, value]) => normalizeBulkValue(snapshot?.[key]) !== normalizeBulkValue(value))
  )).length
}

export const estimateRowActionHeaderTextWidth = (text: string, extraPadding = 0) => (
  Math.max(200, text.length * CHAR_WIDTH + extraPadding)
)

export const showOperationalBulkErrorToast = (message: string) => {
  showWorkspaceToast(`Bulk operation failed: ${message}`, { type: 'error' })
}

export const showOperationalBulkRevertedToast = () => {
  showWorkspaceToast(BULK_REVERTED_MESSAGE, { type: 'success' })
}

export const showOperationalBulkRevertErrorToast = (message = BULK_REVERT_FAILED_MESSAGE) => {
  showWorkspaceToast(message, { type: 'error' })
}

const buildOperationalBulkMessage = ({
  action,
  totalSelected,
  changedCount,
  unchangedCount = Math.max(0, totalSelected - changedCount),
  fieldLabel = 'Field',
}: Omit<ShowOperationalBulkResultOptions, 'onRevert'>) => {
  const selectedRecordLabel = getSelectedRecordLabel()

  if (action === 'update') {
    if (changedCount <= 0) return BULK_NO_CHANGES_MESSAGE

    const base = `Updated ${changedCount} of ${totalSelected} ${selectedRecordLabel}: ${fieldLabel} changed.`
    if (unchangedCount > 0) {
      return `${base} ${unchangedCount} already matched.`
    }
    return base
  }

  if (action === 'archive') {
    return `Archived ${changedCount} of ${totalSelected} ${selectedRecordLabel}.`
  }

  if (action === 'restore') {
    return `Restored ${changedCount} of ${totalSelected} ${selectedRecordLabel}.`
  }

  return `Permanently purged ${changedCount} of ${totalSelected} ${selectedRecordLabel}.`
}

export const showOperationalBulkResultToast = ({
  action,
  totalSelected,
  changedCount,
  unchangedCount,
  fieldLabel,
  onRevert,
}: ShowOperationalBulkResultOptions) => {
  const message = buildOperationalBulkMessage({
    action,
    totalSelected,
    changedCount,
    unchangedCount,
    fieldLabel,
  })

  if (changedCount > 0 && action !== 'purge' && onRevert) {
    showWorkspaceToast(message, { type: 'success', onRevert })
    return
  }

  showWorkspaceToast(message, { type: 'success' })
}
