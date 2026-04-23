import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Terminal, AlertTriangle, Bug, Clock, Search, Trash2, ChevronRight, ChevronDown, Copy, ShieldAlert, TerminalSquare, Filter, Database, Cpu, CheckCircle2, History } from 'lucide-react'
import { useErrors, SysError } from '../../stores/errorStore'
import { toast } from 'react-hot-toast'

export function ErrorConsole() {
  const { errors, isOpen, setOpen, clearErrors, acknowledgeError, acknowledgeAll } = useErrors()
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'FRONTEND' | 'BACKEND'>('ALL')
  const [showAcknowledged, setShowAcknowledged] = useState(true)

  const filteredErrors = useMemo(() => {
    return errors.filter(e => {
      const matchesSearch = e.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            e.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.stack?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'ALL' || e.type === filterType
      const matchesAck = showAcknowledged || !e.acknowledged
      return matchesSearch && matchesType && matchesAck
    })
  }, [errors, searchTerm, filterType, showAcknowledged])

  const selectedError = useMemo(() => errors.find(e => e.id === selectedErrorId), [errors, selectedErrorId])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Traceback copied to matrix')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#020617] w-full max-w-[1400px] h-[85vh] rounded-2xl border border-rose-500/20 shadow-[0_0_100px_rgba(244,63,94,0.15)] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500 border border-rose-500/20">
                  <Bug size={20} />
               </div>
               <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-white italic">Buganizer Terminal</h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">System Kernel & API Traceback Console</p>
               </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-4">
               <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-600 uppercase">Total Faults</span>
                  <span className="text-[12px] font-black text-rose-500">{errors.length}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-600 uppercase">Pending</span>
                  <span className="text-[12px] font-black text-amber-500">{errors.filter(e => !e.acknowledged).length}</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
               onClick={() => acknowledgeAll()}
               className="px-4 py-2 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600/20 transition-all flex items-center gap-2"
             >
                <CheckCircle2 size={14} /> Acknowledge All
             </button>
             <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 gap-1">
                {['ALL', 'FRONTEND', 'BACKEND'].map(type => (
                   <button 
                     key={type}
                     onClick={() => setFilterType(type as any)}
                     className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                      {type}
                   </button>
                ))}
             </div>
             <button 
               onClick={clearErrors}
               className="px-4 py-2 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-600/20 transition-all flex items-center gap-2"
             >
                <Trash2 size={14} /> Purge Console
             </button>
             <button 
               onClick={() => setOpen(false)}
               className="p-2 text-slate-500 hover:text-white transition-all"
             >
                <X size={24} />
             </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-8 py-3 bg-white/2 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-4 flex-1">
              <Search size={16} className="text-slate-600" />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="SCAN TRACEBACKS / MESSAGES / ENDPOINTS..."
                className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold text-slate-300 uppercase tracking-widest"
              />
           </div>
           <button 
             onClick={() => setShowAcknowledged(!showAcknowledged)}
             className={`px-4 py-1.5 rounded text-[9px] font-black uppercase tracking-widest border transition-all ${showAcknowledged ? 'bg-slate-800 text-slate-400 border-white/5' : 'bg-blue-600/10 text-blue-400 border-blue-500/20'}`}
           >
              {showAcknowledged ? 'HIDE ACKNOWLEDGED' : 'SHOW ALL'}
           </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Error List */}
          <div className="w-[450px] border-r border-white/5 overflow-y-auto custom-scrollbar bg-black/40">
            {filteredErrors.length > 0 ? (
              filteredErrors.map((error) => (
                <div 
                  key={error.id}
                  onClick={() => setSelectedErrorId(error.id)}
                  className={`px-6 py-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/[0.03] group relative ${selectedErrorId === error.id ? 'bg-rose-500/5 border-l-4 border-l-rose-500' : ''} ${error.acknowledged ? 'opacity-50 grayscale' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                       <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${error.type === 'BACKEND' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {error.type}
                       </span>
                       <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${error.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-rose-500/20 text-rose-400'}`}>
                          {error.severity}
                       </span>
                       {error.acknowledged && (
                         <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">ACKNOWLEDGED</span>
                       )}
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[8px] font-bold text-slate-600">{new Date(error.timestamp).toLocaleDateString()}</span>
                       <span className="text-[8px] font-bold text-slate-600">{new Date(error.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <h3 className={`text-[11px] font-black uppercase tracking-tight mb-1 truncate ${selectedErrorId === error.id ? 'text-rose-400' : 'text-slate-200'}`}>
                    {error.message}
                  </h3>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[8px] font-bold text-blue-500 shrink-0">{error.view || '/'}</span>
                    <p className="text-[9px] font-bold text-slate-500 uppercase truncate">
                      {error.url || 'Internal Context'}
                    </p>
                  </div>
                  {selectedErrorId === error.id && (
                    <motion.div layoutId="active-indicator" className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500">
                       <ChevronRight size={18} />
                    </motion.div>
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                 <Terminal size={48} className="text-slate-600 mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-[0.4em]">Matrix Clean</p>
              </div>
            )}
          </div>

          {/* Details Pane */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-[#010410]">
            {selectedError ? (
              <div className="space-y-8 max-w-5xl">
                <div className="flex items-start justify-between">
                   <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                         <h2 className="text-3xl font-black text-rose-500 uppercase italic tracking-tighter leading-none">{selectedError.message}</h2>
                      </div>
                      <div className="flex items-center gap-6">
                         <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-600" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(selectedError.timestamp).toLocaleString()}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <ShieldAlert size={14} className="text-slate-600" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID: {selectedError.id}</span>
                         </div>
                         <div className="flex items-center gap-2 text-blue-400">
                            <History size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">VIEW: {selectedError.view || 'ROOT'}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-3 shrink-0">
                      {!selectedError.acknowledged && (
                        <button 
                          onClick={() => acknowledgeError(selectedError.id)}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                           Acknowledge Fault
                        </button>
                      )}
                      <button 
                        onClick={() => copyToClipboard(`MESSAGE: ${selectedError.message}\nVIEW: ${selectedError.view}\nTIMESTAMP: ${selectedError.timestamp}\nSTACK: ${selectedError.stack}\nDATA: ${JSON.stringify(selectedError.data, null, 2)}`)}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl"
                      >
                         <Copy size={16} /> Copy Full Traceback
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                         <Database size={14} className="text-indigo-400" />
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Request Metadata</span>
                      </div>
                      <div className="bg-white/2 rounded-xl p-6 border border-white/5 space-y-4 font-mono">
                         <div className="flex justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Endpoint</span>
                            <span className="text-[10px] text-indigo-400 font-bold">{selectedError.url || 'N/A'}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Method</span>
                            <span className="text-[10px] text-white font-black">{selectedError.method || 'N/A'}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Status Code</span>
                            <span className={`text-[10px] font-black ${selectedError.status && selectedError.status >= 500 ? 'text-rose-500' : 'text-amber-500'}`}>{selectedError.status || 'N/A'}</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                         <Cpu size={14} className="text-emerald-400" />
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Execution Context</span>
                      </div>
                      <div className="bg-white/2 rounded-xl p-6 border border-white/5 space-y-4 font-mono">
                         <div className="flex justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Type</span>
                            <span className="text-[10px] text-emerald-400 font-bold">{selectedError.type}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Platform</span>
                            <span className="text-[10px] text-white font-black">{navigator.platform}</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 uppercase font-bold shrink-0">User Agent</span>
                            <span className="text-[8px] text-slate-400 font-bold truncate ml-4 max-w-[200px]">{navigator.userAgent}</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <TerminalSquare size={14} className="text-rose-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Traceback Dump</span>
                   </div>
                   <div className="bg-black border border-white/10 rounded-2xl p-8 font-mono overflow-x-auto shadow-2xl relative">
                      <div className="absolute top-4 right-4 flex gap-2">
                         <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                         <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                         <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                      </div>
                      <code className="text-[11px] leading-relaxed block whitespace-pre text-rose-400/90">
                        {selectedError.stack || 'No stack trace available for this event.'}
                      </code>
                   </div>
                </div>

                {selectedError.data && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <Filter size={14} className="text-blue-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Response Payload (JSON)</span>
                    </div>
                    <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-8 font-mono shadow-inner">
                        <pre className="text-[11px] text-blue-300 overflow-auto">
                          {JSON.stringify(selectedError.data, null, 2)}
                        </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-500 space-y-4">
                 <Terminal size={64} />
                 <p className="text-xs font-black uppercase tracking-[0.5em]">SELECT A FAULT FOR DEEP INSPECTION</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Stats */}
        <div className="px-8 py-3 bg-white/5 border-t border-white/10 flex items-center justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest">
           <div className="flex items-center gap-6">
              <span>TRACING ACTIVE</span>
              <span className="w-1 h-1 rounded-full bg-slate-800" />
              <span>LOG RETENTION: 100 RECORDS</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-rose-500">SYSGRID BUGANIZER</span>
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
           </div>
        </div>
      </motion.div>
    </div>
  )
}
