import React, { useState, useMemo, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Target, ChevronRight, RefreshCcw, Lock, Unlock,
  Eye, Link as LinkIcon, Fingerprint, Globe, 
  X, Flame, Wind, Compass, Zap, Activity,
  Info, MapPin, Search, Filter, Layers, ArrowRightLeft,
  Download, MousePointer2, AlertTriangle, ShieldAlert, Cpu, ZapOff
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import ForceGraph2D from 'react-force-graph-2d'

// --- Constants & Impact Templates ---

const TYPE_COLORS: Record<string, string> = {
  'Physical': '#10b981', 'Virtual': '#06b6d4', 'Storage': '#f59e0b',
  'Switch': '#8b5cf6', 'Firewall': '#ef4444', 'Load Balancer': '#ec4899',
  'PDU': '#64748b', 'Other': '#94a3b8'
}

const getTypeColor = (type: string = '') => TYPE_COLORS[type] || TYPE_COLORS.Other

const IMPACT_TEMPLATES: Record<string, { title: string, desc: string, icon: any }> = {
  'Power': { 
    title: 'TOTAL POWER LOSS', 
    desc: 'Hardware hard-shutdown. Immediate service termination and data corruption risk.',
    icon: <ZapOff size={14} />
  },
  'Network': { 
    title: 'NETWORK ISOLATION', 
    desc: 'Communication fabric severed. Asset is unreachable via management or data planes.',
    icon: <Globe size={14} />
  },
  'Security': { 
    title: 'BOUNDARY COLLAPSE', 
    desc: 'Security policy enforcement offline. Traffic bypassing or blocked by fail-safe.',
    icon: <ShieldAlert size={14} />
  },
  'Storage': { 
    title: 'I/O BLOCKADE', 
    desc: 'Block-level storage disconnect. Filesystems entering read-only or kernel panic state.',
    icon: <Cpu size={14} />
  },
  'Critical': { 
    title: 'SERVICE TERMINATION', 
    desc: 'Upstream hard-dependency failure. Logical service has entered an unrecoverable state.',
    icon: <Flame size={14} />
  },
  'Default': { 
    title: 'LOGICAL INTERRUPTION', 
    desc: 'Downstream dependency degraded. Performance impact or secondary service failure.',
    icon: <AlertTriangle size={14} />
  }
}

const getImpact = (type: string = '') => IMPACT_TEMPLATES[type] || IMPACT_TEMPLATES.Default

// --- Sub-Components ---

const MultiSelectHeader = ({ options, selected, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const triggerRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width })
    }
  }, [isOpen])

  const filteredOptions = (options || []).filter((o: any) => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.system.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggle = (val: number) => {
    const next = selected.includes(val) ? selected.filter((x: any) => x !== val) : [...selected, val]
    onChange(next)
  }

  return (
    <div className="relative" ref={triggerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all min-w-[300px] active:scale-[0.98] group"
      >
        <div className="flex items-center space-x-3">
          <Target size={16} className={`${selected.length ? 'text-blue-400' : 'text-slate-600'} group-hover:scale-110 transition-transform`} />
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">
            {selected.length ? `${selected.length} Targets Active` : 'Initialize Engine'}
          </span>
        </div>
        <ChevronRight size={14} className={`text-slate-600 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </div>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[2000] bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} 
            className="fixed z-[2001] bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[500px]"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <div className="p-4 border-b border-white/5 bg-black/40 flex items-center space-x-3">
               <Search size={14} className="text-slate-500" />
               <input autoFocus value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search for assets..." className="w-full bg-transparent text-[11px] font-black text-white uppercase outline-none" />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
               {filteredOptions.length === 0 ? (
                 <div className="p-10 text-center text-[10px] font-black uppercase text-slate-600 tracking-[0.3em]">No Assets Detected</div>
               ) : (
                 filteredOptions.map((opt: any) => (
                   <div key={opt.value} onClick={() => toggle(opt.value)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all flex items-center justify-between group ${selected.includes(opt.value) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}>
                     <div className="flex items-center space-x-3">
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${selected.includes(opt.value) ? 'bg-white border-white' : 'bg-transparent border-slate-700'}`} />
                        <span className="truncate italic tracking-tight">{opt.label}</span>
                     </div>
                     <span className={`text-[8px] px-2 py-0.5 rounded-md ${selected.includes(opt.value) ? 'bg-white/20' : 'bg-black/40'} border border-white/5 text-slate-500 font-bold`}>{opt.system}</span>
                   </div>
                 ))
               )}
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  )
}

