import React, { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery } from '@tanstack/react-query'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export default function AuditLogs() {
  const { data: logs } = useQuery({
    queryKey: ['audit'],
    queryFn: async () => (await fetch('/api/v1/audit/')).json()
  })

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: 'Log ID', width: 90, sortable: true },
    { field: 'timestamp', headerName: 'Timestamp', width: 180, sortable: true, filter: true },
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security & Audit Logs</h1>
        <p className="text-xs text-slate-500 mt-1">Immutable record of all administrative actions within SYSGRID.</p>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark">
        <AgGridReact
          rowData={logs}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true }}
          animateRows={true}
          headerHeight={40}
          rowHeight={48}
        />
      </div>
    </div>
  )
}
