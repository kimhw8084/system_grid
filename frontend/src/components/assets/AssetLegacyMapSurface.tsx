import React, { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Box, Crosshair, Filter, RotateCcw, Search, Share2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { WorkspaceEmptyState } from '../shared/OperationalWorkspacePrimitives'

export function AssetLegacyMapSurface({
  assets,
  visibleAssets,
  connections,
  relationships,
  selectedAssetId,
  systemsList,
}: {
  assets: any[]
  visibleAssets: any[]
  connections: any[]
  relationships: any[]
  selectedAssetId?: number | null
  systemsList: string[]
}) {
  const [selectedSystems, setSelectedSystems] = useState<string[]>([])
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([])
  const [depth, setDepth] = useState(1)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showLegend, setShowLegend] = useState(true)
  const [assetSearch, setAssetSearch] = useState('')
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 680 })
  const fgRef = useRef<any>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const lastSeededAssetIdRef = useRef<number | null>(null)

  const hasFilter = selectedSystems.length > 0 || selectedAssetIds.length > 0 || searchTerm.length >= 2

  useEffect(() => {
    const node = shellRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setCanvasSize({
        width: Math.max(640, Math.floor(entry.contentRect.width)),
        height: Math.max(560, Math.floor(entry.contentRect.height)),
      })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const normalizedSelectedAssetId = Number(selectedAssetId)
    if (!Number.isFinite(normalizedSelectedAssetId) || normalizedSelectedAssetId <= 0) return
    const seededAsset = visibleAssets.find((asset: any) => Number(asset.id) === normalizedSelectedAssetId)
    const existsInVisibleAssets = Boolean(seededAsset)
    if (!existsInVisibleAssets) return
    if (lastSeededAssetIdRef.current === normalizedSelectedAssetId && selectedAssetIds.includes(normalizedSelectedAssetId)) return

    setSelectedAssetIds((current) => {
      if (current.includes(normalizedSelectedAssetId)) return current
      return [normalizedSelectedAssetId]
    })
    setSelectedNode(seededAsset || null)
    lastSeededAssetIdRef.current = normalizedSelectedAssetId
  }, [selectedAssetId, selectedAssetIds, visibleAssets])

  const graphData = useMemo(() => {
    if (!hasFilter) return { nodes: [], links: [] }

    const nodesMap = new Map<number, any>()
    const linksMap = new Map<string, any>()
    const processedNodes = new Set<number>()

    const addNode = (asset: any) => {
      if (!nodesMap.has(asset.id)) {
        nodesMap.set(asset.id, {
          ...asset,
          id: asset.id,
          label: asset.name,
          isHighlighted: searchTerm.length >= 2 && String(asset.name || '').toLowerCase().includes(searchTerm.toLowerCase()),
        })
      }
    }

    const addLink = (source: number, target: number, type: string, category: 'network' | 'relationship', label: string) => {
      const key = `${Math.min(source, target)}-${Math.max(source, target)}-${type}`
      if (!linksMap.has(key)) {
        linksMap.set(key, { source, target, type, category, label })
      }
    }

    const rootAssets = visibleAssets.filter((asset: any) =>
      selectedSystems.includes(asset.system) ||
      selectedAssetIds.includes(asset.id) ||
      (searchTerm.length >= 2 && String(asset.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const traverse = (currentNodeIds: number[], currentDepth: number) => {
      if (currentDepth > depth) return
      const nextNodeIds: number[] = []

      connections.forEach((conn: any) => {
        const srcId = Number(conn.src_device_id)
        const dstId = Number(conn.dst_device_id)
        if (!currentNodeIds.includes(srcId) && !currentNodeIds.includes(dstId)) return
        const src = assets.find((asset: any) => asset.id === srcId)
        const dst = assets.find((asset: any) => asset.id === dstId)
        if (!src || !dst) return
        addNode(src)
        addNode(dst)
        addLink(srcId, dstId, conn.connection_type || 'Network', 'network', conn.connection_type || 'Network')
        if (currentNodeIds.includes(srcId) && !processedNodes.has(dstId)) nextNodeIds.push(dstId)
        if (currentNodeIds.includes(dstId) && !processedNodes.has(srcId)) nextNodeIds.push(srcId)
      })

      relationships.forEach((rel: any) => {
        const srcId = Number(rel.source_device_id)
        const dstId = Number(rel.target_device_id)
        if (!currentNodeIds.includes(srcId) && !currentNodeIds.includes(dstId)) return
        const src = assets.find((asset: any) => asset.id === srcId)
        const dst = assets.find((asset: any) => asset.id === dstId)
        if (!src || !dst) return
        addNode(src)
        addNode(dst)
        addLink(srcId, dstId, rel.relationship_type || 'Relationship', 'relationship', rel.relationship_type || 'Relationship')
        if (currentNodeIds.includes(srcId) && !processedNodes.has(dstId)) nextNodeIds.push(dstId)
        if (currentNodeIds.includes(dstId) && !processedNodes.has(srcId)) nextNodeIds.push(srcId)
      })

      currentNodeIds.forEach((id) => processedNodes.add(id))
      const uniqueNext = Array.from(new Set(nextNodeIds)).filter((id) => !processedNodes.has(id))
      if (uniqueNext.length > 0) traverse(uniqueNext, currentDepth + 1)
    }

    rootAssets.forEach((asset: any) => addNode(asset))
    traverse(rootAssets.map((asset: any) => asset.id), 1)

    return {
      nodes: Array.from(nodesMap.values()),
      links: Array.from(linksMap.values()),
    }
  }, [assets, connections, depth, hasFilter, relationships, searchTerm, selectedAssetIds, selectedSystems, visibleAssets])

  const filteredAssetsForSelection = useMemo(() => {
    return visibleAssets.filter((asset: any) =>
      (assetSearch.length === 0 || String(asset.name || '').toLowerCase().includes(assetSearch.toLowerCase()))
    )
  }, [assetSearch, visibleAssets])

  const resetMapFilters = () => {
    setSelectedSystems([])
    setSelectedAssetIds([])
    setSearchTerm('')
    setAssetSearch('')
    setSelectedNode(null)
  }

  const focusSelectedContext = () => {
    if (!fgRef.current || graphData.nodes.length === 0) return
    fgRef.current.zoomToFit(400, 48, (node: any) => (
      selectedNode ? Number(node.id) === Number(selectedNode.id) : selectedAssetIds.includes(Number(node.id))
    ))
  }

  const typeColors: Record<string, string> = {
    Physical: '#10b981',
    Virtual: '#3b82f6',
    Storage: '#f59e0b',
    Switch: '#f43f5e',
    Firewall: '#f97316',
    'Load Balancer': '#8b5cf6',
  }

  if (!assets.length) {
    return <WorkspaceEmptyState title="No asset topology available" description="Add active assets with network or dependency links to populate the map surface." />
  }

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-lg border border-white/5 bg-[#020617]">
      <div className="absolute left-6 top-6 z-10 w-80 space-y-4 pointer-events-none">
        <div className="pointer-events-auto space-y-6 rounded-lg border border-white/10 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Share2 size={18} className="text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Vector Intelligence</h3>
            </div>
            <div className="rounded-lg border border-blue-500/30 bg-blue-600/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-blue-400">
              {hasFilter ? `${graphData.nodes.length} nodes` : 'No filter'}
            </div>
          </div>

          <div className="space-y-5">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Focus highlight..."
                className="w-full rounded-lg border border-white/5 bg-black/40 py-2 pl-9 pr-4 text-[9px] font-black uppercase tracking-widest text-white outline-none transition-all focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-slate-500">System Aggregation</label>
              <div className="custom-scrollbar flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">
                {systemsList.map((system) => (
                  <button
                    key={system}
                    type="button"
                    onClick={() => setSelectedSystems((current) => current.includes(system) ? current.filter((entry) => entry !== system) : [...current, system])}
                    className={`rounded-lg border px-2 py-1 text-[8px] font-bold uppercase transition-all ${selectedSystems.includes(system) ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-white/5 bg-white/5 text-slate-500 hover:border-white/20'}`}
                  >
                    {system}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Asset Selection</label>
                {selectedAssetIds.length > 0 ? (
                  <button type="button" onClick={() => setSelectedAssetIds([])} className="text-[8px] font-black uppercase text-rose-500 hover:text-rose-400">
                    Clear ({selectedAssetIds.length})
                  </button>
                ) : null}
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Filter size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    value={assetSearch}
                    onChange={(event) => setAssetSearch(event.target.value)}
                    placeholder="Filter assets..."
                    className="w-full rounded-lg border border-white/5 bg-black/60 py-1.5 pl-7 pr-3 text-[8px] font-bold uppercase text-slate-400 outline-none focus:border-blue-500/30"
                  />
                </div>
                <div className="custom-scrollbar max-h-32 space-y-0.5 overflow-y-auto rounded-lg border border-white/5 bg-black/40 p-1.5">
                  {filteredAssetsForSelection.map((asset: any) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedAssetIds((current) => current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id])}
                      className={`w-full rounded-lg px-2 py-1 text-left text-[8px] font-bold uppercase transition-all ${selectedAssetIds.includes(asset.id) ? 'border border-indigo-500/30 bg-indigo-600/30 text-indigo-400 shadow-lg shadow-indigo-500/10' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
                    >
                      {asset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Propagation Depth</label>
                <span className="text-[10px] font-black text-blue-400">{depth}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={depth}
                onChange={(event) => setDepth(Number(event.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowLegend((current) => !current)}
              className="w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10"
            >
              {showLegend ? 'Hide Legend' : 'Show Legend'}
            </button>
            {hasFilter ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={focusSelectedContext}
                  className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/20 bg-blue-600/10 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-blue-300 transition-all hover:bg-blue-600/20"
                >
                  <Crosshair size={12} />
                  Focus
                </button>
                <button
                  type="button"
                  onClick={resetMapFilters}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-300 transition-all hover:border-white/20 hover:text-white"
                >
                  <RotateCcw size={12} />
                  Clear
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {selectedNode ? (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="pointer-events-auto space-y-4 rounded-lg border border-blue-500/30 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                  <Box size={24} />
                </div>
                <div>
                  <p className="mb-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-blue-400">{selectedNode.system}</p>
                  <h4 className="text-sm font-black leading-none tracking-tight text-white">{selectedNode.name}</h4>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MapMetric label="Status" value={selectedNode.status} tone="text-emerald-400" />
              <MapMetric label="Type" value={selectedNode.type} tone="text-indigo-400" />
              <MapMetric label="Primary IP" value={selectedNode.primary_ip || 'N/A'} />
              <MapMetric label="Mgmt IP" value={selectedNode.management_ip || 'N/A'} />
              <MapMetric label="Owner" value={selectedNode.owner || 'Unowned'} tone="text-blue-300" />
              <MapMetric label="Incidents" value={String(selectedNode.open_incident_count || 0)} tone="text-amber-300" />
            </div>
          </motion.div>
        ) : null}
      </div>

      <div ref={shellRef} className="h-full min-h-0 flex-1">
        {!hasFilter ? (
          <div className="flex h-full items-center justify-center">
            <WorkspaceEmptyState title="Map filters required" description="Select a system, asset, or search term to build the asset topology." />
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            width={canvasSize.width}
            height={canvasSize.height}
            cooldownTicks={120}
            onNodeClick={(node: any) => setSelectedNode(node)}
            nodeColor={(node: any) => typeColors[node.type] || '#94a3b8'}
            nodeRelSize={7}
            linkColor={(link: any) => link.category === 'network' ? 'rgba(52,211,153,0.35)' : 'rgba(129,140,248,0.4)'}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const source = link.source
              const target = link.target
              if (typeof source !== 'object' || typeof target !== 'object') return
              const text = String(link.label || '')
              const fontSize = Math.min(8, 10 / globalScale)
              ctx.font = `900 ${fontSize}px Inter`
              const textWidth = ctx.measureText(text).width
              const dims = [textWidth, fontSize].map((value) => value + fontSize * 0.2) as [number, number]
              const relLink = { x: target.x - source.x, y: target.y - source.y }
              const textPos = { x: source.x + relLink.x * 0.5, y: source.y + relLink.y * 0.5 }
              ctx.save()
              ctx.translate(textPos.x, textPos.y)
              ctx.rotate(Math.atan2(relLink.y, relLink.x))
              ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
              ctx.fillRect(-dims[0] / 2, -dims[1] / 2, dims[0], dims[1])
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = link.category === 'network' ? '#34d399' : '#818cf8'
              ctx.fillText(text, 0, 0)
              ctx.restore()
            }}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.label
              const fontSize = node.isHighlighted ? 12 / globalScale : 10 / globalScale
              ctx.font = `900 ${fontSize}px Inter`
              ctx.beginPath()
              ctx.arc(node.x, node.y, node.isHighlighted ? 7 : 5, 0, 2 * Math.PI, false)
              ctx.fillStyle = typeColors[node.type] || '#64748b'
              ctx.fill()
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = node.isHighlighted ? '#ffffff' : '#cbd5e1'
              ctx.fillText(label, node.x, node.y + 12)
            }}
          />
        )}
      </div>

      {showLegend ? (
        <div className="absolute bottom-6 right-6 rounded-lg border border-white/10 bg-slate-950/85 p-4 backdrop-blur-xl">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Legend</p>
          <div className="mt-3 grid gap-2">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2 text-[10px] font-semibold text-slate-200">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MapMetric({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/40 p-2">
      <p className="mb-1 text-[7px] font-bold uppercase text-slate-500">{label}</p>
      <p className={`text-[9px] font-black uppercase ${tone}`}>{value}</p>
    </div>
  )
}
