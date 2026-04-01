import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, X, Zap, ArrowRightLeft } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ConnectionsListModalProps {
  isOpen: boolean
  onClose: () => void
  connections: any[]
  devices: any[]
  deviceName: string
  onViewForensics: (conn: any) => void
}

export const ConnectionsListModal: React.FC<ConnectionsListModalProps> = ({ isOpen, onClose, connections, devices, deviceName, onViewForensics }) => {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="glass-panel w-full max-w-[850px] max-h-[85vh] flex flex-col p-10 rounded-[40px] border border-blue-500/30 overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.6)]"
          >
             <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-blue-500/10 rounded-[20px] border border-blue-500/20">
                      <Network size={32} className="text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white">
                           Fabric <span className="text-blue-400">Interconnects</span>
                        </h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                          <Zap size={10} className="text-amber-400" />
                          Topological analysis for {deviceName}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-3 bg-white/5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-2xl transition-all border border-white/10 hover:border-rose-500/20">
                  <X size={24}/>
                </button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 -mr-4">
                <table className="w-full text-[10px] border-separate border-spacing-y-3">
                    <thead>
                        <tr className="text-slate-500 font-black uppercase tracking-[0.15em] text-left">
                            <th className="px-6 py-2">Target Entity / Node</th>
                            <th className="px-6 py-2">Egress (Local)</th>
                            <th className="px-6 py-2">Ingress (Peer)</th>
                            <th className="px-6 py-2 text-center">Fabric Speed</th>
                            <th className="px-6 py-2 text-center">Class</th>
                            <th className="px-6 py-2 text-right">Operation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {connections.map((conn) => {
                            const isSource = devices.find(d => d.name === deviceName)?.id === conn.source_device_id
                            const peerName = isSource ? conn.target_device_name || devices.find(d => d.id === conn.target_device_id)?.name : conn.source_device_name || devices.find(d => d.id === conn.source_device_id)?.name
                            const localPort = isSource ? conn.source_port : conn.target_port
                            const remotePort = isSource ? conn.target_port : conn.source_port
                            
                            return (
                                <tr key={conn.id} className="group bg-slate-900/40 hover:bg-blue-500/5 transition-all">
                                    <td className="px-6 py-4 rounded-l-2xl border-l border-y border-white/5 group-hover:border-blue-500/20">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-white/5 rounded-xl group-hover:bg-blue-500/10 transition-colors border border-white/5 group-hover:border-blue-500/20">
                                                <ArrowRightLeft size={14} className="text-slate-500 group-hover:text-blue-400" />
                                            </div>
                                            <span className="font-black text-slate-200 uppercase tracking-tight group-hover:text-white transition-colors truncate max-w-[180px]">{peerName || 'Unknown Peer'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-y border-white/5 group-hover:border-blue-500/20 font-mono text-blue-400 font-bold">{localPort || 'AUTO-NEG'}</td>
                                    <td className="px-6 py-4 border-y border-white/5 group-hover:border-blue-500/20 font-mono text-emerald-400 font-bold">{remotePort || 'AUTO-NEG'}</td>
                                    <td className="px-6 py-4 border-y border-white/5 group-hover:border-blue-500/20 text-center font-black text-slate-300">
                                      <span className="px-2 py-1 bg-slate-800 rounded-lg border border-white/5 group-hover:border-blue-500/20">
                                        {conn.speed_gbps || '10'} Gbps
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 border-y border-white/5 group-hover:border-blue-500/20 text-center">
                                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black uppercase text-[8px] tracking-widest">
                                            {conn.link_type || conn.purpose || 'DATA'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 rounded-r-2xl border-r border-y border-white/5 group-hover:border-blue-500/20 text-right">
                                        <button 
                                            onClick={() => onViewForensics(conn)}
                                            className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all active:scale-95"
                                        >
                                            Inspect
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        {connections.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                      <Network size={48} className="text-slate-500" />
                                      <p className="text-slate-400 font-black uppercase italic tracking-[0.3em]">No valid interconnects found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>

             <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{connections.length} Physical Links</span>
                  </div>
                </div>
                <button onClick={onClose} className="px-10 py-4 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95">
                    Dismiss View
                </button>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
