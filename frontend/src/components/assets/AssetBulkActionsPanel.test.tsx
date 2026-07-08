import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AssetBulkActionsPanel } from './AssetBulkActionsPanel'
import { OPERATIONAL_ACTION_LABELS } from '../shared/OperationalActionLabels'

// Mock framer-motion to simplify rendering in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, className, ...props }: any) => (
      <div style={style} className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('AssetBulkActionsPanel', () => {
  const defaultProps = {
    activeTab: 'inventory' as const,
    isOpen: true,
    panelRef: { current: null } as React.RefObject<HTMLDivElement | null>,
    panelStyle: {},
    selectedCount: 5,
    selectedLabels: ['asset-1', 'asset-2', 'asset-3', 'asset-4'],
    onClose: vi.fn(),
    onApply: vi.fn(),
  }

  it('renders status summary with correct count and previews first 3 labels with suffix', () => {
    render(<AssetBulkActionsPanel {...defaultProps} />)

    expect(screen.getByText('5 assets selected')).toBeInTheDocument()
    expect(screen.getByText('asset-1, asset-2, asset-3 +2 more')).toBeInTheDocument()
  })

  it('inventory state renders top-level cards for Set Status, Set Environment, and Archive Selection', () => {
    render(<AssetBulkActionsPanel {...defaultProps} />)

    expect(screen.getByText('Set Status')).toBeInTheDocument()
    expect(screen.getByText('Set Environment')).toBeInTheDocument()
    expect(screen.getByText(OPERATIONAL_ACTION_LABELS.archiveSelection)).toBeInTheDocument()
  })

  it('clicking Archive Selection expands inline confirm area and destructive confirm button is inside it', () => {
    render(<AssetBulkActionsPanel {...defaultProps} />)

    // Before clicking, the inline confirm area and archive action button inside it should not exist
    expect(screen.queryByText('Move the current selection to the Purged registry scope.')).not.toBeInTheDocument()

    // Click "Archive Selection" card
    fireEvent.click(screen.getByText(OPERATIONAL_ACTION_LABELS.archiveSelection))

    // Now expanded section should be visible
    expect(screen.getByText('Move the current selection to the Purged registry scope.')).toBeInTheDocument()

    // Find the inline button which defaults to "Archive selected assets"
    const confirmButton = screen.getByRole('button', { name: 'Archive selected assets' })
    expect(confirmButton).toBeInTheDocument()
  })

  it('deleted state renders Restore and Purge cards', () => {
    render(<AssetBulkActionsPanel {...defaultProps} activeTab="deleted" />)

    expect(screen.getByText(OPERATIONAL_ACTION_LABELS.restore)).toBeInTheDocument()
    expect(screen.getByText(OPERATIONAL_ACTION_LABELS.purgeSelection)).toBeInTheDocument()
  })

  it('Restore and Purge each expand inline and call onApply only on second confirmation click', () => {
    const onApplyMock = vi.fn()
    const onCloseMock = vi.fn()
    render(
      <AssetBulkActionsPanel
        {...defaultProps}
        activeTab="deleted"
        onApply={onApplyMock}
        onClose={onCloseMock}
      />
    )

    // Expand Restore card
    fireEvent.click(screen.getByText(OPERATIONAL_ACTION_LABELS.restore))
    expect(screen.getByText('Return the current selection to the Existing registry scope.')).toBeInTheDocument()

    const restoreBtn = screen.getByRole('button', { name: 'Restore selected assets' })
    expect(restoreBtn).toBeInTheDocument()

    // First click: sets confirmation state
    fireEvent.click(restoreBtn)
    expect(onApplyMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirm Restore?' })).toBeInTheDocument()

    // Second click: fires apply restore and closes panel
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Restore?' }))
    expect(onApplyMock).toHaveBeenCalledWith('restore')
    expect(onCloseMock).toHaveBeenCalled()
  })

  it('Purge section expands inline and calls onApply on second confirmation click', () => {
    const onApplyMock = vi.fn()
    const onCloseMock = vi.fn()
    render(
      <AssetBulkActionsPanel
        {...defaultProps}
        activeTab="deleted"
        onApply={onApplyMock}
        onClose={onCloseMock}
      />
    )

    // Expand Purge card
    fireEvent.click(screen.getByText(OPERATIONAL_ACTION_LABELS.purgeSelection))
    expect(screen.getByText('Permanently remove the current selection from the registry. THIS CANNOT BE UNDONE.'))
      .toBeInTheDocument()

    const purgeBtn = screen.getByRole('button', { name: 'Purge selected assets' })
    expect(purgeBtn).toBeInTheDocument()

    // First click: sets confirmation state
    fireEvent.click(purgeBtn)
    expect(onApplyMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: OPERATIONAL_ACTION_LABELS.purgeSelectionConfirm })).toBeInTheDocument()

    // Second click: fires apply purge and closes panel
    fireEvent.click(screen.getByRole('button', { name: OPERATIONAL_ACTION_LABELS.purgeSelectionConfirm }))
    expect(onApplyMock).toHaveBeenCalledWith('purge')
    expect(onCloseMock).toHaveBeenCalled()
  })

  it('expanding one destructive section resets stale confirmation state', () => {
    render(<AssetBulkActionsPanel {...defaultProps} activeTab="deleted" />)

    // Expand Restore card
    fireEvent.click(screen.getByText(OPERATIONAL_ACTION_LABELS.restore))
    const restoreBtn = screen.getByRole('button', { name: 'Restore selected assets' })
    
    // First click restore to enter confirmation state ('Confirm Restore?')
    fireEvent.click(restoreBtn)
    expect(screen.getByRole('button', { name: 'Confirm Restore?' })).toBeInTheDocument()

    // Now click the Purge card to switch expanded section
    fireEvent.click(screen.getByText(OPERATIONAL_ACTION_LABELS.purgeSelection))

    // Confirm Restore should no longer be in the document
    expect(screen.queryByRole('button', { name: 'Confirm Restore?' })).not.toBeInTheDocument()
    
    // The purge action button should be in default "Purge selected assets" state, not confirmation state
    expect(screen.getByRole('button', { name: 'Purge selected assets' })).toBeInTheDocument()
  })
})
