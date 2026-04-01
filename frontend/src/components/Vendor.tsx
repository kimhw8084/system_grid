import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, Globe, 
  Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, Shield, Eye,
  FileText, Briefcase, Calendar, LayoutGrid, List,
  Terminal, Monitor, Key, Clock, ShieldCheck, Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'

// --- Components ---

const SectionHeader = ({ icon: Icon, title, color = "text-blue-400" }: any) => (
  <div className="flex items-center space-x-3 border-b border-white/5 pb-2 mb-4">
    <Icon size={16} className={color} />
    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</h3>
  </div>
)

const InfoCard = ({ label, value, icon: Icon }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
    <div className="flex items-center space-x-2 text-slate-500">
      <Icon size={12} />
      <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-xs font-bold text-white uppercase tracking-tight">{value || '---'}</p>
  </div>
)

export default function Vendor() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const { data: vendors, isLoading } = useQuery({ 
    queryKey: ['vendors'], 
    queryFn: async () => (await apiFetch('/api/v1/vendors/')).json() 
  })

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
    { field: "name", headerName: "Vendor Name", flex: 1, pinned: 'left', cellClass: 'font-bold text-white uppercase tracking-tight' },
    { field: "organization", headerName: "Organization", width: 150 },
    { field: "contact_email", headerName: "Primary Contact", width: 200, cellClass: 'text-blue-400 font-mono text-[10px]' },
    { field: "work_schedule", headerName: "Service Hours", width: 150, cellClass: 'text-center' },
    { field: "pc_info.hostname", headerName: "Vendor PC", width: 130, cellRenderer: (p: any) => p.value || 'None' },
    {
      headerName: "Action",
      width: 100,
      pinned: 'right',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <button onClick={() => setActiveDetails(p.data)} className="p-1.5 bg-blue-600/10 text-blue-400 rounded-lg hover:bg-blue-600/20 transition-all"><Eye size={14}/></button>
           <button onClick={() => setActiveModal(p.data)} className="p-1.5 bg-emerald-600/10 text-emerald-400 rounded-lg hover:bg-emerald-600/20 transition-all"><Edit2 size={14}/></button>
           <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge Vendor', message: 'Erase vendor record?', onConfirm: () => deleteMutation.mutate(p.data.id) })} className="p-1.5 bg-rose-600/10 text-rose-400 rounded-lg hover:bg-rose-600/20 transition-all"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], [])

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-3">
            <Globe size={32} className="text-blue-500" /> Vendor Intelligence
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">Comprehensive Partner Registry & Contractual Compliance Hub</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search partners..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>
          <button onClick={() => setActiveModal({ name: '', organization: '', pc_info: {}, account_info: {}, on_call_info: {} })} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Add Partner</button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing partner data...</p>
          </div>
        )}
        <AgGridReact 
          rowData={vendors || []} 
          columnDefs={columnDefs as any}
          headerHeight={32}
          rowHeight={32}
          quickFilterText={searchTerm}
        />
      </div>

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
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
        onConfirm={confirmModal.onConfirm} 
        title={confirmModal.title} 
        message={confirmModal.message} 
      />

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
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: 9px !important; }
        .ag-cell { display: flex; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05) !important; padding-left: 12px !important; }
      `}</style>
    </div>
  )
}

function VendorForm({ item, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[800px] p-10 rounded-[40px] border border-blue-500/30 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h2 className="text-2xl font-black uppercase text-blue-400 flex items-center gap-3">
            <Briefcase size={24} /> Partner Configuration
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-6">
          <div className="space-y-6">
            <SectionHeader icon={User} title="Core Identity" />
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Full Name</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Organization / Vendor</label>
                <input value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Email</label>
                  <input value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Phone</label>
                  <input value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white" />
                </div>
              </div>
            </div>

            <SectionHeader icon={Clock} title="Availability & Logistics" color="text-amber-400" />
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Work Schedule</label>
                <input value={formData.work_schedule} onChange={e => setFormData({...formData, work_schedule: e.target.value})} placeholder="e.g. Mon-Fri 09:00-18:00" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white" />
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <input type="checkbox" checked={formData.on_call_info?.is_on_call} onChange={e => setFormData({...formData, on_call_info: {...formData.on_call_info, is_on_call: e.target.checked}})} className="w-4 h-4 rounded bg-slate-900 border-white/10" />
                <label className="text-[10px] font-black uppercase text-slate-300">Enrolled in On-Call Rotation</label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <SectionHeader icon={Monitor} title="Infrastructure Assets" color="text-indigo-400" />
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
              <h4 className="text-[9px] font-black uppercase text-slate-500 italic">Work PC Specification</h4>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Hostname" value={formData.pc_info?.hostname} onChange={e => setFormData({...formData, pc_info: {...formData.pc_info, hostname: e.target.value}})} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white" />
                <input placeholder="IP Address" value={formData.pc_info?.ip} onChange={e => setFormData({...formData, pc_info: {...formData.pc_info, ip: e.target.value}})} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white" />
              </div>
              <input placeholder="Serial / Asset Tag" value={formData.pc_info?.serial} onChange={e => setFormData({...formData, pc_info: {...formData.pc_info, serial: e.target.value}})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white" />
            </div>

            <SectionHeader icon={Key} title="Identity & Access" color="text-emerald-400" />
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Corporate Account</label>
                <input placeholder="Username" value={formData.account_info?.username} onChange={e => setFormData({...formData, account_info: {...formData.account_info, username: e.target.value}})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Access Method / Notes</label>
                <textarea value={formData.access_details} onChange={e => setFormData({...formData, access_details: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-300 min-h-[80px]" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-10 mt-auto">
          <button onClick={onClose} className="flex-1 py-4 text-[11px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abort</button>
          <button onClick={() => onSave(formData)} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
            {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
            Sync Partner Matrix
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function VendorDetails({ vendor, devices, onClose }: any) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('Overview')
  const [showContractModal, setShowContractModal] = useState(false)

  const { data: contracts } = useQuery({
    queryKey: ['vendor-contracts', vendor.id],
    queryFn: async () => (await apiFetch(`/api/v1/vendors/contracts/`)).json(),
    select: (data: any[]) => data.filter(c => c.vendor_id === vendor.id)
  })

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-6xl h-[90vh] rounded-[40px] border border-blue-500/20 overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header Section */}
        <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
          <div className="space-y-4">
             <div className="flex items-center space-x-3">
                <div className="px-3 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-[9px] font-black text-blue-400 uppercase tracking-widest">PARTNER_ID: {vendor.id}</div>
                <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">{vendor.organization}</div>
             </div>
             <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">{vendor.name}</h1>
             <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 text-slate-400 font-mono text-xs"><Globe size={14} className="text-blue-500" /> <span>{vendor.contact_email}</span></div>
                <div className="flex items-center space-x-2 text-slate-400 font-mono text-xs"><Clock size={14} className="text-amber-500" /> <span>{vendor.work_schedule || 'SCHEDULE_NOT_DEFINED'}</span></div>
             </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Nav */}
          <div className="w-56 border-r border-white/5 bg-black/20 p-6 space-y-1">
             {['Overview', 'Infrastructure', 'Contracts'].map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
                 {tab === 'Overview' && <LayoutGrid size={16} />}
                 {tab === 'Infrastructure' && <Monitor size={16} />}
                 {tab === 'Contracts' && <FileText size={16} />}
                 <span className="text-[10px] font-black uppercase tracking-widest">{tab}</span>
               </button>
             ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
            {activeTab === 'Overview' && (
              <div className="grid grid-cols-2 gap-10 max-w-4xl">
                 <div className="space-y-8">
                    <section>
                       <SectionHeader icon={User} title="Contact Information" />
                       <div className="grid grid-cols-1 gap-4">
                          <InfoCard label="Primary Email" value={vendor.contact_email} icon={Globe} />
                          <InfoCard label="Direct Phone" value={vendor.contact_phone} icon={User} />
                       </div>
                    </section>
                    <section>
                       <SectionHeader icon={Clock} title="Work & On-Call" color="text-amber-400" />
                       <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
                          <p className="text-xs font-bold text-slate-300 italic">" {vendor.work_schedule || 'Shift pattern not documented' } "</p>
                          {vendor.on_call_info?.is_on_call && (
                             <div className="flex items-center space-x-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                                <ShieldCheck size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Enrolled in Active Rotation</span>
                             </div>
                          )}
                       </div>
                    </section>
                 </div>
                 <div className="space-y-8">
                    <section>
                       <SectionHeader icon={Key} title="Identity & Access Details" color="text-emerald-400" />
                       <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4 min-h-[200px]">
                          <div className="flex items-center space-x-3">
                             <div className="p-2 rounded bg-emerald-500/10"><User size={14} className="text-emerald-400" /></div>
                             <span className="text-xs font-mono font-bold text-white uppercase">{vendor.account_info?.username || 'NO_ACCOUNT'}</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{vendor.access_details || 'No special access instructions defined.'}</p>
                       </div>
                    </section>
                 </div>
              </div>
            )}

            {activeTab === 'Infrastructure' && (
              <div className="max-w-3xl">
                 <SectionHeader icon={Monitor} title="Partner Assigned Hardware" color="text-indigo-400" />
                 <div className="bg-white/5 border border-white/10 rounded-[32px] p-10 flex items-center space-x-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Monitor size={120} /></div>
                    <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 shrink-0">
                       <Terminal size={48} className="text-white" />
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-x-12 gap-y-6 relative z-10">
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-500 uppercase">Hostname</p>
                          <p className="text-lg font-black text-white italic">{vendor.pc_info?.hostname || 'UNREGISTERED'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-500 uppercase">IP Address</p>
                          <p className="text-lg font-black text-indigo-400 font-mono">{vendor.pc_info?.ip || '0.0.0.0'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-500 uppercase">Serial Number</p>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{vendor.pc_info?.serial || '---'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-500 uppercase">Operating System</p>
                          <p className="text-sm font-bold text-slate-400 uppercase">{vendor.pc_info?.os || 'STANDARD_IMG'}</p>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'Contracts' && (
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <SectionHeader icon={FileText} title="Vendor Service Contracts" />
                    <button onClick={() => setShowContractModal(true)} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
                       <Plus size={14} /> Register Contract
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4">
                    {contracts?.map((c: any) => (
                       <div key={c.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 flex items-center justify-between group hover:bg-white/10 transition-all">
                          <div className="flex items-center space-x-6">
                             <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center text-blue-400 border border-white/5 group-hover:scale-110 transition-all">
                                <FileText size={20} />
                             </div>
                             <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-tight">{c.title}</h4>
                                <div className="flex items-center space-x-3 mt-1">
                                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">NO: {c.contract_number}</span>
                                   <span className="text-slate-700">•</span>
                                   <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">ENDS: {new Date(c.end_date).toLocaleDateString()}</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex items-center space-x-4">
                             <div className="text-right">
                                <p className="text-[8px] font-black text-slate-600 uppercase">Support Nodes</p>
                                <p className="text-xs font-bold text-slate-300">{c.coverage_links?.length || 0} Assets Covered</p>
                             </div>
                             <button className="p-2 text-slate-500 hover:text-white transition-all"><ArrowRight size={18}/></button>
                          </div>
                       </div>
                    ))}
                    {(!contracts || contracts.length === 0) && (
                       <div className="py-20 text-center text-slate-600 italic text-[10px] font-black uppercase tracking-widest bg-black/20 rounded-3xl border border-dashed border-white/5">No active service contracts found for this vendor</div>
                    )}
                 </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
         {showContractModal && (
           <ContractForm 
              vendorId={vendor.id} 
              devices={devices} 
              onClose={() => setShowContractModal(false)} 
              onSave={(d:any) => {
                 apiFetch('/api/v1/vendors/contracts/', { method: 'POST', body: JSON.stringify(d) })
                    .then(() => {
                       queryClient.invalidateQueries({ queryKey: ['vendor-contracts', vendor.id] })
                       setShowContractModal(false)
                       toast.success('Contract Registry Updated')
                    })
              }}
           />
         )}
      </AnimatePresence>
    </div>
  )
}

function ContractForm({ vendorId, devices, onClose, onSave }: any) {
  const [formData, setFormData] = useState({ 
    vendor_id: vendorId, 
    title: '', 
    contract_number: '', 
    start_date: new Date().toISOString(), 
    end_date: new Date(Date.now() + 31536000000).toISOString(), 
    status: 'Active',
    sow_summary: '',
    support_tier: 'Standard',
    covered_device_ids: [] as number[]
  })

  const [searchAsset, setSearchAsset] = useState('')
  const filteredDevices = useMemo(() => {
    if (!searchAsset) return devices?.slice(0, 10) || []
    return devices?.filter((d: any) => d.name.toLowerCase().includes(searchAsset.toLowerCase())).slice(0, 20) || []
  }, [devices, searchAsset])

  const toggleDevice = (id: number) => {
    const next = formData.covered_device_ids.includes(id) 
      ? formData.covered_device_ids.filter(x => x !== id) 
      : [...formData.covered_device_ids, id]
    setFormData({ ...formData, covered_device_ids: next })
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-10">
       <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[900px] max-h-[90vh] p-10 rounded-[40px] border border-blue-500/30 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
             <h2 className="text-2xl font-black uppercase text-blue-400 flex items-center gap-3"><FileText size={24} /> New Service Contract</h2>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar mt-8 space-y-8">
             <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                   <SectionHeader icon={Info} title="Contract Metadata" />
                   <div className="space-y-4">
                      <div>
                         <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Contract Title</label>
                         <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white" placeholder="e.g. Dell ProSupport 2026" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Contract ID / Ref</label>
                            <input value={formData.contract_number} onChange={e => setFormData({...formData, contract_number: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-mono" placeholder="REF-XYZ-001" />
                         </div>
                         <StyledSelect label="Support Tier" value={formData.support_tier} onChange={e => setFormData({...formData, support_tier: e.target.value})} options={[
                            { value: 'Standard', label: 'Standard (8x5)' },
                            { value: 'NBD', label: 'Next Business Day' },
                            { value: '4-Hour', label: '4-Hour Critical' },
                            { value: 'Software-Only', label: 'Software Support' }
                         ]} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Effective Date</label>
                            <input type="date" value={formData.start_date.split('T')[0]} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white [color-scheme:dark]" />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Expiry Date</label>
                            <input type="date" value={formData.end_date.split('T')[0]} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white [color-scheme:dark]" />
                         </div>
                      </div>
                   </div>

                   <SectionHeader icon={Terminal} title="Scope of Work (SOW)" color="text-amber-400" />
                   <textarea value={formData.sow_summary} onChange={e => setFormData({...formData, sow_summary: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-6 text-xs text-slate-300 min-h-[120px] outline-none focus:border-amber-500/50" placeholder="Detail the key deliverables and support obligations..." />
                </div>

                <div className="space-y-6">
                   <SectionHeader icon={Shield} title="Coverage Matrix (Nodes)" color="text-indigo-400" />
                   <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden flex flex-col h-[400px]">
                      <div className="p-4 border-b border-white/5 relative">
                         <Search size={14} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" />
                         <input placeholder="Filter Assets..." value={searchAsset} onChange={e => setSearchAsset(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-indigo-500" />
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                         {filteredDevices.map((d: any) => (
                            <div key={d.id} onClick={() => toggleDevice(d.id)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${formData.covered_device_ids.includes(d.id) ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                               <div className="flex items-center space-x-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.covered_device_ids.includes(d.id) ? 'bg-white/20' : 'bg-black/20'}`}>
                                     <Server size={14} className={formData.covered_device_ids.includes(d.id) ? 'text-white' : 'text-slate-600'} />
                                  </div>
                                  <div>
                                     <p className={`text-[10px] font-black uppercase tracking-tight ${formData.covered_device_ids.includes(d.id) ? 'text-white' : 'text-slate-300'}`}>{d.name}</p>
                                     <p className={`text-[8px] font-bold uppercase ${formData.covered_device_ids.includes(d.id) ? 'text-indigo-200' : 'text-slate-600'}`}>{d.system} // {d.type}</p>
                                  </div>
                               </div>
                               {formData.covered_device_ids.includes(d.id) && <Check size={16} className="text-white" />}
                            </div>
                         ))}
                      </div>
                      <div className="p-4 bg-indigo-600/10 border-t border-indigo-500/20 text-center">
                         <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{formData.covered_device_ids.length} Nodes Selected for Coverage</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="flex space-x-3 pt-10">
             <button onClick={onClose} className="flex-1 py-4 text-[11px] font-black uppercase text-slate-500 hover:text-white transition-colors">Discard</button>
             <button onClick={() => onSave(formData)} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                <Save size={16} /> Register Service Contract
             </button>
          </div>
       </motion.div>
    </div>
  )
}
