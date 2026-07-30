import type { ReactElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { OperationalBulkPreviewModal } from './OperationalBulkPreviewModal'

const preview = {
  action: 'update',
  selected_count: 4,
  matched_count: 4,
  changed_count: 3,
  unchanged_count: 1,
  blocked_count: 0,
  missing_count: 0,
  changed_ids: [1, 2, 3],
  unchanged_ids: [4],
  missing_ids: [],
  blockers: [],
  can_execute: true,
}

function renderBulkPreviewModal(element: ReactElement) {
  const router = createMemoryRouter([
    {
      path: '/',
      element,
    },
  ], {
    initialEntries: ['/'],
  })

  render(<RouterProvider router={router} />)
}

describe('OperationalBulkPreviewModal', () => {
  it('shows authoritative counts and confirms only after preview', () => {
    const onConfirm = vi.fn()
    renderBulkPreviewModal(
      <OperationalBulkPreviewModal
        isOpen
        workspaceLabel="Services"
        actionLabel="Apply status"
        fieldLabel="Status"
        nextValue="Maintenance"
        preview={preview}
        onClose={() => undefined}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByTestId('bulk-preview-selected')).toHaveTextContent('4')
    expect(screen.getByTestId('bulk-preview-will-change')).toHaveTextContent('3')
    expect(screen.getByText('No records change until you confirm.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Apply status' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('labels workspace-snapshot previews without claiming a backend dry run', () => {
    renderBulkPreviewModal(
      <OperationalBulkPreviewModal
        isOpen
        workspaceLabel="Network"
        actionLabel="Archive selection"
        preview={preview}
        previewBasis="workspace-snapshot"
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    )

    expect(screen.getByText('Review the current workspace snapshot before anything changes.')).toBeInTheDocument()
    expect(screen.getByText('Preview uses currently loaded workspace data; the backend remains authoritative when you confirm.')).toBeInTheDocument()
    expect(screen.queryByText('Review the backend-authoritative impact before anything changes.')).not.toBeInTheDocument()
  })

  it('shows an exact completion receipt and exposes in-place undo', () => {
    const onRevert = vi.fn()
    renderBulkPreviewModal(
      <OperationalBulkPreviewModal
        isOpen
        workspaceLabel="Services"
        actionLabel="Apply environment"
        fieldLabel="Environment"
        nextValue="Development"
        preview={preview}
        result={{ selected_count: 4, changed_count: 3, unchanged_count: 1, can_revert: true }}
        onClose={() => undefined}
        onConfirm={() => undefined}
        onRevert={onRevert}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Services bulk complete' })).toBeInTheDocument()
    expect(screen.getByTestId('bulk-preview-changed')).toHaveTextContent('3')
    expect(screen.getByTestId('bulk-preview-unchanged')).toHaveTextContent('1')
    expect(screen.getByText('Bulk operation completed.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo bulk changes' }))
    expect(onRevert).toHaveBeenCalledTimes(1)
  })

  it('blocks confirmation when the backend reports dependencies', () => {
    renderBulkPreviewModal(
      <OperationalBulkPreviewModal
        isOpen
        workspaceLabel="External"
        actionLabel="Purge selection"
        preview={{
          ...preview,
          changed_count: 1,
          blocked_count: 1,
          blockers: [{ id: 7, name: 'Partner API', reason: 'Active connectivity links must be removed' }],
          can_execute: false,
        }}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    )

    expect(screen.getByText('Partner API')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Purge selection' })).toBeDisabled()
  })
})
