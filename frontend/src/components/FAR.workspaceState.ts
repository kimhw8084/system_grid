import type { CollaborativeSavedView } from './shared/CollaborativeWorkspaceViews'
import {
  sanitizeOperationalColumnLayout,
  sanitizeOperationalFilterModel,
  sanitizeOperationalSortModel,
} from './shared/OperationalGridSizing'

export const FAR_VIEW_STORAGE_KEY = 'sysgrid_far_views_v2'
export const FAR_ACTIVE_VIEW_KEY = 'sysgrid_far_active_view_v2'
export const FAR_COLLABORATIVE_VIEW_MIGRATION_KEY = 'sysgrid_far_collaborative_views_v1_migrated'

export const FAR_PERSISTED_COLUMN_IDS = new Set([
  'id',
  'system_name',
  'failure_type',
  'title',
  'severity',
  'occurrence',
  'detection',
  'rpn',
  'status',
  'linked_rcas',
  'created_by_user_id',
])

export type FarWorkspaceViewConfig = {
  fontSize: number
  rowDensity: number
  hiddenColumns: string[]
  quickFilter: string
  quickFilters: { system_name: string[] }
  filterModel: Record<string, any>
  sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>
  columnLayoutState: any[]
}

export type FarSavedView = CollaborativeSavedView<FarWorkspaceViewConfig>

const clampNumber = (value: unknown, minimum: number, maximum: number, fallback: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)))
}

const normalizeStrings = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)))
}

export function sanitizeFarWorkspaceViewConfig(value: unknown): FarWorkspaceViewConfig {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {}
  const quickFilters = source.quickFilters && typeof source.quickFilters === 'object' && !Array.isArray(source.quickFilters)
    ? source.quickFilters as Record<string, any>
    : {}

  return {
    fontSize: clampNumber(source.fontSize, 8, 14, 11),
    rowDensity: clampNumber(source.rowDensity, 0, 20, 10),
    hiddenColumns: normalizeStrings(source.hiddenColumns).filter((field) => FAR_PERSISTED_COLUMN_IDS.has(field)),
    quickFilter: typeof source.quickFilter === 'string' ? source.quickFilter.trim().slice(0, 500) : '',
    quickFilters: {
      system_name: normalizeStrings(quickFilters.system_name).slice(0, 200),
    },
    filterModel: sanitizeOperationalFilterModel(source.filterModel, FAR_PERSISTED_COLUMN_IDS),
    sortModel: sanitizeOperationalSortModel(source.sortModel, FAR_PERSISTED_COLUMN_IDS) as FarWorkspaceViewConfig['sortModel'],
    columnLayoutState: sanitizeOperationalColumnLayout(
      Array.isArray(source.columnLayoutState) ? source.columnLayoutState : [],
      FAR_PERSISTED_COLUMN_IDS,
      true,
    ),
  }
}

export function normalizeFarSavedViews(value: FarSavedView[]): FarSavedView[] {
  const seen = new Set<string>()
  return (Array.isArray(value) ? value : []).flatMap((view) => {
    if (!view || typeof view !== 'object') return []
    if (typeof view.id !== 'string' || !view.id.trim() || seen.has(view.id)) return []
    if (typeof view.name !== 'string' || !view.name.trim()) return []
    seen.add(view.id)
    return [{
      ...view,
      name: view.name.trim(),
      config: sanitizeFarWorkspaceViewConfig(view.config),
    }]
  })
}

export const FAR_SYSTEM_VIEW_IDS = new Set<string>()
export const DEFAULT_FAR_VIEW_CONFIG = sanitizeFarWorkspaceViewConfig({})
