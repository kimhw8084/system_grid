import React, { useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clipboard, Clock3, Globe, Play, ShieldAlert, Wrench } from 'lucide-react'
import { ToolbarButton } from '../shared/LayoutPrimitives'
import { showWorkspaceToast } from '../shared/WorkspaceToast'
import { formatDiagnosticUrlForDisplay, type DiagnosticState, type DiagnosticVerdict, type ExternalExportContractResult } from './externalExportDiagnostics'
import { runSystemDiagnostics, type SystemDiagnosticCard, type SystemDiagnosticsReport } from './systemDiagnostics'

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

function DiagnosticCardSection({ card }: { card: SystemDiagnosticCard }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/30 p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white">{card.title}</h3>
            <VerdictBadge verdict={card.status} />
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-300">{card.explanation}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <LayerRow label="Failure Layer" value={card.layer} />
        <LayerRow label="Recommended Fix" value={card.recommendedFix} />
        {card.details.map((detail) => (
          <LayerRow key={`${card.title}-${detail.label}`} label={detail.label} value={detail.value} />
        ))}
      </div>
    </div>
  )
}

export function SystemDiagnosticsPanel() {
  const [runState, setRunState] = useState<DiagnosticState>('idle')
  const [report, setReport] = useState<SystemDiagnosticsReport | null>(null)

  const runAllChecks = async () => {
    setRunState('running')
    setReport(null)
    try {
      const next = await runSystemDiagnostics()
      setReport(next)
      setRunState('completed')
      showWorkspaceToast(`System Diagnostics ${next.externalExportContract.status}`)
    } catch (error: any) {
      const fallbackExternal: ExternalExportContractResult = {
        status: 'FAIL',
        state: 'completed',
        layer: 'Diagnostics runner',
        explanation: error?.message || 'Diagnostics failed unexpectedly.',
        recommendedFix: 'Inspect the browser runtime and retry the diagnostics card.',
        frontendOrigin: window.location.origin,
        apiBase: '',
        environmentMode: 'unknown',
        manifestUrl: '',
        csvUrl: '',
        previewUrl: '',
        manifest: { verdict: 'FAIL', message: 'Diagnostics runner failed.' },
        csvDownload: { verdict: 'PARTIAL', message: 'Not run.' },
        headers: { verdict: 'PARTIAL', message: 'Not run.' },
        filename: { verdict: 'PARTIAL', message: 'Not run.' },
        importPreview: { verdict: 'PARTIAL', message: 'Not run.' },
        statusCodes: { manifest: 'NOT_RUN', csv: 'NOT_RUN', preview: 'NOT_RUN' },
        redirectDetected: false,
        headersReadable: false,
        manifestFallbackUsed: false,
        filenameValue: null,
        schemaVersion: null,
        profile: null,
        exposeHeadersValue: null,
        wildcardExposeHeadersDetected: false,
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
      const fallback: SystemDiagnosticsReport = {
        generatedAt: new Date().toISOString(),
        frontendOrigin: window.location.origin,
        apiBase: '',
        environmentMode: 'unknown',
        environmentSummary: {
          title: 'Environment Summary',
          status: 'FAIL',
          layer: 'Diagnostics runner',
          explanation: fallbackExternal.explanation,
          recommendedFix: fallbackExternal.recommendedFix,
          details: [],
        },
        backendReachability: {
          title: 'Backend Reachability',
          status: 'FAIL',
          layer: 'Diagnostics runner',
          explanation: fallbackExternal.explanation,
          recommendedFix: fallbackExternal.recommendedFix,
          details: [],
        },
        externalExportContract: fallbackExternal,
        transportRisk: {
          title: 'Transport / Preflight Risk',
          status: 'FAIL',
          layer: 'Diagnostics runner',
          explanation: fallbackExternal.explanation,
          recommendedFix: fallbackExternal.recommendedFix,
          details: [],
        },
        fullReportText: '',
      }
      fallback.fullReportText = [
        `System Diagnostics Generated At: ${fallback.generatedAt}`,
        `Environment Summary: FAIL`,
        `Explanation: ${fallbackExternal.explanation}`,
      ].join('\n')
      setReport(fallback)
      setRunState('completed')
      showWorkspaceToast(fallbackExternal.explanation, { type: 'error' })
    }
  }

  const reportText = useMemo(() => report?.fullReportText || '', [report])

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
                Browser-runtime deployment diagnostics for environment configuration, backend reachability, External export/import contract health, and cross-origin transport risk. No secrets or sensitive session data are displayed.
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

      {report ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <DiagnosticCardSection card={report.environmentSummary} />
          <DiagnosticCardSection card={report.backendReachability} />
        </div>
      ) : null}

      <div className="rounded-lg border border-white/5 bg-black/30 p-5 shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-white/5 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white">External Export Contract</h3>
              {report ? <VerdictBadge verdict={report.externalExportContract.status} /> : null}
              <StateBadge state={runState} />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-slate-400">
              Validates manifest contract, CSV download route, auth/proxy redirect behavior, header readability, manifest fallback, profile/schema/filename checks, and External Import preview compatibility when reachable.
            </p>
          </div>
          <ToolbarButton onClick={copyReport} variant="secondary" disabled={!reportText}>
            <span className="flex items-center gap-2">
              <Clipboard size={14} />
              Copy Full Report
            </span>
          </ToolbarButton>
        </div>

        {report ? (
          <div className="space-y-4 pt-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <LayerRow label="Frontend Origin" value={report.externalExportContract.frontendOrigin} />
              <LayerRow label="API Base" value={report.externalExportContract.apiBase || '(relative proxy)'} />
              <LayerRow label="Environment Mode" value={report.externalExportContract.environmentMode} />
              <LayerRow label="Layer" value={report.externalExportContract.layer} />
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-lg border border-white/5 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Globe size={14} className="text-blue-400" />
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white">Checks</p>
                </div>
                <div className="space-y-2 text-[10px] font-semibold text-slate-300">
                  <p>Manifest: <span className="font-black">{report.externalExportContract.manifest.verdict}</span> — {report.externalExportContract.manifest.message}</p>
                  <p>CSV Download: <span className="font-black">{report.externalExportContract.csvDownload.verdict}</span> — {report.externalExportContract.csvDownload.message}</p>
                  <p>Headers: <span className="font-black">{report.externalExportContract.headers.verdict}</span> — {report.externalExportContract.headers.message}</p>
                  <p>Filename: <span className="font-black">{report.externalExportContract.filename.verdict}</span> — {report.externalExportContract.filename.message}</p>
                  <p>Import Preview: <span className="font-black">{report.externalExportContract.importPreview.verdict}</span> — {report.externalExportContract.importPreview.message}</p>
                </div>
              </div>

              <div className="rounded-lg border border-white/5 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  {report.externalExportContract.status === 'FAIL' ? <ShieldAlert size={14} className="text-rose-400" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white">Verdict</p>
                </div>
                <div className="space-y-3 text-[10px] font-semibold text-slate-300">
                  <p>{report.externalExportContract.explanation}</p>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Recommended Fix</p>
                    <p className="mt-1">{report.externalExportContract.recommendedFix}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <Wrench size={12} />
                    redirect detected: {report.externalExportContract.redirectDetected ? 'yes' : 'no'} | headers readable: {report.externalExportContract.headersReadable ? 'yes' : 'no'} | manifest fallback used: {report.externalExportContract.manifestFallbackUsed ? 'yes' : 'no'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <LayerRow label="Manifest URL" value={formatDiagnosticUrlForDisplay(report.externalExportContract.manifestUrl)} />
              <LayerRow label="CSV URL" value={formatDiagnosticUrlForDisplay(report.externalExportContract.csvUrl)} />
              <LayerRow label="Manifest Transport" value={report.externalExportContract.transport.manifest.explanation} />
              <LayerRow label="CSV Transport" value={report.externalExportContract.transport.csv.explanation} />
              <LayerRow label="Preview URL" value={formatDiagnosticUrlForDisplay(report.externalExportContract.previewUrl)} />
              <LayerRow label="Filename" value={report.externalExportContract.filenameValue || 'missing'} />
              <LayerRow label="Schema Version" value={report.externalExportContract.schemaVersion || 'missing'} />
              <LayerRow label="Profile" value={report.externalExportContract.profile || 'missing'} />
              <LayerRow label="Expose Headers" value={report.externalExportContract.exposeHeadersValue || 'missing'} />
              <LayerRow label="Manifest Status" value={String(report.externalExportContract.statusCodes.manifest)} />
              <LayerRow label="CSV Status" value={String(report.externalExportContract.statusCodes.csv)} />
              <LayerRow label="Preview Status" value={String(report.externalExportContract.statusCodes.preview)} />
            </div>

            <DiagnosticCardSection card={report.transportRisk} />

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
              Run All Checks to capture the browser-runtime deployment diagnostics report.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
