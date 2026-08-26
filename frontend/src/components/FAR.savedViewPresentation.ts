import { FAR_GROUP_OPTIONS } from './FAR.workspaceModel'
import type { FarWorkspaceViewConfig } from './FAR.workspaceState'

export function describeFarSavedViewConfig(config: FarWorkspaceViewConfig): string {
  const lifecycleLabel = config.lifecycleScope === 'archived' ? 'Archived' : 'Active'
  const groupLabel = FAR_GROUP_OPTIONS.find((option) => option.value === config.groupBy)?.label || 'Raw Rows'
  const quickFilterCount = Object.values(config.quickFilters).reduce((total, values) => total + values.length, 0)
  return `${lifecycleLabel} · ${groupLabel} · ${quickFilterCount} quick filters · ${config.hiddenColumns.length} hidden`
}
