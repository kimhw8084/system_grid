import React, { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Zap, Trash2, Edit2, Search, MapPin, X, ArrowRightLeft, Server,
  Monitor, AlertTriangle, Check, MoreVertical, RefreshCcw,
  Package, BarChart3, ExternalLink, Settings,
  Network, HardDrive, TrendingUp, Layers
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; dot: string; badge: string }> = {
  Active:        { color: 'text-emerald-400', dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  Maintenance:   { color: 'text-amber-400',   dot: 'bg-amber-400',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  Deleted:{ color: 'text-rose-400',    dot: 'bg-rose-400',    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
  Offline:       { color: 'text-slate-400',   dot: 'bg-slate-500',   badge: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
  Standby:       { color: 'text-sky-400',     dot: 'bg-sky-400',     badge: 'bg-sky-500/15 text-sky-400 border-sky-500/25' },
  Reserved:      { color: 'text-violet-400',  dot: 'bg-violet-400',  badge: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
}

const TYPE_CONFIG: Record<string, { color: string; short: string }> = {
  physical: { color: 'text-violet-400', short: 'PHY' },
  virtual:  { color: 'text-blue-400',   short: 'VM'  },
  storage:  { color: 'text-amber-400',  short: 'STO' },
  switch:   { color: 'text-rose-400',   short: 'NET' },
  server:   { color: 'text-emerald-400',short: 'SRV' },
}

const getStatusCfg = (s: string, isReservation?: boolean) => {
  if (isReservation) return STATUS_CONFIG['Reserved']
  return STATUS_CONFIG[s] ?? STATUS_CONFIG['Offline']
}
const getTypeCfg = (t: string) => TYPE_CONFIG[t?.toLowerCase()] ?? { color: 'text-slate-400', short: t?.slice(0,3).toUpperCase() || 'UNK' }

const fillColor = (pct: number) => {
  if (pct >= 90) return 'bg-rose-500'
  if (pct >= 70) return 'bg-amber-500'
  if (pct >= 50) return 'bg-blue-500'
  return 'bg-emerald-500'
}

const powerColor = (pct: number) => {
  if (pct >= 90) return 'bg-rose-500'
  if (pct >= 75) return 'bg-amber-500'
  return 'bg-sky-400'
}

// ─── Device Options Menu ───────────────────────────────────────────────────────

const DeviceOptionsMenu = ({ x, y, onClose, onShowConnections, onEdit, onDelete, deviceName }: any) => {
  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        style={{ left: x, top: y }}
        className="fixed z-[110] w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden p-1.5"
      >
        <div className="px-3 py-2 border-b border-white/5 mb-1">
          <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{deviceName}</p>
        </div>
        
        <button onClick={() => { onShowConnections(); onClose(); }} className="w-full text-left px-3 py-2.5 text-[9px] font-black uppercase text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 rounded-xl flex items-center gap-3 transition-all group">
          <div className="p-1.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
            <Zap size={12} />
          </div>
          Show Connections
        </button>
        
        <button onClick={() => { onEdit(); onClose(); }} className="w-full text-left px-3 py-2.5 text-[9px] font-black uppercase text-slate-400 hover:bg-white/5 hover:text-white rounded-xl flex items-center gap-3 transition-all group">
          <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
            <Edit2 size={12} />
          </div>
          Edit Asset
        </button>
        
        <div className="h-px bg-white/5 my-1" />
        
        <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-3 py-2.5 text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500/10 rounded-xl flex items-center gap-3 transition-all group">
          <div className="p-1.5 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
            <Trash2 size={12} />
          </div>
          Delete
        </button>
      </motion.div>
    </>
  )
}

// ─── Connection Lines Overlay ──────────────────────────────────────────────────

const ConnectionLines = ({ sourceDeviceId, targetDeviceIds, racks, connections }: { sourceDeviceId: number; targetDeviceIds: number[]; racks: any[]; connections?: any[] }) => {
  const [lines, setLines] = React.useState<any[]>([])
  const [hoveredLine, setHoveredLine] = React.useState<any>(null)

  React.useEffect(() => {
    const gridEl = document.getElementById('rack-temp-grid')
    if (!gridEl) return

    const updateLines = () => {
      const newLines: any[] = []
      const gridRect = gridEl.getBoundingClientRect()
      
      const getPoint = (deviceId: number) => {
        const el = document.querySelector(`[data-device-id="${deviceId}"]`)
        if (!el) return null
        
        const scrollParent = el.closest('.overflow-y-auto')
        if (!scrollParent) return null

        const elRect = el.getBoundingClientRect()
        const scrollRect = scrollParent.getBoundingClientRect()

        const visibleTop = Math.max(elRect.top, scrollRect.top)
        const visibleBottom = Math.min(elRect.bottom, scrollRect.bottom)

        if (visibleTop >= visibleBottom) return null

        const x = elRect.left + elRect.width / 2 - gridRect.left + gridEl.scrollLeft
        const y = visibleTop + (visibleBottom - visibleTop) / 2 - gridRect.top + gridEl.scrollTop

        return { x, y, elRect }
      }

      const sourcePoint = getPoint(sourceDeviceId)
      if (!sourcePoint) {
        setLines([])
        return
      }

      targetDeviceIds.forEach((tid, index) => {
        const targetPoint = getPoint(tid)
        if (targetPoint) {
          const isSameRack = Math.abs(sourcePoint.x - targetPoint.x) < 5
          
          const conn = connections?.find((c: any) => 
            (c.source_device_id === sourceDeviceId && c.target_device_id === tid) ||
            (c.source_device_id === tid && c.target_device_id === sourceDeviceId)
          )

          if (isSameRack) {
            const offsetWidth = sourcePoint.elRect.width / 3
            const offset = ((index % 2 === 0 ? 1 : -1) * (10 + Math.floor(index / 2) * 8))
            
            newLines.push({ 
              x1: sourcePoint.x, 
              y1: sourcePoint.y, 
              x2: targetPoint.x, 
              y2: targetPoint.y, 
              isInternal: true,
              offset,
              id: `${sourceDeviceId}-${tid}`,
              connection: conn
            })
          } else {
            newLines.push({ 
              x1: sourcePoint.x, 
              y1: sourcePoint.y, 
              x2: targetPoint.x, 
              y2: targetPoint.y, 
              isInternal: false,
              id: `${sourceDeviceId}-${tid}`,
              connection: conn
            })
          }
        }
      })
      setLines(newLines)
    }

    updateLines()
    window.addEventListener('resize', updateLines)
    gridEl.addEventListener('scroll', updateLines)
    
    const elevations = document.querySelectorAll('.overflow-y-auto')
    elevations.forEach(el => el.addEventListener('scroll', updateLines))

    const interval = setInterval(updateLines, 100) 
    
    return () => {
      window.removeEventListener('resize', updateLines)
      gridEl.removeEventListener('scroll', updateLines)
      elevations.forEach(el => el.removeEventListener('scroll', updateLines))
      clearInterval(interval)
    }
  }, [sourceDeviceId, targetDeviceIds, racks, connections])

  return (
    <div className="absolute top-0 left-0 pointer-events-none z-[30]" style={{ 
      width: document.getElementById('rack-temp-grid')?.scrollWidth || '100%', 
      height: document.getElementById('rack-temp-grid')?.scrollHeight || '100%' 
    }}>
      <svg className="w-full h-full">
        <defs>
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {lines.map((l, i) => {
          const path = l.isInternal 
            ? `M ${l.x1} ${l.y1} L ${l.x1 + l.offset} ${l.y1} L ${l.x1 + l.offset} ${l.y2} L ${l.x2} ${l.y2}`
            : `M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`

          return (
            <g key={i} className="pointer-events-auto cursor-help group" 
               onMouseEnter={(e) => setHoveredLine({ ...l, mouseX: e.clientX, mouseY: e.clientY })}
               onMouseLeave={() => setHoveredLine(null)}>
              <path
                d={path}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeOpacity="0"
                className="transition-all"
              />
              <path
                d={path}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                filter="url(#lineGlow)"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:stroke-blue-400 transition-all"
              />
              <path
                d={path}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1"
                strokeOpacity="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={l.x1} cy={l.y1} r="4" fill="#ffffff" filter="url(#lineGlow)" />
              <circle cx={l.x2} cy={l.y2} r="4" fill="#ffffff" filter="url(#lineGlow)" />
            </g>
          )
        })}
      </svg>

      <AnimatePresence>
        {hoveredLine && hoveredLine.connection && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ 
              position: 'fixed',
              left: hoveredLine.mouseX + 20,
              top: hoveredLine.mouseY - 40,
              zIndex: 100
            }}
            className="bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 p-3 rounded-xl shadow-2xl pointer-events-none min-w-[180px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-500/20 rounded-lg">
                <Network size={12} className="text-blue-400" />
              </div>
              <span className="text-[10px] font-black text-white uppercase tracking-tight">Connection Detail</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center gap-4">
                <span className="text-[7px] text-slate-500 font-bold uppercase">Source Port</span>
                <span className="text-[9px] text-blue-300 font-mono">{hoveredLine.connection.source_port || 'Auto'}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[7px] text-slate-500 font-bold uppercase">Target Port</span>
                <span className="text-[9px] text-blue-300 font-mono">{hoveredLine.connection.target_port || 'Auto'}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[7px] text-slate-500 font-bold uppercase">Speed</span>
                <span className="text-[9px] text-emerald-400 font-bold">{hoveredLine.connection.speed_gbps || '10'} Gbps</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[7px] text-slate-500 font-bold uppercase">Cable</span>
                <span className="text-[9px] text-amber-400 font-bold uppercase">{hoveredLine.connection.cable_type || 'DAC'}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Rack Unit Row ─────────────────────────────────────────────────────────────

interface RackUnitProps {
  uNumber: number
  loc?: any
  isTop?: boolean
  isBottom?: boolean
  highlight: boolean
  onSelect: () => void
  onManage: (device: any, loc: any, event: React.MouseEvent) => void
  isDeleted: boolean
  isFocused?: boolean
  isConnected?: boolean
}

const RackUnit = ({ uNumber, loc, isTop, isBottom, highlight, onSelect, onManage, isDeleted, isFocused, isConnected }: RackUnitProps) => {
  const device = loc?.device
  const isReservation = device?.is_reservation
  const statusCfg = device ? getStatusCfg(device.status, isReservation) : null
  const typeCfg = device ? getTypeCfg(device.type) : null

  const bgBase = device
    ? isFocused
      ? 'bg-blue-500/40 border-blue-400/50'
      : isConnected
        ? 'bg-emerald-500/30 border-emerald-400/40'
        : highlight
          ? 'bg-amber-500/30'
          : isReservation
            ? 'bg-violet-500/20 border-violet-500/30'
            : device.status === 'Maintenance'
              ? 'bg-amber-500/15'
              : device.status === 'Deleted'
                ? 'bg-rose-500/15'
                : 'bg-blue-600/30'
    : 'hover:bg-white/[0.04]'

  const borderClass = device
    ? `${isTop ? 'border-t border-white/10' : ''} ${isBottom ? 'border-b border-black/40' : 'border-b border-white/[0.03]'}`
    : 'border-b border-white/[0.06]'

  const roundedClass = device
    ? `${isTop ? 'rounded-t-md' : ''} ${isBottom ? 'rounded-b-md' : ''}`
    : ''

  return (
    <div
      onClick={(e) => device ? (!isDeleted && onManage(device, loc, e)) : (!isDeleted && onSelect())}
      className={`relative flex items-center px-2 transition-all cursor-pointer group ${bgBase} ${borderClass} ${roundedClass} ${device ? 'mx-[1px] bg-gradient-to-b from-white/[0.05] to-transparent' : ''} ${isReservation ? 'border-dashed' : ''}`}
      style={{ height: '22px' }}
      data-device-id={device?.id}
    >
      <span className={`text-[8px] font-mono w-5 select-none shrink-0 transition-colors tabular-nums ${device ? 'text-slate-400 font-bold' : 'text-slate-600 group-hover:text-slate-400'}`}>
        {uNumber}
      </span>

      {isBottom && device && (
        <div className="flex-1 flex items-center justify-between overflow-hidden gap-1 pl-1">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className={`shrink-0 ${statusCfg?.dot} w-1.5 h-1.5 rounded-full ${isReservation ? 'animate-pulse' : ''}`} />
            <span className={`text-[9px] font-black truncate uppercase tracking-tight ${highlight || isFocused || isConnected ? 'text-white' : 'text-slate-100'}`}>
              {isReservation && <span className="text-violet-400 mr-1">[RES]</span>}
              {device.name}
            </span>
            {device.system && !isReservation && (
              <span className="text-[8px] text-slate-500 truncate">{device.system}</span>
            )}
            {isReservation && device.reservation_info?.poc && (
              <span className="text-[7px] text-slate-500 truncate">POC: {device.reservation_info.poc}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {loc?.size_u > 1 && (
              <span className="text-[7px] text-slate-600 font-mono">{loc.size_u}U</span>
            )}
            <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded border ${typeCfg?.color} border-current/20 bg-current/5`}>
              {typeCfg?.short}
            </span>
            {loc.orientation === 'Back' && (
              <span className="text-[7px] font-black px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">REAR</span>
            )}
          </div>
        </div>
      )}

      {!device && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center pl-8 pointer-events-none">
          <Plus size={8} className="text-blue-500/70 mr-1" />
          <span className="text-[7px] text-blue-500/60 font-bold uppercase tracking-widest">Mount / Reserve</span>
        </div>
      )}
    </div>
  )
}

// ─── Power / Fill Mini Bar ─────────────────────────────────────────────────────

const MiniBar = ({ value, max, colorFn, label, unit }: { value: number; max: number; colorFn: (p: number) => string; label: string; unit: string }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[7px] text-slate-500 uppercase font-bold tracking-wider">{label}</span>
        <span className="text-[8px] font-black text-slate-300 tabular-nums">{value.toFixed(1)}<span className="text-slate-500 font-normal">/{max}{unit}</span></span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorFn(pct)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Rack Elevation Card ───────────────────────────────────────────────────────

interface RackElevationProps {
  rack: any
  onDelete: (id: number) => void
  onEdit: (rack: any) => void
  onMove?: (dir: 'left' | 'right') => void
  searchTerm: string
  onMount: (rackId: number, u: number) => void
  onManageDevice: (device: any, loc: any, event: React.MouseEvent) => void
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onRestore?: (id: number) => void
  isDeleted: boolean
  viewMode: 'normal' | 'compact'
  focusedDeviceId?: number | null
  connectedDeviceIds?: number[]
}

const RackElevation = ({
  rack, onDelete, onEdit, onMove, searchTerm, onMount, onManageDevice,
  isSelected, onToggleSelect, onRestore, isDeleted, viewMode,
  focusedDeviceId, connectedDeviceIds
}: RackElevationProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const totalU = rack.total_u || 42
  const units = Array.from({ length: totalU }, (_, i) => totalU - i)

  const occupiedU = useMemo(() =>
    (rack.device_locations || []).reduce((acc: number, l: any) => acc + (l.size_u || 1), 0),
  [rack.device_locations])

  const fillPct = Math.round((occupiedU / totalU) * 100)

  const estimatedPowerKw = useMemo(() =>
    (rack.device_locations || []).reduce((acc: number, l: any) => acc + ((l.device?.power_typical_w || 0) / 1000), 0),
  [rack.device_locations])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of rack.device_locations || []) {
      const s = l.device?.status || 'Unknown'
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  }, [rack.device_locations])

  const isHighlighted = (device: any) =>
    !!searchTerm && device?.name?.toLowerCase().includes(searchTerm.toLowerCase())

  return (
    <div className={`glass-panel flex-shrink-0 rounded-2xl overflow-hidden flex flex-col border transition-all group relative
      ${isSelected ? 'border-blue-500/60 shadow-blue-500/15 shadow-2xl bg-blue-900/[0.07]' : 'border-white/[0.07] hover:border-white/20'}
      ${isDeleted ? 'opacity-60 grayscale-[0.4]' : ''}
      ${viewMode === 'compact' ? 'w-52' : 'w-64'}
    `}>

      {/* Checkbox */}
      <div className="absolute top-3 left-3 z-20" onClick={e => e.stopPropagation()}>
        <div
          onClick={() => onToggleSelect(rack.id)}
          className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer border transition-all ${
            isSelected ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/50' : 'border-white/20 bg-black/30 hover:border-blue-400'
          }`}
        >
          {isSelected && <Check size={10} strokeWidth={3.5} />}
        </div>
      </div>

      {/* Header */}
      <div className="px-4 pt-3 pb-3 bg-white/[0.03] border-b border-white/[0.06] space-y-2.5">
        <div className="flex items-start justify-between ml-6 gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-[11px] uppercase tracking-widest text-white truncate leading-tight">{rack.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin size={9} className="text-slate-600 shrink-0" />
              <span className="text-[8px] text-slate-500 font-bold uppercase truncate">{rack.site_name || 'Unassigned'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isDeleted ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onRestore?.(rack.id)}
                  className="px-2 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-lg text-[7px] font-black uppercase tracking-widest hover:bg-emerald-500/25 transition-all flex items-center gap-1"
                >
                  <RefreshCcw size={9} /> Restore
                </button>
                <button
                  onClick={() => onDelete(rack.id)}
                  className="p-1 hover:bg-rose-500/10 rounded text-rose-500 transition-colors"
                  title="Permanent Delete"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical size={13} />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        className="absolute right-0 top-8 w-36 bg-slate-950/95 backdrop-blur border border-white/10 rounded-xl shadow-2xl z-[70] overflow-hidden p-1"
                      >
                        {onMove && (<>
                          <button onClick={() => { onMove('left'); setMenuOpen(false) }} className="w-full text-left px-3 py-2 text-[8px] font-bold uppercase text-slate-400 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2 transition-colors">
                            <ArrowRightLeft size={9} className="scale-x-[-1]" /> Move Left
                          </button>
                          <button onClick={() => { onMove('right'); setMenuOpen(false) }} className="w-full text-left px-3 py-2 text-[8px] font-bold uppercase text-slate-400 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2 transition-colors">
                            <ArrowRightLeft size={9} /> Move Right
                          </button>
                          <div className="h-px bg-white/5 my-1" />
                        </>)}
                        <button onClick={() => { onEdit(rack); setMenuOpen(false) }} className="w-full text-left px-3 py-2 text-[8px] font-bold uppercase text-slate-400 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg flex items-center gap-2 transition-colors">
                          <Edit2 size={9} /> Edit Rack
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        <button onClick={() => { onDelete(rack.id); setMenuOpen(false) }} className="w-full text-left px-3 py-2 text-[8px] font-bold uppercase text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 transition-colors">
                          <Trash2 size={9} /> Delete
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Capacity bars */}
        <div className="space-y-1.5">
          <MiniBar value={occupiedU} max={totalU} colorFn={fillColor} label="Fill" unit="U" />
          <MiniBar value={estimatedPowerKw} max={rack.max_power_kw || 10} colorFn={powerColor} label="Power" unit="kW" />
        </div>

        {/* KPI pills */}
        <div className="flex flex-wrap gap-1">
          <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5 tabular-nums">
            {totalU}U
          </span>
          <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md border tabular-nums ${
            fillPct >= 90 ? 'bg-rose-500/15 text-rose-400 border-rose-500/25' :
            fillPct >= 70 ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
            'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
          }`}>
            {fillPct}% fill
          </span>
          {Object.entries(statusCounts).map(([s, n]) => (
            <span key={s} className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md border ${getStatusCfg(s).badge} tabular-nums`}>
              {n} {s.slice(0,3)}
            </span>
          ))}
          {isDeleted && (
            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/25">Purged</span>
          )}
        </div>
      </div>

      {/* Elevation grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: `${22 * Math.min(totalU, 48) + 8}px` }}>
        <div className="bg-black/30 mx-2 my-2 border border-white/[0.05] rounded-lg overflow-hidden">
          {units.map(u => {
            const loc = rack.device_locations?.find((l: any) => u >= l.start_unit && u < l.start_unit + l.size_u)
            return (
              <RackUnit
                key={u}
                uNumber={u}
                loc={loc}
                isTop={loc ? u === loc.start_unit + loc.size_u - 1 : false}
                isBottom={loc ? u === loc.start_unit : false}
                highlight={loc?.device ? isHighlighted(loc.device) : false}
                onSelect={() => onMount(rack.id, u)}
                onManage={(device, l, e) => onManageDevice(device, l, e)}
                isDeleted={isDeleted}
                isFocused={loc?.device_id === focusedDeviceId}
                isConnected={connectedDeviceIds?.includes(loc?.device_id)}
              />
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between">
        <span className="text-[7px] text-slate-600 font-bold uppercase tracking-wider">{(rack.device_locations || []).length} assets</span>
        <span className="text-[7px] text-slate-600 font-mono">{totalU - occupiedU}U free</span>
      </div>
    </div>
  )
}

// ─── Site Capacity Summary Bar ─────────────────────────────────────────────────

const SiteCapacityBar = ({ racks }: { racks: any[] }) => {
  const totalU = racks.reduce((a: number, r: any) => a + (r.total_u || 42), 0)
  const usedU = racks.reduce((a: number, r: any) => a + (r.device_locations || []).reduce((b: number, l: any) => b + (l.size_u || 1), 0), 0)
  const totalDevices = racks.reduce((a: number, r: any) => a + (r.device_locations || []).length, 0)
  const fillPct = totalU > 0 ? Math.round((usedU / totalU) * 100) : 0
  const estimatedPowerKw = racks.reduce((a: number, r: any) =>
    a + (r.device_locations || []).reduce((b: number, l: any) => b + ((l.device?.power_typical_w || 0) / 1000), 0), 0)
  const totalPowerCapKw = racks.reduce((a: number, r: any) => a + (r.max_power_kw || 10), 0)

  const stats = [
    { label: 'Racks',     value: String(racks.length),                icon: <Server size={12}/>,      color: 'text-blue-400' },
    { label: 'Assets',    value: String(totalDevices),                 icon: <Package size={12}/>,     color: 'text-violet-400' },
    { label: 'Fill',      value: `${fillPct}%`,                        icon: <BarChart3 size={12}/>,   color: fillPct >= 90 ? 'text-rose-400' : fillPct >= 70 ? 'text-amber-400' : 'text-emerald-400' },
    { label: 'Power Est.',value: `${estimatedPowerKw.toFixed(1)}kW`,   icon: <Zap size={12}/>,         color: 'text-sky-400' },
    { label: 'Capacity',  value: `${totalPowerCapKw.toFixed(0)}kW`,    icon: <TrendingUp size={12}/>,  color: 'text-slate-400' },
  ]

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <div className="h-5 w-px bg-white/10" />}
          <div className="flex items-center gap-1.5">
            <span className={`${s.color} opacity-70`}>{s.icon}</span>
            <div>
              <div className={`text-[11px] font-black tabular-nums ${s.color}`}>{s.value}</div>
              <div className="text-[7px] text-slate-600 uppercase font-bold tracking-wider">{s.label}</div>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Floating Bulk Toolbar ─────────────────────────────────────────────────────

const BulkToolbar = ({ count, onDelete, onRelocate, onCompare, onClear, isDeleted, onRestore }:
  { count: number; onDelete: () => void; onRelocate: () => void; onCompare: () => void; onClear: () => void; isDeleted: boolean; onRestore: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 16 }}
    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-5 py-3 bg-slate-950/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl"
  >
    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mr-2">{count} selected</span>
    <div className="h-4 w-px bg-white/10" />
    {isDeleted ? (
      <>
        <button onClick={onRestore} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-lg text-[8px] font-black uppercase hover:bg-emerald-500/25 transition-all">
          <RefreshCcw size={11} /> Restore
        </button>
        <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 text-rose-400 border border-rose-500/25 rounded-lg text-[8px] font-black uppercase hover:bg-rose-500/25 transition-all">
          <Trash2 size={11} /> Purge
        </button>
      </>
    ) : (<>
      <button onClick={onCompare} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded-lg text-[8px] font-black uppercase hover:bg-blue-500/25 transition-all">
        <Server size={11} /> Compare
      </button>
      <button onClick={onRelocate} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/15 text-violet-400 border border-violet-500/25 rounded-lg text-[8px] font-black uppercase hover:bg-violet-500/25 transition-all">
        <ArrowRightLeft size={11} /> Relocate
      </button>
      <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 text-rose-400 border border-rose-500/25 rounded-lg text-[8px] font-black uppercase hover:bg-rose-500/25 transition-all">
        <Trash2 size={11} /> Delete
      </button>
    </>)}
    <div className="h-4 w-px bg-white/10" />
    <button onClick={onClear} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
      <X size={13} />
    </button>
  </motion.div>
)

// ─── Device Detail Modal ───────────────────────────────────────────────────────

const DeviceDetailModal = ({ device, loc, rack, onClose, onUnmount, onUpdateMount, onUpdateDevice }:
  { device: any; loc: any; rack: any; onClose: () => void; onUnmount: (id: number) => void; onUpdateMount: (data: any) => void; onUpdateDevice?: (data: any) => void }) => {
  const [newSizeU, setNewSizeU] = useState(loc?.size_u || device?.size_u || 1)
  const [powerTypicalW, setPowerTypicalW] = useState(device?.power_typical_w || 0)
  const [powerMaxW, setPowerMaxW] = useState(device?.power_max_w || 0)
  const [orientation, setOrientation] = useState(loc?.orientation || 'Front')
  const [depth, setDepth] = useState(loc?.depth || device?.depth || 'Full')
  const [confirmUnmount, setConfirmUnmount] = useState(false)

  const statusCfg = getStatusCfg(device?.status, device?.is_reservation)
  const typeCfg = getTypeCfg(device?.type)

  const infoRows = [
    { label: 'System',        value: device?.system },
    { label: 'Environment',   value: device?.environment },
    { label: 'Owner',         value: device?.owner },
    { label: 'Business Unit', value: device?.business_unit },
    { label: 'Manufacturer',  value: device?.manufacturer },
    { label: 'Model',         value: device?.model },
    { label: 'OS',            value: device?.os_name ? `${device.os_name} ${device.os_version || ''}`.trim() : null },
    { label: 'Mgmt IP',       value: device?.management_ip },
    { label: 'Serial',        value: device?.serial_number },
    { label: 'Asset Tag',     value: device?.asset_tag },
    { label: 'Rack',          value: rack?.name },
    { label: 'Position',      value: loc ? `U${loc.start_unit} – U${loc.start_unit + loc.size_u - 1}` : null },
    { label: 'Reserved By',   value: device?.is_reservation ? device?.reservation_info?.poc : null },
    { label: 'Est. Rack Date', value: device?.is_reservation ? device?.reservation_info?.est_date : null },
  ].filter(r => r.value)

  const warrantyDate = device?.warranty_end ? new Date(device.warranty_end) : null
  const warrantyExpired = warrantyDate && warrantyDate < new Date()
  const eolDate = device?.eol_date ? new Date(device.eol_date) : null
  const eolExpired = eolDate && eolDate < new Date()

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        className="glass-panel w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-white/[0.03] border-b border-white/[0.07] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${typeCfg.color}`}>
              <Monitor size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black uppercase tracking-tight text-white truncate">
                {device?.is_reservation && <span className="text-violet-400 mr-2">[RESERVE]</span>}
                {device?.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${statusCfg.color}`}>{device?.status}</span>
                <span className="text-slate-700">·</span>
                <span className={`text-[9px] font-bold uppercase ${typeCfg.color}`}>{device?.type}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-colors shrink-0 mt-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Warranty / EOL alerts */}
        {(warrantyExpired || eolExpired) && (
          <div className="px-6 py-3 bg-amber-500/[0.07] border-b border-amber-500/20 flex items-center gap-2">
            <AlertTriangle size={13} className="text-amber-400 shrink-0" />
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
              {warrantyExpired && 'Warranty Expired'}{warrantyExpired && eolExpired && ' · '}{eolExpired && 'End of Life Reached'}
            </span>
          </div>
        )}

        {/* Info grid */}
        <div className="px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-3 max-h-56 overflow-y-auto custom-scrollbar">
          {infoRows.map(row => (
            <div key={row.label}>
              <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">{row.label}</p>
              <p className="text-[10px] font-bold text-slate-200 mt-0.5 truncate">{row.value}</p>
            </div>
          ))}
          {device?.management_url && (
            <div className="col-span-2">
              <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Management URL</p>
              <a href={device.management_url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 mt-0.5 flex items-center gap-1 truncate transition-colors">
                {device.management_url} <ExternalLink size={9} className="shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Physical Mounting (editable) */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Mount Side</label>
              <StyledSelect
                options={[
                  { label: 'FRONT', value: 'Front' },
                  { label: 'REAR (BACK)', value: 'Back' }
                ]}
                value={orientation}
                onChange={e => setOrientation(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Depth</label>
              <StyledSelect
                options={[
                  { label: 'FULL DEPTH', value: 'Full' },
                  { label: 'HALF DEPTH', value: 'Half' }
                ]}
                value={depth}
                onChange={e => setDepth(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Vertical Size (U)</label>
              <input
                type="number" min={1} max={rack?.total_u || 42}
                value={newSizeU}
                onChange={e => setNewSizeU(parseInt(e.target.value) || 1)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500/60 transition-colors font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { if (rack && loc) onUpdateMount({ rackId: rack.id, device_id: device.id, start_u: loc.start_unit, size_u: newSizeU, orientation, depth }) }}
                className="w-full px-4 py-2 bg-blue-600/15 text-blue-400 border border-blue-500/25 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600/25 transition-all flex items-center justify-center gap-1.5"
              >
                <Check size={11} /> Update Mount
              </button>
            </div>
          </div>
        </div>

        {/* Power consumption (editable) */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] space-y-3">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Power Consumption (W)</span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Avg (Typical)</label>
              <input
                type="number" min={0} step={0.1}
                value={powerTypicalW}
                onChange={e => setPowerTypicalW(parseFloat(e.target.value) || 0)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500/60 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Max Peak</label>
              <input
                type="number" min={0} step={0.1}
                value={powerMaxW}
                onChange={e => setPowerMaxW(parseFloat(e.target.value) || 0)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500/60 transition-colors font-mono"
              />
            </div>
          </div>
          {(powerTypicalW !== device?.power_typical_w || powerMaxW !== device?.power_max_w) && (
            <button
              onClick={() => {
                onUpdateDevice?.({ id: device.id, power_typical_w: powerTypicalW, power_max_w: powerMaxW })
              }}
              className="w-full px-3 py-2 bg-emerald-600/15 text-emerald-400 border border-emerald-500/25 rounded-lg text-[8px] font-black uppercase hover:bg-emerald-600/25 transition-all flex items-center justify-center gap-1.5"
            >
              <Check size={11} /> Save Power
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <button
            onClick={() => setConfirmUnmount(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-[9px] font-black uppercase hover:bg-rose-500/20 transition-all"
          >
            <Trash2 size={11} /> {device?.is_reservation ? 'Cancel Reservation' : 'Unmount Asset'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-[9px] font-black uppercase text-slate-500 hover:text-slate-300 transition-colors">
            Close
          </button>
        </div>
      </motion.div>

      <ConfirmationModal
        isOpen={confirmUnmount}
        onClose={() => setConfirmUnmount(false)}
        onConfirm={() => { onUnmount(device.id); onClose() }}
        title={device?.is_reservation ? "Cancel Reservation" : "Unmount Asset"}
        message={device?.is_reservation 
          ? `Remove reservation "${device?.name}"?`
          : `Remove ${device?.name} from ${rack?.name}? The device will remain in the asset registry.`}
        variant="warning"
        confirmText={device?.is_reservation ? "Remove" : "Unmount"}
      />
    </div>
  )
}

// ─── Relocate Modal ────────────────────────────────────────────────────────────

const RelocateModal = ({ selectedRacks, sites, onClose, onRelocate }:
  { selectedRacks: number[]; sites: any[]; onClose: () => void; onRelocate: (siteId: number) => void }) => {
  const [targetSiteId, setTargetSiteId] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass-panel w-[420px] p-8 rounded-3xl space-y-6 border border-violet-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/15 rounded-xl border border-violet-500/20">
            <ArrowRightLeft size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-tight text-white">Relocate Racks</h2>
            <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">{selectedRacks.length} rack(s) selected</p>
          </div>
        </div>
        <StyledSelect
          label="Destination Site"
          value={targetSiteId}
          onChange={e => setTargetSiteId(e.target.value)}
          options={sites?.map((s: any) => ({ value: String(s.id), label: s.name })) || []}
          placeholder="Select target site..."
        />
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 text-[9px] font-black uppercase text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
          <button
            disabled={!targetSiteId}
            onClick={() => { if (targetSiteId) { onRelocate(parseInt(targetSiteId)); onClose() } }}
            className="flex-1 py-3 bg-violet-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-violet-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Relocate
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RackTemp() {
  const queryClient = useQueryClient()

  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices')).json()) })
  const { data: sites } = useQuery({ queryKey: ['sites'], queryFn: async () => (await (await apiFetch('/api/v1/sites/')).json()) })
  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: async () => (await (await apiFetch('/api/v1/networks/connections')).json()) })

  const [searchTerm, setSearchTerm] = useState('')
  const [activeSite, setActiveSite] = useState<number | null>(null)
  const [activeSiteMenu, setActiveSiteMenu] = useState<number | null>(null)
  const [isAddingSite, setIsAddingSite] = useState(false)
  const [newSite, setNewSite] = useState({ name: '', address: '' })
  const [isEditingSite, setIsEditingSite] = useState<any>(null)
  const [isAddingRack, setIsAddingRack] = useState(false)
  const [newRack, setNewRack] = useState({ name: '', total_u: 42, max_power_kw: 10.0, site_id: '' })
  const [isEditingRack, setIsEditingRack] = useState<any>(null)
  const [isProvisioning, setIsProvisioning] = useState<any>(null)
  const [provisionMode, setProvisionMode] = useState<'asset' | 'reserve'>('asset')
  const [reserveInfo, setReserveInfo] = useState({ temporary_name: '', est_date: '', poc: '' })

  const [managingDevice, setManagingDevice] = useState<{ device: any; loc: any; rack: any } | null>(null)
  const [showCompareOnly, setShowCompareOnly] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active')
  const [selectedRacks, setSelectedRacks] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'normal' | 'compact'>('compact')
  const [showRelocateModal, setShowRelocateModal] = useState(false)
  const [mountSearch, setMountSearch] = useState('')
  
  const [optionsMenu, setOptionsMenu] = useState<{ x: number; y: number; device: any; loc: any; rack: any } | null>(null)
  const [focusedConnection, setFocusedConnection] = useState<{ sourceId: number; targetIds: number[] } | null>(null)

  const [restoreWizard, setRestoreWizard] = useState<{
    step: 'site-select' | 'name-conflict' | 'asset-warning' | null
    ids: number[]
    targetSiteId?: number
    nameConflicts: Array<{ rackId: number; rackName: string; newName: string }>
    assetWarnings: Array<{ rackName: string; devices: string[] }>
    generalAssetWarning: boolean
  } | null>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' })

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: any = 'danger') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant })
  }

  const { data: allRacks, isLoading } = useQuery({
    queryKey: ['racks-all'],
    queryFn: async () => (await (await apiFetch('/api/v1/racks/?include_deleted=true')).json())
  })

  const { activeRacks, deletedRacks } = useMemo(() => {
    if (!allRacks) return { activeRacks: [], deletedRacks: [] }
    return {
      activeRacks: allRacks.filter((r: any) => !r.is_deleted),
      deletedRacks: allRacks.filter((r: any) => r.is_deleted)
    }
  }, [allRacks])

  const racks = activeTab === 'active' ? activeRacks : deletedRacks

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const mountMutation = useMutation({
    mutationFn: async (data: any) => {
      const { rackId, ...rest } = data
      
      let finalDeviceId = rest.device_id
      
      // If reserving a new slot
      if (provisionMode === 'reserve') {
        const resDev = await apiFetch('/api/v1/devices/', {
          method: 'POST',
          body: JSON.stringify({
            name: reserveInfo.temporary_name || `RESERVE-${Date.now().toString().slice(-4)}`,
            system: 'RESERVATION',
            type: 'Physical',
            status: 'Active',
            is_reservation: true,
            reservation_info: {
              poc: reserveInfo.poc,
              est_date: reserveInfo.est_date
            },
            serial_number: `RES-${Date.now()}`,
            asset_tag: `RES-${Date.now()}`
          })
        })
        const newDev = await resDev.json()
        finalDeviceId = newDev.id
      }

      if (!finalDeviceId) throw new Error('DEVICE_REQUIRED')
      const payload = { 
        ...rest, 
        device_id: finalDeviceId,
        size_u: rest.size_u || 1,
        orientation: rest.orientation || 'Front',
        depth: rest.depth || 'Full'
      }
      const res = await apiFetch(`/api/v1/racks/${rackId}/mount`, { method: 'POST', body: JSON.stringify(payload) })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks-all'] })
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      toast.success(provisionMode === 'reserve' ? 'Space reserved successfully' : 'Asset mounted successfully')
      setIsProvisioning(null)
      setReserveInfo({ temporary_name: '', est_date: '', poc: '' })
    },
    onError: (e: any) => {
      if (e.data?.type === 'RELOCATION_CONFLICT') {
        const device = devices?.find((d: any) => String(d.id) === String(e.data.payload.device_id))
        const msg = `${device?.name || 'Asset'} is currently at ${e.data.detail}.\n\nDo you want to relocate it to this new position?`
        
        openConfirm(
          'Relocate Asset', 
          msg,
          () => mountMutation.mutate({ ...e.data.payload, relocate: true, rackId: e.data.rackId }), 
          'warning'
        )
      } else if (e.message === 'DEVICE_REQUIRED') toast.error('Select an asset first')
      else toast.error(e.message || 'Mounting failed')
    }
  })

  const siteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = data.id
        ? await apiFetch(`/api/v1/sites/${data.id}`, { method: 'PUT', body: JSON.stringify(data) })
        : await apiFetch('/api/v1/sites/', { method: 'POST', body: JSON.stringify(data) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      queryClient.invalidateQueries({ queryKey: ['racks-all'] })
      setIsAddingSite(false)
      setIsEditingSite(null)
      setNewSite({ name: '', address: '' })
      toast.success('Site saved')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const rackMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = data.id
        ? await apiFetch(`/api/v1/racks/${data.id}`, { method: 'PUT', body: JSON.stringify(data) })
        : await apiFetch('/api/v1/racks/', { method: 'POST', body: JSON.stringify(data) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Failed to save rack')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks-all'] })
      setIsAddingRack(false)
      setIsEditingRack(null)
      setNewRack({ name: '', total_u: 42, max_power_kw: 10.0, site_id: '' })
      toast.success('Rack saved')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const bulkActionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/racks/bulk-action', { method: 'POST', body: JSON.stringify(data) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks-all'] })
      setSelectedRacks([])
      setShowRelocateModal(false)
      setRestoreWizard(null)
      toast.success('Action completed')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const availableDevices: any[] = devices || []

  const proceedRestoreWizard = (targetSiteId?: number) => {
    if (!restoreWizard) return
    const ids = restoreWizard.ids
    const activeRackNames = new Set(activeRacks.map((r: any) => r.name))
    const nameConflicts = deletedRacks
      .filter((r: any) => ids.includes(r.id) && activeRackNames.has(r.name))
      .map((r: any) => ({ rackId: r.id, rackName: r.name, newName: r.name }))
    const assetWarnings = deletedRacks
      .filter((r: any) => ids.includes(r.id) && r.device_locations?.length > 0)
      .map((r: any) => ({ rackName: r.name, devices: r.device_locations.map((l: any) => l.device?.name).filter(Boolean) }))

    if (nameConflicts.length > 0 && restoreWizard.step === 'site-select') {
      setRestoreWizard({ ...restoreWizard, step: 'name-conflict', targetSiteId, nameConflicts, assetWarnings, generalAssetWarning: assetWarnings.length > 0 })
    } else if (assetWarnings.length > 0 && restoreWizard.step !== 'asset-warning') {
      setRestoreWizard({ ...restoreWizard, step: 'asset-warning', targetSiteId, nameConflicts: restoreWizard.nameConflicts, assetWarnings, generalAssetWarning: true })
    } else {
      executeRestore(ids, targetSiteId)
    }
  }

  const executeRestore = (ids: number[], targetSiteId?: number) => {
    const renames: Record<string, string> = {}
    if (restoreWizard?.nameConflicts) {
      for (const nc of restoreWizard.nameConflicts) {
        if (nc.newName !== nc.rackName) renames[String(nc.rackId)] = nc.newName
      }
    }
    bulkActionMutation.mutate({
      action: 'restore',
      ids,
      payload: { new_site_id: targetSiteId, renames }
    })
  }

  const updateMountMutation = useMutation({
    mutationFn: async ({ rackId, device_id, start_u, size_u, orientation, depth }: any) => {
      const res = await apiFetch(`/api/v1/racks/${rackId}/mount`, {
        method: 'POST',
        body: JSON.stringify({ device_id, start_u, size_u, orientation, depth, relocate: true })
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks-all'] })
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      toast.success('Mount updated')
      setManagingDevice(null)
    },
    onError: (e: any) => toast.error(e.message)
  })

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col gap-5 min-h-0">
      
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight italic">Rack Sandbox</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Physical Infrastructure · Rack Elevation View</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Active</button>
            <button onClick={() => setActiveTab('deleted')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'deleted' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Deleted</button>
          </div>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button onClick={() => setViewMode('normal')} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'normal' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Full</button>
            <button onClick={() => setViewMode('compact')} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'compact' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Compact</button>
          </div>
          {activeTab === 'active' && (
            <>
              <button onClick={() => setIsAddingRack(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-blue-500/20 transition-all">
                <Plus size={13} /> Rack
              </button>
              <button onClick={() => setIsAddingSite(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20 transition-all">
                <Plus size={13} /> Site
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative shrink-0">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Filter racks by name or site..."
          className="w-full bg-white/5 border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none focus:border-blue-500/60 transition-colors placeholder:text-slate-700"
        />
      </div>

      {/* Rack Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-[10px] font-black uppercase tracking-widest">Loading racks...</div>
        ) : (
          <>
            {/* Group by site */}
            {Array.from(new Set(racks.map((r: any) => r.site_name || 'Unassigned'))).map((siteName: any) => {
              const siteRacks = racks.filter((r: any) => (r.site_name || 'Unassigned') === siteName && r.name.toLowerCase().includes(searchTerm.toLowerCase()))
              if (!siteRacks.length) return null
              const siteId = siteRacks[0]?.site_id
              return (
                <div key={siteName} className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{siteName}</span>
                    </div>
                    <SiteCapacityBar racks={siteRacks} />
                    {activeTab === 'active' && (
                      <button
                        onClick={() => {
                          const site = sites?.find((s: any) => s.id === siteId)
                          if (site) setIsEditingSite(site)
                        }}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        <Settings size={11} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {siteRacks.map((rack: any) => (
                      <div key={rack.id} className="relative">
                        <RackElevation
                          rack={rack}
                          searchTerm={searchTerm}
                          isSelected={selectedRacks.includes(rack.id)}
                          isDeleted={activeTab === 'deleted'}
                          viewMode={viewMode}
                          focusedDeviceId={focusedConnection?.sourceId ?? null}
                          connectedDeviceIds={focusedConnection?.targetIds}
                          onToggleSelect={(id) => setSelectedRacks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                          onMount={(rackId, u) => { setIsProvisioning({ rackId, start_u: u, size_u: 1, orientation: 'Front', depth: 'Full' }); setProvisionMode('asset') }}
                          onManageDevice={(device, loc, e) => {
                            setOptionsMenu({ x: e.clientX, y: e.clientY, device, loc, rack })
                          }}
                          onEdit={(r) => setIsEditingRack(r)}
                          onDelete={(id) => openConfirm('Delete Rack', `Delete rack ${rack.name}?`, () => bulkActionMutation.mutate({ action: 'delete', ids: [id] }))}
                          onRestore={(id) => setRestoreWizard({ step: 'site-select', ids: [id], nameConflicts: [], assetWarnings: [], generalAssetWarning: false })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {racks.filter((r: any) => r.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
              <div className="flex items-center justify-center h-40 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                {activeTab === 'deleted' ? 'No deleted racks' : 'No racks found'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk Toolbar */}
      <AnimatePresence>
        {selectedRacks.length > 0 && (
          <BulkToolbar
            count={selectedRacks.length}
            isDeleted={activeTab === 'deleted'}
            onClear={() => setSelectedRacks([])}
            onCompare={() => setShowCompareOnly(true)}
            onRelocate={() => setShowRelocateModal(true)}
            onDelete={() => openConfirm(
              activeTab === 'deleted' ? 'Purge Racks' : 'Delete Racks',
              activeTab === 'deleted' ? `Permanently delete ${selectedRacks.length} rack(s)?` : `Soft-delete ${selectedRacks.length} rack(s)?`,
              () => bulkActionMutation.mutate({ action: activeTab === 'deleted' ? 'purge' : 'delete', ids: selectedRacks })
            )}
            onRestore={() => setRestoreWizard({ step: 'site-select', ids: selectedRacks, nameConflicts: [], assetWarnings: [], generalAssetWarning: false })}
          />
        )}
      </AnimatePresence>

      {/* Device Detail Modal */}
      {managingDevice && (
        <DeviceDetailModal
          device={managingDevice.device}
          loc={managingDevice.loc}
          rack={managingDevice.rack}
          onClose={() => setManagingDevice(null)}
          onUnmount={async (deviceId) => {
            await apiFetch(`/api/v1/racks/mount/${deviceId}`, { method: 'DELETE' })
            queryClient.invalidateQueries({ queryKey: ['racks-all'] })
            queryClient.invalidateQueries({ queryKey: ['devices'] })
            setManagingDevice(null)
            toast.success('Unmounted')
          }}
          onUpdateMount={(data) => updateMountMutation.mutate(data)}
          onUpdateDevice={async (data) => {
            await apiFetch(`/api/v1/devices/${managingDevice.device.id}`, { method: 'PUT', body: JSON.stringify(data) })
            queryClient.invalidateQueries({ queryKey: ['devices'] })
            queryClient.invalidateQueries({ queryKey: ['racks-all'] })
            toast.success('Device updated')
          }}
        />
      )}

      {/* Options Context Menu */}
      {optionsMenu && (
        <DeviceOptionsMenu
          x={optionsMenu.x}
          y={optionsMenu.y}
          deviceName={optionsMenu.device?.name}
          onClose={() => setOptionsMenu(null)}
          onShowConnections={() => {
            const conns = connections || []
            const targetIds = conns
              .filter((c: any) => c.source_device_id === optionsMenu.device?.id || c.target_device_id === optionsMenu.device?.id)
              .map((c: any) => c.source_device_id === optionsMenu.device?.id ? c.target_device_id : c.source_device_id)
            setFocusedConnection({ sourceId: optionsMenu.device?.id, targetIds })
            setOptionsMenu(null)
          }}
          onEdit={() => { setManagingDevice({ device: optionsMenu.device, loc: optionsMenu.loc, rack: optionsMenu.rack }); setOptionsMenu(null) }}
          onDelete={() => {
            openConfirm('Unmount Device', `Unmount ${optionsMenu.device?.name}?`, async () => {
              await apiFetch(`/api/v1/racks/mount/${optionsMenu.device?.id}`, { method: 'DELETE' })
              queryClient.invalidateQueries({ queryKey: ['racks-all'] })
              queryClient.invalidateQueries({ queryKey: ['devices'] })
              toast.success('Unmounted')
            })
            setOptionsMenu(null)
          }}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-96 space-y-4 shadow-2xl">
            <h3 className="text-sm font-black uppercase text-white">{confirmModal.title}</h3>
            <p className="text-xs text-slate-400">{confirmModal.message}</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold transition-colors">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }) }} className={`flex-1 px-4 py-2 rounded-lg text-xs font-black uppercase transition-colors ${confirmModal.variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>{confirmModal.title}</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Connection Lines overlay */}
      {focusedConnection && (
        <ConnectionLines
          sourceDeviceId={focusedConnection.sourceId}
          targetDeviceIds={focusedConnection.targetIds}
          racks={racks}
          connections={connections}
        />
      )}
      {focusedConnection && (
        <button onClick={() => setFocusedConnection(null)} className="fixed top-6 right-6 z-50 flex items-center gap-2 px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-colors">
          <X size={11} /> Clear connections
        </button>
      )}

      {/* Mount Asset Modal */}
        {isProvisioning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="glass-panel w-[520px] p-8 rounded-3xl space-y-5 border border-blue-500/20 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border transition-colors ${provisionMode === 'reserve' ? 'bg-violet-500/15 border-violet-500/20' : 'bg-blue-500/15 border-blue-500/20'}`}>
                    {provisionMode === 'reserve' ? <Package size={18} className="text-violet-400" /> : <Server size={18} className="text-blue-400" />}
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-tight text-white">
                      {provisionMode === 'reserve' ? 'Reserve Space' : 'Mount Asset'}
                    </h2>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                      {allRacks?.find((r: any) => r.id === isProvisioning.rackId)?.name} · U{isProvisioning.start_u}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setIsProvisioning(null); setMountSearch('') }} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Asset / Reserve Toggle */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setProvisionMode('asset')}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${provisionMode === 'asset' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >Asset Registry</button>
                <button 
                  onClick={() => setProvisionMode('reserve')}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${provisionMode === 'reserve' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >Temporary Reserve</button>
              </div>

              {provisionMode === 'asset' ? (
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Search</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input 
                      autoFocus
                      value={mountSearch}
                      onChange={e => setMountSearch(e.target.value)}
                      placeholder="Filter by name, type, or system..."
                      className="w-full bg-black border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-[11px] font-bold text-white outline-none focus:border-blue-500/60 transition-all placeholder:text-slate-700"
                    />
                  </div>
                  
                  <div className="max-h-[180px] overflow-y-auto custom-scrollbar bg-black/40 border border-white/5 rounded-2xl p-1.5 space-y-1">
                    {availableDevices?.filter((d: any) => {
                      const term = mountSearch.toLowerCase()
                      return d.name.toLowerCase().includes(term) || d.type.toLowerCase().includes(term) || d.system?.toLowerCase().includes(term)
                    }).map((d: any) => {
                      const isSelected = String(d.id) === String(isProvisioning.device_id)
                      const locInfo = d.rack_name ? ` @ ${d.rack_name} U${d.u_start}` : ''
                      return (
                        <button
                          key={d.id}
                          onClick={() => setIsProvisioning({ ...isProvisioning, device_id: String(d.id), size_u: d.size_u || 1 })}
                          className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center justify-between group ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                          <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-tight truncate ${isSelected ? 'text-white' : 'group-hover:text-blue-400'}`}>{d.name}</p>
                            <p className={`text-[8px] font-bold uppercase ${isSelected ? 'text-blue-100' : 'text-slate-600'}`}>{d.type} · {d.system || 'N/A'}{locInfo && <span className="italic ml-1 text-rose-400/80">[{locInfo}]</span>}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <span className={`text-[8px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{d.size_u || 1}U</span>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase block mb-1.5 ml-1">Temporary Asset/Project Name</label>
                      <input 
                        value={reserveInfo.temporary_name}
                        onChange={e => setReserveInfo({ ...reserveInfo, temporary_name: e.target.value })}
                        placeholder="e.g. AI-NODE-CLUSTER-01"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-violet-500/60 transition-colors text-white" 
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase block mb-1.5 ml-1">Est. Racking Date</label>
                      <input 
                        type="date"
                        value={reserveInfo.est_date}
                        onChange={e => setReserveInfo({ ...reserveInfo, est_date: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-violet-500/60 transition-colors text-white" 
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase block mb-1.5 ml-1">POC Name</label>
                      <input 
                        value={reserveInfo.poc}
                        onChange={e => setReserveInfo({ ...reserveInfo, poc: e.target.value })}
                        placeholder="Engineer Name"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-violet-500/60 transition-colors text-white" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Common Fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase block mb-1.5 ml-1">Size (U)</label>
                  <input type="number" min={1} value={isProvisioning.size_u || 1}
                    onChange={e => setIsProvisioning({ ...isProvisioning, size_u: parseInt(e.target.value) || 1 })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-blue-500/60 transition-colors font-mono text-white" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase block mb-1.5 ml-1">Mount Side</label>
                  <StyledSelect
                    options={[{ label: 'FRONT', value: 'Front' }, { label: 'BACK', value: 'Back' }]}
                    value={isProvisioning.orientation || 'Front'}
                    onChange={e => setIsProvisioning({ ...isProvisioning, orientation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase block mb-1.5 ml-1">Depth</label>
                  <StyledSelect
                    options={[{ label: 'FULL', value: 'Full' }, { label: 'HALF', value: 'Half' }]}
                    value={isProvisioning.depth || 'Full'}
                    onChange={e => setIsProvisioning({ ...isProvisioning, depth: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setIsProvisioning(null); setMountSearch('') }} className="flex-1 py-4 text-[9px] font-black uppercase text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                <button 
                  disabled={provisionMode === 'asset' && !isProvisioning.device_id}
                  onClick={() => { mountMutation.mutate(isProvisioning); setMountSearch('') }}
                  className={`flex-2 px-10 py-4 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed border-2 border-white/10 ${provisionMode === 'reserve' ? 'bg-violet-600 shadow-violet-500/20' : 'bg-blue-600 shadow-blue-500/20'}`}>
                  {provisionMode === 'reserve' ? 'Confirm Reservation' : 'Mount Asset'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {(isAddingSite || isEditingSite) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="glass-panel w-[420px] p-8 rounded-3xl space-y-5 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/15 rounded-xl border border-emerald-500/20">
                  <MapPin size={18} className="text-emerald-400" />
                </div>
                <h2 className="text-base font-black uppercase tracking-tight text-white">
                  {isEditingSite ? 'Edit Site' : 'New Site'}
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Site Name</label>
                  <input value={isEditingSite ? isEditingSite.name : newSite.name}
                    onChange={e => isEditingSite ? setIsEditingSite({ ...isEditingSite, name: e.target.value }) : setNewSite({ ...newSite, name: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-emerald-500/60 transition-colors"
                    placeholder="e.g. DATA-CENTER-01" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Physical Address</label>
                  <input value={isEditingSite ? isEditingSite.address : newSite.address}
                    onChange={e => isEditingSite ? setIsEditingSite({ ...isEditingSite, address: e.target.value }) : setNewSite({ ...newSite, address: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-emerald-500/60 transition-colors"
                    placeholder="123 Silicon Valley Way..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setIsAddingSite(false); setIsEditingSite(null) }} className="flex-1 py-3 text-[9px] font-black uppercase text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                <button onClick={() => siteMutation.mutate(isEditingSite || newSite)}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                  {isEditingSite ? 'Save Changes' : 'Create Site'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Rack Create / Edit */}
        {(isAddingRack || isEditingRack) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="glass-panel w-[440px] p-8 rounded-3xl space-y-5 border border-blue-500/20 my-auto">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/15 rounded-xl border border-blue-500/20">
                  <Server size={18} className="text-blue-400" />
                </div>
                <h2 className="text-base font-black uppercase tracking-tight text-white">
                  {isEditingRack ? 'Edit Rack' : 'Provision Rack'}
                </h2>
              </div>
              <div className="space-y-4 relative z-10">
                {!isEditingRack && (
                  <StyledSelect
                    label="Target Site"
                    value={newRack.site_id}
                    onChange={e => setNewRack({ ...newRack, site_id: e.target.value })}
                    options={sites?.map((s: any) => ({ value: String(s.id), label: s.name })) || []}
                    placeholder="Select deployment site..."
                  />
                )}
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Rack Identifier</label>
                  <input
                    value={isEditingRack ? isEditingRack.name : newRack.name}
                    onChange={e => isEditingRack ? setIsEditingRack({ ...isEditingRack, name: e.target.value }) : setNewRack({ ...newRack, name: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500/60 transition-colors"
                    placeholder="e.g. RACK-A01" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Height (U)</label>
                    <input type="number" min={1} max={100}
                      value={isEditingRack ? isEditingRack.total_u : newRack.total_u}
                      onChange={e => isEditingRack ? setIsEditingRack({ ...isEditingRack, total_u: parseInt(e.target.value) }) : setNewRack({ ...newRack, total_u: parseInt(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500/60 transition-colors font-mono" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Max Power (kW)</label>
                    <input type="number" min={0} max={1000} step={0.5}
                      value={isEditingRack ? (isEditingRack.max_power_kw ?? 10.0) : newRack.max_power_kw}
                      onChange={e => isEditingRack ? setIsEditingRack({ ...isEditingRack, max_power_kw: parseFloat(e.target.value) }) : setNewRack({ ...newRack, max_power_kw: parseFloat(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500/60 transition-colors font-mono" />
                  </div>
                </div>
                {isEditingRack && (
                  <StyledSelect
                    label="Relocate to Site (optional)"
                    value={isEditingRack.new_site_id ? String(isEditingRack.new_site_id) : ''}
                    onChange={e => setIsEditingRack({ ...isEditingRack, new_site_id: e.target.value ? parseInt(e.target.value) : null })}
                    options={sites?.map((s: any) => ({ value: String(s.id), label: s.name })) || []}
                    placeholder="Keep current site..."
                  />
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setIsAddingRack(false); setIsEditingRack(null) }} className="flex-1 py-3 text-[9px] font-black uppercase text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                <button
                  onClick={() => {
                    if (!isEditingRack && !newRack.site_id) return toast.error('Site is required')
                    rackMutation.mutate(isEditingRack || newRack)
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                  {isEditingRack ? 'Save Rack' : 'Deploy Rack'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Bulk Relocate */}
        {showRelocateModal && (
          <RelocateModal
            selectedRacks={selectedRacks}
            sites={sites || []}
            onClose={() => setShowRelocateModal(false)}
            onRelocate={siteId => bulkActionMutation.mutate({ action: 'relocate', ids: selectedRacks, payload: { new_site_id: siteId } })}
          />
        )}

        {/* Restore Wizard */}
        {restoreWizard && sites && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-[100]"
            onClick={() => setRestoreWizard(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900/95 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {/* Step 1: Site Selection */}
              {restoreWizard.step === 'site-select' && (
                <>
                  <h2 className="text-lg font-bold text-white">Select Target Site</h2>
                  <p className="text-sm text-slate-400">Choose where to restore these racks.</p>
                  <StyledSelect
                    options={[
                      { value: '', label: 'Standalone (No Site)' },
                      ...sites.map((s: any) => ({ value: String(s.id), label: s.name }))
                    ]}
                    value={String(restoreWizard.targetSiteId || '')}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRestoreWizard({ ...restoreWizard, targetSiteId: e.target.value ? parseInt(e.target.value) : undefined })}
                    label="Target Site"
                  />
                  <div className="flex gap-2 pt-4">
                    <button onClick={() => setRestoreWizard(null)} className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                    <button onClick={() => proceedRestoreWizard(restoreWizard.targetSiteId)} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">Next</button>
                  </div>
                </>
              )}

              {/* Step 2: Name Conflicts */}
              {restoreWizard.step === 'name-conflict' && (
                <>
                  <h2 className="text-lg font-bold text-white">Name Conflicts</h2>
                  <p className="text-sm text-slate-400">These racks have name conflicts. Rename or skip them.</p>
                  <div className="space-y-3">
                    {restoreWizard.nameConflicts.map(nc => (
                      <div key={nc.rackId} className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">{nc.rackName}</label>
                        <input
                          type="text"
                          value={nc.newName}
                          onChange={e => {
                            const updated = restoreWizard.nameConflicts.map(c => c.rackId === nc.rackId ? { ...c, newName: e.target.value } : c)
                            setRestoreWizard({ ...restoreWizard, nameConflicts: updated })
                          }}
                          className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                          placeholder="New name..."
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button onClick={() => setRestoreWizard(null)} className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                    <button onClick={() => proceedRestoreWizard(restoreWizard.targetSiteId)} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">Next</button>
                  </div>
                </>
              )}

              {/* Step 3: Asset Warning */}
              {restoreWizard.step === 'asset-warning' && (
                <>
                  <h2 className="text-lg font-bold text-white">⚠️ Asset Status</h2>
                  {restoreWizard.generalAssetWarning && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <p className="text-xs text-amber-200">Previously mounted assets have been reassigned elsewhere and will not return to this rack when restored.</p>
                    </div>
                  )}
                  {restoreWizard.assetWarnings.length > 0 && (
                    <div className="space-y-2">
                      {restoreWizard.assetWarnings.map((w, i) => (
                        <div key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                          <p className="text-[9px] font-bold text-amber-300 mb-1">{w.rackName}</p>
                          <p className="text-[8px] text-amber-200">Currently active in other racks: {w.devices.join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <button onClick={() => setRestoreWizard(null)} className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                    <button onClick={() => executeRestore(restoreWizard.ids, restoreWizard.targetSiteId)} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors">Restore</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

    </div>
  )
}
