import { describe, expect, it, vi } from 'vitest'
import {
  buildFarDossierSearchParams,
  getFarDeepLinkNotice,
  getFarGridDataState,
  parseFarDeepLinkId,
  parseFarDossierTab,
  resolveFarDeepLink,
} from './FAR.deepLink'

describe('FAR deep-link resolution', () => {
  it('treats an absent id as no deep-link request', () => {
    expect(parseFarDeepLinkId(null)).toEqual({ kind: 'absent' })
  })

  it.each(['', 'abc', '1.5', '0', '-1', '+1', '01', ' 1', '1 ', '9007199254740992'])(
    'rejects malformed, non-positive, decimal, non-canonical, or unsafe ids: %s',
    (value) => {
      const result = parseFarDeepLinkId(value)
      expect(result.kind).toBe('invalid')
      if (result.kind === 'invalid') {
        expect(result.message).toContain('positive whole-number record ID')
      }
    },
  )

  it('accepts a positive safe integer id', () => {
    expect(parseFarDeepLinkId('9007199254740991')).toEqual({
      kind: 'valid',
      targetId: Number.MAX_SAFE_INTEGER,
    })
  })

  it('sanitizes dossier tab query state while keeping causal as the backward-compatible default', () => {
    expect(parseFarDossierTab(null)).toBe('causal')
    expect(parseFarDossierTab('')).toBe('causal')
    expect(parseFarDossierTab('causal')).toBe('causal')
    expect(parseFarDossierTab('roadmap')).toBe('roadmap')
    expect(parseFarDossierTab('versions')).toBe('versions')
    expect(parseFarDossierTab('history')).toBe('history')
    expect(parseFarDossierTab('VERSIONS')).toBe('causal')
    expect(parseFarDossierTab('unknown')).toBe('causal')
  })

  it('updates only FAR dossier query keys so collaborative view state survives open, tab, and close', () => {
    const base = new URLSearchParams('view=team-17&filter=critical')
    const opened = buildFarDossierSearchParams(base, 8, 'versions')
    expect(opened.toString()).toBe('view=team-17&filter=critical&id=8&tab=versions')

    const causal = buildFarDossierSearchParams(opened, 8, 'causal')
    expect(causal.toString()).toBe('view=team-17&filter=critical&id=8')

    const closed = buildFarDossierSearchParams(opened, null)
    expect(closed.toString()).toBe('view=team-17&filter=critical')
    expect(base.toString()).toBe('view=team-17&filter=critical')
  })

  it('waits for the already-authorized FAR list before resolving a valid id', () => {
    expect(resolveFarDeepLink('7', undefined)).toEqual({ kind: 'pending', targetId: 7 })
  })

  it('resolves visible active and archived records while preserving lifecycle scope', () => {
    const active = { id: 7, title: 'Active vector', is_deleted: false }
    const archived = { id: 8, title: 'Archived vector', is_deleted: true }
    expect(resolveFarDeepLink('7', [active, archived])).toEqual({
      kind: 'resolved',
      targetId: 7,
      mode: active,
      lifecycleScope: 'active',
    })
    expect(resolveFarDeepLink('8', [active, archived])).toEqual({
      kind: 'resolved',
      targetId: 8,
      mode: archived,
      lifecycleScope: 'archived',
    })
  })

  it('uses one privacy-safe state when a valid id is outside the visible authorized FAR list', () => {
    const result = resolveFarDeepLink('41', [{ id: 7, title: 'Visible vector' }])
    expect(result.kind).toBe('unavailable')
    if (result.kind === 'unavailable') {
      expect(result.message).toBe('This failure vector was not found or is unavailable in your scope.')
      expect(result.message).not.toContain('41')
      expect(result.message.toLowerCase()).not.toMatch(/unauthorized|forbidden|does not exist/)
      expect(getFarDeepLinkNotice(result)).toEqual({
        tone: 'warning',
        title: 'Failure vector unavailable',
        description: result.message,
      })
    }
  })

  it('resolves only from the authorized list without performing a record-existence fetch', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    try {
      expect(resolveFarDeepLink('7', [{ id: 7, title: 'Visible vector' }])).toEqual({
        kind: 'resolved',
        targetId: 7,
        mode: { id: 7, title: 'Visible vector' },
        lifecycleScope: 'active',
      })
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('keeps registry query failure authoritative over deep-link notices', () => {
    const deepLinkNotice = {
      tone: 'warning' as const,
      title: 'Failure vector unavailable',
      description: 'This failure vector was not found or is unavailable in your scope.',
    }
    expect(getFarGridDataState({
      modesError: true,
      modesLoading: false,
      filteredModeCount: 0,
      lifecycleScope: 'active',
      deepLinkNotice,
    })).toEqual({
      kind: 'query-error',
      noRowsLabel: 'No failure modes in scope',
      title: 'Failure analysis registry unavailable',
      description: 'The FAR registry could not be loaded. Retry from the workspace navigation.',
    })
  })

  it('surfaces the privacy-safe deep-link notice in ready and filtered-empty states', () => {
    const deepLinkNotice = {
      tone: 'warning' as const,
      title: 'Failure vector unavailable',
      description: 'This failure vector was not found or is unavailable in your scope.',
    }
    expect(getFarGridDataState({
      modesError: false,
      modesLoading: false,
      filteredModeCount: 1,
      lifecycleScope: 'active',
      deepLinkNotice,
    })).toEqual({
      kind: 'ready',
      noRowsLabel: 'No failure modes in scope',
      notice: deepLinkNotice,
    })
    expect(getFarGridDataState({
      modesError: false,
      modesLoading: false,
      filteredModeCount: 0,
      lifecycleScope: 'archived',
      deepLinkNotice,
    })).toEqual({
      kind: 'filtered-empty',
      noRowsLabel: 'No archived failure modes',
      title: 'No archived failure modes',
      description: 'Archived failure vectors will appear here and can be restored without losing forensic history.',
      notice: deepLinkNotice,
    })
  })
})
