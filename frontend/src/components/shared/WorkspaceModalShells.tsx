import React from 'react'
import { WorkspaceStickyIdentityBar } from './OperationalWorkspacePrimitives'

export function WorkspaceDossierShell({
  header,
  actions,
  body,
}: {
  header?: React.ReactNode
  actions?: React.ReactNode
  body: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      {(header || actions) && (
        <WorkspaceStickyIdentityBar className="!mb-6">
          <div className="flex items-start justify-between gap-4">{header}</div>
          {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        </WorkspaceStickyIdentityBar>
      )}
      <div className={`flex-1 ${(!header && !actions) ? 'pt-6' : ''}`}>{body}</div>
    </div>
  )
}

export function WorkspaceHistoryShell({
  header,
  sidebar,
  content,
}: {
  header?: React.ReactNode
  sidebar: React.ReactNode
  content: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full">
      {header && <div className="mb-8 flex items-center justify-between">{header}</div>}
      <div className={`flex min-h-0 flex-1 space-x-10 ${!header ? 'pt-6' : ''}`}>
        <div className="flex w-72 min-h-0 flex-col">{sidebar}</div>
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-inner">
          {content}
        </div>
      </div>
    </div>
  )
}

export function WorkspaceCompareShell({
  header,
  body,
}: {
  header?: React.ReactNode
  body: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full">
      {header && <div className="mb-4 flex items-center justify-between">{header}</div>}
      <div className={`flex-1 ${!header ? 'pt-6' : ''}`}>
        {body}
      </div>
    </div>
  )
}
