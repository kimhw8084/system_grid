import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, X, Zap, ArrowRightLeft, ExternalLink } from 'lucide-react'
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
  const sourceDevice = devices.find(d => d.name === deviceName)

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
          <motion.div 
            initial={{ scale: 0.98, opacity: 0, y: 10 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.98, opacity: 0, y: 10 }}
            className="glass-panel w-full max-w-[950px] max-h-[85vh] flex flex-col rounded-lg border border-blue-500/30 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] bg-[#020617]/90"
          >
             {/* Header */}
             <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30 shadow-inner">
                      <Network size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                           Interconnect <span className="text-blue-400">Registry</span>
                           <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-500 font-mono tracking-normal">{deviceName}</span>
                        </h2>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                          <Zap size={10} className="text-amber-500" />
                          {connections.length} Active Physical Paths Detected
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-all border border-white/10 hover:border-rose-500/20 group">
                  <X size={20} className="group-hover:rotate-90 transition-transform duration-300"/>
                </button>
             </div>

             {/* Table Content */}
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.01] text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5">
                            <th className="px-8 py-4 font-black">Connected Peer (Target)</th>
                            <th className="px-6 py-4 font-black">Egress Port</th>
                            <th className="px-6 py-4 font-black text-center">Ingress Port</th>
                            <th className="px-6 py-4 font-black text-center">Speed</th>
                            <th className="px-6 py-4 font-black text-center">Type</th>
                            <th className="px-8 py-4 font-black text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {connections.map((conn) => {
                            // Logic to correctly identify the "other" device
                            const isSource = sourceDevice?.id === conn.source_device_id
                            const peerId = isSource ? conn.target_device_id : conn.source_device_id
                            const peerDevice = devices.find(d => d.id === peerId)

                            const peerName = peerDevice?.name || (isSource ? conn.server_b : conn.server_a) || "Unknown Asset"
                            const peerSystem = peerDevice?.system || "N/A"

                            const localPort = isSource ? conn.source_port : conn.target_port
                            const remotePort = isSource ? conn.target_port : conn.source_port

                            return (
                                <tr key={conn.id} className="group hover:bg-blue-500/[0.03] transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center shrink-0 group-hover:border-blue-500/30 transition-colors">
                                                <ArrowRightLeft size={14} className="text-slate-500 group-hover:text-blue-400" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-black text-slate-200 uppercase tracking-tight group-hover:text-white truncate">{peerName}</span>
                                                <span className="text-[9px] font-bold text-slate-600 group-hover:text-slate-400 transition-colors uppercase truncate">{peerSystem}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-mono font-bold text-blue-400">{localPort || 'AUTO-NEG'}</span>
                                            <span className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">Local Egress</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-mono font-bold text-emerald-400">{remotePort || 'AUTO-NEG'}</span>
                                            <span className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">Peer Ingress</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono font-bold border border-white/5">
                                        {conn.speed_gbps || '10'}G
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       {conn.link_type && (
                                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                               conn.link_type === 'Physical' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 
                                               conn.link_type === 'Virtual' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                               'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                           }`}>
                                               {conn.link_type}
                                           </span>
                                       )}
                                    </td>                                    <td className="px-8 py-4 text-right">
                                        <button 
                                            onClick={() => onViewForensics(conn)}
                                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95 group/btn"
                                        >
                                            <ExternalLink size={12} className="group-hover/btn:scale-110 transition-transform" />
                                            Inspect
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        {connections.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-32 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-20">
                                      <Network size={64} className="text-slate-500" />
                                      <div>
                                        <p className="text-slate-300 font-black uppercase italic tracking-[0.4em] text-lg">Empty Fabric</p>
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">No valid physical links mapped to this entity</p>
                                      </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>

             {/* Footer */}
             <div className="px-8 py-4 bg-white/[0.02] border-t border-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Fabric Verification Active</span>
                  </div>                  <div className="h-3 w-px bg-white/10" />
                  <span className="text-[9px] font-mono text-slate-600">ID: {sourceDevice?.id || '---'}</span>
                </div>
                <button onClick={onClose} className="px-8 py-2.5 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                    Close Registry
                </button>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
