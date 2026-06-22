export const OPERATIONAL_GRID_CLASSES = {
  utilityCell: 'operational-grid-utility-cell',
  utilityHeader: 'operational-grid-utility-header',
  utilityOverflowCell: 'operational-grid-utility-cell operational-grid-overflow-visible',
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
  compactAction: 132,
  standardAction: 192,
} as const

export const applyOperationalIdentityColumn = <T extends Record<string, any>>(column: T): T => ({
  ...column,
  pinned: 'left',
  lockPinned: true,
})

export const applyOperationalActionColumn = <T extends Record<string, any>>(column: T, width: number = OPERATIONAL_GRID_WIDTHS.compactAction): T => ({
  ...column,
  pinned: 'right',
  lockPinned: true,
  width,
  minWidth: width,
  maxWidth: width,
  suppressSizeToFit: true,
})