// --- Main Engine ---

export default function Temp1() {
  const [selectedSources, setSelectedSources] = useState<number[]>([])
  const [showLabels, setShowLabels] = useState(true)
  const [isFixed, setIsFixed] = useState(false)
  const [nodeStrength, setNodeStrength] = useState(-500)
  const [highlightedNodeId, setHighlightedNodeId] = useState<number | null>(null)
  
  const [blastDepth, setBlastDepth] = useState(3)
  const [crawlDirection, setCrawlDirection] = useState<'both' | 'out' | 'in'>('both')
  const [graphSearch, setGraphSearch] = useState('')
  
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false)
  const [failureOriginId, setFailureOriginId] = useState<number | null>(null)
  const [impactedNodesMap, setImpactedNodesMap] = useState<Map<number, any>>(new Map())
  
  const fgRef = useRef<any>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(() => requestAnimationFrame(updateSize));
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => { observer.disconnect(); window.removeEventListener('resize', updateSize); };
  }, []);

  const { data: devices, isLoading: isLoadingDevices } = useQuery({ 
    queryKey: ['devices'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json()
  })
  
  const { data: allRelationships } = useQuery({ 
    queryKey: ['all-relationships'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/relationships/all')).json()
  })

  const deviceOptions = useMemo(() => {
    return (Array.isArray(devices) ? devices : [])?.map((d: any) => ({ 
      value: Number(d.id), label: d.name, system: d.system, type: d.type 
    })) || []
  }, [devices])

  const graphData = useMemo(() => {
    if (!devices || !Array.isArray(devices) || selectedSources.length === 0) return { nodes: [], links: [] }

    const startIds = selectedSources.map(Number)
    const reachableNodeIds = new Set<number>(startIds)
    const rawLinks: any[] = []
    
    if (Array.isArray(allRelationships)) {
      let currentLevel = Array.from(reachableNodeIds)
      for (let d = 0; d < blastDepth; d++) {
        const nextLevel: number[] = []
        currentLevel.forEach(nodeId => {
          allRelationships.forEach((rel: any) => {
            const s = Number(rel.source_device_id); const t = Number(rel.target_device_id)
            const isOut = (s === nodeId) && (crawlDirection === 'both' || crawlDirection === 'out')
            const isIn = (t === nodeId) && (crawlDirection === 'both' || crawlDirection === 'in')
            if (isOut && !reachableNodeIds.has(t)) {
              reachableNodeIds.add(t); nextLevel.push(t); rawLinks.push(rel)
            } else if (isIn && !reachableNodeIds.has(s)) {
              reachableNodeIds.add(s); nextLevel.push(s); rawLinks.push(rel)
            } else if ((s === nodeId || t === nodeId) && reachableNodeIds.has(s) && reachableNodeIds.has(t)) {
              rawLinks.push(rel)
            }
          })
        })
        currentLevel = nextLevel
        if (currentLevel.length === 0) break
      }
    }

    const nodes = Array.from(reachableNodeIds).map(id => {
      const dev = devices.find((d: any) => Number(d.id) === id)
      return {
        id,
        name: dev?.name || `ID:${id}`,
        system: dev?.system || 'Unknown',
        type: dev?.type || 'Asset',
        color: getTypeColor(dev?.type),
        val: startIds.includes(id) ? 14 : 10,
        isSelected: startIds.includes(id)
      }
    }).filter(n => !graphSearch || n.name.toLowerCase().includes(graphSearch.toLowerCase()))

    const nodeIdsSet = new Set(nodes.map(n => n.id))
    const links = rawLinks
      .filter(r => nodeIdsSet.has(Number(r.source_device_id)) && nodeIdsSet.has(Number(r.target_device_id)))
      .map(r => ({
        source: Number(r.source_device_id),
        target: Number(r.target_device_id),
        label: `${r.source_role?.charAt(0) || 'S'}➔${r.target_role?.charAt(0) || 'T'}`,
        type: r.relationship_type,
        isCritical: r.relationship_type === 'Critical'
      }))

    return { nodes, links }
  }, [selectedSources, devices, allRelationships, blastDepth, crawlDirection, graphSearch])

  // --- DETONATION ENGINE ---
  const triggerFailure = useCallback((nodeId: number) => {
    if (!Array.isArray(allRelationships)) return
    setIsSimulatingFailure(true); setFailureOriginId(nodeId)
    const impacted = new Map<number, any>()
    impacted.set(nodeId, { reason: 'ORIGIN', sourceId: null, type: 'Critical' })
    
    const crawl = (current: number) => {
      allRelationships.forEach((r: any) => {
        const s = Number(r.source_device_id); const t = Number(r.target_device_id)
        if (s === current && !impacted.has(t)) {
          impacted.set(t, { reason: r.relationship_type, sourceId: s, type: r.relationship_type })
          crawl(t)
        }
      })
    }
    crawl(nodeId); setImpactedNodesMap(impacted)
  }, [allRelationships])

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      fgRef.current.d3Force('charge').strength(nodeStrength);
      fgRef.current.d3Force('link').distance(100);
      setTimeout(() => fgRef.current.zoomToFit(600, 100), 200)
    }
  }, [graphData.nodes.length, nodeStrength, dimensions])

  if (isLoadingDevices) {
    return <div className="h-full flex flex-col items-center justify-center text-slate-500 font-black uppercase tracking-widest"><RefreshCcw className="animate-spin mb-4" />Syncing Matrix...</div>
  }

  return (
    <div className="h-full flex flex-col space-y-4 text-slate-200">
      
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-8">
           <div className="relative group cursor-default">
              <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-1 group-hover:text-blue-400 transition-colors">Matrix Forensics</h1>
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em] font-black">Industrial Asset Propagation Engine</p>
           </div>
           {graphData.nodes.length > 0 && (
             <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 items-center px-6 space-x-8 shadow-inner">
                <HeaderStat label="NODES" value={graphData.nodes.length} color="text-blue-400" />
                <HeaderStat label="IMPACTED" value={isSimulatingFailure ? impactedNodesMap.size : 0} color="text-rose-500" />
                <HeaderStat label="LINKS" value={graphData.links.length} color="text-slate-400" />
             </div>
           )}
        </div>

        <div className="flex items-center space-x-4">
           <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 items-center px-4 space-x-4 h-[46px]">
              <div className="flex flex-col">
                 <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Direction</span>
                 <div className="flex space-x-1">
                    <FilterBtn active={crawlDirection === 'out'} onClick={() => setCrawlDirection('out')} icon={<Wind size={10} />} />
                    <FilterBtn active={crawlDirection === 'in'} onClick={() => setCrawlDirection('in')} icon={<Zap size={10} />} />
                    <FilterBtn active={crawlDirection === 'both'} onClick={() => setCrawlDirection('both')} icon={<ArrowRightLeft size={10} />} />
                 </div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col">
                 <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Radius</span>
                 <div className="flex space-x-1">
                    {[1, 2, 3, 5].map(d => (
                      <button key={d} onClick={() => setBlastDepth(d)} className={`w-7 h-5 rounded-md text-[9px] font-black transition-all ${blastDepth === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-white/5'}`}>{d}</button>
                    ))}
                 </div>
              </div>
           </div>
           <MultiSelectHeader options={deviceOptions} selected={selectedSources} onChange={setSelectedSources} />
        </div>
      </div>

      <div className="flex-1 flex min-h-0 space-x-4">
        
        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 relative rounded-[40px] border border-white/5 bg-slate-950 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
          
          <div className="absolute top-8 left-8 z-10 flex space-x-3 pointer-events-auto">
             <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 flex items-center space-x-2">
                <Search size={14} className="text-slate-500 ml-2" />
                <input value={graphSearch} onChange={e => setGraphSearch(e.target.value)} placeholder="FILTER MATRIX..." className="bg-transparent border-none text-[10px] font-black text-white uppercase outline-none w-32 tracking-wider placeholder:text-slate-700" />
                {graphSearch && <button onClick={() => setGraphSearch('')} className="p-2 text-slate-500 hover:text-white"><X size={14} /></button>}
             </div>
          </div>

          <div className="absolute top-8 right-8 z-10 flex flex-col space-y-3">
             <ActionButton icon={<RefreshCcw size={18} />} onClick={() => fgRef.current?.zoomToFit(600, 150)} label="RECALIBRATE" />
             <ActionButton icon={isSimulatingFailure ? <Zap size={18} /> : <Flame size={18} />} onClick={() => isSimulatingFailure ? (setIsSimulatingFailure(false), setImpactedNodesMap(new Map()), setFailureOriginId(null)) : highlightedNodeId && triggerFailure(highlightedNodeId)} active={isSimulatingFailure} danger label={isSimulatingFailure ? "RESTORE" : "DETONATE"} />
             <div className="w-full h-px bg-white/5 my-1" />
             <ActionButton icon={<Download size={18} />} onClick={() => {}} label="EXPORT" />
          </div>

          {graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8 opacity-20">
               <Compass size={120} className="text-white animate-spin-slow" />
               <p className="text-[14px] font-black uppercase tracking-[0.8em] text-white italic ml-4">Engage Targets to Initialize Fabric</p>
            </div>
          ) : (
            dimensions.width > 0 && dimensions.height > 0 && (
              <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                backgroundColor="transparent"
                onNodeClick={(node: any) => setHighlightedNodeId(node.id)}
                onBackgroundClick={() => setHighlightedNodeId(null)}
                nodeRelSize={1}
                linkWidth={(link: any) => link.isCritical ? 8 : 4} 
                linkColor={(link: any) => {
                  if (isSimulatingFailure) {
                    const sId = typeof link.source === 'object' ? link.source.id : link.source;
                    const tId = typeof link.target === 'object' ? link.target.id : link.target;
                    return (impactedNodesMap.has(sId) && impactedNodesMap.has(tId)) ? '#ef4444' : 'rgba(255,255,255,0.02)';
                  }
                  return link.isCritical ? '#ef4444' : 'rgba(148, 163, 184, 0.15)';
                }}
                linkDirectionalParticles={4}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.01}
                nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
                  const isHighlighted = highlightedNodeId === node.id;
                  const isImpacted = impactedNodesMap.has(node.id);
                  const radius = (node.isSelected ? 28 : 22) / (globalScale < 1 ? Math.sqrt(globalScale) : 1);
                  
                  if (isHighlighted || isImpacted) {
                    ctx.beginPath(); ctx.arc(node.x, node.y, radius + (8/globalScale), 0, 2 * Math.PI);
                    ctx.fillStyle = isImpacted ? 'rgba(239, 68, 68, 0.3)' : `${node.color}33`; ctx.fill();
                  }
                  ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
                  ctx.fillStyle = 'rgba(2, 6, 23, 0.9)'; ctx.fill();
                  ctx.lineWidth = (isHighlighted ? 4 : 2) / globalScale;
                  ctx.strokeStyle = isImpacted ? '#ef4444' : node.color; ctx.stroke();
                  
                  const fontSize = (radius * 0.45);
                  ctx.font = `900 ${fontSize}px Inter, sans-serif`;
                  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                  ctx.fillStyle = '#fff';
                  let label = node.name; if (label.length > 8) label = label.substring(0, 7) + '..';
                  ctx.fillText(label, node.x, node.y - (fontSize * 0.1));
                  
                  const subFontSize = fontSize * 0.45;
                  ctx.font = `900 ${subFontSize}px Inter, sans-serif`;
                  ctx.fillStyle = node.color;
                  ctx.fillText(node.type.toUpperCase(), node.x, node.y + (radius * 0.45));
                }}
                linkCanvasObjectMode={() => 'after'}
                linkCanvasObject={(link: any, ctx: any, globalScale: any) => {
                  if (globalScale < 0.6) return;
                  const start = link.source; const end = link.target;
                  if (typeof start !== 'object' || typeof end !== 'object') return;
                  const label = link.label; const fontSize = 11 / globalScale; 
                  const midX = start.x + (end.x - start.x) * 0.5;
                  const midY = start.y + (end.y - start.y) * 0.5;
                  let angle = Math.atan2(end.y - start.y, end.x - start.x);
                  if (angle > Math.PI / 2) angle -= Math.PI; if (angle < -Math.PI / 2) angle += Math.PI;
                  ctx.save(); ctx.translate(midX, midY); ctx.rotate(angle);
                  ctx.font = `900 ${fontSize}px Inter, sans-serif`;
                  const textWidth = ctx.measureText(label).width;
                  const h = fontSize + (6 / globalScale); const w = textWidth + (10 / globalScale);
                  ctx.fillStyle = 'rgba(15, 23, 42, 0.98)'; ctx.fillRect(-w/2, -h/2, w, h);
                  ctx.lineWidth = 1 / globalScale; ctx.strokeStyle = link.isCritical ? '#f87171' : 'rgba(255,255,255,0.1)';
                  ctx.strokeRect(-w/2, -h/2, w, h);
                  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = link.isCritical ? '#f87171' : '#64748b';
                  ctx.fillText(label, 0, 0); ctx.restore();
                }}
                enableNodeDrag={!isFixed}
                cooldownTicks={100}
              />
            )
          )}

          <div className="absolute bottom-10 left-10 flex items-center bg-slate-900/90 backdrop-blur-3xl px-8 py-4 rounded-3xl border border-white/10 space-x-10 shadow-2xl pointer-events-auto">
             <GridControl active={showLabels} onClick={() => setShowLabels(!showLabels)} icon={<Eye size={16} />} label="Identities" />
             <GridControl active={true} onClick={() => {}} icon={<Layers size={16} />} label="Topology" />
             <GridControl active={isFixed} onClick={() => setIsFixed(!isFixed)} icon={isFixed ? <Lock size={16} /> : <Unlock size={16} />} label="Lock Matrix" />
             <div className="w-px h-10 bg-white/10" />
             <div className="flex flex-col space-y-2 w-40">
                <input type="range" min="-1200" max="-200" step="50" value={nodeStrength} onChange={(e) => setNodeStrength(Number(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest"><span>Dense</span><span>Sparse</span></div>
             </div>
          </div>
        </div>

        {/* Sidepanel */}
        <aside className="w-[440px] flex flex-col shrink-0">
           <div className="flex-1 bg-white/5 rounded-[40px] border border-white/5 flex flex-col overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-black/30">
                 <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-4 text-blue-400">
                       <Fingerprint size={24} className={isSimulatingFailure ? 'text-rose-500 animate-pulse' : 'animate-pulse'} />
                       <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white italic">Forensic Intelligence</h3>
                    </div>
                    {highlightedNodeId && <button onClick={() => setHighlightedNodeId(null)} className="p-2 text-slate-600 hover:text-white transition-colors bg-white/5 rounded-xl"><X size={20} /></button>}
                 </div>
                 <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.4em]">Propagated Failure Analytics</p>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <AnimatePresence mode="wait">
                  {highlightedNodeId ? (
                    <motion.div key={highlightedNodeId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                       {(() => {
                         const rawDevice = (devices as any[]).find(d => Number(d.id) === highlightedNodeId);
                         if (!rawDevice) return null;
                         const impactInfo = impactedNodesMap.get(highlightedNodeId);
                         const isOrigin = failureOriginId === highlightedNodeId;
                         
                         return (
                           <>
                             {/* Detonation Summary Banner */}
                             {isSimulatingFailure && impactInfo && (
                               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                                  <div className={`p-6 rounded-[32px] border ${isOrigin ? 'bg-rose-600 border-rose-500' : 'bg-amber-600/20 border-amber-500/30'} flex flex-col space-y-4 shadow-xl`}>
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                           <div className={`p-2 rounded-xl ${isOrigin ? 'bg-white/20' : 'bg-amber-500/20'} text-white`}>
                                              {isOrigin ? <Flame size={18} /> : getImpact(impactInfo.type).icon}
                                           </div>
                                           <span className="text-[12px] font-black uppercase tracking-widest text-white italic">
                                              {isOrigin ? 'FAILURE ORIGIN (DETONATED)' : getImpact(impactInfo.type).title}
                                           </span>
                                        </div>
                                        <div className="flex items-center space-x-2 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                                           <Activity size={10} className="text-white animate-pulse" />
                                           <span className="text-[8px] font-black text-white">LIVE_IMPACT</span>
                                        </div>
                                     </div>
                                     <p className="text-[11px] font-bold text-white leading-relaxed opacity-90 uppercase tracking-tight">
                                        {isOrigin ? 'This asset has been forced offline. Initiating catastrophic propagation through all downstream logic and hardware dependencies.' : getImpact(impactInfo.type).desc}
                                     </p>
                                     {!isOrigin && (
                                       <div className="flex items-center space-x-2 pt-2 border-t border-white/10">
                                          <span className="text-[8px] font-black text-amber-500 uppercase">Triggered by</span>
                                          <span className="text-[8px] font-black text-white uppercase italic">{(devices as any[]).find(d => Number(d.id) === impactInfo.sourceId)?.name}</span>
                                       </div>
                                     )}
                                  </div>
                               </motion.div>
                             )}

                             <div className="bg-slate-900/50 p-6 rounded-[32px] border border-white/5 relative overflow-hidden group">
                                <h4 className="text-3xl font-black text-blue-400 uppercase tracking-tighter italic leading-[1.1] mb-4 break-all">{rawDevice.name}</h4>
                                <div className="flex flex-wrap gap-2">
                                   <StatusBadge label={rawDevice.type} color={getTypeColor(rawDevice.type)} />
                                   <StatusBadge label={rawDevice.system} color="#94a3b8" />
                                </div>
                             </div>

                             <div className="space-y-3">
                                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center space-x-3"><Info size={12} /><span>Physical Metrics</span></h5>
                                <div className="grid grid-cols-1 gap-2">
                                   <ForensicRow label="Site Fabric" value={`${rawDevice.site_name} ➔ RACK ${rawDevice.rack_name}`} />
                                   <ForensicRow label="Networking" value={rawDevice.primary_ip || 'Static/Internal'} mono />
                                   <ForensicRow label="Logic Role" value={rawDevice.role || 'Service Node'} />
                                </div>
                             </div>

                             <div className="space-y-4">
                                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center space-x-3"><LinkIcon size={12} /><span>Relational Trace</span></h5>
                                <div className="space-y-2">
                                   {graphData.links.filter(l => 
                                     (typeof l.source === 'object' ? l.source.id : l.source) === rawDevice.id || 
                                     (typeof l.target === 'object' ? l.target.id : l.target) === rawDevice.id
                                   ).map((link, idx) => {
                                     const isSource = (typeof link.source === 'object' ? link.source.id : link.source) === rawDevice.id;
                                     const partnerId = isSource ? (typeof link.target === 'object' ? link.target.id : link.target) : (typeof link.source === 'object' ? link.source.id : link.source);
                                     const partner = (devices as any[]).find(d => Number(d.id) === partnerId);
                                     return (
                                       <button 
                                          key={idx} 
                                          onClick={() => setHighlightedNodeId(Number(partnerId))}
                                          className={`w-full bg-black/40 border border-white/5 rounded-[20px] p-4 flex items-center justify-between group transition-all active:scale-[0.98] ${impactedNodesMap.has(Number(partnerId)) ? 'hover:border-rose-500/40' : 'hover:border-blue-500/40'}`}
                                       >
                                          <div className="flex items-center space-x-4">
                                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${impactedNodesMap.has(Number(partnerId)) ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {isSource ? <ArrowRightLeft size={16} /> : <Zap size={16} />}
                                             </div>
                                             <div className="flex flex-col items-start">
                                                <span className={`text-[12px] font-black uppercase tracking-tight italic group-hover:text-blue-400 ${impactedNodesMap.has(Number(partnerId)) ? 'text-rose-400' : 'text-white'}`}>{partner?.name}</span>
                                                <span className="text-[8px] font-black text-slate-600 uppercase">{isSource ? 'Out' : 'In'} ➔ {link.type}</span>
                                             </div>
                                          </div>
                                          <ChevronRight size={18} className="text-slate-800 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                       </button>
                                     )
                                   })}
                                </div>
                             </div>

                             <button 
                               onClick={() => triggerFailure(rawDevice.id)}
                               disabled={isSimulatingFailure}
                               className={`w-full py-5 rounded-[24px] font-black uppercase text-[12px] tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center space-x-3 shadow-2xl ${isSimulatingFailure ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'}`}
                             >
                                <Flame size={20} />
                                <span>Engagement Active</span>
                             </button>
                           </>
                         )
                       })()}
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-10 py-20">
                       <MousePointer2 size={64} className="text-slate-800 mb-8" />
                       <h4 className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-500 mb-3">Engine Ready</h4>
                       <p className="text-[9px] font-bold text-slate-700 leading-relaxed uppercase max-w-[240px]">Engage matrix nodes to initiate relational forensic audit</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
           </div>
        </aside>
      </div>
    </div>
  )
}

// --- Internal UI ---

const HeaderStat = ({ label, value, color }: any) => (
  <div className="flex flex-col items-start min-w-[100px]">
    <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">{label}</span>
    <span className={`text-2xl font-black ${color} font-mono tracking-tighter leading-none`}>{value}</span>
  </div>
)

const FilterBtn = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`w-8 h-6 rounded flex items-center justify-center transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 hover:bg-white/5 hover:text-slate-400'}`}>
    {icon}
  </button>
)

const GridControl = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center space-x-3 transition-all ${active ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}>
     <div className={`p-2 rounded-xl ${active ? 'bg-blue-500/10' : 'bg-transparent'}`}>{icon}</div>
     <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
)

const ActionButton = ({ icon, onClick, active, danger, label }: any) => (
  <div className="flex flex-col items-end group/btn">
    <button onClick={onClick} className={`p-4 rounded-[20px] border transition-all shadow-2xl ${active ? (danger ? 'bg-rose-600 border-rose-500 text-white' : 'bg-blue-600 border-blue-500 text-white') : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}>
       {icon}
    </button>
    <span className="mr-2 mt-1.5 text-[7px] font-black text-slate-600 uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-all -translate-y-2 group-hover/btn:translate-y-0">{label}</span>
  </div>
)

const StatusBadge = ({ label, color }: any) => (
  <span className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30`, color }}>{label}</span>
)

const ForensicRow = ({ label, value, mono }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-[20px] flex items-center justify-between">
     <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
     <span className={`text-[10px] font-black text-slate-200 uppercase tracking-tight truncate ml-4 ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
)
