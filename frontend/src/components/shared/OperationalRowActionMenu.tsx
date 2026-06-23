import React from 'react'
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
  return (
    <WorkspaceFloatingPanel kind="context" className="min-w-[240px] max-w-[calc(100vw-24px)] overflow-hidden">
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
        {children}
      </div>
    </WorkspaceFloatingPanel>
  )
}

export function OperationalRowActionSection({
  title,
  children,
  grid = false,
}: {
  title: string
  children: React.ReactNode
  grid?: boolean
}) {
  return (
    <>
      <div className="px-3 py-1">
        <p className="text-[10px] font-semibold text-slate-400">{title}</p>
      </div>
      <div className={grid ? "grid grid-cols-2 gap-2 px-2 pb-3" : "flex flex-col gap-1 px-2 pb-3"}>
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
  grid = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { grid?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 transition-all hover:bg-white/[0.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
        grid
          ? 'flex-col justify-center py-3 text-[9px] font-black uppercase tracking-[0.1em]'
          : 'px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em]'
      } ${className}`}
    >
      {children}
    </button>
  )
}
