import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Trash2, Cpu, Package, X, RefreshCcw, Search, Edit2, LayoutGrid, List, FileJson, 
  Check, MoreVertical, Settings, Sliders, Globe, Eye, EyeOff, ArrowRightLeft, Tag, 
  AlertCircle, Layers, Maximize2, Columns, Layout, Table as TableIcon, Zap, 
  Activity, Shield, MousePointer2, ChevronRight, BarChart3, Terminal
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiFetch } from "../api/apiClient"
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { StyledSelect } from "./shared/StyledSelect"
import { ServiceDetailsView, ServiceForm } from "./ServiceRegistry"

// --- Shared Components ---

const SharedServiceModals = ({ 
  activeDetails, 
  setActiveDetails, 
  activeEdit, 
  setActiveEdit, 
  options, 
  devices,
  onServiceUpdate
}: any) => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = `/api/v1/logical-services/${data.id}`
      const res = await apiFetch(url, { method: "PUT", body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["logical-services"] })
      queryClient.invalidateQueries({ queryKey: ["device-services"] })
      toast.success("Service Registry Updated")
      setActiveEdit(null)
      onServiceUpdate?.()
    },
    onError: (e: any) => toast.error(e.message)
  })

  return (
    <>
      <AnimatePresence>
        {activeEdit && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[800px] max-h-[90vh] overflow-y-auto p-12 rounded-[50px] border border-blue-500/30 custom-scrollbar">
               <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
                  <h2 className="text-2xl font-black uppercase flex items-center space-x-4 text-blue-400 italic">
                     <Layers size={28}/> <span>Modify Service Vector</span>
                  </h2>
                  <button onClick={() => setActiveEdit(null)} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 transition-colors"><X size={24}/></button>
               </div>
               <ServiceForm initialData={activeEdit} onSave={mutation.mutate} options={options} devices={devices} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[900px] max-h-[85vh] overflow-hidden p-12 rounded-[50px] border border-blue-500/30 flex flex-col">
               <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
                  <div>
                    <h2 className="text-3xl font-black uppercase text-blue-400 italic leading-none">{activeDetails.name}</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">{activeDetails.service_type} Matrix // Domain: {activeDetails.environment}</p>
                  </div>
                  <button onClick={() => setActiveDetails(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 transition-colors"><X size={32}/></button>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <ServiceDetailsView service={activeDetails} options={options} devices={devices} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

const AssetServicesTable = ({ deviceId, onViewDetails, onEdit }: any) => {
  const { data: services, isLoading } = useQuery({
    queryKey: ['device-services', deviceId],
    queryFn: async () => (await (await apiFetch(`/api/v1/logical-services/?device_id=${deviceId}`)).json())
  })

  return (
    <div className="overflow-hidden bg-black/20 rounded-3xl border border-white/5 shadow-inner">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500"><RefreshCcw size={24} className="animate-spin mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Scanning Logic Layers...</p></div>
      ) : (
        <table className="w-full text-[11px]">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-slate-500">Service Instance</th>
              <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-slate-500">Class</th>
              <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-slate-500">State</th>
              <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-slate-500">Domain</th>
              <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-slate-500">Build</th>
              <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-slate-500">Ops</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {services?.map((s: any) => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4 font-black text-blue-400 uppercase tracking-tighter group-hover:pl-8 transition-all">{s.name}</td>
                <td className="px-6 py-4 text-slate-400 font-bold uppercase text-[9px]">{s.service_type}</td>
                <td className="px-6 py-4 text-center">
                   <span className={`px-2.5 py-1 rounded text-[8px] font-black uppercase border ${
                      s.status === 'Running' || s.status === 'Active' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-rose-400 border-rose-500/20 bg-rose-500/10'
                   }`}>{s.status}</span>
                </td>
                <td className="px-6 py-4 text-center text-slate-500 font-black uppercase">{s.environment}</td>
                <td className="px-6 py-4 text-center font-mono text-slate-600">{s.version || '–'}</td>
                <td className="px-6 py-4 text-center">
                   <div className="flex items-center justify-center space-x-2">
                     <button onClick={() => onViewDetails(s)} className="p-2 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Maximize2 size={14}/></button>
                     <button onClick={() => onEdit(s)} className="p-2 bg-emerald-600/10 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Edit2 size={14}/></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// --- Variation Helper Components ---

const VARIATIONS = [
  { id: 1, name: 'Command Center', desc: 'Hyper-data density, technical focus', icon: Zap },
  { id: 2, name: 'Glass Master', desc: 'Floating glass rows, modern blur', icon: Layers },
  { id: 3, name: 'Nordic Clean', desc: 'High contrast, minimal hierarchy', icon: Shield },
  { id: 4, name: 'Cyber Matrix', desc: 'Samsung Blue, glowing interactive rows', icon: Activity },
  { id: 5, name: 'Enterprise Hub', desc: 'Collapsible grouping, bulk summaries', icon: LayoutGrid },
  { id: 6, name: 'Action Console', desc: 'Lean visuals, rapid operational focus', icon: MousePointer2 },
  { id: 7, name: 'Split Intelligence', desc: 'Dual-pane list & live detail HUD', icon: Columns },
]

export default function AssetGrid() {
  const [variation, setVariation] = useState(1)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('inventory')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [activeModal, setActiveModal] = useState<any>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  // Shared Modal States
  const [activeServiceDetails, setActiveServiceDetails] = useState<any>(null)
  const [activeServiceEdit, setActiveServiceEdit] = useState<any>(null)

  const { data: assets, isLoading } = useQuery({ 
    queryKey: ['assets'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/?include_deleted=true')).json() 
  })
  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) })
  const { data: devicesAll } = useQuery({ queryKey: ["devices-list-all"], queryFn: async () => (await (await apiFetch("/api/v1/devices/")).json()) })

  const inventoryAssets = useMemo(() => assets?.filter((a: any) => !a.is_deleted) || [], [assets])
  const deletedAssets = useMemo(() => assets?.filter((a: any) => a.is_deleted) || [], [assets])
  const currentAssets = activeTab === 'inventory' ? inventoryAssets : deletedAssets

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/devices/${data.id}` : '/api/v1/devices/'
      const method = data.id ? 'PUT' : 'POST'
      return (await apiFetch(url, { method, body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setActiveModal(null); setActiveDetails(null)
      toast.success('Asset Matrix Synchronized')
    }
  })

  // --- Rendering Variatons ---

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Variation Switcher (Temporary Tabs) */}
      <div className="flex flex-col space-y-4 bg-white/5 p-6 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden group">
         <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
         <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400"><Layout size={20}/></div>
               <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Golden Standard Calibration</h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Select table architecture for production baseline</p>
               </div>
            </div>
            <div className="flex items-center space-x-2 bg-black/40 p-1 rounded-2xl border border-white/5">
               {VARIATIONS.map((v) => (
                 <button 
                   key={v.id} 
                   onClick={() => setVariation(v.id)}
                   className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${variation === v.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                 >
                   {v.id}
                 </button>
               ))}
            </div>
         </div>
         <AnimatePresence mode="wait">
            <motion.div 
              key={variation}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
              className="flex items-center space-x-4 relative z-10"
            >
               <div className="px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase text-blue-400">Variation {variation}</div>
               <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight italic">"{VARIATIONS.find(v=>v.id===variation)?.name}" – {VARIATIONS.find(v=>v.id===variation)?.desc}</span>
            </motion.div>
         </AnimatePresence>
      </div>

      {/* Main Table Interface */}
      <div className="flex-1 flex flex-col min-h-0">
         {variation === 1 && <TableVariation1 assets={currentAssets} onRowClick={setActiveDetails} onSelectChange={setSelectedIds} activeTab={activeTab} setActiveTab={setActiveTab} inventoryCount={inventoryAssets.length} trashCount={deletedAssets.length} onRegister={()=>setActiveModal({})} />}
         {variation === 2 && <TableVariation2 assets={currentAssets} onRowClick={setActiveDetails} onSelectChange={setSelectedIds} />}
         {variation === 3 && <TableVariation3 assets={currentAssets} onRowClick={setActiveDetails} onSelectChange={setSelectedIds} />}
         {variation === 4 && <TableVariation4 assets={currentAssets} onRowClick={setActiveDetails} onSelectChange={setSelectedIds} />}
         {variation === 5 && <TableVariation5 assets={currentAssets} onRowClick={setActiveDetails} onSelectChange={setSelectedIds} />}
         {variation === 6 && <TableVariation6 assets={currentAssets} onRowClick={setActiveDetails} onSelectChange={setSelectedIds} />}
         {variation === 7 && <TableVariation7 assets={currentAssets} onRowClick={setActiveDetails} onSelectChange={setSelectedIds} />}
      </div>

      {/* Shared Modals */}
      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-6xl max-h-[90vh] flex flex-col p-12 rounded-[60px] border-blue-500/30">
                <div className="flex items-center justify-between border-b border-white/5 pb-10 mb-10">
                   <div className="flex items-center space-x-6">
                      <div className="p-5 bg-blue-600/10 rounded-[2.5rem] text-blue-400 shadow-inner"><Server size={32}/></div>
                      <div>
                         <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">{activeDetails.name}</h2>
                         <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">{activeDetails.system} // {activeDetails.type} Forensic Node</p>
                      </div>
                   </div>
                   <button onClick={() => setActiveDetails(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-3xl text-slate-500 transition-all"><X size={32}/></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <AssetDetailsView 
                     device={activeDetails} 
                     options={options} 
                     onViewServiceDetails={(s:any)=>setActiveServiceDetails(s)}
                     onEditService={(s:any)=>setActiveServiceEdit(s)}
                   />
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SharedServiceModals 
        activeDetails={activeServiceDetails} setActiveDetails={setActiveServiceDetails}
        activeEdit={activeServiceEdit} setActiveEdit={setActiveServiceEdit}
        options={options} devices={devicesAll}
        onServiceUpdate={() => queryClient.invalidateQueries({ queryKey: ['device-services'] })}
      />
    </div>
  )
}

// --- Variation 1: The Technical Command Center (Data-Dense AgGrid) ---

function TableVariation1({ assets, onRowClick, onSelectChange, activeTab, setActiveTab, inventoryCount, trashCount, onRegister }: any) {
  const columnDefs = useMemo(() => [
    { field: "id", headerName: "", width: 50, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left' },
    { field: "name", headerName: "Node", flex: 1.5, pinned: 'left', cellClass: 'font-black text-blue-400 uppercase tracking-tighter' },
    { field: "system", headerName: "System", width: 120, cellClass: 'text-center font-bold text-slate-300' },
    { field: "status", headerName: "Status", width: 110, cellRenderer: (p: any) => <span className="px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[8px] font-black uppercase">{p.value}</span> },
    { field: "environment", headerName: "Env", width: 90, cellClass: 'text-center font-black text-slate-500' },
    { field: "manufacturer", headerName: "Make", width: 100 },
    { field: "model", headerName: "Model", width: 120 },
    { field: "management_ip", headerName: "Mgmt IP", width: 130, cellClass: 'font-mono text-[10px] text-blue-300' },
    { field: "owner", headerName: "Owner", width: 120 },
    { headerName: "Ops", width: 80, pinned: 'right', cellRenderer: () => <button className="p-1.5 hover:bg-blue-600 rounded-lg text-slate-500 hover:text-white transition-all"><Maximize2 size={14}/></button> }
  ], [])

  return (
    <div className="flex-1 flex flex-col space-y-4">
       <div className="flex items-center justify-between">
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
             <button onClick={()=>setActiveTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab==='inventory'?'bg-blue-600 text-white':'text-slate-500'}`}>Operational ({inventoryCount})</button>
             <button onClick={()=>setActiveTab('trash')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab==='trash'?'bg-rose-600 text-white':'text-slate-500'}`}>Purged ({trashCount})</button>
          </div>
          <button onClick={onRegister} className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">+ Register Matrix Node</button>
       </div>
       <div className="flex-1 glass-panel rounded-[40px] overflow-hidden ag-theme-alpine-dark relative border-white/5 shadow-2xl">
          <AgGridReact 
            rowData={assets} columnDefs={columnDefs as any}
            rowSelection="multiple" headerHeight={45} rowHeight={45}
            onSelectionChanged={e => onSelectChange(e.api.getSelectedNodes().map(n=>n.data.id))}
            onRowClicked={e => onRowClick(e.data)}
          />
       </div>
       <style>{`
         .ag-theme-alpine-dark {
           --ag-background-color: transparent;
           --ag-header-background-color: rgba(255,255,255,0.03);
           --ag-border-color: rgba(255,255,255,0.05);
           --ag-font-family: 'Inter', sans-serif;
           --ag-font-size: 11px;
         }
         .ag-root-wrapper { border: none !important; }
         .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.15em !important; font-size: 10px !important; }
         .ag-cell { display: flex; align-items: center; justify-content: center !important; }
       `}</style>
    </div>
  )
}

// --- Variation 2: The Glass Master (Floating Visual Rows) ---

function TableVariation2({ assets, onRowClick }: any) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
       {assets.map((a: any) => (
         <motion.div 
           key={a.id} whileHover={{ x: 10 }}
           onClick={() => onRowClick(a)}
           className="glass-panel p-6 rounded-[32px] border-white/5 flex items-center justify-between cursor-pointer group hover:bg-blue-600/5 hover:border-blue-500/20 transition-all"
         >
            <div className="flex items-center space-x-6">
               <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-blue-600/10 group-hover:scale-110 transition-all">
                  <Server size={24} className="text-slate-500 group-hover:text-blue-400" />
               </div>
               <div className="flex flex-col">
                  <span className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">{a.name}</span>
                  <div className="flex items-center space-x-3 mt-2">
                     <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest bg-blue-600/10 px-2 py-0.5 rounded-lg border border-blue-500/20">{a.system}</span>
                     <span className="text-[9px] font-bold text-slate-500 uppercase">{a.type} // {a.environment}</span>
                  </div>
               </div>
            </div>
            
            <div className="flex items-center space-x-12">
               <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Operational State</span>
                  <div className={`w-3 h-3 rounded-full ${a.status==='Active'?'bg-emerald-500 shadow-[0_0_10px_#10b981]':'bg-slate-700'}`} />
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Energy Vector</span>
                  <span className="text-sm font-mono text-white font-bold">{a.power_typical_w}W</span>
               </div>
               <ChevronRight size={24} className="text-slate-700 group-hover:text-blue-400 group-hover:translate-x-2 transition-all" />
            </div>
         </motion.div>
       ))}
    </div>
  )
}

// --- Variation 3: Nordic Clean (Minimalist High-Contrast) ---

function TableVariation3({ assets, onRowClick }: any) {
  return (
    <div className="flex-1 bg-white/[0.02] rounded-[40px] border border-white/5 overflow-hidden flex flex-col">
       <div className="grid grid-cols-12 px-10 py-5 border-b border-white/5 bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          <div className="col-span-4">Node Matrix</div>
          <div className="col-span-2 text-center">System Domain</div>
          <div className="col-span-2 text-center">Operational Status</div>
          <div className="col-span-2 text-center">Owner</div>
          <div className="col-span-2 text-right">Ops</div>
       </div>
       <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
          {assets.map((a: any) => (
            <div key={a.id} onClick={()=>onRowClick(a)} className="grid grid-cols-12 px-10 py-6 hover:bg-blue-600/5 cursor-pointer transition-colors items-center group">
               <div className="col-span-4 flex items-center space-x-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{a.name}</span>
               </div>
               <div className="col-span-2 text-center text-[11px] font-black text-slate-400">{a.system}</div>
               <div className="col-span-2 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase border border-white/10 px-3 py-1 rounded-full">{a.status}</span>
               </div>
               <div className="col-span-2 text-center text-[11px] font-medium text-slate-500 italic">{a.owner}</div>
               <div className="col-span-2 text-right">
                  <button className="text-slate-700 hover:text-white transition-colors uppercase text-[9px] font-black tracking-widest">Inspect</button>
               </div>
            </div>
          ))}
       </div>
    </div>
  )
}

// --- Variation 4: Cyber Matrix (Samsung Blue / Interactive Glow) ---

function TableVariation4({ assets, onRowClick }: any) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 grid grid-cols-2 gap-6">
       {assets.map((a: any) => (
         <motion.div 
           key={a.id} 
           whileHover={{ scale: 1.02, rotateY: 5 }}
           onClick={() => onRowClick(a)}
           className="glass-panel p-8 rounded-[40px] border border-blue-500/10 hover:border-blue-500/40 cursor-pointer relative overflow-hidden group shadow-2xl"
         >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
               <Activity size={120} className="text-blue-400" />
            </div>
            
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-8">
                  <div className="p-4 bg-blue-600/20 rounded-3xl text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-blue-500/20 shadow-xl">
                     <Shield size={24} />
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Operational</span>
                     <span className="text-xs font-mono text-slate-500 mt-1 uppercase">NODE_ID: {a.id}</span>
                  </div>
               </div>
               
               <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2 group-hover:translate-x-2 transition-transform">{a.name}</h3>
               <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-8">{a.system} // {a.manufacturer} {a.model}</p>
               
               <div className="flex items-center justify-between border-t border-white/5 pt-6">
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-600 uppercase mb-1">Matrix Environment</span>
                     <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{a.environment}</span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[8px] font-black text-slate-600 uppercase mb-1">Power Payload</span>
                     <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{a.power_max_w}W MAX</span>
                  </div>
               </div>
            </div>
         </motion.div>
       ))}
    </div>
  )
}

// --- Variation 5: Enterprise Hub (Grouping & Summaries) ---

function TableVariation5({ assets, onRowClick }: any) {
  const groups = useMemo(() => {
    const g: any = {}
    assets.forEach((a:any) => {
      if (!g[a.system]) g[a.system] = []
      g[a.system].push(a)
    })
    return g
  }, [assets])

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-4">
       {Object.entries(groups).map(([system, nodes]: any) => (
         <div key={system} className="space-y-4">
            <div className="flex items-center justify-between px-10">
               <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 font-black italic">S</div>
                  <div>
                     <h3 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">{system}</h3>
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{nodes.length} Logical Units Registered</p>
                  </div>
               </div>
               <div className="flex items-center space-x-8">
                  <div className="flex flex-col items-end">
                     <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Total Consumption</span>
                     <span className="text-sm font-black text-blue-400 uppercase">{nodes.reduce((acc:number, n:any)=>acc+(n.power_typical_w||0), 0)}W</span>
                  </div>
                  <button className="p-2 hover:bg-white/5 rounded-xl text-slate-500"><MoreVertical size={20}/></button>
               </div>
            </div>
            
            <div className="glass-panel rounded-[40px] overflow-hidden border-white/5 divide-y divide-white/5">
               {nodes.map((a: any) => (
                 <div key={a.id} onClick={()=>onRowClick(a)} className="flex items-center justify-between px-10 py-5 hover:bg-white/[0.03] cursor-pointer transition-colors group">
                    <div className="flex items-center space-x-6">
                       <span className="text-sm font-bold text-white uppercase group-hover:text-blue-400">{a.name}</span>
                       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{a.type}</span>
                    </div>
                    <div className="flex items-center space-x-10">
                       <span className="text-[10px] font-mono text-slate-500">{a.management_ip}</span>
                       <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border ${a.status==='Active'?'text-emerald-400 border-emerald-500/20 bg-emerald-500/5':'text-slate-500 border-white/10'}`}>{a.status}</span>
                    </div>
                 </div>
               ))}
            </div>
         </div>
       ))}
    </div>
  )
}

