import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import { OPERATIONAL_WORKSPACE_VISUALS } from './OperationalWorkspace'

export type WorkspaceModalSize = 'compact' | 'standard' | 'wide' | 'workspace'

const join = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function getWorkspaceModalFrameClass(size: WorkspaceModalSize) {
  if (size === 'compact') return 'p-4 sm:p-6'
  if (size === 'standard') return 'p-4 sm:p-6'
  if (size === 'wide') return 'p-4 sm:p-8'
  return 'p-4 sm:p-6'
}

export function getWorkspaceModalShellClass(size: WorkspaceModalSize) {
  if (size === 'compact') return 'w-full max-w-md max-h-[82vh]'
  if (size === 'standard') return 'w-full max-w-2xl max-h-[86vh]'
  if (size === 'wide') return 'w-full max-w-6xl h-full sm:h-auto sm:max-h-[88vh]'
  return 'w-full max-w-[min(96vw,1520px)] h-[min(92vh,1100px)]'
}

export function WorkspaceFieldLabel({
  label,
  required = false,
}: {
  label: string
  required?: boolean
}) {
  return (
    <label className={`px-1 ${OPERATIONAL_WORKSPACE_VISUALS.fieldLabelText}`}>
      {label}
      {required && <span className="ml-1 text-rose-400">*</span>}
    </label>
  )
}

export function WorkspaceFieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className={`px-1 ${OPERATIONAL_WORKSPACE_VISUALS.fieldErrorText}`}>{message}</p>
}

export function WorkspacePanelTitle({ children }: { children: React.ReactNode }) {
  return <h3 className={OPERATIONAL_WORKSPACE_VISUALS.titleText}>{children}</h3>
}

export function WorkspacePanelSubtitle({ children }: { children: React.ReactNode }) {
  return <p className={`mt-0.5 ${OPERATIONAL_WORKSPACE_VISUALS.subtitleText}`}>{children}</p>
}

export function WorkspacePanelHint({ children }: { children: React.ReactNode }) {
  return <p className={OPERATIONAL_WORKSPACE_VISUALS.hintText}>{children}</p>
}

export function getWorkspaceFloatingPanelClass(kind: 'menu' | 'context' | 'detail' = 'menu') {
  const tone =
    kind === 'context'
      ? 'border-slate-700 bg-[#020617] shadow-[0_24px_80px_rgba(0,0,0,0.62)]'
      : kind === 'detail'
        ? 'border-white/10 bg-slate-950/95 shadow-[0_24px_60px_rgba(2,6,23,0.48)]'
        : 'border-white/10 bg-slate-950/95 shadow-[0_24px_60px_rgba(2,6,23,0.48)]'

  return join(
    'rounded-lg backdrop-blur-xl',
    tone,
  )
}

export function useWorkspaceAnchoredLayer(isOpen: boolean, options?: { offset?: number; minWidth?: number }) {
  const offset = options?.offset ?? 8
  const minWidth = options?.minWidth ?? 0
  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const padding = 12
    const maxWidth = Math.max(0, window.innerWidth - padding * 2)
    const panelHeight = panelRef.current?.offsetHeight ?? 0
    const desiredWidth = Math.max(rect.width, minWidth)
    const width = Math.min(desiredWidth, maxWidth)
    const left = clamp(rect.left, padding, window.innerWidth - width - padding)
    const openUpward =
      panelHeight > 0 &&
      rect.bottom + offset + panelHeight > window.innerHeight - padding &&
      rect.top - offset - panelHeight >= padding
    const top = openUpward
      ? rect.top - offset - panelHeight
      : Math.min(rect.bottom + offset, window.innerHeight - padding)

    setPanelStyle({
      position: 'fixed',
      top,
      left,
      width,
      zIndex: 3600,
    })
  }, [minWidth, offset])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  return { triggerRef, panelRef, panelStyle }
}

export function WorkspaceFloatingPanel({
  children,
  className = '',
  kind = 'menu',
}: {
  children: React.ReactNode
  className?: string
  kind?: 'menu' | 'context' | 'detail'
}) {
  return <div className={join(getWorkspaceFloatingPanelClass(kind), className)}>{children}</div>
}

