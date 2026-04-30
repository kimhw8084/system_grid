import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, BookOpen, 
  Save, X, PlusCircle, MessageCircle, HelpCircle,
  FileText, ArrowRight, CheckCircle2, Tag, 
  Layers, Database, Server, RefreshCcw, Filter,
  ChevronDown, User, Calendar, ExternalLink, Clock,
  List, Shield, Target, Zap, Activity, Image as ImageIcon,
  ChevronRight, AlertCircle, PlayCircle, History, Link as LinkIcon, Lightbulb, Check,
  Workflow, Briefcase, TrendingUp, Users, Cpu, Box, Share2, Globe, Lock, Unlock,
  MessageSquare, Send, Reply, AlertTriangle, FileSearch, ShieldCheck, ZapOff, HardDrive
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'

// --- Types & Constants ---

const CATEGORIES = ['All', 'Q&A', 'BKM', 'Manual']

const TARGET_AUDIENCES = [
  { value: 'Internal', label: 'Internal Team' },
  { value: 'HQ', label: 'Headquarters' },
  { value: 'Department', label: 'Inter-Department' },
  { value: 'Vendor', label: 'External Vendor' },
  { value: 'Other', label: 'Other Stakeholders' }
]

const KPI_LIST = ['MTTR', 'MTBF', 'Uptime %', 'Throughput', 'Latency', 'Yield', 'ROI', 'Cost Savings']

// --- Components ---

const CategoryPill = ({ label, active, onClick, count }: any) => (
  <button 
    onClick={onClick}
    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
      active ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300'
    }`}
  >
    {label} {count !== undefined && <span className={`px-1.5 py-0.5 rounded ${active ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-500'}`}>{count}</span>}
  </button>
)

export default function Knowledge() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeEntry, setActiveEntry] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, id: null })
  const [viewMode, setViewMode] = useState<'Grid' | 'Timeline' | 'Manual'>('Grid')

  const { data: entries, isLoading } = useQuery({ 
    queryKey: ['knowledge', activeCategory, searchTerm], 
    queryFn: async () => {
      let url = '/api/v1/knowledge/'
      const params = new URLSearchParams()
      if (activeCategory !== 'All') params.append('category', activeCategory)
      if (searchTerm) params.append('search', searchTerm)
      if (params.toString()) url += `?${params.toString()}`
      const res = await apiFetch(url)
      return res.json()
    }
  })

  // Fetch contextual data for Manuals
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await apiFetch('/api/v1/devices/')).json() })
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: async () => (await apiFetch('/api/v1/logical-services/')).json() })
  const { data: dataFlows } = useQuery({ queryKey: ['data-flows'], queryFn: async () => (await apiFetch('/api/v1/data-flows/')).json() })
  const { data: farModes } = useQuery({ queryKey: ['far', 'modes'], queryFn: async () => (await apiFetch('/api/v1/far/modes')).json() })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/knowledge/${data.id}` : '/api/v1/knowledge/'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      toast.success('Knowledge Matrix Synchronized')
      setActiveModal(null)
      setActiveEntry(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/knowledge/${id}`, { method: 'DELETE' }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      toast.success('Intelligence Expunged')
      setConfirmModal({ isOpen: false, id: null })
      setActiveEntry(null)
    }
  })

  const stats = useMemo(() => {
    if (!entries) return {}
    return {
      'All': entries.length,
      'Q&A': entries.filter((e: any) => e.category === 'Q&A').length,
      'BKM': entries.filter((e: any) => e.category === 'BKM').length,
      'Manual': entries.filter((e: any) => e.category === 'Manual').length,
    }
  }, [entries])

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic flex items-center gap-4 text-white">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <BookOpen size={32} className="text-white" />
            </div>
            Collective Intelligence
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-bold mt-2 ml-1 flex items-center gap-2">
            <Globe size={12} className="text-blue-500/50" /> Unified Knowledge Matrix // Zero-Loss Information Handoff
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Query Matrix..." 
              className="bg-black/40 border border-white/10 rounded-xl pl-12 pr-6 py-3 text-[11px] font-black uppercase outline-none focus:border-blue-500/50 w-80 transition-all focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-700" 
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveModal({ 
                category: 'Manual', title: '', tags: [], 
                content_json: { 
                  business_value: { business_problem: '', kpis: [], roi_projection: '', beneficiaries: [] },
                  overview: { official_name: '', version: '', status: 'Active', asset_ids: [], service_ids: [], diagram_ids: [], interface_ids: [], source_config: '', licenses: [], data_stores: [] },
                  performance: { availability_target: '', latency_limits: '', throughput_capacity: '', monitoring_ids: [], capacity_methodology: '' },
                  operation: { owner_team: '', owner_individual: '', raci: [], cpm_workflow: '', far_ids: [], dr_strategy: { rto: '', rpo: '', plan: '' }, operational_logs: [] }
                } 
              })} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Workflow size={16} /> + System Manual
            </button>
            <button 
              onClick={() => setActiveModal({ 
                category: 'BKM', title: '', tags: [], 
                content_json: { purpose: '', prerequisites: [], flowchart_data: null, steps: [], tips: [], troubleshooting: [], next_steps: [] } 
              })} 
              className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <ShieldCheck size={16} /> + New BKM
            </button>
            <button 
              onClick={() => setActiveModal({ category: 'Q&A', title: '', question_context: '', tags: [], linked_device_ids: [], qa_threads: [] })} 
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <HelpCircle size={16} /> + Ask Question
            </button>
          </div>
        </div>
      </div>

      {/* Navigation & Filters */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
         <div className="flex items-center space-x-2">
            {CATEGORIES.map(c => (
              <CategoryPill 
                key={c} 
                label={c} 
                active={activeCategory === c} 
                onClick={() => setActiveCategory(c)} 
                count={(stats as any)[c]}
              />
            ))}
         </div>
         <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            {(['Grid', 'Timeline'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  viewMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {mode === 'Grid' ? <Layers size={14}/> : <History size={14}/>} {mode}
              </button>
            ))}
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
         {isLoading ? (
           <div className="h-full flex flex-col items-center justify-center space-y-4 text-blue-400">
              <div className="relative">
                <RefreshCcw size={48} className="animate-spin opacity-20" />
                <Database size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] animate-pulse italic">Traversing Intelligence Grid...</p>
           </div>
         ) : entries?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-6 text-slate-700 opacity-50">
               <FileSearch size={64} strokeWidth={1} />
               <div className="text-center">
                 <p className="text-sm font-black uppercase tracking-[0.3em]">No Intelligence Found</p>
                 <p className="text-[10px] font-bold mt-2 uppercase">Adjust filters or initialize new knowledge node</p>
               </div>
            </div>
         ) : viewMode === 'Grid' ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
              {entries?.map((entry: any) => (
                <KnowledgeCard 
                  key={entry.id} 
                  entry={entry} 
                  onClick={() => setActiveEntry(entry)} 
                />
              ))}
           </div>
         ) : (
           <div className="pb-10 max-w-4xl mx-auto">
              <KnowledgeTimeline entries={entries} onEntryClick={setActiveEntry} />
           </div>
         )}
      </div>

      {/* Modals & Overlays */}
      <AnimatePresence>
         {activeModal && (
            <KnowledgeForm 
              item={activeModal} 
              onClose={() => setActiveModal(null)} 
              onSave={(d: any) => mutation.mutate(d)}
              isSaving={mutation.isPending}
              context={{ devices, services, dataFlows, farModes }}
            />
         )}
         {activeEntry && (
            <KnowledgeDetails 
              entry={activeEntry} 
              onClose={() => setActiveEntry(null)}
              onEdit={() => { setActiveModal(activeEntry); setActiveEntry(null); }}
              onDelete={() => setConfirmModal({ isOpen: true, id: activeEntry.id })}
              context={{ devices, services, dataFlows, farModes }}
            />
         )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ isOpen: false, id: null })} 
        onConfirm={() => deleteMutation.mutate(confirmModal.id)} 
        title="Expunge Intelligence" 
        message="Permanently remove this knowledge node from the collective matrix? This action is irreversible." 
      />
    </div>
  )
}

