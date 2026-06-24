import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

import { WorkspaceFloatingPanel } from './OperationalWorkspacePrimitives'

const SECTION_HORIZONTAL_PADDING = 12
const SECTION_GAP = 8
const DEFAULT_BUTTON_MIN_WIDTH = 112
const CHAR_WIDTH = 8

export type OperationalRowActionSectionId = 'quickAccess' | 'followOptions' | 'archive'

export type OperationalRowActionTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
export type OperationalRowActionVariant = 'tile' | 'inline'

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

export function estimateRowActionButtonMinWidth({
  sections,
  characterWidth = CHAR_WIDTH,
  iconWidth = 14,
  gap = SECTION_GAP,
  horizontalPadding = SECTION_HORIZONTAL_PADDING,
  minWidth = DEFAULT_BUTTON_MIN_WIDTH,
  maxWidth = 300,
}: {
  sections: OperationalRowActionSectionModel[]
  characterWidth?: number
  iconWidth?: number
  gap?: number
  horizontalPadding?: number
  minWidth?: number
  maxWidth?: number
}): number {
  let longestLabel = ''
  sections.forEach(section => {
    section.items.forEach(item => {
      const label = item.confirming ? (item.confirmLabel || 'Confirm?') : item.label
      if (label.length > longestLabel.length) longestLabel = label
    })
  })

  const estimatedLabelWidth = longestLabel.length * characterWidth
  const rawButtonWidth = horizontalPadding * 2 + iconWidth + gap + estimatedLabelWidth
  return Math.min(Math.max(rawButtonWidth, minWidth), maxWidth)
}

export function computeRowActionLayout({
  viewportWidth,
  preferredPanelWidth = 560,
  edge = 16,
  sections,
  buttonMinWidth = DEFAULT_BUTTON_MIN_WIDTH,
  sectionGap = SECTION_GAP,
  sectionHorizontalPadding = SECTION_HORIZONTAL_PADDING,
}: {
  viewportWidth: number
  preferredPanelWidth?: number
  edge?: number
  sections: OperationalRowActionSectionModel[]
  buttonMinWidth?: number
  sectionGap?: number
  sectionHorizontalPadding?: number
}) {
  const viewportSafeWidth = Math.max(0, viewportWidth - edge * 2)
  const panelWidth = Math.min(preferredPanelWidth, viewportSafeWidth)
  const availableContentWidth = panelWidth - sectionHorizontalPadding * 2

  const processedSections = sections.map(section => {
    const preferredColumns = section.columns ?? 2
    const maxColumnsThatFit = Math.max(1, Math.floor((availableContentWidth + sectionGap) / (buttonMinWidth + sectionGap)))
    const actualColumns = Math.max(1, Math.min(preferredColumns, maxColumnsThatFit))

    return { ...section, actualColumns }
  })

  const effectiveButtonWidth = Math.max(buttonMinWidth, availableContentWidth / Math.max(...processedSections.map(s => s.actualColumns)) - sectionGap)

  return { processedSections, panelWidth, effectiveButtonWidth }
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

  const buttonMinWidth = estimateRowActionButtonMinWidth({ sections })
  const layout = computeRowActionLayout({
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1000,
    sections,
    buttonMinWidth
  })

  return (
    <div ref={panelRef} className="h-full">
      <WorkspaceFloatingPanel
        kind="context"
        className="max-w-[calc(100vw-32px)] flex overflow-hidden"
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400">Row actions</p>
            <p className="pt-1 text-[11px] font-semibold text-slate-100">{meta}</p>
            <p className="pt-1 text-[12px] text-slate-300">{title}</p>
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
        <div className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar">
          {layout.processedSections.map((section, idx) => (
            <React.Fragment key={section.id}>
              <div className="px-1 py-1.5">
                <p className="text-[10px] font-semibold text-slate-400">{SECTION_TITLE_MAP[section.id]}</p>
              </div>
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${section.actualColumns}, minmax(${layout.effectiveButtonWidth}px, 1fr))`,
                }}
              >
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={`flex flex-row items-center justify-start gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] min-w-0 w-full transition-all hover:bg-white/[0.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${item.confirming ? 'bg-rose-600 animate-pulse' : ''}`}
                  >
                    {React.createElement(item.icon, { size: 14, className: `flex-shrink-0 ${TONE_ICON_CLASS[item.tone ?? 'neutral']}` })}
                    <span className="min-w-0 max-w-full whitespace-nowrap block text-slate-300">
                      {item.confirming ? (item.confirmLabel || 'Confirm?') : item.label}
                    </span>
                  </button>
                ))}
              </div>
              {idx < layout.processedSections.length - 1 && <div className="my-3 h-px bg-slate-800" />}
            </React.Fragment>
          ))}
        </div>
      </WorkspaceFloatingPanel>
    </div>
  )
}
