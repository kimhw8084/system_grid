export type BootstrapFailureCode =
  | 'invalid_host'
  | 'mixed_content'
  | 'cors_or_network'
  | 'auth_redirect'
  | 'loopback_mismatch'
  | 'invalid_api_base'
  | 'wrong_api_path'
  | 'wrong_content'
  | 'backend_unavailable'
  | 'forbidden'
  | 'not_found'
  | 'unknown'

export interface BootstrapFailureContext {
  error: any
  configuredApiBase: string
  uiOrigin: string
  effectiveUserId: string
  storedOverride?: string
  backendDiagnostics?: any
}

export interface BootstrapFailureDiagnosis {
  code: BootstrapFailureCode
  title: string
  summary: string
  reasons: string[]
  actions: string[]
  fixCommand: string
  healthUrl: string
  buganizerUrl: string
  diagnostics: Record<string, string>
}

const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [/(authorization\s*[:=]\s*)([^\s,;]+)/gi, '$1<redacted>'],
  [/(access[_-]?token\s*[:=]\s*)([^\s,;]+)/gi, '$1<redacted>'],
  [/(api[_-]?key\s*[:=]\s*)([^\s,;]+)/gi, '$1<redacted>'],
  [/(password\s*[:=]\s*)([^\s,;]+)/gi, '$1<redacted>'],
  [/(token=)[^&\s]+/gi, '$1<redacted>'],
]

export function normalizeUiOrigin(value: string): string {
  return String(value || '').trim().replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '')
}

function safeUrl(value: string, base?: string): URL | null {
  try {
    return new URL(value, base || window.location.origin)
  } catch {
    return null
  }
}

function sanitizeUrl(value: string): string {
  if (!value || value.startsWith('<')) return value
  const parsed = safeUrl(value)
  if (!parsed) return redactText(value)
  parsed.username = ''
  parsed.password = ''
  for (const key of Array.from(parsed.searchParams.keys())) {
    if (/token|key|secret|password|auth|session/i.test(key)) {
      parsed.searchParams.set(key, '<redacted>')
    }
  }
  return parsed.toString().replace(/\/$/, '')
}

export function redactText(value: string): string {
  let redacted = String(value || '')
  REDACTION_PATTERNS.forEach(([pattern, replacement]) => {
    redacted = redacted.replace(pattern, replacement)
  })
  return redacted.slice(0, 12000)
}

function messageIncludes(error: any, pattern: RegExp): boolean {
  return pattern.test(
    [
      error?.message,
      error?.rawBody,
      error?.data?.detail,
      error?.data?.raw,
      error?.statusText,
      error?.finalUrl,
      error?.url,
    ].filter(Boolean).join(' '),
  )
}

function configuredBuganizerUrl(): string {
  const value =
    localStorage.getItem('SYSGRID_BUGANIZER_URL') ||
    localStorage.getItem('SYSGRID_CONFIG_VITE_BUGANIZER_URL') ||
    String(import.meta.env.VITE_BUGANIZER_URL || '')
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) return ''
  return sanitizeUrl(trimmed)
}

function buildFixCommand(apiBase: string, uiOrigin: string): string {
  if (!apiBase || !uiOrigin || apiBase === '<blank>' || uiOrigin === '<blank>') return ''
  return [
    './scripts/start-local.sh',
    `  --api-base-url ${JSON.stringify(apiBase)}`,
    `  --frontend-origin ${JSON.stringify(uiOrigin)}`,
    '  --user-id-env-var <your-user-id-environment-variable>',
    '  --skip-typecheck',
  ].join(' \\\n')
}

