import React from 'react'
import { AlertCircle, Terminal, Copy, Bug } from 'lucide-react'
import toast from 'react-hot-toast'
import { WorkspaceModal } from './WorkspaceModal'

interface ErrorDetailModalProps {
  isOpen: boolean
  onClose: () => void
  error: any
}

export const ErrorDetailModal = ({ isOpen, onClose, error }: ErrorDetailModalProps) => {
  const copyToClipboard = () => {
    if (!error) return
    const text = `Error: ${error.message}\n\nTraceback:\n${error.traceback || 'No traceback available'}\n\nData:\n${JSON.stringify(error.data || {}, null, 2)}`
    navigator.clipboard.writeText(text)
    toast.success('Traceback copied to clipboard')
  }

  return (
    <WorkspaceModal
      isOpen={isOpen}
      onClose={onClose}
      size="wide"
      title="System Fault Exception"
      subtitle="Advanced Debugging Interface"
      icon={<Bug size={24} />}
      footerLeft={(
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">
          End of Debug Stack · SysGrid Orchestration Engine
        </p>
      )}
      footerRight={(
        <button 
          type="button"
          onClick={copyToClipboard}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-[10px] font-black uppercase text-slate-400 transition-colors hover:text-white"
        >
          <Copy size={12} />
          Copy Full Context
        </button>
      )}
    >
      <div className="space-y-6">
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-6">
          <div className="flex items-center space-x-2 text-rose-400 mb-2">
            <AlertCircle size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Exception Message</span>
          </div>
          <p className="text-sm font-bold text-white leading-relaxed">{error?.message || 'Unknown error'}</p>
          {error?.status && <p className="text-[10px] font-mono text-rose-500/70 mt-2">HTTP Status Code: {error.status}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-blue-400">
            <Terminal size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Server-Side Traceback</span>
          </div>
          <div className="bg-black/60 rounded-lg p-6 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto border border-white/5 whitespace-pre">
            {error?.traceback || 'No server-side traceback captured for this exception type.'}
          </div>
        </div>

        {error?.data && Object.keys(error.data).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Bug size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Raw Response Data</span>
            </div>
            <pre className="bg-black/40 rounded-lg p-6 font-mono text-[11px] text-slate-400 border border-white/5 overflow-x-auto">
              {JSON.stringify(error.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </WorkspaceModal>
  )
}