export function WorkspaceSectionBadge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'blue' | 'emerald' | 'amber' | 'rose'
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
      : tone === 'emerald'
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
        : tone === 'amber'
          ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
          : tone === 'rose'
            ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
            : 'border-white/10 bg-black/30 text-slate-400'

  return (
    <span className={join('rounded-lg border px-2.5 py-1 text-[9px] font-semibold', toneClass)}>
      {children}
    </span>
  )
}

export function WorkspaceEmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={join(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/10 text-center',
        compact ? 'px-4 py-8 space-y-2' : 'px-6 py-12 space-y-4'
      )}
    >
      {icon && <div className="text-slate-700">{icon}</div>}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-slate-300">{title}</p>
        {description && <p className="max-w-md text-[10px] font-semibold leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function WorkspaceCollapsibleHeader({
  title,
  subtitle,
  badge,
  action,
  collapsed,
  onToggle,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  badge?: React.ReactNode
  action?: React.ReactNode
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start justify-between gap-4 rounded-lg text-left transition-colors hover:text-white"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <WorkspacePanelTitle>{title}</WorkspacePanelTitle>
          {badge}
        </div>
        {subtitle && <WorkspacePanelSubtitle>{subtitle}</WorkspacePanelSubtitle>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-semibold text-slate-400">
          {collapsed ? 'Show' : 'Hide'}
        </span>
      </div>
    </button>
  )
}

export function WorkspaceSplitView({
  sidebar,
  main,
  className = '',
  side = 'left',
}: {
  sidebar?: React.ReactNode
  main: React.ReactNode
  className?: string
  side?: 'left' | 'right'
}) {
  if (!sidebar) {
    return <div className={join('w-full', className)}>{main}</div>
  }

  return (
    <div
      className={join(
        'grid grid-cols-1 gap-6',
        side === 'left' ? 'xl:grid-cols-[320px_minmax(0,1fr)]' : 'xl:grid-cols-[minmax(0,1fr)_320px]',
        className,
      )}
    >
      {side === 'left' ? (
        <>
          <div className="min-h-0">{sidebar}</div>
          <div className="min-h-0">{main}</div>
        </>
      ) : (
        <>
          <div className="min-h-0">{main}</div>
          <div className="min-h-0">{sidebar}</div>
        </>
      )}
    </div>
  )
}

export function WorkspaceHoverPreview({
  summary,
  tooltip,
  tone = 'default',
  fontSize,
}: {
  summary: string
  tooltip: string
  tone?: 'default' | 'blue'
  fontSize?: number
}) {
  return (
    <span
      title={tooltip}
      style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
      className={`cursor-help border-b border-dashed ${tone === 'blue' ? 'border-blue-500/30 text-blue-300 hover:text-blue-200' : 'border-slate-700 text-slate-200 hover:text-white'} transition-colors`}
    >
      {summary}
    </span>
  )
}

export function getWorkspaceInputClass(error?: string) {
  return `w-full ${OPERATIONAL_WORKSPACE_VISUALS.controlSurface} px-4 py-[clamp(8px,0.75vw,11px)] ${OPERATIONAL_WORKSPACE_VISUALS.bodyControlText} outline-none transition-all ${
    error
      ? 'border border-rose-500/60 bg-rose-500/10 shadow-[0_0_0_1px_rgba(244,63,94,0.18)] focus:border-rose-400'
      : 'focus:border-blue-500/40'
  }`
}