// --- Variation 6: Action Console (Operational High-Performance) ---

function TableVariation6({ assets, onRowClick }: any) {
  return (
    <div className="flex-1 glass-panel rounded-[40px] overflow-hidden border-white/5 flex flex-col shadow-2xl">
       <div className="flex items-center justify-between px-10 py-6 border-b border-white/5 bg-black/20">
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 italic">Operational Registry Matrix</h3>
          <div className="flex items-center space-x-4">
             <button className="p-2 hover:bg-blue-600/20 text-blue-400 rounded-xl transition-all"><Settings size={18}/></button>
             <button className="p-2 hover:bg-emerald-600/20 text-emerald-400 rounded-xl transition-all"><Plus size={18}/></button>
          </div>
       </div>
       <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-[11px] text-left">
             <thead className="sticky top-0 bg-slate-900 border-b border-white/10 z-10">
                <tr>
                   <th className="pl-10 pr-6 py-4 font-black uppercase tracking-widest text-slate-600">ID</th>
                   <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-600">Identifer</th>
                   <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-600 text-center">Status</th>
                   <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-600">System</th>
                   <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-600">Management</th>
                   <th className="pr-10 pl-6 py-4 font-black uppercase tracking-widest text-slate-600 text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {assets.map((a: any) => (
                  <tr key={a.id} className="hover:bg-white/[0.02] group transition-colors">
                     <td className="pl-10 pr-6 py-4 font-mono text-slate-600 text-[10px]">#{a.id}</td>
                     <td className="px-6 py-4 font-black uppercase text-white group-hover:text-blue-400 transition-colors">{a.name}</td>
                     <td className="px-6 py-4 text-center">
                        <div className={`w-2 h-2 rounded-full mx-auto ${a.status==='Active'?'bg-emerald-500 shadow-[0_0_8px_#10b981]':'bg-slate-700'}`} />
                     </td>
                     <td className="px-6 py-4 text-slate-400 font-bold uppercase">{a.system}</td>
                     <td className="px-6 py-4 text-blue-400/70 font-mono text-[10px] underline cursor-pointer">{a.management_ip}</td>
                     <td className="pr-10 pl-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={()=>onRowClick(a)} className="p-2 hover:bg-blue-600 rounded-lg text-white transition-all"><Eye size={14}/></button>
                           <button className="p-2 hover:bg-emerald-600 rounded-lg text-white transition-all"><Edit2 size={14}/></button>
                           <button className="p-2 hover:bg-rose-600 rounded-lg text-white transition-all"><Trash2 size={14}/></button>
                        </div>
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  )
}

