import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyOperationalColumnState,
  getOperationalColumnLayoutSnapshot,
  isOperationalAutoResizeSource,
} from './OperationalGridSizing'

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

  const syncColumnLayoutState = useCallback((api: any, _preserveWidths: boolean = preserveExplicitColumnWidths) => {
    const nextLayout = getOperationalColumnLayoutSnapshot(api, true)
    if (!nextLayout.length) return
    setColumnLayoutState(nextLayout)
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
    const isAutoResizeSource = isOperationalAutoResizeSource(source)

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

export function useOperationalColumnSyncHandlers(
  syncColumnLayoutState: (api: any, preserveWidths?: boolean) => void,
  preserveWidths: boolean
) {
  const handleColumnMoved = useCallback((event: any) => {
    if (!event?.source?.includes?.('drag')) syncColumnLayoutState(event.api, preserveWidths)
  }, [preserveWidths, syncColumnLayoutState])

  const handleDragStopped = useCallback((event: any) => {
    syncColumnLayoutState(event.api, preserveWidths)
  }, [preserveWidths, syncColumnLayoutState])

  const handleColumnPinned = useCallback((event: any) => {
    syncColumnLayoutState(event.api, preserveWidths)
  }, [preserveWidths, syncColumnLayoutState])

  const handleColumnVisible = useCallback((event: any) => {
    syncColumnLayoutState(event.api, preserveWidths)
  }, [preserveWidths, syncColumnLayoutState])

  return {
    handleColumnMoved,
    handleDragStopped,
    handleColumnPinned,
    handleColumnVisible,
  }
}

export const OPERATIONAL_GRID_LAYOUT_POLICIES = {
  standard: {
    syncSortPreserveWidths: false,
    preserveMovedWidths: false,
  },
} as const

export type OperationalGridLayoutPolicy = typeof OPERATIONAL_GRID_LAYOUT_POLICIES[keyof typeof OPERATIONAL_GRID_LAYOUT_POLICIES]

export function useOperationalGridController({
  pendingGridRestore,
  applyGridState,
  columnLayoutState,
  preserveExplicitColumnWidths,
  applyColumnLayoutState,
  initialFilterModel,
  initialSortModel,
  setGridFilterModel,
  setGridSortModel,
  sanitizeFilterModel,
  sanitizeSortModel,
  syncColumnLayoutState,
  syncSortPreserveWidths = true,
  onGridApiReady,
}: {
  pendingGridRestore?: any | null
  applyGridState: (config: any) => void
  columnLayoutState: any[]
  preserveExplicitColumnWidths: boolean
  applyColumnLayoutState: (api: any, layout?: any[], preserveWidths?: boolean) => void
  initialFilterModel?: Record<string, any>
  initialSortModel?: Array<{ colId?: string; sort?: string }>
  setGridFilterModel: (value: any) => void
  setGridSortModel: (value: any) => void
  sanitizeFilterModel?: (model: any) => any
  sanitizeSortModel?: (model: any) => any
  syncColumnLayoutState: (api: any, preserveWidths?: boolean) => void
  syncSortPreserveWidths?: boolean
  onGridApiReady?: (params: any) => void
}) {
  const handleGridReady = useCallback((params: any) => {
    onGridApiReady?.(params)
    if (pendingGridRestore) {
      applyGridState(pendingGridRestore)
      return
    }
    if (!columnLayoutState.length) return
    applyColumnLayoutState(params.api, columnLayoutState, preserveExplicitColumnWidths)
    params.api.setFilterModel(initialFilterModel || {})
    params.api.applyColumnState({
      state: (initialSortModel || []).map((entry) => ({ colId: entry.colId, sort: entry.sort as 'asc' | 'desc' })),
      defaultState: { sort: null },
      applyOrder: false,
    })
  }, [
    applyColumnLayoutState,
    applyGridState,
    columnLayoutState,
    initialFilterModel,
    initialSortModel,
    onGridApiReady,
    pendingGridRestore,
    preserveExplicitColumnWidths,
  ])

  const handleFilterChanged = useCallback((event: any) => {
    const nextModel = event.api.getFilterModel() || {}
    setGridFilterModel(sanitizeFilterModel ? sanitizeFilterModel(nextModel) : nextModel)
  }, [sanitizeFilterModel, setGridFilterModel])

  const handleSortChanged = useCallback((event: any) => {
    const nextSortModel = event.columnApi.getColumnState()
      .filter((column: any) => column.sort === 'asc' || column.sort === 'desc')
      .map((column: any) => ({ colId: column.colId, sort: column.sort }))
    setGridSortModel(sanitizeSortModel ? sanitizeSortModel(nextSortModel) : nextSortModel)
    syncColumnLayoutState(event.api, syncSortPreserveWidths)
  }, [sanitizeSortModel, setGridSortModel, syncColumnLayoutState, syncSortPreserveWidths])

  return {
    handleGridReady,
    handleFilterChanged,
    handleSortChanged,
  }
}

export function useOperationalGridRuntime({
  initialColumnLayoutState,
  hasSavedViewWidths,
  pendingGridRestore,
  applyGridState,
  initialFilterModel,
  initialSortModel,
  setGridFilterModel,
  setGridSortModel,
  sanitizeFilterModel,
  sanitizeSortModel,
  layoutPolicy = OPERATIONAL_GRID_LAYOUT_POLICIES.standard,
  onGridApiReady,
  onBeforeManualResize,
}: {
  initialColumnLayoutState: any[]
  hasSavedViewWidths: boolean
  pendingGridRestore?: any | null
  applyGridState: (config: any) => void
  initialFilterModel?: Record<string, any>
  initialSortModel?: Array<{ colId?: string; sort?: string }>
  setGridFilterModel: (value: any) => void
  setGridSortModel: (value: any) => void
  sanitizeFilterModel?: (model: any) => any
  sanitizeSortModel?: (model: any) => any
  layoutPolicy?: OperationalGridLayoutPolicy
  onGridApiReady?: (params: any) => void
  onBeforeManualResize?: (event: any) => void
}) {
  const {
    columnLayoutState,
    setColumnLayoutState,
    hasManualColumnWidths,
    setTransientManualColumnWidths,
    preserveExplicitColumnWidths,
    syncColumnLayoutState,
    applyColumnLayoutState,
    handleColumnResized: handleBaseColumnResized,
  } = useOperationalGridLayout(initialColumnLayoutState, hasSavedViewWidths)

  const {
    handleColumnMoved,
    handleDragStopped,
    handleColumnPinned,
    handleColumnVisible,
  } = useOperationalColumnSyncHandlers(syncColumnLayoutState, layoutPolicy.preserveMovedWidths)

  const handleColumnResized = useCallback((event: any) => {
    if (!event?.finished) return
    if (!isOperationalAutoResizeSource(event?.source || '')) {
      onBeforeManualResize?.(event)
    }
    handleBaseColumnResized(event)
  }, [handleBaseColumnResized, onBeforeManualResize])

  const {
    handleGridReady,
    handleFilterChanged,
    handleSortChanged,
  } = useOperationalGridController({
    pendingGridRestore,
    applyGridState,
    columnLayoutState,
    preserveExplicitColumnWidths,
    applyColumnLayoutState,
    initialFilterModel,
    initialSortModel,
    setGridFilterModel,
    setGridSortModel,
    sanitizeFilterModel,
    sanitizeSortModel,
    syncColumnLayoutState,
    syncSortPreserveWidths: layoutPolicy.syncSortPreserveWidths,
    onGridApiReady,
  })

  return {
    columnLayoutState,
    setColumnLayoutState,
    hasManualColumnWidths,
    setTransientManualColumnWidths,
    preserveExplicitColumnWidths,
    syncColumnLayoutState,
    applyColumnLayoutState,
    handleColumnResized,
    handleColumnMoved,
    handleDragStopped,
    handleColumnPinned,
    handleColumnVisible,
    handleGridReady,
    handleFilterChanged,
    handleSortChanged,
  }
}

export function useOperationalDirtyGuard({
  active,
  isDirty,
  onDiscard,
}: {
  active: boolean
  isDirty: boolean
  onDiscard: () => void
}) {
  const pendingActionRef = useRef<(() => void) | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const requestDiscard = useCallback((action?: () => void) => {
    if (!active) return
    const nextAction = action || onDiscard
    if (!isDirty) {
      nextAction()
      return
    }
    pendingActionRef.current = nextAction
    setIsConfirmOpen(true)
  }, [active, isDirty, onDiscard])

  const confirmDiscard = useCallback(() => {
    const action = pendingActionRef.current || onDiscard
    pendingActionRef.current = null
    setIsConfirmOpen(false)
    action()
  }, [onDiscard])

  const cancelDiscard = useCallback(() => {
    pendingActionRef.current = null
    setIsConfirmOpen(false)
  }, [])

  useEffect(() => {
    if (!(active && isDirty)) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [active, isDirty])

  useEffect(() => {
    if (!(active && isDirty)) return
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const href = anchor.href
      if (!href || href === window.location.href) return
      event.preventDefault()
      requestDiscard(() => {
        window.location.assign(href)
      })
    }
    document.addEventListener('click', handleDocumentClick, true)
    return () => document.removeEventListener('click', handleDocumentClick, true)
  }, [active, isDirty, requestDiscard])

  return {
    requestDiscard,
    isConfirmOpen,
    confirmDiscard,
    cancelDiscard,
  }
}