// --- Sub-Components ---

function KnowledgeCard({ entry, onClick }: any) {
  const isBKM = entry.category === 'BKM'
  const isQA = entry.category === 'Q&A'
  const isManual = entry.category === 'Manual'

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layoutId={`entry-${entry.id}`}
      onClick={onClick}
      className={`glass-panel border border-white/5 p-6 rounded-2xl hover:border-blue-500/40 transition-all cursor-pointer group flex flex-col h-72 relative overflow-hidden ${
        isBKM ? 'bg-rose-500/[0.02] border-rose-500/10' : 
        isQA ? 'bg-amber-500/[0.02] border-amber-500/10' :
        isManual ? 'bg-emerald-500/[0.02] border-emerald-500/10' : ''
      }`}
    >
       {/* Background Accent */}
       <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-[60px] opacity-10 transition-all group-hover:opacity-20 ${
         isBKM ? 'bg-rose-500' : isQA ? 'bg-amber-500' : isManual ? 'bg-emerald-500' : 'bg-blue-500'
       }`} />

       <div className="flex items-start justify-between mb-6 relative z-10">
          <div className={`p-3 rounded-xl bg-white/5 border border-white/5 shadow-xl transition-transform group-hover:scale-110 ${
            isQA ? 'text-amber-400' :
            isManual ? 'text-emerald-400' :
            isBKM ? 'text-rose-500' : 'text-blue-400'
          }`}>
             {isQA ? <HelpCircle size={20} /> : isBKM ? <ShieldCheck size={20} /> : isManual ? <Workflow size={20} /> : <FileText size={20} />}
          </div>
          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-black/20 px-2 py-1 rounded border border-white/5">
            REV.{new Date(entry.updated_at).getFullYear()}.{new Date(entry.updated_at).getMonth() + 1}
          </div>
       </div>

       <div className="flex-1 overflow-hidden relative z-10">
          <h3 className="text-base font-black text-white uppercase tracking-tight line-clamp-2 group-hover:text-blue-400 transition-colors leading-tight mb-2">
            {entry.title}
          </h3>
          <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed font-medium italic">
            {entry.question_context || entry.content_json?.purpose || entry.content_json?.business_value?.business_problem || entry.content}
          </p>
       </div>

       <div className="pt-4 flex items-center justify-between border-t border-white/5 mt-4 relative z-10">
          <div className="flex gap-1.5">
             {entry.tags?.slice(0, 2).map((t: string) => (
               <span key={t} className="text-[8px] font-black bg-white/5 text-slate-400 border border-white/5 px-2 py-0.5 rounded-lg uppercase tracking-tighter">{t}</span>
             ))}
             {entry.qa_threads?.length > 0 && (
               <span className="text-[8px] font-black bg-blue-600/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-lg uppercase flex items-center gap-1">
                 <MessageSquare size={10} /> {entry.qa_threads.length}
               </span>
             )}
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-blue-400 transition-colors">
             ACCESS NODE <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
       </div>
    </motion.div>
  )
}

function KnowledgeTimeline({ entries, onEntryClick }: any) {
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [entries])

  return (
    <div className="space-y-8 relative">
       {/* Central Line */}
       <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-white/10 to-transparent" />

       {sortedEntries.map((entry: any, idx: number) => (
         <div key={entry.id} className="flex gap-10 items-start group">
            <div className="relative z-10">
               <div className={`w-12 h-12 rounded-xl bg-slate-900 border-2 flex items-center justify-center transition-all group-hover:scale-110 shadow-2xl ${
                 entry.category === 'BKM' ? 'border-rose-500/50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white' :
                 entry.category === 'Q&A' ? 'border-amber-500/50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white' :
                 'border-blue-500/50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'
               }`}>
                  {entry.category === 'BKM' ? <ShieldCheck size={20}/> : entry.category === 'Q&A' ? <HelpCircle size={20}/> : <FileText size={20}/>}
               </div>
               {idx !== sortedEntries.length - 1 && <div className="absolute top-12 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white/5 border border-white/10 mt-2" />}
            </div>
            <div 
              onClick={() => onEntryClick(entry)}
              className="flex-1 glass-panel p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group-hover:translate-x-2"
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-white uppercase bg-blue-600 px-2 py-0.5 rounded italic">NODE_{entry.id}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(entry.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {entry.tags?.map((t: string) => (
                      <span key={t} className="text-[8px] font-black text-slate-600 uppercase border border-white/5 px-2 py-0.5 rounded-lg">{t}</span>
                    ))}
                  </div>
               </div>
               <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2 group-hover:text-blue-400 transition-colors">{entry.title}</h3>
               <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                 {entry.question_context || entry.content_json?.purpose || entry.content}
               </p>
               {entry.qa_threads?.length > 0 && (
                 <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[9px] font-black text-blue-400 uppercase">
                      <MessageSquare size={12} /> {entry.qa_threads.length} CONTRIBUTIONS
                    </div>
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[8px] font-black text-slate-400 uppercase">UA</div>)}
                    </div>
                 </div>
               )}
            </div>
         </div>
       ))}
    </div>
  )
}

function KnowledgeForm({ item, onClose, onSave, isSaving, context }: any) {
  const [formData, setFormData] = useState({ ...item })
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    if (!tagInput || formData.tags.includes(tagInput)) return
    setFormData({ ...formData, tags: [...formData.tags, tagInput] })
    setTagInput('')
  }

  const category = formData.category

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
       <motion.div 
         initial={{ scale: 0.95, opacity: 0 }} 
         animate={{ scale: 1, opacity: 1 }} 
         className={`glass-panel w-full ${category === 'Manual' ? 'max-w-7xl' : 'max-w-5xl'} max-h-[95vh] p-0 rounded-[32px] border border-white/10 overflow-hidden flex flex-col shadow-2xl relative`}
       >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <div>
                <h2 className={`text-2xl font-black uppercase flex items-center gap-4 ${
                  category === 'BKM' ? 'text-rose-500' : 
                  category === 'Manual' ? 'text-emerald-500' : 'text-blue-400'
                }`}>
                   <div className={`p-2 rounded-lg ${
                     category === 'BKM' ? 'bg-rose-600/10' : 
                     category === 'Manual' ? 'bg-emerald-600/10' : 'bg-blue-600/10'
                   }`}>
                      {category === 'BKM' ? <ShieldCheck size={28} /> : 
                       category === 'Manual' ? <Workflow size={28} /> : <HelpCircle size={28} />}
                   </div>
                   {category === 'BKM' ? 'Draft Best Known Method' : 
                    category === 'Manual' ? 'Configure System Manual' : 'Host Knowledge Node'}
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold mt-2 ml-14">Collective Intelligence Synchronization Layer</p>
             </div>
             <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all">
                <X size={24}/>
             </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
             <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Classification Category</label>
                   <StyledSelect 
                     value={formData.category} 
                     onChange={e => setFormData({...formData, category: e.target.value})}
                     options={[
                       { value: 'Q&A', label: 'Q&A // COLLABORATIVE THREAD' },
                       { value: 'BKM', label: 'BKM // BEST KNOWN METHOD' },
                       { value: 'Manual', label: 'MANUAL // SYSTEM ARCHITECTURE' }
                     ]}
                   />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Knowledge Title // Subject</label>
                   <input 
                     value={formData.title} 
                     onChange={e => setFormData({...formData, title: e.target.value})} 
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm text-white font-black uppercase tracking-tight outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all" 
                     placeholder="e.g. MISSION_CRITICAL_RECOVERY_FLOW" 
                   />
                </div>
             </div>

             {category === 'BKM' ? (
               <BKMStudio data={formData.content_json} onChange={cj => setFormData({ ...formData, content_json: cj })} />
             ) : category === 'Manual' ? (
               <SystemManualBuilder data={formData.content_json} onChange={cj => setFormData({ ...formData, content_json: cj })} context={context} />
             ) : (
               <div className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block ml-1 flex items-center gap-2">
                       <MessageCircle size={14}/> Question Context // Problem Statement
                    </label>
                    <textarea 
                      value={formData.question_context} 
                      onChange={e => setFormData({...formData, question_context: e.target.value})} 
                      className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-6 text-sm text-slate-300 min-h-[150px] outline-none focus:border-blue-500/50 leading-relaxed font-medium italic" 
                      placeholder="Describe the technical challenge or inquiry in detail..."
                    />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Extended Content (Markdown)</label>
                    <textarea 
                      value={formData.content} 
                      onChange={e => setFormData({...formData, content: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-[11px] text-slate-400 min-h-[200px] outline-none focus:border-blue-500/50 leading-relaxed font-mono" 
                      placeholder="Optional additional documentation..."
                    />
                 </div>
               </div>
             )}

             {/* Common Footer Fields */}
             <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 gap-8">
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 ml-1">Intelligence Taxonomy (Tags)</label>
                   <div className="flex flex-wrap gap-2 mb-4">
                      {formData.tags?.map((t: string) => (
                        <span key={t} className="bg-blue-600/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase px-3 py-1 rounded-lg flex items-center gap-2">
                           {t} <X size={12} className="cursor-pointer hover:text-white" onClick={() => setFormData({...formData, tags: formData.tags.filter((x:any) => x !== t)})} />
                        </span>
                      ))}
                   </div>
                   <div className="flex gap-2">
                      <input 
                        value={tagInput} 
                        onChange={e => setTagInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && addTag()}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] text-white uppercase font-black tracking-widest outline-none focus:border-blue-500/50" 
                        placeholder="ADD_SYSTEM_TAG..." 
                      />
                      <button onClick={addTag} className="px-4 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><Plus size={20}/></button>
                   </div>
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Node Status</label>
                   <StyledSelect 
                     value={formData.status} 
                     onChange={e => setFormData({...formData, status: e.target.value})}
                     options={[
                       { value: 'Draft', label: 'DRAFT // LOCAL_ONLY' },
                       { value: 'Published', label: 'PUBLISHED // MATRIX_SYNCED' },
                       { value: 'Archived', label: 'ARCHIVED // READ_ONLY' }
                     ]}
                   />
                </div>
             </div>
          </div>

          {/* Action Bar */}
          <div className="p-8 bg-black/40 border-t border-white/5 flex items-center justify-between gap-6">
             <div className="flex items-center gap-4 text-slate-500">
                <Clock size={16}/>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Auto-Saving Node State...</span>
             </div>
             <div className="flex gap-4">
               <button onClick={onClose} className="px-8 py-4 text-[11px] font-black uppercase text-slate-500 hover:text-white transition-colors">Discard Intelligence</button>
               <button 
                 onClick={() => onSave(formData)} 
                 disabled={isSaving}
                 className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase shadow-xl active:scale-95 transition-all flex items-center gap-3 ${
                   category === 'BKM' ? 'bg-rose-600 text-white shadow-rose-500/20' : 
                   category === 'Manual' ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-blue-600 text-white shadow-blue-500/20'
                 }`}
               >
                  {isSaving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />} 
                  Commit To Intelligence Matrix
               </button>
             </div>
          </div>
       </motion.div>
    </div>
  )
}

