import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Network, Search, RefreshCcw } from "lucide-react"
import { AgGridReact } from "ag-grid-react"
import { apiFetch } from "../api/apiClient"
import { motion } from "framer-motion"
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export default function IPAM() {
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()
  
  const { data: subnets, isLoading } = useQuery({ 
    queryKey: ["subnets"], 
    queryFn: async () => (await (await apiFetch("/api/v1/ipam/subnets")).json()) 
  })

  const columnDefs = [
    { field: "network_cidr", headerName: "Network CIDR", flex: 1.2, cellClass: 'text-center font-mono text-blue-400', headerClass: 'text-center' },
    { field: "vlan_id", headerName: "VLAN ID", width: 100, cellClass: 'text-center font-bold text-slate-300', headerClass: 'text-center' },
    { field: "name", headerName: "Subnet Name", flex: 1.5, cellClass: 'text-center font-black uppercase tracking-tight', headerClass: 'text-center' },
    { field: "gateway_ip", headerName: "Gateway", width: 130, cellClass: 'text-center font-mono text-slate-500', headerClass: 'text-center' },
    { field: "status", headerName: "Status", width: 100, cellClass: 'text-center', headerClass: 'text-center', 
      cellRenderer: (p: any) => <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">Active</span>
    }
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">IPAM Engine</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">L3 Address Space & Subnet Allocation</p>
           </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="SEARCH ADDRESS SPACE..." 
                className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" 
             />
          </div>
          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5">
             <button onClick={() => queryClient.invalidateQueries({ queryKey: ['subnets'] })} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Refresh">
                <RefreshCcw size={16} />
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Scanning Network Fabric...</p>
          </div>
        )}
        <AgGridReact 
          rowData={Array.isArray(subnets) ? subnets : []} 
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, filter: true, sortable: true, flex: 1, minWidth: 100 }}
          headerHeight={28}
          rowHeight={28}
          quickFilterText={searchTerm}
          enableCellTextSelection={true}
          animateRows={true}
        />
      </div>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.9);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 10px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; padding-left: 8px !important; }
      `}</style>
    </motion.div>
  )
}
