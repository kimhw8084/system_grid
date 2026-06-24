import React, { useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { WorkspaceFloatingPanel } from './OperationalWorkspacePrimitives'

const MIN_PANEL_WIDTH = 240
const VIEWPORT_PADDING = 12
const SECTION_HORIZONTAL_PADDING = 10
const SECTION_GAP = 8
const BUTTON_SAFETY_BUFFER = 20
const MIN_USABLE_BUTTON_WIDTH = 60

export type OperationalRowActionSectionId = 'quickAccess' | 'followOptions' | 'archive'

export type OperationalRowActionTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export type OperationalRowActionVariant = 'tile' | 'inline'

export type OperationalRowActionItem = {
  id: string
  label: string
  icon: any
  tone?: any
  variant?: any
  onClick: () => void
  disabled?: boolean
  confirming?: boolean
  confirmLabel?: string
  ariaLabel?: string
}

export type OperationalRowActionSectionModel = {
  id: any
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

export function computeRowActionLayout({ 
    viewportWidth, 
    rawButtonMinWidth, 
    sections 
}: { 
    viewportWidth: number, 
    rawButtonMinWidth: number, 
    sections: OperationalRowActionSectionModel[] 
}) {
    const viewportSafeWidth = Math.max(MIN_PANEL_WIDTH, viewportWidth - VIEWPORT_PADDING * 2)
    
    // Effective button width cap: panel width minus padding
    const maxSingleColumnButtonWidth = Math.max(
        MIN_USABLE_BUTTON_WIDTH,
        viewportSafeWidth - SECTION_HORIZONTAL_PADDING * 2
    )
    
    const effectiveButtonMinWidth = Math.min(rawButtonMinWidth, maxSingleColumnButtonWidth)
    
    const processedSections = sections.map(section => {
        const preferredColumns = section.columns || 2
        // Max columns that fit: (AvailableWidth + Gap) / (ButtonWidth + Gap)
        const availableWidth = viewportSafeWidth - SECTION_HORIZONTAL_PADDING * 2
        const maxColumnsThatFit = Math.max(1, Math.floor((availableWidth + SECTION_GAP) / (effectiveButtonMinWidth + SECTION_GAP)))
        const actualColumns = Math.min(preferredColumns, maxColumnsThatFit)
        
        const sectionWidth = (SECTION_HORIZONTAL_PADDING * 2) + (actualColumns * effectiveButtonMinWidth) + ((actualColumns - 1) * SECTION_GAP)
        return { ...section, actualColumns, sectionWidth }
    })
    
    const menuRequiredWidth = Math.max(...processedSections.map(s => s.sectionWidth))
    const finalPanelWidth = Math.min(Math.max(menuRequiredWidth, MIN_PANEL_WIDTH), viewportSafeWidth)
    
    return { processedSections, finalPanelWidth, effectiveButtonMinWidth }
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
  const [layout, setLayout] = useState({ 
    processedSections: sections.map(s => ({ ...s, actualColumns: s.columns || 2, sectionWidth: 0 })), 
    finalPanelWidth: MIN_PANEL_WIDTH,
    effectiveButtonMinWidth: 100
  })

  useLayoutEffect(() => {
    const updateLayout = () => {
      if (!menuRef.current) return
      
      const buttons = menuRef.current.querySelectorAll('button[data-row-action-button="true"]')
      let maxButtonWidth = 0
      buttons.forEach((btn) => {
        const width = (btn as HTMLElement).scrollWidth
        if (width > maxButtonWidth) maxButtonWidth = width
      })
      const rawButtonMinWidth = Math.max(100, maxButtonWidth + BUTTON_SAFETY_BUFFER)

      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
      setLayout(computeRowActionLayout({ viewportWidth, rawButtonMinWidth, sections }))
    }

    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [sections])

  return (
    <WorkspaceFloatingPanel 
        kind="context" 
        className="max-w-[calc(100vw-24px)] overflow-hidden" 
        style={{ 
            '--row-action-button-min-width': `${layout.effectiveButtonMinWidth}px`,
            width: `${layout.finalPanelWidth}px`,
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
        {layout.processedSections.map((section, idx) => (
            <React.Fragment key={section.id}>
                <div className="px-3 py-1">
                    <p className="text-[10px] font-semibold text-slate-400">{SECTION_TITLE_MAP[section.id]}</p>
                </div>
                <div
                    data-row-action-section="true"
                    data-row-action-columns={section.actualColumns}
                    className="grid gap-2 px-2 pb-3"
                    style={{
                        gridTemplateColumns: `repeat(${section.actualColumns}, minmax(var(--row-action-button-min-width), 1fr))`
                    }}
                >
                    {section.items.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            data-row-action-button="true"
                            onClick={item.onClick}
                            disabled={item.disabled}
                            className={`flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 transition-all hover:bg-white/[0.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 justify-center min-w-0 ${
                                (item.variant || 'tile') === 'tile'
                                    ? 'flex-col py-3 text-[9px] font-black uppercase tracking-[0.1em]'
                                    : 'px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]'
                            } ${item.confirming ? 'bg-rose-600 animate-pulse' : ''}`}
                        >
                            <item.icon size={14} className={TONE_ICON_CLASS[item.tone || 'neutral']} />
                            <span className="truncate block max-w-full text-slate-300">{item.confirming ? (item.confirmLabel || 'Confirm?') : item.label}</span>
                        </button>
                    ))}
                </div>
                {idx < layout.processedSections.length - 1 && <div className="mx-2 my-2 h-px bg-slate-800" />}
            </React.Fragment>
        ))}
      </div>
    </WorkspaceFloatingPanel>
  )
}
