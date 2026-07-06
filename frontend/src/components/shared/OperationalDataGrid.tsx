import React, { useMemo } from 'react'
import { OperationalGridMatrix } from './OperationalGridMatrix'
import {
  getOperationalGridSurfaceStyle,
  OperationalGridSurface,
} from './OperationalWorkspaceShells'
import { OPERATIONAL_GRID_AUTO_SIZE_STRATEGY } from './OperationalGridSizing'
import { WorkspaceEmptyState } from './OperationalWorkspacePrimitives'
import type { OperationalDataState } from './OperationalDataState'

type OperationalGridRuntimeLike = {
  preserveExplicitColumnWidths?: boolean
  handleGridReady?: (params: any) => void
  handleColumnResized?: (event: any) => void
  handleColumnMoved?: (event: any) => void
  handleDragStopped?: (event: any) => void
  handleColumnPinned?: (event: any) => void
  handleColumnVisible?: (event: any) => void
  handleFilterChanged?: (event: any) => void
  handleSortChanged?: (event: any) => void
}

type OperationalRowInteractionsLike = {
  handleRowClicked?: (event: any) => void
  handleRowDoubleClicked?: (event: any) => void
}

type OperationalContextMenuLike = {
  handleCellContextMenu?: (event: any) => void
}

interface OperationalDataGridProps {
  gridRef?: React.RefObject<any>
  rows: any[] | undefined
  columnDefs: any[]
  runtime: OperationalGridRuntimeLike
  rowInteractions?: OperationalRowInteractionsLike
  contextMenu?: OperationalContextMenuLike
  onSelectionChanged?: (event: any) => void
  onFirstDataRendered?: (event: any) => void
  onRowDataUpdated?: (event: any) => void
  getRowId?: (params: any) => string
  getRowClass?: (params: any) => string
  selectionScopeKey?: string | number | null
  context?: any
  quickFilterText?: string
  fontSize?: number
  rowDensity?: number
  noRowsLabel?: string
  loading?: boolean
  loadingIcon?: React.ReactNode
  loadingLabel?: React.ReactNode
  dataState?: OperationalDataState
  className?: string
  height?: string
  suppressRowClickSelection?: boolean
}

export function OperationalDataGrid({
  gridRef,
  rows,
  columnDefs,
  runtime,
  rowInteractions,
  contextMenu,
  onSelectionChanged,
  onFirstDataRendered,
  onRowDataUpdated,
  getRowId,
  getRowClass,
  selectionScopeKey,
  context,
  quickFilterText,
  fontSize = 11,
  rowDensity = 24,
  noRowsLabel = 'No data found',
  loading = false,
  loadingIcon,
  loadingLabel,
  dataState,
  className = '',
  height,
  suppressRowClickSelection = true,
}: OperationalDataGridProps) {
  const autoSizeStrategy = useMemo(
    () => (runtime?.preserveExplicitColumnWidths ? undefined : OPERATIONAL_GRID_AUTO_SIZE_STRATEGY),
    [runtime?.preserveExplicitColumnWidths]
  )
  const noticeToneClass = dataState?.notice?.tone === 'error'
    ? 'border-rose-500/30 bg-rose-500/10 text-rose-100'
    : dataState?.notice?.tone === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : 'border-blue-500/25 bg-blue-500/10 text-slate-100'
  const notice = dataState?.notice ? (
    <div className={`border-b px-4 py-3 ${noticeToneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em]">{dataState.notice.title}</p>
      {dataState.notice.description ? <p className="pt-1 text-[11px] text-slate-300">{dataState.notice.description}</p> : null}
    </div>
  ) : null
  const shouldRenderEmptyState = Boolean(
    dataState &&
    dataState.kind !== 'ready' &&
    dataState.kind !== 'loading' &&
    dataState.kind !== 'query-error' &&
    dataState.title
  )

  if (dataState?.kind === 'query-error') {
    return (
      <OperationalGridSurface
        className={className}
        style={getOperationalGridSurfaceStyle(fontSize, height)}
        loading={false}
      >
        {notice}
        <div className="flex flex-1 items-center justify-center p-4">
          <WorkspaceEmptyState
            title={dataState.title}
            description={dataState.description}
          />
        </div>
      </OperationalGridSurface>
    )
  }

  if (shouldRenderEmptyState) {
    return (
      <OperationalGridSurface
        className={className}
        style={getOperationalGridSurfaceStyle(fontSize, height)}
        loading={false}
      >
        {notice}
        <div className="flex flex-1 items-center justify-center p-4">
          <WorkspaceEmptyState
            title={dataState?.title || noRowsLabel}
            description={dataState?.description}
          />
        </div>
      </OperationalGridSurface>
    )
  }

  return (
    <OperationalGridSurface
      className={className}
      style={getOperationalGridSurfaceStyle(fontSize, height)}
      loading={loading}
      loadingIcon={loadingIcon}
      loadingLabel={loadingLabel}
    >
      {notice}
      <div className="min-h-0 flex-1">
        <OperationalGridMatrix
          gridRef={gridRef}
          rowData={rows}
          columnDefs={columnDefs}
          autoSizeStrategy={autoSizeStrategy}
          colResizeDefault="normal"
          fontSize={fontSize}
          rowDensity={rowDensity}
          context={context}
          quickFilterText={quickFilterText}
          getRowId={getRowId}
          getRowClass={getRowClass}
          selectionScopeKey={selectionScopeKey}
          onGridReady={runtime.handleGridReady}
          onSelectionChanged={onSelectionChanged}
          onColumnResized={runtime.handleColumnResized}
          onColumnMoved={runtime.handleColumnMoved}
          onDragStopped={runtime.handleDragStopped}
          onColumnPinned={runtime.handleColumnPinned}
          onColumnVisible={runtime.handleColumnVisible}
          onFilterChanged={runtime.handleFilterChanged}
          onSortChanged={runtime.handleSortChanged}
          onRowClicked={rowInteractions?.handleRowClicked}
          onRowDoubleClicked={rowInteractions?.handleRowDoubleClicked}
          onCellContextMenu={contextMenu?.handleCellContextMenu}
          onFirstDataRendered={onFirstDataRendered}
          onRowDataUpdated={onRowDataUpdated}
          noRowsLabel={dataState?.noRowsLabel || noRowsLabel}
          suppressRowClickSelection={suppressRowClickSelection}
        />
      </div>
    </OperationalGridSurface>
  )
}
