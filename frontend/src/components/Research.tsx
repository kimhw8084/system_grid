import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity, Database, Server,
  FileText, Clipboard, Terminal, ArrowRight, Shield, Download, Share2,
  Clock, CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'

// --- Components ---

const CompactSummary = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-inner">
    <div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-black text-white tracking-tighter">{value}</p>
    </div>
    <div className={`p-2 rounded-lg bg-white/5 ${color}`}><Icon size={18} /></div>
  </div>
)

export default function Research() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const { data: investigations, isLoading } = useQuery({ 
    queryKey: ['investigations'], 
    queryFn: async () => (await apiFetch('/api/v1/investigations/')).json() 
  })
  
  const { data: devices } = useQuery({ 
    queryKey: ['devices'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json() 
  })
  
  const { data: options } = useQuery({ 
    queryKey: ['settings-options'], 
    queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() 
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/investigations/${data.id}` : '/api/v1/investigations/'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
      toast.success('Research Synchronized')
      setActiveModal(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/investigations/${id}`, { method: 'DELETE' }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
      toast.success('Research Purged')
    }
  })

  const stats = useMemo(() => {
    if (!investigations) return { total: 0, analyzing: 0, troubleshooting: 0, urgent: 0 }
    return {
      total: investigations.length,
      analyzing: investigations.filter((i: any) => i.status === 'Analyzing').length,
      troubleshooting: investigations.filter((i: any) => i.category === 'Troubleshooting').length,
      urgent: investigations.filter((i: any) => i.priority === 'Urgent').length
    }
  }, [investigations])

  const columnDefs = useMemo(() => [
    { field: "id", headerName: "ID", width: 50, pinned: 'left', cellClass: 'text-center font-mono text-slate-500' },
    { field: "category", headerName: "Category", width: 110, cellRenderer: (p: any) => (
      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
        p.value === 'Troubleshooting' ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' :
        p.value === 'Security' ? 'bg-rose-500/20 border-rose-500/30 text-rose-500' :
        'bg-blue-500/20 border-blue-500/30 text-blue-400'
      }`}>{p.value}</span>
    )},
    { field: "title", headerName: "Research Title", flex: 1.5, pinned: 'left', cellClass: 'font-bold text-white uppercase tracking-tight' },
    { field: "status", headerName: "Status", width: 100, cellRenderer: (p: any) => <StatusPill value={p.value} /> },
    { field: "priority", headerName: "Priority", width: 80, cellRenderer: (p: any) => (
        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
          p.value === 'Urgent' ? 'bg-rose-500/20 border-rose-500/30 text-rose-500 animate-pulse' :
          p.value === 'High' ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' :
          'bg-blue-500/20 border-blue-500/30 text-blue-400'
        }`}>{p.value}</span>
      )
    },
    { field: "assigned_team", headerName: "Team", width: 80, cellClass: 'text-center font-bold text-slate-400' },
    { field: "updated_at", headerName: "Last Pulse", width: 130, cellClass: 'font-mono text-[9px] text-slate-400', cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleString() : '---' },
    {
      headerName: "Action",
      width: 80,
      pinned: 'right',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <button onClick={() => setActiveDetails(p.data)} className="p-1 bg-blue-600/10 text-blue-400 rounded hover:bg-blue-600/20 transition-all"><Eye size={12}/></button>
           <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge Research', message: 'Permanently remove this record?', onConfirm: () => deleteMutation.mutate(p.data.id) })} className="p-1 bg-rose-600/10 text-rose-400 rounded hover:bg-rose-600/20 transition-all"><Trash2 size={12}/></button>
        </div>
      )
    }
  ], [])

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2 text-white">
            <Shield size={24} className="text-blue-500" /> Research Matrix
          </h1>
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-bold leading-none">Deep Forensics & Scientific Troubleshooting</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search Research Matrix..." className="bg-white/5 border border-white/5 rounded-lg pl-8 pr-4 py-1.5 text-[9px] font-black uppercase outline-none focus:border-blue-500/50 w-48 transition-all shadow-inner text-white" />
          </div>
          <button onClick={() => setActiveModal({ title: '', category: 'General', status: 'Analyzing', priority: 'Medium', systems: [], impacted_device_ids: [] })} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Launch Research</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <CompactSummary label="Total Research" value={stats.total} icon={Activity} color="text-blue-400" />
        <CompactSummary label="Under Analysis" value={stats.analyzing} icon={Terminal} color="text-indigo-400" />
        <CompactSummary label="Deep Troubleshooting" value={stats.troubleshooting} icon={AlertTriangle} color="text-amber-500" />
        <CompactSummary label="Critical Alerts" value={stats.urgent} icon={ShieldAlert} color="text-rose-500" />
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Research Matrix...</p>
          </div>
        )}
        <AgGridReact 
          rowData={investigations || []} 
          columnDefs={columnDefs as any}
          headerHeight={32}
          rowHeight={32}
          quickFilterText={searchTerm}
        />
      </div>

      <AnimatePresence>
        {activeModal && (
          <ResearchForm 
            item={activeModal} 
            options={options} 
            devices={devices} 
            onClose={() => setActiveModal(null)} 
            onSave={(d: any) => mutation.mutate(d)}
            isSaving={mutation.isPending}
          />
        )}
        {activeDetails && (
          <ResearchDetails 
            item={activeDetails} 
            onClose={() => setActiveDetails(null)} 
            onSave={(d: any) => mutation.mutate(d)}
            setConfirmModal={setConfirmModal}
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

function ResearchForm({ item, options, devices, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ 
    category: 'General',
    status: 'Analyzing',
    priority: 'Medium',
    systems: [],
    impacted_device_ids: [],
    ...item 
  })

  const categories = ['General', 'Troubleshooting', 'Security', 'Maintenance', 'Capacity']

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-xl p-6 rounded-3xl border border-blue-500/30 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-xl font-black uppercase text-blue-400 flex items-center gap-2 tracking-tighter">
            <PlusCircle size={20} /> Initialize Research
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Research Title</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value.toUpperCase()})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-blue-500 text-white font-bold" placeholder="E.G. CLUSTER LATENCY ANALYSIS" />
          </div>

          <StyledSelect label="Category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} options={categories.map(c => ({value: c, label: c}))} />
          <StyledSelect label="Priority" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={[{value:'Urgent', label:'Urgent'}, {value:'High', label:'High'}, {value:'Medium', label:'Medium'}, {value:'Low', label:'Low'}]} />
          
          <div className="col-span-2">
            <StyledSelect label="Assigned Team" value={formData.assigned_team} onChange={e => setFormData({...formData, assigned_team: e.target.value})} options={[{value:'SRE', label:'SRE'}, {value:'Network', label:'Network'}, {value:'DBA', label:'Database'}, {value:'AppDev', label:'App Dev'}]} />
          </div>

          <div className="col-span-2">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Preliminary Problem Statement</label>
            <textarea value={formData.problem_statement} onChange={e => setFormData({...formData, problem_statement: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-blue-500 text-slate-300 min-h-[60px]" placeholder="Briefly describe the issue..." />
          </div>

          {formData.category === 'Troubleshooting' && (
            <div className="col-span-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-1">Initial Impact Assessment</label>
              <textarea value={formData.impact} onChange={e => setFormData({...formData, impact: e.target.value})} className="w-full bg-slate-900/50 border border-white/5 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-blue-500 text-slate-300 min-h-[40px]" placeholder="What is currently affected?" />
            </div>
          )}
        </div>

        <div className="flex space-x-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-[2] py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 tracking-widest">
            {isSaving ? <RefreshCcw size={12} className="animate-spin" /> : <Zap size={12} />} 
            Launch {formData.category} Tracker
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ResearchDetails({ item, onClose, onSave, setConfirmModal }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ ...item })
  const [newLog, setNewLog] = useState({ entry_text: '', entry_type: 'Diagnosis', poc: '' })
  const [activeTab, setActiveTab] = useState('timeline')

  const logMutation = useMutation({
    mutationFn: async (log: any) => {
      const res = await apiFetch(`/api/v1/investigations/${item.id}/logs`, {
        method: 'POST',
        body: JSON.stringify(log)
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
      setNewLog({ entry_text: '', entry_type: 'Diagnosis', poc: '' })
      toast.success('Activity Recorded')
    }
  })

  const isTroubleshooting = formData.category === 'Troubleshooting'

  const timelineColumnDefs = [
    { field: "timestamp", headerName: "Time", width: 140, cellRenderer: (p: any) => new Date(p.value).toLocaleString() },
    { field: "entry_type", headerName: "Type", width: 100, cellRenderer: (p: any) => (
      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
        p.value === 'Action' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
        p.value === 'Diagnosis' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' :
        'bg-slate-500/20 border-slate-500/30 text-slate-400'
      }`}>{p.value}</span>
    )},
    { field: "entry_text", headerName: "Description", flex: 1 },
    { field: "poc", headerName: "POC", width: 100, cellClass: 'font-bold text-blue-400 uppercase tracking-tighter' }
  ]

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-8">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-7xl h-[90vh] rounded-[32px] border border-blue-500/20 overflow-hidden flex flex-col shadow-2xl shadow-black">
        
        {/* Header - More Compact */}
        <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30"><Shield size={20} /></div>
            <div>
              <div className="flex items-center space-x-2 mb-0.5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{formData.category} // ID: RES_{formData.id}</span>
                <StatusPill value={formData.status} />
              </div>
              <h1 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => onSave(formData)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2"><Save size={12}/> Sync State</button>
            <button onClick={onClose} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={16}/></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Nav */}
          <div className="w-40 border-r border-white/5 bg-black/20 p-4 space-y-1">
            <NavBtn active={activeTab === 'timeline'} icon={Clock} label="Timeline" onClick={() => setActiveTab('timeline')} />
            <NavBtn active={activeTab === 'findings'} icon={Search} label="Findings" onClick={() => setActiveTab('findings')} />
            <NavBtn active={activeTab === 'actions'} icon={ShieldCheck} label="Actions" onClick={() => setActiveTab('actions')} />
            <NavBtn active={activeTab === 'context'} icon={Database} label="Context" onClick={() => setActiveTab('context')} />
            <NavBtn active={activeTab === 'settings'} icon={Sliders} label="Control" onClick={() => setActiveTab('settings')} />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  {/* Compact Quick Add Pulse */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 grid grid-cols-4 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Record Activity / Observation</label>
                      <input 
                        value={newLog.entry_text} 
                        onChange={e => setNewLog({...newLog, entry_text: e.target.value})}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500 text-white"
                        placeholder="Detailed log entry..."
                      />
                    </div>
                    <StyledSelect 
                      label="Type" 
                      value={newLog.entry_type} 
                      onChange={e => setNewLog({...newLog, entry_type: e.target.value})} 
                      options={[{value:'Diagnosis', label:'Diagnosis'}, {value:'Action', label:'Action'}, {value:'Observation', label:'Observation'}, {value:'Communication', label:'Communication'}, {value:'Milestone', label:'Milestone'}]} 
                    />
                    <div className="flex items-center gap-2">
                       <div className="flex-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">POC</label>
                          <input 
                            value={newLog.poc} 
                            onChange={e => setNewLog({...newLog, poc: e.target.value})}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500 text-white font-bold"
                            placeholder="Owner"
                          />
                       </div>
                       <button 
                        disabled={!newLog.entry_text || logMutation.isPending}
                        onClick={() => logMutation.mutate(newLog)}
                        className="p-2 bg-emerald-600 text-white rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50"
                      >
                        <PlusCircle size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden h-[400px] ag-theme-alpine-dark">
                    <AgGridReact 
                      rowData={formData.progress_logs || []} 
                      columnDefs={timelineColumnDefs as any}
                      headerHeight={28}
                      rowHeight={28}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'findings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SectionCard icon={AlertTriangle} title="Impact Description" color="text-rose-400">
                    <textarea value={formData.impact || ''} onChange={e => setFormData({...formData, impact: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-rose-500/30 text-slate-300 min-h-[120px]" placeholder="Detailed impact analysis..." />
                  </SectionCard>
                  <SectionCard icon={Zap} title="Trigger Event" color="text-amber-400">
                    <textarea value={formData.trigger_event || ''} onChange={e => setFormData({...formData, trigger_event: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-amber-500/30 text-slate-300 min-h-[120px]" placeholder="What started this?" />
                  </SectionCard>
                  <SectionCard icon={Search} title="Root Cause Analysis" color="text-blue-400" className="md:col-span-2">
                    <textarea value={formData.root_cause || ''} onChange={e => setFormData({...formData, root_cause: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-blue-500/30 text-slate-300 min-h-[150px]" placeholder="Deep dive analysis of the core issue..." />
                  </SectionCard>
                  <SectionCard icon={CheckCircle2} title="Resolution Steps" color="text-emerald-400" className="md:col-span-2">
                    <textarea value={formData.resolution_steps || ''} onChange={e => setFormData({...formData, resolution_steps: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-emerald-500/30 text-slate-300 min-h-[150px]" placeholder="How was it fixed?" />
                  </SectionCard>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <SectionCard icon={Shield} title="Mitigation Items" color="text-cyan-400">
                      <ListInput 
                        items={formData.mitigation_items || []} 
                        onChange={items => setFormData({...formData, mitigation_items: items})} 
                        placeholder="Action taken to stabilize..."
                      />
                    </SectionCard>
                    <SectionCard icon={Activity} title="Monitoring Items" color="text-indigo-400">
                      <ListInput 
                        items={formData.monitoring_items || []} 
                        onChange={items => setFormData({...formData, monitoring_items: items})} 
                        placeholder="What to watch for..."
                      />
                    </SectionCard>
                  </div>
                  <SectionCard icon={ShieldCheck} title="Prevention Method / Long-term Strategy" color="text-purple-400">
                    <textarea value={formData.prevention_method || ''} onChange={e => setFormData({...formData, prevention_method: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-purple-500/30 text-slate-300 min-h-[120px]" placeholder="How to prevent recurrence..." />
                  </SectionCard>
                  <SectionCard icon={Lightbulb} title="Lessons Learned" color="text-amber-200">
                    <textarea value={formData.lessons_learned || ''} onChange={e => setFormData({...formData, lessons_learned: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-amber-500/20 text-slate-300 min-h-[100px]" placeholder="Knowledge gained..." />
                  </SectionCard>
                </div>
              )}

              {activeTab === 'context' && (
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-500 pl-3">Initial Problem Statement</h3>
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-slate-300 italic">
                         {formData.problem_statement}
                      </div>
                   </div>
                   {/* Device/System links could go here if needed */}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="max-w-xl space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-white/20 pl-3">Research Parameters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <StyledSelect label="Current Phase" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={[{value:'Analyzing', label:'Analyzing'}, {value:'Escalated', label:'Escalated'}, {value:'Monitoring', label:'Monitoring'}, {value:'Resolved', label:'Resolved'}, {value:'Closed', label:'Closed'}]} />
                    <StyledSelect label="Priority Rating" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={[{value:'Urgent', label:'Urgent'}, {value:'High', label:'High'}, {value:'Medium', label:'Medium'}, {value:'Low', label:'Low'}]} />
                  </div>
                  <div className="pt-6 border-t border-white/5">
                    <button onClick={() => setConfirmModal({ isOpen: true, title: 'Archive Research', message: 'Move this investigation to history?', onConfirm: () => { /* archive logic */ } })} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Archive Record</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const NavBtn = ({ active, icon: Icon, label, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
    <Icon size={14} /> <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
)

const SectionCard = ({ icon: Icon, title, children, color, className }: any) => (
  <div className={`bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 ${className}`}>
    <div className={`flex items-center gap-2 ${color}`}><Icon size={14} /><h3 className="text-[9px] font-black uppercase tracking-widest">{title}</h3></div>
    {children}
  </div>
)

const ListInput = ({ items, onChange, placeholder }: { items: string[], onChange: (items: string[]) => void, placeholder: string }) => {
  const [val, setVal] = useState('')
  const add = () => { if(val) { onChange([...items, val]); setVal(''); } }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-blue-500" placeholder={placeholder} />
        <button onClick={add} className="p-1.5 bg-blue-600 rounded-lg text-white"><Plus size={14}/></button>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <span key={i} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[9px] text-slate-300 flex items-center gap-1">
            {it} <button onClick={() => onChange(items.filter((_, idx) => idx !== i))}><X size={10}/></button>
          </span>
        ))}
      </div>
    </div>
  )
}

