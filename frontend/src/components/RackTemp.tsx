import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Zap, Trash2, Edit2, Search, MapPin, X, ArrowRightLeft, Server,
  Monitor, AlertTriangle, Check, MoreVertical, RefreshCcw,
  Package, BarChart3, ExternalLink, Settings,
  Network, HardDrive, TrendingUp, Layers, List, Upload, Tag, History, Clipboard, Eye, EyeOff, Activity, Terminal
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { BulkImportModal } from './shared/BulkImportModal'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { ConnectionForensicsModal } from './shared/ConnectionForensicsModal'
import { ConnectionsListModal } from './shared/ConnectionsListModal'

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const highlightAnimation = `
  @keyframes highlight-glow {
    0% { box-shadow: 0 0 0px #f59e0b; background-color: rgba(245, 158, 11, 0.2); }
    50% { box-shadow: 0 0 15px #f59e0b; background-color: rgba(245, 158, 11, 0.4); }
    100% { box-shadow: 0 0 0px #f59e0b; background-color: rgba(245, 158, 11, 0.2); }
  }
  .search-highlight {
    animation: highlight-glow 1.5s infinite;
    z-index: 10;
    border: 1px solid #f59e0b !important;
  }
`

const STATUS_CONFIG: Record<string, { color: string; dot: string; badge: string }> = {
  Active:        { color: 'text-emerald-400', dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  Maintenance:   { color: 'text-amber-400',   dot: 'bg-amber-400',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  Decommissioned:{ color: 'text-rose-400',    dot: 'bg-rose-400',    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
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
  if (pct >= 110) return 'bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.8)]'
  if (pct >= 100) return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
  if (pct >= 90) return 'bg-rose-500'
  if (pct >= 70) return 'bg-amber-500'
  if (pct >= 50) return 'bg-blue-500'
  return 'bg-emerald-500'
}

const powerColor = (pct: number) => {
  if (pct >= 110) return 'bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.8)]'
  if (pct >= 100) return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
  if (pct >= 90) return 'bg-rose-500'
  if (pct >= 75) return 'bg-amber-500'
  return 'bg-sky-400'
}

// ─── Status Breathing Bar ────────────────────────────────────────────────────

const RackStatusBar = ({ rack, siteColor }: { rack: any; siteColor?: string }) => {
  const style = { backgroundColor: siteColor || '#10b981' }
  return (
    <div className="absolute top-0 inset-x-0 h-2 z-30 flex">
      <div className="h-full w-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={style} />
    </div>
  )
}

// ─── Power / Fill Mini Bar ─────────────────────────────────────────────────────

const MiniBar = ({ value, max, colorFn, label, unit }: { value: number; max: number; colorFn: (p: number) => string; label: string; unit: string }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const isOverflow = pct >= 100
  
  return (
    <div className="space-y-0.5 group/bar relative">
      <div className="flex justify-between items-center">
        <span className={`text-[7px] uppercase font-bold tracking-wider ${isOverflow ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}>
          {label} {isOverflow && <span className="text-[6px] font-black ml-1">[CAPACITY ALERT]</span>}
        </span>
        <span className={`text-[8px] font-black tabular-nums transition-colors ${isOverflow ? 'text-rose-500' : 'text-slate-300'}`}>
          {value.toFixed(1)}<span className="text-slate-500 font-normal">/{max}{unit}</span>
        </span>
      </div>
      <div className={`h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5 ${isOverflow ? 'ring-1 ring-rose-500/50 shadow-[0_0_8px_rgba(225,29,72,0.3)]' : ''}`}>
        <motion.div 
          className={`h-full rounded-full transition-all duration-700 ease-out ${colorFn(pct)}`} 
          style={{ width: `${Math.min(pct, 100)}%` }} 
          animate={isOverflow ? { opacity: [1, 0.6, 1], scaleY: [1, 1.2, 1] } : {}}
          transition={isOverflow ? { repeat: Infinity, duration: 1 } : {}}
        />
      </div>
    </div>
  )
}

// ─── PDU Bar ───────────────────────────────────────────────────────────

const PduBar = ({ side, isOver, name, capacity, load, onClick }: { side: 'A' | 'B'; isOver: boolean; name?: string; capacity?: number; load?: number; onClick?: () => void }) => {
  const hasPdu = !!name && name !== 'None'
  return (
    <div 
      onClick={onClick}
      className={`absolute ${side === 'A' ? 'left-1' : 'right-1'} top-1 bottom-1 w-2.5 rounded bg-slate-900 border border-white/10 flex flex-col items-center justify-around py-4 cursor-pointer hover:bg-slate-800 transition-all z-20 group/pdu ${!hasPdu ? 'opacity-30 grayscale' : ''}`}
    >
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className={`w-1.5 h-1 rounded-sm transition-all duration-300 ${!hasPdu ? 'bg-slate-700' : isOver ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500/50 group-hover/pdu:bg-emerald-400'}`} />
      ))}
      {hasPdu && (
        <div className={`absolute top-1/2 -translate-y-1/2 ${side === 'A' ? 'left-6' : 'right-6'} opacity-0 group-hover/pdu:opacity-100 pointer-events-none transition-all duration-200 z-50`}>
          <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-3 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] min-w-[140px]">
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Zap size={10} /> {name}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-[7px] font-black">
                <span className="text-slate-500 uppercase">LOAD STATUS</span>
                <span className={isOver ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}>{isOver ? 'OVERLOADED' : 'NOMINAL'}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${isOver ? 'bg-rose-500' : 'bg-emerald-500'} w-[68%]`} />
              </div>
              <div className="flex justify-between text-[7px] font-bold text-slate-400">
                <span>CAPACITY</span>
                <span>{capacity || 10}kW</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Device Options Menu ───────────────────────────────────────────────────────

const DeviceOptionsMenu = ({ x, y, onClose, onShowConnections, onEdit, onDelete, deviceName }: any) => {
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [pos, setPos] = React.useState({ x, y })

  React.useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      let nextX = x
      let nextY = y
      if (x + rect.width > window.innerWidth) nextX = window.innerWidth - rect.width - 20
      if (y + rect.height > window.innerHeight) nextY = window.innerHeight - rect.height - 20
      setPos({ x: nextX, y: nextY })
    }
  }, [x, y])

  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-[110] w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden p-1.5"
      >
        <div className="px-3 py-2 border-b border-white/5 mb-1">
          <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{deviceName}</p>
        </div>
        <button onClick={() => { onShowConnections(); onClose(); }} className="w-full text-left px-3 py-2.5 text-[9px] font-black uppercase text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 rounded-lg flex items-center gap-3 transition-all group">
          <div className="p-1.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
            <Zap size={12} />
          </div>
          Show Connections
        </button>
        <button onClick={() => { onEdit(); onClose(); }} className="w-full text-left px-3 py-2.5 text-[9px] font-black uppercase text-slate-400 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-3 transition-all group">
          <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
            <Edit2 size={12} />
          </div>
          Edit Asset
        </button>
        <div className="h-px bg-white/5 my-1" />
        <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-3 py-2.5 text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center gap-3 transition-all group">
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

const ConnectionLines = ({ sourceDeviceId, targetDeviceIds, racks, connections, devices, onLineClick }: { sourceDeviceId: number; targetDeviceIds: number[]; racks: any[]; connections?: any[]; devices?: any[]; onLineClick?: (conn: any) => void }) => {
  const [lines, setLines] = React.useState<any[]>([])
  const [hoveredLine, setHoveredLine] = React.useState<any>(null)
  const [containerStyle, setContainerStyle] = React.useState({ width: '100%', height: '100%' })
  const requestRef = React.useRef<number | null>(null)

  const updateLines = React.useCallback(() => {
    const gridEl = document.getElementById('rack-temp-grid')
    if (!gridEl) return
    const gridRect = gridEl.getBoundingClientRect()
    if (gridEl.scrollWidth !== 0) {
      setContainerStyle({ width: `${gridEl.scrollWidth}px`, height: `${gridEl.scrollHeight}px` })
    }
    const getPoint = (deviceId: number) => {
      const el = document.querySelector(`[data-device-id="${deviceId}"]`) as HTMLElement
      if (!el) return null
      const elRect = el.getBoundingClientRect()
      const x = elRect.left + elRect.width / 2 - gridRect.left + gridEl.scrollLeft
      const y = elRect.top + elRect.height / 2 - gridRect.top + gridEl.scrollTop
      let isScrolledOut = false
      const rackScrollEl = el.closest('.overflow-y-auto')
      if (rackScrollEl) {
        const scrollRect = rackScrollEl.getBoundingClientRect()
        if (elRect.bottom < (scrollRect.top + 2) || elRect.top > (scrollRect.bottom - 2)) isScrolledOut = true
      }
      return { x, y, elRect, isScrolledOut }
    }
    const sourcePoint = getPoint(sourceDeviceId)
    if (!sourcePoint) return
    const newLines: any[] = []
    const processedPairs = new Set<string>()
    targetDeviceIds.forEach((tid, index) => {
      const pairKey = [sourceDeviceId, tid].sort().join('-')
      if (processedPairs.has(pairKey)) return
      processedPairs.add(pairKey)
      const targetPoint = getPoint(tid)
      if (targetPoint) {
        const isSameRack = Math.abs(sourcePoint.x - targetPoint.x) < 30
        const conn = connections?.find((c: any) => 
          (c.source_device_id === sourceDeviceId && c.target_device_id === tid) ||
          (c.source_device_id === tid && c.target_device_id === sourceDeviceId)
        )
        if (isSameRack) {
          const offset = ((index % 2 === 0 ? 1 : -1) * (10 + Math.floor(index / 2) * 4))
          newLines.push({ x1: sourcePoint.x, y1: sourcePoint.y, x2: targetPoint.x, y2: targetPoint.y, isInternal: true, offset, id: pairKey, connection: conn, isScrolledOut: sourcePoint.isScrolledOut || targetPoint.isScrolledOut })
        } else {
          newLines.push({ x1: sourcePoint.x, y1: sourcePoint.y, x2: targetPoint.x, y2: targetPoint.y, isInternal: false, id: pairKey, connection: conn, isScrolledOut: sourcePoint.isScrolledOut || targetPoint.isScrolledOut })
        }
      }
    })
    setLines(newLines)
    requestRef.current = requestAnimationFrame(updateLines)
  }, [sourceDeviceId, targetDeviceIds, connections, racks])

  React.useEffect(() => {
    requestRef.current = requestAnimationFrame(updateLines)
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current) }
  }, [updateLines])

  return (
    <div className="absolute top-0 left-0 pointer-events-none z-[25]" style={containerStyle}>
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
            <g key={l.id || i} className={`pointer-events-auto cursor-pointer group ${(l.isScrolledOut && !l.isInternal) ? 'opacity-20' : 'opacity-100'}`} 
               onMouseEnter={(e) => setHoveredLine({ ...l, mouseX: e.clientX, mouseY: e.clientY })}
               onMouseLeave={() => setHoveredLine(null)}
               onClick={() => l.connection && onLineClick?.(l.connection)}>
              <path d={path} fill="none" stroke="#3b82f6" strokeWidth="8" strokeOpacity="0" />
              <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2.5" filter="url(#lineGlow)" strokeLinecap="round" strokeLinejoin="round" className={`group-hover:stroke-blue-400 group-hover:stroke-[4px] transition-all ${(l.isScrolledOut && !l.isInternal) ? 'stroke-dash-4' : ''}`} strokeDasharray={(l.isScrolledOut && !l.isInternal) ? "8 8" : "none"} />
              <path d={path} fill="none" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.8" strokeLinecap="round" strokeLinejoin="round" />
              {(!l.isScrolledOut || l.isInternal) && (
                <>
                  <circle cx={l.x1} cy={l.y1} r="4" fill="#ffffff" filter="url(#lineGlow)" />
                  <circle cx={l.x2} cy={l.y2} r="4" fill="#ffffff" filter="url(#lineGlow)" />
                </>
              )}
            </g>
          )
        })}
      </svg>

      <AnimatePresence>
        {hoveredLine && hoveredLine.connection && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ position: 'fixed', left: Math.min(window.innerWidth - 220, Math.max(20, hoveredLine.mouseX + 20)), top: Math.min(window.innerHeight - 150, Math.max(20, hoveredLine.mouseY - 40)), zIndex: 100 }}
            className="bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 p-3 rounded-lg shadow-2xl pointer-events-none min-w-[200px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-500/20 rounded-lg"><Network size={12} className="text-blue-400" /></div>
              <span className="text-[10px] font-black text-white uppercase tracking-tight">Connection Detail</span>
            </div>
            <div className="space-y-1.5">
              {(() => {
                const sDev = devices?.find(d => d.id === hoveredLine.connection.source_device_id)
                const tDev = devices?.find(d => d.id === hoveredLine.connection.target_device_id)
                return (
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-1.5 mb-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-blue-400 font-bold uppercase truncate max-w-[90px]">{sDev?.name}</span>
                        <span className="text-[7px] text-slate-500 font-bold uppercase">R:{hoveredLine.connection.src_rack || 'N/A'} U:{hoveredLine.connection.src_slot || 'N/A'}</span>
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono">{hoveredLine.connection.source_ip || 'No IP'}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-emerald-400 font-bold uppercase truncate max-w-[90px]">{tDev?.name}</span>
                        <span className="text-[7px] text-slate-500 font-bold uppercase">R:{hoveredLine.connection.peer_rack || 'N/A'} U:{hoveredLine.connection.peer_slot || 'N/A'}</span>
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono">{hoveredLine.connection.target_ip || 'No IP'}</span>
                    </div>
                  </div>
                )
              })()}
              <div className="grid grid-cols-2 gap-2 mb-1.5">
                <div className="bg-white/5 rounded px-2 py-1 border border-white/5">
                  <p className="text-[6px] text-slate-500 font-black uppercase mb-0.5">FARM</p>
                  <p className="text-[8px] text-indigo-400 font-bold truncate">{hoveredLine.connection.farm || 'N/A'}</p>
                </div>
                <div className="bg-white/5 rounded px-2 py-1 border border-white/5">
                  <p className="text-[6px] text-slate-500 font-black uppercase mb-0.5">STATUS</p>
                  <p className="text-[8px] text-emerald-400 font-bold truncate">{hoveredLine.connection.status || 'Active'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[7px] text-slate-500 font-bold uppercase">Speed</span>
                <span className="text-[9px] text-emerald-400 font-bold">{hoveredLine.connection.speed_gbps || '10'} Gbps</span>
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
  diffMode?: boolean
  liveLoc?: any
}

const RackUnit = ({ uNumber, loc, isTop, isBottom, highlight, onSelect, onManage, isDeleted, isFocused, isConnected, diffMode, liveLoc }: RackUnitProps) => {
  const device = loc?.device
  const isReservation = device?.is_reservation
  const statusCfg = device ? getStatusCfg(device.status, isReservation) : null
  const typeCfg = device ? getTypeCfg(device.type) : null
  const isDiff = diffMode && ((loc?.device_id !== liveLoc?.device_id) || (loc?.orientation !== liveLoc?.orientation) || (loc?.size_u !== liveLoc?.size_u))
  const bgBase = device
    ? isFocused ? 'bg-blue-500/40 border-blue-400/50'
      : isConnected ? 'bg-emerald-500/30 border-emerald-400/40'
      : isDiff ? 'bg-amber-500/40 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse z-10'
      : highlight ? 'animate-pulse bg-amber-500/20 border-amber-500/50 z-10'
      : isReservation ? 'bg-violet-500/20 border-violet-500/30'
      : device.status === 'Maintenance' ? 'bg-amber-500/15'
      : (device.status === 'Decommissioned' || device.status === 'Deleted') ? 'bg-rose-500/15'
      : 'bg-blue-600/30'
    : isDiff && liveLoc ? 'bg-rose-500/20 border-rose-500/40 border-dashed animate-pulse'
    : 'hover:bg-white/[0.04]'
  const borderClass = device ? `${isTop ? 'border-t border-white/10' : ''} ${isBottom ? 'border-b border-black/40' : 'border-b border-white/[0.03]'}` : 'border-b border-white/[0.06]'
  const roundedClass = device ? `${isTop ? 'rounded-t-md' : ''} ${isBottom ? 'rounded-b-md' : ''}` : ''

  return (
    <div style={{ height: '22px' }} className={`relative flex items-center transition-all cursor-default ${bgBase} ${borderClass} ${roundedClass} ${device ? 'mx-[1px] bg-gradient-to-b from-white/[0.05] to-transparent' : ''} ${isReservation ? 'border-dashed' : ''}`} data-device-id={device?.id} data-u={uNumber}>
      <div onClick={(e) => { e.stopPropagation(); if (!isDeleted) onSelect(); }} className={`w-7 h-full flex items-center justify-center shrink-0 cursor-pointer border-r border-white/5 hover:bg-blue-500/20 group/u transition-colors`}>
        <span className={`text-[8px] font-mono select-none tabular-nums transition-colors ${device ? 'text-slate-400 font-black' : 'text-slate-600 group-hover/u:text-blue-400'}`}>{uNumber}</span>
      </div>
      <div onClick={(e) => { e.stopPropagation(); if (device && !isDeleted) onManage(device, loc, e); else if (!isDeleted) onSelect(); }} className={`flex-1 h-full flex items-center min-w-0 px-1.5 ${device ? 'cursor-pointer' : 'cursor-pointer'}`}>
        {isBottom && device && (
          <div className="flex-1 flex items-center justify-between overflow-hidden gap-1 pl-1">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className={`shrink-0 ${statusCfg?.dot} w-1.5 h-1.5 rounded-full ${isReservation ? 'animate-pulse' : ''}`} />
              <div className="flex flex-col min-w-0">
                <span className={`text-[9px] font-black truncate uppercase tracking-tight leading-none ${highlight || isFocused || isConnected ? 'text-white' : 'text-slate-100'}`}>
                  {device.name}
                  {isDiff && <span className="ml-2 text-amber-400 text-[7px] font-black uppercase tracking-widest">[Diff Change]</span>}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded border ${typeCfg?.color} border-current/20 bg-current/5`}>{typeCfg?.short}</span>
              {loc.orientation === 'Back' && <span className="text-[7px] font-black px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">REAR</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Audit Log Modal ───────────────────────────────────────────────────────────

const AuditLogModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['rack-audit-logs'],
    queryFn: async () => (await (await apiFetch('/api/v1/racks/audit-logs')).json()),
    enabled: isOpen
  })
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel w-full max-w-4xl rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20"><List size={20} className="text-blue-400" /></div>
                <div><h2 className="text-lg font-black uppercase tracking-tight text-white">Rack Evolution Logs</h2></div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {logs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-[10px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.action === 'MOUNT' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'}`}>{log.action}</span></td>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-300">{log.user_id}</td>
                      <td className="px-4 py-3 text-[10px] text-slate-400">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Rack Elevation Card ───────────────────────────────────────────────────────

interface RackElevationProps {
  rack: any; onDelete: (id: number) => void; onEdit: (rack: any) => void; onMove?: (dir: 'left' | 'right') => void; onShowInfo?: (rack: any) => void; searchTerm: string; onMount: (rackId: number, u: number) => void; onManageDevice: (device: any, loc: any, event: React.MouseEvent) => void; isSelected: boolean; onToggleSelect: (id: number) => void; onRestore?: (id: number) => void; isDeleted: boolean; rackWidth: number; focusedDeviceId?: number | null; connectedDeviceIds?: number[]; diffMode?: boolean; liveRack?: any; showCheckbox?: boolean; className?: string;
}

const RackElevation = ({ rack, onDelete, onEdit, onMove, onShowInfo, searchTerm, onMount, onManageDevice, isSelected, onToggleSelect, onRestore, isDeleted, rackWidth, focusedDeviceId, connectedDeviceIds, diffMode, liveRack, showCheckbox = true, className = '' }: RackElevationProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const totalU = rack.total_u || 42
  const units = Array.from({ length: totalU }, (_, i) => totalU - i)
  const occupiedU = useMemo(() => (rack.device_locations || []).reduce((acc: number, l: any) => acc + (l.size_u || 1), 0), [rack.device_locations])
  const serverCount = useMemo(() => (rack.device_locations || []).filter((l: any) => l.device?.type?.toLowerCase() === 'server' || l.device?.type?.toLowerCase() === 'physical').length, [rack.device_locations])
  const reservedCount = useMemo(() => (rack.device_locations || []).filter((l: any) => l.device?.status?.toLowerCase() === 'reserved').length, [rack.device_locations])
  const estimatedPowerKw = useMemo(() => (rack.device_locations || []).reduce((acc: number, l: any) => acc + ((l.device?.power_typical_w || 0) / 1000), 0), [rack.device_locations])
  const effectivePowerCapKw = useMemo(() => { const a = rack.pdu_a_cap_kw || 0; const b = rack.pdu_b_cap_kw || 0; if (a > 0 && b > 0) return Math.min(a, b); if (a > 0) return a; if (b > 0) return b; return rack.max_power_kw || 10 }, [rack.pdu_a_cap_kw, rack.pdu_b_cap_kw, rack.max_power_kw])
  const isPowerOver = estimatedPowerKw >= effectivePowerCapKw
  const isFillOver = occupiedU >= totalU
  const isHighlighted = (device: any) => !!searchTerm && device?.name?.toLowerCase().includes(searchTerm.toLowerCase())

  return (
    <div style={{ width: `${rackWidth}px` }} className={`glass-panel flex-shrink-0 rounded-lg overflow-hidden flex flex-col border transition-all group relative ${isSelected ? 'border-blue-500/60 shadow-blue-500/15 shadow-2xl bg-blue-900/[0.07]' : 'border-white/[0.07] hover:border-white/20'} ${isDeleted ? 'opacity-60 grayscale-[0.4]' : ''} ${(isPowerOver || isFillOver) ? 'ring-1 ring-rose-500/50' : ''} h-full max-h-full ${className}`}>
      <RackStatusBar rack={rack} siteColor={rack.site_color} />
      {showCheckbox && (
        <div className="absolute top-4 left-4 z-20" onClick={e => e.stopPropagation()}>
          <div onClick={() => onToggleSelect(rack.id)} className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer border transition-all ${isSelected ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/50' : 'border-white/20 bg-black/30 hover:border-blue-400'}`}>
            {isSelected && <Check size={10} strokeWidth={3.5} />}
          </div>
        </div>
      )}
      <div className="px-4 pt-5 pb-3 bg-white/[0.03] border-b border-white/[0.06] space-y-2.5 shrink-0">
        <div className="flex items-start justify-between ml-6 gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-[11px] uppercase tracking-widest text-white truncate leading-tight">{rack.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5"><MapPin size={9} className="text-slate-600 shrink-0" /><span className="text-[8px] text-slate-500 font-bold uppercase truncate" style={{ color: rack.site_color }}>{rack.site_name || 'Unassigned'}</span></div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isDeleted ? (
              <button onClick={() => onRestore?.(rack.id)} className="px-2 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-lg text-[7px] font-black uppercase tracking-widest hover:bg-emerald-500/25 transition-all flex items-center gap-1"><RefreshCcw size={9} /> Restore</button>
            ) : (
              <div className="relative">
                <button onClick={() => setMenuOpen(v => !v)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"><MoreVertical size={13} /></button>
                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)} />
                      <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} className="absolute right-0 top-8 w-40 bg-slate-950/95 backdrop-blur border border-white/10 rounded-lg shadow-2xl z-[70] overflow-hidden p-1">
                        <button onClick={() => { onShowInfo?.(rack); setMenuOpen(false) }} className="w-full text-left px-3 py-2 text-[8px] font-black uppercase text-blue-400 hover:bg-blue-500/10 rounded-lg flex items-center gap-2 transition-colors"><BarChart3 size={9} /> Detailed Info</button>
                        <button onClick={() => { onEdit(rack); setMenuOpen(false) }} className="w-full text-left px-3 py-2 text-[8px] font-bold uppercase text-slate-400 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg flex items-center gap-2 transition-colors"><Edit2 size={9} /> Edit Rack</button>
                        <button onClick={() => { onDelete(rack.id); setMenuOpen(false) }} className="w-full text-left px-3 py-2 text-[8px] font-bold uppercase text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 transition-colors"><Trash2 size={9} /> Decommission</button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-1.5 px-0.5">
          <div className="flex items-center justify-between mb-0.5 px-0.5">
             <div className="flex gap-2"><span className="text-[7px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Server size={8} /> {serverCount} SRV</span><span className="text-[7px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1"><Package size={8} /> {reservedCount} RES</span></div>
             <div className="flex gap-2"><span className={`text-[7px] font-black uppercase ${isFillOver ? 'text-rose-500' : 'text-slate-500'}`}>{Math.round((occupiedU/totalU)*100)}% SLOT</span><span className={`text-[7px] font-black uppercase ${isPowerOver ? 'text-rose-500' : 'text-slate-500'}`}>{Math.round((estimatedPowerKw/effectivePowerCapKw)*100)}% PWR</span></div>
          </div>
          <MiniBar value={occupiedU} max={totalU} colorFn={fillColor} label="Fill" unit="U" />
          <MiniBar value={estimatedPowerKw} max={effectivePowerCapKw} colorFn={powerColor} label="Power" unit="kW" />
        </div>
      </div>
      <div className="flex-1 min-h-0 relative flex flex-col bg-slate-950/40">
        <PduBar side="A" isOver={isPowerOver} name={rack.pdu_a_name} capacity={rack.pdu_a_cap_kw} onClick={() => onEdit(rack)} />
        <PduBar side="B" isOver={isPowerOver} name={rack.pdu_b_name} capacity={rack.pdu_b_cap_kw} onClick={() => onEdit(rack)} />
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-2">
          <div className="bg-black/30 border border-white/[0.05] rounded-lg overflow-hidden">
            {units.map(u => {
              const loc = rack.device_locations?.find((l: any) => u >= l.start_unit && u < l.start_unit + l.size_u)
              const liveLoc = liveRack?.device_locations?.find((l: any) => u >= l.start_unit && u < l.start_unit + l.size_u)
              return (
                <RackUnit key={u} uNumber={u} loc={loc} isTop={loc ? u === loc.start_unit + loc.size_u - 1 : false} isBottom={loc ? u === loc.start_unit : false} highlight={loc?.device ? isHighlighted(loc.device) : false} onSelect={() => onMount(rack.id, u)} onManage={(device, l, e) => onManageDevice(device, l, e)} isDeleted={isDeleted} isFocused={loc?.device_id === focusedDeviceId} isConnected={connectedDeviceIds?.includes(loc?.device_id)} diffMode={diffMode} liveLoc={liveLoc} />
              )
            })}
          </div>
        </div>
      </div>
      <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3"><span className="text-[7px] text-slate-500 font-black uppercase tracking-wider">{(rack.device_locations || []).length} ASSETS</span><span className="text-[7px] text-blue-500/80 font-black tracking-widest uppercase">{totalU}U</span></div>
        <span className="text-[7px] text-emerald-400/80 font-black tracking-widest uppercase">{totalU - occupiedU}U FREE</span>
      </div>
    </div>
  )
}

// ─── Impact Analysis Window ────────────────────────────────────────────────────

const AssetImpactWindow = ({ deviceId, devices, connections, onClose, coords }: { deviceId: number, devices: any[], connections: any[], onClose: () => void, coords: { x: number, y: number } | null }) => {
  const device = devices?.find(d => d.id === deviceId)
  const deviceConns = connections?.filter(c => c.source_device_id === deviceId || c.target_device_id === deviceId) || []
  const distribution = useMemo(() => {
    const stats: Record<string, Record<string, number>> = { type: {}, status: {}, system: {} }
    deviceConns.forEach(c => {
      const peerId = c.source_device_id === deviceId ? c.target_device_id : c.source_device_id
      const peer = devices?.find(d => d.id === peerId)
      if (peer) {
        stats.type[peer.type || 'Unknown'] = (stats.type[peer.type || 'Unknown'] || 0) + 1
        stats.status[peer.status || 'Unknown'] = (stats.status[peer.status || 'Unknown'] || 0) + 1
        stats.system[peer.system || 'Unknown'] = (stats.system[peer.system || 'Unknown'] || 0) + 1
      }
    })
    return stats
  }, [deviceConns, devices, deviceId])

  // Improved positioning logic: find the furthest corner from the clicked coordinate
  const initialX = coords ? (coords.x > window.innerWidth / 2 ? 80 : window.innerWidth - 530) : 100
  const initialY = coords ? Math.max(80, Math.min(coords.y - 200, window.innerHeight - 600)) : 100

  return (
    <motion.div drag dragMomentum={false} initial={{ x: initialX, y: initialY, opacity: 0 }} animate={{ opacity: 1 }} className="fixed z-[300] w-[450px] bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col cursor-move">
       <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20 text-white"><Activity size={16} /></div>
             <div><h3 className="text-xs font-black uppercase tracking-tight text-white leading-none">Impact Analysis</h3><p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 truncate max-w-[200px]">{device?.name}</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors cursor-pointer"><X size={16}/></button>
       </div>
       <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
             <div className="p-3 bg-black/40 rounded-xl border border-white/5"><p className="text-[7px] font-black text-slate-500 uppercase mb-1">Total Vector Paths</p><p className="text-xl font-black text-white leading-none">{deviceConns.length}</p></div>
             <div className="p-3 bg-black/40 rounded-xl border border-white/5"><p className="text-[7px] font-black text-slate-500 uppercase mb-1">Downstream Systems</p><p className="text-xl font-black text-blue-400 leading-none">{Object.keys(distribution.system).length}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(distribution).map(([category, data]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{category} Distribution</h4>
                <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                  {Object.entries(data).sort((a,b) => b[1] - a[1]).map(([label, count]) => (
                    <div key={label} className="flex justify-between items-center px-3 py-1.5 border-b border-white/[0.03] last:border-0">
                      <span className="text-[9px] font-bold text-slate-300 uppercase truncate max-w-[100px]">{label}</span>
                      <span className="text-[9px] font-black text-white tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
       </div>
       <div className="px-6 py-4 bg-black/40 border-t border-white/10 flex items-center gap-3"><AlertTriangle size={14} className="text-amber-500 shrink-0" /><p className="text-[8px] font-bold text-slate-400 leading-tight">Total system isolation of <span className="text-white">{(deviceConns.length * 2.4).toFixed(0)} services</span> estimated upon hardware failure.</p></div>
    </motion.div>
  )
}

// ─── Spatial Map (Top View) ───────────────────────────────────────────────────

const SpatialMap = ({ racks, onRackClick, siteColor }: { racks: any[]; onRackClick: (rack: any) => void; siteColor?: string }) => {
  const siteGroups = useMemo(() => {
    const data: Record<string, Record<string, Record<string, any[]>>> = {}
    racks.forEach(r => {
      const siteName = r.site_name || 'Unassigned Site'; const aisle = r.aisle || 'General'; const row = r.row || '0'
      if (!data[siteName]) data[siteName] = {}
      if (!data[siteName][aisle]) data[siteName][aisle] = {}
      if (!data[siteName][aisle][row]) data[siteName][aisle][row] = []
      data[siteName][aisle][row].push(r)
    })
    return data
  }, [racks])

  return (
    <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-slate-950/20 rounded-xl border border-white/5 relative">
      <div className="flex flex-col gap-16">
        {Object.entries(siteGroups).sort().map(([siteName, aisles]) => (
          <div key={siteName} className="space-y-10">
             <div className="flex items-center gap-6"><h2 className="text-xl font-black text-white uppercase tracking-[0.3em] shrink-0">{siteName}</h2><div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" /></div>
             <div className="flex flex-col gap-12 pl-4">
                {Object.entries(aisles).sort().map(([aisleName, rows]) => (
                  <div key={aisleName} className="space-y-4">
                    <div className="flex items-center gap-4"><div className="h-px w-8 bg-white/10" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{aisleName !== 'General' ? `AISLE ${aisleName}` : siteName}</span><div className="h-px flex-1 bg-white/5" /></div>
                    <div className="flex flex-col gap-6">
                      {Object.entries(rows).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([rowNum, rackList]) => (
                        <div key={rowNum} className="flex flex-wrap gap-4 justify-start">
                          {rackList.map(rack => {
                            const occupiedU = (rack.device_locations || []).reduce((a: number, l: any) => a + (l.size_u || 1), 0)
                            const totalU = rack.total_u || 42
                            const fillPct = Math.round((occupiedU / totalU) * 100)
                            const realCount = (rack.device_locations || []).filter((l: any) => !l.device?.is_reservation).length
                            const resCount = (rack.device_locations || []).filter((l: any) => l.device?.is_reservation).length
                            const estPowerKw = (rack.device_locations || []).reduce((a: number, l: any) => a + ((l.device?.power_typical_w || 0) / 1000), 0)
                            const powerCapKw = rack.max_power_kw || 10
                            const powerPct = Math.round((estPowerKw / powerCapKw) * 100)
                            return (
                              <motion.div key={rack.id} whileHover={{ scale: 1.05, y: -4 }} onClick={() => onRackClick(rack)} className={`w-44 h-32 rounded-xl border flex flex-col p-4 cursor-pointer transition-all relative overflow-hidden group ${fillPct >= 95 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-900/60 border-white/10 hover:border-blue-500/50 shadow-lg'}`}>
                                <div className="absolute top-0 inset-x-0 h-1 transition-all" style={{ backgroundColor: rack.site_color || siteColor || '#3b82f6' }} />
                                <div className="flex justify-between items-start mb-3"><span className="text-[10px] font-black text-white uppercase tracking-tighter truncate max-w-[100px]">{rack.name}</span><div className="flex gap-1.5"><div className="flex flex-col items-end"><span className="text-[8px] font-black text-white leading-none">{realCount}</span><span className="text-[6px] font-bold text-slate-500 uppercase">REAL</span></div><div className="w-px h-4 bg-white/10 mt-1" /><div className="flex flex-col items-end"><span className="text-[8px] font-black text-violet-400 leading-none">{resCount}</span><span className="text-[6px] font-bold text-slate-500 uppercase">RES</span></div></div></div>
                                <div className="space-y-3"><div className="space-y-1"><div className="flex justify-between items-center px-0.5"><span className="text-[7px] font-black text-slate-500 uppercase">Slot Usage</span><span className={`text-[8px] font-black tabular-nums ${fillPct >= 95 ? 'text-rose-500' : 'text-slate-300'}`}>{fillPct}%</span></div><div className="w-full h-1 bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${fillColor(fillPct)} transition-all duration-500`} style={{ width: `${fillPct}%` }} /></div></div><div className="space-y-1"><div className="flex justify-between items-center px-0.5"><span className="text-[7px] font-black text-slate-500 uppercase">Power Load</span><span className={`text-[8px] font-black tabular-nums ${powerPct >= 90 ? 'text-rose-500' : 'text-sky-400'}`}>{powerPct}%</span></div><div className="w-full h-1 bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${powerColor(powerPct)} transition-all duration-500`} style={{ width: `${powerPct}%` }} /></div></div></div>
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><ExternalLink size={12} className="text-blue-400" /></div>
                              </motion.div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Infrastructure History ───────────────────────────────────────────────────

const snapshots = [
  { id: 1, date: '2026-05-27', author: 'SYSTEM', type: 'Daily Routine' },
  { id: 2, date: '2026-05-26', author: 'SYSTEM', type: 'Daily Routine' },
  { id: 3, date: '2026-05-25', author: 'SYSTEM', type: 'Daily Routine' },
]

const InfrastructureHistory = ({ onClose, onExecuteDiff }: { onClose: () => void, onExecuteDiff: (versions: number[]) => void }) => {
  const [selectedVersions, setSelectedVersions] = useState<number[]>([])
  const toggleVersion = (id: number) => setSelectedVersions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(-2))
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
       <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-4xl max-h-[85vh] flex flex-col p-10 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex justify-between items-start mb-8">
             <div><h2 className="text-3xl font-black uppercase tracking-tighter text-white">Infrastructure Time Machine</h2></div>
             <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-xl text-slate-500 transition-colors"><X size={24}/></button>
          </div>
          <div className="grid grid-cols-1 gap-4 mb-8">
             {snapshots.map(s => {
               const isSelected = selectedVersions.includes(s.id)
               return (
                 <div key={s.id} onClick={() => toggleVersion(s.id)} className={`flex items-center justify-between p-6 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-blue-600/10 border-blue-500' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                    <div className="flex items-center gap-6"><div className={`p-4 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-500'}`}><History size={20} /></div><div><p className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>{s.date}</p><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{s.type} • {s.author}</p></div></div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-white/10 bg-black/20'}`}>{isSelected && <Check size={14} className="text-white" />}</div>
                 </div>
               )
             })}
          </div>
          <div className="flex justify-between items-center bg-white/5 p-8 rounded-2xl border border-white/5">
             <div className="max-w-[500px]"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analysis Engine</p><p className="text-xs text-slate-400 mt-1 italic">{selectedVersions.length === 0 ? "Select a version to compare with Live State (Now)." : selectedVersions.length === 1 ? "Comparing LIVE STATE with snapshot from " + snapshots.find(s => s.id === selectedVersions[0])?.date : "Cross-diffing " + snapshots.find(s => s.id === selectedVersions[0])?.date + " vs " + snapshots.find(s => s.id === selectedVersions[1])?.date}</p></div>
             <button disabled={selectedVersions.length === 0} onClick={() => onExecuteDiff(selectedVersions)} className="px-10 py-4 bg-blue-600 disabled:opacity-30 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Execute Visual Diff Analysis</button>
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
  const [viewMode, setViewMode] = useState<'elevation' | 'spatial'>('elevation')
  const [isPlanMode, setIsPlanMode] = useState(false)
  const [isPlanInitialized, setIsPlanInitialized] = useState(false)
  const [activePlanId, setActivePlanId] = useState<number | null>(null)
  const [virtualRacks, setVirtualRacks] = useState<any[]>([])
  const [showDiff, setShowDiff] = useState(false)
  const [sandboxRackIds, setSandboxRackIds] = useState<number[]>([])
  const [showOnlySandbox, setShowOnlySandbox] = useState(false)
  const [showPlanList, setShowPlanList] = useState(false)
  const [planDraftName, setPlanDraftName] = useState('')
  const { data: plansData, refetch: refetchPlans } = useQuery({ queryKey: ['infra-plans'], queryFn: async () => (await (await apiFetch('/api/v1/racks/plans')).json()) })
  const plans = useMemo(() => (plansData || []).map((p: any) => ({ ...p, date: new Date(p.plan_date).toLocaleString(), racksData: typeof p.virtual_racks_data === 'string' ? JSON.parse(p.virtual_racks_data) : p.virtual_racks_data, racks: p.racks_config })), [plansData])
  const [diffBaseVersion, setDiffBaseVersion] = useState<number | null>(null)
  const [impactAssetId, setImpactAssetId] = useState<number | null>(null)
  const [impactCoords, setImpactCoords] = useState<{ x: number; y: number } | null>(null)
  const [isAddingRack, setIsAddingRack] = useState(false)
  const [isEditingRack, setIsEditingRack] = useState<any>(null)
  const [isProvisioning, setIsProvisioning] = useState<any>(null)
  const [provisionMode, setProvisionMode] = useState<'asset' | 'reserve'>('asset')
  const [reserveInfo, setReserveInfo] = useState({ temporary_name: '', est_date: '', poc: '' })
  const [managingDevice, setManagingDevice] = useState<any>(null)
  const [selectedRacks, setSelectedRacks] = useState<number[]>([])
  const [rackWidth, setRackWidth] = useState(208)
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active')
  const [optionsMenu, setOptionsMenu] = useState<any>(null)
  const [focusedConnection, setFocusedConnection] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const mountMutation = useMutation({
    mutationFn: async (data: any) => {
      const { rackId, ...rest } = data; let finalDeviceId = rest.device_id; let finalDevice = devices?.find((d:any) => d.id === finalDeviceId)
      if (provisionMode === 'reserve') {
        const resDev = await apiFetch('/api/v1/devices/', { method: 'POST', body: JSON.stringify({ name: reserveInfo.temporary_name || `RESERVE-${Date.now().toString().slice(-4)}`, system: 'RESERVATION', type: 'Physical', status: 'Active', is_reservation: true, reservation_info: { poc: reserveInfo.poc, est_date: reserveInfo.est_date } }) })
        finalDevice = await resDev.json(); finalDeviceId = finalDevice.id
      }
      if (!finalDeviceId) throw new Error('DEVICE_REQUIRED')
      if (isPlanInitialized) {
        setVirtualRacks(prev => prev.map(r => {
          if (r.id !== rackId) return r
          const newLocs = (r.device_locations || []).filter((l:any) => l.device_id !== finalDeviceId)
          newLocs.push({ ...rest, device_id: finalDeviceId, device: finalDevice, start_unit: rest.start_u, size_u: rest.size_u || 1 })
          return { ...r, device_locations: newLocs }
        }))
        return { message: 'VIRTUAL_SUCCESS' }
      }
      const res = await apiFetch(`/api/v1/racks/${rackId}/mount`, { method: 'POST', body: JSON.stringify({ ...rest, device_id: finalDeviceId, relocate: true }) })
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['racks-all'] }); queryClient.invalidateQueries({ queryKey: ['devices'] }); setIsProvisioning(null); toast.success('Mounted') }
  })

  const savePlanMutation = useMutation({
    mutationFn: async (plan: any) => apiFetch('/api/v1/racks/plans', { method: 'POST', body: JSON.stringify(plan) }),
    onSuccess: () => { refetchPlans(); setIsPlanMode(false); setIsPlanInitialized(false); toast.success("Plan saved") }
  })

  const displayedRacks = useMemo(() => {
    let filtered = isPlanInitialized ? virtualRacks : (activeTab === 'active' ? (activeSite ? (allRacks || []).filter((r:any) => !r.is_deleted && r.site_id === activeSite) : (allRacks || []).filter((r:any) => !r.is_deleted)) : (allRacks || []).filter((r:any) => r.is_deleted))
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((r: any) => r.name.toLowerCase().includes(term) || r.device_locations?.some((l: any) => l.device?.name?.toLowerCase().includes(term)))
    }
    return filtered
  }, [allRacks, virtualRacks, isPlanInitialized, activeSite, searchTerm, activeTab])

  const availableDevices = useMemo(() => devices?.filter((d: any) => !d.is_deleted && d.status !== 'Decommissioned'), [devices])

  return (
    <div className="h-full flex flex-col gap-4 min-h-0 overflow-hidden">
      {isPlanMode && (
        <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="fixed top-0 inset-x-0 z-[100] bg-violet-600/95 backdrop-blur-xl border-b border-violet-400/30 py-4 flex items-center justify-center gap-12 shadow-2xl">
          <div className="flex items-center gap-4"><div className="p-2 bg-white/10 rounded-xl"><Eye size={20} className="text-white" /></div><div><h3 className="text-sm font-black uppercase tracking-tighter text-white leading-none">Ghost Planner Sandbox</h3><p className="text-[9px] font-bold text-violet-200 uppercase tracking-widest mt-1">{isPlanInitialized ? 'Virtual Environment Active' : 'Select Baseline Racks'}</p></div></div>
          {!isPlanInitialized ? (
            <div className="flex items-center gap-4"><button disabled={selectedRacks.length === 0} onClick={() => { setVirtualRacks(displayedRacks.filter(r => selectedRacks.includes(r.id)).map(r => JSON.parse(JSON.stringify(r)))); setSandboxRackIds(selectedRacks); setIsPlanInitialized(true); setPlanDraftName(`New Strategic Plan ${new Date().toLocaleDateString()}`) }} className="px-6 py-2 bg-white text-violet-600 disabled:opacity-50 rounded-lg text-[10px] font-black uppercase">Initialize Plan Matrix</button></div>
          ) : (
            <div className="flex items-center gap-6">
              <input value={planDraftName} onChange={e => setPlanDraftName(e.target.value)} className="bg-violet-700/50 border border-violet-400/30 rounded px-4 py-2 text-[10px] font-black uppercase text-white outline-none w-64" placeholder="PLAN NAME" />
              <button onClick={() => savePlanMutation.mutate({ name: planDraftName, racks: sandboxRackIds, racksData: virtualRacks })} className="px-6 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase">Save Plan</button>
            </div>
          )}
          <button onClick={() => { setIsPlanMode(false); setIsPlanInitialized(false); setSelectedRacks([]) }} className="px-6 py-2 bg-rose-500/20 text-white rounded-lg text-[10px] font-black uppercase">Exit</button>
        </motion.div>
      )}

      {diffBaseVersion && (
        <div className="fixed top-0 inset-x-0 z-[100] bg-blue-600/95 backdrop-blur-xl border-b border-blue-400/30 py-4 flex items-center justify-center gap-12 shadow-2xl">
           <div className="flex items-center gap-4"><div className="p-2 bg-white/10 rounded-xl"><History size={20} className="text-white" /></div><div><h3 className="text-sm font-black uppercase tracking-tighter text-white leading-none">Time Machine</h3><p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mt-1">Comparing LIVE STATE against {snapshots.find(s => s.id === diffBaseVersion)?.date}</p></div></div>
           <button onClick={() => setDiffBaseVersion(null)} className="px-8 py-2 bg-white text-blue-600 rounded-lg text-[10px] font-black uppercase">Exit</button>
        </div>
      )}

      <div className={`flex items-start justify-between gap-4 shrink-0 transition-opacity flex-nowrap ${(isPlanInitialized || diffBaseVersion) ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
        <div className="flex items-center gap-6 flex-nowrap shrink-0">
          <div className="shrink-0">
            <h1 className="text-2xl font-black uppercase tracking-tight leading-none">Racks</h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-bold mt-1">Physical Capacity Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-nowrap overflow-x-auto custom-scrollbar-hide no-scrollbar">
          <button onClick={() => setViewMode(viewMode === 'elevation' ? 'spatial' : 'elevation')} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors border border-white/10">{viewMode === 'elevation' ? <MapPin size={16} /> : <Layers size={16} />}</button>
          <button onClick={() => setShowPlanList(true)} className="px-4 py-2 bg-violet-600/10 text-violet-400 border border-violet-500/20 rounded-lg text-[9px] font-black uppercase hover:bg-violet-600 hover:text-white transition-all">Planning</button>
          <button onClick={() => setIsPlanMode(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase transition-all shadow-lg shadow-blue-500/20">New Plan</button>
          <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="bg-white/5 border border-white/[0.06] rounded-lg pl-9 pr-4 py-2 text-[10px] font-bold outline-none w-48" /></div>
        </div>
      </div>

      <div id="rack-temp-grid" className="h-full flex-1 flex gap-8 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar px-1 min-h-0 relative">
        {viewMode === 'spatial' ? (
          <SpatialMap racks={displayedRacks} onRackClick={(r) => { setActiveSite(r.site_id); setViewMode('elevation') }} />
        ) : (
          <div className="flex gap-8 items-start h-full">
            {displayedRacks.map(r => (
              <RackElevation key={r.id} rack={r} searchTerm={searchTerm} isSelected={selectedRacks.includes(r.id)} onToggleSelect={id => setSelectedRacks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} onDelete={() => {}} onEdit={() => {}} onShowInfo={rk => setManagingDevice({ rack: rk })} onMount={(rid, u) => setIsProvisioning({ rackId: rid, start_u: u, size_u: 1, orientation: 'Front', depth: 'Full' })} onManageDevice={(device, l, e) => { setOptionsMenu({ x: e.clientX, y: e.clientY, device, loc: l, rack: r }); setImpactAssetId(device.id); setImpactCoords({ x: e.clientX, y: e.clientY }) }} isDeleted={activeTab === 'deleted'} rackWidth={rackWidth} showCheckbox={!isPlanInitialized} />
            ))}
          </div>
        )}
      </div>

      {impactAssetId && <AssetImpactWindow deviceId={impactAssetId} devices={devices || []} connections={connections || []} onClose={() => setImpactAssetId(null)} coords={impactCoords} />}

      {showPlanList && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="glass-panel w-[500px] p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
            <h2 className="text-xl font-black uppercase text-white">Archives</h2>
            <div className="space-y-2">
              {plans.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-violet-500/30 transition-all group">
                   <div><p className="text-[12px] font-black text-white uppercase">{p.name}</p><p className="text-[8px] text-slate-500 uppercase">{p.date}</p></div>
                   <button onClick={() => { setIsPlanMode(true); setIsPlanInitialized(true); setActivePlanId(p.id); setVirtualRacks(p.racksData); setSandboxRackIds(p.racks); setShowPlanList(false); setPlanDraftName(p.name) }} className="px-4 py-1.5 bg-violet-600/10 text-violet-400 border border-violet-500/20 rounded-lg text-[9px] font-black uppercase hover:bg-violet-600 hover:text-white transition-all">Load</button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowPlanList(false)} className="w-full py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all border border-white/5">Close</button>
          </div>
        </div>
      )}

      {isProvisioning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="glass-panel w-[450px] p-8 rounded-xl border border-blue-500/20 shadow-2xl space-y-5">
            <h2 className="text-sm font-black uppercase text-white">{provisionMode === 'reserve' ? 'Reserve Slot' : 'Mount Asset'}</h2>
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                <button onClick={() => setProvisionMode('asset')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${provisionMode === 'asset' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Registry</button>
                <button onClick={() => setProvisionMode('reserve')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${provisionMode === 'reserve' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Reserve</button>
            </div>
            {provisionMode === 'asset' ? (
              <div className="space-y-3">
                 <input autoFocus placeholder="Search..." className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white outline-none" onChange={e => setMountSearch(e.target.value)} />
                 <div className="max-h-[200px] overflow-y-auto custom-scrollbar border border-white/5 rounded-lg p-1.5 space-y-1">
                   {availableDevices?.filter(d => d.name.toLowerCase().includes(mountSearch.toLowerCase())).map(d => (
                     <button key={d.id} onClick={() => setIsProvisioning({ ...isProvisioning, device_id: d.id, size_u: d.size_u || 1 })} className={`w-full text-left px-3 py-2 rounded-lg transition-all ${isProvisioning.device_id === d.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}>
                        <div className="text-[10px] font-black uppercase truncate">{d.name}</div>
                        <div className="text-[8px] font-bold uppercase opacity-60">{d.type}</div>
                     </button>
                   ))}
                 </div>
              </div>
            ) : (
              <input value={reserveInfo.temporary_name} onChange={e => setReserveInfo({ ...reserveInfo, temporary_name: e.target.value.toUpperCase() })} placeholder="RESERVATION NAME" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white outline-none" />
            )}
            <div className="flex gap-3"><button onClick={() => setIsProvisioning(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500">Cancel</button><button onClick={() => mountMutation.mutate(isProvisioning)} className="flex-1 py-3 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-blue-500/20">Confirm</button></div>
          </div>
        </div>
      )}

      {optionsMenu && (
        <DeviceOptionsMenu
          x={optionsMenu.x} y={optionsMenu.y} deviceName={optionsMenu.device?.name}
          onClose={() => setOptionsMenu(null)}
          onShowConnections={() => { const conns = connections || []; const targetIds = conns.filter((c:any) => c.source_device_id === optionsMenu.device.id || c.target_device_id === optionsMenu.device.id).map((c:any) => c.source_device_id === optionsMenu.device.id ? c.target_device_id : c.source_device_id); setFocusedConnection({ sourceId: optionsMenu.device.id, targetIds }); setOptionsMenu(null) }}
          onEdit={() => { setManagingDevice({ device: optionsMenu.device, loc: optionsMenu.loc, rack: optionsMenu.rack }); setOptionsMenu(null) }}
          onDelete={() => { setConfirmModal({ isOpen: true, title: 'Unmount', message: 'Confirm unmount?', onConfirm: async () => { await apiFetch(`/api/v1/racks/mount/${optionsMenu.device.id}`, { method: 'DELETE' }); queryClient.invalidateQueries({ queryKey: ['racks-all'] }); toast.success('Unmounted') } }); setOptionsMenu(null) }}
        />
      )}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur"><div className="bg-slate-900 border border-white/10 rounded-lg p-6 w-96 space-y-4 shadow-2xl"><h3 className="text-sm font-black uppercase text-white">{confirmModal.title}</h3><p className="text-xs text-slate-400">{confirmModal.message}</p><div className="flex gap-2"><button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 px-4 py-2 bg-white/5 rounded-lg text-xs font-semibold">Cancel</button><button onClick={() => confirmModal.onConfirm()} className="flex-1 px-4 py-2 bg-rose-600 rounded-lg text-xs font-black uppercase">Confirm</button></div></div></div>
      )}
    </div>
  )
}