export function WorkspaceSelectField({
  label,
  required = false,
  value,
  options,
  onChange,
  placeholder,
  error,
  searchable = false,
  disabled = false,
}: {
  label: string
  required?: boolean
  value: string | number | null
  options: Array<{ value: string | number; label: string; description?: string }>
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  searchable?: boolean
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { triggerRef, panelRef, panelStyle } = useWorkspaceAnchoredLayer(isOpen, { minWidth: 220 })
  const selected = options.find((option) => String(option.value) === String(value))
  const filteredOptions = searchable
    ? options.filter((option) => `${option.label} ${option.description || ''}`.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setIsOpen(false)
    }
    window.addEventListener('mousedown', handleClick)

    return () => {
      window.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, panelRef, triggerRef])

  return (
    <div className="space-y-1.5">
      <WorkspaceFieldLabel label={label} required={required} />
      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          ref={(node) => {
            triggerRef.current = node
          }}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${error ? 'border-rose-500/60 bg-rose-500/10 shadow-[0_0_0_1px_rgba(244,63,94,0.18)]' : 'border-white/10 bg-slate-950/70 hover:border-blue-500/30'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <span className={`text-[clamp(10px,0.85vw,12px)] font-black truncate pr-4 ${selected ? 'text-slate-100' : 'text-slate-500'}`}>
            {selected?.label || placeholder || 'Select option'}
          </span>
          <ChevronDown size={12} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && !disabled && typeof document !== 'undefined' && createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="rounded-lg border border-white/10 bg-[#020617] p-2 shadow-[0_24px_60px_rgba(2,6,23,0.48)] backdrop-blur-xl"
          >
            {searchable && (
              <div className="mb-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black text-slate-100 outline-none focus:border-blue-500/40"
                />
              </div>
            )}
            <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1 pr-1">
              {filteredOptions.map((option) => {
                const active = String(option.value) === String(value)
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => {
                      onChange(String(option.value))
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${active ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/5 bg-black/20 hover:border-white/10 hover:bg-white/[0.03]'}`}
                  >
                    <p className={`text-[9px] font-black ${active ? 'text-blue-300' : 'text-slate-200'}`}>{option.label}</p>
                    {option.description && <p className="mt-0.5 text-[8px] font-black text-slate-500 truncate">{option.description}</p>}
                  </button>
                )
              })}
              {filteredOptions.length === 0 && (
                <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-4 text-center text-[9px] font-black text-slate-500">
                  No matching options
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
      <WorkspaceFieldError message={error} />
    </div>
  )
}

export function WorkspaceSectionCard({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode
  className?: string
}) {
  return <section {...props} className={`${OPERATIONAL_WORKSPACE_VISUALS.panelSurface} p-4 ${className}`}>{children}</section>
}

export function WorkspaceStickyIdentityBar({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`sticky top-0 z-20 -mx-6 mb-8 border-b border-white/10 bg-slate-900/95 px-6 py-5 shadow-2xl backdrop-blur-md sm:-mx-8 sm:px-8 ${className}`}>
      {children}
    </div>
  )
}

export function WorkspaceTabStrip({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; badgeCount?: number }>
  activeTab: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-lg px-4 py-2 text-[10px] font-semibold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <span className="flex items-center gap-2">
            <span>{tab.label}</span>
            {!!tab.badgeCount && (
              <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[8px] text-rose-300">{tab.badgeCount}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}

export function WorkspaceValidationBanner({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
      <p className="text-[10px] font-semibold text-rose-300">{message}</p>
    </div>
  )
}

export function WorkspaceModalHeader({
  icon,
  title,
  subtitle,
  status,
  closeControl,
  maximizeControl,
  tabs,
  activeTab,
  onTabChange,
}: {
  icon: React.ReactNode
  title: string
  subtitle: React.ReactNode
  status?: React.ReactNode
  closeControl: React.ReactNode
  maximizeControl?: React.ReactNode
  tabs?: Array<{ id: string; label: string; badgeCount?: number }>
  activeTab?: string
  onTabChange?: (id: string) => void
}) {
  return (
    <div className="z-30 border-b border-white/10 bg-slate-950 px-6 py-5 sm:px-8">
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2 self-start pt-1">
            {closeControl}
            {maximizeControl}
          </div>
          <div className="ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-600/10 text-blue-400">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tighter text-white">{title}</h2>
            <div className="mt-1 flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-400">{subtitle}</span>
              {status && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  {status}
                </>
              )}
            </div>
          </div>
        </div>

        {tabs && activeTab && onTabChange && (
          <div className="hidden lg:block">
            <WorkspaceTabStrip tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
          </div>
        )}
      </div>
    </div>
  )
}

export function WorkspaceModalFooter({
  left,
  right,
}: {
  left?: React.ReactNode
  right: React.ReactNode
}) {
  return (
    <div className="border-t border-white/10 px-6 py-5 sm:px-8 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2 pl-1">{left}</div>
        <div className="flex flex-wrap items-center justify-end gap-3 pr-1">{right}</div>
      </div>
    </div>
  )
}
