import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectsDataStateView, ProjectsEditStateBadge, ProjectsOfflineNotice } from './ProjectsState'

describe('PV1 universal Projects state grammar', () => {
  it('renders geometry-preserving loading and explicit unavailable states', () => {
    const { rerender } = render(<ProjectsDataStateView state="Loading" />)
    expect(screen.getByText('Loading project workspace')).toBeInTheDocument()
    rerender(<ProjectsDataStateView state="Unavailable" requestId="req-1" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Request ID: req-1')
  })

  it('retains a failed draft and exposes retry/discard actions', () => {
    render(<ProjectsEditStateBadge state="Save failed" error="Network unavailable" onRetry={() => {}} onDiscard={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument()
  })

  it('does not claim online writes while offline', () => {
    render(<ProjectsOfflineNotice online={false} lastSynchronizedAt="2026-09-07T00:00Z" />)
    expect(screen.getByRole('status')).toHaveTextContent('writes wait for revalidation')
  })
})
