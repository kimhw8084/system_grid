import { describe, expect, it } from 'vitest'

import { resolveOperationalDataState } from './OperationalDataState'

const baseArgs = {
  emptyLabel: 'No rows found',
  filteredLabel: 'No matching rows found',
  tabEmptyKind: 'active-empty' as const,
  tabEmptyLabel: 'No active rows found',
  errorTitle: 'Rows could not be loaded',
  errorDescription: 'The request failed.',
}

describe('resolveOperationalDataState', () => {
  it('keeps loading distinct from empty states', () => {
    expect(resolveOperationalDataState({
      ...baseArgs,
      loading: true,
      error: null,
      totalCount: 0,
      tabCount: 0,
      visibleCount: 0,
    })).toEqual({ kind: 'loading', noRowsLabel: 'No rows found' })
  })

  it('keeps query errors distinct from true empty states', () => {
    expect(resolveOperationalDataState({
      ...baseArgs,
      loading: false,
      error: new Error('Boom'),
      totalCount: 0,
      tabCount: 0,
      visibleCount: 0,
    })).toEqual({
      kind: 'query-error',
      noRowsLabel: 'No rows found',
      title: 'Rows could not be loaded',
      description: 'Boom',
    })
  })

  it('distinguishes raw empty, tab empty, filtered empty, and ready states', () => {
    expect(resolveOperationalDataState({
      ...baseArgs,
      loading: false,
      error: null,
      totalCount: 0,
      tabCount: 0,
      visibleCount: 0,
    }).kind).toBe('raw-empty')

    expect(resolveOperationalDataState({
      ...baseArgs,
      loading: false,
      error: null,
      totalCount: 10,
      tabCount: 0,
      visibleCount: 0,
    }).kind).toBe('active-empty')

    expect(resolveOperationalDataState({
      ...baseArgs,
      loading: false,
      error: null,
      totalCount: 10,
      tabCount: 5,
      visibleCount: 0,
    }).kind).toBe('filtered-empty')

    expect(resolveOperationalDataState({
      ...baseArgs,
      loading: false,
      error: null,
      totalCount: 10,
      tabCount: 5,
      visibleCount: 5,
    }).kind).toBe('ready')
  })

  it('supports deleted-tab empty states', () => {
    expect(resolveOperationalDataState({
      ...baseArgs,
      tabEmptyKind: 'deleted-empty',
      tabEmptyLabel: 'No archived rows found',
      loading: false,
      error: null,
      totalCount: 6,
      tabCount: 0,
      visibleCount: 0,
    })).toEqual({
      kind: 'deleted-empty',
      noRowsLabel: 'No archived rows found',
    })
  })
})
