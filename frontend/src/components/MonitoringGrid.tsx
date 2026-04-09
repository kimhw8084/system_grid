import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Activity, Plus, Search, Filter, ExternalLink, 
  Trash2, Edit2, Shield, Cpu, Database, Network, 
  Globe, Bell, Info, ChevronRight, X, Check, Save,
  AlertCircle, Clock, Zap, Settings, MoreVertical, List
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from "ag-grid-react"
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StyledSelect } from './shared/StyledSelect'

const CATEGORIES = [
  { value: 'Hardware', icon: Cpu, color: 'text-blue-400' },
  { value: 'Log', icon: Database, color: 'text-emerald-400' },
  { value: 'Network', icon: Network, color: 'text-amber-400' },
  { value: 'Application', icon: Activity, color: 'text-rose-400' },
  { value: 'Synthetic', icon: Globe, color: 'text-purple-400' }
]

const STATUSES = [
  { value: 'Existing', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'Planned', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'Cancelled', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' }
]

export default function MonitoringGrid() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  
  // --- STYLE LABORATORY STATE ---
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(8) // Extra padding per row
  const [showStyleLab, setShowStyleLab] = useState(true)

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 50)
    }
  }, [fontSize, rowDensity])

  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: items, isLoading } = useQuery({
    queryKey: ['monitoring-items'],
    queryFn: async () => (await apiFetch('/api/v1/monitoring/')).json()
  })

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json()
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/v1/monitoring/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
      toast.success('Monitoring item decommissioned')
    }
  })

  const columnDefs = useMemo(() => [
    { 
      field: "id", 
      headerName: "", 
      width: 50, 
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: 'left', 
      cellClass: 'text-center pl-2', 
      headerClass: 'text-center pl-2' 
    },
    { 
      field: "category", 
      headerName: "Cat", 
      width: 100,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const cat = CATEGORIES.find(c => c.value === p.value)
        const Icon = cat?.icon || Activity
        return (
          <div className="flex items-center justify-center space-x-2 h-full">
            <Icon size={12} className={cat?.color || 'text-slate-400'} />
            <span className="text-[10px] font-black uppercase tracking-tight text-white">{p.value}</span>
          </div>
        )
      }
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 110,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const style = STATUSES.find(s => s.value === p.value)?.color || 'bg-slate-500/20 text-slate-400'
        return (
          <div className="flex items-center justify-center h-full">
            <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${style}`}>
              {p.value}
            </span>
          </div>
        )
      }
    },
    { 
      field: "title", 
      headerName: "Monitoring Title", 
      flex: 1.5, 
      cellClass: "text-blue-400 font-bold text-left", 
      headerClass: 'text-left' 
    },
    { field: "device_name", headerName: "Target Asset", flex: 1, cellClass: "text-slate-200 font-bold text-center", headerClass: 'text-center' },
    { 
      field: "monitored_service_names", 
      headerName: "Services", 
      flex: 1, 
      cellClass: "text-center", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const names = p.value || []
        if (names.length === 0) return <span className="text-slate-600 italic text-[9px]">None</span>
        return (
          <div className="flex items-center justify-center -space-x-1 overflow-hidden h-full" title={names.join(', ')}>
            {names.slice(0, 2).map((n: string, i: number) => (
              <div key={i} className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-[8px] font-bold text-blue-300 truncate max-w-[60px]">
                {n}
              </div>
            ))}
            {names.length > 2 && (
              <div className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[8px] font-bold text-slate-400">
                +{names.length - 2}
              </div>
            )}
          </div>
        )
      }
    },
    { 
      field: "platform", 
      headerName: "Platform", 
      width: 120, 
      cellClass: 'text-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-2 h-full">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-slate-300">{p.value}</span>
        </div>
      )
    },
    {
      headerName: "Ops",
      width: 100,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5">
               {p.data.monitoring_url && (
                 <button onClick={() => window.open(p.data.monitoring_url, '_blank')} title="Monitoring Console" className="p-1.5 hover:bg-blue-600 hover:text-white text-blue-400 rounded-md transition-all"><ExternalLink size={14}/></button>
               )}
               <button onClick={() => { setEditingItem(p.data); setIsFormOpen(true); }} title="Modify Logic" className="p-1.5 hover:bg-blue-600 hover:text-white text-emerald-400 rounded-md transition-all"><Edit2 size={14}/></button>
               <button onClick={() => deleteMutation.mutate(p.data.id)} title="Decommission" className="p-1.5 hover:bg-rose-600 hover:text-white text-rose-400 rounded-md transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      )
    }
  ], []) as any

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* STYLE LABORATORY BAR */}
      <AnimatePresence>
        {showStyleLab && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
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

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic flex items-center">
                <span>Monitoring</span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Observability Infrastructure & Logic Registry</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="SEARCH LOGIC, PLATFORM..."
              className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all"
            />
          </div>

          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Toggle Style Lab">
                <Activity size={16} />
             </button>
             <button className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Matrix Config">
                <Settings size={16} />
             </button>
          </div>

          <button 
            onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            + Add Monitoring
          </button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <Zap size={32} className="text-blue-400 animate-pulse" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Scanning Monitoring Matrix...</p>
          </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={items || []} 
          columnDefs={columnDefs} 
          rowSelection="multiple"
          headerHeight={fontSize + rowDensity + 8}
          rowHeight={fontSize + rowDensity}
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
          quickFilterText={searchTerm}
          autoSizeStrategy={autoSizeStrategy}
        />
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <MonitoringForm 
            item={editingItem} 
            devices={devices}
            onClose={() => setIsFormOpen(false)} 
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
              setIsFormOpen(false)
            }}
          />
        )}
      </AnimatePresence>

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

const LOGIC_TYPES = ['Threshold', 'Regex', 'Query', 'Health Check', 'Log Pattern', 'Synthetic', 'Custom']

function MonitoringForm({ item, devices, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    category: 'Hardware',
    status: 'Planned',
    title: '',
    spec: '',
    platform: 'Zabbix',
    monitoring_url: '',
    purpose: '',
    notification_method: 'Email',
    notification_recipients: [],
    logic: '',
    logic_json: [],
    device_id: null,
    monitored_services: [],
    ...item
  })

  const [recipientInput, setRecipientInput] = useState('')

  // Fetch services for selected device
  const { data: deviceServices } = useQuery({
    queryKey: ['device-services', formData.device_id],
    queryFn: async () => {
      if (!formData.device_id) return []
      return (await apiFetch(`/api/v1/logical-services/?device_id=${formData.device_id}`)).json()
    },
    enabled: !!formData.device_id
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = item ? `/api/v1/monitoring/${item.id}` : '/api/v1/monitoring/'
      const method = item ? 'PUT' : 'POST'
      return (await apiFetch(url, { method, body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      toast.success(item ? 'Logic synchronized' : 'Logic deployed to matrix')
      onSuccess()
    }
  })

  const toggleService = (id: number) => {
    const current = [...(formData.monitored_services || [])]
    const idx = current.indexOf(id)
    if (idx > -1) {
      current.splice(idx, 1)
    } else {
      current.push(id)
    }
    setFormData({ ...formData, monitored_services: current })
  }

  const addLogicEntry = () => {
    const newEntries = [...(formData.logic_json || []), { type: 'Threshold', description: '', parameters: '', id: Date.now() }]
    setFormData({ ...formData, logic_json: newEntries })
  }

  const removeLogicEntry = (id: number) => {
    setFormData({ ...formData, logic_json: formData.logic_json.filter((e: any) => e.id !== id) })
  }

  const updateLogicEntry = (id: number, field: string, value: string) => {
    const newEntries = formData.logic_json.map((e: any) => e.id === id ? { ...e, [field]: value } : e)
    setFormData({ ...formData, logic_json: newEntries })
  }

  const addRecipient = () => {
    if (recipientInput && !formData.notification_recipients.includes(recipientInput)) {
      setFormData({ ...formData, notification_recipients: [...formData.notification_recipients, recipientInput] })
      setRecipientInput('')
    }
  }

  const removeRecipient = (r: string) => {
    setFormData({ ...formData, notification_recipients: formData.notification_recipients.filter((item: string) => item !== r) })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-panel w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-10 rounded-[40px] border-blue-500/30 shadow-[0_0_100px_rgba(37,99,235,0.1)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-8 mb-8">
           <div className="flex items-center space-x-4">
              <div className="p-4 bg-blue-600/10 rounded-3xl text-blue-400 border border-blue-500/20">
                <Zap size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                  {item ? 'Update Logic' : 'Deploy Monitoring'}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Infrastructure Command Interface</p>
              </div>
           </div>
           <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-colors">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 grid grid-cols-12 gap-8">
           {/* Left Column: Asset & Basic Info */}
           <div className="col-span-4 space-y-6">
              <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 border-l-2 border-blue-600 pl-3">Target Selection</h3>
                <StyledSelect 
                  label="Target Registry Asset"
                  value={formData.device_id}
                  onChange={(e: any) => {
                      const val = e.target.value === "" ? null : parseInt(e.target.value);
                      setFormData({...formData, device_id: val, monitored_services: []});
                  }}
                  options={devices?.map((d: any) => ({ value: d.id, label: `${d.name} [${d.system}]` })) || []}
                  placeholder="Select Device..."
                />

                {formData.device_id && (
                  <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Service Scope</label>
                      <span className="text-[8px] font-bold text-blue-500 uppercase bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        {formData.monitored_services?.length || 0} Bound
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {deviceServices?.length > 0 ? (
                        deviceServices.map((svc: any) => (
                          <button
                            key={svc.id}
                            onClick={() => toggleService(svc.id)}
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center space-x-1.5 border ${
                              formData.monitored_services?.includes(svc.id)
                                ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                                : 'bg-black/40 border-white/10 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {formData.monitored_services?.includes(svc.id) ? <Check size={8} strokeWidth={4} /> : <div className="w-1 h-1 rounded-full bg-slate-700" />}
                            <span>{svc.name}</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-[9px] text-slate-600 uppercase italic px-1">No services registered</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <StyledSelect 
                  label="Registry Category"
                  value={formData.category}
                  onChange={(e: any) => setFormData({...formData, category: e.target.value})}
                  options={CATEGORIES.map(c => ({ value: c.value, label: c.value }))}
                />
                <StyledSelect 
                  label="Sync Status"
                  value={formData.status}
                  onChange={(e: any) => setFormData({...formData, status: e.target.value})}
                  options={STATUSES.map(s => ({ value: s.value, label: s.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monitoring Title</label>
                <input 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. CORE-DB: High CPU Load Alert"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deployment Platform</label>
                <input 
                  value={formData.platform}
                  onChange={e => setFormData({...formData, platform: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monitoring URL</label>
                <div className="relative group">
                   <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                   <input 
                    value={formData.monitoring_url}
                    onChange={e => setFormData({...formData, monitoring_url: e.target.value})}
                    placeholder="https://zabbix.internal/..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-[12px] font-bold text-blue-400 outline-none focus:border-blue-500 transition-all truncate"
                   />
                </div>
              </div>
           </div>

           {/* Right Column: Structured Logic & Notifications */}
           <div className="col-span-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center space-x-2">
                     <Settings size={14}/> <span>Structured Logic Specification</span>
                  </h3>
                  <button 
                    onClick={addLogicEntry}
                    className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600/40 transition-all flex items-center space-x-1"
                  >
                    <Plus size={12}/> <span>Add Entry</span>
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {formData.logic_json?.map((entry: any) => (
                    <motion.div 
                      key={entry.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 relative group"
                    >
                      <button 
                        onClick={() => removeLogicEntry(entry.id)}
                        className="absolute -right-2 -top-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={12}/>
                      </button>
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-3">
                           <StyledSelect 
                             label="Logic Type"
                             value={entry.type}
                             onChange={e => updateLogicEntry(entry.id, 'type', e.target.value)}
                             options={LOGIC_TYPES.map(t => ({ value: t, label: t }))}
                           />
                        </div>
                        <div className="col-span-4">
                          <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Trigger Description</label>
                          <input 
                            value={entry.description}
                            onChange={e => updateLogicEntry(entry.id, 'description', e.target.value)}
                            placeholder="e.g. Alert if CPU > 95% for 5m"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-5">
                          <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Technical Parameters / Query</label>
                          <input 
                            value={entry.parameters}
                            onChange={e => updateLogicEntry(entry.id, 'parameters', e.target.value)}
                            placeholder="e.g. {HOST:system.cpu.util.avg(5m)} > 95"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-mono text-blue-300 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {(!formData.logic_json || formData.logic_json.length === 0) && (
                    <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-slate-600 space-y-2">
                       <Database size={32} className="opacity-20" />
                       <p className="text-[10px] font-black uppercase tracking-widest italic">No logic entries defined for this registry item</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                   <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center space-x-2 border-b border-white/5 pb-2">
                      <Bell size={14}/> <span>Notification Schema</span>
                   </h3>
                   <div className="space-y-4">
                      <StyledSelect 
                        label="Primary Method"
                        value={formData.notification_method}
                        onChange={(e: any) => setFormData({...formData, notification_method: e.target.value})}
                        options={['Email', 'Slack', 'Teams', 'PagerDuty', 'Webhook', 'SMS', 'Voice'].map(m => ({ value: m, label: m }))}
                      />
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recipients List</label>
                         <div className="flex space-x-2">
                            <input 
                              value={recipientInput}
                              onChange={e => setRecipientInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addRecipient()}
                              placeholder="Add email or channel ID..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[11px] outline-none focus:border-blue-500"
                            />
                            <button onClick={addRecipient} className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl transition-all"><Plus size={14}/></button>
                         </div>
                         <div className="flex flex-wrap gap-2 mt-2">
                            {formData.notification_recipients.map((r: string) => (
                              <div key={r} className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">
                                 <span className="text-[10px] font-bold text-blue-300">{r}</span>
                                 <button onClick={() => removeRecipient(r)} className="text-slate-500 hover:text-rose-400"><X size={10}/></button>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-2 border-b border-white/5 pb-2">
                      <Info size={14}/> <span>General Purpose & Scope</span>
                   </h3>
                   <textarea 
                    value={formData.purpose}
                    onChange={e => setFormData({...formData, purpose: e.target.value})}
                    placeholder="Explain the business value and impact of this monitoring logic..."
                    rows={6}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                   />
                </div>
              </div>
           </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex justify-end space-x-4">
           <button onClick={onClose} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all">Abort</button>
           <button 
             onClick={() => mutation.mutate(formData)}
             disabled={mutation.isPending}
             className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:bg-slate-700 flex items-center space-x-2"
           >
             {mutation.isPending ? <Clock className="animate-spin" size={14} /> : <Check size={14} />}
             <span>{item ? 'Commit Synchronized Logic' : 'Deploy Logic to Matrix'}</span>
           </button>
        </div>
      </motion.div>
    </div>
  )
}
