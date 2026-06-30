import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/apiClient', () => ({
  apiFetch: vi.fn(),
}))

import { downloadOperationalImportFile } from './OperationalImportExport'
import { apiFetch } from '../../api/apiClient'

describe('downloadOperationalImportFile', () => {
  const apiFetchMock = vi.mocked(apiFetch)
  const createObjectURL = vi.fn(() => 'blob:sysgrid')
  const revokeObjectURL = vi.fn()
  const click = vi.fn()
  const originalCreateElement = document.createElement.bind(document)

  beforeEach(() => {
    apiFetchMock.mockReset()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    click.mockClear()
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'a') return originalCreateElement(tagName)
      return {
        href: '',
        download: '',
        click,
      } as any
    }) as typeof document.createElement)
  })

  it('downloads the backend snapshot, validates round-trip headers, and uses the backend filename contract', async () => {
    apiFetchMock.mockResolvedValue(new Response('name,type\nA,API\n', {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename=SysGrid_External_2026-06-30_08-21-47.csv',
        'X-SysGrid-Import-Profile': 'external_entities',
        'X-SysGrid-Schema-Version': '2026-06-external-v1',
      },
    }))

    const result = await downloadOperationalImportFile({
      tableName: 'external_entities',
      kind: 'snapshot',
      expectedProfile: 'external_entities',
      requireSchemaHeaders: true,
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/import/snapshot/external_entities', { method: 'GET' })
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:sysgrid')
    expect(result).toEqual({
      endpoint: '/api/v1/import/snapshot/external_entities',
      fileName: 'SysGrid_External_2026-06-30_08-21-47.csv',
      importProfile: 'external_entities',
      schemaVersion: '2026-06-external-v1',
    })
  })

  it('throws an actionable error when the backend omits schema metadata', async () => {
    apiFetchMock.mockResolvedValue(new Response('name,type\nA,API\n', {
      status: 200,
      headers: {
        'X-SysGrid-Import-Profile': 'external_entities',
      },
    }))

    await expect(downloadOperationalImportFile({
      tableName: 'external_entities',
      kind: 'snapshot',
      expectedProfile: 'external_entities',
      requireSchemaHeaders: true,
    })).rejects.toThrow('Export did not include schema version metadata')
  })
})
