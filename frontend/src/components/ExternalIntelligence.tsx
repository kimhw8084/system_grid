import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Database, Plus, Search, Filter, ExternalLink, 
  Trash2, Edit2, Shield, Cpu, Network, X, Check,
  ArrowRightLeft, Link as LinkIcon, Key, Info, Globe,
  Activity, Download, Copy, Settings, RefreshCcw, Save, Layers, Sliders, Clipboard, FileText
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from 'ag-grid-react'
import toast from 'react-hot-toast'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { apiFetch } from "../api/apiClient"
import { StyledSelect } from "./shared/StyledSelect"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { ConfigRegistryModal } from "./ConfigRegistry"

export default function ExternalIntelligence() {
  const queryClient = useQueryClient()
  const gridRef = useRef<any>(null)
  const [activeTab, setActiveTab] = useState<'Registry' | 'Connectivity'>('Registry')
  const [searchTerm, setSearchTerm] = useState('')
  const [showEntityModal, setShowEntityModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [editingEntity, setEditingEntity] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  // Style Lab & Column Picker State
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)

  // Data fetching
  const { data: entities, isLoading: entLoading } = useQuery({ 
    queryKey: ['external-entities'], 
    queryFn: async () => (await (await apiFetch('/api/v1/intelligence/entities')).json()) 
  })
  const { data: links, isLoading: linkLoading } = useQuery({ 
    queryKey: ['external-links'], 
    queryFn: async () => (await (await apiFetch('/api/v1/intelligence/links')).json()) 
  })
  const { data: devices } = useQuery({ 
    queryKey: ['devices'], 
    queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) 
  })

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 100)
    }
  }, [fontSize, rowDensity, activeTab, entities, links])

  const handleExportCSV = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `SysGrid_Intelligence_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`,
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

  // Mutations
  const entityMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingEntity ? `/api/v1/intelligence/entities/${editingEntity.id}` : '/api/v1/intelligence/entities'
      const method = editingEntity ? 'PUT' : 'POST'
      return (await apiFetch(url, { method, body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      toast.success(editingEntity ? 'Entity Synchronized' : 'External System Registered')
      setShowEntityModal(false); setEditingEntity(null)
    }
  })

  const linkMutation = useMutation({
    mutationFn: async (data: any) => {
      return (await apiFetch('/api/v1/intelligence/links', { method: 'POST', body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-links'] })
      toast.success('Interconnect Established')
      setShowLinkModal(false)
    }
  })

  const deleteEntityMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/intelligence/entities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      toast.success('System Purged from Registry')
      setConfirmModal({ ...confirmModal, isOpen: false })
    },
    onError: (e: any) => toast.error(e.message)
  })

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await apiFetch(`/api/v1/intelligence/links/${id}`, { method: 'DELETE' })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-links'] })
      toast.success('Link Severed')
      setConfirmModal({ ...confirmModal, isOpen: false })
    }
  })

  // Grid Definitions
  const entityColumns = useMemo(() => [
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
      field: "name", 
      headerName: "System Name", 
      flex: 1.5, 
      cellClass: "font-bold uppercase tracking-tight text-left", 
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("name")
    },
    { 
      field: "type", 
      headerName: "Type", 
      flex: 1, 
      cellClass: "text-center font-bold text-slate-400 uppercase tracking-widest", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("type")
    },
    { 
      field: "ip_address", 
      headerName: "Primary IP", 
      flex: 1, 
      cellClass: "font-mono text-center font-bold", 
      headerClass: 'text-center', 
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("ip_address")
    },
    { 
      field: "owner_organization", 
      headerName: "Partner / Owner", 
      flex: 1.2, 
      cellClass: "text-center font-bold uppercase", 
      headerClass: 'text-center', 
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("owner_organization")
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
      suppressHide: true,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => { setEditingEntity(p.data); setShowEntityModal(true) }} title="Edit Configuration" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge System', message: 'Purge this external entity? All links must be severed first.', onConfirm: () => deleteEntityMutation.mutate(p.data.id) })} title="Purge" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      )
    }
  ], [fontSize, hiddenColumns])

  const linkColumns = useMemo(() => [
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
      field: "external_entity_name", 
      headerName: "External Peer", 
      flex: 1, 
      minWidth: 150, 
      cellClass: "font-bold uppercase tracking-tight text-left", 
      headerClass: 'text-left', 
      filter: 'agTextColumnFilter',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("external_entity_name")
    },
    { 
      field: "direction", 
      headerName: "Flow", 
      width: 100, 
      cellClass: "text-center",
      headerClass: "text-center",
      filter: 'agTextColumnFilter',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full">
          <div style={{ fontSize: `${fontSize}px` }} className={`px-2 py-0.5 rounded font-bold uppercase inline-block border ${p.value === 'Upstream' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
            {p.value}
          </div>
        </div>
      ),
      hide: hiddenColumns.includes("direction")
    },
    { 
      field: "device_name", 
      headerName: "Internal Asset", 
      width: 150, 
      minWidth: 150, 
      cellClass: "font-bold text-center uppercase tracking-tight", 
      headerClass: 'text-center', 
      filter: 'agTextColumnFilter', 
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("device_name")
    },
    { 
      field: "service_name", 
      headerName: "Logical Service", 
      width: 150, 
      minWidth: 150, 
      cellClass: "text-center uppercase text-slate-400 font-bold tracking-tight", 
      headerClass: 'text-center', 
      filter: 'agTextColumnFilter', 
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("service_name")
    },
    { 
      field: "purpose", 
      headerName: "Interconnect Purpose", 
      flex: 1.5, 
      minWidth: 200, 
      headerClass: 'text-left', 
      cellClass: 'font-bold uppercase', 
      filter: 'agTextColumnFilter', 
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("purpose")
    },
    { field: "protocol", headerName: "Prot", width: 80, minWidth: 80, cellClass: "text-center font-mono font-bold uppercase", headerClass: 'text-center', filter: 'agTextColumnFilter', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>, hide: hiddenColumns.includes("protocol") },
    { field: "port", headerName: "Port", width: 80, minWidth: 80, cellClass: "text-center font-mono font-bold uppercase", headerClass: 'text-center', filter: 'agTextColumnFilter', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>, hide: hiddenColumns.includes("port") },
    { 
      field: "actions",
      headerName: "Action",
      width: 120,
      minWidth: 120,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      resizable: false,
      suppressHide: true,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setConfirmModal({ isOpen: true, title: 'Sever Link', message: 'Sever this interconnect?', onConfirm: () => deleteLinkMutation.mutate(p.data.id) })} title="Sever" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      )
    }
  ], [fontSize, hiddenColumns])

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">Partner IQ</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">External Interconnect & Intelligence Matrix</p>
           </div>

           <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 ml-2">
                <button 
                  onClick={() => setActiveTab('Registry')} 
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${activeTab === 'Registry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Globe size={14}/> <span>Registry</span>
                </button>
                <button 
                  onClick={() => setActiveTab('Connectivity')} 
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${activeTab === 'Connectivity' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <LinkIcon size={14}/> <span>Connectivity</span>
                </button>
           </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={`SCAN ${activeTab.toUpperCase()}...`}
                className="bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-indigo-500/50 w-64 transition-all" 
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
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Matrix Registry Config">
                <Settings size={16} />
             </button>
          </div>

          <button 
             onClick={() => { setEditingEntity(null); activeTab === 'Registry' ? setShowEntityModal(true) : setShowLinkModal(true) }}
             className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
             + {activeTab === 'Registry' ? 'Register' : 'Map Link'}
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
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">View Density Laboratory</span>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Font Size</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="8" max="14" step="1" 
                            value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                            className="w-32 accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-black">{fontSize}px</span>
                        </div>
                     </div>

                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Row Density</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="4" max="24" step="2" 
                            value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))}
                            className="w-32 accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-black">{rowDensity}px</span>
                        </div>
                     </div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 glass-panel rounded-lg overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {(entLoading || linkLoading) && (
           <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm space-y-4">
              <RefreshCcw size={32} className="text-indigo-400 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Synchronizing Global Matrix...</p>
           </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={activeTab === 'Registry' ? entities : links} 
          columnDefs={(activeTab === 'Registry' ? entityColumns : linkColumns) as any}
          headerHeight={fontSize + rowDensity + 10}
          rowHeight={fontSize + rowDensity + 10}
          quickFilterText={searchTerm}
          animateRows={true}
          enableCellTextSelection={true}
          autoSizeStrategy={autoSizeStrategy}
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
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center space-x-2">
                  <Sliders size={14} /> <span>Toggle Columns</span>
                </h3>
                <button onClick={() => setShowColumnPicker(false)} className="text-slate-500 hover:text-white"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                {(activeTab === 'Registry' ? entityColumns : linkColumns).filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
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
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>{col.headerName || col.field}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfigRegistryModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
        title="Intelligence Matrix Config"
        sections={[
            { title: "Entity Types", category: "ExternalType", icon: Globe },
            { title: "Link Categories", category: "LinkType", icon: LinkIcon }
        ]}
      />

      <AnimatePresence>
        {showEntityModal && (
          <EntityForm 
            entity={editingEntity} 
            onClose={() => { setShowEntityModal(false); setEditingEntity(null) }}
            onSave={(data: any) => entityMutation.mutate(data)}
            isPending={entityMutation.isPending}
          />
        )}
        {showLinkModal && (
          <LinkForm 
            entities={entities}
            devices={devices}
            onClose={() => setShowLinkModal(false)}
            onSave={(data: any) => linkMutation.mutate(data)}
            isPending={linkMutation.isPending}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
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
            font-weight: 700 !important;
        }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
      `}</style>
    </div>
  )
}

