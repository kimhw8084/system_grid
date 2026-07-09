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
import { OPERATIONAL_WORKSPACE_VISUALS } from './OperationalWorkspace'
import { ToolbarButton } from './LayoutPrimitives'
import { useOperationalDirtyGuard } from './OperationalWorkspaceHooks'

interface WorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  size?: WorkspaceModalSize
  title: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  status?: React.ReactNode
  forensicLineage?: { createdAt?: string | Date; updatedAt?: string | Date }
  children: React.ReactNode
  footerLeft?: React.ReactNode
  footerRight?: React.ReactNode
  isMaximized?: boolean
  onMaximizeToggle?: () => void
  tabs?: Array<{ id: string; label: string; badgeCount?: number }>
  activeTab?: string
  onTabChange?: (id: string) => void
  className?: string
  hideCloseButton?: boolean
  hideFooterClose?: boolean
  isDirty?: boolean
  resolveIsDirty?: () => boolean
  dirtyConfirmTitle?: string
  dirtyConfirmMessage?: string
  dirtyConfirmText?: string
}

export function WorkspaceModal({
  isOpen,
  onClose,
  size = 'standard',
  title,
  subtitle,
  icon,
  status,
  forensicLineage,
  children,
  footerLeft,
  footerRight,
  isMaximized = false,
  onMaximizeToggle,
  tabs,
  activeTab,
  onTabChange,
  className = '',
  hideCloseButton = false,
  hideFooterClose = false,
  isDirty = false,
  resolveIsDirty,
  dirtyConfirmTitle = 'Unsaved Changes',
  dirtyConfirmMessage = 'You have unsaved changes. Close this window and discard them?',
  dirtyConfirmText = 'Discard Changes',
}: WorkspaceModalProps) {
  const {
    requestDiscard,
    isConfirmOpen,
    confirmDiscard,
    cancelDiscard,
  } = useOperationalDirtyGuard({
    active: isOpen,
    isDirty,
    resolveIsDirty,
    onDiscard: onClose,
  })

  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestDiscard()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, requestDiscard])

  if (!isOpen) return null

  const resolvedFooterRight = (
      <div className="flex items-center gap-3 shrink-0">
      {!hideFooterClose ? (
        <ToolbarButton onClick={() => requestDiscard()} className="whitespace-nowrap">
          Close
        </ToolbarButton>
      ) : null}
      {footerRight}
    </div>
  )

  const modal = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[3500] flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-sm sm:p-6 lg:p-8"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) requestDiscard()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`${getWorkspaceModalShellClass(isMaximized ? 'fullscreen' : size)} glass-panel flex flex-col overflow-hidden bg-[#0b1222] ${(isMaximized || size === 'fullscreen') ? '' : `${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.62)]`} ${className}`}
        >
          <WorkspaceModalHeader
            icon={icon}
            title={title}
            subtitle={subtitle || ''}
            status={status}
            forensicLineage={forensicLineage}
            closeControl={
              hideCloseButton ? (
                <div className="w-3 h-3" />
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => requestDiscard()}
                    className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f57] transition-all hover:bg-[#ff5f57]/80"
                    title="Dismiss"
                  >
                    <X size={8} strokeWidth={4} className="text-[#4c0000] opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </div>
              )
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

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-20 sm:px-8 modal-content-spacing">
            {children}
          </div>

          <WorkspaceModalFooter
            left={footerLeft}
            right={resolvedFooterRight}
          />
        </motion.div>

        <AnimatePresence>
          {isConfirmOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[3600] flex items-center justify-center bg-[#020617]/82 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1222] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.62)]"
              >
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-100">{dirtyConfirmTitle}</h3>
                  <p className="text-sm text-slate-400">{dirtyConfirmMessage}</p>
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <ToolbarButton onClick={cancelDiscard} className="whitespace-nowrap">
                    Close
                  </ToolbarButton>
                  <ToolbarButton onClick={confirmDiscard} variant="primary" className="whitespace-nowrap">
                    {dirtyConfirmText}
                  </ToolbarButton>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