function BKMStudio({ data, onChange }: any) {
  const update = (field: string, val: any) => onChange({ ...data, [field]: val })

  const addPrereq = () => update('prerequisites', [...(data.prerequisites || []), { description: '', link: '', criticality: 'High' }])
  const addStep = () => update('steps', [...(data.steps || []), { task: '', description: '', tool: '', image_url: '' }])
  const addTip = () => update('tips', [...(data.tips || []), ''])
  const addTrouble = () => update('troubleshooting', [...(data.troubleshooting || []), { symptom: '', cause: '', solution: '' }])

  return (
    <div className="space-y-12">
      <section className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 space-y-4 shadow-inner">
        <label className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-3">
          <Target size={18} className="animate-pulse" /> 01 // Mission Objective & Purpose
        </label>
        <textarea 
          value={data.purpose} 
          onChange={e => update('purpose', e.target.value)} 
          className="w-full bg-transparent border-none outline-none text-base font-medium text-slate-200 min-h-[100px] leading-relaxed italic" 
          placeholder="Define the primary operational objective of this BKM node..." 
        />
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <label className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-3">
            <List size={18}/> 02 // Pre-Flight Conditions & Prerequisites
          </label>
          <button onClick={addPrereq} className="p-2 rounded-xl bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all border border-rose-500/20">
            <Plus size={18}/>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {data.prerequisites?.map((p: any, idx: number) => (
            <div key={idx} className="flex gap-4 items-center bg-white/[0.03] p-5 rounded-2xl border border-white/5 group relative">
              <div className={`w-2 h-2 rounded-full ${p.criticality === 'High' ? 'bg-rose-500 shadow-lg shadow-rose-500/50' : 'bg-blue-500'}`} />
              <input 
                value={p.description} 
                onChange={e => {
                  const next = [...data.prerequisites]; next[idx].description = e.target.value; update('prerequisites', next)
                }} 
                className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-white uppercase tracking-tight" 
                placeholder="Prerequisite Description..." 
              />
              <button onClick={() => update('prerequisites', data.prerequisites.filter((_:any, i:any) => i !== idx))} className="text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={16}/>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <label className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-3">
            <PlayCircle size={18}/> 03 // Sequential Execution Workflow
          </label>
          <button onClick={addStep} className="p-2 rounded-xl bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all border border-rose-500/20">
            <Plus size={18}/>
          </button>
        </div>
        <div className="space-y-6">
          {data.steps?.map((s: any, idx: number) => (
            <div key={idx} className="flex gap-8 p-8 bg-slate-900/30 border border-white/5 rounded-[32px] relative group hover:border-rose-500/30 transition-all shadow-xl">
              <div className="flex flex-col items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center text-xl font-black text-white shadow-2xl shadow-rose-600/30 italic">
                   {String(idx + 1).padStart(2, '0')}
                 </div>
                 <div className="flex-1 w-1 bg-gradient-to-b from-rose-600/50 to-transparent rounded-full" />
              </div>
              <div className="flex-1 space-y-6">
                <input 
                  value={s.task} 
                  onChange={e => {
                    const next = [...data.steps]; next[idx].task = e.target.value; update('steps', next)
                  }} 
                  className="w-full bg-transparent border-none outline-none text-xl font-black text-white uppercase italic tracking-tighter" 
                  placeholder="Task Header..." 
                />
                <textarea 
                  value={s.description} 
                  onChange={e => {
                    const next = [...data.steps]; next[idx].description = e.target.value; update('steps', next)
                  }} 
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-sm font-medium text-slate-300 min-h-[120px] leading-relaxed shadow-inner" 
                  placeholder="Detailed execution logic..." 
                />
                <div className="flex gap-4">
                   <div className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
                      <Cpu size={14} className="text-rose-500" />
                      <input 
                        value={s.tool} 
                        onChange={e => {
                          const next = [...data.steps]; next[idx].tool = e.target.value; update('steps', next)
                        }} 
                        className="bg-transparent border-none outline-none text-[10px] font-black text-slate-400 uppercase tracking-widest w-full" 
                        placeholder="REQUIRED_TOOLING..." 
                      />
                   </div>
                   <div className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
                      <LinkIcon size={14} className="text-blue-500" />
                      <input 
                        value={s.image_url} 
                        onChange={e => {
                          const next = [...data.steps]; next[idx].image_url = e.target.value; update('steps', next)
                        }} 
                        className="bg-transparent border-none outline-none text-[10px] font-black text-slate-400 uppercase tracking-widest w-full" 
                        placeholder="IMAGE_METADATA_URL..." 
                      />
                   </div>
                </div>
              </div>
              <button onClick={() => update('steps', data.steps.filter((_:any, i:any) => i !== idx))} className="absolute top-6 right-6 text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={20}/>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
         <div className="flex items-center justify-between px-2">
            <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <AlertTriangle size={18}/> 04 // Troubleshooting & Failure Recovery
            </label>
            <button onClick={addTrouble} className="p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20">
              <Plus size={18}/>
            </button>
         </div>
         <div className="space-y-4">
            {data.troubleshooting?.map((t: any, idx: number) => (
              <div key={idx} className="grid grid-cols-3 gap-6 bg-white/[0.02] p-6 rounded-3xl border border-white/5 group relative">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest">Symptom</label>
                    <input 
                      value={t.symptom} 
                      onChange={e => {
                        const next = [...data.troubleshooting]; next[idx].symptom = e.target.value; update('troubleshooting', next)
                      }} 
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black text-white uppercase outline-none focus:border-amber-500/30" 
                      placeholder="Identify symptom..." 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest">Root Cause</label>
                    <input 
                      value={t.cause} 
                      onChange={e => {
                        const next = [...data.troubleshooting]; next[idx].cause = e.target.value; update('troubleshooting', next)
                      }} 
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black text-white uppercase outline-none focus:border-amber-500/30" 
                      placeholder="Probable cause..." 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest">Resolution</label>
                    <input 
                      value={t.solution} 
                      onChange={e => {
                        const next = [...data.troubleshooting]; next[idx].solution = e.target.value; update('troubleshooting', next)
                      }} 
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black text-white uppercase outline-none focus:border-amber-500/30" 
                      placeholder="Corrective action..." 
                    />
                 </div>
                 <button onClick={() => update('troubleshooting', data.troubleshooting.filter((_:any, i:any) => i !== idx))} className="absolute -right-2 -top-2 w-8 h-8 rounded-full bg-slate-900 border border-white/10 text-slate-700 hover:text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl">
                   <Trash2 size={14}/>
                 </button>
              </div>
            ))}
         </div>
      </section>

      <div className="grid grid-cols-2 gap-10">
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <label className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-3">
              <Lightbulb size={18}/> 05 // Pro-Tips & Insights
            </label>
            <button onClick={addTip} className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20">
              <Plus size={14}/>
            </button>
          </div>
          <div className="space-y-3">
            {data.tips?.map((t: string, idx: number) => (
              <div key={idx} className="flex gap-4 items-center bg-blue-600/5 p-4 rounded-2xl border border-blue-500/10 group">
                <Zap size={16} className="text-blue-500 shrink-0" />
                <input 
                  value={t} 
                  onChange={e => {
                    const next = [...data.tips]; next[idx] = e.target.value; update('tips', next)
                  }} 
                  className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-200 flex-1 italic" 
                  placeholder="Tribal knowledge / Optimization shortcut..."
                />
                <button onClick={() => update('tips', data.tips.filter((_:any, i:any) => i !== idx))} className="text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <label className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-3 px-2">
            <RefreshCcw size={18}/> 06 // Next Steps & Verification
          </label>
          <div className="bg-emerald-600/5 p-6 rounded-[32px] border border-emerald-500/10 space-y-4">
             <textarea 
               value={data.next_steps} 
               onChange={e => update('next_steps', e.target.value)} 
               className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-slate-300 min-h-[100px] leading-relaxed italic" 
               placeholder="Define post-execution verification steps or next BKM node in flow..." 
             />
          </div>
        </section>
      </div>
    </div>
  )
}

function SystemManualBuilder({ data, onChange, context }: any) {
  const update = (section: string, field: string, val: any) => {
    const next = { ...data }
    if (!next[section]) next[section] = {}
    next[section][field] = val
    onChange(next)
  }

  const { devices, services, dataFlows, farModes } = context

  return (
    <div className="space-y-16">
       {/* 01. Business Value Section */}
       <section className="space-y-8">
          <div className="flex items-center gap-4 border-l-4 border-blue-500 pl-6">
             <Briefcase size={28} className="text-blue-500" />
             <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">01 // Strategic Business Value</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">ROI, KPIs & Primary Beneficiaries</p>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-10 bg-white/[0.02] p-10 rounded-[40px] border border-white/5">
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Business Problem Being Solved</label>
                   <textarea 
                     value={data.business_value?.business_problem} 
                     onChange={e => update('business_value', 'business_problem', e.target.value)}
                     className="w-full bg-slate-900 border border-white/10 rounded-2xl p-6 text-sm text-slate-300 min-h-[120px] outline-none focus:border-blue-500/50 italic leading-relaxed" 
                     placeholder="Define the critical business challenge this system addresses..."
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ROI / Payback Projection</label>
                   <input 
                     value={data.business_value?.roi_projection} 
                     onChange={e => update('business_value', 'roi_projection', e.target.value)}
                     className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-black uppercase outline-none focus:border-blue-500/50" 
                     placeholder="e.g. 18 Month Payback // $2.4M Annual Stop-Loss"
                   />
                </div>
             </div>
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target KPIs</label>
                   <div className="flex flex-wrap gap-2 mb-3">
                      {data.business_value?.kpis?.map((k: string) => (
                        <span key={k} className="bg-blue-600/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase px-3 py-1.5 rounded-xl flex items-center gap-2">
                           {k} <X size={12} className="cursor-pointer hover:text-white" onClick={() => update('business_value', 'kpis', data.business_value.kpis.filter((x:any) => x !== k))} />
                        </span>
                      ))}
                   </div>
                   <StyledSelect 
                     value="" 
                     onChange={e => update('business_value', 'kpis', [...(data.business_value?.kpis || []), e.target.value])}
                     options={KPI_LIST.map(k => ({ value: k, label: k }))}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Primary Beneficiaries</label>
                   <div className="space-y-2">
                      {data.business_value?.beneficiaries?.map((b: any, idx: number) => (
                        <div key={idx} className="flex gap-4">
                           <input 
                             value={b.who} 
                             onChange={e => {
                               const next = [...data.business_value.beneficiaries]; next[idx].who = e.target.value; update('business_value', 'beneficiaries', next)
                             }}
                             className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white font-black uppercase" 
                             placeholder="Stakeholder..." 
                           />
                           <input 
                             value={b.value} 
                             onChange={e => {
                               const next = [...data.business_value.beneficiaries]; next[idx].value = e.target.value; update('business_value', 'beneficiaries', next)
                             }}
                             className="flex-[2] bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-slate-400 font-bold uppercase" 
                             placeholder="Value Delivered..." 
                           />
                        </div>
                      ))}
                      <button 
                        onClick={() => update('business_value', 'beneficiaries', [...(data.business_value?.beneficiaries || []), { who: '', value: '' }])}
                        className="w-full py-2 bg-blue-600/10 text-blue-500 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600/20 border border-blue-500/20 transition-all mt-2"
                      >
                         + Add Beneficiary Node
                      </button>
                   </div>
                </div>
             </div>
          </div>
       </section>

       {/* 02. System Overview Section */}
       <section className="space-y-8">
          <div className="flex items-center gap-4 border-l-4 border-emerald-500 pl-6">
             <Workflow size={28} className="text-emerald-500" />
             <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">02 // Technical System Overview</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Architecture, Assets & Interfaces</p>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-10 bg-white/[0.02] p-10 rounded-[40px] border border-white/5">
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Name</label>
                      <input 
                        value={data.overview?.official_name} 
                        onChange={e => update('overview', 'official_name', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white font-black uppercase" 
                        placeholder="SYSTEM_ID_ALPHA" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Release</label>
                      <input 
                        value={data.overview?.version} 
                        onChange={e => update('overview', 'version', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white font-black uppercase" 
                        placeholder="v2.4.0-GA" 
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Core Modules & Purpose</label>
                   <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                      {services?.map((s: any) => (
                        <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          data.overview?.service_ids?.includes(s.id) ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-white/5 border-white/5 opacity-50'
                        }`} onClick={() => {
                          const current = data.overview?.service_ids || []
                          update('overview', 'service_ids', current.includes(s.id) ? current.filter((id:any) => id !== s.id) : [...current, s.id])
                        }}>
                           <div className="flex items-center gap-3">
                              <Box size={14} className={data.overview?.service_ids?.includes(s.id) ? 'text-emerald-400' : 'text-slate-600'} />
                              <span className="text-[10px] font-black uppercase text-white">{s.name}</span>
                           </div>
                           <span className="text-[8px] font-bold text-slate-500 uppercase">{s.service_type}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Composition (Hardware Nodes)</label>
                   <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {devices?.map((d: any) => (
                        <div key={d.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          data.overview?.asset_ids?.includes(d.id) ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-white/5 border-white/5 opacity-50'
                        }`} onClick={() => {
                          const current = data.overview?.asset_ids || []
                          update('overview', 'asset_ids', current.includes(d.id) ? current.filter((id:any) => id !== d.id) : [...current, d.id])
                        }}>
                           <div className="flex items-center gap-3">
                              <Server size={14} className={data.overview?.asset_ids?.includes(d.id) ? 'text-emerald-400' : 'text-slate-600'} />
                              <span className="text-[10px] font-black uppercase text-white">{d.name}</span>
                           </div>
                           <span className="text-[8px] font-bold text-slate-500 uppercase">{d.type}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
       </section>

       {/* 03. Performance & Capacity Section */}
       <section className="space-y-8">
          <div className="flex items-center gap-4 border-l-4 border-amber-500 pl-6">
             <TrendingUp size={28} className="text-amber-500" />
             <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">03 // Performance, Capacity & SLOs</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Availability Targets & Capacity Methods</p>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-10 bg-white/[0.02] p-10 rounded-[40px] border border-white/5">
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Availability Target (%)</label>
                   <input 
                     value={data.performance?.availability_target} 
                     onChange={e => update('performance', 'availability_target', e.target.value)}
                     className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white font-black uppercase" 
                     placeholder="e.g. 99.95% (Excluding Planned Maintenance)" 
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Critical Latency Limits</label>
                   <input 
                     value={data.performance?.latency_limits} 
                     onChange={e => update('performance', 'latency_limits', e.target.value)}
                     className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white font-black uppercase" 
                     placeholder="e.g. <50ms End-to-End // <10ms DB IO" 
                   />
                </div>
             </div>
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Throughput Capacity</label>
                   <input 
                     value={data.performance?.throughput_capacity} 
                     onChange={e => update('performance', 'throughput_capacity', e.target.value)}
                     className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white font-black uppercase" 
                     placeholder="e.g. 1500 Requests/sec // 500 Wafers/hr" 
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Capacity Planning Methodology</label>
                   <textarea 
                     value={data.performance?.capacity_methodology} 
                     onChange={e => update('performance', 'capacity_methodology', e.target.value)}
                     className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-[11px] text-slate-400 min-h-[100px] outline-none focus:border-amber-500/30 font-medium italic" 
                     placeholder="Define how capacity is forecasted and scaled..." 
                   />
                </div>
             </div>
          </div>
       </section>

       {/* 04. Operation & Support Section */}
       <section className="space-y-8">
          <div className="flex items-center gap-4 border-l-4 border-rose-500 pl-6">
             <Users size={28} className="text-rose-500" />
             <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">04 // Operational Support & Reliability</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">RACI, Maintenance & Failure Modes</p>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-10 bg-white/[0.02] p-10 rounded-[40px] border border-white/5">
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Owner Team</label>
                      <input 
                        value={data.operation?.owner_team} 
                        onChange={e => update('operation', 'owner_team', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white font-black uppercase" 
                        placeholder="FAB_AUTOMATION" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Primary DRI</label>
                      <input 
                        value={data.operation?.owner_individual} 
                        onChange={e => update('operation', 'owner_individual', e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white font-black uppercase" 
                        placeholder="NAME_OR_ID" 
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Top Failure Modes (from FAR)</label>
                   <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                      {farModes?.map((fm: any) => (
                        <div key={fm.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          data.operation?.far_ids?.includes(fm.id) ? 'bg-rose-600/20 border-rose-500/50' : 'bg-white/5 border-white/5 opacity-50'
                        }`} onClick={() => {
                          const current = data.operation?.far_ids || []
                          update('operation', 'far_ids', current.includes(fm.id) ? current.filter((id:any) => id !== fm.id) : [...current, fm.id])
                        }}>
                           <div className="flex items-center gap-3">
                              <ZapOff size={14} className={data.operation?.far_ids?.includes(fm.id) ? 'text-rose-400' : 'text-slate-600'} />
                              <span className="text-[10px] font-black uppercase text-white line-clamp-1">{fm.title}</span>
                           </div>
                           <span className="text-[8px] font-black text-rose-500 uppercase">RPN_{fm.rpn}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">DR Target (RTO)</label>
                      <input 
                        value={data.operation?.dr_strategy?.rto} 
                        onChange={e => update('operation', 'dr_strategy', { ...data.operation?.dr_strategy, rto: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white font-black uppercase" 
                        placeholder="e.g. 4 Hours" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">DR Target (RPO)</label>
                      <input 
                        value={data.operation?.dr_strategy?.rpo} 
                        onChange={e => update('operation', 'dr_strategy', { ...data.operation?.dr_strategy, rpo: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white font-black uppercase" 
                        placeholder="e.g. 15 Minutes" 
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">RACI Table Node</label>
                   <div className="space-y-2">
                      {['Operations', 'Maintenance', 'Architecture', 'Security'].map(role => (
                        <div key={role} className="flex gap-4">
                           <div className="w-24 text-[9px] font-black text-slate-600 uppercase pt-3">{role}</div>
                           <input 
                             value={data.operation?.raci?.find((r:any) => r.role === role)?. DRI || ''} 
                             onChange={e => {
                               const next = [...(data.operation?.raci || [])]
                               const idx = next.findIndex((r:any) => r.role === role)
                               if (idx >= 0) next[idx].DRI = e.target.value
                               else next.push({ role, DRI: e.target.value })
                               update('operation', 'raci', next)
                             }}
                             className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white font-black uppercase" 
                             placeholder="Responsible Team/DRI..." 
                           />
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
       </section>
    </div>
  )
}

function KnowledgeDetails({ entry, onClose, onEdit, onDelete, context }: any) {
  const isBKM = entry.category === 'BKM'
  const isQA = entry.category === 'Q&A'
  const isManual = entry.category === 'Manual'

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-10">
       <motion.div 
         layoutId={`entry-${entry.id}`} 
         className="glass-panel w-full max-w-7xl h-[90vh] rounded-[48px] border border-white/10 flex flex-col overflow-hidden shadow-3xl relative"
       >
          {/* Detailed Header */}
          <div className={`p-10 border-b border-white/5 flex items-start justify-between relative overflow-hidden ${
            isBKM ? 'bg-rose-500/[0.03]' : 
            isQA ? 'bg-amber-500/[0.03]' :
            isManual ? 'bg-emerald-500/[0.03]' : 'bg-blue-500/[0.03]'
          }`}>
             <div className="space-y-6 relative z-10">
                <div className="flex items-center space-x-3">
                   <span className={`px-4 py-1 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${
                     isBKM ? 'bg-rose-600/20 border-rose-500/30 text-rose-500' : 
                     isQA ? 'bg-amber-600/20 border-amber-500/30 text-amber-500' :
                     isManual ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-500' :
                     'bg-blue-600/20 border-blue-500/30 text-blue-400'
                   }`}>
                      {entry.category} // INTEL_NODE_{entry.id}
                   </span>
                   <span className="text-slate-700 font-black tracking-widest">{" >> "}</span>
                   <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest italic">
                     <History size={14}/> LAST_SYNC: {new Date(entry.updated_at).toLocaleString()}
                   </span>
                </div>
                <h1 className="text-6xl font-black uppercase italic tracking-tighter text-white leading-[0.9] max-w-5xl">
                   {entry.title}
                </h1>
                <div className="flex flex-wrap gap-2 pt-2">
                   {entry.tags?.map((t: string) => (
                     <span key={t} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 uppercase flex items-center gap-2 hover:bg-white/10 transition-all cursor-default">
                        <Tag size={12} className="text-blue-500" /> {t}
                     </span>
                   ))}
                </div>
             </div>
             <div className="flex items-center space-x-3 relative z-10">
                <button onClick={onEdit} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-500 hover:text-blue-400 hover:border-blue-500/30 transition-all shadow-xl group">
                   <Edit2 size={24} className="group-hover:rotate-12 transition-transform" />
                </button>
                <button onClick={onDelete} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-500 hover:text-rose-500 hover:border-rose-500/30 transition-all shadow-xl group">
                   <Trash2 size={24} className="group-hover:scale-110 transition-transform" />
                </button>
                <div className="w-px h-12 bg-white/10 mx-3" />
                <button onClick={onClose} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-500 hover:text-white hover:bg-white/10 transition-all shadow-xl">
                   <X size={32}/>
                </button>
             </div>
          </div>

          {/* Main Body Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex">
             {isBKM ? (
               <div className="flex-1">
                 <BKMViewer data={entry.content_json} />
               </div>
             ) : isManual ? (
               <div className="flex-1">
                 <SystemManualViewer data={entry.content_json} context={context} />
               </div>
             ) : (
               <div className="flex-1 flex flex-col">
                 <QAViewer entry={entry} />
               </div>
             )}
          </div>

          {/* Detailed Footer */}
          <div className="p-8 bg-black/60 border-t border-white/5 flex items-center justify-between">
             <div className="flex items-center space-x-12">
                <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                      <User size={20}/>
                   </div>
                   <div>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Custodian</p>
                      <p className="text-[10px] font-black text-white uppercase italic tracking-tighter">system_admin</p>
                   </div>
                </div>
                <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 rounded-full bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <ShieldCheck size={20}/>
                   </div>
                   <div>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Verification Status</p>
                      <p className="text-[10px] font-black text-emerald-500 uppercase italic tracking-tighter">SECURED_V2.0</p>
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <button className="flex items-center space-x-3 px-6 py-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg group">
                   <LinkIcon size={16} className="group-hover:rotate-45 transition-transform" /> <span>Copy SysLink</span>
                </button>
                <button className="flex items-center space-x-3 px-6 py-3 bg-rose-600/10 border border-rose-500/20 rounded-xl text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-lg group">
                   <Share2 size={16} className="group-hover:-translate-y-0.5 transition-transform" /> <span>Distribute Node</span>
                </button>
             </div>
          </div>
       </motion.div>
    </div>
  )
}

function BKMViewer({ data }: any) {
  return (
    <div className="max-w-6xl mx-auto p-16 space-y-24">
       <section className="space-y-8 bg-slate-900/40 p-12 rounded-[48px] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-rose-500 group-hover:opacity-10 transition-all">
             <Target size={120} />
          </div>
          <h4 className="text-[12px] font-black text-rose-500 uppercase tracking-[0.5em] flex items-center gap-4">
             <Target size={20} className="animate-pulse" /> 01 // MISSION_OBJECTIVE
          </h4>
          <p className="text-3xl font-medium text-slate-200 leading-tight italic border-l-8 border-rose-600 pl-12 max-w-4xl relative z-10">
             {data.purpose}
          </p>
       </section>

       <section className="space-y-10 px-4">
          <h4 className="text-[12px] font-black text-rose-500 uppercase tracking-[0.5em] flex items-center gap-4">
             <List size={20}/> 02 // PRE_FLIGHT_STATE
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
             {data.prerequisites?.map((p: any, i: number) => (
               <div key={i} className="bg-white/[0.02] border border-white/5 p-6 rounded-[32px] flex items-start gap-4 hover:border-rose-500/30 transition-all hover:bg-white/[0.04] group">
                  <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${p.criticality === 'High' ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-blue-500'}`} />
                  <div className="space-y-1">
                     <span className="text-[12px] font-black text-white uppercase italic leading-tight block group-hover:text-rose-500 transition-colors">{p.description}</span>
                     {p.link && <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mt-2">LINKED_RESOURCE: {p.link}</span>}
                  </div>
               </div>
             ))}
          </div>
       </section>

       <section className="space-y-12">
          <h4 className="text-[12px] font-black text-rose-500 uppercase tracking-[0.5em] flex items-center gap-4">
             <PlayCircle size={20}/> 03 // EXECUTION_FLOW
          </h4>
          <div className="space-y-10 relative">
             <div className="absolute left-8 top-10 bottom-10 w-1 bg-gradient-to-b from-rose-600/50 via-white/5 to-transparent rounded-full" />
             {data.steps?.map((s: any, i: number) => (
               <div key={i} className="flex gap-12 group relative">
                  <div className="relative z-10 shrink-0">
                     <div className="w-16 h-16 rounded-[24px] bg-slate-900 border-2 border-rose-600/50 flex items-center justify-center text-2xl font-black text-rose-500 shadow-2xl group-hover:bg-rose-600 group-hover:text-white transition-all italic">
                        {String(i + 1).padStart(2, '0')}
                     </div>
                  </div>
                  <div className="flex-1 pb-16 space-y-6">
                     <div className="space-y-2">
                        <h5 className="text-3xl font-black text-white uppercase italic tracking-tighter group-hover:text-rose-400 transition-colors">{s.task}</h5>
                        {s.tool && <span className="text-[9px] font-black bg-rose-600/10 text-rose-500 border border-rose-500/20 px-3 py-1 rounded-lg uppercase tracking-widest">{s.tool}</span>}
                     </div>
                     <p className="text-base text-slate-400 leading-relaxed font-medium italic border-l-2 border-white/5 pl-6">{s.description}</p>
                     {s.image_url && (
                        <div className="aspect-video bg-black/40 rounded-[40px] border border-white/10 overflow-hidden shadow-2xl relative group/img">
                           <img src={s.image_url} className="w-full h-full object-cover opacity-60 group-hover/img:opacity-100 transition-opacity" alt={s.task} />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                              <p className="text-[10px] font-black text-white uppercase tracking-widest italic flex items-center gap-2">
                                 <ImageIcon size={14} className="text-rose-500" /> CAPTURED_EVIDENCE_SOURCE_{i+1}
                              </p>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
             ))}
          </div>
       </section>

       <section className="space-y-10">
          <h4 className="text-[12px] font-black text-amber-500 uppercase tracking-[0.5em] flex items-center gap-4">
             <AlertTriangle size={20}/> 04 // FAILURE_RECOVERY_MODES
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {data.troubleshooting?.map((t: any, i: number) => (
               <div key={i} className="bg-amber-500/[0.03] border border-amber-500/10 p-8 rounded-[40px] space-y-6 hover:bg-amber-500/[0.06] transition-all group">
                  <div className="flex items-center gap-4 border-b border-amber-500/10 pb-4">
                     <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
                        <AlertTriangle size={20} />
                     </div>
                     <h5 className="text-lg font-black text-white uppercase italic tracking-tight">{t.symptom}</h5>
                  </div>
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <p className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest">Probable Cause</p>
                        <p className="text-sm font-bold text-slate-300 italic">{t.cause}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">Correction Path</p>
                        <p className="text-sm font-bold text-emerald-400 italic flex items-center gap-2">
                           <ArrowRight size={14}/> {t.solution}
                        </p>
                     </div>
                  </div>
               </div>
             ))}
          </div>
       </section>

       <div className="grid grid-cols-2 gap-20 pt-20 border-t border-white/10">
          <section className="space-y-8">
             <h4 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.5em] flex items-center gap-4">
                <Lightbulb size={20}/> 05 // TACTICAL_INSIGHTS
             </h4>
             <div className="space-y-4">
                {data.tips?.map((t: string, i: number) => (
                  <div key={i} className="flex gap-6 p-6 bg-blue-600/5 border border-blue-500/10 rounded-[32px] items-start hover:bg-blue-600/10 transition-all">
                     <Zap size={20} className="text-blue-400 mt-1 shrink-0 animate-pulse" />
                     <p className="text-sm font-black text-blue-200 uppercase tracking-tight italic leading-relaxed">{t}</p>
                  </div>
                ))}
             </div>
          </section>

          <section className="space-y-8">
             <h4 className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.5em] flex items-center gap-4">
                <RefreshCcw size={20}/> 06 // POST_SYNC_VERIFICATION
             </h4>
             <div className="bg-emerald-500/[0.03] border border-emerald-500/10 p-10 rounded-[48px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-500">
                   <ShieldCheck size={100} />
                </div>
                <p className="text-lg font-medium text-emerald-400 italic leading-relaxed relative z-10">
                   {data.next_steps}
                </p>
             </div>
          </section>
       </div>
    </div>
  )
}

function SystemManualViewer({ data, context }: any) {
  const { devices, services, farModes } = context
  
  const linkedAssets = useMemo(() => {
    return devices?.filter((d: any) => data.overview?.asset_ids?.includes(d.id)) || []
  }, [devices, data.overview?.asset_ids])

  const linkedServices = useMemo(() => {
    return services?.filter((s: any) => data.overview?.service_ids?.includes(s.id)) || []
  }, [services, data.overview?.service_ids])

  const linkedFar = useMemo(() => {
    return farModes?.filter((fm: any) => data.operation?.far_ids?.includes(fm.id)) || []
  }, [farModes, data.operation?.far_ids])

  return (
    <div className="max-w-7xl mx-auto p-16 space-y-24">
       {/* Section 01: Business Value */}
       <section className="space-y-10">
          <div className="flex items-center gap-6 border-l-8 border-blue-600 pl-10">
             <Briefcase size={40} className="text-blue-500" />
             <div>
                <h3 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">01 // STRATEGIC_VALUE_MATRIX</h3>
                <p className="text-[12px] text-slate-500 uppercase tracking-[0.4em] font-bold mt-2">Economic Impact & Primary Goals</p>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-12 bg-white/[0.02] p-12 rounded-[64px] border border-white/5 relative overflow-hidden">
             <div className="space-y-10">
                <div className="space-y-4">
                   <h5 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-3">
                      <Target size={16}/> Business Problem Analysis
                   </h5>
                   <p className="text-xl font-medium text-slate-200 leading-relaxed italic border-l-2 border-white/10 pl-8">
                      {data.business_value?.business_problem}
                   </p>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="bg-slate-900/50 p-6 rounded-[32px] border border-white/5 shadow-inner">
                      <h6 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">ROI_PROJECTION</h6>
                      <p className="text-lg font-black text-white uppercase italic tracking-tighter">{data.business_value?.roi_projection}</p>
                   </div>
                   <div className="bg-slate-900/50 p-6 rounded-[32px] border border-white/5 shadow-inner">
                      <h6 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">KPI_ANCHORS</h6>
                      <div className="flex flex-wrap gap-2">
                        {data.business_value?.kpis?.map((k: string) => (
                          <span key={k} className="text-[10px] font-black text-blue-400 uppercase italic">#{k}</span>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
             <div className="space-y-8">
                <h5 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-3">
                   <Users size={16}/> Primary Beneficiary Network
                </h5>
                <div className="space-y-4">
                   {data.business_value?.beneficiaries?.map((b: any, i: number) => (
                     <div key={i} className="flex items-center gap-6 p-5 bg-white/[0.03] rounded-3xl border border-white/5 group hover:bg-blue-600/10 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                           <User size={20} />
                        </div>
                        <div>
                           <p className="text-sm font-black text-white uppercase italic">{b.who}</p>
                           <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-tight">{b.value}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </section>

       {/* Section 02: Overview */}
       <section className="space-y-10">
          <div className="flex items-center gap-6 border-l-8 border-emerald-600 pl-10">
             <Workflow size={40} className="text-emerald-500" />
             <div>
                <h3 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">02 // ARCHITECTURAL_BLUEPRINT</h3>
                <p className="text-[12px] text-slate-500 uppercase tracking-[0.4em] font-bold mt-2">Systems, Services & Physical Nodes</p>
             </div>
          </div>
          <div className="grid grid-cols-3 gap-10">
             <div className="col-span-1 space-y-8">
                <div className="bg-emerald-600/[0.03] p-10 rounded-[48px] border border-emerald-500/10 space-y-8 h-full">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">OFFICIAL_IDENTIFIER</p>
                      <h4 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{data.overview?.official_name}</h4>
                   </div>
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">RELEASE_SPEC</p>
                      <p className="text-lg font-black text-emerald-400 uppercase italic tracking-tighter">{data.overview?.version}</p>
                   </div>
                   <div className="pt-8 border-t border-white/5 space-y-4">
                      <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                         <Lock size={12}/> SOURCE_CODE_METADATA
                      </h6>
                      <p className="text-xs font-bold text-slate-400 italic leading-relaxed">{data.overview?.source_config}</p>
                   </div>
                </div>
             </div>
             <div className="col-span-2 space-y-10">
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <h5 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-3">
                         <Box size={16}/> Functional Modules
                      </h5>
                      <div className="space-y-3">
                         {linkedServices.map((s: any) => (
                           <div key={s.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <Cpu size={14} />
                                 </div>
                                 <span className="text-[10px] font-black text-white uppercase italic">{s.name}</span>
                              </div>
                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{s.service_type}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-6">
                      <h5 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-3">
                         <HardDrive size={16}/> Physical Compute Nodes
                      </h5>
                      <div className="space-y-3">
                         {linkedAssets.map((d: any) => (
                           <div key={d.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <Server size={14} />
                                 </div>
                                 <span className="text-[10px] font-black text-white uppercase italic">{d.name}</span>
                              </div>
                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{d.status}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </section>

       {/* Section 03: Performance */}
       <section className="space-y-10">
          <div className="flex items-center gap-6 border-l-8 border-amber-600 pl-10">
             <TrendingUp size={40} className="text-amber-500" />
             <div>
                <h3 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">03 // PERFORMANCE_BOUNDARIES</h3>
                <p className="text-[12px] text-slate-500 uppercase tracking-[0.4em] font-bold mt-2">SLOs, Capacity & Latency Controls</p>
             </div>
          </div>
          <div className="grid grid-cols-4 gap-8">
             <div className="bg-slate-900/80 p-10 rounded-[48px] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-amber-500 group-hover:scale-110 transition-transform">
                   <Shield size={60} />
                </div>
                <p className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest">AVAILABILITY_TARGET</p>
                <p className="text-4xl font-black text-white italic tracking-tighter">{data.performance?.availability_target}</p>
             </div>
             <div className="bg-slate-900/80 p-10 rounded-[48px] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-amber-500 group-hover:scale-110 transition-transform">
                   <Clock size={60} />
                </div>
                <p className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest">LATENCY_UPPER_BOUND</p>
                <p className="text-4xl font-black text-white italic tracking-tighter">{data.performance?.latency_limits}</p>
             </div>
             <div className="bg-slate-900/80 p-10 rounded-[48px] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-amber-500 group-hover:scale-110 transition-transform">
                   <Zap size={60} />
                </div>
                <p className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest">MAX_THROUGHPUT_CAP</p>
                <p className="text-4xl font-black text-white italic tracking-tighter">{data.performance?.throughput_capacity}</p>
             </div>
             <div className="bg-slate-900/80 p-10 rounded-[48px] border border-white/5 space-y-4 shadow-2xl flex flex-col justify-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">CAPACITY_STRATEGY</p>
                <p className="text-xs font-bold text-slate-400 italic leading-relaxed">{data.performance?.capacity_methodology}</p>
             </div>
          </div>
       </section>

       {/* Section 04: Operation */}
       <section className="space-y-10">
          <div className="flex items-center gap-6 border-l-8 border-rose-600 pl-10">
             <Users size={40} className="text-rose-500" />
             <div>
                <h3 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">04 // OPERATIONAL_RELIAIBLITY</h3>
                <p className="text-[12px] text-slate-500 uppercase tracking-[0.4em] font-bold mt-2">RACI, Failure Handling & Recovery Plan</p>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-12 bg-white/[0.02] p-12 rounded-[64px] border border-white/5 relative overflow-hidden">
             <div className="space-y-10">
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-rose-500/50 uppercase tracking-widest">OWNER_ORGANIZATION</p>
                      <p className="text-xl font-black text-white uppercase italic tracking-tighter">{data.operation?.owner_team}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-rose-500/50 uppercase tracking-widest">TECHNICAL_DRI</p>
                      <p className="text-xl font-black text-white uppercase italic tracking-tighter">{data.operation?.owner_individual}</p>
                   </div>
                </div>
                <div className="space-y-6">
                   <h5 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-3">
                      <ZapOff size={16}/> Top Failure Vectors (FAR)
                   </h5>
                   <div className="space-y-3">
                      {linkedFar.map((fm: any) => (
                        <div key={fm.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-rose-600/10 transition-all">
                           <div className="flex items-center gap-3">
                              <AlertTriangle size={14} className="text-rose-500" />
                              <span className="text-[10px] font-black text-white uppercase italic">{fm.title}</span>
                           </div>
                           <div className="flex items-center gap-4">
                              <span className="text-[8px] font-black text-slate-500 uppercase">SEV_{fm.severity}</span>
                              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[8px] font-black italic">RPN_{fm.rpn}</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             <div className="space-y-10">
                <h5 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-3">
                   <RefreshCcw size={16}/> Disaster Recovery Parameters
                </h5>
                <div className="grid grid-cols-2 gap-8">
                   <div className="bg-emerald-600/5 p-8 rounded-[40px] border border-emerald-500/10 space-y-2 group hover:bg-emerald-600/10 transition-all">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">RECOVERY_TIME_OBJ (RTO)</p>
                      <p className="text-4xl font-black text-white italic tracking-tighter leading-none">{data.operation?.dr_strategy?.rto}</p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase mt-4">MAX_ALLOWED_DOWNTIME</p>
                   </div>
                   <div className="bg-emerald-600/5 p-8 rounded-[40px] border border-emerald-500/10 space-y-2 group hover:bg-emerald-600/10 transition-all">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">RECOVERY_POINT_OBJ (RPO)</p>
                      <p className="text-4xl font-black text-white italic tracking-tighter leading-none">{data.operation?.dr_strategy?.rpo}</p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase mt-4">MAX_ALLOWED_DATA_LOSS</p>
                   </div>
                </div>
                <div className="space-y-4 pt-6 border-t border-white/5">
                   <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <List size={14}/> SYSTEM_RACI_MATRIX
                   </h6>
                   <div className="grid grid-cols-2 gap-4">
                      {data.operation?.raci?.map((r: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                           <span className="text-[9px] font-black text-slate-500 uppercase">{r.role}</span>
                           <span className="text-[10px] font-black text-white uppercase italic tracking-tighter">{r.DRI}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
       </section>
    </div>
  )
}

function QAViewer({ entry }: any) {
  const queryClient = useQueryClient()
  const [replyText, setReplyText] = useState('')
  const [activeReplyTo, setActiveReplyTo] = useState<any>(null)

  const qaMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/knowledge/qa', { method: 'POST', body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      setReplyText('')
      setActiveReplyTo(null)
      toast.success('Sync Successful')
    }
  })

  const handleSubmit = (parentId: number | null = null) => {
    if (!replyText) return
    qaMutation.mutate({
      knowledge_id: entry.id,
      parent_qa_id: parentId,
      content: replyText,
      author: 'system_admin',
      author_team: 'FAB_AUTO',
      target_audience: 'Internal',
      entry_type: parentId ? 'Answer' : 'Follow-up'
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900/30">
       <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-12">
          {/* Main Question Context */}
          <div className="max-w-4xl mx-auto space-y-8">
             <div className="bg-blue-600/5 border border-blue-500/20 p-10 rounded-[48px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-500 group-hover:scale-110 transition-transform">
                   <HelpCircle size={100} />
                </div>
                <h4 className="text-[12px] font-black text-blue-500 uppercase tracking-[0.5em] mb-6 flex items-center gap-4">
                   <Info size={20}/> 00 // ORIGIN_INQUIRY
                </h4>
                <p className="text-2xl font-medium text-slate-200 leading-relaxed italic border-l-8 border-blue-600 pl-10 relative z-10">
                   {entry.question_context}
                </p>
                {entry.content && (
                  <div className="mt-8 pt-8 border-t border-white/5 prose prose-invert max-w-none text-slate-400 text-sm italic font-mono relative z-10">
                     {entry.content}
                  </div>
                )}
             </div>

             {/* Thread Timeline */}
             <div className="space-y-10 relative mt-16">
                <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600/50 via-white/5 to-transparent rounded-full" />
                
                {entry.qa_threads?.filter((qa: any) => !qa.parent_qa_id).map((qa: any) => (
                  <QANode key={qa.id} qa={qa} onReply={() => setActiveReplyTo(qa)} />
                ))}

                {entry.qa_threads?.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-700 opacity-50 space-y-4">
                     <MessageSquare size={48} strokeWidth={1} />
                     <p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Collaborative Input...</p>
                  </div>
                )}
             </div>
          </div>
       </div>

       {/* Reply Interface */}
       <div className="p-8 bg-black/60 border-t border-white/10 backdrop-blur-3xl">
          <div className="max-w-4xl mx-auto space-y-4">
             {activeReplyTo && (
               <div className="flex items-center justify-between bg-blue-600/10 px-6 py-2 rounded-xl border border-blue-500/20">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <Reply size={12}/> Replying to contribution by {activeReplyTo.author}
                  </span>
                  <button onClick={() => setActiveReplyTo(null)} className="text-slate-500 hover:text-white"><X size={14}/></button>
               </div>
             )}
             <div className="flex gap-4">
                <div className="flex-1 relative">
                   <textarea 
                     value={replyText} 
                     onChange={e => setReplyText(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all min-h-[60px] max-h-[200px] font-medium italic"
                     placeholder={activeReplyTo ? "Synchronize reply..." : "Inject new collaborative node..."}
                   />
                </div>
                <button 
                  onClick={() => handleSubmit(activeReplyTo?.id)}
                  disabled={!replyText || qaMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                   {qaMutation.isPending ? <RefreshCcw size={24} className="animate-spin"/> : <Send size={24}/>}
                </button>
             </div>
          </div>
       </div>
    </div>
  )
}

function QANode({ qa, onReply }: any) {
  return (
    <div className="space-y-6">
       <div className="flex gap-8 group">
          <div className="relative z-10 shrink-0">
             <div className={`w-16 h-16 rounded-[24px] bg-slate-900 border-2 flex items-center justify-center text-xl font-black shadow-2xl transition-all group-hover:scale-110 ${
               qa.entry_type === 'Answer' ? 'border-emerald-500/50 text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white' : 
               'border-blue-500/50 text-blue-500 group-hover:bg-blue-600 group-hover:text-white'
             }`}>
                {qa.author.substring(0, 2).toUpperCase()}
             </div>
          </div>
          <div className="flex-1 space-y-3 pb-4">
             <div className="flex items-center justify-between bg-white/[0.02] px-6 py-2 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                   <span className="text-[10px] font-black text-white uppercase italic tracking-tighter">{qa.author}</span>
                   <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">{qa.author_team}</span>
                   {qa.is_verified && <span className="text-[8px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded italic">VERIFIED_DRI</span>}
                </div>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{new Date(qa.created_at).toLocaleString()}</span>
             </div>
             <div className={`p-6 rounded-[32px] border border-white/5 shadow-xl relative group-hover:border-blue-500/30 transition-all ${
               qa.entry_type === 'Answer' ? 'bg-emerald-600/5' : 'bg-slate-900/50'
             }`}>
                <p className="text-sm font-medium text-slate-200 leading-relaxed italic">{qa.content}</p>
                <button 
                  onClick={onReply}
                  className="absolute bottom-4 right-6 text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2"
                >
                   <Reply size={12}/> Add Follow-up
                </button>
             </div>

             {/* Nested Replies */}
             {qa.replies?.length > 0 && (
               <div className="mt-6 ml-8 space-y-6 relative">
                  <div className="absolute -left-6 top-0 bottom-4 w-px bg-white/10" />
                  {qa.replies.map((reply: any) => (
                    <QANode key={reply.id} qa={reply} onReply={onReply} />
                  ))}
               </div>
             )}
          </div>
       </div>
    </div>
  )
}
