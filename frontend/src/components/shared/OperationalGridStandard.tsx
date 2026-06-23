import React from 'react'
import { Clock, Eye, Star, User } from 'lucide-react'
import { formatAppDate } from '../../utils/dateUtils'
import {
  applyOperationalActionColumn,
  OPERATIONAL_GRID_ACTION_BUTTON_CLASS,
  applyOperationalIdentityColumn,
  OPERATIONAL_GRID_WIDTHS,
  OPERATIONAL_GRID_ACTION_LINK_CLASS,
  OPERATIONAL_GRID_BADGE_CLASS,
  OPERATIONAL_GRID_BADGE_TEXT_CLASS,
  OPERATIONAL_GRID_CLASSES,
  OPERATIONAL_GRID_EMPTY_VALUE_CLASS,
  OPERATIONAL_GRID_ICON_VALUE_CLASS,
  OPERATIONAL_GRID_PLAIN_VALUE_CLASS,
  OPERATIONAL_GRID_PRIMARY_BUTTON_CLASS,
  OPERATIONAL_GRID_PRIMARY_TEXT_CLASS,
  type OperationalActionColumnConfig,
  type OperationalActionLinkColumnConfig,
  type OperationalActiveDotColumnConfig,
  type OperationalBadgeColumnConfig,
  type OperationalColumnConfig,
  type OperationalDateColumnConfig,
  type OperationalHoverSummaryColumnConfig,
  type OperationalIdentityColumnConfig,
  type OperationalMappedBadgeColumnConfig,
  type OperationalMappedTextColumnConfig,
  type OperationalPlainColumnConfig,
  type OperationalProseColumnConfig,
  type OperationalUtilityColumnsConfig,
} from './OperationalGridContract'
import { finalizeOperationalColumnDefinition, orderOperationalColumnDefinitions } from './OperationalGridSizing'
import { WorkspaceHoverPreview as HoverPreview } from './OperationalWorkspacePrimitives'

const hasOperationalId = (ids: any[] | undefined, id: any) => (
  Array.isArray(ids) &&
  ids.map((value) => Number(value)).includes(Number(id))
)

const getOperationalResizable = (lockWidth?: boolean) => !lockWidth
const normalizeOperationalColorKey = (value: any) => String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '')
const resolveOperationalColorClass = (
  value: any,
  colorMap: Record<string, string> | undefined,
  fallbackClass: string
) => {
  if (!colorMap) return fallbackClass
  const normalizedMap = Object.fromEntries(
    Object.entries(colorMap).map(([key, entry]) => [normalizeOperationalColorKey(key), entry])
  )
  return colorMap[String(value)] || normalizedMap[normalizeOperationalColorKey(value)] || fallbackClass
}

const getOperationalBadgeWidth = ({
  knownValues = [],
  colorMap,
  emptyValue,
  explicitWidth,
}: {
  knownValues?: string[]
  colorMap?: Record<string, string>
  emptyValue?: string
  explicitWidth?: number
}) => {
  if (explicitWidth != null) return explicitWidth
  const values = Array.from(new Set([
    ...knownValues,
    ...(colorMap ? Object.keys(colorMap) : []),
    emptyValue || '',
  ].filter(Boolean)))
  const longestLabel = values.reduce((max, value) => Math.max(max, String(value).length), 0)
  const estimatedWidth = 44 + longestLabel * 7
  return Math.max(OPERATIONAL_GRID_WIDTHS.badgeMin, Math.min(estimatedWidth, 168))
}

export function renderOperationalStatusPillCell(value: string | null | undefined, fontSize: number, emptyValue: string = 'N/A') {
  // Source of truth: badge/status/severity renderer.
  return renderOperationalBadgeCell({
    value,
    fontSize,
    emptyValue,
  })
}