// --- Variation 7: Split Intelligence (List + Live HUD) ---

function TableVariation7({ assets, onSelectChange }: any) {
  const [hovered, setHovered] = useState<any>(assets[0] || null)

  return (
    <div className="flex-1 flex space-x-6 min-h-0">
       <div className="w-[450px] glass-panel rounded-[40px] border-white/5 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
             <h3 className="text-xs font-black uppercase tracking-widest text-white italic">Vector Queue</h3>
             <span className="text-[10px] font-black text-slate-500 uppercase">{assets.length} In-Scope</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
             {assets.map((a: any) => (
               <div 
                 key={a.id} onMouseEnter={()=>setHovered(a)}
                 className={`p-4 rounded-2xl border cursor-pointer transition-all ${hovered?.id===a.id?'bg-blue-600 border-blue-500 text-white shadow-lg':'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
               >
                  <div className="flex items-center justify-between">
                     <span className="font-black uppercase italic tracking-tighter">{a.name}</span>
                     <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">{a.system}</span>
                  </div>
               </div>
             ))}
          </div>
       </div>
       
       <div className="flex-1 flex flex-col min-h-0 space-y-6">
          <AnimatePresence mode="wait">
             {hovered && (
               <motion.div 
                 key={hovered.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                 className="flex-1 glass-panel rounded-[50px] border-white/5 p-12 relative overflow-hidden flex flex-col shadow-2xl"
               >
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                     <BarChart3 size={300} className="text-blue-400" />
                  </div>
                  
                  <div className="relative z-10 flex flex-col h-full">
                     <div className="flex items-start justify-between mb-12">
                        <div>
                           <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white leading-none">{hovered.name}</h2>
                           <div className="flex items-center space-x-4 mt-4">
                              <span className="px-3 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg shadow-lg shadow-emerald-500/20">{hovered.status}</span>
                              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{hovered.type} // {hovered.environment}</span>
                           </div>
                        </div>
                        <div className="flex space-x-2">
                           <button className="p-4 bg-white/5 hover:bg-blue-600 rounded-3xl text-white transition-all shadow-xl"><Edit2 size={24}/></button>
                           <button className="p-4 bg-white/5 hover:bg-rose-600 rounded-3xl text-white transition-all shadow-xl"><Trash2 size={24}/></button>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-12 mb-12">
                        <div className="space-y-6">
                           <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Global Administrative Reference</span>
                              <p className="text-lg font-bold text-white">{hovered.owner} // {hovered.business_unit}</p>
                           </div>
                           <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Network Interface Payload</span>
                              <p className="text-2xl font-mono font-black text-blue-400 italic leading-none">{hovered.management_ip}</p>
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Hardware Specifications</span>
                              <p className="text-lg font-bold text-white uppercase">{hovered.manufacturer} {hovered.model}</p>
                           </div>
                           <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Matrix Registry Info</span>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">SN: {hovered.serial_number} // AT: {hovered.asset_tag}</p>
                           </div>
                        </div>
                     </div>
                     
                     <div className="flex-1 bg-black/40 rounded-[3rem] border border-white/5 p-8 flex items-center justify-center text-center shadow-inner group overflow-hidden">
                        <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex flex-col items-center">
                           <Terminal size={40} className="text-blue-500/40 mb-4 group-hover:text-blue-400 transition-colors" />
                           <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.4em]">Live Intelligence Matrix Ready</p>
                           <p className="text-[9px] font-bold text-slate-700 uppercase mt-2 italic opacity-60">Scanning for active telemetry vectors...</p>
                        </div>
                     </div>
                  </div>
               </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  )
}

// --- Full Details View (Used by all variations) ---

const AssetDetailsView = ({ device, options, onViewServiceDetails, onEditService }: any) => {
    const [tab, setTab] = useState('hardware')
    const queryClient = useQueryClient()
    const [metadata, setMetadata] = useState(device.metadata_json || {})
    const [metadataError, setMetadataError] = useState<string | null>(null)

    const metaMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiFetch(`/api/v1/devices/${device.id}`, {
                method: 'PUT', body: JSON.stringify({ metadata_json: data })
            })
            if (!res.ok) throw new Error(await res.text())
            return res.json()
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); toast.success('Intelligence Matrix Synchronized') },
        onError: (e: any) => toast.error(e.message || 'Failed to save metadata')
    })

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <div className="flex space-x-2 bg-black/40 p-1.5 rounded-[2rem] w-fit border border-white/5">
                    {['hardware', 'secrets', 'relations', 'services', 'metadata'].map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`px-10 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}>
                            {t}
                        </button>
                    ))}
                </div>
                {tab === 'metadata' && (
                    <button
                      disabled={!!metadataError || metaMutation.isPending}
                      onClick={() => metaMutation.mutate(metadata)}
                      className={`px-8 py-3 ${metadataError || metaMutation.isPending ? 'bg-slate-700 opacity-50' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 shadow-xl'} text-white rounded-[1.5rem] text-[11px] font-black uppercase active:scale-95 transition-all flex items-center space-x-3`}
                    >
                      {metaMutation.isPending ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Synchronize Matrix</span>
                    </button>
                )}
            </div>
            
            <div className="glass-panel rounded-[50px] border-white/5 overflow-hidden p-10 bg-white/[0.01] shadow-inner">
                {tab === 'metadata' && <MetadataEditor value={metadata} onChange={setMetadata} onError={setMetadataError} />}
                {tab === 'hardware' && <HWTab deviceId={device.id} />}
                {tab === 'secrets' && <SecretsTab deviceId={device.id} />}
                {tab === 'relations' && <RelationshipsTab deviceId={device.id} />}
                {tab === 'services' && <AssetServicesTable deviceId={device.id} onViewDetails={onViewServiceDetails} onEdit={onEditService} />}
            </div>
        </div>
    )
}

const HWTab = ({ deviceId }: any) => (
  <div className="py-20 text-center opacity-30 flex flex-col items-center">
     <Cpu size={48} className="mb-4" />
     <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Hardware Intelligence Vector Null</p>
  </div>
)
const SecretsTab = ({ deviceId }: any) => (
  <div className="py-20 text-center opacity-30 flex flex-col items-center">
     <Shield size={48} className="mb-4" />
     <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Encrypted Payload Matrix Restricted</p>
  </div>
)
const RelationshipsTab = ({ deviceId }: any) => (
  <div className="py-20 text-center opacity-30 flex flex-col items-center">
     <ArrowRightLeft size={48} className="mb-4" />
     <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Relationship Graph Not Initialized</p>
  </div>
)

const MetadataEditor = ({ value, onChange, onError }: any) => {
  const [json, setJson] = useState(() => JSON.stringify(value || {}, null, 2))
  useEffect(() => {
    try {
      const obj = JSON.parse(json)
      onChange(obj); onError(null)
    } catch (e) {
      onError("Invalid JSON Payload")
    }
  }, [json])

  return (
    <div className="space-y-4">
       <div className="flex items-center space-x-3 text-blue-400 mb-2">
          <FileJson size={20} />
          <span className="text-[11px] font-black uppercase tracking-[0.3em]">JSON Metadata Interface</span>
       </div>
       <textarea 
         value={json} onChange={e=>setJson(e.target.value)} 
         className="w-full h-96 bg-black/40 border border-white/10 rounded-[2.5rem] p-10 text-[12px] font-mono text-blue-300 outline-none focus:border-blue-500 shadow-inner"
       />
    </div>
  )
}
