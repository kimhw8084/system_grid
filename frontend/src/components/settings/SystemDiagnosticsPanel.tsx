import React, { useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clipboard, Clock3, Globe, Play, ShieldAlert, Wrench } from 'lucide-react'
import { ToolbarButton } from '../shared/LayoutPrimitives'
import { showWorkspaceToast } from '../shared/WorkspaceToast'
import { formatDiagnosticUrlForDisplay, runExternalExportContractCheck, type DiagnosticState, type DiagnosticVerdict, type ExternalExportContractResult } from './externalExportDiagnostics'

function VerdictBadge({ verdict }: { verdict: DiagnosticVerdict }) {
  const tone = verdict === 'PASS'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : verdict === 'PARTIAL'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'

  return (
    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tone}`}>
      {verdict}
    </span>
  )
}

function StateBadge({ state }: { state: DiagnosticState }) {
  const tone = state === 'running'
    ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
    : state === 'completed'
      ? 'border-white/10 bg-black/20 text-slate-300'
      : 'border-white/10 bg-black/20 text-slate-500'

  return (
    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tone}`}>
      {state}
    </span>
  )
}

function LayerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-white/5 bg-black/20 px-4 py-3">
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="max-w-[70%] break-all text-right text-[10px] font-semibold text-slate-300">{value}</span>
    </div>
  )
}

