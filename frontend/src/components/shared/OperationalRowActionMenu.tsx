import React, { useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { WorkspaceFloatingPanel } from './OperationalWorkspacePrimitives'

export function OperationalRowActionMenu({
  meta,
  title,
  onClose,
  children,
}: {
  meta: React.ReactNode
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [minButtonWidth, setMinButtonWidth] = useState(0)

  useLayoutEffect(() => {
    if (!menuRef.current) return
    const buttons = menuRef.current.querySelectorAll('button[data-row-action-button="true"]')
    let max = 0
    buttons.forEach((btn) => {
        const width = (btn as HTMLElement).getBoundingClientRect().width
        if (width > max) max = width
    })
    if (max > 0) setMinButtonWidth(max)
  }, [children])

  return (
    <WorkspaceFloatingPanel kind="context" className="max-w-[calc(100vw-24px)] overflow-hidden" style={{ '--row-action-button-min-width': `${minButtonWidth}px` } as React.CSSProperties}>
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
        {children}
      </div>
    </WorkspaceFloatingPanel>
  )
}

export function OperationalRowActionSection({
  title,
  children,
  columns = 2,
}: {
  title: string
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4 | 5
}) {
  return (
    <>
      <div className="px-3 py-1">
        <p className="text-[10px] font-semibold text-slate-400">{title}</p>
      </div>
      <div
        className="grid gap-2 px-2 pb-3"
        style={{
            gridTemplateColumns: `repeat(${columns}, minmax(var(--row-action-button-min-width), 1fr))`
        }}
      >
        {children}
      </div>
    </>
  )
}

export function OperationalRowActionDivider() {
  return <div className="mx-2 my-2 h-px bg-slate-800" />
}

export function OperationalRowActionButton({
  children,
  className = '',
  layout = 'tile',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { layout?: 'tile' | 'inline' }) {
  return (
    <button
      type="button"
      data-row-action-button="true"
      {...props}
      className={`flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 transition-all hover:bg-white/[0.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 justify-center ${
        layout === 'tile'
          ? 'flex-col py-3 text-[9px] font-black uppercase tracking-[0.1em]'
          : 'px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]'
      } [&>span]:text-slate-300 ${className}`}
    >
      {children}
    </button>
  )
}
