import React, { useCallback } from 'react'
import { Clock, Eye, Star, User } from 'lucide-react'
import { formatAppDate } from '../../utils/dateUtils'
import {
  applyOperationalActionColumn,
  applyOperationalIdentityColumn,
  OPERATIONAL_GRID_WIDTHS,
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
import { WorkspaceHoverPreview as HoverPreview } from './OperationalWorkspacePrimitives'
import { StatusPill } from './StatusPill'

const hasOperationalId = (ids: any[] | undefined, id: any) => (
  Array.isArray(ids) &&
  ids.map((value) => Number(value)).includes(Number(id))
)

export function useOperationalColumnSyncHandlers(
  syncColumnLayoutState: (api: any, preserveWidths?: boolean) => void,
  preserveWidths: boolean
) {
  const handleColumnMoved = useCallback((event: any) => {
    if (!event?.source?.includes?.('drag')) syncColumnLayoutState(event.api, preserveWidths)
  }, [preserveWidths, syncColumnLayoutState])

  const handleDragStopped = useCallback((event: any) => {
    syncColumnLayoutState(event.api, preserveWidths)
  }, [preserveWidths, syncColumnLayoutState])

  const handleColumnPinned = useCallback((event: any) => {
    syncColumnLayoutState(event.api, preserveWidths)
  }, [preserveWidths, syncColumnLayoutState])

  const handleColumnVisible = useCallback((event: any) => {
    syncColumnLayoutState(event.api, preserveWidths)
  }, [preserveWidths, syncColumnLayoutState])

  return {
    handleColumnMoved,
    handleDragStopped,
    handleColumnPinned,
    handleColumnVisible,
  }
}

export function renderOperationalStatusPillCell(value: string | null | undefined, fontSize: number, emptyValue: string = 'N/A') {
  return <StatusPill value={value || emptyValue} fontSize={fontSize} />
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
  const label = value || 'N/A'
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className={`flex h-5 items-center justify-center rounded-lg border px-3 shadow-sm ${colorMap[label] || fallbackClass}`}>
        <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase tracking-tighter leading-none">
          {label}
        </span>
      </div>
    </div>
  )
}

