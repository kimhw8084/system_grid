import { describe, expect, it, beforeEach } from 'vitest'
import { formatExternalExportContractReport, runExternalExportContractCheck } from './externalExportDiagnostics'

function makeResponse(body: BodyInit | null, init: ResponseInit & { redirected?: boolean; finalUrl?: string } = {}) {
  const response = new Response(body, init)
  Object.defineProperty(response, 'redirected', { value: Boolean(init.redirected) })
  Object.defineProperty(response, 'url', { value: init.finalUrl || 'https://api.example.com/response' })
  return response
}

describe('runExternalExportContractCheck', () => {
  beforeEach(() => {
    localStorage.setItem('SYSGRID_USER_ID', 'admin_root')
    localStorage.setItem('SYSGRID_TENANT_ID', '1')
  })

  it('passes when manifest, readable headers, and import preview are valid', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      if (url.endsWith('/api/v1/import/snapshot/external_entities/manifest')) {
        return makeResponse(JSON.stringify({
          profile: 'external_entities',
          schema_version: '2026-06-external-v1',
          filename: 'SysGrid_External_2026-06-30_15-11-09.csv',
          scope: 'active',
          content_type: 'text/csv',
          download_url: '/api/v1/import/snapshot/external_entities?export_token=2026-06-30_15-11-09',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          finalUrl: url,
        })
      }
      if (url.includes('/api/v1/import/snapshot/external_entities?export_token=2026-06-30_15-11-09')) {
        return makeResponse('name,type\nA,API\n', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=SysGrid_External_2026-06-30_15-11-09.csv',
            'X-SysGrid-Import-Profile': 'external_entities',
            'X-SysGrid-Schema-Version': '2026-06-external-v1',
          },
          finalUrl: url,
        })
      }
      if (url.endsWith('/api/v1/import/preview-file')) {
        return makeResponse(JSON.stringify({
          table_name: 'external_entities',
          total_rows: 1,
          valid_rows: 1,
          invalid_rows: 0,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          finalUrl: url,
        })
      }
      throw new Error(`unexpected url ${url}`)
    }

    const result = await runExternalExportContractCheck({
      fetchImpl,
      frontendOrigin: 'https://frontend.example.com',
      apiBase: 'https://api.example.com',
    })

    expect(result.status).toBe('PASS')
    expect(result.headers.verdict).toBe('PASS')
    expect(result.importPreview.verdict).toBe('PASS')
    expect(result.filenameValue).toBe('SysGrid_External_2026-06-30_15-11-09.csv')
    expect(result.headersReadable).toBe(true)
    expect(result.manifestFallbackUsed).toBe(false)
    expect(result.reportText).toContain('Frontend Origin: https://frontend.example.com')
  })

  it('passes with manifest fallback when custom headers are unreadable', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      if (url.endsWith('/api/v1/import/snapshot/external_entities/manifest')) {
        return makeResponse(JSON.stringify({
          profile: 'external_entities',
          schema_version: '2026-06-external-v1',
          filename: 'SysGrid_External_2026-06-30_15-11-09.csv',
          scope: 'active',
          content_type: 'text/csv',
          download_url: '/api/v1/import/snapshot/external_entities?export_token=2026-06-30_15-11-09',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          finalUrl: url,
        })
      }
      if (url.includes('/api/v1/import/snapshot/external_entities?export_token=2026-06-30_15-11-09')) {
        return makeResponse('name,type\nA,API\n', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
          },
          finalUrl: url,
        })
      }
      if (url.endsWith('/api/v1/import/preview-file')) {
        return makeResponse(JSON.stringify({
          table_name: 'external_entities',
          total_rows: 1,
          valid_rows: 1,
          invalid_rows: 0,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          finalUrl: url,
        })
      }
      throw new Error(`unexpected url ${url}`)
    }

    const result = await runExternalExportContractCheck({
      fetchImpl,
      frontendOrigin: 'https://frontend.example.com',
      apiBase: 'https://api.example.com',
    })

    expect(result.status).toBe('PASS')
    expect(result.headers.verdict).toBe('PARTIAL')
    expect(result.headersReadable).toBe(false)
    expect(result.manifestFallbackUsed).toBe(true)
    expect(result.reportText).toContain('Manifest Fallback Used: yes')
  })

  it('fails when manifest is redirected to oauth', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      return makeResponse('<html>GitLab sign in</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
        redirected: true,
        finalUrl: 'https://gitlab.example.com/oauth/authorize',
      })
    }

    const result = await runExternalExportContractCheck({
      fetchImpl,
      frontendOrigin: 'https://frontend.example.com',
      apiBase: 'https://api.example.com',
    })

    expect(result.status).toBe('FAIL')
    expect(result.layer).toBe('Auth / proxy routing')
    expect(result.redirectDetected).toBe(true)
    expect(result.recommendedFix).toContain('authenticated browser session')
  })

  it('fails when readable profile header does not match the contract', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      if (url.endsWith('/api/v1/import/snapshot/external_entities/manifest')) {
        return makeResponse(JSON.stringify({
          profile: 'external_entities',
          schema_version: '2026-06-external-v1',
          filename: 'SysGrid_External_2026-06-30_15-11-09.csv',
          scope: 'active',
          content_type: 'text/csv',
          download_url: '/api/v1/import/snapshot/external_entities?export_token=2026-06-30_15-11-09',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          finalUrl: url,
        })
      }
      if (url.includes('/api/v1/import/snapshot/external_entities?export_token=2026-06-30_15-11-09')) {
        return makeResponse('name,type\nA,API\n', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=SysGrid_External_2026-06-30_15-11-09.csv',
            'X-SysGrid-Import-Profile': 'wrong_profile',
            'X-SysGrid-Schema-Version': '2026-06-external-v1',
          },
          finalUrl: url,
        })
      }
      throw new Error(`unexpected url ${url}`)
    }

    const result = await runExternalExportContractCheck({
      fetchImpl,
      frontendOrigin: 'https://frontend.example.com',
      apiBase: 'https://api.example.com',
    })

    expect(result.status).toBe('FAIL')
    expect(result.layer).toBe('Profile validation')
    expect(result.headers.verdict).toBe('FAIL')
    expect(result.profile).toBe('wrong_profile')
  })
})

