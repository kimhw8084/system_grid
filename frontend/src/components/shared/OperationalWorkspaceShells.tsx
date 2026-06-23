import React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, Save, Trash2, X } from 'lucide-react'
import { AppDropdown } from './AppDropdown'
import { PageHeader } from './LayoutPrimitives'
import { WorkspaceCommandBar } from './WorkspaceCommandBar'
import { WorkspaceFloatingPanel } from './OperationalWorkspacePrimitives'

const join = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')
type WorkspaceFilterChip = { id: string; label: string; onRemove: () => void }

export const getOperationalGridSurfaceStyle = (
  fontSize: number,
  height?: string
): React.CSSProperties => ({
  '--ag-font-size': `${fontSize}px`,
  '--ag-font-family': "'Inter', sans-serif",
  ...(height ? { height } : {}),
} as React.CSSProperties)

export function OperationalWorkspaceFrame({
  header,
  commandBar,
  children,
  className = '',
}: {
  header: React.ComponentProps<typeof PageHeader>
  commandBar: React.ComponentProps<typeof WorkspaceCommandBar>
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={join('h-full min-h-0 flex flex-col space-y-4', className)}>
      <PageHeader {...header} />
      <WorkspaceCommandBar {...commandBar} />
      {children}
    </div>
  )
}

