/**
 * Privacy-safe PV1 field instrumentation.
 *
 * Synthetic gate measurements remain separate artifacts. These metrics are
 * emitted only as bounded aggregates with candidate/release and route/workspace
 * attribution; no project, user, tenant, request body, or response content is
 * collected.
 */

export type PV1PerformanceMetric = {
  kind: 'web_vital' | 'route' | 'command'
  name: 'LCP' | 'INP' | 'CLS' | 'route_request' | 'command_ack'
  value: number
  value_ms?: number
  unit: 'ms' | 'ratio'
  route_class?: string
  workspace?: string
  status_class?: string
  command_id_present?: boolean
  projection_lag_ms?: number
  schedule_calculation_version?: string
  schedule_calculation_duration_ms?: number
  viewport_class: 'mobile' | 'desktop'
  candidate_sha256: string
  release: string
  measurement_boundary: 'field_page_lifecycle' | 'acknowledged_response'
  at_ms: number
}

type MetricInput = Omit<PV1PerformanceMetric, 'viewport_class' | 'candidate_sha256' | 'release' | 'at_ms'>
type ApiTimingDetails = {
  requestId?: string
  commandId?: string
  projectionLagMs?: number
  scheduleCalculationVersion?: string
  scheduleCalculationDurationMs?: number
}

const metrics: PV1PerformanceMetric[] = []
const MAX_METRICS = 500
let initialized = false
let clsValue = 0
const interactionDurations = new Map<number, number>()

const candidateSha = String(import.meta.env.VITE_PV1_CANDIDATE_SHA || 'unknown').toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 64) || 'unknown'
const release = String(import.meta.env.VITE_PV1_RELEASE || 'pv1').slice(0, 80)

const viewportClass = (): 'mobile' | 'desktop' => (
  typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'
)

const workspaceClass = (url: string): string => {
  const route = routeClass(url)
  if (route.startsWith('/projects') || route.includes('/projects/')) return 'projects'
  if (route.startsWith('/architecture') || route.startsWith('/models') || route.includes('/architecture/') || route.includes('/models/')) return 'architecture'
  if (route.startsWith('/settings')) return 'settings'
  return 'other'
}

const pushMetric = (metric: MetricInput) => {
  metrics.push({ ...metric, viewport_class: viewportClass(), candidate_sha256: candidateSha, release, at_ms: performance.now() })
  if (metrics.length > MAX_METRICS) metrics.splice(0, metrics.length - MAX_METRICS)
}

const replaceVital = (metric: MetricInput) => {
  for (let index = metrics.length - 1; index >= 0; index -= 1) {
    if (metrics[index].kind === 'web_vital' && metrics[index].name === metric.name) metrics.splice(index, 1)
  }
  pushMetric(metric)
}

export const routeClass = (url: string): string => {
  try {
    const pathname = new URL(url, typeof window === 'undefined' ? 'http://localhost' : window.location.origin).pathname
    return pathname
      .replace(/\/projects\/[^/]+/g, '/projects/:projectId')
      .replace(/\/models\/[^/]+/g, '/models/:modelId')
      .replace(/\/change-sets\/[^/]+/g, '/change-sets/:changeSetId')
  } catch {
    return 'unknown'
  }
}

export const recordApiTiming = (url: string, method: string, valueMs: number, status?: number, details: ApiTimingDetails = {}) => {
  const kind = method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD' ? 'route' : 'command'
  const projectionLagMs = Number.isFinite(details.projectionLagMs) ? Math.max(0, Number(details.projectionLagMs)) : undefined
  const scheduleDuration = Number.isFinite(details.scheduleCalculationDurationMs) ? Math.max(0, Number(details.scheduleCalculationDurationMs)) : undefined
  pushMetric({
    kind,
    name: kind === 'command' ? 'command_ack' : 'route_request',
    value: Math.max(0, valueMs),
    value_ms: Math.max(0, valueMs),
    unit: 'ms',
    route_class: routeClass(url),
    workspace: workspaceClass(url),
    status_class: status == null ? 'network_error' : `${Math.floor(status / 100)}xx`,
    command_id_present: Boolean(details.commandId),
    projection_lag_ms: projectionLagMs,
    schedule_calculation_version: details.scheduleCalculationVersion?.slice(0, 80),
    schedule_calculation_duration_ms: scheduleDuration,
    measurement_boundary: 'acknowledged_response',
  })
}

export const readPV1PerformanceMetrics = (): PV1PerformanceMetric[] => metrics.map((metric) => ({ ...metric }))

export const flushPV1PerformanceMetrics = () => {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function' || metrics.length === 0) return false
  const payload = JSON.stringify({
    schema: 'sysgrid.pv1.field-performance.v1',
    candidate_sha256: candidateSha,
    release,
    metrics: readPV1PerformanceMetrics(),
  })
  return navigator.sendBeacon('/api/v1/observability/performance', new Blob([payload], { type: 'application/json' }))
}

export const initializePV1PerformanceInstrumentation = () => {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  const observer = typeof PerformanceObserver === 'undefined' ? null : new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        replaceVital({ kind: 'web_vital', name: 'LCP', value: entry.startTime, value_ms: entry.startTime, unit: 'ms', measurement_boundary: 'field_page_lifecycle' })
      } else if (entry.entryType === 'layout-shift' && !(entry as LayoutShiftEntry).hadRecentInput) {
        clsValue += Math.max(0, (entry as LayoutShiftEntry).value)
        replaceVital({ kind: 'web_vital', name: 'CLS', value: clsValue, unit: 'ratio', measurement_boundary: 'field_page_lifecycle' })
      } else if (entry.entryType === 'event') {
        const event = entry as PerformanceEventTimingEntry
        if (event.interactionId) interactionDurations.set(event.interactionId, Math.max(interactionDurations.get(event.interactionId) || 0, event.duration))
        const inp = event.interactionId ? Math.max(...interactionDurations.values()) : event.duration
        replaceVital({ kind: 'web_vital', name: 'INP', value: inp, value_ms: inp, unit: 'ms', measurement_boundary: 'field_page_lifecycle' })
      }
    }
  })
  try { observer?.observe({ type: 'largest-contentful-paint', buffered: true }) } catch { /* unsupported entry type */ }
  try { observer?.observe({ type: 'layout-shift', buffered: true }) } catch { /* unsupported entry type */ }
  try { observer?.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit) } catch { /* unsupported entry type */ }
  window.addEventListener('pagehide', flushPV1PerformanceMetrics, { passive: true })
}

type LayoutShiftEntry = PerformanceEntry & { value: number; hadRecentInput: boolean }
type PerformanceEventTimingEntry = PerformanceEntry & { duration: number; interactionId?: number }
