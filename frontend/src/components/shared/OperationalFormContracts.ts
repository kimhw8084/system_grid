import { useCallback, useEffect, useRef, useState } from 'react'
import { isDeepEqual } from '../../utils/dataParsers'

export interface OperationalFormProps {
  onDirtyChange?: (isDirty: boolean) => void
  isDirty?: boolean
}

type ValueUpdater<T> = T | ((current: T) => T)

const resolveNextValue = <T,>(updater: ValueUpdater<T>, current: T) => (
  typeof updater === 'function'
    ? (updater as (value: T) => T)(current)
    : updater
)

export function useOperationalFormDirty<T>(
  initialValue: T,
  normalizeValue: (value: T) => T = (value) => value,
  onDirtyChange?: (isDirty: boolean) => void,
) {
  const normalizeRef = useRef(normalizeValue)
  normalizeRef.current = normalizeValue

  const [value, setValueState] = useState<T>(initialValue)
  const [isDirty, setIsDirtyState] = useState(false)
  const valueRef = useRef(value)
  valueRef.current = value

  const baselineRef = useRef<T>(normalizeValue(initialValue))
  const incomingBaselineRef = useRef<T>(baselineRef.current)
  const hasUserEditedRef = useRef(false)
  const forcedDirtyRef = useRef(false)
  const lastDirtyRef = useRef(false)
  const dirtyRef = useRef(false)

  const computeDirty = useCallback((nextValue: T) => {
    const normalized = normalizeRef.current(nextValue)
    return forcedDirtyRef.current || (
      hasUserEditedRef.current &&
      !isDeepEqual(normalized, baselineRef.current)
    )
  }, [])

  const syncDirtyState = useCallback((nextValue: T) => {
    const nextDirty = computeDirty(nextValue)
    dirtyRef.current = nextDirty
    setIsDirtyState(nextDirty)
    if (lastDirtyRef.current !== nextDirty) {
      lastDirtyRef.current = nextDirty
      onDirtyChange?.(nextDirty)
    }
    return nextDirty
  }, [computeDirty, onDirtyChange])

  const updateValue = useCallback((updater: (current: T) => T) => {
    const currentValue = valueRef.current
    const nextValue = updater(currentValue)
    hasUserEditedRef.current = true
    forcedDirtyRef.current = false
    valueRef.current = nextValue
    setValueState(nextValue)
    syncDirtyState(nextValue)
    return nextValue
  }, [syncDirtyState])

  const setValue = useCallback((nextValue: T) => (
    updateValue(() => nextValue)
  ), [updateValue])

  const patchValue = useCallback((partial: Partial<T>) => (
    updateValue((current) => ({ ...current, ...partial }))
  ), [updateValue])

  const normalize = useCallback((nextValue: ValueUpdater<T>) => {
    const resolvedValue = resolveNextValue(nextValue, valueRef.current)
    valueRef.current = resolvedValue
    setValueState(resolvedValue)
    syncDirtyState(resolvedValue)
    return resolvedValue
  }, [syncDirtyState])

  const resetDirty = useCallback((nextBaseline?: T) => {
    const resolvedBaseline = normalizeRef.current(nextBaseline ?? valueRef.current)
    baselineRef.current = resolvedBaseline
    incomingBaselineRef.current = resolvedBaseline
    hasUserEditedRef.current = false
    forcedDirtyRef.current = false
    const nextValue = nextBaseline ?? valueRef.current
    valueRef.current = nextValue
    setValueState(nextValue)
    syncDirtyState(nextValue)
    return nextValue
  }, [syncDirtyState])

  const markDirty = useCallback(() => {
    hasUserEditedRef.current = true
    forcedDirtyRef.current = true
    syncDirtyState(valueRef.current)
  }, [syncDirtyState])

  const resolveIsDirty = useCallback(() => (
    syncDirtyState(valueRef.current)
  ), [syncDirtyState])

  useEffect(() => {
    const normalizedInitialValue = normalizeRef.current(initialValue)
    if (isDeepEqual(normalizedInitialValue, incomingBaselineRef.current)) return
    incomingBaselineRef.current = normalizedInitialValue
    baselineRef.current = normalizedInitialValue
    hasUserEditedRef.current = false
    forcedDirtyRef.current = false
    valueRef.current = initialValue
    setValueState(initialValue)
    syncDirtyState(initialValue)
  }, [initialValue, syncDirtyState])

  return {
    value,
    isDirty,
    setValue,
    patchValue,
    updateValue,
    normalize,
    resetDirty,
    resolveIsDirty,
    markDirty,
  }
}
