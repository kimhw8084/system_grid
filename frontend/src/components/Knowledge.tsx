import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, BookOpen, 
  Save, X, PlusCircle, MessageCircle, HelpCircle,
  FileText, ArrowRight, CheckCircle2, Tag, 
  Layers, Database, Server, RefreshCcw, Filter,
  ChevronDown, User, Calendar, ExternalLink, Clock,
  List, Shield, Target, Zap, Activity, Image as ImageIcon,
  ChevronRight, AlertCircle, PlayCircle, History, Link as LinkIcon, Lightbulb, Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'

// --- Components ---

const CategoryPill = ({ label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
      active ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300'
    }`}
  >
    {label}
  </button>
)

export default function Knowledge() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeEntry, setActiveEntry] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, id: null })

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

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/knowledge/${data.id}` : '/api/v1/knowledge/'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      toast.success('Knowledge Matrix Updated')
      setActiveModal(null)
      setActiveEntry(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/knowledge/${id}`, { method: 'DELETE' }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
      toast.success('Entry Expunged')
      setConfirmModal({ isOpen: false, id: null })
    }
  })

  const categories = ['All', 'Q&A', 'Manual', 'Instruction', 'FAQ', 'Best Practice', 'BKM']

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-3">
            <BookOpen size={32} className="text-blue-500" /> Collaborative Intelligence
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">Unified Knowledge Hub, Technical Manuals & Collaborative Q&A</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search knowledge..." className="bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveModal({ category: 'BKM', title: '', content: '', tags: [], content_json: { purpose: '', prerequisites: [], flowchart: '', steps: [], tips: [], troubleshooting: [], next_steps: [] } })} className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all">+ New BKM</button>
            <button onClick={() => setActiveModal({ category: 'Q&A', title: '', content: '', tags: [], linked_device_ids: [] })} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ New Entry</button>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 border-b border-white/5 pb-4">
         {categories.map(c => (
           <CategoryPill key={c} label={c} active={activeCategory === c} onClick={() => setActiveCategory(c)} />
         ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
         {isLoading ? (
           <div className="h-full flex flex-col items-center justify-center space-y-4 text-blue-400">
              <RefreshCcw size={32} className="animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Querying Knowledge Matrix...</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
              {entries?.map((entry: any) => (
                <motion.div 
                  layoutId={`entry-${entry.id}`}
                  key={entry.id} 
                  onClick={() => setActiveEntry(entry)}
                  className={`glass-panel border border-white/5 p-6 rounded-lg hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col h-64 ${entry.category === 'BKM' ? 'border-rose-500/20 bg-rose-500/[0.02]' : ''}`}
                >
                   <div className="flex items-start justify-between mb-4">
                      <div className={`p-2 rounded-lg bg-white/5 ${
                        entry.category === 'Q&A' ? 'text-amber-400' :
                        entry.category === 'Manual' ? 'text-blue-400' :
                        entry.category === 'BKM' ? 'text-rose-500' :
                        entry.category === 'Instruction' ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                         {entry.category === 'Q&A' ? <HelpCircle size={18} /> : entry.category === 'BKM' ? <Shield size={18} /> : <FileText size={18} />}
                      </div>
                      <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{new Date(entry.updated_at).toLocaleDateString()}</div>
                   </div>
                   <div className="flex-1 overflow-hidden">
                      <h3 className="text-sm font-black text-white uppercase tracking-tight line-clamp-2 group-hover:text-blue-400 transition-colors">{entry.title}</h3>
                      <p className="text-[10px] text-slate-500 mt-2 line-clamp-3 leading-relaxed">{entry.content || entry.content_json?.purpose}</p>
                   </div>
                   <div className="pt-4 flex items-center justify-between border-t border-white/5 mt-4">
                      <div className="flex gap-1">
                         {entry.tags?.slice(0, 2).map((t: string) => (
                           <span key={t} className="text-[8px] font-black bg-blue-600/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase">{t}</span>
                         ))}
                      </div>
                      <div className="flex items-center gap-1 text-[8px] font-black text-slate-600 uppercase tracking-widest group-hover:text-blue-400 transition-colors">
                         Inspect Entry <ArrowRight size={10} />
                      </div>
                   </div>
                </motion.div>
              ))}
           </div>
         )}
      </div>

      <AnimatePresence>
         {activeModal && (
            <KnowledgeForm 
              item={activeModal} 
              onClose={() => setActiveModal(null)} 
              onSave={(d: any) => mutation.mutate(d)}
              isSaving={mutation.isPending}
            />
         )}
         {activeEntry && (
            <KnowledgeDetails 
              entry={activeEntry} 
              onClose={() => setActiveEntry(null)}
              onEdit={() => { setActiveModal(activeEntry); setActiveEntry(null); }}
              onDelete={() => setConfirmModal({ isOpen: true, id: activeEntry.id })}
            />
         )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ isOpen: false, id: null })} 
        onConfirm={() => deleteMutation.mutate(confirmModal.id)} 
        title="Expunge Entry" 
        message="Permanently remove this intelligence from the matrix?" 
      />
    </div>
  )
}

