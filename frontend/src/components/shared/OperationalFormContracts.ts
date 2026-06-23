import { useState, useCallback, useRef, useMemo } from 'react'

export interface OperationalFormProps {
  isDirty: boolean
  resolveIsDirty?: () => boolean
  onDirtyChange?: (isDirty: boolean) => void
  dirtyConfirmTitle?: string
  dirtyConfirmMessage?: string
  dirtyConfirmText?: string
}

export function useOperationalFormDirty<T>(
  initialValue: T,
  normalize: (value: T) => T,
  onDirtyChange?: (isDirty: boolean) => void
) {
  const [value, setValue] = useState(initialValue)
  const [isDirty, setIsDirty] = useState(false)
  const initialRef = useRef(normalize(initialValue))
  const hasUserEditedRef = useRef(false)

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue)
    hasUserEditedRef.current = true
    const normalized = normalize(newValue)
    const dirty = JSON.stringify(normalized) !== JSON.stringify(initialRef.current)
    setIsDirty(dirty)
    onDirtyChange?.(dirty)
  }, [normalize, onDirtyChange])

  const resetDirty = useCallback((newInitialValue: T) => {
    initialRef.current = normalize(newInitialValue)
    hasUserEditedRef.current = false
    setIsDirty(false)
    onDirtyChange?.(false)
  }, [normalize, onDirtyChange])

  return { value, isDirty, updateValue, resetDirty }
}