export function renderOperationalActiveDotCell({
  value,
  isDeleted = false,
}: {
  value: boolean
  isDeleted?: boolean
}) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${isDeleted ? 'bg-slate-700' : value ? 'bg-emerald-500' : 'bg-rose-500/50'}`} />
        {(value && !isDeleted) && (
          <div className="absolute -inset-1 rounded-lg bg-emerald-500 animate-pulse opacity-40 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
        )}
      </div>
    </div>
  )
}

export function renderOperationalActionButtons(children: React.ReactNode) {
  return <div className="flex items-center justify-center gap-1.5">{children}</div>
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
  minWidth,
  maxWidth,
  filter = true,
  emptyValue = 'N/A',
  formatValue,
  valueClassName,
}: Omit<OperationalPlainColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    minWidth,
    maxWidth,
    filter,
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
  filter = true,
  fontSize,
  emptyValue = 'N/A',
  colorMap,
  fallbackClass = 'text-slate-400',
}: Omit<OperationalMappedTextColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    filter,
    cellClass: OPERATIONAL_GRID_CLASSES.centeredCell,
    headerClass: OPERATIONAL_GRID_CLASSES.centeredHeader,
    cellRenderer: (p: any) => (
      <span
        style={{ fontSize: `${fontSize}px` }}
        className={`font-bold ${colorMap[p.value] || (p.value ? fallbackClass : 'text-slate-500')}`}
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
  minWidth = 180,
  filter = true,
  emptyValue = 'N/A',
}: Omit<OperationalProseColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    minWidth,
    filter,
    cellClass: OPERATIONAL_GRID_CLASSES.leftBodyCell,
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
  width = 130,
  filter = true,
  fontSize,
  emptyValue = 'N/A',
}: Omit<OperationalBadgeColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    filter,
    cellClass: 'text-center flex items-center justify-center',
    headerClass: 'text-center',
    cellRenderer: (p: any) => renderOperationalStatusPillCell(p.value || emptyValue, fontSize, emptyValue),
    hide,
  }
}

export function createOperationalMappedBadgeColumn({
  field,
  headerName,
  hide,
  width = 120,
  filter = true,
  fontSize,
  emptyValue = 'N/A',
  colorMap,
  fallbackClass,
}: Omit<OperationalMappedBadgeColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    filter,
    cellClass: 'text-center flex items-center justify-center',
    headerClass: 'text-center',
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
  filter = true,
  fontSize,
  tone,
  emptyValue = 'N/A',
  getItems,
  getSummary,
  getTooltip,
}: Omit<OperationalHoverSummaryColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    filter,
    cellClass: 'text-center flex items-center justify-center',
    headerClass: 'text-center',
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
  width = 70,
  getIsDeleted,
}: Omit<OperationalActiveDotColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    cellClass: OPERATIONAL_GRID_CLASSES.centeredOverflowCell,
    headerClass: OPERATIONAL_GRID_CLASSES.centeredHeader,
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
  width = 130,
  filter = true,
  fontSize,
  emptyValue = 'N/A',
  onActivate,
}: Omit<OperationalActionLinkColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    filter,
    cellClass: 'text-center flex items-center justify-center',
    headerClass: 'text-center',
    cellRenderer: (p: any) => (
      <div className="flex items-center justify-center h-full">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onActivate(p)
          }}
          className="flex items-center space-x-1 hover:text-blue-400 transition-colors"
        >
          <span style={{ fontSize: `${fontSize}px` }} className="font-bold text-slate-300 border-b border-dashed border-slate-700">
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
  width = 180,
}: Omit<OperationalDateColumnConfig, 'kind'>) {
  return {
    field,
    headerName,
    width,
    filter: 'agDateColumnFilter',
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
  return [
    {
      colId: 'select',
      headerName: '',
      width: 48,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      pinned: 'left',
      cellClass: OPERATIONAL_GRID_CLASSES.utilityCell,
      headerClass: OPERATIONAL_GRID_CLASSES.utilityHeader,
      suppressSizeToFit: true,
      sortable: false,
      filter: false,
      lockVisible: true,
    },
    {
      colId: 'id',
      field: 'id',
      headerName: 'ID',
      width: 90,
      pinned: 'left',
      cellClass: OPERATIONAL_GRID_CLASSES.idCell,
      headerClass: OPERATIONAL_GRID_CLASSES.idHeader,
      filter: 'agNumberColumnFilter',
      lockVisible: true,
    },
    ...(includeRecentChange ? [{
      colId: 'recent_change',
      headerName: 'Chg',
      field: 'recent_change',
      width: 80,
      pinned: 'left',
      sortable: false,
      filter: false,
      lockVisible: true,
      cellClass: OPERATIONAL_GRID_CLASSES.utilityOverflowCell,
      headerClass: OPERATIONAL_GRID_CLASSES.utilityHeader,
      hide: !isIntelligenceExpanded,
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
      width: 80,
      pinned: 'left',
      cellClass: OPERATIONAL_GRID_CLASSES.utilityCell,
      headerClass: OPERATIONAL_GRID_CLASSES.utilityHeader,
      sortable: true,
      filter: false,
      lockVisible: true,
      valueGetter: (p: any) => hasOperationalId(p.context?.favoriteIds, p.data?.id) ? 1 : 0,
      cellRenderer: (p: any) => {
        const isFavorite = hasOperationalId(p.context?.favoriteIds, p.data?.id)
        return (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={(event) => {
                event.stopPropagation()
                onToggleFavorite(p.data.id)
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
      width: 85,
      pinned: 'left',
      cellClass: OPERATIONAL_GRID_CLASSES.utilityCell,
      headerClass: OPERATIONAL_GRID_CLASSES.utilityHeader,
      sortable: false,
      filter: false,
      lockVisible: true,
      hide: !isIntelligenceExpanded,
      cellRenderer: (p: any) => {
        const isWatched = hasOperationalId(p.context?.watchIds, p.data?.id)
        return (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={(event) => {
                event.stopPropagation()
                onToggleWatch(p.data.id)
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
