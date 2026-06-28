import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  shouldIgnoreRowSelection,
  useOperationalGroupedSelection,
  useOperationalRowInteractions,
} from './OperationalGridInteractions'

describe('OperationalGridInteractions', () => {
  it('selects only the clicked row for a plain click', () => {
    const { result } = renderHook(() => useOperationalRowInteractions())
    const deselectAll = vi.fn()
    const setSelected = vi.fn()

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 4,
          isSelected: () => false,
          setSelected,
        },
        api: { deselectAll },
        event: { target: document.createElement('div') },
        data: { id: 41 },
      })
    })

    expect(deselectAll).toHaveBeenCalledTimes(1)
    expect(setSelected).toHaveBeenCalledWith(true)
  })

  it('toggles the clicked row for ctrl/meta selection', () => {
    const { result } = renderHook(() => useOperationalRowInteractions())
    const deselectAll = vi.fn()
    const setSelected = vi.fn()

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 2,
          isSelected: () => true,
          setSelected,
        },
        api: { deselectAll },
        event: { ctrlKey: true, target: document.createElement('div') },
        data: { id: 9 },
      })
    })

    expect(deselectAll).not.toHaveBeenCalled()
    expect(setSelected).toHaveBeenCalledWith(false)
  })

  it('selects a contiguous visible range for shift click', () => {
    const { result } = renderHook(() => useOperationalRowInteractions())
    const anchorSetSelected = vi.fn()

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 1,
          isSelected: () => false,
          setSelected: anchorSetSelected,
        },
        api: { deselectAll: vi.fn() },
        event: { target: document.createElement('div') },
        data: { id: 11 },
      })
    })

    const deselectAll = vi.fn()
    const nodes = [0, 1, 2, 3, 4].map((rowIndex) => ({
      rowIndex,
      data: { id: rowIndex + 100 },
      setSelected: vi.fn(),
    }))
    const forEachNodeAfterFilterAndSort = vi.fn((callback: (node: any) => void) => {
      nodes.forEach(callback)
    })

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 3,
          isSelected: () => false,
          setSelected: vi.fn(),
        },
        api: { deselectAll, forEachNodeAfterFilterAndSort },
        event: { shiftKey: true, target: document.createElement('div') },
        data: { id: 13 },
      })
    })

    expect(deselectAll).toHaveBeenCalledTimes(1)
    expect(forEachNodeAfterFilterAndSort).toHaveBeenCalledTimes(1)
    expect(nodes[0].setSelected).not.toHaveBeenCalled()
    expect(nodes[1].setSelected).toHaveBeenCalledWith(true)
    expect(nodes[2].setSelected).toHaveBeenCalledWith(true)
    expect(nodes[3].setSelected).toHaveBeenCalledWith(true)
    expect(nodes[4].setSelected).not.toHaveBeenCalled()
  })

  it('ignores interactive row targets', () => {
    const { result } = renderHook(() => useOperationalRowInteractions())
    const button = document.createElement('button')
    const deselectAll = vi.fn()
    const setSelected = vi.fn()

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 0,
          isSelected: () => false,
          setSelected,
        },
        api: { deselectAll },
        event: { target: button },
        data: { id: 17 },
      })
    })

    expect(shouldIgnoreRowSelection(button)).toBe(true)
    expect(deselectAll).not.toHaveBeenCalled()
    expect(setSelected).not.toHaveBeenCalled()
  })

  it('aggregates grouped selections across sections', () => {
    const setSelectedIds = vi.fn()
    const { result } = renderHook(() => useOperationalGroupedSelection({ setSelectedIds }))

    act(() => {
      result.current.handleSelectionChanged({
        api: {
          getSelectedNodes: () => [{ data: { id: 1 } }, { data: { id: 2 } }],
        },
      }, 'status:active')
    })

    act(() => {
      result.current.handleSelectionChanged({
        api: {
          getSelectedNodes: () => [{ data: { id: 3 } }],
        },
      }, 'environment:prod')
    })

    act(() => {
      result.current.handleSelectionChanged({
        api: {
          getSelectedNodes: () => [{ data: { id: 2 } }, { data: { id: 3 } }],
        },
      }, 'raw')
    })

    expect(setSelectedIds).toHaveBeenLastCalledWith([1, 2, 3])
  })

  it('resets the range anchor when the selection scope changes', () => {
    const { result, rerender } = renderHook(
      ({ selectionScopeKey }) => useOperationalRowInteractions({ selectionScopeKey }),
      { initialProps: { selectionScopeKey: 'active:raw:1,2,3' } }
    )

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 0,
          isSelected: () => false,
          setSelected: vi.fn(),
        },
        api: { deselectAll: vi.fn() },
        event: { target: document.createElement('div') },
        data: { id: 1 },
      })
    })

    rerender({ selectionScopeKey: 'deleted:raw:4,5,6' })

    const deselectAll = vi.fn()
    const forEachNodeAfterFilterAndSort = vi.fn()
    const setSelected = vi.fn()

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 2,
          isSelected: () => false,
          setSelected,
        },
        api: { deselectAll, forEachNodeAfterFilterAndSort },
        event: { shiftKey: true, target: document.createElement('div') },
        data: { id: 5 },
      })
    })

    expect(forEachNodeAfterFilterAndSort).not.toHaveBeenCalled()
    expect(deselectAll).toHaveBeenCalledTimes(1)
    expect(setSelected).toHaveBeenCalledWith(true)
  })
})