function renderOperationalBadgeCell({
  value,
  fontSize,
  emptyValue = 'N/A',
  colorMap,
  fallbackClass = 'text-slate-400 border-white/10 bg-white/5',
}: {
  value: string | null | undefined
  fontSize: number
  emptyValue?: string
  colorMap?: Record<string, string>
  fallbackClass?: string
}) {
  const label = value || emptyValue
  const resolvedClass = resolveOperationalColorClass(label, colorMap, fallbackClass)
  return (
    <span className={`${OPERATIONAL_GRID_BADGE_CLASS} ${resolvedClass}`}>
      <span style={{ fontSize: `${fontSize}px` }} className={OPERATIONAL_GRID_BADGE_TEXT_CLASS}>
        {label}
      </span>
    </span>
  )
}

export function renderOperationalMappedBadgeCell({
  value,
  fontSize,
  colorMap,
  fallbackClass = 'text-slate-400 border-white/10 bg-white/5',
}: {
  value: string | null | undefined
  fontSize: number
  colorMap: Record<string, string>
  fallbackClass?: string
}) {
  return renderOperationalBadgeCell({ value, fontSize, colorMap, fallbackClass })
}

export function renderOperationalActiveDotCell({
  value,
  isDeleted = false,
}: {
  value: boolean
  isDeleted?: boolean
}) {
  // Source of truth: active dot renderer.
  const toneClass = isDeleted
    ? 'bg-slate-500 ring-1 ring-slate-400/35'
    : value
      ? 'bg-emerald-500 ring-1 ring-emerald-300/35'
      : 'bg-rose-400 ring-1 ring-rose-300/35'
  return (
    <div className="operational-grid-active-dot-wrap flex h-full items-center justify-center">
      <div className="operational-grid-active-dot-frame relative flex h-3 w-3 items-center justify-center">
        {(value && !isDeleted) && (
          <span className="operational-grid-active-dot-pulse absolute inset-0 rounded-full border border-emerald-400/35 bg-emerald-400/10" />
        )}
        <span className={`operational-grid-active-dot relative block h-[7px] w-[7px] rounded-full ${toneClass}`} />
      </div>
    </div>
  )
}

export function renderOperationalActionButtons(children: React.ReactNode) {
  const normalizedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child
    const currentClassName = typeof child.props.className === 'string' ? child.props.className : ''
    const mergedClassName = `${OPERATIONAL_GRID_ACTION_BUTTON_CLASS} ${currentClassName}`.trim()
    return React.cloneElement(child as React.ReactElement<any>, {
      className: mergedClassName,
    })
  })

  return <div className="flex items-center justify-center gap-1.5">{normalizedChildren}</div>
}

export function createOperationalIdentityColumnDefinition({
  colId,
  field,
  headerName,
  hide,
  width,
  minWidth,
  maxWidth,
  onActivate,
  buttonTitle = 'View Details',
}: Omit<OperationalIdentityColumnConfig, 'kind'> & { colId?: string }) {
  return applyOperationalIdentityColumn({
    colId,
    field,
    headerName,
    filter: true,
    cellClass: OPERATIONAL_GRID_CLASSES.primaryCell,
    headerClass: OPERATIONAL_GRID_CLASSES.primaryHeader,
    cellRenderer: (p: any) => (
      onActivate ? (
        <button
          type="button"
          title={buttonTitle}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onActivate(p.data)
          }}
          className={OPERATIONAL_GRID_PRIMARY_BUTTON_CLASS}
        >
          {p.value}
        </button>
      ) : (
        <span className={OPERATIONAL_GRID_PRIMARY_TEXT_CLASS}>{p.value}</span>
      )
    ),
    hide,
  }, { width, minWidth, maxWidth })
}

export function createOperationalActionColumnDefinition({
  width,
  renderActions,
}: Pick<OperationalActionColumnConfig, 'width' | 'renderActions'>) {
  return applyOperationalActionColumn({
    colId: 'row_actions',
    headerName: 'Action',
    cellClass: OPERATIONAL_GRID_CLASSES.actionCell,
    headerClass: OPERATIONAL_GRID_CLASSES.actionHeader,
    sortable: false,
    filter: false,
    cellRenderer: (p: any) => p.data ? renderActions(p.data) : null,
    lockVisible: true,
  }, width)
}

