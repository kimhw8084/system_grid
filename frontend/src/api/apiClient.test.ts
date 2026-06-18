import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, apiFetch, getApiBaseUrl, getConfig, setApiOverride, subscribeToLatency } from './apiClient'

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('prefers the local storage API override and normalizes trailing API paths', () => {
    localStorage.setItem('SYSGRID_OVERRIDE_API_URL', 'http://localhost:8000/api/v1/')
    expect(getApiBaseUrl()).toBe('http://localhost:8000')

    setApiOverride('http://example.com/api/v1/')
    expect(localStorage.getItem('SYSGRID_OVERRIDE_API_URL')).toBe('http://example.com')

    setApiOverride(null)
    expect(localStorage.getItem('SYSGRID_OVERRIDE_API_URL')).toBeNull()
  })

  it('reads bootstrapped config values before defaults', () => {
    localStorage.setItem('SYSGRID_CONFIG_VITE_SAMPLE_KEY', 'bootstrapped')
    expect(getConfig('SAMPLE_KEY', 'fallback')).toBe('bootstrapped')
    expect(getConfig('UNKNOWN_KEY', 'fallback')).toBe('fallback')
  })

  it('attaches identity headers and normalizes endpoint slashes for same-origin API calls', async () => {
    localStorage.setItem('SYSGRID_OVERRIDE_API_URL', 'http://127.0.0.1:8000/api/v1')
    localStorage.setItem('SYSGRID_USER_ID', 'pw-user')
    localStorage.setItem('SYSGRID_TENANT_ID', '42')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.post('/settings/?tab=general', { enabled: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:8000/settings?tab=general')
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-User-Id': 'pw-user',
      'X-Tenant-Id': '42',
    })
    expect(options.credentials).toBe('include')
    expect(options.body).toBe(JSON.stringify({ enabled: true }))
  })

  it('trims trailing slashes on relative endpoints without query strings', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/health/')

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/health$/)
  })

  it('does not force JSON content type for FormData payloads', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/upload', { method: 'POST', body: new FormData() })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers['Content-Type']).toBeUndefined()
  })

  it('does not leak identity headers to non-local external requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('https://api.example.com/health')

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers['X-User-Id']).toBeUndefined()
    expect(options.headers['X-Tenant-Id']).toBeUndefined()
    expect(options.credentials).toBe('include')
  })

  it('uses same-origin credentials for absolute same-origin URLs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch(`${window.location.origin}/api/health`)

    const [, options] = fetchMock.mock.calls[0]
    expect(options.credentials).toBe('same-origin')
    expect(options.headers['X-User-Id']).toBe('admin_root')
  })

  it('emits latency updates and unsubscribes cleanly', async () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToLatency(listener)
    expect(listener).toHaveBeenCalledWith(0)

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/health')

    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener.mock.calls[1][0]).toBeTypeOf('number')

    unsubscribe()
    await apiFetch('/health')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('throws enriched errors for JSON API failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Unavailable',
      json: vi.fn().mockResolvedValue({
        detail: 'Backend unavailable',
        traceback: 'stack trace',
      }),
    }))

    await expect(apiFetch('/health')).rejects.toMatchObject({
      message: 'Backend unavailable',
      status: 503,
      traceback: 'stack trace',
      data: { detail: 'Backend unavailable', traceback: 'stack trace' },
    })
  })

  it('falls back to status text when error payload is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: vi.fn().mockRejectedValue(new Error('bad json')),
    }))

    await expect(apiFetch('/boom')).rejects.toMatchObject({
      message: 'API Error 500: Internal Server Error',
      status: 500,
      data: { detail: 'API Error 500: Internal Server Error' },
    })
  })

  it('uses the API message field when detail is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: vi.fn().mockResolvedValue({
        message: 'Validation Failed',
      }),
    }))

    await expect(apiFetch('/invalid')).rejects.toMatchObject({
      message: 'Validation Failed',
      status: 422,
      traceback: null,
      data: { message: 'Validation Failed' },
    })
  })

  it('supports the convenience get, put, delete, and patch helpers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ method: 'get' }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ method: 'put' }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ method: 'delete' }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ method: 'patch' }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.get('/one')).resolves.toEqual({ method: 'get' })
    await expect(apiClient.put('/two', { ok: true })).resolves.toEqual({ method: 'put' })
    await expect(apiClient.delete('/three')).resolves.toEqual({ method: 'delete' })
    await expect(apiClient.patch('/four', { ok: true })).resolves.toEqual({ method: 'patch' })

    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT')
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE')
    expect(fetchMock.mock.calls[3][1].method).toBe('PATCH')
  })

  it('falls back to same-origin credentials when URL parsing fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('http://[bad-url')

    const [, options] = fetchMock.mock.calls[0]
    expect(options.credentials).toBe('same-origin')
  })
})
