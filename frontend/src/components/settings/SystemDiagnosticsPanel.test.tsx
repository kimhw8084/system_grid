import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemDiagnosticsPanel } from './SystemDiagnosticsPanel'

const diagnosticsSpies = vi.hoisted(() => ({
  runExternalExportContractCheck: vi.fn(),
}))

const toastSpies = vi.hoisted(() => ({
  showWorkspaceToast: vi.fn(),
}))

vi.mock('./externalExportDiagnostics', () => ({
  runExternalExportContractCheck: diagnosticsSpies.runExternalExportContractCheck,
  formatDiagnosticUrlForDisplay: (url: string) => url.replace(/\?.*$/, '?[redacted-query]'),
}))

vi.mock('../shared/WorkspaceToast', () => ({
  showWorkspaceToast: toastSpies.showWorkspaceToast,
}))

function makeResult(overrides: Record<string, any> = {}) {
  return {
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
      'Manifest URL: https://api.example.com/api/v1/import/snapshot/external_entities/manifest',
      'CSV URL: https://api.example.com/api/v1/import/snapshot/external_entities?[redacted-query]',
      'Redirect Detected: no',
      'Manifest Fallback Used: no',
      'Overall: PASS',
    ].join('\n'),
    ...overrides,
  }
}

describe('SystemDiagnosticsPanel', () => {
  beforeEach(() => {
    diagnosticsSpies.runExternalExportContractCheck.mockReset()
    toastSpies.showWorkspaceToast.mockReset()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders the system diagnostics panel and external export contract card in idle state', () => {
    render(<SystemDiagnosticsPanel />)

    expect(screen.getByText('System Diagnostics')).toBeInTheDocument()
    expect(screen.getByText('External Export Contract')).toBeInTheDocument()
    expect(screen.getByText('idle')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Run All Checks/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Copy Report/i })).toBeDisabled()
  })

  it('shows running state then PASS result when the diagnostics runner succeeds', async () => {
    let resolveRun: (value: any) => void = () => {}
    diagnosticsSpies.runExternalExportContractCheck.mockReturnValue(new Promise((resolve) => {
      resolveRun = resolve
    }))

    render(<SystemDiagnosticsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Run All Checks/i }))

    expect(screen.getByText('running')).toBeInTheDocument()

    resolveRun(makeResult())

    await waitFor(() => expect(screen.getByText('Environment is safe for External round-trip export.')).toBeInTheDocument())
    expect(diagnosticsSpies.runExternalExportContractCheck).toHaveBeenCalledTimes(1)
    expect(screen.getAllByText('PASS').length).toBeGreaterThan(0)
  })

  it('shows PARTIAL result details', async () => {
    diagnosticsSpies.runExternalExportContractCheck.mockResolvedValue(makeResult({
      status: 'PARTIAL',
      layer: 'Headers / manifest fallback',
      explanation: 'Headers were unreadable but manifest fallback validated the contract.',
      headers: { verdict: 'PARTIAL', message: 'Custom headers were unreadable; manifest fallback was used.' },
      headersReadable: false,
      manifestFallbackUsed: true,
      reportText: 'External Export Contract: PARTIAL\nManifest Fallback Used: yes',
    }))

    render(<SystemDiagnosticsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Run All Checks/i }))

    await waitFor(() => expect(screen.getByText(/manifest fallback validated the contract/i)).toBeInTheDocument())
    expect(screen.getAllByText('PARTIAL').length).toBeGreaterThan(0)
    expect(screen.getByText(/manifest fallback validated the contract/i)).toBeInTheDocument()
    expect(screen.getByText(/headers readable: no/i)).toBeInTheDocument()
  })

  it('shows FAIL result details with failure layer', async () => {
    diagnosticsSpies.runExternalExportContractCheck.mockResolvedValue(makeResult({
      status: 'FAIL',
      layer: 'Auth / proxy routing',
      explanation: 'Manifest request was redirected to OAuth before reaching SysGrid backend.',
      recommendedFix: 'Ensure authenticated browser access to the manifest route.',
      reportText: 'External Export Contract: FAIL\nLayer: Auth / proxy routing',
    }))

    render(<SystemDiagnosticsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Run All Checks/i }))

    await waitFor(() => expect(screen.getByText('Auth / proxy routing')).toBeInTheDocument())
    expect(screen.getAllByText('FAIL').length).toBeGreaterThan(0)
    expect(screen.getByText('Auth / proxy routing')).toBeInTheDocument()
    expect(screen.getByText(/redirected to OAuth/i)).toBeInTheDocument()
  })

  it('copies the generated plain-text report', async () => {
    diagnosticsSpies.runExternalExportContractCheck.mockResolvedValue(makeResult())
    const writeText = vi.mocked(navigator.clipboard.writeText)

    render(<SystemDiagnosticsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Run All Checks/i }))

    await waitFor(() => expect(screen.getByText('Environment is safe for External round-trip export.')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Copy Report/i }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('External Export Contract: PASS')))
  })

  it('does not expose secrets, tokens, or cookies in rendered output', async () => {
    diagnosticsSpies.runExternalExportContractCheck.mockResolvedValue(makeResult({
      reportText: 'External Export Contract: PASS\nFrontend Origin: https://frontend.example.com',
    }))

    render(<SystemDiagnosticsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Run All Checks/i }))

    await waitFor(() => expect(screen.getByText('Environment is safe for External round-trip export.')).toBeInTheDocument())
    const text = document.body.textContent || ''
    expect(text).not.toMatch(/cookie/i)
    expect(text).not.toMatch(/token/i)
    expect(text).not.toMatch(/authorization/i)
  })
})
