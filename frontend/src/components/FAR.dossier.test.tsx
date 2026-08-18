import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { FARDossierShell, getFarDossierRiskTone } from './FAR.dossier'

const activeMode = {
  id: 42,
  title: 'Database timeout',
  system_name: 'Core',
  severity: 8,
  occurrence: 4,
  detection: 3,
  rpn: 96,
  is_deleted: false,
}

function renderDossier(element: React.ReactElement) {
  const router = createMemoryRouter([{ path: '/', element }], { initialEntries: ['/'] })
  return render(<RouterProvider router={router} />)
}

describe('FARDossierShell', () => {
  it('preserves dossier content and routes active edit through the shared footer', () => {
    const onEdit = vi.fn()
    renderDossier(
      <FARDossierShell
        mode={activeMode}
        systemRank={2}
        humanSummary="Moderate operational risk."
        onClose={vi.fn()}
        onEdit={onEdit}
        onRestore={vi.fn()}
      >
        <div>Preserved FAR causal content</div>
      </FARDossierShell>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Preserved FAR causal content')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Edit failure vector/i }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('routes archived restore through the shared footer instead of exposing edit', () => {
    const onRestore = vi.fn()
    renderDossier(
      <FARDossierShell
        mode={{ ...activeMode, is_deleted: true }}
        systemRank={1}
        humanSummary="Archived risk."
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onRestore={onRestore}
      >
        <div>Archived dossier body</div>
      </FARDossierShell>,
    )

    expect(screen.queryByRole('button', { name: /Edit failure vector/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Restore failure vector/i }))
    expect(onRestore).toHaveBeenCalledTimes(1)
  })

  it('preserves existing FAR risk thresholds', () => {
    expect(getFarDossierRiskTone(151)).toBe('critical')
    expect(getFarDossierRiskTone(81)).toBe('warning')
    expect(getFarDossierRiskTone(80)).toBe('healthy')
  })
})
