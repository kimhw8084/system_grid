import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import {
  WorkspaceModalHeader,
  WorkspaceModalFooter,
  WorkspaceModalSize,
  getWorkspaceModalShellClass,
} from './OperationalWorkspacePrimitives'

interface WorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  size?: WorkspaceModalSize
  title: string
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  status?: React.ReactNode
  children: React.ReactNode
  footerLeft?: React.ReactNode
  footerRight?: React.ReactNode
  isMaximized?: boolean
  onMaximizeToggle?: () => void
  tabs?: Array<{ id: string; label: string; badgeCount?: number }>
  activeTab?: string
  onTabChange?: (id: string) => void
  className?: string
}

export function WorkspaceModal({
  isOpen,
  onClose,
  size = 'standard',
  title,
  subtitle,
  icon,
  status,
  children,
  footerLeft,
  footerRight,
  isMaximized = false,
  onMaximizeToggle,
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: WorkspaceModalProps) {
  if (!isOpen) return null

  const modal = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3500] flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-sm sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`${getWorkspaceModalShellClass(isMaximized ? 'workspace' : size)} flex flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.62)] ${className}`}
        >
          <WorkspaceModalHeader
            icon={icon}
            title={title}
            subtitle={subtitle || ''}
            status={status}
            closeControl={
              <button
                type="button"
                onClick={onClose}
                className="group flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 text-slate-500 transition-all hover:bg-rose-500/10 hover:text-rose-400"
              >
                <X size={14} className="transition-transform group-hover:rotate-90" />
              </button>
            }
            maximizeControl={
              onMaximizeToggle && (
                <button
                  type="button"
                  onClick={onMaximizeToggle}
                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 text-slate-500 transition-all hover:bg-blue-500/10 hover:text-blue-400"
                >
                  {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
              )
            }
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
            {children}
          </div>

          {(footerLeft || footerRight) && (
            <WorkspaceModalFooter
              left={footerLeft}
              right={footerRight}
            />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
