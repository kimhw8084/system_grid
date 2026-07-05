import React, { useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Activity, ArrowRightLeft, Box, Network as NetworkIcon, Shield, Zap } from 'lucide-react'
import { OperationalDataGrid } from '../shared/OperationalDataGrid'
import { OperationalGroupedGridView, OperationalGroupedGridSection } from '../shared/OperationalWorkspaceShells'
import { WorkspaceEmptyState } from '../shared/OperationalWorkspacePrimitives'

function ReportMetric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-tight ${tone}`}>{value}</p>
    </div>
  )
}

function AssetReportSurface({
  assets,
  selectedIds,
}: {
  assets: any[]
  selectedIds: number[]
}) {
  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedIds.includes(asset.id)),
    [assets, selectedIds]
  )
  const degraded = assets.filter((asset) => asset.status !== 'Active' || Number(asset.open_incident_count || 0) > 0)
  const unowned = assets.filter((asset) => !String(asset.owner || '').trim())

  return (
    <OperationalGroupedGridView
      summary={(
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Asset report surface</p>
          <p className="pt-1 text-sm font-semibold text-slate-100">Golden template summary for lifecycle, risk, and ownership review.</p>
        </div>
      )}
      sections={(
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <ReportMetric label="Visible Assets" value={assets.length} tone="text-blue-300" />
            <ReportMetric label="Degraded" value={degraded.length} tone="text-amber-300" />
            <ReportMetric label="Unowned" value={unowned.length} tone="text-rose-300" />
            <ReportMetric label="Selected" value={selectedAssets.length} tone="text-emerald-300" />
          </div>

          <OperationalGroupedGridSection
            labelMeta={<Activity size={14} className="text-blue-400" />}
            label="Degraded lifecycle slice"
            count={degraded.length}
            countLabel="assets"
            collapsed={false}
            onToggle={() => {}}
          >
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {degraded.slice(0, 9).map((asset) => (
                <article key={asset.id} className="rounded-lg border border-white/5 bg-[#020617] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-100">{asset.name}</p>
                      <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{asset.system} · {asset.type}</p>
                    </div>
                    <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-300">
                      {asset.status}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-[11px] text-slate-300">
                    <p>Owner: {asset.owner || 'Unowned'}</p>
                    <p>Incidents: {asset.open_incident_count}</p>
                    <p>Hardware: {asset.hardware_summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </OperationalGroupedGridSection>

          <OperationalGroupedGridSection
            labelMeta={<Shield size={14} className="text-rose-400" />}
            label="Ownership and security queue"
            count={unowned.length}
            countLabel="assets"
            collapsed={false}
            onToggle={() => {}}
          >
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {unowned.slice(0, 6).map((asset) => (
                <div key={asset.id} className="rounded-lg border border-white/5 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-slate-100">{asset.name}</p>
                  <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{asset.environment} · {asset.type}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Primary IP</p>
                      <p>{asset.primary_ip || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Mgmt IP</p>
                      <p>{asset.management_ip || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </OperationalGroupedGridSection>
        </>
      )}
    />
  )
}

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
  columnDefs,
  contextMenu,
  dataState,
  fontSize,
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
}: {
  columnDefs: any[]
  contextMenu: { handleCellContextMenu: (event: any) => void }
  dataState: any
  fontSize: number
  rowDensity: number
  rows: any[]
  runtime: any
  rowInteractions: any
  selectionScopeKey: string
  viewMode: 'grid' | 'report' | 'map'
  selectedIds: number[]
  connections: any[]
  relationships: any[]
  onSelectionChanged: (event: any) => void
}) {
  if (viewMode === 'report') {
    return <AssetReportSurface assets={rows} selectedIds={selectedIds} />
  }

  if (viewMode === 'map') {
    return <AssetMapSurface assets={rows} connections={connections} relationships={relationships} />
  }

  return (
    <OperationalDataGrid
      rows={rows}
      columnDefs={columnDefs}
      runtime={runtime}
      rowInteractions={rowInteractions}
      contextMenu={contextMenu}
      onSelectionChanged={onSelectionChanged}
      selectionScopeKey={selectionScopeKey}
      fontSize={fontSize}
      rowDensity={rowDensity}
      dataState={dataState}
      noRowsLabel="No assets match the current working set."
      height="calc(100vh - 250px)"
      suppressRowClickSelection={false}
    />
  )
}
