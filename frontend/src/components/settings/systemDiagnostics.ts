import metadata from '../../metadata.json'
import { getApiBaseUrl } from '../../api/apiClient'
import {
  formatDiagnosticUrlForDisplay,
  runExternalExportContractCheck,
  type DiagnosticVerdict,
  type ExternalExportContractResult,
} from './externalExportDiagnostics'

export interface SystemDiagnosticCard {
  title: string
  status: DiagnosticVerdict
  layer: string
  explanation: string
  recommendedFix: string
  details: Array<{ label: string; value: string }>
}

export interface SystemDiagnosticsReport {
  generatedAt: string
  frontendOrigin: string
  apiBase: string
  environmentMode: string
  environmentSummary: SystemDiagnosticCard
  backendReachability: SystemDiagnosticCard
  externalExportContract: ExternalExportContractResult
  transportRisk: SystemDiagnosticCard
  fullReportText: string
}

type RuntimeRequestOptions = {
  fetchImpl?: typeof fetch
  frontendOrigin?: string
  apiBase?: string
}

type JsonProbe = {
  ok: boolean
  status: number | 'NETWORK_ERROR'
  redirected: boolean
  finalUrl: string
  contentType: string | null
  json: any | null
  text: string | null
  error?: string
}

function normalizeContentType(contentType: string | null | undefined) {
  return (contentType || '').split(';')[0]?.trim().toLowerCase() || null
}

function normalizeApiBase(url: string) {
  return (url || '').trim().replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '')
}

function inferEnvironmentMode(frontendOrigin: string, apiBase: string) {
  if (!apiBase) return 'same-origin relative proxy'
  try {
    const apiUrl = new URL(apiBase, frontendOrigin)
    if (apiUrl.origin === frontendOrigin) return 'same-origin deployed/company domain'
    const isLocalFrontend = /^(localhost|127\.0\.0\.1)$/i.test(new URL(frontendOrigin).hostname)
    const isLocalApi = /^(localhost|127\.0\.0\.1)$/i.test(apiUrl.hostname)
    if (isLocalFrontend && isLocalApi) return 'local direct backend'
    return 'cross-origin company-domain proxy'
  } catch {
    return 'custom runtime'
  }
}

function isLikelyForwardedHost(hostname: string): boolean {
  return !/^(127\.0\.0\.1|localhost)$/i.test(hostname) && hostname.includes('.')
}

function isLoopbackOrigin(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(normalizeApiBase(url))
}

function validateApiBase(url: string) {
  if (!url) return null
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return null
  return `Configured API base "${url}" is invalid. Use the backend origin only, or leave it blank for same-origin routing.`
}

function detectAuthRedirect(result: JsonProbe) {
  const finalUrl = (result.finalUrl || '').toLowerCase()
  const body = (result.text || '').toLowerCase()
  return result.redirected && /oauth|gitlab|signin|sign-in|login/.test(`${finalUrl} ${body}`)
}

async function probeJson(url: string, options: RequestInit = {}, runtime: Required<RuntimeRequestOptions>): Promise<JsonProbe> {
  try {
    const response = await (runtime.fetchImpl || fetch)(url, {
      cache: 'no-store',
      redirect: 'follow',
      credentials: new URL(url, runtime.frontendOrigin).origin === runtime.frontendOrigin ? 'same-origin' : 'include',
      ...options,
    })
    const contentType = normalizeContentType(response.headers.get('content-type'))
    const text = await response.clone().text()
    let json: any = null
    if (contentType === 'application/json' || text.trim().startsWith('{')) {
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        json = null
      }
    }
    return {
      ok: response.ok,
      status: response.status,
      redirected: response.redirected,
      finalUrl: response.url || url,
      contentType,
      json,
      text,
    }
  } catch (error: any) {
    return {
      ok: false,
      status: 'NETWORK_ERROR',
      redirected: false,
      finalUrl: url,
      contentType: null,
      json: null,
      text: null,
      error: error?.message || 'Network request failed.',
    }
  }
}

function buildCard(
  title: string,
  status: DiagnosticVerdict,
  layer: string,
  explanation: string,
  recommendedFix: string,
  details: SystemDiagnosticCard['details'],
): SystemDiagnosticCard {
  return { title, status, layer, explanation, recommendedFix, details }
}

