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
  const externalManifest = {
    profile: 'external_entities',
    schema_version: '2026-06-external-v1',
    filename: 'SysGrid_External_2026-06-30_08-21-47.csv',
    download_url: '/api/v1/import/snapshot/external_entities?export_token=2026-06-30_08-21-47',
    scope: 'active',
    content_type: 'text/csv',
  }
  const externalContract = {
    manifestEndpoint: '/api/v1/import/snapshot/external_entities/manifest',
    expectedProfile: 'external_entities',
    expectedSchemaVersion: '2026-06-external-v1',
    expectedFilenamePattern: /^SysGrid_External_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/,
    expectedScope: 'active',
    expectedContentType: 'text/csv',
  }

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

  it('succeeds when manifest and readable headers are both valid', async () => {
    apiFetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(externalManifest), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response('name,type\nA,API\n', {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename=${externalManifest.filename}`,
          'X-SysGrid-Import-Profile': 'external_entities',
          'X-SysGrid-Schema-Version': '2026-06-external-v1',
          'Content-Type': 'text/csv; charset=utf-8',
        },
      }))

    const result = await downloadOperationalImportFile({
      tableName: 'external_entities',
      kind: 'snapshot',
      expectedProfile: 'external_entities',
      requireSchemaHeaders: true,
      metadataContract: externalContract,
    })

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, '/api/v1/import/snapshot/external_entities/manifest', { method: 'GET' })
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, externalManifest.download_url, { method: 'GET' })
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:sysgrid')
    expect(result).toEqual({
      endpoint: externalManifest.download_url,
      fileName: externalManifest.filename,
      importProfile: 'external_entities',
      schemaVersion: '2026-06-external-v1',
    })
  })

  it('succeeds when headers are unreadable but manifest is valid', async () => {
    apiFetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(externalManifest), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response('name,type\nA,API\n', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
        },
      }))

    const result = await downloadOperationalImportFile({
      tableName: 'external_entities',
      kind: 'snapshot',
      expectedProfile: 'external_entities',
      requireSchemaHeaders: true,
      metadataContract: externalContract,
    })

    expect(result).toEqual({
      endpoint: externalManifest.download_url,
      fileName: externalManifest.filename,
      importProfile: 'external_entities',
      schemaVersion: '2026-06-external-v1',
    })
  })

  it('fails explicitly when headers are unreadable and manifest is missing', async () => {
    apiFetchMock.mockRejectedValue(Object.assign(new Error('API Error 404: Not Found'), { status: 404 }))

    await expect(downloadOperationalImportFile({
      tableName: 'external_entities',
      kind: 'snapshot',
      expectedProfile: 'external_entities',
      requireSchemaHeaders: true,
      metadataContract: externalContract,
    })).rejects.toThrow('Export metadata could not be verified.')
  })

  it('fails when manifest profile is wrong', async () => {
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify({
      ...externalManifest,
      profile: 'monitoring_items',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(downloadOperationalImportFile({
      tableName: 'external_entities',
      kind: 'snapshot',
      expectedProfile: 'external_entities',
      requireSchemaHeaders: true,
      metadataContract: externalContract,
    })).rejects.toThrow('Export manifest returned import profile "monitoring_items" instead of "external_entities"')
  })

  it('fails when manifest schema is wrong', async () => {
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify({
      ...externalManifest,
      schema_version: '2026-05-external-v1',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(downloadOperationalImportFile({
      tableName: 'external_entities',
      kind: 'snapshot',
      expectedProfile: 'external_entities',
      requireSchemaHeaders: true,
      metadataContract: externalContract,
    })).rejects.toThrow('Export manifest returned schema version "2026-05-external-v1" instead of "2026-06-external-v1"')
  })

  it('fails when manifest filename is invalid', async () => {
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify({
      ...externalManifest,
      filename: 'external.csv',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(downloadOperationalImportFile({
      tableName: 'external_entities',
      kind: 'snapshot',
      expectedProfile: 'external_entities',
      requireSchemaHeaders: true,
      metadataContract: externalContract,
    })).rejects.toThrow('Export manifest returned an invalid filename')
  })

  it('still rejects readable header mismatches instead of weakening validation', async () => {
    apiFetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(externalManifest), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response('name,type\nA,API\n', {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename=${externalManifest.filename}`,
          'X-SysGrid-Import-Profile': 'wrong_profile',
          'X-SysGrid-Schema-Version': '2026-06-external-v1',
          'Content-Type': 'text/csv',
        },
      }))

    await expect(downloadOperationalImportFile({
      tableName: 'external_entities',
      kind: 'snapshot',
      expectedProfile: 'external_entities',
      requireSchemaHeaders: true,
      metadataContract: externalContract,
    })).rejects.toThrow('Export returned import profile "wrong_profile" instead of "external_entities"')
  })
})
