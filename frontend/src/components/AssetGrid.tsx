import React, { useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Filter, Download, Plus, Trash2, ShieldAlert } from 'lucide-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export default function AssetGrid() {
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const res = await fetch('/api/v1/devices/')
      return res.json()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // In a real MVP, we'd add a DELETE endpoint, but for now we'll mock the success
      console.log('Deleting device:', id)
      return { status: 'success' }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    }
  })

  const columnDefs = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Hostname', flex: 1, sortable: true },
    { field: 'status', headerName: 'Status', width: 110, cellRenderer: (params: any) => (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${params.value === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <span className="capitalize text-[11px]">{params.value}</span>
      </div>
    )},
    { field: 'model', headerName: 'Model', flex: 1 },
    { field: 'asset_tag', headerName: 'Asset Tag', flex: 1 },
    {
      headerName: 'Actions',
      width: 80,
      cellRenderer: (params: any) => (
        <button 
          onClick={() => deleteMutation.mutate(params.data.id)}
          className="p-1.5 hover:bg-rose-500/10 rounded-lg group transition-colors"
        >
          <Trash2 size={14} className="text-slate-500 group-hover:text-rose-400" />
        </button>
      )
    }
  ]

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900/50 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs w-64 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-[#034EA2] text-white rounded-xl text-xs font-bold hover:scale-105 transition-all">
          <Plus size={14} />
          <span>Add Asset</span>
        </button>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark">
        <AgGridReact
          rowData={devices}
          columnDefs={columnDefs}
          animateRows={true}
          quickFilterText={searchTerm}
          headerHeight={40}
          rowHeight={48}
        />
      </div>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.4);
          --ag-border-color: rgba(255, 255, 255, 0.03);
          --ag-foreground-color: #94a3b8;
          --ag-header-foreground-color: #64748b;
          --ag-font-size: 11px;
        }
      `}</style>
    </div>
  )
}
