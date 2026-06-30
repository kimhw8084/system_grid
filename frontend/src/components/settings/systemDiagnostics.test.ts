import { describe, expect, it, vi } from 'vitest'
import { runSystemDiagnostics } from './systemDiagnostics'

function makeResponse(
  body: BodyInit | null,
  init: ResponseInit & { redirected?: boolean; finalUrl?: string } = {},
) {
  const response = new Response(body, init)
  Object.defineProperty(response, 'redirected', { value: Boolean(init.redirected) })
  Object.defineProperty(response, 'url', { value: init.finalUrl || 'https://api.example.com/response' })
  return response
}

describe('runSystemDiagnostics', () => {
  it('flags stale frontend bundle mismatch when backend hint differs', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/v1/readiness')) {
        return makeResponse(JSON.stringify({
          status: 'ready',
          frontend_build_version_hint: '9.9.9',
          environment_mode: 'restricted-origin-runtime',
          import_export_contract: {
            external_schema_version: '2026-06-external-v1',
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' }, finalUrl: url })
      }
      if (url.endsWith('/api/v1/settings/startup-check')) {
        return makeResponse(JSON.stringify({
          runtime: {
            environment_mode: 'restricted-origin-runtime',
            frontend_build_version_hint: '9.9.9',
          },
          warnings: [],
        }), { status: 200, headers: { 'Content-Type': 'application/json' }, finalUrl: url })
      }
      if (url.endsWith('/api/v1/import/snapshot/external_entities/manifest')) {
        return makeResponse(JSON.stringify({
          profile: 'external_entities',
          schema_version: '2026-06-external-v1',
          filename: 'SysGrid_External_2026-06-30_15-11-09.csv',
          scope: 'active',
          content_type: 'text/csv',
          download_url: '/api/v1/import/snapshot/external_entities?export_token=2026-06-30_15-11-09',
        }), { status: 200, headers: { 'Content-Type': 'application/json' }, finalUrl: url })
      }
      if (url.includes('/api/v1/import/snapshot/external_entities?export_token=')) {
        return makeResponse('name,type\nA,API\n', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=SysGrid_External_2026-06-30_15-11-09.csv',
            'X-SysGrid-Import-Profile': 'external_entities',
            'X-SysGrid-Schema-Version': '2026-06-external-v1',
            'Access-Control-Expose-Headers': 'Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version',
          },
          finalUrl: url,
        })
      }
      if (url.endsWith('/api/v1/import/preview-file')) {
        return makeResponse(JSON.stringify({
          table_name: 'external_entities',
          invalid_rows: 0,
        }), { status: 200, headers: { 'Content-Type': 'application/json' }, finalUrl: url })
      }
      throw new Error(`unexpected url ${url}`)
    }) as typeof fetch

    const result = await runSystemDiagnostics({
      fetchImpl,
      frontendOrigin: 'https://frontend.example.com',
      apiBase: 'https://api.example.com',
    })

    expect(result.environmentSummary.status).toBe('PARTIAL')
    expect(result.environmentSummary.layer).toBe('Stale frontend bundle risk')
    expect(result.environmentSummary.explanation).toContain('does not match backend hint 9.9.9')
    expect(result.backendReachability.status).toBe('PASS')
  })
})
