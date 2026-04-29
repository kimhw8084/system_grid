import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, Globe, 
  Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, Shield, Eye,
  FileText, Briefcase, Calendar, LayoutGrid, List, Mail,
  Terminal, Monitor, Key, Clock, ShieldCheck, Check, ArrowRight, Server, Phone, Flag, ExternalLink, Trash, Zap, Layers, Activity, Settings, Sliders, Clipboard
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { ConfigRegistryModal } from './ConfigRegistry'

// --- Components ---

const SectionHeader = ({ icon: Icon, title, color = "text-blue-400" }: any) => (
  <div className="flex items-center space-x-3 border-b border-white/5 pb-2 mb-4">
    <Icon size={16} className={color} />
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
  </div>
)

const InfoCard = ({ label, value, icon: Icon }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-lg space-y-1">
    <div className="flex items-center space-x-2 text-slate-500">
      <Icon size={12} />
      <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-xs font-bold text-white uppercase tracking-tight">{value || '---'}</p>
  </div>
)

export default function Vendor() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const { data: vendors, isLoading } = useQuery({ 
    queryKey: ['vendors'], 
    queryFn: async () => (await apiFetch('/api/v1/vendors/')).json() 
  })

  React.useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 100)
    }
  }, [fontSize, rowDensity, vendors])

  const handleExportCSV = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `SysGrid_Vendors_${new Date().toISOString().split('T')[0]}.csv`,
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

  const { data: devices } = useQuery({ 
    queryKey: ['devices'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json() 
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/vendors/${data.id}` : '/api/v1/vendors/'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor Matrix Updated')
      setActiveModal(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/vendors/${id}`, { method: 'DELETE' }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor Entry Removed')
    }
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
      field: "name", 
      headerName: "Vendor Name", 
      flex: 1, 
      pinned: 'left', 
      filter: true, 
      cellClass: 'font-bold uppercase tracking-tight',
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("name")
    },
    { 
      field: "country", 
      headerName: "Country", 
      width: 150, 
      filter: true, 
      cellClass: 'text-center font-bold',
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("country")
    },
    {
      field: "actions",
      headerName: "Action",
      width: 100,
      minWidth: 100,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      resizable: false,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setActiveDetails(p.data)} title="View Details" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><Eye size={14}/></button>
               <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge Vendor', message: 'Erase vendor record?', onConfirm: () => deleteMutation.mutate(p.data.id) })} title="Purge" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      ),
      suppressHide: true
    }
  ], [setActiveDetails, deleteMutation, fontSize, hiddenColumns]) as any

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-bold uppercase tracking-tight  text-white">Vendors</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Vendor Capability & Contract Intelligence</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filter Registry..." className="bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>

          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 space-x-1">
             <button 
                onClick={() => setShowStyleLab(!showStyleLab)} 
                className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`}
                title="Toggle Style Lab"
             >
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
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Registry Config">
                <Settings size={16} />
             </button>
          </div>

          <button 
            onClick={() => setActiveModal({ name: '', primary_email: '', primary_phone: '', country: '' })}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            + Add Vendor
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

      <div className="flex-1 glass-panel rounded-lg overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Syncing partner data...</p>
          </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={vendors || []} 
          columnDefs={columnDefs} 
          headerHeight={fontSize + rowDensity + 10}
          rowHeight={fontSize + rowDensity + 10}
          quickFilterText={searchTerm}
          animateRows={true}
          enableCellTextSelection={true}
          autoSizeStrategy={autoSizeStrategy}
          rowSelection="multiple"
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
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

      <ConfigRegistryModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
        title="Vendor Matrix Config"
        sections={[
            { title: "Service Categories", category: "VendorCategory", icon: Layers },
            { title: "Relationship Status", category: "Status", icon: RefreshCcw }
        ]}
      />

      <AnimatePresence>
        {activeModal && (
          <VendorForm 
            item={activeModal} 
            onClose={() => setActiveModal(null)} 
            onSave={(d: any) => mutation.mutate(d)}
            isSaving={mutation.isPending}
          />
        )}
        {activeDetails && (
          <VendorDetails 
            vendor={activeDetails} 
            devices={devices}
            onClose={() => setActiveDetails(null)} 
          />
        )}
        {confirmModal.isOpen && (
          <ConfirmationModal 
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            onConfirm={() => {
              confirmModal.onConfirm();
              setConfirmModal({ ...confirmModal, isOpen: false });
            }}
            onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
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

        }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
      `}</style>
    </div>
  )
}

