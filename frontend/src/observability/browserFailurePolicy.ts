export type BrowserRequestDescriptor = {
  method: string
  url: string
  resourceType?: string
}

/** Only the exact, privacy-safe telemetry endpoint may be absent in a test. */
export const isExpectedTelemetryRequest = ({ method, url, resourceType }: BrowserRequestDescriptor): boolean => {
  try {
    const parsed = new URL(url, 'http://localhost')
    return method.toUpperCase() === 'POST'
      && parsed.pathname === '/api/v1/observability/performance'
      && (resourceType == null || ['beacon', 'fetch', 'xhr'].includes(resourceType))
  } catch {
    return false
  }
}

export const isUnexpectedConsoleError = (_message: string): boolean => true
