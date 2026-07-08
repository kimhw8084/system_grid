import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OperationalRowActionMenu } from '../OperationalRowActionMenu'
import { WORKSPACE_LAYER_Z } from '../OperationalWorkspacePrimitives'

describe('OperationalRowActionMenu', () => {
  it('uses shared workspace layer ownership for the row-action menu container', () => {
    render(
      <OperationalRowActionMenu
        meta="ID 1"
        title="Alpha"
        onClose={() => {}}
        cursorX={240}
        cursorY={180}
        sections={[
          {
            id: 'quickAccess',
            items: [{ id: 'details', label: 'Details', icon: () => null, onClick: () => {} }],
          },
        ]}
      />
    )

    const container = document.body.querySelector('.row-action-menu-container') as HTMLDivElement | null
    expect(container).not.toBeNull()
    expect(container?.style.zIndex).toBe(String(WORKSPACE_LAYER_Z.rowActionMenu))
  })

  it('renders confirmation text and class style when confirming is true', () => {
    const { getByRole } = render(
      <OperationalRowActionMenu
        meta="ID 1"
        title="Alpha"
        onClose={() => {}}
        cursorX={240}
        cursorY={180}
        sections={[
          {
            id: 'archive',
            items: [
              {
                id: 'asset-delete',
                label: 'Archive',
                confirmLabel: 'Confirm Archive?',
                icon: () => null,
                onClick: () => {},
                confirming: true,
              },
            ],
          },
        ]}
      />
    )

    const button = getByRole('button', { name: 'Confirm Archive?' })
    expect(button).not.toBeNull()
    expect(button.className).toContain('bg-rose-600')
    expect(button.className).toContain('animate-pulse')
  })

  it('renders normal label text when confirming is false', () => {
    const { getByRole } = render(
      <OperationalRowActionMenu
        meta="ID 1"
        title="Alpha"
        onClose={() => {}}
        cursorX={240}
        cursorY={180}
        sections={[
          {
            id: 'archive',
            items: [
              {
                id: 'asset-delete',
                label: 'Archive',
                confirmLabel: 'Confirm Archive?',
                icon: () => null,
                onClick: () => {},
                confirming: false,
              },
            ],
          },
        ]}
      />
    )

    const button = getByRole('button', { name: 'Archive' })
    expect(button).not.toBeNull()
    expect(button.className).not.toContain('bg-rose-600')
    expect(button.className).not.toContain('animate-pulse')
  })
})