function VendorForm({ item, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })
  const { data: countries } = useQuery({ 
    queryKey: ['settings', 'VendorCountry'], 
    queryFn: async () => (await apiFetch('/api/v1/settings/options?category=VendorCountry')).json() 
  })

  const countryOptions = useMemo(() => {
    if (countries && countries.length > 0) return countries;
    return [
      { label: 'South Korea', value: 'South Korea' },
      { label: 'United States', value: 'United States' }
    ]
  }, [countries])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[500px] p-10 rounded-lg border border-blue-500/30 flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h2 className="text-2xl font-bold uppercase text-blue-400 flex items-center gap-3">
            <Briefcase size={24} /> Vendor Entry
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        <div className="space-y-6 mt-6">
            <SectionHeader icon={User} title="Basic Information" />
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Vendor Name</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Country</label>
                <select 
                  value={formData.country || 'South Korea'} 
                  onChange={e => setFormData({...formData, country: e.target.value})} 
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white"
                >
                  {countryOptions.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Primary Email</label>
                <input value={formData.primary_email} onChange={e => setFormData({...formData, primary_email: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Primary Phone</label>
                <input value={formData.primary_phone} onChange={e => setFormData({...formData, primary_phone: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
              </div>
            </div>
        </div>

        <div className="flex space-x-3 pt-10 mt-auto">
          <button onClick={onClose} className="flex-1 py-4 text-[11px] font-bold uppercase text-slate-500 hover:text-white transition-colors">Abort</button>
          <button onClick={() => onSave(formData)} className="flex-[2] py-4 bg-blue-600 text-white rounded-lg text-[11px] font-bold uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
            {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
            Save Vendor
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function VendorDetails({ vendor, devices, onClose }: any) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('Overview')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...vendor })
  const [showPersonnelModal, setShowPersonnelModal] = useState<any>(null)
  const [showContractModal, setShowContractModal] = useState<any>(null)
  const [activeContractDetails, setActiveContractDetails] = useState<any>(null)

  const { data: systems } = useQuery({ 
    queryKey: ['settings', 'LogicalSystem'], 
    queryFn: async () => (await apiFetch('/api/v1/settings/options?category=LogicalSystem')).json() 
  })

  const vendorMutation = useMutation({
    mutationFn: async (data: any) => {
      return (await apiFetch(`/api/v1/vendors/${vendor.id}`, { method: 'PUT', body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setIsEditing(false)
      toast.success('Vendor Profile Updated')
    }
  })

  const personnelMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/vendors/personnel/${data.id}` : `/api/v1/vendors/${vendor.id}/personnel`
      const method = data.id ? 'PUT' : 'POST'
      return (await apiFetch(url, { method, body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setShowPersonnelModal(null)
      toast.success('Personnel Updated')
    }
  })

  const deletePersonnelMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/vendors/personnel/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Personnel Removed')
    }
  })

  const contractMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/vendors/contracts/${data.id}` : `/api/v1/vendors/contracts/`
      const method = data.id ? 'PUT' : 'POST'
      if (!data.vendor_id) data.vendor_id = vendor.id
      return (await apiFetch(url, { method, body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setShowContractModal(null)
      setActiveContractDetails(null)
      toast.success('Contract Synchronized')
    }
  })

  const deleteContractMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/vendors/bulk-action`, { 
      method: 'POST', 
      body: JSON.stringify({ ids: [id], action: 'delete', target: 'contract' }) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Contract Terminated')
    }
  })

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-7xl h-[90vh] rounded-lg border border-blue-500/20 overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header Section */}
        <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
          <div className="space-y-4">
             <div className="flex items-center space-x-3">
                <div className="px-3 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-[9px] font-bold text-blue-400 uppercase tracking-widest">PARTNER_CODE: {vendor.id}</div>
                <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 uppercase tracking-widest">{vendor.country}</div>
             </div>
             <h1 className="text-5xl font-bold uppercase  tracking-tighter text-white">{vendor.name}</h1>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Nav */}
          <div className="w-64 border-r border-white/5 bg-black/20 p-6 space-y-1">
             {['Overview', 'Contracts', 'Personnel'].map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
                 {tab === 'Overview' && <LayoutGrid size={16} />}
                 {tab === 'Contracts' && <FileText size={16} />}
                 {tab === 'Personnel' && <User size={16} />}
                 <span className="text-[10px] font-bold uppercase tracking-widest">{tab}</span>
               </button>
             ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-[#020617]/40">
            {activeTab === 'Overview' && (
              <div className="space-y-8 max-w-3xl">
                <div className="flex items-center justify-between">
                   <SectionHeader icon={Info} title="Vendor Profile Overview" />
                   {!isEditing ? (
                     <button onClick={() => setIsEditing(true)} className="px-4 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Edit Profile</button>
                   ) : (
                     <div className="flex items-center space-x-2">
                        <button onClick={() => { setFormData({...vendor}); setIsEditing(false); }} className="px-4 py-1.5 bg-white/5 text-slate-400 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                        <button onClick={() => vendorMutation.mutate(formData)} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                          <Save size={12} /> Save Changes
                        </button>
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div>
                         <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Vendor Name</label>
                         {isEditing ? (
                           <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
                         ) : (
                           <p className="text-sm font-bold text-white uppercase">{vendor.name}</p>
                         )}
                      </div>
                      <div>
                         <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Country</label>
                         {isEditing ? (
                           <input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
                         ) : (
                           <p className="text-sm font-bold text-white uppercase">{vendor.country}</p>
                         )}
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div>
                         <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Primary Email</label>
                         {isEditing ? (
                           <input value={formData.primary_email} onChange={e => setFormData({...formData, primary_email: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
                         ) : (
                           <p className="text-sm font-bold text-white font-mono">{vendor.primary_email || '---'}</p>
                         )}
                      </div>
                      <div>
                         <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Primary Phone</label>
                         {isEditing ? (
                           <input value={formData.primary_phone} onChange={e => setFormData({...formData, primary_phone: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
                         ) : (
                           <p className="text-sm font-bold text-white uppercase">{vendor.primary_phone || '---'}</p>
                         )}
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'Contracts' && (
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <SectionHeader icon={FileText} title="Service Level Agreements" />
                    <button onClick={() => setShowContractModal({ title: '', contract_id: '', covered_systems: [], covered_assets: [], scope_of_work: [], schedule: {}, document_link: '', previous_contract_changes: '' })} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
                       <Plus size={14} /> Register New Contract
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4">
                    {vendor.contracts?.map((c: any) => (
                       <div key={c.id} className="bg-white/5 border border-white/5 rounded-lg p-6 group hover:bg-white/10 transition-all cursor-pointer" onClick={() => setActiveContractDetails(c)}>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-6">
                                <div className="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center text-blue-400 border border-white/5 group-hover:border-blue-500/30 transition-all">
                                   <FileText size={20} />
                                </div>
                                <div>
                                   <h4 className="text-sm font-bold text-white uppercase tracking-tight">{c.title}</h4>
                                   <div className="flex items-center space-x-3 mt-1 text-[9px] font-bold uppercase tracking-widest">
                                      <span className="text-slate-500">REF: {c.contract_id || '---'}</span>
                                      <span className="text-slate-700">|</span>
                                      <span className={new Date(c.expiry_date) < new Date() ? 'text-rose-500' : 'text-emerald-500'}>
                                        {c.expiry_date ? `EXP: ${new Date(c.expiry_date).toLocaleDateString()}` : 'OPEN-ENDED'}
                                      </span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center space-x-2">
                                <button onClick={(e) => { e.stopPropagation(); deleteContractMutation.mutate(c.id); }} className="p-2 text-slate-600 hover:text-rose-400 transition-all"><Trash2 size={16}/></button>
                                <ArrowRight size={16} className="text-slate-600 group-hover:text-blue-400 transition-all" />
                             </div>
                          </div>
                       </div>
                    ))}
                    {(!vendor.contracts || vendor.contracts.length === 0) && (
                       <div className="py-20 text-center text-slate-600  text-[10px] font-bold uppercase tracking-widest bg-black/20 rounded-lg border border-dashed border-white/5">No active service contracts found</div>
                    )}
                 </div>
              </div>
            )}

            {activeTab === 'Personnel' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <SectionHeader icon={User} title="Assigned Personnel" />
                  <button onClick={() => setShowPersonnelModal({ name: '', name_original: '', position: '', team: '', company_email: '', internal_email: '', phone: '', accounts: [], pcs: [] })} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
                    <Plus size={14} /> Add Member
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {vendor.personnel?.map((p: any) => (
                    <div key={p.id} className="bg-white/5 border border-white/5 rounded-lg p-6 group hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <User size={20} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                               <h4 className="text-sm font-bold text-white uppercase tracking-tight">{p.name}</h4>
                               {p.name_original && <span className="text-[10px] text-slate-500 font-bold">({p.name_original})</span>}
                            </div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.position} // {p.team}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => setShowPersonnelModal(p)} className="p-2 text-slate-500 hover:text-blue-400 transition-all"><Edit2 size={16}/></button>
                          <button onClick={() => deletePersonnelMutation.mutate(p.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-all"><Trash2 size={16}/></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-8">
                        <div className="space-y-4">
                          <p className="text-[8px] font-bold text-slate-600 uppercase border-b border-white/5 pb-1">Communications</p>
                          <div className="space-y-2">
                             <div className="flex items-center space-x-2 text-[10px] text-slate-300 font-mono"><Mail size={12} className="text-blue-500" /> <span>{p.company_email}</span></div>
                             {p.internal_email && <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono"><ShieldCheck size={12} className="text-emerald-500" /> <span>{p.internal_email}</span></div>}
                             <div className="flex items-center space-x-2 text-[10px] text-slate-300 font-mono"><Phone size={12} className="text-amber-500" /> <span>{p.phone}</span></div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <p className="text-[8px] font-bold text-slate-600 uppercase border-b border-white/5 pb-1">System Accounts ({p.accounts?.length || 0})</p>
                          <div className="space-y-1">
                            {p.accounts?.map((acc: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                                <span className="text-emerald-400">{acc.type}</span>
                                <span className="text-white">{acc.username}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <p className="text-[8px] font-bold text-slate-600 uppercase border-b border-white/5 pb-1">Managed Assets ({p.pcs?.length || 0})</p>
                          <div className="space-y-1">
                            {p.pcs?.map((pc: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                                <span className="text-indigo-400">{pc.type}</span>
                                <span className="text-white">{pc.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!vendor.personnel || vendor.personnel.length === 0) && (
                    <div className="py-20 text-center text-slate-600  text-[10px] font-bold uppercase tracking-widest bg-black/20 rounded-lg border border-dashed border-white/5">No personnel records identified</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPersonnelModal && (
          <PersonnelForm 
            item={showPersonnelModal} 
            onClose={() => setShowPersonnelModal(null)} 
            onSave={(d: any) => personnelMutation.mutate(d)}
            isSaving={personnelMutation.isPending}
          />
        )}
        {showContractModal && (
          <ContractRegistrationForm 
            item={showContractModal} 
            onClose={() => setShowContractModal(null)} 
            onSave={(d: any) => contractMutation.mutate(d)}
            isSaving={contractMutation.isPending}
          />
        )}
        {activeContractDetails && (
          <ContractDetailsForm 
            item={activeContractDetails} 
            devices={devices}
            systems={systems}
            onClose={() => setActiveContractDetails(null)} 
            onSave={(d: any) => contractMutation.mutate(d)}
            isSaving={contractMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PersonnelForm({ item, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })
  
  const addAccount = () => {
    const accs = [...(formData.accounts || []), { type: '', username: '', purpose_description: '' }]
    setFormData({ ...formData, accounts: accs })
  }
  
  const addPC = () => {
    const pcs = [...(formData.pcs || []), { name: '', type: 'PC', purpose_description: '' }]
    setFormData({ ...formData, pcs: pcs })
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[900px] max-h-[90vh] p-10 rounded-lg border border-blue-500/30 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h2 className="text-2xl font-bold uppercase text-blue-400 flex items-center gap-3"><User size={24} /> Member Credentials</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        <div className="grid grid-cols-2 gap-10 mt-8">
          <div className="space-y-6">
            <SectionHeader icon={User} title="Identity Info" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Name (English)</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Name (Original)</label>
                <input value={formData.name_original} onChange={e => setFormData({...formData, name_original: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Position</label>
                <input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Team</label>
                <input value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Email (Company)</label>
                <input value={formData.company_email} onChange={e => setFormData({...formData, company_email: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Email (Internal)</label>
                <input value={formData.internal_email} onChange={e => setFormData({...formData, internal_email: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Phone</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon={Key} title="System Accounts" color="text-emerald-400" />
                <button onClick={addAccount} className="p-1 text-emerald-400 hover:text-white transition-all hover:scale-110"><PlusCircle size={18}/></button>
              </div>
              <div className="space-y-3">
                {formData.accounts?.map((acc: any, i: number) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-lg space-y-2 relative group">
                    <button onClick={() => setFormData({...formData, accounts: formData.accounts.filter((_:any, idx:number) => idx !== i)})} className="absolute top-2 right-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash size={12}/></button>
                    <div className="grid grid-cols-2 gap-2">
                       <input placeholder="Type" value={acc.type} onChange={e => {
                         const newAccs = [...formData.accounts]; newAccs[i].type = e.target.value; setFormData({...formData, accounts: newAccs})
                       }} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white" />
                       <input placeholder="Username" value={acc.username} onChange={e => {
                         const newAccs = [...formData.accounts]; newAccs[i].username = e.target.value; setFormData({...formData, accounts: newAccs})
                       }} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white" />
                    </div>
                    <input placeholder="Purpose Description" value={acc.purpose_description} onChange={e => {
                      const newAccs = [...formData.accounts]; newAccs[i].purpose_description = e.target.value; setFormData({...formData, accounts: newAccs})
                    }} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon={Monitor} title="PC / VDI Assets" color="text-indigo-400" />
                <button onClick={addPC} className="p-1 text-indigo-400 hover:text-white transition-all hover:scale-110"><PlusCircle size={18}/></button>
              </div>
              <div className="space-y-3">
                {formData.pcs?.map((pc: any, i: number) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-lg space-y-2 relative group">
                    <button onClick={() => setFormData({...formData, pcs: formData.pcs.filter((_:any, idx:number) => idx !== i)})} className="absolute top-2 right-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash size={12}/></button>
                    <div className="grid grid-cols-2 gap-2">
                       <input placeholder="Asset Name" value={pc.name} onChange={e => {
                         const newPcs = [...formData.pcs]; newPcs[i].name = e.target.value; setFormData({...formData, pcs: newPcs})
                       }} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white" />
                       <select value={pc.type} onChange={e => {
                         const newPcs = [...formData.pcs]; newPcs[i].type = e.target.value; setFormData({...formData, pcs: newPcs})
                       }} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white">
                         <option value="PC">PC</option>
                         <option value="VDI">VDI</option>
                         <option value="Laptop">Laptop</option>
                       </select>
                    </div>
                    <input placeholder="Purpose Description" value={pc.purpose_description} onChange={e => {
                      const newPcs = [...formData.pcs]; newPcs[i].purpose_description = e.target.value; setFormData({...formData, pcs: newPcs})
                    }} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-10 mt-auto">
          <button onClick={onClose} className="flex-1 py-4 text-[11px] font-bold uppercase text-slate-500 hover:text-white transition-colors">Abort</button>
          <button onClick={() => onSave(formData)} className="flex-[2] py-4 bg-blue-600 text-white rounded-lg text-[11px] font-bold uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
            {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
            Synchronize Member
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ContractRegistrationForm({ item, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[500px] p-10 rounded-lg border border-blue-500/30 flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h2 className="text-2xl font-bold uppercase text-blue-400 flex items-center gap-3"><FileText size={24} /> New Contract</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        <div className="space-y-4 mt-8">
           <div>
             <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Contract Title</label>
             <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" placeholder="e.g. 2026 Global Support" />
           </div>
           <div>
             <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Contract ID</label>
             <input value={formData.contract_id} onChange={e => setFormData({...formData, contract_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
           </div>
           <div>
             <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Doc Link</label>
             <input value={formData.document_link} onChange={e => setFormData({...formData, document_link: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white font-mono" />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Effective Date</label>
                <input type="date" value={formData.effective_date?.split('T')[0]} onChange={e => setFormData({...formData, effective_date: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white [color-scheme:dark]" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Expiry Date</label>
                <input type="date" value={formData.expiry_date?.split('T')[0]} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white [color-scheme:dark]" />
              </div>
           </div>
        </div>

        <div className="flex space-x-3 pt-10 mt-auto">
          <button onClick={onClose} className="flex-1 py-4 text-[11px] font-bold uppercase text-slate-500 hover:text-white transition-colors">Discard</button>
          <button onClick={() => onSave(formData)} className="flex-[2] py-4 bg-blue-600 text-white rounded-lg text-[11px] font-bold uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
            {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
            Initialize Contract
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ContractDetailsForm({ item, devices, systems, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })
  const [isEditing, setIsEditing] = useState(false)

  const addSOW = () => {
    const sow = [...(formData.scope_of_work || []), { work_description: '', frequency: '', response: '', objective_description: '', importance: 'Medium' }]
    setFormData({ ...formData, scope_of_work: sow })
  }

  const filteredAssets = useMemo(() => {
    if (!formData.covered_systems || formData.covered_systems.length === 0) return [];
    return devices?.filter((d: any) => formData.covered_systems.includes(d.system)) || [];
  }, [devices, formData.covered_systems])

  const toggleSystem = (sys: string) => {
    const syss = [...(formData.covered_systems || [])]
    if (syss.includes(sys)) {
      setFormData({...formData, covered_systems: syss.filter(s => s !== sys)})
    } else {
      setFormData({...formData, covered_systems: [...syss, sys]})
    }
  }

  const toggleAsset = (assetId: number) => {
    const assets = [...(formData.covered_assets || [])]
    if (assets.includes(assetId)) {
      setFormData({...formData, covered_assets: assets.filter(id => id !== assetId)})
    } else {
      setFormData({...formData, covered_assets: [...assets, assetId]})
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[1100px] max-h-[95vh] p-10 rounded-lg border border-blue-500/30 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-6">
             <h2 className="text-2xl font-bold uppercase text-blue-400 flex items-center gap-3"><FileText size={24} /> Contract Details</h2>
             {!isEditing ? (
               <button onClick={() => setIsEditing(true)} className="px-4 py-1 bg-blue-600 text-white rounded text-[9px] font-bold uppercase tracking-widest">Enable Edit</button>
             ) : (
               <button onClick={() => setIsEditing(false)} className="px-4 py-1 bg-white/10 text-slate-400 rounded text-[9px] font-bold uppercase tracking-widest">View Mode</button>
             )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        <div className="grid grid-cols-2 gap-10 mt-8">
           <div className="space-y-8">
              <section>
                 <SectionHeader icon={Info} title="Administrative Info" />
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Contract Title</label>
                       <input readOnly={!isEditing} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
                    </div>
                    <div>
                       <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Contract ID</label>
                       <input readOnly={!isEditing} value={formData.contract_id} onChange={e => setFormData({...formData, contract_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white" />
                    </div>
                    <div>
                       <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Doc Link</label>
                       <input readOnly={!isEditing} value={formData.document_link} onChange={e => setFormData({...formData, document_link: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white font-mono" />
                    </div>
                    <div>
                       <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Effective Date</label>
                       <input readOnly={!isEditing} type="date" value={formData.effective_date?.split('T')[0]} onChange={e => setFormData({...formData, effective_date: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white [color-scheme:dark]" />
                    </div>
                    <div>
                       <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Expiry Date</label>
                       <input readOnly={!isEditing} type="date" value={formData.expiry_date?.split('T')[0]} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white [color-scheme:dark]" />
                    </div>
                 </div>
              </section>

              <section>
                 <SectionHeader icon={Layers} title="Infrastructure Coverage" color="text-indigo-400" />
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-bold text-slate-600 uppercase">Covered Systems</label>
                       <div className="bg-black/20 rounded-lg border border-white/5 p-2 h-40 overflow-y-auto custom-scrollbar space-y-1">
                          {systems?.map((s: any) => (
                             <label key={s.value} className="flex items-center space-x-2 p-1.5 hover:bg-white/5 rounded cursor-pointer transition-all">
                                <input disabled={!isEditing} type="checkbox" checked={formData.covered_systems?.includes(s.value)} onChange={() => toggleSystem(s.value)} className="w-3 h-3 rounded bg-slate-900" />
                                <span className="text-[10px] font-bold uppercase text-slate-300">{s.label}</span>
                             </label>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-bold text-slate-600 uppercase">Propagated Assets</label>
                       <div className="bg-black/20 rounded-lg border border-white/5 p-2 h-40 overflow-y-auto custom-scrollbar space-y-1">
                          {filteredAssets.length === 0 && <p className="text-[8px] text-slate-600 text-center py-10 uppercase font-bold">Select systems to list assets</p>}
                          {filteredAssets.map((a: any) => (
                             <label key={a.id} className="flex items-center space-x-2 p-1.5 hover:bg-white/5 rounded cursor-pointer transition-all">
                                <input disabled={!isEditing} type="checkbox" checked={formData.covered_assets?.includes(a.id)} onChange={() => toggleAsset(a.id)} className="w-3 h-3 rounded bg-slate-900" />
                                <div className="flex flex-col">
                                   <span className="text-[10px] font-bold uppercase text-white">{a.name}</span>
                                   <span className="text-[8px] text-slate-500 font-bold uppercase">{a.system}</span>
                                </div>
                             </label>
                          ))}
                       </div>
                    </div>
                 </div>
              </section>

              <section>
                 <SectionHeader icon={Clock} title="Availability & Policy" color="text-emerald-400" />
                 <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Work Schedule</label>
                          <input readOnly={!isEditing} value={formData.schedule?.work_schedule} onChange={e => setFormData({...formData, schedule: {...formData.schedule, work_schedule: e.target.value}})} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-xs text-white" />
                       </div>
                       <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">On-Call Method</label>
                          <input readOnly={!isEditing} value={formData.schedule?.oncall_method} onChange={e => setFormData({...formData, schedule: {...formData.schedule, oncall_method: e.target.value}})} className="w-full bg-slate-900 border border-white/10 rounded px-4 py-2 text-xs text-white" />
                       </div>
                    </div>
                    <div>
                       <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Holiday Policy</label>
                       <textarea readOnly={!isEditing} value={formData.schedule?.holiday_policy} onChange={e => setFormData({...formData, schedule: {...formData.schedule, holiday_policy: e.target.value}})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white min-h-[60px]" />
                    </div>
                 </div>
              </section>
           </div>

           <div className="space-y-8">
              <section>
                 <div className="flex items-center justify-between mb-4">
                    <SectionHeader icon={Terminal} title="Scope of Work Matrix" color="text-amber-400" />
                    {isEditing && <button onClick={addSOW} className="p-1 text-amber-400 hover:text-white transition-all"><PlusCircle size={18}/></button>}
                 </div>
                 <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {formData.scope_of_work?.map((s: any, i: number) => (
                       <div key={i} className="bg-white/5 p-4 rounded-lg border border-white/5 space-y-3 relative group">
                          {isEditing && <button onClick={() => setFormData({...formData, scope_of_work: formData.scope_of_work.filter((_:any, idx:number) => idx !== i)})} className="absolute top-2 right-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash size={12}/></button>}
                          <input readOnly={!isEditing} placeholder="Work Description" value={s.work_description} onChange={e => {
                            const newSow = [...formData.scope_of_work]; newSow[i].work_description = e.target.value; setFormData({...formData, scope_of_work: newSow})
                          }} className="w-full bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white" />
                          <div className="grid grid-cols-2 gap-2">
                             <input readOnly={!isEditing} placeholder="Frequency" value={s.frequency} onChange={e => {
                               const newSow = [...formData.scope_of_work]; newSow[i].frequency = e.target.value; setFormData({...formData, scope_of_work: newSow})
                             }} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white" />
                             <input readOnly={!isEditing} placeholder="Response" value={s.response} onChange={e => {
                               const newSow = [...formData.scope_of_work]; newSow[i].response = e.target.value; setFormData({...formData, scope_of_work: newSow})
                             }} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white" />
                             <input readOnly={!isEditing} placeholder="Objective Description" value={s.objective_description} onChange={e => {
                               const newSow = [...formData.scope_of_work]; newSow[i].objective_description = e.target.value; setFormData({...formData, scope_of_work: newSow})
                             }} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white col-span-2" />
                             <select disabled={!isEditing} value={s.importance} onChange={e => {
                               const newSow = [...formData.scope_of_work]; newSow[i].importance = e.target.value; setFormData({...formData, scope_of_work: newSow})
                             }} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white">
                                <option value="Critical">Critical</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                             </select>
                          </div>
                       </div>
                    ))}
                    {(!formData.scope_of_work || formData.scope_of_work.length === 0) && (
                       <p className="text-[9px] text-slate-600 text-center font-bold uppercase py-10">No scope items defined</p>
                    )}
                 </div>
              </section>

              <section>
                 <SectionHeader icon={RefreshCcw} title="Evolution & Changes" color="text-blue-400" />
                 <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">What changed from previous contract</label>
                 <textarea readOnly={!isEditing} value={formData.previous_contract_changes} onChange={e => setFormData({...formData, previous_contract_changes: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white min-h-[100px]" placeholder="Record key structural or commercial changes..." />
              </section>
           </div>
        </div>

        <div className="flex space-x-3 pt-10 mt-auto">
          <button onClick={onClose} className="flex-1 py-4 text-[11px] font-bold uppercase text-slate-500 hover:text-white transition-colors">Close</button>
          {isEditing && (
            <button onClick={() => onSave(formData)} className="flex-[2] py-4 bg-emerald-600 text-white rounded-lg text-[11px] font-bold uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
              Save Contract Changes
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
