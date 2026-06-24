import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

import { WorkspaceFloatingPanel } from './OperationalWorkspacePrimitives'

const SECTION_HORIZONTAL_PADDING = 10
const SECTION_GAP = 8
const DEFAULT_BUTTON_MIN_WIDTH = 100

export type OperationalRowActionSectionId = 'quickAccess' | 'followOptions' | 'archive'

export type OperationalRowActionTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export type OperationalRowActionVariant = 'tile' | 'inline'

export type OperationalRowActionItem = {
  id: string
  label: string
  icon: React.ElementType
  tone?: OperationalRowActionTone
  variant?: OperationalRowActionVariant
  onClick: () => void
  disabled?: boolean
  confirming?: boolean
  confirmLabel?: string
  ariaLabel?: string
}

export type OperationalRowActionSectionModel = {
  id: OperationalRowActionSectionId
  columns?: 1 | 2 | 3 | 4 | 5
  items: OperationalRowActionItem[]
}

export function computeRowActionSectionColumns({
  containerWidth,
  preferredColumns,
  minColumnWidth,
  gap,
  horizontalPadding,
}: {
  containerWidth: number
  preferredColumns: 1 | 2 | 3 | 4 | 5
  minColumnWidth: number
  gap: number
  horizontalPadding: number
}): number {
  const contentWidth = Math.max(0, containerWidth - horizontalPadding * 2)
  const maxColumnsThatFit = Math.max(1, Math.floor((contentWidth + gap) / (minColumnWidth + gap)))
  return Math.max(1, Math.min(preferredColumns, maxColumnsThatFit))
}

const SECTION_TITLE_MAP: Record<OperationalRowActionSectionId, string> = {
  quickAccess: 'Quick access',
  followOptions: 'Follow options',
  archive: 'Archive',
}

const TONE_ICON_CLASS: Record<OperationalRowActionTone, string> = {
  neutral: 'text-slate-400',
  info: 'text-blue-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-rose-300',
}

export function OperationalRowActionMenu({
  meta,
  title,
  onClose,
  sections,
}: {
  meta: React.ReactNode
  title: React.ReactNode
  onClose: () => void
  sections: OperationalRowActionSectionModel[]
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    if (panelRef.current) {
      observer.observe(panelRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={panelRef}>
      <WorkspaceFloatingPanel
        kind="context"
        className="max-w-[calc(100vw-32px)] overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-slate-400">Row actions</p>
            <p className="pt-1 text-[11px] font-semibold text-slate-100">{meta}</p>
            <p className="truncate pt-1 text-[12px] text-slate-300">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            aria-label="Close row actions"
          >
            <X size={13} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-2.5 custom-scrollbar">
          {sections.map((section, idx) => {
            const actualColumns = computeRowActionSectionColumns({
              containerWidth,
              preferredColumns: section.columns || 2,
              minColumnWidth: DEFAULT_BUTTON_MIN_WIDTH,
              gap: SECTION_GAP,
              horizontalPadding: SECTION_HORIZONTAL_PADDING,
            })

            return (
              <React.Fragment key={section.id}>
                <div className="px-3 py-1">
                  <p className="text-[10px] font-semibold text-slate-400">{SECTION_TITLE_MAP[section.id]}</p>
                </div>
                <div
                  className="grid gap-2 px-2 pb-3"
                  style={{
                    gridTemplateColumns: `repeat(${actualColumns}, minmax(0, 1fr))`,
                  }}
                >
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.onClick}
                      disabled={item.disabled}
                      className={`flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 transition-all hover:bg-white/[0.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 justify-center min-w-0 ${(item.variant || 'tile') === 'tile'
                        ? 'flex-col py-3 text-[9px] font-black uppercase tracking-[0.1em]'
                        : 'px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]'
                        } ${item.confirming ? 'bg-rose-600 animate-pulse' : ''}`}
                    >
                      {React.createElement(item.icon, { size: 14, className: TONE_ICON_CLASS[item.tone ?? 'neutral'] })}
                      <span className="min-w-0 max-w-full truncate block text-slate-300">
                        {item.confirming ? (item.confirmLabel || 'Confirm?') : item.label}
                      </span>
                    </button>
                  ))}
                </div>
                {idx < sections.length - 1 && <div className="mx-2 my-2 h-px bg-slate-800" />}
              </React.Fragment>
            )
          })}
        </div>
      </WorkspaceFloatingPanel>
    </div>
  )
}
