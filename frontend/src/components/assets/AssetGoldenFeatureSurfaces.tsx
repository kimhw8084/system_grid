import React, { useMemo } from 'react'
import { X } from 'lucide-react'
import { OperationalDataGrid } from '../shared/OperationalDataGrid'
import { OperationalGroupedGridView, OperationalGroupedGridSection } from '../shared/OperationalWorkspaceShells'
import { AssetLegacyReportSurface } from './AssetLegacyReportSurface'
import { AssetLegacyMapSurface } from './AssetLegacyMapSurface'

export function AssetGoldenFeatureSurfaces({
  gridRef,
  columnDefs,
  contextMenu,
  devices,
  dataState,
  fontSize,
  getRowClass,
  getRowId,
  groupBy,
  groupOptions,
  collapsedGroups,
  onSetCollapsedGroups,
  onCancelGrouping,
  onSelectReportAsset,
  options,
  onEditAsset,
  onViewServiceDetails,
  onEditService,
  rowDensity,
  rows,
  runtime,
  rowInteractions,
  selectionScopeKey,
  viewMode,
  connections,
  relationships,
  reportAssetId,
  systemsList,
  onSelectionChanged,
  isSelected,
}: {
  gridRef?: React.RefObject<any>
  columnDefs: any[]
  contextMenu: { handleCellContextMenu: (event: any) => void }
  devices: any[]
  dataState: any
  fontSize: number
  getRowClass?: (params: any) => string
  getRowId?: (params: any) => string
  groupBy: string
  groupOptions: Array<{ value: string; label: string }>
  collapsedGroups: Record<string, boolean>
  onSetCollapsedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  onCancelGrouping: () => void
  onSelectReportAsset: (asset: any) => void
  options: any[]
  onEditAsset: (asset: any) => void
  onViewServiceDetails: (service: any) => void
  onEditService: (service: any) => void
  rowDensity: number
  rows: any[]
  runtime: any
  rowInteractions: any
  selectionScopeKey: string
  viewMode: 'grid' | 'report' | 'map'
  connections: any[]
  relationships: any[]
  reportAssetId?: number | null
  systemsList: string[]
  onSelectionChanged: (event: any, groupKey?: string) => void
  isSelected: (id: number) => boolean
}) {
  if (viewMode === 'report') {
    return (
      <AssetLegacyReportSurface
        assets={rows}
        options={options}
        devices={devices}
        selectedAssetId={reportAssetId}
        onSelectAsset={onSelectReportAsset}
        onEdit={onEditAsset}
        onViewServiceDetails={onViewServiceDetails}
        onEditService={onEditService}
      />
    )
  }

  if (viewMode === 'map') {
    return <AssetLegacyMapSurface assets={rows} connections={connections} relationships={relationships} systemsList={systemsList} />
  }

  const groupedSections = groupBy === 'raw'
    ? []
    : rows.reduce((acc: Array<{ key: string; label: string; items: any[] }>, item: any) => {
        const label = String(item?.[groupBy] || 'Unassigned')
        const existing = acc.find((section) => section.key === label)
        if (existing) {
          existing.items.push(item)
        } else {
          acc.push({ key: label, label, items: [item] })
        }
        return acc
      }, []).sort((a, b) => a.label.localeCompare(b.label))

  if (groupBy !== 'raw') {
    return (
      <OperationalGroupedGridView
        summary={(
          <div>
            <p className="text-[10px] font-semibold text-slate-400">Grouped asset matrix</p>
            <p className="pt-1 text-[12px] font-semibold text-slate-100">Sorted by {groupOptions.find((option) => option.value === groupBy)?.label || groupBy}</p>
          </div>
        )}
        actions={(
          <>
            <button type="button" onClick={() => onSetCollapsedGroups(groupedSections.reduce((acc: any, section: any) => ({ ...acc, [section.key]: false }), {}))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-semibold text-slate-400 transition-all hover:bg-white/10 hover:text-white">
              Expand All
            </button>
            <button type="button" onClick={() => onSetCollapsedGroups(groupedSections.reduce((acc: any, section: any) => ({ ...acc, [section.key]: true }), {}))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-semibold text-slate-400 transition-all hover:bg-white/10 hover:text-white">
              Collapse All
            </button>
            <div className="mx-1 h-6 w-px bg-white/10" />
            <button type="button" onClick={onCancelGrouping} className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[9px] font-semibold text-rose-400 transition-all hover:bg-rose-500/20">
              <X size={12} />
              <span>Cancel</span>
            </button>
          </>
        )}
        sections={groupedSections.map((section) => {
          const isCollapsed = collapsedGroups[section.key]
          const selectedCountForSection = section.items.filter((item: any) => isSelected(Number(item.id))).length
          return (
            <OperationalGroupedGridSection
              key={section.key}
              labelMeta={<span className="text-[9px] font-semibold text-blue-400">{groupOptions.find((option) => option.value === groupBy)?.label}</span>}
              label={section.label}
              count={section.items.length}
              countLabel="assets"
              selectedCount={selectedCountForSection}
              collapsed={Boolean(isCollapsed)}
              onToggle={() => onSetCollapsedGroups((current) => ({ ...current, [section.key]: !current[section.key] }))}
            >
              {!isCollapsed ? (
                <OperationalDataGrid
                  rows={section.items}
                  columnDefs={columnDefs}
                  runtime={runtime}
                  rowInteractions={rowInteractions}
                  contextMenu={contextMenu}
                  onSelectionChanged={(event: any) => onSelectionChanged(event, section.key)}
                  selectionScopeKey={selectionScopeKey}
                  getRowId={getRowId}
                  getRowClass={getRowClass}
                  fontSize={fontSize}
                  rowDensity={rowDensity}
                  noRowsLabel="No assets found"
                  className="w-full"
                  height={`${Math.min(600, section.items.length * (fontSize + rowDensity + 5) + 40)}px`}
                  suppressRowClickSelection={false}
                />
              ) : null}
            </OperationalGroupedGridSection>
          )
        })}
      />
    )
  }

  return (
    <OperationalDataGrid
      gridRef={gridRef}
      rows={rows}
      columnDefs={columnDefs}
      runtime={runtime}
      rowInteractions={rowInteractions}
      contextMenu={contextMenu}
      onSelectionChanged={(event: any) => onSelectionChanged(event, 'raw')}
      selectionScopeKey={selectionScopeKey}
      getRowId={getRowId}
      getRowClass={getRowClass}
      fontSize={fontSize}
      rowDensity={rowDensity}
      dataState={dataState}
      noRowsLabel="No assets match the current working set."
      height="calc(100vh - 250px)"
      suppressRowClickSelection={false}
    />
  )
}
