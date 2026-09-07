import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DetailPanelHost } from './ProjectsDetailPanelHost'

function Fixture({ onClose }: { onClose: () => void }) {
  return <div data-pv1-projects-route="true"><button type="button">Origin</button><DetailPanelHost open title="Task details" onClose={onClose}><button type="button">Panel action</button></DetailPanelHost></div>
}

describe('PV1 DetailPanelHost', () => {
  it('uses the modal contract at workspace widths and traps Escape/focus', async () => {
    const onClose = vi.fn()
    const { container } = render(<Fixture onClose={onClose} />)
    const dialog = await screen.findByRole('dialog', { name: 'Task details' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(container.querySelector('[data-pv1-projects-route]')).toHaveProperty('inert', true)
    expect(document.activeElement).toHaveAttribute('data-pv1-panel-close', 'true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses the docked nonmodal contract on wide workspaces', async () => {
    const originalWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    try {
      render(<Fixture onClose={() => {}} />)
      const dialog = await screen.findByRole('dialog', { name: 'Task details' })
      expect(dialog).toHaveAttribute('aria-modal', 'false')
      expect(dialog).toHaveClass('is-docked')
      expect(screen.queryByRole('button', { name: 'Close detail panel' })).not.toBeInTheDocument()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
    }
  })
})
