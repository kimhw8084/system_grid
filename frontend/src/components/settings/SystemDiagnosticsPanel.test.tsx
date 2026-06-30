import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemDiagnosticsPanel } from './SystemDiagnosticsPanel'

const diagnosticsSpies = vi.hoisted(() => ({
  runSystemDiagnostics: vi.fn(),
}))

const toastSpies = vi.hoisted(() => ({
  showWorkspaceToast: vi.fn(),
}))

vi.mock('./externalExportDiagnostics', () => ({
  formatDiagnosticUrlForDisplay: (url: string) => url.replace(/\?.*$/, '?[redacted-query]'),
}))

vi.mock('./systemDiagnostics', () => ({
  runSystemDiagnostics: diagnosticsSpies.runSystemDiagnostics,
}))

vi.mock('../shared/WorkspaceToast', () => ({
  showWorkspaceToast: toastSpies.showWorkspaceToast,
}))

function makeResult(overrides: Record<string, any> = {}) {
  const result = {
    generatedAt: '2026-06-30T20:11:09.000Z',
    frontendOrigin: 'https://frontend.example.com',
    apiBase: 'https://api.example.com',
    environmentMode: 'cross-origin company-domain proxy',
    environmentSummary: {
      title: 'Environment Summary',
      status: 'PASS',
      layer: 'Runtime configuration',
      explanation: 'Frontend origin and API base URL are internally consistent for the current runtime.',
      recommendedFix: 'No fix required.',
      details: [
        { label: 'Frontend Origin', value: 'https://frontend.example.com' },
        { label: 'API Base', value: 'https://api.example.com' },
      ],
    },
    backendReachability: {
      title: 'Backend Reachability',
      status: 'PASS',
      layer: 'Ready',
      explanation: 'Readiness and startup-check returned valid JSON from the configured backend runtime.',
      recommendedFix: 'No fix required.',
      details: [
        { label: 'Readiness Status', value: '200' },
        { label: 'Startup Check Status', value: '200' },
      ],
    },
    transportRisk: {
      title: 'Transport / Preflight Risk',
      status: 'PARTIAL',
      layer: 'Cross-origin preflight risk',
      explanation: 'Cross-origin export requests are likely to trigger OPTIONS preflight because custom identity headers are being sent.',
      recommendedFix: 'Prefer same-origin company routing when possible, or confirm proxy/CORS policy explicitly allows OPTIONS and the SysGrid identity headers.',
      details: [
        { label: 'Expose Headers', value: 'Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version' },
      ],
    },
    externalExportContract: {
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
      manifest: { verdict: 'PASS', message: 'Manifest returned a valid backend-owned External export contract.' },
      csvDownload: { verdict: 'PASS', message: 'CSV endpoint returned successful CSV content from the configured API base.' },
      headers: { verdict: 'PASS', message: 'Custom headers were readable and matched the backend contract.' },
      filename: { verdict: 'PASS', message: 'Filename validated as SysGrid_External_2026-06-30_15-11-09.csv.' },
      importPreview: { verdict: 'PASS', message: 'Exported CSV previewed successfully through External Import.' },
      statusCodes: { manifest: 200, csv: 200, preview: 200 },
      redirectDetected: false,
      headersReadable: true,
      manifestFallbackUsed: false,
      filenameValue: 'SysGrid_External_2026-06-30_15-11-09.csv',
      schemaVersion: '2026-06-external-v1',
      profile: 'external_entities',
      exposeHeadersValue: 'Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version',
      wildcardExposeHeadersDetected: false,
      transport: {
        manifest: {
          method: 'GET',
          customIdentityHeadersSent: true,
          contentTypeHeaderSent: null,
          likelySimpleRequest: false,
          likelyPreflight: true,
          explanation: 'cross-origin request; sends X-User-Id/X-Tenant-Id; does not send Content-Type; likely triggers OPTIONS preflight; custom identity headers can force preflight',
        },
        csv: {
          method: 'GET',
          customIdentityHeadersSent: true,
          contentTypeHeaderSent: null,
          likelySimpleRequest: false,
          likelyPreflight: true,
          explanation: 'cross-origin request; sends X-User-Id/X-Tenant-Id; does not send Content-Type; likely triggers OPTIONS preflight; custom identity headers can force preflight',
        },
      },
      reportText: [
        'External Export Contract: PASS',
        'Frontend Origin: https://frontend.example.com',
        'API Base: https://api.example.com',
      ].join('\n'),
    },
    fullReportText: [
      'System Diagnostics Generated At: 2026-06-30T20:11:09.000Z',
      'Environment Summary: PASS',
      'Backend Reachability: PASS',
      'Transport / Preflight Risk: PARTIAL',
      'External Export Contract: PASS',
    ].join('\n'),
  }
  return { ...result, ...overrides }
}

