import React from 'react'

export type ProjectsDataState = 'Loading' | 'Ready' | 'Empty' | 'Refreshing' | 'Stale' | 'Unavailable' | 'Forbidden' | 'Not found'
export type ProjectsEditState = 'Clean' | 'Editing' | 'Saving' | 'Saved' | 'Validation error' | 'Conflict' | 'Save failed'

const stateCopy: Record<ProjectsDataState, { title: string; description: string }> = {
  Loading: { title: 'Loading project workspace', description: 'Preparing the geometry-preserving workspace.' },
  Ready: { title: '', description: '' },
  Empty: { title: 'Nothing here yet', description: 'Create or connect the first record to continue.' },
  Refreshing: { title: 'Refreshing project workspace', description: 'Current data remains visible while the latest revision is checked.' },
  Stale: { title: 'Showing the last synchronized revision', description: 'Refresh before committing a write.' },
  Unavailable: { title: 'Project data is unavailable', description: 'Retry when the project service is reachable.' },
  Forbidden: { title: 'You do not have access to this project', description: 'Ask a project administrator for permission.' },
  'Not found': { title: 'Project not found', description: 'The project may have been removed or you may not have access.' },
}

export function ProjectsDataStateView({ state, title, description, action, requestId }: { state: ProjectsDataState; title?: string; description?: string; action?: React.ReactNode; requestId?: string | null }) {
  if (state === 'Ready') return null
  const copy = stateCopy[state]
  return <section className={`sg-pv1-state sg-pv1-state-${state.toLowerCase().replaceAll(' ', '-')}`} data-pv1-data-state={state} role={state === 'Unavailable' || state === 'Forbidden' || state === 'Not found' ? 'alert' : undefined}>
    {state === 'Loading' || state === 'Refreshing' ? <span className="sg-pv1-skeleton" aria-hidden="true" /> : null}
    <h2>{title || copy.title}</h2><p>{description || copy.description}</p>{requestId ? <small>Request ID: {requestId}</small> : null}{action ? <div className="sg-pv1-state-action">{action}</div> : null}
  </section>
}

export function ProjectsEditStateBadge({ state, error, onRetry, onDiscard }: { state: ProjectsEditState; error?: string | null; onRetry?: () => void; onDiscard?: () => void }) {
  if (state === 'Clean') return null
  return <div className={`sg-pv1-edit-state sg-pv1-edit-state-${state.toLowerCase().replaceAll(' ', '-')}`} data-pv1-edit-state={state} role={state === 'Save failed' || state === 'Conflict' || state === 'Validation error' ? 'alert' : undefined}>
    <span>{state === 'Save failed' ? error || 'Save failed. Your draft is retained.' : state === 'Conflict' ? error || 'This record changed elsewhere. Review before saving.' : state}</span>
    {state === 'Save failed' && onRetry ? <button type="button" onClick={onRetry}>Retry</button> : null}{state === 'Save failed' && onDiscard ? <button type="button" onClick={onDiscard}>Discard</button> : null}
  </div>
}

export function ProjectsOfflineNotice({ online, lastSynchronizedAt }: { online: boolean; lastSynchronizedAt?: string | null }) {
  if (online) return null
  return <aside className="sg-pv1-offline-notice" data-pv1-offline="true" role="status">Offline · showing the last synchronized revision{lastSynchronizedAt ? ` from ${lastSynchronizedAt}` : ''}. Drafts are allowed; writes wait for revalidation.</aside>
}
