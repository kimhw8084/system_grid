import { useCallback, useEffect, useState } from 'react'
import { applyOperationalColumnState, getOperationalColumnLayoutSnapshot } from './OperationalGridSizing'

const layoutsEqual = (left: any[], right: any[]) => {
  if (left === right) return true
  if (left.length !== right.length) return false

  return left.every((column, index) => {
    const other = right[index]
    return column?.colId === other?.colId &&
      column?.hide === other?.hide &&
      column?.pinned === other?.pinned &&
      column?.sort === other?.sort &&
      column?.sortIndex === other?.sortIndex &&
      column?.width === other?.width &&
      column?.flex === other?.flex
  })
}

export function usePersistentJsonState<T>(
  storageKey: string,
  fallback: T | (() => T)
) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return typeof fallback === 'function' ? (fallback as () => T)() : fallback
    }
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw == null) {
        return typeof fallback === 'function' ? (fallback as () => T)() : fallback
      }
      return JSON.parse(raw) as T
    } catch {
      return typeof fallback === 'function' ? (fallback as () => T)() : fallback
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(value))
  }, [storageKey, value])

  return [value, setValue] as const
}

export function useWorkspaceSessionValue<T>(
  sessionKey: string,
  initialValue: T,
  nextValueFactory: () => T
) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return nextValueFactory()
    const isFirstLoad = !window.sessionStorage.getItem(sessionKey)
    if (isFirstLoad) {
      window.sessionStorage.setItem(sessionKey, 'true')
      return initialValue
    }
    return nextValueFactory()
  })

  return [value, setValue] as const
}

export function useWorkspaceDismissHandlers({
  active,
  onDismiss,
  shouldDismiss,
}: {
  active: boolean
  onDismiss: () => void
  shouldDismiss: (target: HTMLElement) => boolean
}) {
  useEffect(() => {
    if (!active) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target && shouldDismiss(target)) onDismiss()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }

    document.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [active, onDismiss, shouldDismiss])
}

export function useOperationalGridLayout(
  initialLayout: any[],
  hasSavedViewWidths: boolean
) {
  const [columnLayoutState, setColumnLayoutState] = useState<any[]>(initialLayout)
  const [hasManualColumnWidths, setHasManualColumnWidths] = useState(false)

  const preserveExplicitColumnWidths = Boolean((hasSavedViewWidths || hasManualColumnWidths) && columnLayoutState.length)

  const syncColumnLayoutState = useCallback((api: any, preserveWidths: boolean = preserveExplicitColumnWidths) => {
    const nextLayout = getOperationalColumnLayoutSnapshot(api, preserveWidths)
    if (!nextLayout.length) return
    setColumnLayoutState((current) => (layoutsEqual(current, nextLayout) ? current : nextLayout))
  }, [preserveExplicitColumnWidths])

  const applyColumnLayoutState = useCallback((
    api: any,
    layout: any[] = columnLayoutState,
    preserveWidths: boolean = preserveExplicitColumnWidths
  ) => {
    applyOperationalColumnState(api, layout, preserveWidths)
  }, [columnLayoutState, preserveExplicitColumnWidths])

  const handleColumnResized = useCallback((event: any) => {
    if (!event.finished) return
    const source = event.source || ''
    if (typeof window !== 'undefined') {
      ;(window as any).__DEBUG_LAST_RESIZE_SOURCE__ = source
      ;(window as any).__DEBUG_LAST_RESIZE_STATE__ = event.api?.getColumnState?.() || []
    }
    const nextState = event.api?.getColumnState?.() || []
    const previousState = columnLayoutState || []
    const previousWidths = new Map(previousState.map((column: any) => [column.colId, column.width]))
    const changedColumns = nextState.filter((column: any) => previousWidths.get(column.colId) !== column.width)
    const widthChanged = changedColumns.length > 0
    const isAutoResizeSource =
      source === 'autosizeColumns' ||
      source === 'sizeColumnsToFit' ||
      source === 'api' ||
      source === 'flex'

    if (!isAutoResizeSource) {
      const isAccidentalResize = !widthChanged || changedColumns.length !== 1 || changedColumns.some((column: any) => {
        const previousWidth = previousWidths.get(column.colId)
        return previousWidth == null || column.width == null || Math.abs(column.width - previousWidth) <= 1
      })
      if (isAccidentalResize) {
        applyColumnLayoutState(event.api, previousState, true)
        return
      }
      setHasManualColumnWidths(true)
      syncColumnLayoutState(event.api, true)
      return
    }
    syncColumnLayoutState(event.api, false)
  }, [applyColumnLayoutState, columnLayoutState, syncColumnLayoutState])

  const setTransientManualColumnWidths = useCallback((value: boolean) => {
    setHasManualColumnWidths(value)
  }, [])

  return {
    columnLayoutState,
    setColumnLayoutState,
    hasManualColumnWidths,
    setTransientManualColumnWidths,
    preserveExplicitColumnWidths,
    syncColumnLayoutState,
    applyColumnLayoutState,
    handleColumnResized,
  }
}
