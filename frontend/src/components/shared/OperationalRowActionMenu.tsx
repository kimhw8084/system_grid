import React, { useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { WorkspaceFloatingPanel } from './OperationalWorkspacePrimitives'

const MIN_PANEL_WIDTH = 240
const VIEWPORT_PADDING = 12
const SECTION_HORIZONTAL_PADDING = 10
const SECTION_GAP = 8
const BUTTON_SAFETY_BUFFER = 20

export type OperationalRowActionSectionId = 'quickAccess' | 'followOptions' | 'archive'

export type OperationalRowActionTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export type OperationalRowActionVariant = 'tile' | 'inline'

export type OperationalRowActionItem = {
  id: string
  label: string
  icon: any
  tone?: string
  variant?: string
  onClick: () => void
  disabled?: boolean
  confirming?: boolean
  confirmLabel?: string
  ariaLabel?: string
}

export type OperationalRowActionSectionModel = {
  id: OperationalRowActionSectionId
  columns?: number
  items: OperationalRowActionItem[]
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
  const menuRef = useRef<HTMLDivElement>(null)
  const [minButtonWidth, setMinButtonWidth] = useState(0)
  const [finalPanelWidth, setFinalPanelWidth] = useState(MIN_PANEL_WIDTH)

  useLayoutEffect(() => {
    const updateWidths = () => {
      if (!menuRef.current) return
      
      const buttons = menuRef.current.querySelectorAll('button[data-row-action-button="true"]')
      let maxButtonWidth = 0
      buttons.forEach((btn) => {
        const width = (btn as HTMLElement).scrollWidth
        if (width > maxButtonWidth) maxButtonWidth = width
      })
      const buttonMinWidth = Math.max(100, maxButtonWidth + BUTTON_SAFETY_BUFFER)
      setMinButtonWidth(buttonMinWidth)

      const sectionEls = menuRef.current.querySelectorAll('div[data-row-action-section="true"]')
      let maxSectionWidth = 0
      sectionEls.forEach((sec) => {
        const cols = parseInt((sec as HTMLElement).dataset.rowActionColumns || '2')
        const sectionWidth = (SECTION_HORIZONTAL_PADDING * 2) + (cols * buttonMinWidth) + ((cols - 1) * SECTION_GAP)
        if (sectionWidth > maxSectionWidth) maxSectionWidth = sectionWidth
      })

      const viewportSafeWidth = typeof window !== 'undefined' ? window.innerWidth - VIEWPORT_PADDING * 2 : 500
      const calculatedWidth = Math.max(maxSectionWidth, MIN_PANEL_WIDTH)
      setFinalPanelWidth(Math.min(calculatedWidth, viewportSafeWidth))
    }

    updateWidths()
    window.addEventListener('resize', updateWidths)
    return () => window.removeEventListener('resize', updateWidths)
  }, [sections])

  return (
    <WorkspaceFloatingPanel 
        kind="context" 
        className="max-w-[calc(100vw-24px)] overflow-hidden" 
        style={{ 
            '--row-action-button-min-width': `${minButtonWidth}px`,
            width: `${finalPanelWidth}px`,
            maxWidth: `${typeof window !== 'undefined' ? window.innerWidth - VIEWPORT_PADDING * 2 : 500}px`
        } as React.CSSProperties}
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
      <div ref={menuRef} className="max-h-[calc(100vh-180px)] overflow-y-auto p-2.5 custom-scrollbar">
        {sections.map((section, idx) => (
            <React.Fragment key={section.id}>
                <div className="px-3 py-1">
                    <p className="text-[10px] font-semibold text-slate-400">{SECTION_TITLE_MAP[section.id]}</p>
                </div>
                <div
                    data-row-action-section="true"
                    data-row-action-columns={section.columns || 2}
                    className="grid gap-2 px-2 pb-3"
                    style={{
                        gridTemplateColumns: `repeat(${section.columns || 2}, minmax(var(--row-action-button-min-width), 1fr))`
                    }}
                >
                    {section.items.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            data-row-action-button="true"
                            onClick={item.onClick}
                            disabled={item.disabled}
                            className={`flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 transition-all hover:bg-white/[0.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 justify-center ${
                                (item.variant || 'tile') === 'tile'
                                    ? 'flex-col py-3 text-[9px] font-black uppercase tracking-[0.1em]'
                                    : 'px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]'
                            } ${item.confirming ? 'bg-rose-600 animate-pulse' : ''}`}
                        >
                            <item.icon size={14} className={TONE_ICON_CLASS[item.tone || 'neutral']} />
                            <span className="text-slate-300">{item.confirming ? (item.confirmLabel || 'Confirm?') : item.label}</span>
                        </button>
                    ))}
                </div>
                {idx < sections.length - 1 && <div className="mx-2 my-2 h-px bg-slate-800" />}
            </React.Fragment>
        ))}
      </div>
    </WorkspaceFloatingPanel>
  )
}