describe('SystemDiagnosticsPanel', () => {
  beforeEach(() => {
    diagnosticsSpies.runSystemDiagnostics.mockReset()
    toastSpies.showWorkspaceToast.mockReset()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders the system diagnostics panel in idle state', () => {
    render(<SystemDiagnosticsPanel />)

    expect(screen.getByText('System Diagnostics')).toBeInTheDocument()
    expect(screen.getByText('External Export Contract')).toBeInTheDocument()
    expect(screen.getByText('idle')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Run All Checks/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Copy Full Report/i })).toBeDisabled()
  })

  it('shows environment, backend, and external cards after a successful run', async () => {
    diagnosticsSpies.runSystemDiagnostics.mockResolvedValue(makeResult())

    render(<SystemDiagnosticsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Run All Checks/i }))

    await waitFor(() => expect(screen.getByText('Environment Summary')).toBeInTheDocument())
    expect(screen.getByText('Backend Reachability')).toBeInTheDocument()
    expect(screen.getByText('Transport / Preflight Risk')).toBeInTheDocument()
    expect(screen.getByText('Environment is safe for External round-trip export.')).toBeInTheDocument()
  })

  it('shows partial external export diagnostics details', async () => {
    diagnosticsSpies.runSystemDiagnostics.mockResolvedValue(makeResult({
      externalExportContract: {
        ...makeResult().externalExportContract,
        status: 'PARTIAL',
        layer: 'Headers / manifest fallback',
        explanation: 'Headers were unreadable but manifest fallback validated the contract.',
        headers: { verdict: 'PARTIAL', message: 'Custom headers were unreadable; manifest fallback was used.' },
        headersReadable: false,
        manifestFallbackUsed: true,
      },
    }))

    render(<SystemDiagnosticsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Run All Checks/i }))

    await waitFor(() => expect(screen.getByText(/manifest fallback validated the contract/i)).toBeInTheDocument())
    expect(screen.getByText(/headers readable: no/i)).toBeInTheDocument()
  })

  it('copies the generated full report', async () => {
    diagnosticsSpies.runSystemDiagnostics.mockResolvedValue(makeResult())
    const writeText = vi.mocked(navigator.clipboard.writeText)

    render(<SystemDiagnosticsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Run All Checks/i }))

    await waitFor(() => expect(screen.getByText('Environment Summary')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Copy Full Report/i }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('System Diagnostics Generated At: 2026-06-30T20:11:09.000Z')))
  })

  it('does not expose secrets, tokens, or cookies in rendered output', async () => {
    diagnosticsSpies.runSystemDiagnostics.mockResolvedValue(makeResult())

    render(<SystemDiagnosticsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Run All Checks/i }))

    await waitFor(() => expect(screen.getByText('Environment Summary')).toBeInTheDocument())
    const text = document.body.textContent || ''
    expect(text).not.toMatch(/cookie/i)
    expect(text).not.toMatch(/token/i)
    expect(text).not.toMatch(/authorization/i)
  })
})
