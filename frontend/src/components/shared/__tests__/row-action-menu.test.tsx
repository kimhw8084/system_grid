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
})
