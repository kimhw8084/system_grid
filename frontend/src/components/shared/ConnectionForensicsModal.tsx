import React from 'react'
import { Network, Edit2 } from 'lucide-react'
import { WorkspaceModal } from './WorkspaceModal'

interface ConnectionForensicsModalProps {
  isOpen: boolean
  onClose: () => void
  connection: any
  onEdit?: (connection: any) => void
}

export const ConnectionForensicsModal: React.FC<ConnectionForensicsModalProps> = ({ isOpen, onClose, connection, onEdit }) => {
  if (!connection) return null

  return (
    <WorkspaceModal
      isOpen={isOpen}
      onClose={onClose}
      size="wide"
      title="Connection Forensics"
      subtitle="Detailed physical layer telemetry."
      icon={<Network size={24} />}
      footerRight={(
        <>
          <button 
            onClick={onClose} 
            className="rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-[10px] font-black uppercase text-slate-300 transition-colors hover:text-white"
          >
            Close
          </button>
          {onEdit && (
            <button 
              onClick={() => onEdit(connection)} 
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[10px] font-black uppercase text-white transition-colors hover:bg-blue-500"
            >
              <Edit2 size={12} />
              Edit Connection
            </button>
          )}
        </>
      )}
    >
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-lg relative overflow-hidden group h-full">
            <div className="absolute top-0 right-0 p-2 text-[8px] font-black uppercase text-blue-500/30">SOURCE ENTITY</div>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Entity Name</p>
            <p className="text-xl font-black text-white truncate">{connection.server_a || connection.source_device_name}</p>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Port</span>
                <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">{connection.source_port}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">IP Address</span>
                <span className="text-[10px] font-mono font-bold text-white">{connection.source_ip || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">MAC Address</span>
                <span className="text-[10px] font-mono font-bold text-slate-300">{connection.source_mac || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">VLAN</span>
                <span className="text-[10px] font-black text-indigo-400">{connection.source_vlan || '-'}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Rack:Slot</span>
                <span className="text-[10px] font-black text-slate-300 uppercase">{connection.src_rack || 'N/A'}:{connection.src_slot || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg relative overflow-hidden group h-full">
            <div className="absolute top-0 right-0 p-2 text-[8px] font-black uppercase text-emerald-500/30">PEER ENTITY</div>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Entity Name</p>
            <p className="text-xl font-black text-white truncate">{connection.server_b || connection.target_device_name}</p>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Port</span>
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">{connection.target_port}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">IP Address</span>
                <span className="text-[10px] font-mono font-bold text-white">{connection.target_ip || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">MAC Address</span>
                <span className="text-[10px] font-mono font-bold text-slate-300">{connection.target_mac || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">VLAN</span>
                <span className="text-[10px] font-black text-indigo-400">{connection.target_vlan || '-'}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Rack:Slot</span>
                <span className="text-[10px] font-black text-slate-300 uppercase">{connection.peer_rack || 'N/A'}:{connection.peer_slot || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2 p-6 bg-black/20 border border-white/5 rounded-lg space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-black/20 rounded-lg p-3 border border-white/5">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Farm / System</p>
              <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">{connection.farm || 'Standalone'}</p>
            </div>
            <div className="text-center bg-black/20 rounded-lg p-3 border border-white/5">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Link Status</p>
              <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">{connection.status || 'Active'}</p>
            </div>
            <div className="text-center bg-black/20 rounded-lg p-3 border border-white/5">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Fabric Speed</p>
              <p className="text-[11px] font-black text-white tracking-widest uppercase">{connection.speed || (connection.speed_gbps ? connection.speed_gbps + ' Gbps' : '-')}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-5">
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Mission Purpose / Logic</p>
              <p className="text-xs font-semibold text-slate-300 leading-relaxed">{connection.purpose || 'No description provided.'}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Cabling Request</p>
              {connection.request_link ? (
                <a href={connection.request_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 font-bold hover:underline hover:text-blue-300 truncate block max-w-full transition-colors">
                  {connection.request_link}
                </a>
              ) : (
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">No Link Provided</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceModal>
  )
}