function KnowledgeForm({ item, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    if (!tagInput || formData.tags.includes(tagInput)) return
    setFormData({ ...formData, tags: [...formData.tags, tagInput] })
    setTagInput('')
  }

  const isBKM = formData.category === 'BKM'

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
       <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`glass-panel ${isBKM ? 'w-full max-w-6xl' : 'w-[800px]'} max-h-[95vh] p-10 rounded-lg border border-blue-500/30 overflow-hidden flex flex-col shadow-2xl`}>
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
             <h2 className={`text-2xl font-black uppercase flex items-center gap-3 ${isBKM ? 'text-rose-500' : 'text-blue-400'}`}>
                {isBKM ? <Shield size={24} /> : <PlusCircle size={24} />} 
                {isBKM ? 'Draft Best Known Method (BKM)' : 'Host Intelligence Entry'}
             </h2>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
          </div>

          <div className="mt-8 flex-1 overflow-y-auto custom-scrollbar pr-4">
             <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Knowledge Category</label>
                   <StyledSelect 
                     value={formData.category} 
                     onChange={e => setFormData({...formData, category: e.target.value})}
                     options={[
                       { value: 'BKM', label: 'BKM: Best Known Method' },
                       { value: 'Q&A', label: 'Q&A Thread' },
                       { value: 'Manual', label: 'Technical Manual' },
                       { value: 'Instruction', label: 'Work Instruction' },
                       { value: 'FAQ', label: 'FAQ Entry' },
                       { value: 'Best Practice', label: 'Best Practice' }
                     ]}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">BKM Title / Subject</label>
                   <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-6 py-3.5 text-sm text-white font-bold uppercase tracking-tight outline-none focus:border-blue-500/50" placeholder="e.g. Critical Failure Recovery Flow for DB Nodes" />
                </div>
             </div>

             {isBKM ? (
               <BKMEditor data={formData.content_json} onChange={cj => setFormData({ ...formData, content_json: cj })} />
             ) : (
               <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Content (Supports Markdown)</label>
                    <textarea 
                      value={formData.content} 
                      onChange={e => setFormData({...formData, content: e.target.value})} 
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-6 text-xs text-slate-300 min-h-[300px] outline-none focus:border-blue-500/50 leading-relaxed font-medium" 
                      placeholder="Draft your intelligence here..."
                    />
                 </div>
               </div>
             )}

             <div className="mt-8 border-t border-white/5 pt-6">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3 ml-1">Taxonomy (Tags)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                   {formData.tags?.map((t: string) => (
                     <span key={t} className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase px-2 py-1 rounded flex items-center gap-2">
                        {t} <X size={10} className="cursor-pointer hover:text-white" onClick={() => setFormData({...formData, tags: formData.tags.filter((x:any) => x !== t)})} />
                     </span>
                   ))}
                </div>
                <div className="flex gap-2">
                   <input 
                     value={tagInput} 
                     onChange={e => setTagInput(e.target.value)} 
                     onKeyDown={e => e.key === 'Enter' && addTag()}
                     className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-[10px] text-white uppercase font-black tracking-widest outline-none focus:border-blue-500" 
                     placeholder="ADD_TAG..." 
                   />
                   <button onClick={addTag} className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><Plus size={20}/></button>
                </div>
             </div>
          </div>

          <div className="flex space-x-3 pt-8 mt-auto border-t border-white/5">
             <button onClick={onClose} className="flex-1 py-4 text-[11px] font-black uppercase text-slate-500 hover:text-white transition-colors">Discard Draft</button>
             <button onClick={() => onSave(formData)} className={`flex-[2] py-4 rounded-lg text-[11px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isBKM ? 'bg-rose-600 text-white shadow-rose-500/20' : 'bg-blue-600 text-white shadow-blue-500/20'}`}>
                {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
                Synchronize Knowledge
             </button>
          </div>
       </motion.div>
    </div>
  )
}

