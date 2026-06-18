import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadStore() {
  vi.resetModules()
  return import('./errorStore')
}

describe('errorStore', () => {
  beforeEach(async () => {
    localStorage.clear()
    const store = await loadStore()
    store.errorManager.clearErrors()
    store.errorManager.setOpen(false)
  })

  it('records errors with metadata and keeps them persisted', async () => {
    const store = await loadStore()
    const { errorManager } = store

    errorManager.addError({
      type: 'backend',
      severity: 'critical',
      message: 'Request failed',
      status: 500,
      method: 'GET',
      url: '/api/test',
    })

    const [entry] = errorManager.getErrors()
    expect(entry).toMatchObject({
      acknowledged: false,
      message: 'Request failed',
      method: 'GET',
      severity: 'critical',
      status: 500,
      type: 'backend',
      url: '/api/test',
      view: '/',
    })

    const persisted = JSON.parse(localStorage.getItem('SYSGRID_ERROR_LOGS') || '[]')
    expect(persisted).toHaveLength(1)
    expect(persisted[0].message).toBe('Request failed')
  })

  it('supports acknowledge, bulk acknowledge, open state, and clearing', async () => {
    const store = await loadStore()
    const { errorManager } = store

    errorManager.addError({
      type: 'frontend',
      severity: 'error',
      message: 'Render exploded',
    })
    errorManager.addError({
      type: 'backend',
      severity: 'warning',
      message: 'Retry later',
    })

    const [latest, older] = errorManager.getErrors()
    errorManager.acknowledgeError(older.id)
    expect(errorManager.getErrors().find((entry) => entry.id === older.id)?.acknowledged).toBe(true)
    expect(errorManager.getErrors().find((entry) => entry.id === latest.id)?.acknowledged).toBe(false)

    errorManager.acknowledgeAll()
    expect(errorManager.getErrors().every((entry) => entry.acknowledged)).toBe(true)

    const openListener = vi.fn()
    const unsubscribe = errorManager.subscribeOpen(openListener)
    errorManager.setOpen(true)
    expect(errorManager.getIsOpen()).toBe(true)
    expect(openListener).toHaveBeenCalledWith(true)
    unsubscribe()

    errorManager.clearErrors()
    expect(errorManager.getErrors()).toEqual([])
  })

  it('opens when the shell dispatches the global event', async () => {
    const store = await loadStore()
    const { errorManager } = store

    window.dispatchEvent(new Event('open-error-console'))
    expect(errorManager.getIsOpen()).toBe(true)
  })

  it('keeps the useErrors hook synchronized with the singleton manager', async () => {
    const store = await loadStore()
    const { errorManager, useErrors } = store

    const { result } = renderHook(() => useErrors())

    await act(async () => {
      errorManager.addError({
        type: 'frontend',
        severity: 'error',
        message: 'Client issue',
      })
    })

    expect(result.current.errors).toHaveLength(1)
    expect(result.current.errors[0].message).toBe('Client issue')

    act(() => {
      result.current.setOpen(true)
    })
    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.acknowledgeError(result.current.errors[0].id)
    })
    expect(result.current.errors[0].acknowledged).toBe(true)

    act(() => {
      result.current.acknowledgeAll()
    })
    expect(result.current.errors[0].acknowledged).toBe(true)

    act(() => {
      result.current.clearErrors()
    })
    expect(result.current.errors).toEqual([])
  })

  it('recovers from malformed persisted data and storage write failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    localStorage.setItem('SYSGRID_ERROR_LOGS', '{bad-json')
    let store = await loadStore()
    expect(store.errorManager.getErrors()).toEqual([])
    expect(warnSpy).toHaveBeenCalled()

    const originalSetItem = localStorage.setItem.bind(localStorage)
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    store.errorManager.addError({
      type: 'frontend',
      severity: 'warning',
      message: 'still tracked in memory',
    })
    expect(store.errorManager.getErrors()).toHaveLength(1)
    expect(warnSpy).toHaveBeenCalled()

    localStorage.setItem = originalSetItem
  })

  it('can initialize without a browser window object', async () => {
    vi.resetModules()
    const originalWindow = globalThis.window
    vi.stubGlobal('window', undefined)

    const store = await import('./errorStore')
    expect(store.errorManager.getErrors()).toEqual([])

    vi.stubGlobal('window', originalWindow)
  })
})
