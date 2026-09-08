/**
 * Candidate-local PV1 performance instrumentation.
 *
 * Metrics remain in memory and are intentionally limited to timings, route
 * classes, status classes, and viewport class. No request payload, response
 * body, user/tenant identifier, title, or free-form text is collected.
 */

export type PV1PerformanceMetric = {
  kind: 'web_vital' | 'route' | 'command'
  name: string
  value_ms: number
  route_class?: string
  status_class?: string
  viewport_class: 'mobile' | 'desktop'
  at_ms: number
}

const metrics: PV1PerformanceMetric[] = []
const MAX_METRICS = 500
let initialized = false

const viewportClass = (): 'mobile' | 'desktop' => (
  typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'
)

const pushMetric = (metric: Omit<PV1PerformanceMetric, 'viewport_class' | 'at_ms'>) => {
  metrics.push({ ...metric, viewport_class: viewportClass(), at_ms: performance.now() })
  if (metrics.length > MAX_METRICS) metrics.splice(0, metrics.length - MAX_METRICS)
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

export const recordApiTiming = (url: string, method: string, valueMs: number, status?: number) => {
  const kind = method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD' ? 'route' : 'command'
  pushMetric({
    kind,
    name: kind === 'command' ? 'command_ack' : 'route_request',
    value_ms: Math.max(0, valueMs),
    route_class: routeClass(url),
    status_class: status == null ? 'network_error' : `${Math.floor(status / 100)}xx`,
  })
}

export const readPV1PerformanceMetrics = (): PV1PerformanceMetric[] => metrics.map((metric) => ({ ...metric }))

export const initializePV1PerformanceInstrumentation = () => {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  const observer = typeof PerformanceObserver === 'undefined' ? null : new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        pushMetric({ kind: 'web_vital', name: 'LCP', value_ms: entry.startTime })
      } else if (entry.entryType === 'layout-shift' && !(entry as LayoutShiftEntry).hadRecentInput) {
        pushMetric({ kind: 'web_vital', name: 'CLS', value_ms: (entry as LayoutShiftEntry).value * 1000 })
      } else if (entry.entryType === 'event') {
        pushMetric({ kind: 'web_vital', name: 'INP', value_ms: entry.duration })
      }
    }
  })
  try { observer?.observe({ type: 'largest-contentful-paint', buffered: true }) } catch { /* unsupported entry type */ }
  try { observer?.observe({ type: 'layout-shift', buffered: true }) } catch { /* unsupported entry type */ }
  try { observer?.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit) } catch { /* unsupported entry type */ }
}

type LayoutShiftEntry = PerformanceEntry & { value: number; hadRecentInput: boolean }
