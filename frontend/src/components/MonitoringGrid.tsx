import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Activity, Plus, Search, Filter, ExternalLink, 
  Trash2, Edit2, Shield, Cpu, Database, Network, 
  Globe, Bell, Info, ChevronRight, X, Check, Save,
  AlertCircle, Clock, Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

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

  const filteredItems = items?.filter((item: any) => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.platform?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.device_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic flex items-center space-x-3">
            <Activity className="text-blue-500" size={32} />
            <span>Monitoring Matrix</span>
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Observability Infrastructure & Logic Registry</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={14} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search logic, platform, or host..."
              className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-white outline-none focus:border-blue-500/50 w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={14} />
            <span>Deploy Logic</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden glass-panel rounded-[32px] border-white/5 flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#020617]/80 backdrop-blur-md">
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Category</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Host / Target</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Monitoring Intent</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Platform</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Zap size={32} className="mx-auto text-blue-500 animate-pulse opacity-20" /></td></tr>
              ) : filteredItems?.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest italic">No monitoring logic found</td></tr>
              ) : filteredItems?.map((item: any) => {
                const CatIcon = CATEGORIES.find(c => c.value === item.category)?.icon || Activity
                const catColor = CATEGORIES.find(c => c.value === item.category)?.color || 'text-slate-400'
                const statusStyle = STATUSES.find(s => s.value === item.status)?.color || 'bg-slate-500/20 text-slate-400'
                
                return (
                  <motion.tr 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    key={item.id} 
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-white/5 ${catColor}`}><CatIcon size={14} /></div>
                        <span className="text-[10px] font-black uppercase tracking-tight text-white">{item.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${statusStyle}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white uppercase">{item.device_name || 'Global Target'}</span>
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-0.5">ID: {item.device_id || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-md">
                        <span className="text-[11px] font-black text-blue-400 uppercase tracking-tight">{item.title}</span>
                        <span className="text-[9px] font-medium text-slate-400 line-clamp-1 mt-1">{item.purpose}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-slate-300">{item.platform}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                        {item.external_link && (
                          <a href={item.external_link} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button onClick={() => { setEditingItem(item); setIsFormOpen(true); }} className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteMutation.mutate(item.id)} className="p-2 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-xl transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
    </div>
  )
}

function MonitoringForm({ item, devices, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState(item || {
    category: 'Hardware',
    status: 'Planned',
    title: '',
    spec: '',
    platform: 'Zabbix',
    external_link: '',
    purpose: '',
    notification_method: 'Email',
    logic: '',
    device_id: null
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-10 rounded-[48px] border-blue-500/30"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-8 mb-8">
           <div className="flex items-center space-x-4">
              <div className="p-4 bg-blue-600/10 rounded-3xl text-blue-400">
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

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 grid grid-cols-2 gap-8">
           <div className="space-y-6">
              <StyledSelect 
                label="Target Resource"
                value={formData.device_id}
                onChange={(e: any) => setFormData({...formData, device_id: e.target.value})}
                options={devices?.map((d: any) => ({ value: d.id, label: `${d.name} (${d.system})` })) || []}
                placeholder="Select Device..."
              />
              
              <div className="grid grid-cols-2 gap-4">
                <StyledSelect 
                  label="Category"
                  value={formData.category}
                  onChange={(e: any) => setFormData({...formData, category: e.target.value})}
                  options={CATEGORIES.map(c => ({ value: c.value, label: c.value }))}
                />
                <StyledSelect 
                  label="Status"
                  value={formData.status}
                  onChange={(e: any) => setFormData({...formData, status: e.target.value})}
                  options={STATUSES.map(s => ({ value: s.value, label: s.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monitoring Intent</label>
                <input 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., CPU Thermal Threshold / Error log parsing"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Technical Specifications</label>
                <textarea 
                  value={formData.spec}
                  onChange={e => setFormData({...formData, spec: e.target.value})}
                  placeholder="Metrics, thresholds, intervals..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>
           </div>

           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Platform</label>
                  <input 
                    value={formData.platform}
                    onChange={e => setFormData({...formData, platform: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notifications</label>
                  <input 
                    value={formData.notification_method}
                    onChange={e => setFormData({...formData, notification_method: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Direct Logic / Logic Pattern</label>
                <textarea 
                  value={formData.logic}
                  onChange={e => setFormData({...formData, logic: e.target.value})}
                  placeholder="Regex, query strings, or scripts..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-mono text-blue-400 outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Direct Resource Link (URL)</label>
                <input 
                  value={formData.external_link}
                  onChange={e => setFormData({...formData, external_link: e.target.value})}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-blue-500 underline outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="p-6 bg-blue-500/5 rounded-[32px] border border-blue-500/10 flex items-start space-x-4">
                <Info className="text-blue-400 mt-1 flex-shrink-0" size={16} />
                <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">
                  This monitoring configuration will be synchronized with the global audit trail. All modifications are logged for compliance and alignment across the system ownership team.
                </p>
              </div>
           </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex justify-end space-x-4">
           <button onClick={onClose} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all">Cancel</button>
           <button 
             onClick={() => mutation.mutate(formData)}
             disabled={mutation.isPending}
             className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:bg-slate-700 flex items-center space-x-2"
           >
             {mutation.isPending ? <Clock className="animate-spin" size={14} /> : <Check size={14} />}
             <span>{item ? 'Save Logic' : 'Deploy Logic'}</span>
           </button>
        </div>
      </motion.div>
    </div>
  )
}
