import React, { useState, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, Download, Plus, MoreHorizontal } from 'lucide-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export default function AssetGrid() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const res = await fetch('/api/v1/devices/')
      return res.json()
    }
  })

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 80, sortable: true },
    { field: 'name', headerName: 'Hostname', flex: 1, sortable: true, filter: true },
    { field: 'status', headerName: 'Status', width: 120, cellRenderer: (params: any) => (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${params.value === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <span className="capitalize">{params.value}</span>
      </div>
    )},
    { field: 'model', headerName: 'Model', flex: 1 },
    { field: 'manufacturer', headerName: 'Manufacturer', flex: 1 },
    { field: 'serial_number', headerName: 'Serial Number', flex: 1 },
    { field: 'asset_tag', headerName: 'Asset Tag', flex: 1 },
    {
      headerName: 'Actions',
      width: 100,
      cellRenderer: () => (
        <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <MoreHorizontal size={16} className="text-slate-400" />
        </button>
      )
    }
  ], [])

  const defaultColDef = useMemo(() => ({
    resizable: true,
  }), [])

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search assets..." 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-[#034EA2]/20"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-xs font-medium hover:bg-white/5 transition-colors">
            <Filter size={14} />
            <span>Advanced Filters</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button className="p-2 bg-slate-900/50 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
            <Download size={16} />
          </button>
          <button className="flex items-center space-x-2 px-6 py-2 bg-[#034EA2] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#034EA2]/20 hover:scale-[1.02] active:scale-95 transition-all">
            <Plus size={16} />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark" style={{ height: 'calc(100vh - 250px)' }}>
        <AgGridReact
          rowData={devices}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowSelection="multiple"
          quickFilterText={searchTerm}
          headerHeight={48}
          rowHeight={52}
        />
      </div>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.5);
          --ag-odd-row-background-color: rgba(255, 255, 255, 0.02);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
        }
        .ag-root-wrapper {
          border: none !important;
        }
      `}</style>
    </div>
  )
}
