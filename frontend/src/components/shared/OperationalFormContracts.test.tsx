import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useOperationalFormDirty } from './OperationalFormContracts'

describe('useOperationalFormDirty', () => {
  it('starts clean, marks changes dirty, and resets clean', () => {
    const onDirtyChange = vi.fn()
    const { result } = renderHook(() => useOperationalFormDirty(
      { name: 'Alpha', count: 1 },
      (value) => value,
      onDirtyChange,
    ))

    expect(result.current.isDirty).toBe(false)

    act(() => {
      result.current.patchValue({ name: 'Beta' })
    })

    expect(result.current.isDirty).toBe(true)
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)

    act(() => {
      result.current.resetDirty()
    })

    expect(result.current.isDirty).toBe(false)
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })

  it('treats normalized equivalent values as clean', () => {
    const { result } = renderHook(() => useOperationalFormDirty(
      { name: ' Alpha ' },
      (value) => ({ ...value, name: value.name.trim() }),
    ))

    act(() => {
      result.current.setValue({ name: 'Alpha' })
    })

    expect(result.current.isDirty).toBe(false)
    expect(result.current.resolveIsDirty()).toBe(false)
  })

  it('keeps mount normalization clean', () => {
    const { result } = renderHook(() => useOperationalFormDirty(
      { metadata_json: {} as Record<string, string> },
      (value) => value,
    ))

    act(() => {
      result.current.normalize({ metadata_json: { region: '' } })
    })

    expect(result.current.isDirty).toBe(false)
  })

  it('supports functional updates and baseline refresh', () => {
    const { result, rerender } = renderHook(
      ({ initialValue }) => useOperationalFormDirty(
        initialValue,
        (value) => value,
      ),
      {
        initialProps: {
          initialValue: { name: 'Alpha', count: 1 },
        },
      },
    )

    act(() => {
      result.current.updateValue((current) => ({ ...current, count: current.count + 1 }))
    })

    expect(result.current.isDirty).toBe(true)

    act(() => {
      result.current.resetDirty({ name: 'Beta', count: 2 })
    })

    expect(result.current.isDirty).toBe(false)
    expect(result.current.value).toEqual({ name: 'Beta', count: 2 })

    rerender({ initialValue: { name: 'Gamma', count: 3 } })

    expect(result.current.isDirty).toBe(false)
    expect(result.current.value).toEqual({ name: 'Gamma', count: 3 })
  })
})
