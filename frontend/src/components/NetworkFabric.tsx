import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Network, Plus, Link as LinkIcon, RefreshCcw, Trash2, Edit2, X, Settings, Search, Info, Zap, Layers, Activity, Sliders, Clipboard, FileText, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from 'ag-grid-react'
import toast from 'react-hot-toast'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { apiFetch } from "../api/apiClient"
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { StyledSelect } from "./shared/StyledSelect"
import { ConnectionForensicsModal } from "./shared/ConnectionForensicsModal"

export default function NetworkFabric() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [showConnectModal, setShowConnectModal] = useState(false)
  const [viewingLink, setViewingLink] = useState<any>(null)
  const [editingLink, setEditingLink] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })
  const [connData, setConnData] = useState<any>({
    device_a_id: '', source_port: '', device_b_id: '', target_port: '',
    link_type: 'Data', purpose: '', speed_gbps: 10, unit: 'Gbps', direction: 'Bidirectional'
  })

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) })
  const { data: connections, isLoading } = useQuery({ queryKey: ['connections'], queryFn: async () => (await (await apiFetch('/api/v1/networks/connections')).json()) })
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) })

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 100)
    }
  }, [fontSize, rowDensity, connections])

  const handleExportCSV = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `SysGrid_NetworkFabric_${new Date().toISOString().split('T')[0]}.csv`,
        allColumns: false,
        onlySelected: false
      })
    }
  }

  const handleCopyToClipboard = () => {
    if (gridRef.current?.api) {
      const csvData = gridRef.current.api.getDataAsCsv({
        allColumns: false,
        onlySelected: true,
        suppressQuotes: true
      })
      if (csvData) {
        navigator.clipboard.writeText(csvData)
          .then(() => toast.success("Table data copied to clipboard"))
          .catch(() => toast.error("Failed to copy data"))
      }
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingLink ? `/api/v1/networks/connections/${editingLink.id}` : '/api/v1/networks/connections'
      const method = editingLink ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success(editingLink ? 'Link Matrix Updated' : 'New Link Established')
      setShowConnectModal(false); setEditingLink(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/networks/connections/${id}`, { method: 'DELETE' })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success('Link Severed')
      setConfirmModal({ ...confirmModal, isOpen: false })
    },
    onError: (e: any) => toast.error(e.message)
  })

  const columnDefs = useMemo(() => [
    { 
      headerName: "", 
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: 'left', 
      cellClass: 'flex items-center justify-center border-r border-white/5 pl-2', 
      headerClass: 'flex items-center justify-center border-r border-white/5 pl-2', 
      suppressSizeToFit: true,
      resizable: false,
      sortable: false,
      filter: false,
      suppressHide: true
    },
    { 
      field: "id", 
      headerName: "ID", 
      width: 70,
      minWidth: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
    },
    { 
      headerName: "Src Node", 
      field: "server_a", 
      flex: 1,
      filter: true,
      cellClass: 'text-left font-bold uppercase tracking-tight',
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("server_a")
    },
    { 
      headerName: "Local Port", 
      field: "source_port", 
      width: 110,
      filter: true,
      cellClass: 'text-center font-bold text-slate-300 uppercase',
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("source_port")
    },
    { 
      headerName: "Src IP", 
      field: "source_ip", 
      width: 130,
      filter: true,
      cellClass: 'text-center font-mono font-bold',
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("source_ip")
    },
    { 
      headerName: "Peer Node", 
      field: "server_b", 
      flex: 1,
      filter: true,
      cellClass: 'text-left font-bold uppercase tracking-tight',
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("server_b")
    },
    { 
      headerName: "Peer Port", 
      field: "target_port", 
      width: 110,
      filter: true,
      cellClass: 'text-center font-bold text-slate-300 uppercase',
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("target_port")
    },
    { 
      headerName: "Peer IP", 
      field: "target_ip", 
      width: 130,
      filter: true,
      cellClass: 'text-center font-mono font-bold',
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("target_ip")
    },
    { 
      field: "link_type", 
      headerName: "Type", 
      width: 120, 
      filter: true,
      cellClass: 'text-center font-bold text-slate-500 uppercase tracking-widest', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("link_type")
    },
    { 
      field: "speed", 
      headerName: "Fabric Metric", 
      width: 110, 
      filter: true,
      cellClass: "text-center font-bold uppercase", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("speed")
    },
    {
      field: "actions",
      headerName: "Action",
      width: 120,
      minWidth: 120,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      resizable: false,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setViewingLink(p.data)} title="Forensics Detail" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><Info size={14}/></button>
               <button onClick={() => { 
                   setEditingLink(p.data); 
                   setConnData({
                     ...p.data,
                     device_a_id: String(p.data.source_device_id),
                     device_b_id: String(p.data.target_device_id),
                     port_a: p.data.source_port,
                     port_b: p.data.target_port
                   }); 
                   setShowConnectModal(true) 
                 }} title="Edit Interconnect" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => setConfirmModal({ isOpen: true, title: 'Sever Physical Link', message: 'Sever this physical connection? This will impact data flows.', onConfirm: () => deleteMutation.mutate(p.data.id) })} title="Sever Link" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      ),
      suppressHide: true
    }
  ], [deleteMutation, fontSize, hiddenColumns]) as any

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  const resetForm = () => {
    setConnData({
      device_a_id: '', source_port: '', device_b_id: '', target_port: '',
      link_type: 'Data', purpose: '', speed_gbps: 10, unit: 'Gbps', direction: 'Bidirectional'
    })
    setEditingLink(null)
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-bold uppercase tracking-tight  flex items-center">
                <span>Network Fabric</span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Physical Interconnect & Logical Topology</p>
           </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="SCAN FABRIC..."
              className="bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-[10px] font-bold outline-none focus:border-blue-500/50 w-64 transition-all"
            />
          </div>

          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Toggle Style Lab">
                <Activity size={16} />
             </button>
             <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`p-1.5 hover:bg-white/10 ${showColumnPicker ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Column Picker">
                <Sliders size={16} />
             </button>
             <button onClick={handleExportCSV} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-emerald-400 rounded-lg transition-all" title="Export CSV">
                <FileText size={16} />
             </button>
             <button onClick={handleCopyToClipboard} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Copy to Clipboard">
                <Clipboard size={16} />
             </button>
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Fabric Config">
                <Settings size={16} />
             </button>
          </div>

          <button 
            onClick={() => { resetForm(); setShowConnectModal(true) }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            + Add Network
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showStyleLab && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 flex items-center justify-between backdrop-blur-md">
               <div className="flex items-center space-x-12">
                  <div className="flex items-center space-x-3">
                     <Activity size={16} className="text-blue-400" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">View Density Laboratory</span>
                  </div>

                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Font Size</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="8" max="14" step="1" 
                            value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                            className="w-32 accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-bold">{fontSize}px</span>
                        </div>
                     </div>

                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Row Density</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="4" max="24" step="2" 
                            value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))}
                            className="w-32 accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-bold">{rowDensity}px</span>
                        </div>
                     </div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 glass-panel rounded-lg overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">Mapping Topology...</p>
          </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={connections || []} 
          columnDefs={columnDefs}
          headerHeight={fontSize + rowDensity + 10}
          rowHeight={fontSize + rowDensity + 10}
          quickFilterText={searchTerm}
          animateRows={true}
          enableCellTextSelection={true}
          autoSizeStrategy={autoSizeStrategy}
          rowSelection="multiple"
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map((n: any) => n.data.id))}
        />

        <AnimatePresence>
          {showColumnPicker && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-0 right-0 bottom-0 w-64 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 z-[60] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center space-x-2">
                  <Sliders size={14} /> <span>Toggle Columns</span>
                </h3>
                <button onClick={() => setShowColumnPicker(false)} className="text-slate-500 hover:text-white"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                {columnDefs.filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
                  <label key={col.field} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.includes(col.field)}
                        onChange={() => {
                          if (hiddenColumns.includes(col.field)) {
                            setHiddenColumns(hiddenColumns.filter(f => f !== col.field))
                          } else {
                            setHiddenColumns([...hiddenColumns, col.field])
                          }
                        }}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>
                         {!hiddenColumns.includes(col.field) && <Check size={12} className="text-white mx-auto" />}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>{col.headerName || col.field}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
      />

      <ConnectionForensicsModal
        isOpen={!!viewingLink}
        onClose={() => setViewingLink(null)}
        connection={viewingLink}
        onEdit={(conn) => {
          setViewingLink(null);
          setEditingLink(conn); 
          setConnData({
            ...conn,
            device_a_id: conn.source_device_id,
            device_b_id: conn.target_device_id,
            port_a: conn.source_port,
            port_b: conn.target_port
          }); 
          setShowConnectModal(true)
        }}
      />

      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-4xl h-[85vh] rounded-lg border border-blue-500/20 overflow-hidden flex flex-col shadow-2xl">
              <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
                 <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                       <div className="px-3 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-[9px] font-bold text-blue-400 uppercase tracking-widest">FABRIC_LINK: {editingLink?.id || 'NEW_INTERCONNECT'}</div>
                       <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 uppercase tracking-widest">PHYSICAL_LAYER_ESTABLISHMENT</div>
                    </div>
                    <h1 className="text-5xl font-bold uppercase  tracking-tighter text-white">
                      {editingLink ? 'MODIFY_LINK' : 'ESTABLISH_FABRIC'}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Precision Infrastructure Interconnect Mapping</p>
                 </div>
                 <button onClick={() => setShowConnectModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                <div className="grid grid-cols-2 gap-10">
                  <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-lg space-y-6">
                    <h3 className="text-[10px] font-bold uppercase text-blue-500 tracking-[0.3em] flex items-center gap-2"><Network size={14}/> Source Node</h3>
                    <StyledSelect
                      label="Source Asset Registry Entity *"
                      value={connData.device_a_id}
                      onChange={e => setConnData({...connData, device_a_id: e.target.value})}
                      options={devices?.map((d: any) => ({ value: String(d.id), label: `${d.name} [${d.type}]` })) || []}
                      placeholder="Select Registry Asset..."
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Local Port *</label>
                        <input value={connData.source_port || connData.port_a || ''} onChange={e => setConnData({...connData, source_port: e.target.value, port_a: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500" placeholder="eth0" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">VLAN ID</label>
                        <input type="number" value={connData.source_vlan || ''} onChange={e => setConnData({...connData, source_vlan: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500" placeholder="100" />
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-emerald-600/5 border border-emerald-500/10 rounded-lg space-y-6">
                    <h3 className="text-[10px] font-bold uppercase text-emerald-500 tracking-[0.3em] flex items-center gap-2"><Network size={14}/> Peer Node</h3>
                    <StyledSelect
                      label="Peer Asset Registry Entity *"
                      value={connData.device_b_id}
                      onChange={e => setConnData({...connData, device_b_id: e.target.value})}
                      options={devices?.filter((d:any) => d.id != connData.device_a_id).map((d: any) => ({ value: String(d.id), label: `${d.name} [${d.type}]` })) || []}
                      placeholder="Select Registry Asset..."
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Peer Port *</label>
                        <input value={connData.target_port || connData.port_b || ''} onChange={e => setConnData({...connData, target_port: e.target.value, port_b: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500" placeholder="Te1/1/1" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Peer VLAN</label>
                        <input type="number" value={connData.target_vlan || ''} onChange={e => setConnData({...connData, target_vlan: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500" placeholder="100" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-10 border-t border-white/5 pt-10">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.3em]">Fabric Metadata</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <StyledSelect
                          label="Fabric Metric Type *"
                          value={connData.link_type}
                          onChange={e => setConnData({...connData, link_type: e.target.value})}
                          options={Array.isArray(options) && options.filter((o:any) => o.category === 'LinkPurpose').length > 0 
                              ? options.filter((o:any) => o.category === 'LinkPurpose').map((p:any) => ({ value: p.value, label: p.label }))
                              : ["Data", "Management", "Storage/iSCSI", "Backup", "vMotion", "Replication", "Heartbeat"].map(p => ({ value: p, label: p }))
                          }
                      />
                      <StyledSelect
                          label="Flow Logic"
                          value={connData.direction}
                          onChange={e => setConnData({...connData, direction: e.target.value})}
                          options={[{value: 'Bidirectional', label: 'Bidirectional'}, {value: 'Unidirectional', label: 'Unidirectional'}]}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Speed Value</label>
                        <input type="number" value={connData.speed_gbps} onChange={e => setConnData({...connData, speed_gbps: parseFloat(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500" />
                      </div>
                      <StyledSelect
                        label="Metric Unit"
                        value={connData.unit}
                        onChange={e => setConnData({...connData, unit: e.target.value})}
                        options={[{value: 'Gbps', label: 'Gbps'}, {value: 'Mbps', label: 'Mbps'}, {value: 'Tbps', label: 'Tbps'}]}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.3em]">Narrative</h3>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Interconnect Purpose</label>
                       <textarea value={connData.purpose || ''} onChange={e => setConnData({...connData, purpose: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-[30px] px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500 h-32 resize-none" placeholder="Technical rationale for physical link establishment..." />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 border-t border-white/5 bg-white/5 shrink-0 flex items-center space-x-4">
                <button onClick={() => setShowConnectModal(false)} className="px-10 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all">Abort</button>
                <button onClick={() => {
                  if(!connData.device_a_id || (!connData.source_port && !connData.port_a) || !connData.device_b_id || (!connData.target_port && !connData.port_b)) {
                    return toast.error("Entity and Port mapping required")
                  }
                  mutation.mutate(connData)
                }} className="flex-1 py-5 bg-blue-600 text-white rounded-[20px] text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3">
                  {mutation.isPending && <RefreshCcw size={16} className="animate-spin" />}
                  <span>{editingLink ? 'Synchronize Link Matrix' : 'Establish Physical Interconnect'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfigRegistryModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
        title="Network Fabric Config"
        sections={[
            { title: "Link Purposes", category: "LinkPurpose", icon: Network }
        ]}
      />

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
            font-weight: 700 !important; 
            text-transform: uppercase !important; 
            letter-spacing: 0.1em !important; 
            font-size: ${fontSize}px !important; 
            justify-content: center !important; 
        }
        .ag-cell { 
            display: flex; 
            align-items: center; 
            justify-content: center !important; 
            font-weight: 700 !important;
            font-size: ${fontSize}px !important;
        }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
      `}</style>
    </div>
  )
}