export function OperationalWorkspaceShell({
  header,
  commandBar,
  toolbarSearch,
  toolbarControls,
  toolbarActions,
  secondaryToolbar,
  filterChips,
  floatingPanels,
  children,
  className = '',
}: {
  header: React.ComponentProps<typeof PageHeader>
  commandBar?: React.ComponentProps<typeof WorkspaceCommandBar>
  toolbarSearch?: React.ReactNode
  toolbarControls?: React.ReactNode
  toolbarActions?: React.ReactNode
  secondaryToolbar?: React.ReactNode
  filterChips?: WorkspaceFilterChip[]
  floatingPanels?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const resolvedCommandBar = commandBar ?? {
    left: (
      <>
        {toolbarSearch}
        {toolbarControls}
      </>
    ),
    right: toolbarActions,
    secondary: secondaryToolbar,
    filterChips,
  }

  return (
    <OperationalWorkspaceFrame header={header} commandBar={resolvedCommandBar} className={className}>
      {typeof document !== 'undefined' && floatingPanels ? createPortal(floatingPanels, document.body) : null}
      {children}
    </OperationalWorkspaceFrame>
  )
}

export function OperationalGridSurface({
  children,
  className = '',
  style,
  loading,
  loadingIcon,
  loadingLabel,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  loading?: boolean
  loadingIcon?: React.ReactNode
  loadingLabel?: React.ReactNode
}) {
  return (
    <div className={join(
      'operational-grid-shell operational-grid flex-1 w-full min-h-0 glass-panel rounded-lg overflow-hidden ag-theme-alpine-dark relative',
      className
    )} style={style}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
          {loadingIcon}
          {loadingLabel}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export function OperationalAnchoredPanel({
  isOpen,
  panelKey,
  style,
  className = '',
  panelRef,
  children,
  yOffset = 8,
}: {
  isOpen: boolean
  panelKey: string
  style: React.CSSProperties
  className?: string
  panelRef?: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
  yOffset?: number
}) {
  return (
    <AnimatePresence>
      {isOpen && style.position === 'fixed' && style.top !== -9999 && (
        <motion.div
          key={panelKey}
          ref={panelRef}
          initial={{ opacity: 0, y: yOffset }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: yOffset }}
          style={style}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function OperationalGroupedGridView({
  summary,
  actions,
  sections,
}: {
  summary: React.ReactNode
  actions?: React.ReactNode
  sections: React.ReactNode
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
      <div className="rounded-lg border border-white/5 bg-black/20 px-6 py-4 flex items-center justify-between">
        {summary}
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
      {sections}
    </div>
  )
}

export function OperationalGroupedGridSection({
  labelMeta,
  label,
  count,
  countLabel,
  selectedCount,
  collapsed,
  onToggle,
  children,
}: {
  labelMeta: React.ReactNode
  label: React.ReactNode
  count: number
  countLabel: string
  selectedCount?: number
  collapsed: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <section className="glass-panel overflow-hidden rounded-lg border border-white/5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 border-b border-white/5 bg-white/[0.03] px-5 py-4 text-left transition-all hover:bg-white/[0.05]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {labelMeta}
            <h3 className="text-sm font-semibold text-slate-100">{label}</h3>
          </div>
          <p className="pt-1 text-[11px] text-slate-400">{count} {countLabel}{selectedCount ? ` · ${selectedCount} selected` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-white/5 bg-black/30 px-2.5 py-1 text-[9px] font-semibold text-slate-300">{count}</span>
          {collapsed ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
        </div>
      </button>
      {children}
    </section>
  )
}

export function OperationalDisplayPanel({
  isOpen,
  panelStyle,
  panelRef,
  title = 'Display density',
  onClose,
  fontSize,
  onFontSizeChange,
  rowDensity,
  onRowDensityChange,
  groupBy,
  onGroupByChange,
  groupOptions,
  columns,
  hiddenColumns,
  onToggleColumn,
}: {
  isOpen: boolean
  panelStyle: React.CSSProperties
  panelRef?: React.RefObject<HTMLDivElement | null>
  title?: string
  onClose: () => void
  fontSize: number
  onFontSizeChange: (value: number) => void
  rowDensity: number
  onRowDensityChange: (value: number) => void
  groupBy: string
  onGroupByChange: (value: string) => void
  groupOptions: Array<{ value: string; label: string }>
  columns: Array<{ field?: string; headerName?: string; lockVisible?: boolean }>
  hiddenColumns: string[]
  onToggleColumn: (field: string) => void
}) {
  return (
    <OperationalAnchoredPanel
      isOpen={isOpen}
      panelKey="display-menu"
      style={panelStyle}
      panelRef={panelRef}
      className="display-menu-container"
    >
      <WorkspaceFloatingPanel kind="menu" className="p-4">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400">{title}</span>
              <button onClick={onClose} className="text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3 rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-semibold text-slate-400">Font</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="8"
                    max="14"
                    step="1"
                    value={fontSize}
                    onChange={(event) => onFontSizeChange(Number(event.target.value))}
                    className="h-1.5 w-28 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-blue-500"
                  />
                  <span className="w-8 text-right text-[10px] font-black tabular-nums text-white">{fontSize}px</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-semibold text-slate-400">Rows</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="2"
                    value={rowDensity}
                    onChange={(event) => onRowDensityChange(Number(event.target.value))}
                    className="h-1.5 w-28 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-blue-500"
                  />
                  <span className="w-8 text-right text-[10px] font-black tabular-nums text-white">{rowDensity}px</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <AppDropdown
              value={groupBy}
              onChange={onGroupByChange}
              options={groupOptions}
              label="Group By"
            />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-slate-400">Columns</span>
            <div className="max-h-[240px] space-y-1 overflow-y-auto pr-1 custom-scrollbar">
              {columns.filter((column) => column.field && !column.lockVisible).map((column) => {
                const field = column.field as string
                const visible = !hiddenColumns.includes(field)
                return (
                  <label key={field} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-all hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => onToggleColumn(field)}
                      className="sr-only"
                    />
                    <div className={`flex h-4 w-4 items-center justify-center rounded-lg border transition-all ${visible ? 'bg-blue-600 border-blue-500' : 'border-white/10 bg-black/40'}`}>
                      {visible ? <Check size={11} className="text-white" /> : null}
                    </div>
                    <span className={`text-[10px] font-semibold ${visible ? 'text-slate-200' : 'text-slate-500'}`}>
                      {column.headerName || field}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </WorkspaceFloatingPanel>
    </OperationalAnchoredPanel>
  )
}

export function OperationalSavedViewsPanel<TView extends { id: string; name: string; config?: { groupBy?: string } }>({
  isOpen,
  panelStyle,
  panelRef,
  entityLabel,
  onClose,
  activeViewId,
  currentViewName,
  newViewName,
  onNewViewNameChange,
  onCreateView,
  onApplySystemDefault,
  savedViews,
  defaultViewIds,
  onApplyView,
  onOverwriteView,
  onDeleteView,
  describeView,
}: {
  isOpen: boolean
  panelStyle: React.CSSProperties
  panelRef?: React.RefObject<HTMLDivElement | null>
  entityLabel: string
  onClose: () => void
  activeViewId: string | null
  currentViewName: string
  newViewName: string
  onNewViewNameChange: (value: string) => void
  onCreateView: () => void
  onApplySystemDefault: () => void
  savedViews: TView[]
  defaultViewIds: Set<string>
  onApplyView: (id: string) => void
  onOverwriteView: (id: string) => void
  onDeleteView: (id: string) => void
  describeView: (view: TView) => string
}) {
  return (
    <OperationalAnchoredPanel
      isOpen={isOpen}
      panelKey="views-menu"
      style={panelStyle}
      panelRef={panelRef}
      className="views-menu-container"
    >
      <WorkspaceFloatingPanel kind="menu" className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-400">Saved views</p>
              <p className="pt-1 text-[11px] text-slate-400">Load, save, and overwrite full {entityLabel} layouts.</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          </div>

          <div className="rounded-lg border border-white/5 bg-black/20 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400">Current view</p>
                <p className="pt-1 text-[11px] font-semibold text-slate-100">{currentViewName}</p>
              </div>
              {activeViewId ? (
                <button
                  type="button"
                  onClick={() => onOverwriteView(activeViewId)}
                  className="rounded-lg border border-blue-500/20 bg-blue-600/15 px-3 py-2 text-[10px] font-semibold text-blue-200 transition-all hover:bg-blue-600/25"
                >
                  Overwrite Current
                </button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <input
                value={newViewName}
                onChange={(event) => onNewViewNameChange(event.target.value)}
                placeholder="Save as new view..."
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/40"
              />
              <button
                type="button"
                onClick={onCreateView}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-slate-200 transition-all hover:bg-white/[0.08]"
              >
                Save New
              </button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
            <button
              onClick={onApplySystemDefault}
              className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                activeViewId === null
                  ? 'border-emerald-500/30 bg-emerald-500/12'
                  : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-[10px] font-semibold ${activeViewId === null ? 'text-emerald-300' : 'text-slate-200'}`}>System default</p>
                  <p className="pt-1 text-[10px] text-slate-500">Standard table layout with no active view</p>
                </div>
                <span className="text-[9px] font-semibold text-slate-500">Core</span>
              </div>
            </button>

            {savedViews.map((view) => {
              const isDefaultView = defaultViewIds.has(view.id)
              return (
                <div key={view.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onApplyView(view.id)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-left transition-all ${
                      activeViewId === view.id
                        ? 'border-blue-500/30 bg-blue-500/12'
                        : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={`text-[10px] font-semibold ${activeViewId === view.id ? 'text-blue-300' : 'text-slate-200'}`}>{view.name}</p>
                        <p className="pt-1 text-[10px] text-slate-500">{describeView(view)}</p>
                      </div>
                      <span className="text-[9px] font-semibold text-slate-500">{isDefaultView ? 'Default' : 'Custom'}</span>
                    </div>
                  </button>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => onOverwriteView(view.id)}
                      title={`Overwrite ${view.name}`}
                      className="rounded-lg border border-white/8 bg-white/[0.03] p-1.5 text-slate-400 transition-all hover:bg-white/[0.06] hover:text-white"
                    >
                      <Save size={12} />
                    </button>
                    {!isDefaultView ? (
                      <button
                        onClick={() => onDeleteView(view.id)}
                        title={`Delete ${view.name}`}
                        className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-1.5 text-rose-500 transition-all hover:bg-rose-500/20"
                      >
                        <Trash2 size={12} />
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </WorkspaceFloatingPanel>
    </OperationalAnchoredPanel>
  )
}
