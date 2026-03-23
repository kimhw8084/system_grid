import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Network, Share2, Plus, Zap, ShieldCheck, X, ArrowRightLeft, Link, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function NetworkFabric() {
  const queryClient = useQueryClient()
  const [selectedServers, setSelectedServers] = useState<string[]>([])
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connData, setConnData] = useState({ 
    device_a_id: '', port_a: '', device_b_id: '', port_b: '', 
    purpose: 'Data', speed: 10, unit: 'Gbps' 
  })

  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await fetch('/api/v1/devices/')).json() })
  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: async () => (await fetch('/api/v1/networks/connections')).json() })

  const addConnection = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/v1/networks/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Link establishment failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      setShowConnectModal(false)
    }
  })

  const purposes = [
    'Data Plane', 'Management', 'Storage (ISCSI/NFS)', 'vMotion / Live Migration', 
    'Heartbeat / Keepalive', 'Backup / Replication', 'OOB (Out of Band)', 
    'Cluster Interconnect', 'Public Facing', 'DMZ Ingress'
  ]

  const filteredConnections = connections?.filter((c: any) => 
    selectedServers.length === 0 || selectedServers.includes(c.server_a) || selectedServers.includes(c.server_b)
  )

  return (
    <div className="h-full flex flex-col space-y-6 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight uppercase">Network Fabric & Interconnects</h1>
        <div className="flex items-center space-x-4">
           <button onClick={() => setShowConnectModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">
              <Link size={14} />
              <span>Establish Link</span>
           </button>
           <div className="flex -space-x-2">
              {selectedServers.map(s => (
                <div key={s} onClick={() => setSelectedServers(prev => prev.filter(x => x !== s))} className="w-6 h-6 rounded-full bg-blue-600 border-2 border-[#020617] flex items-center justify-center text-[8px] font-bold cursor-pointer hover:bg-rose-600 transition-colors uppercase">{s.slice(0,2)}</div>
              ))}
           </div>
        </div>
      </div>

      <div className="h-1/3 glass-panel rounded-3xl relative overflow-hidden bg-slate-900/20 border border-white/5 flex items-center justify-center">
        {(!filteredConnections || filteredConnections.length === 0) ? (
          <div className="text-center space-y-2 opacity-30">
             <Activity size={32} className="mx-auto text-slate-500" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No links discovered for selection</p>
          </div>
        ) : (
          <svg className="w-full h-full px-20">
            {filteredConnections.map((c: any, i: number) => (
              <g key={i}>
                <line x1="10%" y1={50 + i*40} x2="90%" y2={150} stroke="#034EA2" strokeWidth="2" strokeDasharray="4 2" className="animate-[dash_2s_linear_infinite]" />
                <text x="5%" y={55 + i*40} fill="white" fontSize="10" fontWeight="bold">{c.server_a} [{c.port_a}]</text>
                <text x="92%" y={155} fill="#60a5fa" fontSize="10" fontWeight="bold">{c.server_b} [{c.port_b}]</text>
                <text x="50%" y={45 + i*40} fill="#94a3b8" fontSize="8" textAnchor="middle uppercase" fontWeight="bold">{c.speed} - {c.purpose}</text>
              </g>
            ))}
          </svg>
        )}
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border-white/5">
        <div className="bg-slate-900/50 px-6 py-3 border-b border-white/5 flex items-center justify-between uppercase">
           <h3 className="text-[10px] font-black tracking-widest text-slate-400">Interconnect Registry</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="text-slate-500 uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4 font-bold">Server A</th>
                <th className="px-6 py-4 font-bold">Port A</th>
                <th className="px-6 py-4 font-bold">Direction</th>
                <th className="px-6 py-4 font-bold">Server B</th>
                <th className="px-6 py-4 font-bold">Port B</th>
                <th className="px-6 py-4 font-bold">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {connections?.map((c: any) => (
                <tr key={c.id} className={`hover:bg-white/5 transition-colors cursor-pointer ${selectedServers.includes(c.server_a) ? 'bg-blue-500/10' : ''}`} onClick={() => setSelectedServers(prev => prev.includes(c.server_a) ? prev.filter(x => x !== c.server_a) : [...prev, c.server_a])}>
                  <td className="px-6 py-4 font-bold text-blue-100">{c.server_a}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono uppercase">{c.port_a}</td>
                  <td className="px-6 py-4 text-slate-600"><ArrowRightLeft size={12}/></td>
                  <td className="px-6 py-4 font-bold text-blue-400">{c.server_b}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono uppercase">{c.port_b}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                       <span className="text-blue-400 text-[9px] font-black uppercase">{c.purpose}</span>
                       <span className="text-[8px] text-slate-500 font-mono">{c.speed}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[500px] p-8 rounded-3xl space-y-6">
              <h2 className="text-xl font-bold uppercase tracking-tight flex items-center space-x-3">
                 <Link size={20} className="text-blue-400" />
                 <span>Establish Connectivity</span>
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Server A (Source)</label>
                  <select onChange={e => setConnData({...connData, device_a_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 mt-1">
                    <option value="">Select Asset...</option>
                    {devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Port A</label>
                  <input onChange={e => setConnData({...connData, port_a: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 mt-1" placeholder="eth0" />
                </div>
                <div className="col-span-2 border-t border-white/5 pt-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Server B (Peer)</label>
                  <select onChange={e => setConnData({...connData, device_b_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 mt-1">
                    <option value="">Select Asset...</option>
                    {devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Port B</label>
                  <input onChange={e => setConnData({...connData, port_b: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 mt-1" placeholder="Te1/1/1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Link Speed</label>
                  <div className="flex space-x-2">
                    <input type="number" value={connData.speed} onChange={e => setConnData({...connData, speed: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 mt-1" />
                    <select value={connData.unit} onChange={e => setConnData({...connData, unit: e.target.value})} className="bg-slate-900 border border-white/10 rounded-xl px-2 py-2 mt-1">
                      <option>Gbps</option>
                      <option>Mbps</option>
                    </select>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Link Purpose</label>
                  <select onChange={e => setConnData({...connData, purpose: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 mt-1">
                    {purposes.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setShowConnectModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400">Cancel</button>
                <button onClick={() => addConnection.mutate(connData)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Link Entities</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes dash { to { stroke-dashoffset: -12; } }
      `}</style>
    </div>
  )
}
