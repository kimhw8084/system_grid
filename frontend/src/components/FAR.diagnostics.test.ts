import { beforeEach, describe, expect, it } from 'vitest'
import { buildFarRegistryDiagnosticDetail, FAR_REGISTRY_ENDPOINT } from './FAR.diagnostics'

describe('FAR registry diagnostics', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('SYSGRID_USER_ID', 'operator-7')
    localStorage.setItem('SYSGRID_TENANT_ID', '42')
  })

  it('preserves decorated request diagnostics for operator copy/support workflows', () => {
    const detail = buildFarRegistryDiagnosticDetail({
      status: 503,
      statusText: 'Service Unavailable',
      url: 'https://sysgrid.test/api/v1/far/modes?include_deleted=true',
      message: 'registry offline',
      rawBody: 'upstream timeout',
      data: { traceId: 'trace-123' },
    })

    expect(detail).toMatchObject({
      endpoint: FAR_REGISTRY_ENDPOINT,
      status: 503,
      statusText: 'Service Unavailable',
      url: 'https://sysgrid.test/api/v1/far/modes?include_deleted=true',
      userId: 'operator-7',
      tenantId: '42',
      message: 'registry offline',
      rawBody: 'upstream timeout',
      data: { traceId: 'trace-123' },
    })
  })

  it('fails safely when the query error has no transport decoration', () => {
    const detail = buildFarRegistryDiagnosticDetail(new Error('registry unavailable'))

    expect(detail.endpoint).toBe(FAR_REGISTRY_ENDPOINT)
    expect(detail.message).toBe('registry unavailable')
    expect(detail.userId).toBe('operator-7')
    expect(detail.tenantId).toBe('42')
    expect(String(detail.status)).toContain('Unavailable')
    expect(detail.rawBody).toBeUndefined()
  })
})
