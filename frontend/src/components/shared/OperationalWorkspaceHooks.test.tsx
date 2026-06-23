import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useOperationalDetailRoute } from './OperationalWorkspaceHooks'
import { WorkspaceModal } from './WorkspaceModal'

function DirtyModalHarness({ isDirty }: { isDirty: boolean }) {
  return (
    <div>
      <Link to="/other">Go other</Link>
      <WorkspaceModal
        isOpen={true}
        onClose={() => {}}
        title="Dirty Form"
        hideCloseButton
        hideFooterClose
        isDirty={isDirty}
        dirtyConfirmText="Discard Changes"
      >
        <div>Editing</div>
      </WorkspaceModal>
    </div>
  )
}

function OtherPage() {
  return <div>Other page</div>
}

function DetailRouteHarness() {
  const [detailItem, setDetailItem] = React.useState<any>(null)
  const items = React.useMemo(() => ([
    { id: 1, name: 'Service One', is_deleted: false },
    { id: 2, name: 'Service Two', is_deleted: false },
  ]), [])

  const detailRoute = useOperationalDetailRoute({
    allItems: items,
    detailItem,
    setDetailItem,
  })

  return (
    <div>
      <button type="button" onClick={() => detailRoute.openDetail(items[0], { replace: false })}>
        Open detail
      </button>
      <button type="button" onClick={() => detailRoute.closeDetail()}>
        Close detail
      </button>
      <div data-testid="detail-state">{detailItem ? String(detailItem.id) : 'none'}</div>
    </div>
  )
}

describe('useOperationalDirtyGuard navigation protection', () => {
  it('does not block untouched navigation', async () => {
    const router = createMemoryRouter([
      { path: '/', element: <DirtyModalHarness isDirty={false} /> },
      { path: '/other', element: <OtherPage /> },
    ], {
      initialEntries: ['/'],
    })

    render(<RouterProvider router={router} />)

    fireEvent.click(screen.getByRole('link', { name: 'Go other' }))

    expect(await screen.findByText('Other page')).toBeInTheDocument()
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()
  })

  it('blocks browser back when dirty and cancels cleanly', async () => {
    const router = createMemoryRouter([
      { path: '/prev', element: <OtherPage /> },
      { path: '/form', element: <DirtyModalHarness isDirty={true} /> },
    ], {
      initialEntries: ['/prev', '/form'],
      initialIndex: 1,
    })

    render(<RouterProvider router={router} />)

    await act(async () => {
      await router.navigate(-1)
    })

    expect(await screen.findByText('Unsaved Changes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/form')
    })
    expect(screen.queryByText('Other page')).not.toBeInTheDocument()
  })

  it('blocks browser back when dirty and proceeds after discard confirmation', async () => {
    const router = createMemoryRouter([
      { path: '/prev', element: <OtherPage /> },
      { path: '/form', element: <DirtyModalHarness isDirty={true} /> },
    ], {
      initialEntries: ['/prev', '/form'],
      initialIndex: 1,
    })

    render(<RouterProvider router={router} />)

    await act(async () => {
      await router.navigate(-1)
    })

    expect(await screen.findByText('Unsaved Changes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }))

    expect(await screen.findByText('Other page')).toBeInTheDocument()
  })
})

describe('useOperationalDetailRoute history sync', () => {
  it('keeps back/forward in sync with detail state without reopening loops', async () => {
    const router = createMemoryRouter([
      { path: '/services', element: <DetailRouteHarness /> },
    ], {
      initialEntries: ['/services'],
    })

    render(<RouterProvider router={router} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open detail' }))

    await waitFor(() => {
      expect(router.state.location.search).toBe('?id=1')
      expect(screen.getByTestId('detail-state').textContent).toBe('1')
    })

    await act(async () => {
      await router.navigate(-1)
    })

    await waitFor(() => {
      expect(router.state.location.search).toBe('')
      expect(screen.getByTestId('detail-state').textContent).toBe('none')
    })

    await act(async () => {
      await router.navigate(1)
    })

    await waitFor(() => {
      expect(router.state.location.search).toBe('?id=1')
      expect(screen.getByTestId('detail-state').textContent).toBe('1')
    })
  })
})
