import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { WorkspaceModal } from './WorkspaceModal'

function renderModal(props: {
  isDirty?: boolean
  onClose?: () => void
}) {
  const onClose = props.onClose ?? vi.fn()
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <WorkspaceModal
          isOpen={true}
          onClose={onClose}
          title="Dirty Contract Modal"
          isDirty={props.isDirty ?? false}
        >
          <div>Body</div>
        </WorkspaceModal>
      ),
    },
  ], {
    initialEntries: ['/'],
  })

  render(<RouterProvider router={router} />)

  return { onClose }
}

describe('WorkspaceModal dirty-close contract', () => {
  it('closes immediately from the header close button when clean', () => {
    const { onClose } = renderModal({ isDirty: false })

    fireEvent.click(screen.getByTitle('Close'))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()
  })

  it('does not close immediately from the header close button when dirty', async () => {
    const { onClose } = renderModal({ isDirty: true })

    fireEvent.click(screen.getByTitle('Close'))

    expect(onClose).not.toHaveBeenCalled()
    expect(await screen.findByText('Unsaved Changes')).toBeInTheDocument()
  })

  it('closes on Escape when clean', () => {
    const { onClose } = renderModal({ isDirty: false })

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on Escape when dirty', async () => {
    const { onClose } = renderModal({ isDirty: true })

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
    expect(await screen.findByText('Unsaved Changes')).toBeInTheDocument()
  })

  it('does not close on backdrop click when dirty', async () => {
    const { onClose } = renderModal({ isDirty: true })
    const dialog = screen.getByRole('dialog')

    fireEvent.mouseDown(dialog, { target: dialog })

    expect(onClose).not.toHaveBeenCalled()
    expect(await screen.findByText('Unsaved Changes')).toBeInTheDocument()
  })
})
