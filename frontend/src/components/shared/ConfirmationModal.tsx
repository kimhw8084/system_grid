import React from 'react'
import { AlertTriangle, Check, Trash2, HelpCircle } from 'lucide-react'
import { WorkspaceModal } from './WorkspaceModal'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  variant?: 'danger' | 'info' | 'warning' | 'success'
}

export const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm Action', 
  variant = 'info'
}: ConfirmationModalProps) => {
  const getVariantIcon = () => {
    switch (variant) {
      case 'danger': return <Trash2 size={24} className="text-rose-500" />
      case 'warning': return <AlertTriangle size={24} className="text-amber-500" />
      case 'success': return <Check size={24} className="text-emerald-500" />
      default: return <HelpCircle size={24} className="text-blue-500" />
    }
  }

  const getVariantColor = () => {
    switch (variant) {
      case 'danger': return 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
      case 'warning': return 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
      case 'success': return 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
      default: return 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
    }
  }

  return (
    <WorkspaceModal
      isOpen={isOpen}
      onClose={onClose}
      size="compact"
      title={title}
      subtitle={message}
      icon={getVariantIcon()}
      hideCloseButton={true}
      hideFooterClose={true}
      footerRight={(
        <>
          <button 
            type="button"
            onClick={onClose} 
            className="rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-[10px] font-black uppercase text-slate-500 transition-all hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
            className={`rounded-lg px-6 py-2 ${getVariantColor()} text-[10px] font-black uppercase text-white shadow-lg transition-all active:scale-95`}
          >
            {confirmText}
          </button>
        </>
      )}
    >
      <div className="py-4">
        <p className="text-[11px] font-bold leading-relaxed text-slate-400">
          Please confirm you want to proceed with this action. This operation may be irreversible depending on the context.
        </p>
      </div>
    </WorkspaceModal>
  )
}
