const UNSUPPORTED_BULK_ACTION_DETAIL = 'Unsupported bulk action'

export function monitoringSupportsRestorePurged(error: unknown): boolean {
  const detail = (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof (error as any).data?.detail === 'string'
      ? (error as any).data.detail
      : error instanceof Error
        ? error.message
        : ''
  ).trim()

  return detail !== UNSUPPORTED_BULK_ACTION_DETAIL
}
