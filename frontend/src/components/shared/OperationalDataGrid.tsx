import React, { useMemo } from 'react'
import { OperationalGridMatrix } from './OperationalGridMatrix'
import {
  getOperationalGridSurfaceStyle,
  OPERATIONAL_GRID_COMPAT_CLASS_NAME,
  OperationalGridSurface,
} from './OperationalWorkspaceShells'
import { OPERATIONAL_GRID_AUTO_SIZE_STRATEGY } from './OperationalGridSizing'

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
  gridRef?: any
  rows: any[]
  columnDefs: any[]
  runtime: OperationalGridRuntimeLike
  rowInteractions?: OperationalRowInteractionsLike
  contextMenu?: OperationalContextMenuLike
  onSelectionChanged?: (event: any) => void
  onFirstDataRendered?: (event: any) => void
  onRowDataUpdated?: (event: any) => void
  getRowId?: (params: any) => string
  getRowClass?: (params: any) => string
  context?: any
  quickFilterText?: string
  fontSize: number
  rowDensity: number
  noRowsLabel?: string
  loading?: boolean
  loadingIcon?: React.ReactNode
  loadingLabel?: React.ReactNode
  emptyOverlay?: React.ReactNode
  showEmptyOverlay?: boolean
  className?: string
  height?: string
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
  context,
  quickFilterText,
  fontSize,
  rowDensity,
  noRowsLabel = 'No data found',
  loading,
  loadingIcon,
  loadingLabel,
  emptyOverlay,
  showEmptyOverlay = false,
  className = '',
  height,
}: OperationalDataGridProps) {
  const autoSizeStrategy = useMemo(
    () => (runtime?.preserveExplicitColumnWidths ? undefined : OPERATIONAL_GRID_AUTO_SIZE_STRATEGY),
    [runtime?.preserveExplicitColumnWidths]
  )

  return (
    <OperationalGridSurface
      className={[OPERATIONAL_GRID_COMPAT_CLASS_NAME, className].filter(Boolean).join(' ')}
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
        noRowsLabel={noRowsLabel}
      />
      {showEmptyOverlay ? emptyOverlay : null}
    </OperationalGridSurface>
  )
}
