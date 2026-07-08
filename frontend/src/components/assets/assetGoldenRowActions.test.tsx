import { describe, expect, it, vi } from 'vitest'
import { buildAssetGoldenRowActionSections } from './assetGoldenRowActions'

describe('assetGoldenRowActions', () => {
  const getMockArgs = () => {
    return {
      asset: { id: 42, name: 'db-primary-01' },
      activeTab: 'inventory' as 'inventory' | 'deleted',
      onOpenQuickLook: vi.fn(),
      onOpenReport: vi.fn(),
      onOpenMap: vi.fn(),
      onOpenDetails: vi.fn(),
      onOpenEdit: vi.fn(),
      onOpenReportSection: vi.fn(),
      onAddToCompare: vi.fn(),
      onCloseMenu: vi.fn(),
      onRequestConfirm: vi.fn(),
      onBulkAction: vi.fn(),
      onCopyAssetId: vi.fn(),
      onCopyRow: vi.fn(),
      onExportRow: vi.fn(),
      getConsoleUrl: vi.fn().mockReturnValue('http://test-console'),
      rowDeleteConfirmId: null,
      setRowDeleteConfirmId: vi.fn(),
      favoriteIds: [],
      watchIds: [],
      onToggleFavorite: vi.fn(),
      onToggleWatch: vi.fn(),
    }
  }

  it('proves that active/inventory scope includes watch, favorite, edit, compare, and console options', () => {
    const args = getMockArgs()
    const sections = buildAssetGoldenRowActionSections(args)

    // Flat list of all items returned
    const allItems = sections.flatMap((sec) => sec.items)

    const findItem = (id: string) => allItems.find((item) => item.id === id)

    // Active-only items should be present
    expect(findItem('asset-edit')).toBeDefined()
    expect(findItem('asset-console')).toBeDefined()
    expect(findItem('asset-compare')).toBeDefined()
    expect(findItem('watch')).toBeDefined()
    expect(findItem('favorite')).toBeDefined()

    // Non-active/deleted items should be absent or configured correctly
    expect(findItem('asset-restore')).toBeUndefined()
    expect(findItem('asset-delete')).toBeDefined()
    expect(findItem('asset-purge')).toBeUndefined()
  })

  it('proves that deleted scope suppresses watch, favorite, edit, compare, and console options consistently', () => {
    const args = getMockArgs()
    args.activeTab = 'deleted'
    const sections = buildAssetGoldenRowActionSections(args)

    // Flat list of all items returned
    const allItems = sections.flatMap((sec) => sec.items)

    const findItem = (id: string) => allItems.find((item) => item.id === id)

    // Active-only items should be completely suppressed/absent
    expect(findItem('asset-edit')).toBeUndefined()
    expect(findItem('asset-console')).toBeUndefined()
    expect(findItem('asset-compare')).toBeUndefined()
    expect(findItem('watch')).toBeUndefined()
    expect(findItem('favorite')).toBeUndefined()

    // Deleted-specific actions should be present
    expect(findItem('asset-restore')).toBeDefined()
    expect(findItem('asset-purge')).toBeDefined()
    expect(findItem('asset-delete')).toBeUndefined()
  })
})
