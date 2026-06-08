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
          className={`${getWorkspaceModalShellClass(isMaximized ? 'workspace' : size)} flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0b1222] shadow-[0_24px_80px_rgba(0,0,0,0.62)] ${className}`}
        >
          <WorkspaceModalHeader
            icon={icon}
            title={title}
            subtitle={subtitle || ''}
            status={status}
            closeControl={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f57] transition-all hover:bg-[#ff5f57]/80"
                  title="Close"
                >
                  <X size={8} strokeWidth={4} className="text-[#4c0000] opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
                <div className="h-3 w-3 rounded-full bg-[#ffbd2e] opacity-50 cursor-not-allowed" title="Minimize" />
              </div>
            }
            maximizeControl={
              onMaximizeToggle && (
                <button
                  type="button"
                  onClick={onMaximizeToggle}
                  className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#28c940] transition-all hover:bg-[#28c940]/80"
                  title={isMaximized ? 'Restore size' : 'Maximize'}
                >
                  {isMaximized ? (
                    <Minimize2 size={8} strokeWidth={4} className="text-[#003300] opacity-0 transition-opacity group-hover:opacity-100" />
                  ) : (
                    <Maximize2 size={8} strokeWidth={4} className="text-[#003300] opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </button>
              )
            }
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-10 sm:px-8 pt-8">
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