export function buildBootstrapFailureDiagnosis(context: BootstrapFailureContext): BootstrapFailureDiagnosis {
  const error = context.error || {}
  const apiBase = normalizeUiOrigin(context.configuredApiBase)
  const uiOrigin = normalizeUiOrigin(context.uiOrigin)
  const failedUrl = normalizeUiOrigin(error.finalUrl || error.url || apiBase)
  const healthUrl = apiBase ? `${apiBase}/api/v1/health` : `${uiOrigin}/api/v1/health`
  const apiUrl = safeUrl(apiBase || failedUrl, uiOrigin)
  const uiUrl = safeUrl(uiOrigin)
  const status = Number(error.status || 0)
  const contentType = String(error.contentType || error.responseContentType || '')
  const redirected = Boolean(error.redirected)
  const finalUrl = String(error.finalUrl || error.url || failedUrl || '')
  const requestId = String(error.requestId || error.data?.request_id || '')
  const storedOverride = String(context.storedOverride || '')
  const usesLoopbackApi = Boolean(apiUrl && /^(127\.0\.0\.1|localhost)$/i.test(apiUrl.hostname))
  const forwardedUi = Boolean(uiUrl && !/^(127\.0\.0\.1|localhost)$/i.test(uiUrl.hostname) && uiUrl.hostname.includes('.'))
  const mixedContent = Boolean(uiUrl && apiUrl && uiUrl.protocol === 'https:' && apiUrl.protocol === 'http:')
  const includesApiV1 = /\/api\/v1\/?$/i.test(context.configuredApiBase || '')
  const fixCommand = buildFixCommand(apiBase, uiOrigin)
  const reasons: string[] = []
  const actions: string[] = []

  let code: BootstrapFailureCode = 'unknown'
  let title = 'Backend bootstrap failed'
  let summary = 'SysGrid could not establish a valid backend, identity, and tenant contract.'

  if (messageIncludes(error, /invalid host header/i)) {
    code = 'invalid_host'
    title = 'Backend rejected the configured host'
    summary = `The request reached the backend process, but TrustedHostMiddleware rejected ${apiUrl?.hostname || 'the configured API hostname'} before the health or bootstrap route ran.`
    reasons.push(`The API hostname ${apiUrl?.hostname || '<unknown>'} is missing from the backend ALLOWED_HOSTS contract.`)
    actions.push('Restart with scripts/start-local.sh. The script now derives the API hostname from --api-base-url and merges it into ALLOWED_HOSTS automatically.')
    actions.push(`For a custom backend launch, add ${apiUrl?.hostname || '<api-host>'} to ALLOWED_HOSTS and restart the backend.`)
    actions.push(`Keep BACKEND_CORS_ORIGINS aligned with ${uiOrigin || '<frontend-origin>'}.`)
  } else if (mixedContent) {
    code = 'mixed_content'
    title = 'Browser blocked mixed-content API access'
    summary = 'An HTTPS frontend cannot call an HTTP backend origin.'
    reasons.push(`Frontend scheme is ${uiUrl?.protocol} while API scheme is ${apiUrl?.protocol}.`)
    actions.push('Use the exact HTTPS forwarded API origin shown by the development environment.')
    actions.push('Run both frontend and API over HTTP only when the environment itself exposes both over HTTP.')
  } else if (forwardedUi && usesLoopbackApi) {
    code = 'loopback_mismatch'
    title = 'Forwarded frontend is targeting a loopback API'
    summary = 'The browser is running on a hosted origin but the API base still points to the browser machine-local loopback address.'
    reasons.push('127.0.0.1 and localhost are resolved by the browser device, not by the remote development workspace.')
    actions.push('Set --api-base-url to the forwarded backend origin.')
    actions.push('Clear a stale SYSGRID_OVERRIDE_API_URL and retry.')
  } else if (includesApiV1 || messageIncludes(error, /configured api base .* invalid|origin only/i)) {
    code = 'invalid_api_base'
    title = 'Configured API base is invalid'
    summary = 'SysGrid expects the backend origin only, without /api/v1 or another path.'
    reasons.push(`Configured API base: ${apiBase || '<blank>'}.`)
    actions.push('Use an origin such as https://backend.example.com, without /api/v1.')
  } else if (redirected && /oauth|gitlab|signin|sign-in|login/i.test(finalUrl)) {
    code = 'auth_redirect'
    title = 'Backend request was redirected to authentication'
    summary = 'The forwarded port or company proxy redirected the JSON request to a login flow.'
    reasons.push(`Final response URL: ${sanitizeUrl(finalUrl)}.`)
    actions.push('Open the backend health URL in the same browser and complete the environment login.')
    actions.push('Confirm the forwarded API port is visible to the same audience as the frontend port.')
  } else if (status === 400 && messageIncludes(error, /host/i)) {
    code = 'invalid_host'
    title = 'Backend host policy rejected the request'
    summary = 'The backend returned HTTP 400 before normal API processing.'
    reasons.push(redactText(error.rawBody || error.message || 'Host validation failed.'))
    actions.push('Inspect ALLOWED_HOSTS and restart the backend.')
  } else if (status === 403) {
    code = 'forbidden'
    title = 'Backend rejected the current identity or tenant'
    summary = 'The backend is reachable, but the selected user or tenant is not authorized.'
    reasons.push(`Effective user: ${context.effectiveUserId || '<unknown>'}.`)
    actions.push('Verify the configured user-ID environment variable and selected tenant.')
    actions.push('For the disposable seed flow, make sure the effective user was included as an admin during seeding.')
  } else if (status === 404) {
    code = 'not_found'
    title = 'Configured API route was not found'
    summary = 'The target responded, but it does not expose the expected SysGrid bootstrap route.'
    reasons.push(`Failed URL: ${failedUrl || '<unknown>'}.`)
    actions.push('Verify that --api-base-url points to the backend origin and not the frontend origin.')
    actions.push('Remove /api/v1 from the configured API base.')
  } else if (status === 502 || status === 503 || status === 504) {
    code = 'backend_unavailable'
    title = 'Backend or forwarded tunnel is unavailable'
    summary = `The configured target returned HTTP ${status}.`
    reasons.push(redactText(error.rawBody || error.message || 'The proxy could not reach the backend process.'))
    actions.push('Confirm the backend process is running and the API port is forwarded.')
    actions.push('Open the health URL directly and inspect the forwarded-port status.')
  } else if (contentType.includes('text/html') || messageIncludes(error, /html where json was expected|non-json content/i)) {
    code = 'wrong_content'
    title = 'The API target returned a web page instead of JSON'
    summary = 'The configured URL likely points to a frontend fallback, login page, or unrelated proxy route.'
    reasons.push(`Content type: ${contentType || '<missing>'}.`)
    actions.push('Open the health URL directly and verify that it returns JSON.')
    actions.push('Confirm that the API base points to the backend port.')
  } else if (status === 0 || messageIncludes(error, /failed to fetch|networkerror|load failed/i)) {
    code = 'cors_or_network'
    title = 'Browser could not receive an API response'
    summary = 'The request was blocked or interrupted before an HTTP response was available.'
    reasons.push('Likely causes include CORS rejection, forwarded-port authentication, DNS, TLS, or a stopped backend.')
    actions.push(`Verify that BACKEND_CORS_ORIGINS includes ${uiOrigin || '<frontend-origin>'}.`)
    actions.push('Open the health URL directly in the browser.')
    actions.push('Check the browser Network and Console panels for CORS or certificate details.')
  } else {
    reasons.push(redactText(error.message || 'The frontend could not complete bootstrap against the configured backend target.'))
    actions.push('Open the health URL directly and verify that it returns SysGrid JSON.')
    actions.push('Use Copy Diagnostics and attach the sanitized report to Buganizer.')
  }

  if (storedOverride) {
    reasons.push('A stored API override is active and may point to an older backend.')
    actions.push('Use Clear Overrides & Retry after confirming the intended backend origin.')
  }

  return {
    code,
    title,
    summary,
    reasons,
    actions,
    fixCommand,
    healthUrl: sanitizeUrl(healthUrl),
    buganizerUrl: configuredBuganizerUrl(),
    diagnostics: {
      classification: code,
      timestamp: String(error.timestamp || new Date().toISOString()),
      uiOrigin: sanitizeUrl(uiOrigin || '<blank>'),
      configuredApiBase: sanitizeUrl(apiBase || '<blank>'),
      failedUrl: sanitizeUrl(failedUrl || '<blank>'),
      finalUrl: sanitizeUrl(finalUrl || '<blank>'),
      storedOverride: sanitizeUrl(storedOverride || '<none>'),
      effectiveUserId: redactText(context.effectiveUserId || '<unknown>'),
      method: String(error.method || 'GET'),
      status: status ? `${status} ${error.statusText || ''}`.trim() : '<no HTTP response>',
      contentType: contentType || '<missing>',
      redirected: redirected ? 'yes' : 'no',
      requestId: redactText(requestId || '<missing>'),
      browserOnline: typeof navigator === 'undefined' ? '<unknown>' : (navigator.onLine ? 'yes' : 'no'),
      rawBody: redactText(error.rawBody || error.data?.raw || error.data?.detail || '<empty>'),
    },
  }
}

export function buildBootstrapReport(diagnosis: BootstrapFailureDiagnosis): string {
  const diagnosticLines = Object.entries(diagnosis.diagnostics)
    .map(([key, value]) => `${key}: ${redactText(value)}`)
    .join('\n')
  return redactText([
    'SysGrid bootstrap failure',
    `Title: ${diagnosis.title}`,
    `Classification: ${diagnosis.code}`,
    `Summary: ${diagnosis.summary}`,
    '',
    'Likely causes:',
    ...diagnosis.reasons.map((item, index) => `${index + 1}. ${item}`),
    '',
    'Recommended actions:',
    ...diagnosis.actions.map((item, index) => `${index + 1}. ${item}`),
    diagnosis.fixCommand ? `\nSuggested command:\n${diagnosis.fixCommand}` : '',
    '',
    'Diagnostics:',
    diagnosticLines,
  ].filter(Boolean).join('\n'))
}