export function createOperationalPlainValueColumn({
  field,
  headerName,
  hide,
  width = 140,
  minWidth = OPERATIONAL_GRID_WIDTHS.plainMin,
  maxWidth,
  filter = true,
  emptyValue = 'N/A',
  formatValue,
  valueClassName,
  lockWidth,
}: Omit<OperationalPlainColumnConfig, 'kind'>) {
  // Source of truth: plain/prose/date column behavior.
  return {
    field,
    headerName,
    width,
    minWidth,
    maxWidth,
    filter,
    resizable: getOperationalResizable(lockWidth),
    operationalLockWidth: lockWidth,
    operationalSkipAutoSize: lockWidth,
    cellClass: OPERATIONAL_GRID_CLASSES.centeredCell,
    headerClass: OPERATIONAL_GRID_CLASSES.centeredHeader,
    cellRenderer: (p: any) => {
      const resolvedValue = formatValue ? formatValue(p.value, p) : p.value
      return resolvedValue
        ? <span className={valueClassName || OPERATIONAL_GRID_PLAIN_VALUE_CLASS}>{resolvedValue}</span>
        : <span className={OPERATIONAL_GRID_EMPTY_VALUE_CLASS}>{emptyValue}</span>
    },
    hide,
  }
}

export function createOperationalMappedTextColumn({
  field,
  headerName,
  hide,
  width = 140,
  minWidth = OPERATIONAL_GRID_WIDTHS.plainMin,
  maxWidth,
  filter = true,
  fontSize,
  emptyValue = 'N/A',
  colorMap,
  fallbackClass = 'text-slate-400',
  lockWidth,
}: Omit<OperationalMappedTextColumnConfig, 'kind'> & { maxWidth?: number; minWidth?: number }) {
  return {
    field,
    headerName,
    width,
    minWidth,
    maxWidth,
    filter,
    resizable: getOperationalResizable(lockWidth),
    operationalLockWidth: lockWidth,
    operationalSkipAutoSize: lockWidth,
    cellClass: OPERATIONAL_GRID_CLASSES.centeredCell,
    headerClass: OPERATIONAL_GRID_CLASSES.centeredHeader,
    cellRenderer: (p: any) => (
      <span
        style={{ fontSize: `${fontSize}px` }}
        className={`${OPERATIONAL_GRID_PLAIN_VALUE_CLASS} ${resolveOperationalColorClass(p.value, colorMap, p.value ? fallbackClass : 'text-slate-500')}`}
      >
        {p.value || emptyValue}
      </span>
    ),
    hide,
  }
}

export function createOperationalProseColumn({
  field,
  headerName,
  hide,
  width = 220,
  minWidth,
  maxWidth,
  filter = true,
  emptyValue = 'N/A',
  lockWidth,
  proseMode = 'compact',
}: Omit<OperationalProseColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    minWidth: minWidth ?? (proseMode === 'wrap' ? OPERATIONAL_GRID_WIDTHS.proseWrapMin : OPERATIONAL_GRID_WIDTHS.proseCompactMin),
    maxWidth,
    filter,
    resizable: getOperationalResizable(lockWidth),
    operationalLockWidth: lockWidth,
    operationalSkipAutoSize: lockWidth,
    cellClass: proseMode === 'wrap' ? OPERATIONAL_GRID_CLASSES.leftBodyWrapCell : OPERATIONAL_GRID_CLASSES.leftBodyCell,
    headerClass: OPERATIONAL_GRID_CLASSES.primaryHeader,
    cellRenderer: (p: any) => (
      <span className={p.value ? OPERATIONAL_GRID_PLAIN_VALUE_CLASS : OPERATIONAL_GRID_EMPTY_VALUE_CLASS}>
        {p.value || emptyValue}
      </span>
    ),
    hide,
  }
}