describe('formatExternalExportContractReport', () => {
  it('renders a copyable plain-text report with required lines', () => {
    const text = formatExternalExportContractReport({
      status: 'PASS',
      state: 'completed',
      layer: 'Verified',
      explanation: 'Environment is safe for External round-trip export.',
      recommendedFix: 'No fix required.',
      frontendOrigin: 'https://frontend.example.com',
      apiBase: 'https://api.example.com',
      environmentMode: 'cross-origin company-domain proxy',
      manifestUrl: 'https://api.example.com/api/v1/import/snapshot/external_entities/manifest',
      csvUrl: 'https://api.example.com/api/v1/import/snapshot/external_entities?export_token=2026-06-30_15-11-09',
      previewUrl: 'https://api.example.com/api/v1/import/preview-file',
      manifest: { verdict: 'PASS', message: 'Manifest ok.' },
      csvDownload: { verdict: 'PASS', message: 'CSV ok.' },
      headers: { verdict: 'PARTIAL', message: 'Manifest fallback used.' },
      filename: { verdict: 'PASS', message: 'Filename ok.' },
      importPreview: { verdict: 'PASS', message: 'Preview ok.' },
      statusCodes: { manifest: 200, csv: 200, preview: 200 },
      redirectDetected: false,
      headersReadable: false,
      manifestFallbackUsed: true,
      filenameValue: 'SysGrid_External_2026-06-30_15-11-09.csv',
      schemaVersion: '2026-06-external-v1',
      profile: 'external_entities',
      reportText: '',
    })

    expect(text).toContain('Frontend Origin: https://frontend.example.com')
    expect(text).toContain('API Base: https://api.example.com')
    expect(text).toContain('Headers Readable: no')
    expect(text).toContain('Manifest Fallback Used: yes')
    expect(text).toContain('Overall: PASS')
  })
})
