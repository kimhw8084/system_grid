import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Clipboard,
  FileText,
  GitCompare,
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
import { WorkspaceModal } from '../shared/WorkspaceModal'
import { WorkspaceCompareShell } from '../shared/WorkspaceModalShells'
import { StatusPill } from '../shared/StatusPill'
import { showWorkspaceToast } from '../shared/WorkspaceToast'
import { useWorkspaceOverlayController } from '../shared/OperationalWorkspaceHooks'
import { useWorkspaceAnchoredLayer } from '../shared/OperationalWorkspacePrimitives'
import { AssetBulkActionsPanel } from './AssetBulkActionsPanel'

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
  const [isActivityExpanded, setIsActivityExpanded] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

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
  const hasRowActionMenu = activeOverlay === 'rowAction' && Boolean(workspace.rowActionMenu)

  const { triggerRef: displayMenuButtonRef, panelRef: displayMenuPanelRef, panelStyle: displayMenuStyle } = useWorkspaceAnchoredLayer(showDisplayMenu, { minWidth: 320 })
  const { triggerRef: viewsMenuButtonRef, panelRef: viewsMenuPanelRef, panelStyle: viewsMenuStyle } = useWorkspaceAnchoredLayer(showViewsMenu, { minWidth: 420 })
  const { triggerRef: bulkMenuButtonRef, panelRef: bulkMenuPanelRef, panelStyle: bulkMenuStyle } = useWorkspaceAnchoredLayer(showBulkMenu, { minWidth: 340 })

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
    isRecentChange: (asset) => {
      if (!asset?.updated_at) return false
      return Date.now() - new Date(asset.updated_at).getTime() < 1000 * 60 * 60 * 24
    },
    onOpenQuickLook: workspace.setQuickLookAsset,
    onOpenDetails: openDetailAsset,
    onOpenEdit: workspace.setEditingAsset,
    onOpenRowActions: (asset, event) => {
      event.stopPropagation()
      openRowActionMenuAtPoint(asset, event.clientX, event.clientY)
    },
  }), [openDetailAsset, openRowActionMenuAtPoint, workspace])

  const selectedCount = workspace.selectedIds.length
  const isSelected = useCallback((id: number) => workspace.selectedIds.includes(Number(id)), [workspace.selectedIds])
  const selectedAssets = useMemo(() => workspace.visibleAssets.filter((asset) => isSelected(asset.id)), [isSelected, workspace.visibleAssets])

  const rowActionSections = workspace.rowActionMenu ? buildAssetGoldenRowActionSections({
    asset: workspace.rowActionMenu.asset,
    activeTab: workspace.activeTab,
    onOpenDetails: openDetailAsset,
    onOpenEdit: workspace.setEditingAsset,
    onCloseMenu: dismissWorkspaceMenus,
    onOpenConfirm: workspace.openConfirm,
    onBulkAction: ({ action, ids }) => workspace.performBulkAction(action, ids),
    getConsoleUrl: workspace.getAssetConsoleUrl,
  }) : []

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
    active: showBulkMenu || showDisplayMenu || showViewsMenu || hasRowActionMenu,
    onDismiss: dismissWorkspaceMenus,
    allTriggerRefs: [bulkMenuButtonRef, displayMenuButtonRef, viewsMenuButtonRef],
    bulkMenuButtonRef,
    bulkMenuPanelRef,
    displayMenuButtonRef,
    displayMenuPanelRef,
    viewsMenuButtonRef,
    viewsMenuPanelRef,
    showBulkMenu,
    showDisplayMenu,
    showViewsMenu,
    hasRowActionMenu,
  })

  const secondaryToolbar = showFilterBar || isActivityExpanded ? (
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
      {isActivityExpanded ? (
        <div className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-600/10 p-4 backdrop-blur-md">
          <div className="flex items-center space-x-12">
            <div className="flex items-center space-x-3">
              <Maximize2 size={16} className="text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">View Density Laboratory</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <span className="text-[9px] font-bold uppercase text-slate-500">Font Size</span>
                <div className="flex items-center space-x-2">
                  <input type="range" min="8" max="14" step="1" value={workspace.fontSize} onChange={(event) => workspace.setFontSize(Number(event.target.value))} className="h-1.5 w-32 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-blue-500" />
                  <span className="w-8 text-[10px] font-bold text-white">{workspace.fontSize}px</span>
                </div>
              </div>
              <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
                <span className="text-[9px] font-bold uppercase text-slate-500">Row Density</span>
                <div className="flex items-center space-x-2">
                  <input type="range" min="8" max="28" step="2" value={workspace.rowDensity} onChange={(event) => workspace.setRowDensity(Number(event.target.value))} className="h-1.5 w-32 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500" />
                  <span className="w-8 text-[10px] font-bold text-white">{workspace.rowDensity}px</span>
                </div>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setIsActivityExpanded(false)} className="text-slate-500 transition-colors hover:text-white">
            <Minimize2 size={16} />
          </button>
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
              <ToolbarButton ref={viewsMenuButtonRef as any} active={showViewsMenu} onClick={() => toggleOverlay('views')}>
                <span className="flex items-center gap-2">
                  <LayoutGrid size={14} />
                  Views
                </span>
              </ToolbarButton>
              <ToolbarButton ref={displayMenuButtonRef as any} active={showDisplayMenu} onClick={() => toggleOverlay('display')}>
                <span className="flex items-center gap-2">
                  <Sliders size={14} />
                  Display
                </span>
              </ToolbarButton>
              <ToolbarIconButton onClick={workspace.exportSnapshot} title="Export CSV">
                <FileText size={16} />
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
              <ToolbarButton active={isActivityExpanded} onClick={() => setIsActivityExpanded((current) => !current)} title={isActivityExpanded ? 'Hide Activity Controls' : 'Show Activity Controls'}>
                <span className="flex items-center gap-2">
                  {isActivityExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  Activity
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
              defaultViewIds={new Set<string>()}
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
              onClose={dismissWorkspaceMenus}
              onApply={(action, payload) => workspace.performBulkAction(action, undefined, payload)}
            />
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
          columnDefs={columnDefs}
          contextMenu={assetContextMenu}
          devices={workspace.devices}
          dataState={workspace.dataState}
          fontSize={workspace.fontSize}
          getRowClass={getRowClass}
          getRowId={(params: any) => String(params.data.id)}
          groupBy={workspace.groupBy}
          groupOptions={GROUP_OPTIONS}
          collapsedGroups={collapsedGroups}
          onSetCollapsedGroups={setCollapsedGroups}
          onCancelGrouping={() => workspace.setGroupBy('raw')}
          options={workspace.options}
          onEditAsset={workspace.setEditingAsset}
          onViewServiceDetails={workspace.setServiceDetails}
          onEditService={workspace.setServiceEdit}
          rowDensity={workspace.rowDensity}
          rows={workspace.visibleAssets}
          runtime={{}}
          rowInteractions={assetRowInteractions}
          selectionScopeKey={selectionScopeKey}
          viewMode={workspace.viewMode}
          selectedIds={workspace.selectedIds}
          connections={workspace.connections}
          relationships={workspace.relationships}
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

      {showCompareOpen ? <CompareAssetsModal items={selectedAssets} onClose={() => setShowCompareOpen(false)} /> : null}
    </>
  )
}

function CompareAssetsModal({ items, onClose }: { items: any[]; onClose: () => void }) {
  const [isMaximized, setIsMaximized] = useState(false)

  const fields = useMemo(() => [
    { label: 'Status', getValue: (item: any) => item.status || 'Unknown' },
    { label: 'System', getValue: (item: any) => item.system || 'N/A' },
    { label: 'Type', getValue: (item: any) => item.type || 'N/A' },
    { label: 'Environment', getValue: (item: any) => item.environment || 'N/A' },
    { label: 'Owner', getValue: (item: any) => item.owner || 'N/A' },
    { label: 'Manufacturer', getValue: (item: any) => item.manufacturer || 'N/A' },
    { label: 'Model', getValue: (item: any) => item.model || 'N/A' },
    { label: 'Primary IP', getValue: (item: any) => item.primary_ip || 'N/A' },
    { label: 'Mgmt IP', getValue: (item: any) => item.management_ip || 'N/A' },
    { label: 'Rack', getValue: (item: any) => item.rack_name || 'N/A' },
    { label: 'Site', getValue: (item: any) => item.site_name || 'N/A' },
    { label: 'Resources', getValue: (item: any) => item.hardware_summary || 'N/A', multiline: true },
  ], [])

  const diffMap = useMemo(() => {
    const map: Record<string, any[]> = {}
    fields.forEach((field) => {
      const values = items.map(field.getValue)
      const unique = Array.from(new Set(values))
      if (unique.length > 1) {
        map[field.label] = unique
      }
    })
    return map
  }, [fields, items])

  const gridCols = items.length === 2 ? 'md:grid-cols-2' : items.length === 3 ? 'md:grid-cols-3' : items.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-5'

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title="Compare Assets"
      subtitle={`Temporal Variance Analysis · Comparing ${items.length} asset states for semantic drift`}
      icon={<GitCompare size={20} />}
      footerRight={<ToolbarButton onClick={onClose}>Dismiss</ToolbarButton>}
    >
      <WorkspaceCompareShell
        body={(
          <div className={`grid gap-4 ${gridCols}`}>
            {items.map((item: any) => (
              <div key={item.id} className="rounded-lg border border-white/5 bg-black/40 p-5 shadow-inner">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-black text-blue-400">ID {item.id}</span>
                  <StatusPill value={item.status} />
                </div>
                <h4 className="mb-1 truncate text-sm font-black text-white">{item.name}</h4>
                <p className="truncate text-[9px] font-bold tracking-widest text-slate-500">{item.system || 'No System'}</p>

                <div className="mt-6 space-y-2.5">
                  {fields.map((field) => {
                    const value = field.getValue(item)
                    const diffSet = diffMap[field.label]
                    const colorIndex = diffSet ? diffSet.indexOf(value) : -1
                    return <CompareRow key={field.label} label={field.label} value={value} multiline={field.multiline} colorIndex={colorIndex} />
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      />
    </WorkspaceModal>
  )
}

function CompareRow({ label, value, multiline = false, colorIndex = -1 }: { label: string; value: string; multiline?: boolean; colorIndex?: number }) {
  const isDiff = colorIndex !== -1
  const diffStyles = [
    { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', val: 'text-amber-200' },
    { border: 'border-sky-500/30', bg: 'bg-sky-500/5', text: 'text-sky-400', val: 'text-sky-200' },
    { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', val: 'text-emerald-200' },
    { border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-400', val: 'text-rose-200' },
    { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400', val: 'text-purple-200' },
  ]
  const style = isDiff ? diffStyles[colorIndex % diffStyles.length] : { border: 'border-white/5', bg: 'bg-black/20', text: 'text-slate-500', val: 'text-slate-300' }

  return (
    <div className={`rounded-lg border px-3 py-2.5 transition-all ${style.border} ${style.bg} ${isDiff ? 'shadow-lg' : ''} ${multiline ? '' : 'flex items-center justify-between gap-3'}`}>
      <div className="flex items-center gap-2">
        <p className={`text-[8px] font-black uppercase tracking-widest ${style.text}`}>{label}</p>
        {isDiff ? <div className={`h-1 w-1 animate-pulse rounded-full ${style.text.replace('text-', 'bg-')}`} /> : null}
      </div>
      <p className={`pt-0.5 font-bold ${style.val} ${multiline ? 'mt-1 text-[11px] leading-relaxed' : 'text-right text-[10px]'}`}>{value}</p>
    </div>
  )
}
