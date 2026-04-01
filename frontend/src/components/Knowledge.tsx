import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, BookOpen, 
  Save, X, PlusCircle, MessageCircle, HelpCircle,
  FileText, ArrowRight, CheckCircle2, Tag, 
  Layers, Database, Server, RefreshCcw, Filter,
  ChevronDown, User, Calendar, ExternalLink, Clock
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

  const categories = ['All', 'Q&A', 'Manual', 'Instruction', 'FAQ', 'Best Practice']

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
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search knowledge..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>
          <button onClick={() => setActiveModal({ category: 'Q&A', title: '', content: '', tags: [], linked_device_ids: [] })} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ New Entry</button>
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
                  className="glass-panel border border-white/5 p-6 rounded-[32px] hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col h-64"
                >
                   <div className="flex items-start justify-between mb-4">
                      <div className={`p-2 rounded-xl bg-white/5 ${
                        entry.category === 'Q&A' ? 'text-amber-400' :
                        entry.category === 'Manual' ? 'text-blue-400' :
                        entry.category === 'Instruction' ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                         {entry.category === 'Q&A' ? <HelpCircle size={18} /> : <FileText size={18} />}
                      </div>
                      <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{new Date(entry.updated_at).toLocaleDateString()}</div>
                   </div>
                   <div className="flex-1 overflow-hidden">
                      <h3 className="text-sm font-black text-white uppercase tracking-tight line-clamp-2 group-hover:text-blue-400 transition-colors">{entry.title}</h3>
                      <p className="text-[10px] text-slate-500 mt-2 line-clamp-3 leading-relaxed">{entry.content}</p>
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
              {(!entries || entries.length === 0) && (
                <div className="col-span-full py-40 text-center space-y-4 opacity-30">
                   <BookOpen size={64} className="mx-auto" />
                   <p className="text-[10px] font-black uppercase tracking-[0.5em]">No intelligence found in this sector</p>
                </div>
              )}
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

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
       <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[800px] max-h-[90vh] p-10 rounded-[40px] border border-blue-500/30 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
             <h2 className="text-2xl font-black uppercase text-blue-400 flex items-center gap-3"><PlusCircle size={24} /> New Intelligence Entry</h2>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
          </div>

          <div className="mt-8 space-y-6 flex-1">
             <div className="grid grid-cols-2 gap-6">
                <StyledSelect 
                  label="Category" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  options={[
                    { value: 'Q&A', label: 'Q&A Thread' },
                    { value: 'Manual', label: 'Technical Manual' },
                    { value: 'Instruction', label: 'Work Instruction' },
                    { value: 'FAQ', label: 'FAQ Entry' },
                    { value: 'Best Practice', label: 'Best Practice' }
                  ]}
                />
                <div>
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Subject / Title</label>
                   <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold" placeholder="e.g. Scaling SAP Application Servers" />
                </div>
             </div>

             <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Content (Supports Markdown)</label>
                <textarea 
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})} 
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-6 text-xs text-slate-300 min-h-[300px] outline-none focus:border-blue-500/50 leading-relaxed font-medium" 
                  placeholder="Draft your intelligence here..."
                />
             </div>

             <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Taxonomy (Tags)</label>
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
                     className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white uppercase font-black tracking-widest outline-none focus:border-blue-500" 
                     placeholder="ADD_TAG..." 
                   />
                   <button onClick={addTag} className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><Plus size={20}/></button>
                </div>
             </div>
          </div>

          <div className="flex space-x-3 pt-10 mt-auto border-t border-white/5">
             <button onClick={onClose} className="flex-1 py-4 text-[11px] font-black uppercase text-slate-500 hover:text-white transition-colors">Discard</button>
             <button onClick={() => onSave(formData)} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
                Commit Intelligence
             </button>
          </div>
       </motion.div>
    </div>
  )
}

function KnowledgeDetails({ entry, onClose, onEdit, onDelete }: any) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-10">
       <motion.div layoutId={`entry-${entry.id}`} className="glass-panel w-full max-w-5xl h-[85vh] rounded-[40px] border border-white/10 flex flex-col overflow-hidden">
          
          <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between">
             <div className="space-y-4">
                <div className="flex items-center space-x-3">
                   <span className="px-3 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">{entry.category}</span>
                   <span className="text-slate-700">•</span>
                   <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2"><Calendar size={12}/> Updated {new Date(entry.updated_at).toLocaleDateString()}</span>
                </div>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-tight max-w-3xl">{entry.title}</h1>
                <div className="flex flex-wrap gap-2 pt-2">
                   {entry.tags?.map((t: string) => (
                     <span key={t} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 uppercase flex items-center gap-2"><Tag size={10}/> {t}</span>
                   ))}
                </div>
             </div>
             <div className="flex items-center space-x-3">
                <button onClick={onEdit} className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-emerald-400 transition-all" title="Modify Entry"><Edit2 size={20}/></button>
                <button onClick={onDelete} className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-rose-500 transition-all" title="Expunge Entry"><Trash2 size={20}/></button>
                <div className="w-px h-10 bg-white/10 mx-2" />
                <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
             <div className="max-w-3xl mx-auto space-y-12">
                <div className="prose prose-invert max-w-none">
                   <div className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                      {entry.content}
                   </div>
                </div>

                {entry.category === 'Q&A' && (
                  <div className="space-y-6 pt-12 border-t border-white/5">
                     <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                        <MessageCircle size={20} className="text-amber-400" /> Collaboration Feed
                     </h3>
                     <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                           <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-black text-[10px]">AI</div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SysGrid Intelligence Agent</span>
                           </div>
                           <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Verified Answer</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">
                           The analysis suggests that this pattern is common in the current version of the registry. For optimal performance, ensure all assets are correctly tagged with their logical systems.
                        </p>
                     </div>
                  </div>
                )}
             </div>
          </div>

          <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
             <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                   <User size={12}/> Author: system_admin
                </div>
                <div className="flex items-center space-x-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                   <Clock size={12}/> Creation: {new Date(entry.created_at).toLocaleDateString()}
                </div>
             </div>
             <button className="flex items-center space-x-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">
                <ExternalLink size={14}/> Generate Share Link
             </button>
          </div>
       </motion.div>
    </div>
  )
}
