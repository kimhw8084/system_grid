import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Network, Share2, Plus, Zap, ShieldCheck, X } from 'lucide-react'

export default function NetworkFabric() {
  const [selectedServers, setSelectedServers] = useState<string[]>([])

  const { data: interfaces } = useQuery({
    queryKey: ['interfaces'],
    queryFn: async () => (await fetch('/api/v1/networks/interfaces')).json()
  })

  // Mock Connections for Viz
  const connections = [
    { from: 'SRV-001', to: 'SW-CORE-A', speed: '100G', purpose: 'Uplink' },
    { from: 'SRV-002', to: 'SW-CORE-A', speed: '10G', purpose: 'Data' },
    { from: 'SRV-003', to: 'SW-CORE-B', speed: '10G', purpose: 'Data' },
  ]

  const filteredConnections = connections.filter(c => 
    selectedServers.length === 0 || selectedServers.includes(c.from) || selectedServers.includes(c.to)
  )

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight uppercase">Network Fabric & Interconnects</h1>
        <div className="flex items-center space-x-2">
           <span className="text-[10px] font-bold text-slate-500 uppercase">Selected:</span>
           <div className="flex -space-x-2">
              {selectedServers.map(s => (
                <div key={s} onClick={() => setSelectedServers(prev => prev.filter(x => x !== s))} className="w-6 h-6 rounded-full bg-blue-600 border-2 border-[#020617] flex items-center justify-center text-[8px] font-bold cursor-pointer hover:bg-rose-600 transition-colors">{s.slice(-2)}</div>
              ))}
           </div>
        </div>
      </div>

      {/* Wire Visualization Area */}
      <div className="h-1/3 glass-panel rounded-3xl relative overflow-hidden bg-slate-900/20 border border-white/5 flex items-center justify-center">
        {selectedServers.length === 0 ? (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 animate-pulse">Select entities below to visualize interconnects</p>
        ) : (
          <svg className="w-full h-full px-20">
            {filteredConnections.map((c, i) => (
              <g key={i}>
                <line x1="10%" y1={50 + i*40} x2="90%" y2={150} stroke="#034EA2" strokeWidth="2" strokeDasharray="4 2" className="animate-[dash_2s_linear_infinite]" />
                <text x="5%" y={55 + i*40} fill="white" fontSize="10" fontWeight="bold">{c.from}</text>
                <text x="92%" y="155" fill="#60a5fa" fontSize="10" fontWeight="bold">{c.to}</text>
                <text x="50%" y={45 + i*40} fill="#94a3b8" fontSize="8" textAnchor="middle uppercase">{c.speed} - {c.purpose}</text>
              </g>
            ))}
          </svg>
        )}
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border-white/5">
        <div className="bg-slate-900/50 px-6 py-3 border-b border-white/5 flex items-center justify-between">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Interface Registry</h3>
           <button className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all"><Plus size={14}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="text-slate-500 uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4 font-bold">Entity</th>
                <th className="px-6 py-4 font-bold">Interface</th>
                <th className="px-6 py-4 font-bold">IP Address</th>
                <th className="px-6 py-4 font-bold">Peer Node</th>
                <th className="px-6 py-4 font-bold">Speed</th>
                <th className="px-6 py-4 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {['SRV-001', 'SRV-002', 'SRV-003'].map((name) => (
                <tr key={name} className={`hover:bg-white/5 transition-colors cursor-pointer ${selectedServers.includes(name) ? 'bg-blue-500/10' : ''}`} onClick={() => setSelectedServers(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])}>
                  <td className="px-6 py-4 font-bold text-blue-100">{name}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono">eth0</td>
                  <td className="px-6 py-4 text-slate-400 font-mono">10.20.30.{name.slice(-1)}</td>
                  <td className="px-6 py-4 text-blue-400 font-bold">SW-CORE-A</td>
                  <td className="px-6 py-4 text-emerald-400 font-bold">10G</td>
                  <td className="px-6 py-4"><button className="text-slate-600 hover:text-rose-400"><X size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -12; }
        }
      `}</style>
    </div>
  )
}