export function createOperationalStatusBadgeColumn({
  field,
  headerName,
  hide,
  width,
  minWidth = OPERATIONAL_GRID_WIDTHS.badgeMin,
  maxWidth,
  filter = true,
  fontSize,
  emptyValue = 'N/A',
  lockWidth,
  knownValues = [],
}: Omit<OperationalBadgeColumnConfig, 'kind'>) {
  const resolvedWidth = getOperationalBadgeWidth({ knownValues, emptyValue, explicitWidth: width })
  return {
    field,
    headerName,
    width: resolvedWidth,
    minWidth,
    maxWidth,
    filter,
    resizable: getOperationalResizable(lockWidth),
    operationalLockWidth: lockWidth,
    operationalSkipAutoSize: lockWidth,
    cellClass: OPERATIONAL_GRID_CLASSES.centeredCell,
    headerClass: OPERATIONAL_GRID_CLASSES.centeredHeader,
    cellRenderer: (p: any) => renderOperationalStatusPillCell(p.value || emptyValue, fontSize, emptyValue),
    hide,
  }
}

export function createOperationalMappedBadgeColumn({
  field,
  headerName,
  hide,
  width,
  minWidth = OPERATIONAL_GRID_WIDTHS.badgeMin,
  maxWidth,
  filter = true,
  fontSize,
  emptyValue = 'N/A',
  colorMap,
  fallbackClass,
  lockWidth,
  knownValues = [],
}: Omit<OperationalMappedBadgeColumnConfig, 'kind'>) {
  const resolvedWidth = getOperationalBadgeWidth({ knownValues, colorMap, emptyValue, explicitWidth: width })
  return {
    field,
    headerName,
    width: resolvedWidth,
    minWidth,
    maxWidth,
    filter,
    resizable: getOperationalResizable(lockWidth),
    operationalLockWidth: lockWidth,
    operationalSkipAutoSize: lockWidth,
    cellClass: OPERATIONAL_GRID_CLASSES.centeredCell,
    headerClass: OPERATIONAL_GRID_CLASSES.centeredHeader,
    cellRenderer: (p: any) => renderOperationalMappedBadgeCell({
      value: p.value || emptyValue,
      fontSize,
      colorMap,
      fallbackClass,
    }),
    hide,
  }
}

export function createOperationalHoverSummaryColumn({
  field,
  headerName,
  hide,
  width = 140,
  minWidth = OPERATIONAL_GRID_WIDTHS.plainMin,
  maxWidth,
  filter = true,
  fontSize,
  tone,
  emptyValue = 'N/A',
  getItems,
  getSummary,
  getTooltip,
  lockWidth,
}: Omit<OperationalHoverSummaryColumnConfig, 'kind'> & { maxWidth?: number; minWidth?: number }) {
  return {
    field,
    headerName,
    width,
    minWidth,
    maxWidth,
    filter,
    resizable: getOperationalResizable(lockWidth),
    operationalLockWidth: lockWidth,
    operationalSkipAutoSize: lockWidth,
    cellClass: OPERATIONAL_GRID_CLASSES.centeredCell,
    headerClass: OPERATIONAL_GRID_CLASSES.centeredHeader,
    valueFormatter: (p: any) => {
      const items = getItems(p)
      return items?.length ? getSummary(items, p) : emptyValue
    },
    cellRenderer: (p: any) => {
      const items = getItems(p)
      if (!items?.length) {
        return <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500">{emptyValue}</span>
      }
      return (
        <div className="flex items-center justify-center h-full">
          <HoverPreview
            summary={getSummary(items, p)}
            tooltip={getTooltip(items, p)}
            tone={tone}
            fontSize={fontSize}
          />
        </div>
      )
    },
    hide,
  }
}

export function createOperationalActiveDotColumn({
  field,
  headerName,
  hide,
  width = OPERATIONAL_GRID_WIDTHS.dot,
  getIsDeleted,
  minWidth = 48,
  maxWidth = 88,
}: Omit<OperationalActiveDotColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    minWidth,
    maxWidth,
    resizable: true,
    operationalSkipAutoSize: true,
    cellClass: OPERATIONAL_GRID_CLASSES.activeDotCell,
    headerClass: OPERATIONAL_GRID_CLASSES.activeDotHeader,
    cellRenderer: (p: any) => renderOperationalActiveDotCell({
      value: Boolean(p.value),
      isDeleted: getIsDeleted?.(p) ?? false,
    }),
    hide,
  }
}

