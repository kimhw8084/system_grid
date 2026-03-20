import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Network, Share2, Plus, Zap, ShieldCheck } from 'lucide-react'

export default function NetworkFabric() {
  const queryClient = useQueryClient()
  const { data: interfaces, isLoading } = useQuery({
    queryKey: ['interfaces'],
    queryFn: async () => {
      const res = await fetch('/api/v1/networks/interfaces')
      return res.json()
    }
  })

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Network Fabric</h1>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-600/20 rounded-xl text-xs font-bold hover:bg-blue-600/20 transition-all">
          <Plus size={14} />
          <span>Add Interface</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Network Overview */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Active Interfaces</p>
            <p className="text-2xl font-bold">{interfaces?.length || 0}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Network size={20} className="text-blue-400" />
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Bandwidth</p>
            <p className="text-2xl font-bold">800 Gbps</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <Zap size={20} className="text-emerald-400" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Health Index</p>
            <p className="text-2xl font-bold">99.8%</p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl">
            <ShieldCheck size={20} className="text-indigo-400" />
          </div>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-900/50 text-slate-500 uppercase tracking-wider border-b border-white/5">
              <th className="px-6 py-4 font-bold">Interface</th>
              <th className="px-6 py-4 font-bold">MAC Address</th>
              <th className="px-6 py-4 font-bold">IPv4 Address</th>
              <th className="px-6 py-4 font-bold">Link Speed</th>
              <th className="px-6 py-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {interfaces?.map((inf: any) => (
              <tr key={inf.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 font-mono text-blue-100">{inf.name || 'eth0'}</td>
                <td className="px-6 py-4 text-slate-400">{inf.mac_address || '00:00:00:00:00:00'}</td>
                <td className="px-6 py-4 text-slate-400">{inf.ip_address || '10.0.0.1'}</td>
                <td className="px-6 py-4 font-mono text-slate-500">{inf.link_speed_gbps || 10} Gbps</td>
                <td className="px-6 py-4">
                   <div className="flex items-center space-x-2 text-emerald-400 uppercase font-black text-[9px] tracking-widest">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                     <span>Active</span>
                   </div>
                </td>
              </tr>
            ))}
            {(!interfaces || interfaces.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-600 italic uppercase tracking-widest text-[10px]">
                   No network assets discovered
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
