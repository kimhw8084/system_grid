import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildBootstrapFailureDiagnosis,
  buildBootstrapReport,
  redactText,
} from './bootstrapDiagnostics'

describe('bootstrap diagnostics', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('classifies an invalid host header with the exact forwarded hostname', () => {
    const diagnosis = buildBootstrapFailureDiagnosis({
      error: {
        message: 'API Error 400: Bad Request',
        status: 400,
        statusText: 'Bad Request',
        rawBody: 'Invalid host header',
        url: 'http://8000.vscode.company.example/api/v1/settings/bootstrap',
        contentType: 'text/plain',
        method: 'GET',
      },
      configuredApiBase: 'http://8000.vscode.company.example',
      uiOrigin: 'http://5173.vscode.company.example',
      effectiveUserId: 'worker',
    })

    expect(diagnosis.code).toBe('invalid_host')
    expect(diagnosis.title).toContain('rejected')
    expect(diagnosis.reasons.join(' ')).toContain('8000.vscode.company.example')
    expect(diagnosis.actions.join(' ')).toContain('ALLOWED_HOSTS')
    expect(diagnosis.healthUrl).toBe('http://8000.vscode.company.example/api/v1/health')
  })

  it('classifies mixed content before generic network failure', () => {
    const diagnosis = buildBootstrapFailureDiagnosis({
      error: { message: 'Failed to fetch', status: 0 },
      configuredApiBase: 'http://api.company.example',
      uiOrigin: 'https://ui.company.example',
      effectiveUserId: 'worker',
    })

    expect(diagnosis.code).toBe('mixed_content')
    expect(diagnosis.summary).toContain('HTTPS frontend')
  })

  it('classifies authentication redirects', () => {
    const diagnosis = buildBootstrapFailureDiagnosis({
      error: {
        message: 'Backend JSON request was redirected to OAuth or a login page.',
        status: 200,
        redirected: true,
        finalUrl: 'https://gitlab.example.com/oauth/authorize',
      },
      configuredApiBase: 'https://api.company.example',
      uiOrigin: 'https://ui.company.example',
      effectiveUserId: 'worker',
    })

    expect(diagnosis.code).toBe('auth_redirect')
  })

  it('redacts credentials and token query parameters in reports', () => {
    const diagnosis = buildBootstrapFailureDiagnosis({
      error: {
        message: 'authorization=Bearer-super-secret',
        status: 500,
        url: 'https://api.example.com/health?token=secret-value',
      },
      configuredApiBase: 'https://api.example.com?api_key=secret',
      uiOrigin: 'https://ui.example.com',
      effectiveUserId: 'worker',
    })
    const report = buildBootstrapReport(diagnosis)

    expect(report).not.toContain('Bearer-super-secret')
    expect(report).not.toContain('secret-value')
    expect(report).not.toContain('api_key=secret')
    expect(report).toContain('<redacted>')
  })

  it('redacts common assignment forms', () => {
    expect(redactText('password=hunter2 token=abc')).toBe('password=<redacted> token=<redacted>')
  })
})
