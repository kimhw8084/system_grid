import React, { useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Box, X } from 'lucide-react'
import { OperationalDataGrid } from '../shared/OperationalDataGrid'
import { OperationalGroupedGridView, OperationalGroupedGridSection } from '../shared/OperationalWorkspaceShells'
import { WorkspaceEmptyState } from '../shared/OperationalWorkspacePrimitives'
import { AssetLegacyReportSurface } from './AssetLegacyReportSurface'

function AssetMapSurface({
  assets,
  connections,
  relationships,
}: {
  assets: any[]
  connections: any[]
  relationships: any[]
}) {
  const graph = useMemo(() => {
    const nodeMap = new Map<number, any>()
    assets.slice(0, 60).forEach((asset) => {
      nodeMap.set(asset.id, {
        id: asset.id,
        label: asset.name,
        status: asset.status,
        system: asset.system,
      })
    })

    const linkAccumulator: any[] = []
    connections.forEach((link: any) => {
      const source = Number(link.source_device_id)
      const target = Number(link.target_device_id)
      if (nodeMap.has(source) && nodeMap.has(target)) {
        linkAccumulator.push({ source, target, kind: 'network', label: link.link_type || 'Network' })
      }
    })
    relationships.forEach((link: any) => {
      const source = Number(link.source_device_id || link.device_id)
      const target = Number(link.target_device_id || link.related_device_id)
      if (nodeMap.has(source) && nodeMap.has(target)) {
        linkAccumulator.push({ source, target, kind: 'relationship', label: link.relationship_type || link.role || 'Relationship' })
      }
    })
    return { nodes: Array.from(nodeMap.values()), links: linkAccumulator }
  }, [assets, connections, relationships])

  if (!graph.nodes.length) {
    return <WorkspaceEmptyState title="No asset topology available" description="Add active assets with network or dependency links to populate the map surface." />
  }

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-hidden rounded-lg border border-white/5 bg-[#020617]">
        <ForceGraph2D
          graphData={graph}
          width={900}
          height={620}
          nodeRelSize={6}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.5}
          nodeCanvasObject={(node: any, ctx, scale) => {
            const label = node.label
            const size = 9
            ctx.beginPath()
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
            ctx.fillStyle = node.status === 'Active' ? '#34d399' : '#f59e0b'
            ctx.fill()
            ctx.font = `${Math.max(10, 13 / scale)}px sans-serif`
            ctx.fillStyle = '#e2e8f0'
            ctx.fillText(label, node.x + 12, node.y + 4)
          }}
          linkColor={(link: any) => link.kind === 'network' ? 'rgba(59,130,246,0.45)' : 'rgba(244,114,182,0.45)'}
        />
      </div>
      <div className="space-y-4 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-4 custom-scrollbar">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Topology dossier</p>
          <p className="pt-1 text-sm font-semibold text-slate-100">Asset map with network edges and dependency links.</p>
        </div>
        <div className="grid gap-3">
          <div className="rounded-lg border border-white/5 bg-[#020617] p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Nodes</p>
            <p className="mt-2 text-2xl font-black text-blue-300">{graph.nodes.length}</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-[#020617] p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Links</p>
            <p className="mt-2 text-2xl font-black text-emerald-300">{graph.links.length}</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-[#020617] p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Systems</p>
            <p className="mt-2 text-2xl font-black text-violet-300">{new Set(graph.nodes.map((node: any) => node.system)).size}</p>
          </div>
        </div>
        <div className="space-y-3">
          {assets.slice(0, 8).map((asset) => (
            <div key={asset.id} className="rounded-lg border border-white/5 bg-[#020617] p-3">
              <div className="flex items-center gap-2">
                <Box size={14} className="text-blue-400" />
                <p className="text-[11px] font-semibold text-slate-100">{asset.name}</p>
              </div>
              <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{asset.system} · {asset.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

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
  selectedIds,
  connections,
  relationships,
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
  selectedIds: number[]
  connections: any[]
  relationships: any[]
  onSelectionChanged: (event: any, groupKey?: string) => void
  isSelected: (id: number) => boolean
}) {
  if (viewMode === 'report') {
    return (
      <AssetLegacyReportSurface
        assets={rows}
        options={options}
        devices={devices}
        onEdit={onEditAsset}
        onViewServiceDetails={onViewServiceDetails}
        onEditService={onEditService}
      />
    )
  }

  if (viewMode === 'map') {
    return <AssetMapSurface assets={rows} connections={connections} relationships={relationships} />
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
