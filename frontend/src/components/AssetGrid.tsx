import React, { useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Cpu, Package, Key, X, Check, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

const ExpansionModal = ({ title, icon: Icon, color, data, onClose, onAdd, onDelete }: any) => {
  const [newValue, setNewValue] = useState('')
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[500px] p-8 rounded-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${color}-500/10`}>
              <Icon size={20} className={`text-${color}-400`} />
            </div>
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {data?.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
              <span className="text-xs text-slate-300 font-mono">{item.model || item.name || item.secret_type}</span>
              <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-all"><Trash2 size={14}/></button>
            </div>
          ))}
          {(!data || data.length === 0) && <p className="text-center py-8 text-xs text-slate-600 uppercase tracking-widest font-bold">No Records Found</p>}
        </div>

        <div className="flex space-x-2">
          <input value={newValue} onChange={(e) => setNewValue(e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500/50" placeholder="Enter details..." />
          <button onClick={() => { onAdd(newValue); setNewValue('') }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest"><Plus size={16}/></button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AssetGrid() {
  const queryClient = useQueryClient()
  const [activeExpansion, setActiveExpansion] = useState<any>(null)
  const [showAddAsset, setShowAddAsset] = useState(false)

  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await fetch('/api/v1/devices/')).json() })

  const deleteDevice = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] })
  })

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true, filter: 'agNumberColumnFilter' },
    { field: 'system', headerName: 'System', width: 120, filter: true },
    { field: 'name', headerName: 'Hostname', flex: 1, filter: true, checkboxSelection: true, headerCheckboxSelection: true },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120, 
      cellRenderer: (params: any) => {
        const colors: any = { active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20', maintenance: 'bg-amber-500/20 text-amber-400 border-amber-500/20' }
        return <div className={`flex items-center justify-center mt-2 px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${colors[params.value] || 'bg-slate-500/20 text-slate-400 border-slate-500/20'}`}>{params.value}</div>
      }
    },
    { field: 'model', headerName: 'Model', flex: 1, filter: true },
    { field: 'manufacturer', headerName: 'Manufacturer', flex: 1, filter: true },
    { field: 'os', headerName: 'OS', width: 130, filter: true },
    { field: 'type', headerName: 'Type', width: 100, filter: true },
    {
      headerName: 'Expand & Audit',
      width: 240,
      cellRenderer: (params: any) => (
        <div className="flex items-center space-x-2 mt-2">
          <button onClick={() => setActiveExpansion({ type: 'HW', deviceId: params.data.id })} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"><Cpu size={14}/></button>
          <button onClick={() => setActiveExpansion({ type: 'SW', deviceId: params.data.id })} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"><Package size={14}/></button>
          <button onClick={() => setActiveExpansion({ type: 'Creds', deviceId: params.data.id })} className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors"><Key size={14}/></button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => deleteDevice.mutate(params.data.id)} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], [deleteDevice])

  return (
    <div className="h-full flex flex-col space-y-4 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Asset Intelligence</h1>
        <button onClick={() => setShowAddAsset(true)} className="px-6 py-2.5 bg-[#034EA2] text-white rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-lg shadow-[#034EA2]/30 hover:scale-105 transition-all">
          + Add New Asset
        </button>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark">
        <AgGridReact
          rowData={devices}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: true, filter: true }}
          rowSelection="multiple"
          animateRows={true}
          headerHeight={48}
          rowHeight={52}
        />
      </div>

      <AnimatePresence>
        {activeExpansion && (
          <ExpansionModal 
            title={activeExpansion.type === 'HW' ? 'Hardware Inventory' : activeExpansion.type === 'SW' ? 'Software Stack' : 'Credential Vault'}
            icon={activeExpansion.type === 'HW' ? Cpu : activeExpansion.type === 'SW' ? Package : Key}
            color={activeExpansion.type === 'HW' ? 'blue' : activeExpansion.type === 'SW' ? 'emerald' : 'amber'}
            data={activeExpansion.type === 'HW' ? [] : []} // In real MVP, fetch these
            onClose={() => setActiveExpansion(null)}
            onAdd={() => {}}
            onDelete={() => {}}
          />
        )}
      </AnimatePresence>
      
      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.6);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 11px;
        }
        .ag-root-wrapper { border: none !important; }
      `}</style>
    </div>
  )
}
