import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  getVisibleLogicalRowIds,
  normalizeSelectedNodeIds,
  shouldIgnoreRowSelection,
  useOperationalGroupedSelection,
  useOperationalRowInteractions,
} from './OperationalGridInteractions'

describe('OperationalGridInteractions', () => {
  it('selects only the clicked row for a plain click', () => {
    const { result } = renderHook(() => useOperationalRowInteractions())
    const deselectAll = vi.fn()
    const targetSetSelected = vi.fn()
    const duplicateSetSelected = vi.fn()
    const otherSetSelected = vi.fn()
    const forEachNodeAfterFilterAndSort = vi.fn((callback: (node: any) => void) => {
      ;[
        { data: { id: 41 }, setSelected: targetSetSelected },
        { data: { id: 41 }, setSelected: duplicateSetSelected },
        { data: { id: 99 }, setSelected: otherSetSelected },
      ].forEach(callback)
    })

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 4,
          data: { id: 41 },
          isSelected: () => false,
          setSelected: targetSetSelected,
        },
        api: { deselectAll, forEachNodeAfterFilterAndSort },
        event: { target: document.createElement('div') },
        data: { id: 41 },
      })
    })

    expect(deselectAll).toHaveBeenCalledTimes(1)
    expect(targetSetSelected).toHaveBeenCalledWith(true)
    expect(duplicateSetSelected).toHaveBeenCalledWith(true)
    expect(otherSetSelected).not.toHaveBeenCalled()
  })

  it('toggles the clicked row for ctrl/meta selection', () => {
    const { result } = renderHook(() => useOperationalRowInteractions())
    const deselectAll = vi.fn()
    const targetSetSelected = vi.fn()
    const duplicateSetSelected = vi.fn()
    const otherSetSelected = vi.fn()
    const forEachNodeAfterFilterAndSort = vi.fn((callback: (node: any) => void) => {
      ;[
        { data: { id: 9 }, setSelected: targetSetSelected },
        { data: { id: 9 }, setSelected: duplicateSetSelected },
        { data: { id: 12 }, setSelected: otherSetSelected },
      ].forEach(callback)
    })

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 2,
          data: { id: 9 },
          isSelected: () => true,
          setSelected: targetSetSelected,
        },
        api: {
          deselectAll,
          forEachNodeAfterFilterAndSort,
          getSelectedNodes: () => [{ data: { id: 9 } }, { data: { id: 9 } }],
        },
        event: { ctrlKey: true, target: document.createElement('div') },
        data: { id: 9 },
      })
    })

    expect(deselectAll).not.toHaveBeenCalled()
    expect(targetSetSelected).toHaveBeenCalledWith(false)
    expect(duplicateSetSelected).toHaveBeenCalledWith(false)
    expect(otherSetSelected).not.toHaveBeenCalled()
  })

  it('adds exactly one logical row for ctrl/meta selection when duplicates exist', () => {
    const { result } = renderHook(() => useOperationalRowInteractions())
    const firstDuplicate = vi.fn()
    const secondDuplicate = vi.fn()
    const forEachNodeAfterFilterAndSort = vi.fn((callback: (node: any) => void) => {
      ;[
        { data: { id: 21 }, setSelected: firstDuplicate },
        { data: { id: 21 }, setSelected: secondDuplicate },
        { data: { id: 22 }, setSelected: vi.fn() },
      ].forEach(callback)
    })

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 1,
          data: { id: 21 },
          isSelected: () => false,
          setSelected: firstDuplicate,
        },
        api: {
          deselectAll: vi.fn(),
          forEachNodeAfterFilterAndSort,
          getSelectedNodes: () => [{ data: { id: 18 } }],
        },
        event: { metaKey: true, target: document.createElement('div') },
        data: { id: 21 },
      })
    })

    expect(firstDuplicate).toHaveBeenCalledWith(true)
    expect(secondDuplicate).toHaveBeenCalledWith(true)
  })

  it('selects a contiguous visible range for shift click', () => {
    const { result } = renderHook(() => useOperationalRowInteractions())
    const anchorNodes = [
      { rowIndex: 0, data: { id: 11 }, setSelected: vi.fn() },
      { rowIndex: 1, data: { id: 11 }, setSelected: vi.fn() },
      { rowIndex: 2, data: { id: 12 }, setSelected: vi.fn() },
      { rowIndex: 3, data: { id: 13 }, setSelected: vi.fn() },
      { rowIndex: 4, data: { id: 13 }, setSelected: vi.fn() },
      { rowIndex: 5, data: { id: 14 }, setSelected: vi.fn() },
    ]
    const anchorForEachNodeAfterFilterAndSort = vi.fn((callback: (node: any) => void) => {
      anchorNodes.forEach(callback)
    })

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 0,
          data: { id: 11 },
          isSelected: () => false,
          setSelected: anchorNodes[0].setSelected,
        },
        api: {
          deselectAll: vi.fn(),
          forEachNodeAfterFilterAndSort: anchorForEachNodeAfterFilterAndSort,
        },
        event: { target: document.createElement('div') },
        data: { id: 11 },
      })
    })

    const deselectAll = vi.fn()
    const nodes = [
      { rowIndex: 0, data: { id: 11 }, setSelected: vi.fn() },
      { rowIndex: 1, data: { id: 11 }, setSelected: vi.fn() },
      { rowIndex: 2, data: { id: 12 }, setSelected: vi.fn() },
      { rowIndex: 3, data: { id: 13 }, setSelected: vi.fn() },
      { rowIndex: 4, data: { id: 13 }, setSelected: vi.fn() },
      { rowIndex: 5, data: { id: 14 }, setSelected: vi.fn() },
    ]
    const forEachNodeAfterFilterAndSort = vi.fn((callback: (node: any) => void) => {
      nodes.forEach(callback)
    })

    act(() => {
      result.current.handleRowClicked({
        node: {
          rowIndex: 3,
          data: { id: 13 },
          isSelected: () => false,
          setSelected: vi.fn(),
        },
        api: { deselectAll, forEachNodeAfterFilterAndSort },
        event: { shiftKey: true, target: document.createElement('div') },
        data: { id: 13 },
      })
    })

    expect(deselectAll).toHaveBeenCalledTimes(1)
    expect(forEachNodeAfterFilterAndSort).toHaveBeenCalledTimes(2)
    expect(nodes[0].setSelected).toHaveBeenCalledWith(true)
    expect(nodes[1].setSelected).toHaveBeenCalledWith(true)
    expect(nodes[2].setSelected).toHaveBeenCalledWith(true)
    expect(nodes[3].setSelected).toHaveBeenCalledWith(true)
    expect(nodes[4].setSelected).toHaveBeenCalledWith(true)
    expect(nodes[5].setSelected).not.toHaveBeenCalled()
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
          data: { id: 17 },
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

  it('deduplicates repeated AG Grid selected nodes before publishing ids', () => {
    expect(
      normalizeSelectedNodeIds([
        { data: { id: 7 } },
        { data: { id: 7 } },
        { data: { id: 8 } },
        { data: { id: null } },
      ])
    ).toEqual([7, 8])
  })

  it('derives visible logical row order without duplicate ids', () => {
    const api = {
      forEachNodeAfterFilterAndSort: (callback: (node: any) => void) => {
        ;[
          { data: { id: 1 } },
          { data: { id: 1 } },
          { data: { id: 2 } },
          { data: { id: 3 } },
          { data: { id: 3 } },
        ].forEach(callback)
      },
    }

    expect(getVisibleLogicalRowIds(api)).toEqual([1, 2, 3])
  })

  it('clears grouped selections when the selection scope changes', () => {
    const setSelectedIds = vi.fn()
    const { result, rerender } = renderHook(
      ({ selectionScopeKey }) => useOperationalGroupedSelection({ setSelectedIds, selectionScopeKey }),
      { initialProps: { selectionScopeKey: 'active:raw:1,2,3' } }
    )

    act(() => {
      result.current.handleSelectionChanged({
        api: {
          getSelectedNodes: () => [{ data: { id: 1 } }, { data: { id: 2 } }],
        },
      }, 'group:a')
    })

    act(() => {
      result.current.handleSelectionChanged({
        api: {
          getSelectedNodes: () => [{ data: { id: 3 } }],
        },
      }, 'group:b')
    })

    rerender({ selectionScopeKey: 'deleted:raw:4,5,6' })

    expect(setSelectedIds).toHaveBeenLastCalledWith([])
  })

  it('does not re-emit stale grouped selections after a scope change', () => {
    const setSelectedIds = vi.fn()
    const { result, rerender } = renderHook(
      ({ selectionScopeKey }) => useOperationalGroupedSelection({ setSelectedIds, selectionScopeKey }),
      { initialProps: { selectionScopeKey: 'active:status:1,2,3' } }
    )

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

    rerender({ selectionScopeKey: 'deleted:status:8,9,10' })

    act(() => {
      result.current.handleSelectionChanged({
        api: {
          getSelectedNodes: () => [{ data: { id: 9 } }],
        },
      }, 'status:deleted')
    })

    expect(setSelectedIds).toHaveBeenLastCalledWith([9])
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
          data: { id: 1 },
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
    const setSelected = vi.fn()
    const rowNode = {
      rowIndex: 2,
      data: { id: 5 },
      isSelected: () => false,
      setSelected,
    }
    const forEachNodeAfterFilterAndSort = vi.fn((callback: (node: any) => void) => {
      callback(rowNode)
    })

    act(() => {
      result.current.handleRowClicked({
        node: rowNode,
        api: { deselectAll, forEachNodeAfterFilterAndSort },
        event: { shiftKey: true, target: document.createElement('div') },
        data: { id: 5 },
      })
    })

    expect(forEachNodeAfterFilterAndSort).toHaveBeenCalledTimes(1)
    expect(deselectAll).toHaveBeenCalledTimes(1)
    expect(setSelected).toHaveBeenCalledWith(true)
  })
})