function BKMEditor({ data, onChange }: any) {
  const update = (field: string, val: any) => onChange({ ...data, [field]: val })

  const addPrereq = () => update('prerequisites', [...(data.prerequisites || []), { description: '', link: '', is_new_bkm: false }])
  const addStep = () => update('steps', [...(data.steps || []), { task: '', description: '', image_url: '' }])
  const addTip = () => update('tips', [...(data.tips || []), ''])
  const addNextStep = () => update('next_steps', [...(data.next_steps || []), ''])

  return (
    <div className="space-y-10 py-4">
      <section className="space-y-3">
        <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2"><Target size={14}/> Purpose & Objective</label>
        <textarea value={data.purpose} onChange={e => update('purpose', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-6 text-sm font-medium text-slate-200 min-h-[100px] outline-none focus:border-rose-500/30" placeholder="Clearly state the goal of this BKM..." />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2"><List size={14}/> Prerequisites & Entry Conditions</label>
          <button onClick={addPrereq} className="p-1.5 rounded-lg bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white transition-all"><Plus size={14}/></button>
        </div>
        <div className="space-y-3">
          {data.prerequisites?.map((p: any, idx: number) => (
            <div key={idx} className="flex gap-4 items-start bg-white/5 p-4 rounded-lg border border-white/5">
              <input value={p.description} onChange={e => {
                const next = [...data.prerequisites]; next[idx].description = e.target.value; update('prerequisites', next)
              }} className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-white uppercase" placeholder="Describe prereq..." />
              <input value={p.link} onChange={e => {
                const next = [...data.prerequisites]; next[idx].link = e.target.value; update('prerequisites', next)
              }} className="w-48 bg-white/5 rounded-lg px-3 py-1.5 text-[10px] text-slate-400 outline-none" placeholder="Link/ID..." />
              <button onClick={() => update('prerequisites', data.prerequisites.filter((_:any, i:any) => i !== idx))} className="text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2"><PlayCircle size={14}/> Sequential Execution Steps</label>
          <button onClick={addStep} className="p-1.5 rounded-lg bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white transition-all"><Plus size={14}/></button>
        </div>
        <div className="space-y-4">
          {data.steps?.map((s: any, idx: number) => (
            <div key={idx} className="flex gap-6 p-6 bg-white/5 border border-white/5 rounded-lg relative group">
              <div className="flex flex-col items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-rose-500/20">{idx + 1}</div>
                 <div className="flex-1 w-px bg-white/10" />
              </div>
              <div className="flex-1 space-y-4">
                <input value={s.task} onChange={e => {
                  const next = [...data.steps]; next[idx].task = e.target.value; update('steps', next)
                }} className="w-full bg-transparent border-none outline-none text-sm font-black text-white uppercase tracking-tight" placeholder="Step Task Header..." />
                <textarea value={s.description} onChange={e => {
                  const next = [...data.steps]; next[idx].description = e.target.value; update('steps', next)
                }} className="w-full bg-black/20 border border-white/5 rounded-lg p-4 text-xs font-medium text-slate-300 min-h-[80px]" placeholder="Detailed instructions for this task..." />
              </div>
              <div className="w-32 h-32 bg-white/5 rounded-lg flex flex-col items-center justify-center border border-dashed border-white/10 text-slate-600 hover:text-rose-500 cursor-pointer transition-all">
                 <ImageIcon size={24} />
                 <span className="text-[8px] font-black uppercase mt-1">Add Image</span>
              </div>
              <button onClick={() => update('steps', data.steps.filter((_:any, i:any) => i !== idx))} className="absolute top-4 right-4 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2"><Lightbulb size={14}/> Pro-Tips & Shortcuts</label>
            <button onClick={addTip} className="p-1 rounded bg-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-all"><Plus size={12}/></button>
          </div>
          <div className="space-y-2">
            {data.tips?.map((t: string, idx: number) => (
              <div key={idx} className="flex gap-3 items-center bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                <Zap size={12} className="text-amber-500 shrink-0" />
                <input value={t} onChange={e => {
                  const next = [...data.tips]; next[idx] = e.target.value; update('tips', next)
                }} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-200 flex-1" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2"><RefreshCcw size={14}/> Recommended Next Steps</label>
            <button onClick={addNextStep} className="p-1 rounded bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"><Plus size={12}/></button>
          </div>
          <div className="space-y-2">
            {data.next_steps?.map((n: string, idx: number) => (
              <div key={idx} className="flex gap-3 items-center bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                <ArrowRight size={12} className="text-emerald-500 shrink-0" />
                <input value={n} onChange={e => {
                  const next = [...data.next_steps]; next[idx] = e.target.value; update('next_steps', next)
                }} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-200 flex-1" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function KnowledgeDetails({ entry, onClose, onEdit, onDelete }: any) {
  const isBKM = entry.category === 'BKM'

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-10">
       <motion.div layoutId={`entry-${entry.id}`} className="glass-panel w-full max-w-6xl h-[90vh] rounded-[48px] border border-white/10 flex flex-col overflow-hidden shadow-3xl">
          
          <div className={`p-10 border-b border-white/5 flex items-start justify-between ${isBKM ? 'bg-rose-500/[0.03]' : 'bg-white/5'}`}>
             <div className="space-y-4">
                <div className="flex items-center space-x-3">
                   <span className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-[0.2em] ${isBKM ? 'bg-rose-600/20 border-rose-500/30 text-rose-500' : 'bg-blue-600/20 border-blue-500/30 text-blue-400'}`}>{entry.category}</span>
                   <span className="text-slate-700">•</span>
                   <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2"><Calendar size={12}/> Updated {new Date(entry.updated_at).toLocaleDateString()}</span>
                </div>
                <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white leading-tight max-w-4xl">{entry.title}</h1>
                <div className="flex flex-wrap gap-2 pt-2">
                   {entry.tags?.map((t: string) => (
                     <span key={t} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 uppercase flex items-center gap-2"><Tag size={10}/> {t}</span>
                   ))}
                </div>
             </div>
             <div className="flex items-center space-x-3">
                <button onClick={onEdit} className="p-3 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-emerald-400 transition-all" title="Modify Entry"><Edit2 size={20}/></button>
                <button onClick={onDelete} className="p-3 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all" title="Expunge Entry"><Trash2 size={20}/></button>
                <div className="w-px h-10 bg-white/10 mx-2" />
                <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
             {isBKM ? (
               <BKMViewer data={entry.content_json} />
             ) : (
               <div className="p-12 max-w-4xl mx-auto space-y-12">
                  <div className="prose prose-invert max-w-none">
                     <div className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                        {entry.content}
                     </div>
                  </div>
               </div>
             )}
          </div>

          <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
             <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                   <User size={12}/> Author: system_admin
                </div>
                <div className="flex items-center space-x-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                   <History size={12}/> Version: Rev. 2.0.4
                </div>
             </div>
             <div className="flex items-center gap-4">
                <button className="flex items-center space-x-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">
                   <LinkIcon size={14}/> Internal SysLink
                </button>
                <button className="flex items-center space-x-2 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors">
                   <ExternalLink size={14}/> Share BKM
                </button>
             </div>
          </div>
       </motion.div>
    </div>
  )
}

function BKMViewer({ data }: any) {
  return (
    <div className="max-w-5xl mx-auto p-12 space-y-20">
       <section className="space-y-6">
          <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.4em] flex items-center gap-3">
             <Target size={18}/> 01. Purpose & Core Objective
          </h4>
          <p className="text-xl font-medium text-slate-200 leading-relaxed italic border-l-4 border-rose-600 pl-8">
             {data.purpose}
          </p>
       </section>

       <section className="space-y-6">
          <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.4em] flex items-center gap-3">
             <List size={18}/> 02. Prerequisites & Safe Entry State
          </h4>
          <div className="grid grid-cols-2 gap-4">
             {data.prerequisites?.map((p: any, i: number) => (
               <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-lg flex items-center justify-between group hover:border-rose-500/20 transition-all">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                     <span className="text-[11px] font-black text-white uppercase tracking-tight">{p.description}</span>
                  </div>
                  {p.link && <ExternalLink size={12} className="text-slate-600 group-hover:text-rose-500 transition-colors" />}
               </div>
             ))}
          </div>
       </section>

       <section className="space-y-8">
          <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.4em] flex items-center gap-3">
             <PlayCircle size={18}/> 03. Implementation Workflow
          </h4>
          <div className="space-y-6">
             {data.steps?.map((s: any, i: number) => (
               <div key={i} className="flex gap-8 group">
                  <div className="flex flex-col items-center gap-4">
                     <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-rose-500 shadow-xl group-hover:bg-rose-600 group-hover:text-white transition-all">
                        {String(i + 1).padStart(2, '0')}
                     </div>
                     <div className="flex-1 w-px bg-white/10" />
                  </div>
                  <div className="flex-1 pb-12 space-y-4">
                     <h5 className="text-lg font-black text-white uppercase tracking-tight">{s.task}</h5>
                     <p className="text-sm text-slate-400 leading-relaxed font-medium">{s.description}</p>
                     {s.image_url && <div className="aspect-video bg-white/5 rounded-lg border border-white/5 overflow-hidden"><img src={s.image_url} className="w-full h-full object-cover" /></div>}
                  </div>
               </div>
             ))}
          </div>
       </section>

       <div className="grid grid-cols-2 gap-12 pt-12 border-t border-white/5">
          <section className="space-y-6">
             <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.4em] flex items-center gap-3">
                <Lightbulb size={18}/> 04. Tactical Insights
             </h4>
             <div className="space-y-3">
                {data.tips?.map((t: string, i: number) => (
                  <div key={i} className="flex gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg items-start">
                     <Zap size={14} className="text-amber-500 mt-0.5" />
                     <p className="text-xs font-bold text-amber-200 uppercase tracking-tight">{t}</p>
                  </div>
                ))}
             </div>
          </section>

          <section className="space-y-6">
             <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] flex items-center gap-3">
                <RefreshCcw size={18}/> 05. Post-Action Verification
             </h4>
             <div className="space-y-3">
                {data.next_steps?.map((n: string, i: number) => (
                  <div key={i} className="flex gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg items-start">
                     <CheckCircle2 size={14} className="text-emerald-500 mt-0.5" />
                     <p className="text-xs font-bold text-emerald-200 uppercase tracking-tight">{n}</p>
                  </div>
                ))}
             </div>
          </section>
       </div>
    </div>
  )
}
