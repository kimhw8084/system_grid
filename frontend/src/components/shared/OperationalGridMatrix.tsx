import React, { useEffect, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { OPERATIONAL_GRID_CLASSES } from './OperationalGridContract'

export const OperationalGridMatrix = React.memo(({
  gridRef,
  rowData,
  columnDefs,
  autoSizeStrategy,
  colResizeDefault = 'normal',
  fontSize,
  rowDensity,
  context,
  getRowId,
  onGridReady,
  onSelectionChanged,
  onColumnResized,
  onColumnMoved,
  onDragStopped,
  onColumnPinned,
  onColumnVisible,
  onFilterChanged,
  onSortChanged,
  onRowClicked,
  onRowDoubleClicked,
  onCellContextMenu,
  getRowClass,
  onFirstDataRendered,
  onRowDataUpdated,
  quickFilterText,
  noRowsLabel = 'No data found',
}: any) => {
  const apiRef = useRef<any>(null)

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    suppressMovable: false,
    wrapText: false,
    autoHeight: false,
    cellClass: OPERATIONAL_GRID_CLASSES.centeredCell,
    headerClass: OPERATIONAL_GRID_CLASSES.centeredHeader,
  }), [])

  useEffect(() => {
    if (apiRef.current && context) {
      apiRef.current.refreshCells({ force: true })
    }
  }, [context])

  return (
    <AgGridReact
      ref={(ref) => {
        apiRef.current = ref?.api
        if (gridRef) {
          if (typeof gridRef === 'function') gridRef(ref)
          else gridRef.current = ref
        }
      }}
      rowData={rowData}
      columnDefs={columnDefs}
      autoSizeStrategy={autoSizeStrategy}
      colResizeDefault={colResizeDefault}
      defaultColDef={defaultColDef}
      getRowId={getRowId}
      rowSelection="multiple"
      animateRows={false}
      headerHeight={fontSize + rowDensity + 10}
      rowHeight={fontSize + rowDensity + 4}
      rowBuffer={6}
      valueCache={true}
      context={context}
      quickFilterText={quickFilterText}
      onGridReady={onGridReady}
      onSelectionChanged={onSelectionChanged}
      onColumnResized={onColumnResized}
      onColumnMoved={onColumnMoved}
      onDragStopped={onDragStopped}
      onColumnPinned={onColumnPinned}
      onColumnVisible={onColumnVisible}
      onFilterChanged={onFilterChanged}
      onSortChanged={onSortChanged}
      onRowClicked={onRowClicked}
      onRowDoubleClicked={onRowDoubleClicked}
      onCellContextMenu={onCellContextMenu}
      getRowClass={getRowClass}
      onFirstDataRendered={onFirstDataRendered}
      onRowDataUpdated={onRowDataUpdated}
      suppressScrollOnNewData={true}
      suppressCellFocus={true}
      suppressRowClickSelection={true}
      enableCellTextSelection={true}
      suppressMovableColumns={false}
      ensureDomOrder={false}
      overlayNoRowsTemplate={`<span class='text-slate-500 font-semibold text-[10px]'>${noRowsLabel}</span>`}
    />
  )
}, (prev, next) => {
  return prev.rowData === next.rowData &&
    prev.columnDefs === next.columnDefs &&
    prev.fontSize === next.fontSize &&
    prev.rowDensity === next.rowDensity &&
    prev.context === next.context &&
    prev.quickFilterText === next.quickFilterText
})

OperationalGridMatrix.displayName = 'OperationalGridMatrix'
