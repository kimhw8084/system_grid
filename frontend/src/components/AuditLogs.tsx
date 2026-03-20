import React, { useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export default function AuditLogs() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const { data: logs } = useQuery({
    queryKey: ['audit', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateRange.start) params.append('start_date', dateRange.start)
      if (dateRange.end) params.append('end_date', dateRange.end)
      const res = await fetch(`/api/v1/audit/?${params.toString()}`)
      return res.json()
    }
  })

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: 'Log ID', width: 90, sortable: true },
    { field: 'timestamp', headerName: 'Timestamp', width: 180, sortable: true, filter: 'agDateColumnFilter' },
    { field: 'user_id', headerName: 'Admin', width: 120, filter: true },
    { 
      field: 'action', 
      headerName: 'Action', 
      width: 120,
      cellRenderer: (params: any) => {
        const colors: Record<string, string> = { CREATE: 'text-emerald-400', UPDATE: 'text-blue-400', DELETE: 'text-rose-400' }
        return <span className={`font-black tracking-widest text-[10px] uppercase ${colors[params.value] || 'text-slate-400'}`}>{params.value}</span>
      }
    },
    { field: 'table_name', headerName: 'Target Table', width: 140, filter: true, cellClass: 'font-mono text-slate-400' },
    { field: 'intent_note', headerName: 'Audit Intent Note', flex: 1, filter: true }
  ], [])

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">Security & Forensic Audit</h1>
          <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest leading-relaxed">Immutable record of all SYSGRID administrative transactions</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-slate-900/50 p-2 rounded-xl border border-white/5">
           <Calendar size={14} className="text-slate-500 ml-2" />
           <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent text-[10px] font-bold uppercase outline-none text-slate-300" />
           <span className="text-slate-600 font-bold">→</span>
           <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent text-[10px] font-bold uppercase outline-none text-slate-300" />
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark">
        <AgGridReact
          rowData={logs}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, filter: true }}
          animateRows={true}
          headerHeight={40}
          rowHeight={48}
        />
      </div>
    </div>
  )
}
