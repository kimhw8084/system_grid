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

export const WORKSPACE_MODAL_LAYER_CLASS = 'z-[3500]'
export const WORKSPACE_MODAL_CONFIRM_LAYER_CLASS = 'z-[3600]'
export const WORKSPACE_NESTED_MODAL_LAYER_CLASS = 'z-[3700]'

const WORKSPACE_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')
const PROJECT_PRIMARY_NAV_SELECTOR = '[data-project-primary-nav="true"]'
const PROJECT_PROGRESSIVE_NAV_SELECTOR = '[data-project-progressive-modes]'
const PROJECT_NAV_FOCUS_CLASSES = [
  'focus-visible:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-blue-400/70',
]

type ProjectNavigationWindow = Window & { __sysgridProjectNavigationA11yV1?: boolean }

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(WORKSPACE_FOCUSABLE_SELECTOR))
    .filter((element) => element.getAttribute('aria-hidden') !== 'true')
}

function focusFirstElement(root: HTMLElement | null) {
  const first = getFocusableElements(root)[0]
  ;(first || root)?.focus()
}

function getWorkspaceModalAccessibleName(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) {
    return node.map(getWorkspaceModalAccessibleName).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getWorkspaceModalAccessibleName(node.props.children)
  }
  return ''
}

function getProjectNavigationButtons(group: Element | null): HTMLButtonElement[] {
  if (!group) return []
  return Array.from(group.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
}

function resolveProjectNavigationGroup(target: HTMLElement): HTMLElement | null {
  const progressive = target.closest<HTMLElement>(PROJECT_PROGRESSIVE_NAV_SELECTOR)
  if (progressive) return progressive
  const primary = target.closest<HTMLElement>(PROJECT_PRIMARY_NAV_SELECTOR)
  return primary?.querySelector<HTMLElement>('nav[aria-label="Project intent navigation"]') || null
}

export function syncProjectNavigationTabStops(root?: ParentNode) {
  if (typeof document === 'undefined') return
  const scope = root || document
  const groups = [
    ...Array.from(scope.querySelectorAll<HTMLElement>(`${PROJECT_PRIMARY_NAV_SELECTOR} nav[aria-label="Project intent navigation"]`)),
    ...Array.from(scope.querySelectorAll<HTMLElement>(PROJECT_PROGRESSIVE_NAV_SELECTOR)),
  ]
  groups.forEach((group) => {
    const buttons = getProjectNavigationButtons(group)
    if (!buttons.length) return
    const focused = document.activeElement instanceof HTMLButtonElement && group.contains(document.activeElement) ? document.activeElement : null
    const active = focused || buttons.find((button) => button.getAttribute('aria-current') === 'page') || buttons[0]
    buttons.forEach((button) => {
      button.tabIndex = button === active ? 0 : -1
      button.dataset.projectKeyboardNav = 'true'
      button.classList.add(...PROJECT_NAV_FOCUS_CLASSES)
    })
  })
}

export function handleProjectNavigationKeyDown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const button = target.closest<HTMLButtonElement>('button')
  const group = resolveProjectNavigationGroup(target)
  if (!button || !group || !group.contains(button)) return
  const buttons = getProjectNavigationButtons(group)
  const index = buttons.indexOf(button)
  if (index < 0 || buttons.length < 2) return

  let nextIndex = index
  if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = buttons.length - 1
  else if (event.key === 'ArrowRight') nextIndex = (index + 1) % buttons.length
  else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + buttons.length) % buttons.length

  event.preventDefault()
  buttons.forEach((item, itemIndex) => { item.tabIndex = itemIndex === nextIndex ? 0 : -1 })
  buttons[nextIndex]?.focus()
}

export function installProjectNavigationKeyboardA11y() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => undefined
  const runtimeWindow = window as ProjectNavigationWindow
  if (runtimeWindow.__sysgridProjectNavigationA11yV1) return () => undefined
  runtimeWindow.__sysgridProjectNavigationA11yV1 = true

  syncProjectNavigationTabStops(document)
  document.addEventListener('keydown', handleProjectNavigationKeyDown)
  const observer = typeof MutationObserver === 'undefined'
    ? null
    : new MutationObserver(() => syncProjectNavigationTabStops(document))
  observer?.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-current'] })

  return () => {
    document.removeEventListener('keydown', handleProjectNavigationKeyDown)
    observer?.disconnect()
    runtimeWindow.__sysgridProjectNavigationA11yV1 = false
  }
}

if (typeof document !== 'undefined') installProjectNavigationKeyboardA11y()

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

  const dialogRef = React.useRef<HTMLDivElement | null>(null)
  const confirmRef = React.useRef<HTMLDivElement | null>(null)
  const returnFocusRef = React.useRef<HTMLElement | null>(null)
  const confirmReturnFocusRef = React.useRef<HTMLElement | null>(null)
  const confirmTitleId = React.useId()
  const confirmMessageId = React.useId()
  const accessibleTitle = React.useMemo(() => getWorkspaceModalAccessibleName(title), [title])

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return
    const active = document.activeElement
    returnFocusRef.current = active instanceof HTMLElement ? active : null
    focusFirstElement(dialogRef.current)
    return () => {
      const previous = returnFocusRef.current
      returnFocusRef.current = null
      if (previous?.isConnected) previous.focus()
    }
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen || !isConfirmOpen || typeof document === 'undefined') return
    const active = document.activeElement
    confirmReturnFocusRef.current = active instanceof HTMLElement && dialogRef.current?.contains(active) ? active : null
    focusFirstElement(confirmRef.current)
    return () => {
      const previous = confirmReturnFocusRef.current
      confirmReturnFocusRef.current = null
      if (isOpen && previous?.isConnected && dialogRef.current?.contains(previous)) previous.focus()
    }
  }, [isOpen, isConfirmOpen])

  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestDiscard()
        return
      }
      if (event.key !== 'Tab') return
      const root = isConfirmOpen ? confirmRef.current : dialogRef.current
      if (!root) return
      const focusable = getFocusableElements(root)
      if (!focusable.length) {
        event.preventDefault()
        root.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !(active instanceof Node) || !root.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !(active instanceof Node) || !root.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isConfirmOpen, requestDiscard])

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
        ref={dialogRef}
        tabIndex={-1}
        className={`fixed inset-0 ${WORKSPACE_MODAL_LAYER_CLASS} flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-sm sm:p-6 lg:p-8`}
        role="dialog"
        aria-modal="true"
        aria-label={accessibleTitle || undefined}
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
                    title="Close"
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
              className={`absolute inset-0 ${WORKSPACE_MODAL_CONFIRM_LAYER_CLASS} flex items-center justify-center bg-[#020617]/82 p-4 backdrop-blur-sm`}
            >
              <motion.div
                ref={confirmRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={confirmTitleId}
                aria-describedby={confirmMessageId}
                tabIndex={-1}
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1222] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.62)]"
              >
                <div className="space-y-3">
                  <h3 id={confirmTitleId} className="text-sm font-semibold text-slate-100">{dirtyConfirmTitle}</h3>
                  <p id={confirmMessageId} className="text-sm text-slate-400">{dirtyConfirmMessage}</p>
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
