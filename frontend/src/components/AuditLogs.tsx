import React, { useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, RefreshCcw, Search, Database } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export default function AuditLogs() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [searchTerm, setSearchTerm] = useState('')

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

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true, cellClass: 'text-center font-mono', headerClass: 'text-center' },
    { field: 'timestamp', headerName: 'Timestamp', width: 180, sortable: true, filter: 'agDateColumnFilter', cellClass: 'text-center', headerClass: 'text-center' },
    { field: 'user_id', headerName: 'Admin', width: 100, filter: true, cellClass: 'text-center', headerClass: 'text-center' },
    { 
      field: 'action', 
      headerName: 'Action', 
      width: 100,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (params: any) => {
        const colors: Record<string, string> = { CREATE: 'text-emerald-400', UPDATE: 'text-blue-400', DELETE: 'text-rose-400', MOUNT: 'text-indigo-400', LINK: 'text-amber-400' }
        return <span className={`font-black tracking-widest text-[10px] uppercase ${colors[params.value] || 'text-slate-400'}`}>{params.value}</span>
      }
    },
    { field: 'target_table', headerName: 'Registry Table', width: 140, filter: true, cellClass: 'text-center font-mono text-slate-400', headerClass: 'text-center' },
    { field: 'target_id', headerName: 'Target ID', width: 100, filter: true, cellClass: 'text-center font-mono', headerClass: 'text-center' },
    { field: 'description', headerName: 'Audit Intent Note', flex: 1, filter: true, cellClass: 'text-center', headerClass: 'text-center' }
  ], [])

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">Audit Ledger</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-relaxed">Immutable registry of all administrative transactions</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="SEARCH TRANSACTIONS..." 
                className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" 
             />
          </div>

          <div className="flex items-center space-x-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <Calendar size={14} className="text-slate-600" />
            <div className="flex items-center space-x-2">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-300 [color-scheme:dark]" />
              <span className="text-slate-700 font-black">→</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-300 [color-scheme:dark]" />
            </div>
          </div>

          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5">
            <button 
              onClick={() => { setDateRange({ start: '', end: '' }); setSearchTerm(''); }}
              className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-white rounded-lg transition-all"
              title="Reset Filters"
            >
              <RefreshCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Reading Ledger...</p>
          </div>
        )}
        <AgGridReact
          rowData={logs || []}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, filter: true, sortable: true, flex: 1, minWidth: 100 }}
          animateRows={true}
          headerHeight={28}
          rowHeight={28}
          quickFilterText={searchTerm}
          enableCellTextSelection={true}
        />
      </div>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.9);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f8fafc;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 10px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; padding-left: 8px !important; }
      `}</style>
    </div>
  )
}