export function formatSystemDiagnosticsReport(report: SystemDiagnosticsReport) {
  const cardLines = (card: SystemDiagnosticCard) => [
    `${card.title}: ${card.status}`,
    `Layer: ${card.layer}`,
    `Explanation: ${card.explanation}`,
    `Recommended Fix: ${card.recommendedFix}`,
    ...card.details.map((detail) => `${detail.label}: ${detail.value}`),
    '',
  ]

  return [
    `System Diagnostics Generated At: ${report.generatedAt}`,
    `Frontend Origin: ${report.frontendOrigin}`,
    `API Base: ${report.apiBase || '(relative proxy)'}`,
    `Environment Mode: ${report.environmentMode}`,
    '',
    ...cardLines(report.environmentSummary),
    ...cardLines(report.backendReachability),
    ...cardLines(report.transportRisk),
    report.externalExportContract.reportText,
  ].join('\n')
}

export async function runSystemDiagnostics(options: RuntimeRequestOptions = {}): Promise<SystemDiagnosticsReport> {
  const frontendOrigin = options.frontendOrigin || window.location.origin
  const apiBase = normalizeApiBase(options.apiBase ?? getApiBaseUrl())
  const runtime = {
    fetchImpl: options.fetchImpl || fetch,
    frontendOrigin,
    apiBase,
  }
  const environmentMode = inferEnvironmentMode(frontendOrigin, apiBase)
  const readinessUrl = new URL('/api/v1/readiness', apiBase || frontendOrigin).toString()
  const startupCheckUrl = new URL('/api/v1/settings/startup-check', apiBase || frontendOrigin).toString()

  const [readiness, startupCheck, externalExportContract] = await Promise.all([
    probeJson(readinessUrl, { method: 'GET' }, runtime),
    probeJson(startupCheckUrl, { method: 'GET' }, runtime),
    runExternalExportContractCheck(options),
  ])

  const rawApiBaseIssue = validateApiBase(apiBase)
  const frontendHostedAgainstLoopback = Boolean(apiBase) && isLikelyForwardedHost(window.location.hostname) && isLoopbackOrigin(apiBase)
  const frontendVersionHint = startupCheck.json?.runtime?.frontend_build_version_hint || readiness.json?.frontend_build_version_hint || null
  const staleFrontendRisk = frontendVersionHint && frontendVersionHint !== metadata.version

  const environmentStatus: DiagnosticVerdict =
    rawApiBaseIssue || frontendHostedAgainstLoopback
      ? 'FAIL'
      : staleFrontendRisk
        ? 'PARTIAL'
        : !apiBase
          ? 'PARTIAL'
          : 'PASS'
  const environmentLayer =
    rawApiBaseIssue
      ? 'API base URL'
      : frontendHostedAgainstLoopback
        ? 'Frontend origin mismatch'
        : staleFrontendRisk
          ? 'Stale frontend bundle risk'
          : !apiBase
            ? 'Same-origin runtime'
            : 'Runtime configuration'
  const environmentExplanation =
    rawApiBaseIssue ||
    (frontendHostedAgainstLoopback
      ? 'The frontend is running on a hosted or company origin, but the configured API base still points to a loopback address that only exists on the backend machine.'
      : staleFrontendRisk
        ? `Frontend bundle version ${metadata.version} does not match backend hint ${frontendVersionHint}.`
        : !apiBase
          ? 'API base URL is blank. This is acceptable only when the frontend reaches the backend on the same origin or a relative proxy path.'
          : 'Frontend origin and API base URL are internally consistent for the current runtime.')
  const environmentFix =
    rawApiBaseIssue ||
    (frontendHostedAgainstLoopback
      ? 'Set the API base to the reachable backend origin or company-routed proxy origin, not localhost or 127.0.0.1.'
      : staleFrontendRisk
        ? 'Redeploy the frontend and backend from the same build bundle, then hard refresh the browser.'
        : !apiBase
          ? 'Leave this blank only for same-origin deployments. For cross-origin deployments, set the backend origin explicitly.'
          : 'No fix required.')

  let backendReachability: SystemDiagnosticCard
  if (readiness.status === 'NETWORK_ERROR') {
    backendReachability = buildCard(
      'Backend Reachability',
      'FAIL',
      'Backend unreachable',
      `The readiness endpoint could not be reached from the browser runtime. ${readiness.error || ''}`.trim(),
      'Confirm backend routing, proxy forwarding, and CORS policy for the configured API base.',
      [
        { label: 'Readiness URL', value: formatDiagnosticUrlForDisplay(readinessUrl) },
        { label: 'Startup Check URL', value: formatDiagnosticUrlForDisplay(startupCheckUrl) },
      ],
    )
  } else if (detectAuthRedirect(readiness) || detectAuthRedirect(startupCheck)) {
    backendReachability = buildCard(
      'Backend Reachability',
      'FAIL',
      'Auth / proxy routing',
      'A backend JSON endpoint was redirected to OAuth or a login page before SysGrid returned JSON.',
      'Ensure the browser session can access backend API routes and that company routing preserves authenticated API access.',
      [
        { label: 'Readiness Status', value: String(readiness.status) },
        { label: 'Startup Check Status', value: String(startupCheck.status) },
      ],
    )
  } else if (!readiness.ok || !readiness.json) {
    backendReachability = buildCard(
      'Backend Reachability',
      'FAIL',
      'Readiness endpoint',
      'The readiness endpoint did not return valid JSON from the actual browser runtime.',
      'Ensure `/api/v1/readiness` is reachable and returns JSON through the same route the browser uses.',
      [
        { label: 'Readiness Status', value: String(readiness.status) },
        { label: 'Readiness Content Type', value: readiness.contentType || 'missing' },
      ],
    )
  } else {
    const startupWarnings = Array.isArray(startupCheck.json?.warnings) ? startupCheck.json.warnings : []
    backendReachability = buildCard(
      'Backend Reachability',
      startupWarnings.length ? 'PARTIAL' : 'PASS',
      startupWarnings.length ? 'Startup warnings' : 'Ready',
      startupWarnings.length
        ? startupWarnings[0]
        : 'Readiness and startup-check returned valid JSON from the configured backend runtime.',
      startupWarnings.length
        ? 'Resolve the startup-check warning list before team pilot rollout.'
        : 'No fix required.',
      [
        { label: 'Readiness Status', value: String(readiness.status) },
        { label: 'Startup Check Status', value: String(startupCheck.status) },
        { label: 'Backend Mode', value: startupCheck.json?.runtime?.environment_mode || readiness.json?.environment_mode || 'unknown' },
        { label: 'External Schema Version', value: readiness.json?.import_export_contract?.external_schema_version || 'missing' },
      ],
    )
  }

  const transportStatus: DiagnosticVerdict =
    externalExportContract.wildcardExposeHeadersDetected
      ? 'FAIL'
      : externalExportContract.transport.manifest.likelyPreflight || externalExportContract.transport.csv.likelyPreflight
        ? 'PARTIAL'
        : 'PASS'
  const transportLayer =
    externalExportContract.wildcardExposeHeadersDetected
      ? 'CORS expose headers'
      : externalExportContract.transport.manifest.likelyPreflight || externalExportContract.transport.csv.likelyPreflight
        ? 'Cross-origin preflight risk'
        : 'Transport contract'
  const transportExplanation =
    externalExportContract.wildcardExposeHeadersDetected
      ? `The CSV response exposed headers with a wildcard value (${externalExportContract.exposeHeadersValue || '*'}) instead of an explicit header allowlist.`
      : externalExportContract.transport.manifest.likelyPreflight || externalExportContract.transport.csv.likelyPreflight
        ? 'Cross-origin export requests are likely to trigger OPTIONS preflight because custom identity headers are being sent.'
        : 'The export transport looks safe for the current runtime. No wildcard expose-header issue was detected and the request shape is simple enough for the current route.'
  const transportFix =
    externalExportContract.wildcardExposeHeadersDetected
      ? 'Return an explicit Access-Control-Expose-Headers allowlist from the backend or proxy instead of `*`.'
      : externalExportContract.transport.manifest.likelyPreflight || externalExportContract.transport.csv.likelyPreflight
        ? 'Prefer same-origin company routing when possible, or confirm proxy/CORS policy explicitly allows OPTIONS and the SysGrid identity headers.'
        : 'No fix required.'
  const transportRisk = buildCard(
    'Transport / Preflight Risk',
    transportStatus,
    transportLayer,
    transportExplanation,
    transportFix,
    [
      { label: 'Manifest Request', value: externalExportContract.transport.manifest.explanation },
      { label: 'CSV Request', value: externalExportContract.transport.csv.explanation },
      { label: 'Expose Headers', value: externalExportContract.exposeHeadersValue || 'missing' },
    ],
  )

  const report: SystemDiagnosticsReport = {
    generatedAt: new Date().toISOString(),
    frontendOrigin,
    apiBase,
    environmentMode,
    environmentSummary: buildCard(
      'Environment Summary',
      environmentStatus,
      environmentLayer,
      environmentExplanation,
      environmentFix,
      [
        { label: 'Frontend Origin', value: frontendOrigin },
        { label: 'API Base', value: apiBase || '(relative proxy)' },
        { label: 'Environment Mode', value: environmentMode },
        { label: 'Frontend Build Version', value: metadata.version },
        { label: 'Backend Frontend Version Hint', value: frontendVersionHint || 'unavailable' },
      ],
    ),
    backendReachability,
    externalExportContract,
    transportRisk,
    fullReportText: '',
  }
  report.fullReportText = formatSystemDiagnosticsReport(report)
  return report
}