function EntityForm({ entity, onClose, onSave, isPending }: any) {
  const [formData, setFormData] = useState(entity || {
    name: '', type: 'Server', hostname: '', ip_address: '', owner_organization: '', description: '', contact_info: ''
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-4xl h-[85vh] rounded-lg border border-indigo-500/20 overflow-hidden flex flex-col shadow-2xl">
        <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
           <div className="space-y-4">
              <div className="flex items-center space-x-3">
                 <div className="px-3 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-[9px] font-black text-indigo-400 uppercase tracking-widest">SYSTEM_IQ: {entity?.id || 'NEW_REGISTRY'}</div>
                 <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">EXTERNAL_INTERCONNECT</div>
              </div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">
                {formData.name || 'REGISTER_SYSTEM'}
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Precision External Intelligence Matrix Entry</p>
           </div>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
           <div className="grid grid-cols-2 gap-10">
              <div className="space-y-8">
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em] border-l-2 border-indigo-500 pl-4">Identification</h3>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">System Name *</label>
                       <input 
                         value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                         className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all"
                         placeholder="e.g., Azure Auth Gateway"
                       />
                    </div>
                    <StyledSelect 
                       label="System Type"
                       value={formData.type}
                       onChange={e => setFormData({...formData, type: e.target.value})}
                       options={["Server", "Database", "PC/Workstation", "Network Gear", "Cloud Service", "Partner API"].map(t => ({ value: t, label: t }))}
                    />
                 </div>

                 <div className="space-y-4 pt-4">
                    <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] border-l-2 border-emerald-500 pl-4">Connectivity</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Primary IP Address</label>
                          <input 
                            value={formData.ip_address} onChange={e => setFormData({...formData, ip_address: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-[11px] font-mono font-black text-emerald-400 outline-none focus:border-indigo-500 transition-all"
                            placeholder="0.0.0.0"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">FQDN / Hostname</label>
                          <input 
                            value={formData.hostname} onChange={e => setFormData({...formData, hostname: e.target.value.toUpperCase()})}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all"
                            placeholder="api.partner.com"
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.3em] border-l-2 border-amber-500 pl-4">Governance</h3>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Owner / Organization</label>
                       <input 
                         value={formData.owner_organization} onChange={e => setFormData({...formData, owner_organization: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all"
                         placeholder="e.g., Microsoft / Partner-X"
                       />
                    </div>
                 </div>

                 <div className="space-y-4 pt-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] border-l-2 border-slate-500 pl-4">Narrative</h3>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Description / Notes</label>
                       <textarea 
                         value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all h-48 resize-none"
                         placeholder="Technical description of external system purpose..."
                       />
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-10 border-t border-white/5 bg-white/5 shrink-0 flex items-center space-x-4">
           <button onClick={onClose} className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all">Abort</button>
           <button 
             onClick={() => onSave(formData)}
             disabled={!formData.name || isPending}
             className="flex-1 py-5 bg-indigo-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
           >
              {isPending && <RefreshCcw size={16} className="animate-spin" />}
              <span>Commit Registry Data</span>
           </button>
        </div>
      </motion.div>
    </div>
  )
}

function LinkForm({ entities, devices, onClose, onSave, isPending }: any) {
  const [formData, setFormData] = useState({
    external_entity_id: '', device_id: '', service_id: '', direction: 'Upstream', purpose: '', protocol: 'TCP', port: '',
    credentials: { username: '', password: '', note: '' }
  })

  const { data: services } = useQuery({
    queryKey: ['device-services', formData.device_id],
    queryFn: async () => {
      if (!formData.device_id) return []
      return (await apiFetch(`/api/v1/logical-services/?device_id=${formData.device_id}`)).json()
    },
    enabled: !!formData.device_id
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-5xl h-[85vh] rounded-lg border border-indigo-500/20 overflow-hidden flex flex-col shadow-2xl">
        <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
           <div className="space-y-4">
              <div className="flex items-center space-x-3">
                 <div className="px-3 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-[9px] font-black text-indigo-400 uppercase tracking-widest">MAP_INTERCONNECT</div>
                 <div className="px-3 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-widest">DATA_FLOW_ESTABLISHMENT</div>
              </div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">ESTABLISH_LINK</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Mapping Topology Between Global & Local Matrix</p>
           </div>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
           <div className="grid grid-cols-2 gap-10">
              <div className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-lg space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em] flex items-center gap-2"><Globe size={14}/> External Peer</h3>
                 <StyledSelect 
                    label="Target External Entity"
                    value={formData.external_entity_id}
                    onChange={e => setFormData({...formData, external_entity_id: e.target.value})}
                    options={entities?.map((e: any) => ({ value: e.id, label: `${e.name} [${e.ip_address || 'No IP'}]` })) || []}
                    placeholder="Select Remote System..."
                 />
                 <StyledSelect 
                    label="Flow Direction"
                    value={formData.direction}
                    onChange={e => setFormData({...formData, direction: e.target.value})}
                    options={[{value: 'Upstream', label: 'Upstream (Input)'}, {value: 'Downstream', label: 'Downstream (Output)'}]}
                 />
              </div>

              <div className="p-8 bg-emerald-600/5 border border-emerald-500/10 rounded-lg space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] flex items-center gap-2"><Cpu size={14}/> Internal Asset</h3>
                 <StyledSelect 
                    label="Internal Registry Asset"
                    value={formData.device_id}
                    onChange={e => setFormData({...formData, device_id: e.target.value, service_id: ''})}
                    options={devices?.map((d: any) => ({ value: d.id, label: d.name })) || []}
                    placeholder="Select Internal Asset..."
                 />
                 <StyledSelect 
                    label="Logical Service (Optional)"
                    value={formData.service_id}
                    onChange={e => setFormData({...formData, service_id: e.target.value})}
                    options={services?.map((s: any) => ({ value: s.id, label: s.name })) || []}
                    placeholder={formData.device_id ? "Select Service..." : "Select Asset First..."}
                 />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-10 border-t border-white/5 pt-10">
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Link Configuration</h3>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Interconnect Purpose</label>
                    <input 
                      value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all"
                      placeholder="e.g., Daily DB Synchronization Feed"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Protocol</label>
                       <input 
                         value={formData.protocol} onChange={e => setFormData({...formData, protocol: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-mono font-black text-white outline-none focus:border-indigo-500 transition-all"
                         placeholder="TCP / HTTPS / SFTP"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Port</label>
                       <input 
                         value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-mono font-black text-indigo-300 outline-none focus:border-indigo-500 transition-all"
                         placeholder="443"
                       />
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-lg space-y-6">
                 <div className="flex items-center space-x-3 text-indigo-400 border-b border-indigo-500/10 pb-4">
                   <Key size={16} />
                   <h3 className="text-[10px] font-black uppercase tracking-widest">Connection Intelligence</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <input 
                      value={formData.credentials.username} onChange={e => setFormData({...formData, credentials: {...formData.credentials, username: e.target.value}})}
                      className="w-full bg-black/60 border border-white/5 rounded-lg px-5 py-4 text-[11px] font-black text-white outline-none focus:border-indigo-500 transition-all"
                      placeholder="Username"
                    />
                    <input 
                      type="password"
                      value={formData.credentials.password} onChange={e => setFormData({...formData, credentials: {...formData.credentials, password: e.target.value}})}
                      className="w-full bg-black/60 border border-white/5 rounded-lg px-5 py-4 text-[11px] font-black text-white outline-none focus:border-indigo-500 transition-all"
                      placeholder="Password"
                    />
                    <textarea 
                      className="col-span-2 w-full bg-black/60 border border-white/5 rounded-lg px-5 py-4 text-[10px] font-bold text-slate-400 outline-none focus:border-indigo-500 transition-all h-24 resize-none"
                      placeholder="Security Notes / Store Reference..."
                      value={formData.credentials.note}
                      onChange={e => setFormData({...formData, credentials: {...formData.credentials, note: e.target.value}})}
                    />
                 </div>
              </div>
           </div>
        </div>

        <div className="p-10 border-t border-white/5 bg-white/5 shrink-0 flex items-center space-x-4">
           <button onClick={onClose} className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all">Abort</button>
           <button 
             onClick={() => onSave({
               ...formData,
               external_entity_id: parseInt(formData.external_entity_id),
               device_id: parseInt(formData.device_id),
               service_id: formData.service_id ? parseInt(formData.service_id) : null
             })}
             disabled={!formData.external_entity_id || !formData.device_id || isPending}
             className="flex-1 py-5 bg-indigo-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
           >
              {isPending && <RefreshCcw size={16} className="animate-spin" />}
              <span>Establish Interconnect Link</span>
           </button>
        </div>
      </motion.div>
    </div>
  )
}
