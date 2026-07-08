import React from 'react'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { AssetGoldenDialogs } from './AssetGoldenDialogs'

// Mock apiFetch from '../../api/apiClient'
vi.mock('../../api/apiClient', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        fields: [
          { name: 'name', type: 'string', label: 'Instance Name' },
          { name: 'status', type: 'string', label: 'Status' },
        ],
        required_fields: ['name'],
        example_records: []
      }),
  }),
}))

describe('Asset Import Parity (Blocker A)', () => {
  const getMockProps = () => ({
    detailAsset: null,
    detailLink: null,
    devices: [],
    editingAsset: null,
    editingLink: null,
    linkPurposeOptions: [],
    farmOptions: [],
    cableTypeOptions: [],
    onCloseDetails: vi.fn(),
    onCloseEdit: vi.fn(),
    onCloseLinkDetails: vi.fn(),
    onCloseLinkEdit: vi.fn(),
    onRefresh: vi.fn(),
    options: {},
    quickLookAsset: null,
    setEditingAsset: vi.fn(),
    setQuickLookAsset: vi.fn(),
    setServiceDetails: vi.fn(),
    setServiceEdit: vi.fn(),
    showImportModal: true, // Force import modal open
    showRegistryModal: false,
    serviceDetails: null,
    serviceEdit: null,
    setShowImportModal: vi.fn(),
    setShowRegistryModal: vi.fn(),
    confirmState: null,
    setConfirmState: vi.fn(),
  })

  it('renders the same shared/golden import modal grammar as Monitoring configured for tableName="devices" and displayName="Assets"', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    })

    const props = getMockProps()
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <QueryClientProvider client={queryClient}>
            <AssetGoldenDialogs {...props} />
          </QueryClientProvider>
        ),
      },
    ], {
      initialEntries: ['/'],
    })

    render(<RouterProvider router={router} />)

    // Verify it renders the golden import modal headers, awaiting the async API schema fetch
    expect(await screen.findByText('Assets Import')).toBeInTheDocument()
    expect(await screen.findByText('File Upload')).toBeInTheDocument()
    expect(await screen.findByText('Paste CSV / Grid')).toBeInTheDocument()
  })
})
