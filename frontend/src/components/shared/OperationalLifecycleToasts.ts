import { getOperationalLifecycleActionSpec, type OperationalLifecycleActionId } from './OperationalLifecycleContract'

export const BULK_NO_CHANGES_MESSAGE = 'No changes made. Selected records already match the chosen value.'
export const BULK_REVERTED_MESSAGE = 'Bulk operation reverted.'
export const BULK_REVERT_FAILED_MESSAGE = 'Bulk revert failed.'

const getSelectedRecordLabel = () => 'selected records'

export const buildOperationalLifecycleToastMessage = ({
  action,
  totalSelected,
  changedCount,
  unchangedCount = Math.max(0, totalSelected - changedCount),
  fieldLabel = 'Field',
}: {
  action: OperationalLifecycleActionId | 'update'
  totalSelected: number
  changedCount: number
  unchangedCount?: number
  fieldLabel?: string
}) => {
  const selectedRecordLabel = getSelectedRecordLabel()

  if (changedCount <= 0) {
    return BULK_NO_CHANGES_MESSAGE
  }

  if (action === 'update') {
    const base = `Updated ${changedCount} of ${totalSelected} ${selectedRecordLabel}: ${fieldLabel} changed.`
    return unchangedCount > 0 ? `${base} ${unchangedCount} already matched.` : base
  }

  const actionSpec = getOperationalLifecycleActionSpec(action)
  if (!actionSpec || !actionSpec.successToast) {
    const actionStr = String(action || 'completed')
    const fallbackLabel = actionStr === 'delete' ? 'Archived' : (actionStr.charAt(0).toUpperCase() + actionStr.slice(1))
    return `${fallbackLabel} ${changedCount} of ${totalSelected} ${selectedRecordLabel}.`
  }
  return `${actionSpec.successToast} ${changedCount} of ${totalSelected} ${selectedRecordLabel}.`
}
