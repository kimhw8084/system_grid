import React, { useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export default function AssetGrid() {
  const queryClient = useQueryClient()

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await fetch('/api/v1/devices/')).json()
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] })
  })

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 80, checkboxSelection: true, headerCheckboxSelection: true },
    { field: 'name', headerName: 'Hostname', flex: 1, filter: 'agTextColumnFilter', sortable: true },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130, 
      filter: 'agSetColumnFilter',
      cellRenderer: (params: any) => {
        const colors: Record<string, string> = { active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20', maintenance: 'bg-amber-500/20 text-amber-400 border-amber-500/20', eol: 'bg-rose-500/20 text-rose-400 border-rose-500/20' }
        const c = colors[params.value] || 'bg-slate-500/20 text-slate-400'
        return <div className={`flex items-center justify-center mt-2 px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-widest ${c}`}>{params.value}</div>
      }
    },
    { field: 'model', headerName: 'Model', flex: 1, filter: 'agTextColumnFilter' },
    { field: 'manufacturer', headerName: 'Manufacturer', flex: 1, filter: 'agSetColumnFilter' },
    { field: 'serial_number', headerName: 'Serial Number', flex: 1, filter: 'agTextColumnFilter' },
    { field: 'power_max_w', headerName: 'Max Power (W)', width: 140, filter: 'agNumberColumnFilter' },
    { field: 'power_idle_w', headerName: 'Idle Power (W)', width: 140, filter: 'agNumberColumnFilter' },
    {
      headerName: 'Expansions & Actions',
      width: 250,
      cellRenderer: (params: any) => (
        <div className="flex items-center space-x-2 mt-2">
          <button className="px-2 py-1 bg-slate-800 hover:bg-blue-500/20 text-blue-400 rounded text-[9px] uppercase font-bold transition-colors">HW</button>
          <button className="px-2 py-1 bg-slate-800 hover:bg-emerald-500/20 text-emerald-400 rounded text-[9px] uppercase font-bold transition-colors">SW</button>
          <button className="px-2 py-1 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded text-[9px] uppercase font-bold transition-colors">Creds</button>
          <div className="w-px h-4 bg-white/10 mx-2" />
          <button onClick={() => deleteMutation.mutate(params.data.id)} className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 rounded text-[9px] uppercase font-bold transition-colors">Delete</button>
        </div>
      )
    }
  ], [deleteMutation])

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Asset Intelligence</h1>
        <button className="px-4 py-2 bg-[#034EA2] text-white rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition-all">
          + Add Asset
        </button>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark">
        <AgGridReact
          rowData={devices}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: true }}
          rowSelection="multiple"
          animateRows={true}
          headerHeight={48}
          rowHeight={52}
        />
      </div>
      
      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.4);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #e2e8f0;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 11px;
        }
      `}</style>
    </div>
  )
}
