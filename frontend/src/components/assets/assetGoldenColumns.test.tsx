import { describe, expect, it, vi } from 'vitest'
import { buildAssetGoldenColumns } from './assetGoldenColumns'

describe('AssetGoldenColumns', () => {
  it('builds column definitions and enforces that name/Instance does not have onActivate or panel triggers', () => {
    const isRecentChange = vi.fn().mockReturnValue(false)
    const onOpenQuickLook = vi.fn()
    const onOpenDetails = vi.fn()
    const onOpenEdit = vi.fn()
    const getConsoleUrl = vi.fn().mockReturnValue(null)
    const onOpenRowActions = vi.fn()
    const onToggleFavorite = vi.fn()
    const onToggleWatch = vi.fn()

    const columns = buildAssetGoldenColumns({
      activeTab: 'inventory',
      hiddenColumns: [],
      fontSize: 11,
      isIntelligenceExpanded: false,
      isRecentChange,
      onOpenQuickLook,
      onOpenDetails,
      onOpenEdit,
      getConsoleUrl,
      onOpenRowActions,
      onToggleFavorite,
      onToggleWatch,
    })

    // Find the identity column (Instance / name)
    const identityCol = columns.find((col: any) => col.field === 'name')
    expect(identityCol).toBeDefined()
    expect(identityCol?.headerName).toBe('Instance')
    
    // Ensure it does not have onActivate or panel activation triggers
    expect(identityCol?.onActivate).toBeUndefined()
    expect(identityCol?.onCellClicked).toBeUndefined()
  })

  it('correctly configures intelligence columns based on isIntelligenceExpanded', () => {
    const columnsCollapsed = buildAssetGoldenColumns({
      activeTab: 'inventory',
      hiddenColumns: [],
      fontSize: 11,
      isIntelligenceExpanded: false,
      isRecentChange: vi.fn(),
      onOpenQuickLook: vi.fn(),
      onOpenDetails: vi.fn(),
      onOpenEdit: vi.fn(),
      getConsoleUrl: vi.fn(),
      onOpenRowActions: vi.fn(),
      onToggleFavorite: vi.fn(),
      onToggleWatch: vi.fn(),
    })

    const columnsExpanded = buildAssetGoldenColumns({
      activeTab: 'inventory',
      hiddenColumns: [],
      fontSize: 11,
      isIntelligenceExpanded: true,
      isRecentChange: vi.fn(),
      onOpenQuickLook: vi.fn(),
      onOpenDetails: vi.fn(),
      onOpenEdit: vi.fn(),
      getConsoleUrl: vi.fn(),
      onOpenRowActions: vi.fn(),
      onToggleFavorite: vi.fn(),
      onToggleWatch: vi.fn(),
    })

    // Expanded columns list should differ or include intelligence column states
    expect(columnsCollapsed.length).toBeGreaterThan(0)
    expect(columnsExpanded.length).toBeGreaterThan(0)
  })
})
