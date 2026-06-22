import type { ReactNode } from 'react'

export const OPERATIONAL_GRID_CLASSES = {
  utilityCell: 'operational-grid-utility-cell',
  utilityHeader: 'operational-grid-utility-header',
  utilityOverflowCell: 'operational-grid-utility-cell operational-grid-overflow-visible',
  centeredOverflowCell: 'operational-grid-centered-cell operational-grid-overflow-visible',
  idCell: 'operational-grid-id-cell',
  idHeader: 'operational-grid-id-header',
  primaryCell: 'operational-grid-primary-cell',
  primaryHeader: 'operational-grid-primary-header',
  leftBodyCell: 'operational-grid-left-body-cell',
  centeredCell: 'operational-grid-centered-cell',
  centeredHeader: 'operational-grid-centered-header',
  actionCell: 'operational-grid-action-cell',
  actionHeader: 'operational-grid-action-header',
} as const

export const OPERATIONAL_GRID_TEXT_CLASS = 'operational-grid-text'
export const OPERATIONAL_GRID_PLAIN_VALUE_CLASS = 'operational-grid-text operational-grid-plain-value'
export const OPERATIONAL_GRID_PRIMARY_TEXT_CLASS = 'operational-grid-text operational-grid-plain-value operational-grid-primary-text'
export const OPERATIONAL_GRID_PRIMARY_BUTTON_CLASS = 'operational-grid-text operational-grid-plain-value operational-grid-primary-button'
export const OPERATIONAL_GRID_ICON_VALUE_CLASS = 'operational-grid-icon-value'
export const OPERATIONAL_GRID_EMPTY_VALUE_CLASS = 'operational-grid-text operational-grid-empty-value'

export const OPERATIONAL_GRID_WIDTHS = {
  compactAction: 108,
  standardAction: 176,
} as const

type OperationalColumnCommonConfig = {
  field: string
  headerName: string
  hide?: boolean
  width?: number
  minWidth?: number
  maxWidth?: number
  filter?: any
}

export type OperationalPlainColumnConfig = OperationalColumnCommonConfig & {
  kind: 'plain'
  emptyValue?: string
  formatValue?: (value: any, params: any) => ReactNode
  valueClassName?: string
}

export type OperationalIdentityColumnConfig = OperationalColumnCommonConfig & {
  kind: 'identity'
  onActivate?: (row: any) => void
  buttonTitle?: string
}

export type OperationalProseColumnConfig = OperationalColumnCommonConfig & {
  kind: 'prose'
  emptyValue?: string
}

export type OperationalDateColumnConfig = OperationalColumnCommonConfig & {
  kind: 'date'
}

export type OperationalBadgeColumnConfig = OperationalColumnCommonConfig & {
  kind: 'badge'
  fontSize: number
  emptyValue?: string
}

export type OperationalMappedBadgeColumnConfig = OperationalColumnCommonConfig & {
  kind: 'mappedBadge'
  fontSize: number
  emptyValue?: string
  colorMap: Record<string, string>
  fallbackClass?: string
}

export type OperationalMappedTextColumnConfig = OperationalColumnCommonConfig & {
  kind: 'mappedText'
  fontSize: number
  emptyValue?: string
  colorMap: Record<string, string>
  fallbackClass?: string
}

export type OperationalHoverSummaryColumnConfig = OperationalColumnCommonConfig & {
  kind: 'hoverSummary'
  fontSize: number
  tone?: 'blue' | 'default'
  emptyValue?: string
  getItems: (params: any) => any[]
  getSummary: (items: any[], params: any) => string
  getTooltip: (items: any[], params: any) => string
}

export type OperationalActiveDotColumnConfig = OperationalColumnCommonConfig & {
  kind: 'activeDot'
  getIsDeleted?: (params: any) => boolean
}

export type OperationalActionLinkColumnConfig = OperationalColumnCommonConfig & {
  kind: 'actionLink'
  fontSize: number
  emptyValue?: string
  onActivate: (params: any) => void
}

export type OperationalActionColumnConfig = {
  kind: 'action'
  width?: number
  renderActions: (row: any) => ReactNode
}

export type OperationalColumnConfig =
  | OperationalPlainColumnConfig
  | OperationalIdentityColumnConfig
  | OperationalProseColumnConfig
  | OperationalDateColumnConfig
  | OperationalBadgeColumnConfig
  | OperationalMappedBadgeColumnConfig
  | OperationalMappedTextColumnConfig
  | OperationalHoverSummaryColumnConfig
  | OperationalActiveDotColumnConfig
  | OperationalActionLinkColumnConfig
  | OperationalActionColumnConfig

export type OperationalUtilityColumnsConfig = {
  includeRecentChange?: boolean
  includeFavorite?: boolean
  includeWatch?: boolean
  isIntelligenceExpanded?: boolean
  isRecentChange: (item: any) => boolean
  onToggleFavorite: (id: number) => void
  onToggleWatch: (id: number) => void
  itemLabel: string
}

export const applyOperationalIdentityColumn = <T extends Record<string, any>>(
  column: T,
  options?: { width?: number; minWidth?: number; maxWidth?: number }
): T => {
  const width = options?.width ?? column.width ?? 220
  return {
    ...column,
    pinned: 'left',
    lockPinned: true,
    width,
    minWidth: options?.minWidth ?? column.minWidth ?? Math.min(width, 160),
    maxWidth: options?.maxWidth ?? column.maxWidth ?? 360,
    flex: undefined,
    initialFlex: undefined,
    operationalSkipAutoSize: true,
  }
}

export const applyOperationalActionColumn = <T extends Record<string, any>>(column: T, width: number = OPERATIONAL_GRID_WIDTHS.compactAction): T => ({
  ...column,
  pinned: 'right',
  lockPinned: true,
  width,
  minWidth: width,
  maxWidth: width,
  suppressSizeToFit: true,
  operationalSkipAutoSize: true,
})
