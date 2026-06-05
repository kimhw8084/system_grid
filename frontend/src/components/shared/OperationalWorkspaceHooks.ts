import { useEffect, useState } from 'react'

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
