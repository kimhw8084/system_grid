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

  if (dataState?.kind === 'query-error') {
    return (
      <OperationalGridSurface
        className={className}
        style={getOperationalGridSurfaceStyle(fontSize, height)}
        loading={false}
      >
        <WorkspaceEmptyState
          title={dataState.title}
          description={dataState.description}
        />
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
    </OperationalGridSurface>
  )
}
