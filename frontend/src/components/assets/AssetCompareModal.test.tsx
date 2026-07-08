import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AssetCompareModal } from './AssetCompareModal'

describe('AssetCompareModal', () => {
  const mockItems = [
    {
      id: 1,
      name: 'asset-alpha',
      status: 'Active',
      system: 'Sys-A',
      type: 'Physical',
      environment: 'Production',
      owner: 'Alice',
      manufacturer: 'Dell',
      model: 'R740',
      primary_ip: '10.0.0.1',
      management_ip: '192.168.1.1',
      rack_name: 'Rack-01',
      site_name: 'Site-A',
      hardware_summary: '64GB RAM, 16 Cores',
    },
    {
      id: 2,
      name: 'asset-beta',
      status: 'Offline', // Differing status
      system: 'Sys-A',
      type: 'Physical',
      environment: 'Production',
      owner: 'Alice',
      manufacturer: 'Dell',
      model: 'R740',
      primary_ip: '10.0.0.2', // Differing IP
      management_ip: '192.168.1.1',
      rack_name: 'Rack-01',
      site_name: 'Site-A',
      hardware_summary: '64GB RAM, 16 Cores',
    },
  ]

  function renderCompareModal(items: any[], onClose = vi.fn()) {
    const router = createMemoryRouter([
      {
        path: '/',
        element: <AssetCompareModal items={items} onClose={onClose} />,
      },
    ], {
      initialEntries: ['/'],
    })
    render(<RouterProvider router={router} />)
  }

  it('renders the compare modal with loaded assets information', () => {
    renderCompareModal(mockItems)

    // Check title and subtitle
    expect(screen.getByText('Compare Assets')).toBeInTheDocument()
    expect(screen.getByText('2 Assets Loaded')).toBeInTheDocument()

    // Check individual asset header info
    expect(screen.getByText('asset-alpha')).toBeInTheDocument()
    expect(screen.getByText('asset-beta')).toBeInTheDocument()
  })

  it('renders properties in full by default (all fields shown)', () => {
    renderCompareModal(mockItems)

    // Common non-differing values like Owner should be rendered
    expect(screen.getAllByText('Owner')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Alice')[0]).toBeInTheDocument()

    // Differing values should be rendered
    expect(screen.getAllByText('Status')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Active')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Offline')[0]).toBeInTheDocument()
  })

  it('filters to show differences only when checkbox is selected', () => {
    renderCompareModal(mockItems)

    // Get the Show Differences Only checkbox
    const checkbox = screen.getByRole('checkbox', { name: 'Show Differences Only' })
    expect(checkbox).not.toBeChecked()

    // Check that "Owner" (which is identical: 'Alice' for both) is present
    expect(screen.queryAllByText('Owner')[0]).toBeInTheDocument()

    // Toggle the checkbox
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()

    // Now, "Owner" (identical property) should be filtered out
    expect(screen.queryByText('Owner')).toBeNull()

    // But "Status" and "Primary IP" (differing properties) must still be visible
    expect(screen.getAllByText('Status')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Primary IP')[0]).toBeInTheDocument()
  })

  it('renders clear empty difference message when assets are completely identical and showDiffsOnly is true', () => {
    // Pass completely identical assets
    const identicalItems = [mockItems[0], { ...mockItems[0], id: 3 }]
    renderCompareModal(identicalItems)

    const checkbox = screen.getByRole('checkbox', { name: 'Show Differences Only' })
    fireEvent.click(checkbox)

    // The component should display the custom empty message
    expect(screen.getByText('No Differences Identified')).toBeInTheDocument()
    expect(screen.getByText(/These selected assets are completely identical/)).toBeInTheDocument()
  })
})
