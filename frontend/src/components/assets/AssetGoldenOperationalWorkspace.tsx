import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Clipboard,
  Download,
  FileText,
  GitCompare,
  Activity,
  Eye,
  EyeOff,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Plus,
  Settings,
  Sliders,
  Upload,
  Zap,
} from 'lucide-react'
import { ToolbarButton, ToolbarGroup, ToolbarIconButton } from '../shared/LayoutPrimitives'
import { OperationalDisplayPanel, OperationalSavedViewsPanel } from '../shared/OperationalWorkspaceShells'
import { OperationalRowActionMenu } from '../shared/OperationalRowActionMenu'
import { buildAssetGoldenColumns } from './assetGoldenColumns'
import { buildAssetGoldenRowActionSections } from './assetGoldenRowActions'
import AssetGoldenShellScaffold from './AssetGoldenShellScaffold'
import { AssetGoldenFeatureSurfaces } from './AssetGoldenFeatureSurfaces'
import { AssetGoldenDialogs } from './AssetGoldenDialogs'
import { useAssetGoldenWorkspace } from './assetGoldenData'
import {
  useOperationalContextMenu,
  useOperationalDismissController,
  useOperationalGroupedSelection,
  useOperationalRowInteractions,
} from '../shared/OperationalGridInteractions'
import { AppDropdown } from '../shared/AppDropdown'
import { showWorkspaceToast } from '../shared/WorkspaceToast'
import { useWorkspaceOverlayController } from '../shared/OperationalWorkspaceHooks'
import { WorkspaceFloatingPanel, useWorkspaceAnchoredLayer } from '../shared/OperationalWorkspacePrimitives'
import { AssetBulkActionsPanel } from './AssetBulkActionsPanel'
import { AssetCompareModal } from './AssetCompareModal'

const GROUP_OPTIONS = [
  { value: 'raw', label: 'Raw Table' },
  { value: 'system', label: 'System' },
  { value: 'type', label: 'Type' },
  { value: 'status', label: 'Status' },
  { value: 'environment', label: 'Environment' },
  { value: 'owner', label: 'Owner' },
  { value: 'site_name', label: 'Site' },
  { value: 'rack_name', label: 'Rack' },
]

