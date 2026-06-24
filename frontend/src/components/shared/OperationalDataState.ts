export type OperationalDataState =
  | { kind: 'ready'; noRowsLabel: string }
  | { kind: 'loading'; noRowsLabel: string }
  | { kind: 'query-error'; noRowsLabel: string; title: string; description: string }
  | { kind: 'raw-empty'; noRowsLabel: string }
  | { kind: 'filtered-empty'; noRowsLabel: string }
  | { kind: 'active-empty'; noRowsLabel: string }
  | { kind: 'deleted-empty'; noRowsLabel: string }

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'string' && error.trim()) return error.trim()
  if (error && typeof error === 'object' && typeof (error as any).message === 'string' && (error as any).message.trim()) {
    return (error as any).message.trim()
  }
  return fallback
}

export function resolveOperationalDataState({
  loading,
  error,
  totalCount,
  tabCount,
  visibleCount,
  emptyLabel,
  filteredLabel,
  tabEmptyKind,
  tabEmptyLabel,
  errorTitle,
  errorDescription,
}: {
  loading: boolean
  error?: unknown
  totalCount: number
  tabCount: number
  visibleCount: number
  emptyLabel: string
  filteredLabel: string
  tabEmptyKind: 'active-empty' | 'deleted-empty'
  tabEmptyLabel: string
  errorTitle: string
  errorDescription: string
}): OperationalDataState {
  if (loading) return { kind: 'loading', noRowsLabel: emptyLabel }
  if (error) {
    return {
      kind: 'query-error',
      noRowsLabel: emptyLabel,
      title: errorTitle,
      description: getErrorMessage(error, errorDescription),
    }
  }
  if (totalCount === 0) return { kind: 'raw-empty', noRowsLabel: emptyLabel }
  if (tabCount === 0) {
    return { kind: tabEmptyKind, noRowsLabel: tabEmptyLabel }
  }
  if (visibleCount === 0) return { kind: 'filtered-empty', noRowsLabel: filteredLabel }
  return { kind: 'ready', noRowsLabel: emptyLabel }
}