export function createOperationalActionLinkColumn({
  field,
  headerName,
  hide,
  width = OPERATIONAL_GRID_WIDTHS.actionLink,
  minWidth = OPERATIONAL_GRID_WIDTHS.plainMin,
  maxWidth,
  filter = true,
  fontSize,
  emptyValue = 'N/A',
  onActivate,
  lockWidth,
}: Omit<OperationalActionLinkColumnConfig, 'kind'> & { maxWidth?: number; minWidth?: number }) {
  return {
    field,
    headerName,
    width,
    minWidth,
    maxWidth,
    filter,
    resizable: getOperationalResizable(lockWidth),
    operationalLockWidth: lockWidth,
    operationalSkipAutoSize: lockWidth,
    cellClass: OPERATIONAL_GRID_CLASSES.centeredCell,
    headerClass: OPERATIONAL_GRID_CLASSES.centeredHeader,
    cellRenderer: (p: any) => (
      <div className="flex items-center justify-center h-full">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onActivate(p)
          }}
          className={`${OPERATIONAL_GRID_ACTION_LINK_CLASS} hover:text-blue-400 transition-colors`}
        >
          <span
            style={{ fontSize: `${fontSize}px` }}
            className={`${OPERATIONAL_GRID_PLAIN_VALUE_CLASS} border-b border-dashed border-slate-700 text-slate-300`}
          >
            {p.value || emptyValue}
          </span>
        </button>
      </div>
    ),
    hide,
  }
}

export function createOperationalDateColumn({
  field,
  headerName,
  hide,
  width = OPERATIONAL_GRID_WIDTHS.date,
  minWidth = 132,
  maxWidth,
  lockWidth,
}: Omit<OperationalDateColumnConfig, 'kind'> & { maxWidth?: number; minWidth?: number }) {
  return {
    field,
    headerName,
    width,
    minWidth,
    maxWidth,
    filter: 'agDateColumnFilter',
    resizable: getOperationalResizable(lockWidth),
    operationalLockWidth: lockWidth,
    operationalSkipAutoSize: lockWidth,
    cellClass: OPERATIONAL_GRID_CLASSES.centeredCell,
    headerClass: OPERATIONAL_GRID_CLASSES.centeredHeader,
    cellRenderer: (p: any) => p.value ? (
      <div className={OPERATIONAL_GRID_ICON_VALUE_CLASS}>
        <Clock size={12} className="opacity-40" />
        <span className={OPERATIONAL_GRID_PLAIN_VALUE_CLASS}>{formatAppDate(p.value)}</span>
      </div>
    ) : <span className={OPERATIONAL_GRID_EMPTY_VALUE_CLASS}>N/A</span>,
    hide,
  }
}

