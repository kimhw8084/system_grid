import React, { useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, RefreshCcw, Zap, Layers, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export default function AuditLogs() {
  const gridRef = React.useRef<any>(null)
  const [fontSize, setFontSize] = useState(10)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)

  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateRange.start) params.append('start_date', dateRange.start)
      if (dateRange.end) params.append('end_date', dateRange.end)
      const res = await apiFetch(`/api/v1/audit/?${params.toString()}`)
      return res.json()
    }
  })

  React.useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 100)
    }
  }, [fontSize, rowDensity, logs])

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 60, sortable: true, filter: true, cellStyle: { fontSize: `${fontSize}px` }, cellClass: 'text-center font-mono', headerClass: 'text-center' },
    { field: 'timestamp', headerName: 'Time', width: 160, sortable: true, filter: 'agDateColumnFilter', cellStyle: { fontSize: `${fontSize}px` }, cellClass: 'text-center', headerClass: 'text-center' },
    { field: 'user_id', headerName: 'Admin', width: 90, filter: true, cellStyle: { fontSize: `${fontSize}px` }, cellClass: 'text-center font-bold', headerClass: 'text-center' },
    { 
      field: 'action', 
      headerName: 'Ops', 
      width: 90,
      filter: true,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (params: any) => {
        const colors: Record<string, string> = { CREATE: 'text-emerald-400', UPDATE: 'text-blue-400', DELETE: 'text-rose-400', MOUNT: 'text-indigo-400', LINK: 'text-amber-400' }
        return <span className={`font-black tracking-widest ${colors[params.value] || 'text-slate-400'}`} style={{ fontSize: `${fontSize-2}px` }}>{params.value}</span>
      }
    },
    { field: 'target_table', headerName: 'Registry', width: 120, filter: true, cellStyle: { fontSize: `${fontSize}px` }, cellClass: 'text-center font-mono text-slate-400', headerClass: 'text-center' },
    { field: 'target_id', headerName: 'Vector ID', width: 90, filter: true, cellStyle: { fontSize: `${fontSize}px` }, cellClass: 'text-center font-mono', headerClass: 'text-center' },
    { field: 'description', headerName: 'Payload', flex: 1, filter: true, cellStyle: { fontSize: `${fontSize}px` }, cellClass: 'text-center', headerClass: 'text-center' }
  ], [fontSize])

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase italic">Logs</h1>
          <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest leading-relaxed">Immutable registry of all administrative transactions</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-slate-900/50 p-2 rounded-xl border border-white/5">
           <Calendar size={14} className="text-slate-500 ml-2" />
           <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent text-[10px] font-bold uppercase outline-none text-slate-300" />
           <span className="text-slate-600 font-bold">→</span>
           <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent text-[10px] font-bold uppercase outline-none text-slate-300" />
           
           <div className="w-px h-4 bg-white/5 mx-2" />
           
           <button 
              onClick={() => setShowStyleLab(!showStyleLab)} 
              className={`p-1.5 rounded-lg transition-all ${showStyleLab ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10 text-slate-500 hover:text-blue-400'}`}
              title="Style Laboratory"
           >
              <Zap size={16} />
           </button>
        </div>
      </div>

      <AnimatePresence>
        {showStyleLab && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border-blue-500/20">
               <div className="flex items-center space-x-8">
                  <div className="flex items-center space-x-3">
                     <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                        <Zap size={16} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-500">Log Density</p>
                        <div className="flex items-center space-x-2 mt-1">
                           <input 
                              type="range" min="8" max="14" step="1" 
                              value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))}
                              className="w-24 accent-blue-500"
                           />
                           <span className="text-[10px] font-mono text-blue-400 w-8">{fontSize}px</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center space-x-3">
                     <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <Layers size={16} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-500">Row Spacing</p>
                        <div className="flex items-center space-x-2 mt-1">
                           <input 
                              type="range" min="0" max="20" step="2" 
                              value={rowDensity} onChange={(e) => setRowDensity(parseInt(e.target.value))}
                              className="w-24 accent-indigo-500"
                           />
                           <span className="text-[10px] font-mono text-indigo-400 w-8">+{rowDensity}px</span>
                        </div>
                     </div>
                  </div>
               </div>

               <button 
                  onClick={() => setShowStyleLab(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-600 transition-all"
               >
                  <X size={16} />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Reading Ledger...</p>
          </div>
        )}
        <AgGridReact
          ref={gridRef}
          rowData={logs || []}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, filter: true }}
          animateRows={true}
          suppressCellFocus={true}
          headerHeight={32}
          rowHeight={32 + rowDensity}
        />
      </div>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: #1a1b26;
          --ag-header-background-color: #24283b;
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #3b82f6;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: ${fontSize}px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { 
            font-weight: 900 !important; 
            text-transform: uppercase !important; 
            letter-spacing: 0.1em !important; 
            font-size: ${fontSize}px !important; 
            justify-content: center !important; 
        }
        .ag-cell { 
            display: flex; 
            align-items: center; 
            justify-content: center !important; 
        }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
      `}</style>
    </div>
  )
}
