import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Key, Lock, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'

export default function SecurityVault() {
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({})
  const queryClient = useQueryClient()

  const { data: secrets } = useQuery({
    queryKey: ['secrets'],
    queryFn: async () => {
      const res = await fetch('/api/v1/security/vault')
      return res.json()
    }
  })

  const toggleSecret = (id: number) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Security Vault</h1>
        <button className="flex items-center space-x-2 px-4 py-2 bg-rose-600/10 text-rose-400 border border-rose-600/20 rounded-xl text-xs font-bold hover:bg-rose-600/20 transition-all">
          <Plus size={14} />
          <span>Add Secret</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center space-x-3 mb-2">
             <div className="p-2 bg-rose-500/10 rounded-lg">
               <Shield size={18} className="text-rose-400" />
             </div>
             <h3 className="font-bold text-sm">Active Safeguards</h3>
          </div>
          <div className="space-y-3">
             {[
               { label: 'AES-256 Encryption', status: 'Enabled' },
               { label: 'LDAP-Linked RBAC', status: 'Active' },
               { label: 'Forensic Logging', status: 'Mandatory' }
             ].map(item => (
               <div key={item.label} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                 <span className="text-xs text-slate-400">{item.label}</span>
                 <span className="text-[10px] font-black uppercase text-emerald-400">{item.status}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border-rose-500/5 bg-rose-500/5 flex flex-col justify-center items-center text-center space-y-2">
           <Lock size={32} className="text-rose-400/20 mb-2" />
           <p className="text-[10px] text-rose-400/50 uppercase tracking-[0.3em] font-black">Immutable Security Layer</p>
           <p className="text-xs text-slate-500 max-w-xs italic">All credential access is linked to your LDAP identity and immutably recorded in the Audit Logs.</p>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-900/50 text-slate-500 uppercase tracking-wider border-b border-white/5">
              <th className="px-6 py-4 font-bold">Device / Entity</th>
              <th className="px-6 py-4 font-bold">Type</th>
              <th className="px-6 py-4 font-bold">Username</th>
              <th className="px-6 py-4 font-bold">Secret Payload</th>
              <th className="px-6 py-4 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {secrets?.map((s: any) => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-200">DEVICE-{s.device_id || '99'}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 bg-slate-800 rounded-md text-slate-500 text-[9px] font-bold uppercase tracking-widest">{s.secret_type || 'SSH'}</span>
                </td>
                <td className="px-6 py-4 text-slate-400 font-mono">admin_user</td>
                <td className="px-6 py-4">
                   <div className="flex items-center space-x-3">
                      <span className="font-mono text-slate-600 italic">
                        {showSecrets[s.id] ? 'P@ssword123!' : '••••••••••••'}
                      </span>
                      <button onClick={() => toggleSecret(s.id)} className="text-slate-500 hover:text-blue-400">
                        {showSecrets[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                   </div>
                </td>
                <td className="px-6 py-4">
                  <button className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors group">
                    <Trash2 size={14} className="text-slate-600 group-hover:text-rose-400" />
                  </button>
                </td>
              </tr>
            ))}
             {(!secrets || secrets.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-600 italic uppercase tracking-widest text-[10px]">
                   Security vault is empty
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
