import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

import { WorkspaceFloatingPanel } from './OperationalWorkspacePrimitives'
import { computeRowActionGeometry } from './OperationalRowActionGeometry'

const SECTION_HORIZONTAL_PADDING = 12

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
  cursorX,
  cursorY,
}: {
  meta: React.ReactNode
  title: React.ReactNode
  onClose: () => void
  sections: OperationalRowActionSectionModel[]
  cursorX: number
  cursorY: number
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  
  const geometry = computeRowActionGeometry({
    sections,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1000,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 1000,
    cursorX,
    cursorY,
  })

  return (
    <div ref={panelRef} style={{ position: 'fixed', zIndex: 1115, ...geometry.style }}>
      <WorkspaceFloatingPanel
        kind="context"
        className="flex flex-col"
        style={{
          width: '100%',
          maxHeight: geometry.style.maxHeight,
          boxSizing: 'border-box',
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
          {geometry.sections.map((section, idx) => {
              let itemIndex = 0;
              return (
                <React.Fragment key={section.id}>
                  {section.showTitle && (
                    <div className="px-1 py-1.5">
                      <p className="text-[10px] font-semibold text-slate-400">{SECTION_TITLE_MAP[section.id]}</p>
                    </div>
                  )}
                  {section.rows.map((row, rowIdx) => (
                    <div
                      key={rowIdx}
                      className="grid gap-2 mb-2"
                      style={{
                        gridTemplateColumns: row.buttonWidths.map(w => `${w}px`).join(' '),
                      }}
                    >
                      {row.buttonWidths.map((width, bIdx) => {
                        const item = section.items[itemIndex++];
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={item.onClick}
                            disabled={item.disabled}
                            className={`flex flex-row items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:bg-white/[0.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${item.confirming ? 'bg-rose-600 animate-pulse' : ''}`}
                            style={{ width: `${width}px` }}
                          >
                            {React.createElement(item.icon, { size: 14, className: `flex-shrink-0 ${TONE_ICON_CLASS[item.tone ?? 'neutral']}` })}
                            <span className="whitespace-nowrap text-slate-300">
                              {item.confirming ? (item.confirmLabel || 'Confirm?') : item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  {idx < geometry.sections.length - 1 && <div className="my-3 h-px bg-slate-800" />}
                </React.Fragment>
              )
          })}
        </div>
      </WorkspaceFloatingPanel>
    </div>
  )
}