export function createOperationalUtilityColumns({
  includeRecentChange = true,
  includeFavorite = true,
  includeWatch = true,
  isIntelligenceExpanded = true,
  isRecentChange,
  onToggleFavorite,
  onToggleWatch,
  itemLabel,
}: OperationalUtilityColumnsConfig) {
  // Source of truth: checkbox/activity column behavior and widths.
  return [
    {
      colId: 'select',
      headerName: '',
      width: OPERATIONAL_GRID_WIDTHS.utilityCheckbox,
      minWidth: OPERATIONAL_GRID_WIDTHS.utilityCheckbox,
      maxWidth: OPERATIONAL_GRID_WIDTHS.utilityCheckbox,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      pinned: 'left',
      cellClass: OPERATIONAL_GRID_CLASSES.selectCell,
      headerClass: OPERATIONAL_GRID_CLASSES.selectHeader,
      suppressSizeToFit: true,
      resizable: false,
      sortable: false,
      filter: false,
      lockVisible: true,
      operationalLockWidth: true,
      operationalSkipAutoSize: true,
    },
    {
      colId: 'id',
      field: 'id',
      headerName: 'ID',
      width: OPERATIONAL_GRID_WIDTHS.id,
      minWidth: OPERATIONAL_GRID_WIDTHS.id,
      maxWidth: OPERATIONAL_GRID_WIDTHS.id,
      pinned: 'left',
      cellClass: OPERATIONAL_GRID_CLASSES.idCell,
      headerClass: OPERATIONAL_GRID_CLASSES.idHeader,
      filter: 'agNumberColumnFilter',
      resizable: false,
      lockVisible: true,
      operationalLockWidth: true,
      operationalSkipAutoSize: true,
      checkboxSelection: false,
      headerCheckboxSelection: false,
    },
    ...(includeRecentChange ? [{
      colId: 'recent_change',
      headerName: 'Chg',
      field: 'recent_change',
      width: OPERATIONAL_GRID_WIDTHS.utilityRecentChange,
      minWidth: OPERATIONAL_GRID_WIDTHS.utilityRecentChange,
      maxWidth: OPERATIONAL_GRID_WIDTHS.utilityRecentChange,
      pinned: 'left',
      resizable: false,
      sortable: false,
      filter: false,
      lockVisible: true,
      cellClass: OPERATIONAL_GRID_CLASSES.recentChangeCell,
      headerClass: OPERATIONAL_GRID_CLASSES.recentChangeHeader,
      hide: !isIntelligenceExpanded,
      operationalLockWidth: true,
      operationalSkipAutoSize: true,
      checkboxSelection: false,
      headerCheckboxSelection: false,
      cellRenderer: (p: any) => {
        if (!p.data || !isRecentChange(p.data)) return null
        const dateStr = formatAppDate(p.data.updated_at || p.data.created_at)
        const author = p.data.created_by_user_id || 'System'
        return (
          <div className="group relative flex items-center justify-center h-full w-full">
            <div className="absolute h-10 w-10 rounded-lg bg-[radial-gradient(circle,_rgba(251,191,36,0.2)_0%,_transparent_70%)] blur-md animate-pulse" />
            <span className="relative z-[1] block h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
            <div className="invisible group-hover:visible absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-[2000] w-52 p-3 rounded-lg border border-white/10 bg-slate-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl pointer-events-none transition-all duration-300 transform scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">Recent Activity</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-slate-100 font-bold leading-tight">{dateStr}</p>
                <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-white/5">
                  <User size={10} className="text-slate-500" />
                  <p className="text-[9px] text-slate-500 font-bold tracking-widest">@{author}</p>
                </div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-950/90" />
            </div>
          </div>
        )
      },
    }] : []),
    ...(includeFavorite ? [{
      colId: 'favorite',
      headerName: 'Fav',
      field: 'favorite',
      width: OPERATIONAL_GRID_WIDTHS.utilityFavorite,
      minWidth: OPERATIONAL_GRID_WIDTHS.utilityFavorite,
      maxWidth: OPERATIONAL_GRID_WIDTHS.utilityFavorite,
      pinned: 'left',
      cellClass: OPERATIONAL_GRID_CLASSES.favoriteCell,
      headerClass: OPERATIONAL_GRID_CLASSES.favoriteHeader,
      resizable: false,
      sortable: true,
      filter: false,
      lockVisible: true,
      operationalLockWidth: true,
      operationalSkipAutoSize: true,
      checkboxSelection: false,
      headerCheckboxSelection: false,
      valueGetter: (p: any) => hasOperationalId(p.context?.favoriteIds, p.data?.id) ? 1 : 0,
      cellRenderer: (p: any) => {
        const isFavorite = hasOperationalId(p.context?.favoriteIds, p.data?.id)
        const dataId = p.data?.id
        return (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={(event) => {
                event.stopPropagation()
                if (dataId == null) return
                onToggleFavorite(dataId)
              }}
              title={isFavorite ? `Unpin ${itemLabel}` : `Pin ${itemLabel}`}
              className={`rounded-lg p-1 transition-all flex items-center justify-center ${isFavorite ? 'text-amber-300' : 'text-slate-600 hover:text-slate-300'}`}
            >
              <Star size={15} className={isFavorite ? 'fill-current' : ''} />
            </button>
          </div>
        )
      },
    }] : []),
    ...(includeWatch ? [{
      colId: 'watch',
      headerName: 'Watch',
      field: 'watch',
      width: OPERATIONAL_GRID_WIDTHS.utilityWatch,
      minWidth: OPERATIONAL_GRID_WIDTHS.utilityWatch,
      maxWidth: OPERATIONAL_GRID_WIDTHS.utilityWatch,
      pinned: 'left',
      cellClass: OPERATIONAL_GRID_CLASSES.watchCell,
      headerClass: OPERATIONAL_GRID_CLASSES.watchHeader,
      resizable: false,
      sortable: false,
      filter: false,
      lockVisible: true,
      hide: !isIntelligenceExpanded,
      operationalLockWidth: true,
      operationalSkipAutoSize: true,
      checkboxSelection: false,
      headerCheckboxSelection: false,
      cellRenderer: (p: any) => {
        const isWatched = hasOperationalId(p.context?.watchIds, p.data?.id)
        const dataId = p.data?.id
        return (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={(event) => {
                event.stopPropagation()
                if (dataId == null) return
                onToggleWatch(dataId)
              }}
              title={isWatched ? `Unfollow ${itemLabel}` : `Follow ${itemLabel}`}
              className={`rounded-lg p-1 transition-all flex items-center justify-center ${isWatched ? 'text-sky-300' : 'text-slate-600 hover:text-slate-300'}`}
            >
              <Eye size={15} className={isWatched ? 'fill-current' : ''} />
            </button>
          </div>
        )
      },
    }] : []),
  ]
}