export default function AssetGoldenOperationalWorkspace() {
  const workspace = useAssetGoldenWorkspace()
  const gridRef = useRef<any>(null)
  const [showFilterBar, setShowFilterBar] = useState(false)
  const [showCompareOpen, setShowCompareOpen] = useState(false)
  const [isIntelligenceExpanded, setIsIntelligenceExpanded] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [rowDeleteConfirmId, setRowDeleteConfirmId] = useState<number | null>(null)

  const {
    activeOverlay,
    isOverlayOpen,
    openOverlay,
    toggleOverlay,
    dismissOverlays,
  } = useWorkspaceOverlayController()

  const showDisplayMenu = isOverlayOpen('display')
  const showViewsMenu = isOverlayOpen('views')
  const showBulkMenu = isOverlayOpen('bulk')
  const showExportMenu = isOverlayOpen('export')
  const hasRowActionMenu = activeOverlay === 'rowAction' && Boolean(workspace.rowActionMenu)

  const { triggerRef: displayMenuButtonRef, panelRef: displayMenuPanelRef, panelStyle: displayMenuStyle } = useWorkspaceAnchoredLayer(showDisplayMenu, { minWidth: 320 })
  const { triggerRef: viewsMenuButtonRef, panelRef: viewsMenuPanelRef, panelStyle: viewsMenuStyle } = useWorkspaceAnchoredLayer(showViewsMenu, { minWidth: 420 })
  const { triggerRef: bulkMenuButtonRef, panelRef: bulkMenuPanelRef, panelStyle: bulkMenuStyle } = useWorkspaceAnchoredLayer(showBulkMenu, { minWidth: 340 })
  const { triggerRef: exportMenuButtonRef, panelRef: exportMenuPanelRef, panelStyle: exportMenuStyle } = useWorkspaceAnchoredLayer(showExportMenu, { minWidth: 260 })

  const openDetailAsset = useCallback((asset: any) => {
    workspace.setDetailAsset(asset)
    workspace.setSearchParams((current: URLSearchParams) => {
      const next = new URLSearchParams(current)
      next.set('id', String(asset.id))
      return next
    })
  }, [workspace])

  const dismissWorkspaceMenus = useCallback(() => {
    dismissOverlays()
    workspace.setRowActionMenu(null)
  }, [dismissOverlays, workspace])

  useEffect(() => {
    if (activeOverlay !== 'rowAction' && workspace.rowActionMenu) {
      workspace.setRowActionMenu(null)
    }
  }, [activeOverlay, workspace])

  useEffect(() => {
    if (activeOverlay === 'rowAction' && !workspace.rowActionMenu) {
      dismissOverlays()
    }
  }, [activeOverlay, dismissOverlays, workspace.rowActionMenu])

  const openRowActionMenuAtPoint = useCallback((asset: any, x: number, y: number) => {
    workspace.setRowActionMenu({ asset, x, y })
    openOverlay('rowAction')
  }, [openOverlay, workspace])

  const { handleCellContextMenu } = useOperationalContextMenu({
    onOpenRowActionMenu: useCallback((asset, point) => {
      openRowActionMenuAtPoint(asset, point.x, point.y)
    }, [openRowActionMenuAtPoint]),
  })

  const columnDefs = useMemo(() => buildAssetGoldenColumns({
    activeTab: workspace.activeTab,
    hiddenColumns: workspace.hiddenColumns,
    fontSize: workspace.fontSize,
    isIntelligenceExpanded,
    isRecentChange: (asset) => {
      if (!asset?.updated_at) return false
      return Date.now() - new Date(asset.updated_at).getTime() < 1000 * 60 * 60 * 24
    },
    onOpenQuickLook: workspace.setQuickLookAsset,
    onOpenDetails: openDetailAsset,
    onOpenEdit: workspace.setEditingAsset,
    getConsoleUrl: workspace.getAssetConsoleUrl,
    onOpenRowActions: (asset, event) => {
      event.stopPropagation()
      openRowActionMenuAtPoint(asset, event.clientX, event.clientY)
    },
  }), [isIntelligenceExpanded, openDetailAsset, openRowActionMenuAtPoint, workspace])

  const selectedCount = workspace.selectedIds.length
  const isSelected = useCallback((id: number) => workspace.selectedIds.includes(Number(id)), [workspace.selectedIds])
  const selectedAssets = useMemo(() => workspace.visibleAssets.filter((asset) => isSelected(asset.id)), [isSelected, workspace.visibleAssets])

  const rowActionSections = workspace.rowActionMenu ? buildAssetGoldenRowActionSections({
    asset: workspace.rowActionMenu.asset,
    activeTab: workspace.activeTab,
    deleteConfirmId: rowDeleteConfirmId,
    onSetDeleteConfirmId: setRowDeleteConfirmId,
    onOpenQuickLook: workspace.setQuickLookAsset,
    onOpenReport: (asset) => {
      workspace.setReportAssetId(asset.id)
      workspace.setViewMode('report')
      dismissWorkspaceMenus()
    },
    onOpenMap: (asset) => {
      workspace.setReportAssetId(asset.id)
      workspace.setViewMode('map')
      dismissWorkspaceMenus()
    },
    onOpenDetails: openDetailAsset,
    onOpenEdit: workspace.setEditingAsset,
    onAddToCompare: (asset) => {
      workspace.setSelectedIds((current) => {
        const next = current.includes(asset.id) ? current : [...current, asset.id].slice(0, 5)
        if (next.length >= 2) setShowCompareOpen(true)
        return next
      })
    },
    onCloseMenu: dismissWorkspaceMenus,
    onBulkAction: ({ action, ids }) => workspace.performBulkAction(action, ids),
    onCopyAssetId: (asset) => {
      navigator.clipboard.writeText(String(asset.id))
      showWorkspaceToast('Asset ID copied')
    },
    onCopyRow: (asset) => {
      navigator.clipboard.writeText(JSON.stringify(asset, null, 2))
      showWorkspaceToast('Asset row copied')
    },
    onExportRow: (asset) => {
      navigator.clipboard.writeText(Object.values(asset).map((value) => JSON.stringify(value ?? '')).join(','))
      showWorkspaceToast('Asset row exported to clipboard')
    },
    getConsoleUrl: workspace.getAssetConsoleUrl,
  }) : []

  useEffect(() => {
    if (!workspace.rowActionMenu) setRowDeleteConfirmId(null)
  }, [workspace.rowActionMenu])

  const LENS_OPTIONS = useMemo(() => [
    { value: 'all', label: 'All Lenses' },
    { value: 'degraded', label: 'Degraded' },
    { value: 'unowned', label: 'Unowned' },
    { value: 'security', label: 'Security' },
    { value: 'network', label: 'Network' },
  ], [])

  const statusOptions = useMemo(() => workspace.filterOptions.status.map((status) => ({ value: status, label: status })), [workspace.filterOptions.status])
  const systemOptions = useMemo(() => workspace.filterOptions.system.map((system) => ({ value: system, label: system })), [workspace.filterOptions.system])
  const typeOptions = useMemo(() => workspace.filterOptions.type.map((type) => ({ value: type, label: type })), [workspace.filterOptions.type])
  const ownerOptions = useMemo(() => workspace.filterOptions.owner.map((owner) => ({ value: owner, label: owner })), [workspace.filterOptions.owner])

  const handleCopyToClipboard = useCallback(() => {
    if (!gridRef.current?.api) {
      showWorkspaceToast('Grid is not ready', { type: 'error' })
      return
    }
    const csvData = gridRef.current.api.getDataAsCsv({
      allColumns: false,
      onlySelected: selectedCount > 0,
      suppressQuotes: true,
    })
    if (!csvData) {
      showWorkspaceToast('No grid data available', { type: 'error' })
      return
    }
    navigator.clipboard.writeText(csvData)
      .then(() => showWorkspaceToast(selectedCount > 0 ? 'Selected assets copied to clipboard' : 'Asset table copied to clipboard'))
      .catch(() => showWorkspaceToast('Failed to copy data', { type: 'error' }))
  }, [selectedCount])

  const handleExportCSV = useCallback(() => {
    if (!gridRef.current?.api) {
      showWorkspaceToast('Grid is not ready', { type: 'error' })
      return
    }
    gridRef.current.api.exportDataAsCsv({
      fileName: `SysGrid_Assets_${new Date().toISOString().slice(0, 10)}.csv`,
      allColumns: false,
      onlySelected: false,
    })
    showWorkspaceToast('Asset CSV exported')
  }, [])

  const selectionScopeKey = `${workspace.activeTab}:${workspace.viewMode}:${workspace.groupBy}`
  const { handleSelectionChanged } = useOperationalGroupedSelection({
    setSelectedIds: workspace.setSelectedIds,
    selectionScopeKey,
  })

  const { handleRowClicked, handleRowDoubleClicked } = useOperationalRowInteractions({
    onRowDoubleClick: useCallback((asset) => {
      openDetailAsset(asset)
    }, [openDetailAsset]),
    selectionScopeKey,
  })

  const getRowClass = useCallback((params: any) => (
    params.node.rowIndex % 2 === 0 ? 'operational-grid-row-even' : 'operational-grid-row-odd'
  ), [])

  const assetContextMenu = useMemo(() => ({ handleCellContextMenu }), [handleCellContextMenu])
  const assetRowInteractions = useMemo(() => ({ handleRowClicked, handleRowDoubleClicked }), [handleRowClicked, handleRowDoubleClicked])

  useEffect(() => {
    if (workspace.groupBy === 'raw') return
    const groupedSections = workspace.visibleAssets.reduce((acc: string[], asset: any) => {
      const label = String(asset?.[workspace.groupBy] || 'Unassigned')
      if (!acc.includes(label)) acc.push(label)
      return acc
    }, []).sort((a, b) => a.localeCompare(b))
    setCollapsedGroups((current) => {
      const next = { ...current }
      groupedSections.forEach((section) => {
        if (!(section in next)) next[section] = false
      })
      Object.keys(next).forEach((key) => {
        if (!groupedSections.includes(key)) delete next[key]
      })
      return next
    })
  }, [workspace.groupBy, workspace.visibleAssets])

  useOperationalDismissController({
    active: showBulkMenu || showDisplayMenu || showViewsMenu || showExportMenu || hasRowActionMenu,
    onDismiss: dismissWorkspaceMenus,
    allTriggerRefs: [bulkMenuButtonRef, displayMenuButtonRef, exportMenuButtonRef, viewsMenuButtonRef],
    bulkMenuButtonRef,
    bulkMenuPanelRef,
    displayMenuButtonRef,
    displayMenuPanelRef,
    exportMenuButtonRef,
    exportMenuPanelRef,
    viewsMenuButtonRef,
    viewsMenuPanelRef,
    showBulkMenu,
    showDisplayMenu,
    showExportMenu,
    showViewsMenu,
    hasRowActionMenu,
  })

  const secondaryToolbar = showFilterBar ? (
    <div className="space-y-3">
      {showFilterBar ? (
        <div className="grid w-full gap-3 md:grid-cols-5">
          <AppDropdown value={workspace.activeLens} onChange={(value) => workspace.setActiveLens((value || 'all') as any)} options={LENS_OPTIONS} label="Lens Filter" placeholder="All Lenses" />
          <AppDropdown multi value={workspace.filters.status} onChange={(value) => workspace.setFilters((current: any) => ({ ...current, status: value || [] }))} options={statusOptions} label="Status Filter" placeholder="All statuses" />
          <AppDropdown multi value={workspace.filters.system} onChange={(value) => workspace.setFilters((current: any) => ({ ...current, system: value || [] }))} options={systemOptions} label="System Filter" placeholder="All systems" />
          <AppDropdown multi value={workspace.filters.type} onChange={(value) => workspace.setFilters((current: any) => ({ ...current, type: value || [] }))} options={typeOptions} label="Type Filter" placeholder="All types" />
          <AppDropdown multi value={workspace.filters.owner} onChange={(value) => workspace.setFilters((current: any) => ({ ...current, owner: value || [] }))} options={ownerOptions} label="Owner Filter" placeholder="All owners" />
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <>
      <AssetGoldenShellScaffold
        activeTab={workspace.activeTab}
        existingCount={workspace.lifecycleCounts.inventory}
        purgedCount={workspace.lifecycleCounts.purged}
        onTabChange={(next) => {
          workspace.setActiveTab(next)
          workspace.setSelectedIds([])
          dismissWorkspaceMenus()
        }}
        searchTerm={workspace.searchTerm}
        onSearchTermChange={(event) => workspace.setSearchTerm(event.target.value)}
        filterChips={workspace.filterChips}
        viewMode={workspace.viewMode}
        onViewModeChange={(mode) => {
          dismissWorkspaceMenus()
          workspace.setViewMode(mode)
        }}
        toolbarControls={(
          <>
            <ToolbarGroup>
              <div className="views-menu-container">
                <ToolbarButton ref={viewsMenuButtonRef as any} active={showViewsMenu} onClick={() => toggleOverlay('views')}>
                  <span className="flex items-center gap-2">
                    <LayoutGrid size={14} />
                    Views
                  </span>
                </ToolbarButton>
              </div>
              <div className="display-menu-container">
                <ToolbarButton ref={displayMenuButtonRef as any} active={showDisplayMenu} onClick={() => toggleOverlay('display')}>
                  <span className="flex items-center gap-2">
                    <Sliders size={14} />
                    Display
                  </span>
                </ToolbarButton>
              </div>
              <ToolbarIconButton ref={exportMenuButtonRef as any} onClick={() => toggleOverlay('export')} title="Export asset data">
                <Download size={16} />
              </ToolbarIconButton>
              <ToolbarIconButton onClick={handleCopyToClipboard} title="Copy to clipboard">
                <Clipboard size={16} />
              </ToolbarIconButton>
              <ToolbarIconButton onClick={() => { dismissWorkspaceMenus(); workspace.setShowRegistryModal(true) }} title="Registry configuration">
                <Settings size={16} />
              </ToolbarIconButton>
            </ToolbarGroup>
            <ToolbarGroup>
              <ToolbarButton onClick={() => { dismissWorkspaceMenus(); workspace.setShowImportModal(true) }} title="Import asset rows">
                <span className="flex items-center gap-2">
                  <Upload size={14} />
                  Import
                </span>
              </ToolbarButton>
              <ToolbarButton active={showFilterBar} onClick={() => setShowFilterBar((current) => !current)} title={showFilterBar ? 'Hide filters' : 'Show filters'}>
                <span className="flex items-center gap-2">
                  {showFilterBar ? <EyeOff size={14} /> : <Eye size={14} />}
                  Filters
                </span>
              </ToolbarButton>
              <ToolbarButton active={isIntelligenceExpanded} onClick={() => setIsIntelligenceExpanded((current) => !current)} title={isIntelligenceExpanded ? 'Hide Activity Columns' : 'Show Activity Columns'}>
                <span className="flex items-center gap-2">
                  {isIntelligenceExpanded ? <Minimize2 size={14} /> : <Activity size={14} />}
                  Expand Table
                </span>
              </ToolbarButton>
            </ToolbarGroup>
          </>
        )}
        secondaryToolbar={secondaryToolbar}
        toolbarActions={(
          <>
            <ToolbarButton onClick={() => { dismissWorkspaceMenus(); setShowCompareOpen(true) }} disabled={selectedCount < 2 || selectedCount > 5} active={showCompareOpen} title="Compare selected assets">
              <span className="flex items-center gap-2">
                <GitCompare size={14} />
                Compare
              </span>
            </ToolbarButton>
            <ToolbarButton ref={bulkMenuButtonRef as any} onClick={() => toggleOverlay('bulk')} disabled={selectedCount === 0} active={showBulkMenu} title="Bulk actions">
              <span className="flex items-center gap-2">
                <Zap size={14} />
                Bulk Actions
              </span>
            </ToolbarButton>
            <ToolbarButton onClick={() => { dismissWorkspaceMenus(); workspace.setEditingAsset({}) }} variant="primary" className="px-6 py-2">
              <Plus size={14} />
              Register Asset
            </ToolbarButton>
          </>
        )}
        floatingPanels={(
          <>
            <OperationalDisplayPanel
              isOpen={showDisplayMenu}
              panelRef={displayMenuPanelRef}
              panelStyle={displayMenuStyle}
              title="Asset display"
              onClose={dismissWorkspaceMenus}
              fontSize={workspace.fontSize}
              onFontSizeChange={workspace.setFontSize}
              rowDensity={workspace.rowDensity}
              onRowDensityChange={workspace.setRowDensity}
              groupBy={workspace.groupBy}
              onGroupByChange={workspace.setGroupBy}
              groupOptions={GROUP_OPTIONS}
              columns={columnDefs}
              hiddenColumns={workspace.hiddenColumns}
              onToggleColumn={workspace.toggleColumn}
            />
            <OperationalSavedViewsPanel
              isOpen={showViewsMenu}
              panelRef={viewsMenuPanelRef}
              panelStyle={viewsMenuStyle}
              entityLabel="Asset"
              onClose={dismissWorkspaceMenus}
              activeViewId={workspace.activeViewId}
              currentViewName={workspace.savedViews.find((view: any) => view.id === workspace.activeViewId)?.name || 'Unsaved working view'}
              newViewName={workspace.newViewName}
              onNewViewNameChange={workspace.setNewViewName}
              onCreateView={workspace.createSavedView}
              onApplySystemDefault={() => workspace.applyView(null)}
              savedViews={workspace.savedViews}
              defaultViewIds={workspace.defaultViewIds}
              onApplyView={(id) => workspace.applyView(workspace.savedViews.find((view: any) => view.id === id) || null)}
              onOverwriteView={workspace.overwriteSavedView}
              onDeleteView={workspace.deleteSavedView}
              describeView={(view: any) => view.config?.groupBy && view.config.groupBy !== 'raw'
                ? `Grouped by ${GROUP_OPTIONS.find((option) => option.value === view.config.groupBy)?.label || view.config.groupBy}`
                : `${view.config.viewMode} · ${view.config.activeTab} · ${view.config.activeLens}`}
            />
            <AssetBulkActionsPanel
              activeTab={workspace.activeTab}
              isOpen={showBulkMenu}
              panelRef={bulkMenuPanelRef}
              panelStyle={bulkMenuStyle}
              selectedCount={selectedCount}
              onClose={dismissWorkspaceMenus}
              onApply={(action, payload) => workspace.performBulkAction(action, undefined, payload)}
            />
            {showExportMenu ? (
              <div ref={exportMenuPanelRef} style={exportMenuStyle} className="bulk-menu-container">
                <WorkspaceFloatingPanel kind="context" className="max-h-[320px] overflow-y-auto custom-scrollbar p-3">
                  <div className="space-y-2">
                    <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                      <p className="text-[10px] font-semibold text-slate-400">Export assets</p>
                      <p className="pt-1 text-[12px] font-semibold text-slate-100">Download a CSV export, template, or registry snapshot.</p>
                    </div>
                    <button type="button" onClick={() => { handleExportCSV(); dismissWorkspaceMenus() }} className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-left transition-all hover:bg-white/[0.03]">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">Export CSV</p>
                        <p className="pt-1 text-[11px] text-slate-500">Download the current asset import snapshot.</p>
                      </div>
                      <FileText size={16} className="text-blue-400" />
                    </button>
                    <button type="button" onClick={() => { workspace.exportTemplate(); dismissWorkspaceMenus() }} className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-left transition-all hover:bg-white/[0.03]">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">Export Template</p>
                        <p className="pt-1 text-[11px] text-slate-500">Download the asset registry template with canonical columns.</p>
                      </div>
                      <Download size={16} className="text-emerald-400" />
                    </button>
                    <button type="button" onClick={() => { workspace.exportSnapshot(); dismissWorkspaceMenus() }} className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-left transition-all hover:bg-white/[0.03]">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">Snapshot</p>
                        <p className="pt-1 text-[11px] text-slate-500">Download the backend snapshot artifact for import/export recovery.</p>
                      </div>
                      <FileText size={16} className="text-amber-400" />
                    </button>
                  </div>
                </WorkspaceFloatingPanel>
              </div>
            ) : null}
            {workspace.rowActionMenu ? (
              <OperationalRowActionMenu
                meta={workspace.rowActionMenu.asset.system}
                title={workspace.rowActionMenu.asset.name}
                onClose={dismissWorkspaceMenus}
                sections={rowActionSections as any}
                cursorX={workspace.rowActionMenu.x}
                cursorY={workspace.rowActionMenu.y}
              />
            ) : null}
          </>
        )}
      >
        <AssetGoldenFeatureSurfaces
          gridRef={gridRef}
          allAssets={workspace.allAssets}
          columnDefs={columnDefs}
          contextMenu={assetContextMenu}
          dataState={workspace.dataState}
          fontSize={workspace.fontSize}
          getRowClass={getRowClass}
          getRowId={(params: any) => String(params.data.id)}
          groupBy={workspace.groupBy}
          groupOptions={GROUP_OPTIONS}
          collapsedGroups={collapsedGroups}
          onSetCollapsedGroups={setCollapsedGroups}
          onCancelGrouping={() => workspace.setGroupBy('raw')}
          onSelectReportAsset={(asset) => workspace.setReportAssetId(asset.id)}
          options={workspace.options}
          onEditAsset={workspace.setEditingAsset}
          onOpenDetails={openDetailAsset}
          onOpenQuickLook={workspace.setQuickLookAsset}
          onViewServiceDetails={workspace.setServiceDetails}
          onEditService={workspace.setServiceEdit}
          rowDensity={workspace.rowDensity}
          rows={workspace.visibleAssets}
          visibleAssets={workspace.visibleAssets}
          runtime={{ getAssetConsoleUrl: workspace.getAssetConsoleUrl }}
          rowInteractions={assetRowInteractions}
          selectionScopeKey={selectionScopeKey}
          viewMode={workspace.viewMode}
          connections={workspace.connections}
          relationships={workspace.relationships}
          reportAssetId={workspace.reportAssetId}
          systemsList={workspace.systemsList}
          onSelectionChanged={handleSelectionChanged}
          isSelected={isSelected}
        />
      </AssetGoldenShellScaffold>

      <AssetGoldenDialogs
        detailAsset={workspace.detailAsset}
        detailLink={workspace.detailLink}
        devices={workspace.devices}
        editingAsset={workspace.editingAsset}
        editingLink={workspace.editingLink}
        linkPurposeOptions={workspace.linkPurposeOptions}
        farmOptions={workspace.farmOptions}
        cableTypeOptions={workspace.cableTypeOptions}
        onCloseDetails={() => {
          workspace.setDetailAsset(null)
          workspace.setSearchParams((current: URLSearchParams) => {
            const next = new URLSearchParams(current)
            next.delete('id')
            return next
          })
        }}
        onCloseEdit={() => workspace.setEditingAsset(null)}
        onCloseLinkDetails={(link: any) => workspace.setDetailLink(link || null)}
        onCloseLinkEdit={(link: any) => workspace.setEditingLink(link || null)}
        onRefresh={workspace.refreshAll}
        options={workspace.options}
        quickLookAsset={workspace.quickLookAsset}
        setEditingAsset={workspace.setEditingAsset}
        setQuickLookAsset={workspace.setQuickLookAsset}
        setServiceDetails={workspace.setServiceDetails}
        setServiceEdit={workspace.setServiceEdit}
        showImportModal={workspace.showImportModal}
        showRegistryModal={workspace.showRegistryModal}
        serviceDetails={workspace.serviceDetails}
        serviceEdit={workspace.serviceEdit}
        setShowImportModal={workspace.setShowImportModal}
        setShowRegistryModal={workspace.setShowRegistryModal}
        confirmState={workspace.confirmState}
        setConfirmState={workspace.setConfirmState}
      />

      {showCompareOpen ? <AssetCompareModal items={selectedAssets} onClose={() => setShowCompareOpen(false)} /> : null}
    </>
  )
}
