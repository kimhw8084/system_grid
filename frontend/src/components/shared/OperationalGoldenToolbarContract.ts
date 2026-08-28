export const GOLDEN_PRIMARY_TOOLBAR_CONTROL_GROUPS = [
  ['views', 'display', 'export', 'copy', 'registry'],
  ['import', 'filters', 'activity'],
] as const

export const GOLDEN_PRIMARY_TOOLBAR_ACTIONS = ['compare', 'bulk', 'add'] as const

export type GoldenPrimaryToolbarControlId = (typeof GOLDEN_PRIMARY_TOOLBAR_CONTROL_GROUPS)[number][number]
export type GoldenPrimaryToolbarActionId = (typeof GOLDEN_PRIMARY_TOOLBAR_ACTIONS)[number]
export type GoldenPrimaryToolbarCommandId = GoldenPrimaryToolbarControlId | GoldenPrimaryToolbarActionId

export const GOLDEN_PRIMARY_TOOLBAR_COMMAND_ORDER: readonly GoldenPrimaryToolbarCommandId[] = [
  ...GOLDEN_PRIMARY_TOOLBAR_CONTROL_GROUPS[0],
  ...GOLDEN_PRIMARY_TOOLBAR_CONTROL_GROUPS[1],
  ...GOLDEN_PRIMARY_TOOLBAR_ACTIONS,
]

export const GOLDEN_ACTIVITY_COLUMNS_TITLES = {
  show: 'Show Activity Columns',
  hide: 'Hide Activity Columns',
} as const

export const isGoldenActivityColumnsTitle = (title?: string) => {
  if (!title) return false
  const normalized = title.trim().toLowerCase()
  return normalized === GOLDEN_ACTIVITY_COLUMNS_TITLES.show.toLowerCase()
    || normalized === GOLDEN_ACTIVITY_COLUMNS_TITLES.hide.toLowerCase()
}

export const FAR_GOLDEN_TOOLBAR_EXTENSION_ALLOWLIST = {
  resetLayout: { id: 'far.reset-layout', surface: 'far-tools' },
  roundTripExport: { id: 'far.round-trip-export', surface: 'far-tools' },
  insights: { id: 'far.insights', surface: 'far-tools' },
  activitySummary: { id: 'far.activity-summary', surface: 'far-tools' },
  rpnHelp: { id: 'far.rpn-help', surface: 'far-tools' },
  restoreArchived: { id: 'far.restore-archived', surface: 'lifecycle-toolbar-extension' },
} as const

export const FAR_PRIMARY_TOOLBAR_COMMAND_ORDER = GOLDEN_PRIMARY_TOOLBAR_COMMAND_ORDER