export function buildOperationalColumnDefinition(config: OperationalColumnConfig) {
  // Source of truth: shared column contract kind-to-renderer mapping.
  switch (config.kind) {
    case 'plain':
      return createOperationalPlainValueColumn(config)
    case 'identity':
      return createOperationalIdentityColumnDefinition(config)
    case 'prose':
      return createOperationalProseColumn(config)
    case 'date':
      return createOperationalDateColumn(config)
    case 'badge':
      return createOperationalStatusBadgeColumn(config)
    case 'mappedBadge':
      return createOperationalMappedBadgeColumn(config)
    case 'mappedText':
      return createOperationalMappedTextColumn(config)
    case 'hoverSummary':
      return createOperationalHoverSummaryColumn(config)
    case 'activeDot':
      return createOperationalActiveDotColumn(config)
    case 'actionLink':
      return createOperationalActionLinkColumn(config)
    case 'action':
      return createOperationalActionColumnDefinition({
        width: config.width ?? OPERATIONAL_GRID_WIDTHS.compactAction,
        renderActions: config.renderActions,
      })
    default:
      const exhaustiveCheck: never = config
      return exhaustiveCheck
  }
}

export function buildOperationalColumnDefinitions(configs: OperationalColumnConfig[]) {
  return configs.map((config) => buildOperationalColumnDefinition(config))
}

export function buildOperationalGridColumnDefinitions({
  utilityColumnsConfig,
  columnConfigs,
  columnLayoutState,
  preserveExplicitColumnWidths,
}: {
  utilityColumnsConfig?: OperationalUtilityColumnsConfig
  columnConfigs: OperationalColumnConfig[]
  columnLayoutState: any[]
  preserveExplicitColumnWidths: boolean
}) {
  const layoutById = new Map((columnLayoutState || []).map((column: any) => [column.colId, column]))
  const baseColumns = [
    ...(utilityColumnsConfig ? createOperationalUtilityColumns(utilityColumnsConfig) : []),
    ...buildOperationalColumnDefinitions(columnConfigs),
  ]

  const mergedColumns = baseColumns.map((column: any) => {
    if (column.children) {
      return {
        ...column,
        children: column.children.map((child: any) => {
          const childId = child.colId || child.field
          const layout = layoutById.get(childId)
          return finalizeOperationalColumnDefinition(child, layout, preserveExplicitColumnWidths)
        })
      }
    }
    const colId = column.colId || column.field
    const layout = layoutById.get(colId)
    return finalizeOperationalColumnDefinition(column, layout, preserveExplicitColumnWidths)
  })

  return orderOperationalColumnDefinitions(mergedColumns, columnLayoutState)
}