export function SystemDiagnosticsPanel() {
  const [runState, setRunState] = useState<DiagnosticState>('idle')
  const [result, setResult] = useState<ExternalExportContractResult | null>(null)

  const runAllChecks = async () => {
    setRunState('running')
    setResult(null)
    try {
      const next = await runExternalExportContractCheck()
      setResult(next)
      setRunState('completed')
      showWorkspaceToast(`External Export Contract ${next.status}`)
    } catch (error: any) {
      const fallback = {
        status: 'FAIL' as const,
        state: 'completed' as const,
        layer: 'Diagnostics runner',
        explanation: error?.message || 'Diagnostics failed unexpectedly.',
        recommendedFix: 'Inspect the browser runtime and retry the diagnostics card.',
        frontendOrigin: window.location.origin,
        apiBase: '',
        environmentMode: 'unknown',
        manifestUrl: '',
        csvUrl: '',
        previewUrl: '',
        manifest: { verdict: 'FAIL' as const, message: 'Diagnostics runner failed.' },
        csvDownload: { verdict: 'PARTIAL' as const, message: 'Not run.' },
        headers: { verdict: 'PARTIAL' as const, message: 'Not run.' },
        filename: { verdict: 'PARTIAL' as const, message: 'Not run.' },
        importPreview: { verdict: 'PARTIAL' as const, message: 'Not run.' },
        statusCodes: { manifest: 'NOT_RUN' as const, csv: 'NOT_RUN' as const, preview: 'NOT_RUN' as const },
        redirectDetected: false,
        headersReadable: false,
        manifestFallbackUsed: false,
        filenameValue: null,
        schemaVersion: null,
        profile: null,
        transport: {
          manifest: {
            method: 'GET',
            customIdentityHeadersSent: false,
            contentTypeHeaderSent: null,
            likelySimpleRequest: true,
            likelyPreflight: false,
            explanation: 'Diagnostics runner failed before request classification completed.',
          },
          csv: {
            method: 'GET',
            customIdentityHeadersSent: false,
            contentTypeHeaderSent: null,
            likelySimpleRequest: true,
            likelyPreflight: false,
            explanation: 'Diagnostics runner failed before request classification completed.',
          },
        },
        reportText: '',
      }
      setResult(fallback)
      setRunState('completed')
      showWorkspaceToast(fallback.explanation, { type: 'error' })
    }
  }

  const reportText = useMemo(() => result?.reportText || '', [result])

  const copyReport = async () => {
    if (!reportText) return
    await navigator.clipboard.writeText(reportText)
    showWorkspaceToast('Diagnostics report copied')
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-5 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-blue-500/20 bg-blue-600/10 p-2 text-blue-400">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white">System Diagnostics</h3>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                Browser-runtime contract verification for the External export flow. Uses the current frontend origin and configured API base. No secrets or sensitive session data are displayed.
              </p>
            </div>
          </div>
          <ToolbarButton onClick={runAllChecks} variant="primary" className="min-w-[180px]" disabled={runState === 'running'}>
            <span className="flex items-center gap-2">
              {runState === 'running' ? <Clock3 size={14} className="animate-spin" /> : <Play size={14} />}
              Run All Checks
            </span>
          </ToolbarButton>
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-black/30 p-5 shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-white/5 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white">External Export Contract</h3>
              {result ? <VerdictBadge verdict={result.status} /> : null}
              <StateBadge state={runState} />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-slate-400">
              Validates manifest contract, CSV download route, auth/proxy redirect behavior, header readability, manifest fallback, profile/schema/filename checks, and External Import preview compatibility when reachable.
            </p>
          </div>
          <ToolbarButton onClick={copyReport} variant="secondary" disabled={!reportText}>
            <span className="flex items-center gap-2">
              <Clipboard size={14} />
              Copy Report
            </span>
          </ToolbarButton>
        </div>

        {result ? (
          <div className="space-y-4 pt-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <LayerRow label="Frontend Origin" value={result.frontendOrigin} />
              <LayerRow label="API Base" value={result.apiBase || '(relative proxy)'} />
              <LayerRow label="Environment Mode" value={result.environmentMode} />
              <LayerRow label="Layer" value={result.layer} />
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-lg border border-white/5 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Globe size={14} className="text-blue-400" />
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white">Checks</p>
                </div>
                <div className="space-y-2 text-[10px] font-semibold text-slate-300">
                  <p>Manifest: <span className="font-black">{result.manifest.verdict}</span> — {result.manifest.message}</p>
                  <p>CSV Download: <span className="font-black">{result.csvDownload.verdict}</span> — {result.csvDownload.message}</p>
                  <p>Headers: <span className="font-black">{result.headers.verdict}</span> — {result.headers.message}</p>
                  <p>Filename: <span className="font-black">{result.filename.verdict}</span> — {result.filename.message}</p>
                  <p>Import Preview: <span className="font-black">{result.importPreview.verdict}</span> — {result.importPreview.message}</p>
                </div>
              </div>

              <div className="rounded-lg border border-white/5 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  {result.status === 'FAIL' ? <ShieldAlert size={14} className="text-rose-400" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white">Verdict</p>
                </div>
                <div className="space-y-3 text-[10px] font-semibold text-slate-300">
                  <p>{result.explanation}</p>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Recommended Fix</p>
                    <p className="mt-1">{result.recommendedFix}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <Wrench size={12} />
                    redirect detected: {result.redirectDetected ? 'yes' : 'no'} | headers readable: {result.headersReadable ? 'yes' : 'no'} | manifest fallback used: {result.manifestFallbackUsed ? 'yes' : 'no'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <LayerRow label="Manifest URL" value={formatDiagnosticUrlForDisplay(result.manifestUrl)} />
              <LayerRow label="CSV URL" value={formatDiagnosticUrlForDisplay(result.csvUrl)} />
              <LayerRow label="Manifest Transport" value={result.transport.manifest.explanation} />
              <LayerRow label="CSV Transport" value={result.transport.csv.explanation} />
              <LayerRow label="Preview URL" value={formatDiagnosticUrlForDisplay(result.previewUrl)} />
              <LayerRow label="Filename" value={result.filenameValue || 'missing'} />
              <LayerRow label="Schema Version" value={result.schemaVersion || 'missing'} />
              <LayerRow label="Profile" value={result.profile || 'missing'} />
              <LayerRow label="Manifest Status" value={String(result.statusCodes.manifest)} />
              <LayerRow label="CSV Status" value={String(result.statusCodes.csv)} />
              <LayerRow label="Preview Status" value={String(result.statusCodes.preview)} />
            </div>

            <div className="rounded-lg border border-white/5 bg-black/40 p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-white">Plain-Text Report</p>
              <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/5 bg-black/30 p-4 text-[10px] font-mono text-slate-300 custom-scrollbar">
                {reportText}
              </pre>
            </div>
          </div>
        ) : (
          <div className="py-10">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Run All Checks to capture the browser-runtime External export contract report.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
