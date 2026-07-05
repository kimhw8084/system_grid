import React, { useMemo, useRef, useState } from 'react'
import { Boxes, Download, Eye, Filter, LayoutGrid, List, Map, MoreVertical, Plus, RefreshCcw, Settings2 } from 'lucide-react'
import { ToolbarButton, ToolbarGroup } from '../shared/LayoutPrimitives'
import { OperationalDisplayPanel, OperationalSavedViewsPanel } from '../shared/OperationalWorkspaceShells'
import { OperationalRowActionMenu } from '../shared/OperationalRowActionMenu'
import { buildAssetGoldenColumns } from './assetGoldenColumns'
import { buildAssetGoldenRowActionSections } from './assetGoldenRowActions'
import AssetGoldenShellScaffold from './AssetGoldenShellScaffold'
import { AssetGoldenFeatureSurfaces } from './AssetGoldenFeatureSurfaces'
import { AssetGoldenDialogs } from './AssetGoldenDialogs'
import { useAssetGoldenWorkspace } from './assetGoldenData'

const buttonPanelStyle = (button: HTMLButtonElement | null, width: number) => {
  if (!button || typeof window === 'undefined') return { position: 'fixed' as const, top: 80, left: 16, width }
  const rect = button.getBoundingClientRect()
  return {
    position: 'fixed' as const,
    top: rect.bottom + 8,
    left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)),
    width,
    zIndex: 3200,
  }
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-[10px] font-bold uppercase tracking-[0.12em] text-slate-200 outline-none"
      >
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

export default function AssetGoldenOperationalWorkspace() {
  const workspace = useAssetGoldenWorkspace()
  const [showDisplayPanel, setShowDisplayPanel] = useState(false)
  const [showSavedViewsPanel, setShowSavedViewsPanel] = useState(false)
  const displayButtonRef = useRef<HTMLButtonElement | null>(null)
  const viewsButtonRef = useRef<HTMLButtonElement | null>(null)

  const columnDefs = useMemo(() => buildAssetGoldenColumns({
    activeTab: workspace.activeTab,
    hiddenColumns: workspace.hiddenColumns,
    fontSize: workspace.fontSize,
    isRecentChange: (asset) => {
      if (!asset?.updated_at) return false
      return Date.now() - new Date(asset.updated_at).getTime() < 1000 * 60 * 60 * 24
    },
    onOpenQuickLook: workspace.setQuickLookAsset,
    onOpenDetails: (asset) => {
      workspace.setDetailAsset(asset)
      workspace.setSearchParams((current: URLSearchParams) => {
        const next = new URLSearchParams(current)
        next.set('id', String(asset.id))
        return next
      })
    },
    onOpenEdit: workspace.setEditingAsset,
    onOpenRowActions: (asset, event) => {
      event.stopPropagation()
      const rect = event.currentTarget.getBoundingClientRect()
      workspace.setRowActionMenu({ asset, x: rect.right, y: rect.bottom })
    },
  }), [workspace])

  const selectedCount = workspace.selectedIds.length
  const rowActionSections = workspace.rowActionMenu ? buildAssetGoldenRowActionSections({
    asset: workspace.rowActionMenu.asset,
    activeTab: workspace.activeTab,
    onOpenDetails: workspace.setDetailAsset,
    onOpenEdit: workspace.setEditingAsset,
    onCloseMenu: () => workspace.setRowActionMenu(null),
    onOpenConfirm: workspace.openConfirm,
    onBulkAction: ({ action, ids }) => workspace.performBulkAction(action, ids),
    getConsoleUrl: workspace.getAssetConsoleUrl,
  }) : []

  return (
    <>
      <AssetGoldenShellScaffold
        activeTab={workspace.activeTab}
        existingCount={workspace.lifecycleCounts.inventory}
        purgedCount={workspace.lifecycleCounts.purged}
        onTabChange={workspace.setActiveTab}
        searchTerm={workspace.searchTerm}
        onSearchTermChange={(event) => workspace.setSearchTerm(event.target.value)}
        filterChips={workspace.filterChips}
        toolbarControls={(
          <ToolbarGroup>
            <FilterSelect label="Lens" value={workspace.activeLens === 'all' ? '' : workspace.activeLens} options={['degraded', 'unowned', 'security', 'network']} onChange={(value) => workspace.setActiveLens((value || 'all') as any)} />
            <FilterSelect label="Status" value={workspace.filters.status[0] || ''} options={workspace.filterOptions.status} onChange={(value) => workspace.setFilters((current: any) => ({ ...current, status: value ? [value] : [] }))} />
            <FilterSelect label="System" value={workspace.filters.system[0] || ''} options={workspace.filterOptions.system} onChange={(value) => workspace.setFilters((current: any) => ({ ...current, system: value ? [value] : [] }))} />
            <FilterSelect label="Owner" value={workspace.filters.owner[0] || ''} options={workspace.filterOptions.owner} onChange={(value) => workspace.setFilters((current: any) => ({ ...current, owner: value ? [value] : [] }))} />
          </ToolbarGroup>
        )}
        secondaryToolbar={(
          <ToolbarGroup>
            <ToolbarButton active={workspace.viewMode === 'grid'} onClick={() => workspace.setViewMode('grid')}><LayoutGrid size={14} /> Grid</ToolbarButton>
            <ToolbarButton active={workspace.viewMode === 'report'} onClick={() => workspace.setViewMode('report')}><List size={14} /> Report</ToolbarButton>
            <ToolbarButton active={workspace.viewMode === 'map'} onClick={() => workspace.setViewMode('map')}><Map size={14} /> Map</ToolbarButton>
            {selectedCount ? <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">{selectedCount} selected</div> : null}
          </ToolbarGroup>
        )}
        toolbarActions={(
          <ToolbarGroup>
            <ToolbarButton onClick={() => workspace.setEditingAsset({})} variant="primary"><Plus size={14} /> Add Asset</ToolbarButton>
            <ToolbarButton onClick={() => workspace.setShowImportModal(true)}><Boxes size={14} /> Import</ToolbarButton>
            <ToolbarButton onClick={workspace.exportSnapshot}><Download size={14} /> Snapshot</ToolbarButton>
            <ToolbarButton onClick={workspace.exportTemplate}><Download size={14} /> Template</ToolbarButton>
            <ToolbarButton ref={viewsButtonRef} onClick={() => setShowSavedViewsPanel((current) => !current)} active={showSavedViewsPanel}><Eye size={14} /> Views</ToolbarButton>
            <ToolbarButton ref={displayButtonRef} onClick={() => setShowDisplayPanel((current) => !current)} active={showDisplayPanel}><Settings2 size={14} /> Display</ToolbarButton>
            <ToolbarButton onClick={workspace.refreshAll}><RefreshCcw size={14} /> Refresh</ToolbarButton>
            <ToolbarButton onClick={() => workspace.setShowRegistryModal(true)}><MoreVertical size={14} /> Registry</ToolbarButton>
          </ToolbarGroup>
        )}
        floatingPanels={(
          <>
            <OperationalDisplayPanel
              isOpen={showDisplayPanel}
              panelStyle={buttonPanelStyle(displayButtonRef.current, 320)}
              title="Asset display"
              onClose={() => setShowDisplayPanel(false)}
              fontSize={workspace.fontSize}
              onFontSizeChange={workspace.setFontSize}
              rowDensity={workspace.rowDensity}
              onRowDensityChange={workspace.setRowDensity}
              columns={columnDefs}
              hiddenColumns={workspace.hiddenColumns}
              onToggleColumn={workspace.toggleColumn}
            />
            <OperationalSavedViewsPanel
              isOpen={showSavedViewsPanel}
              panelStyle={buttonPanelStyle(viewsButtonRef.current, 360)}
              entityLabel="asset"
              onClose={() => setShowSavedViewsPanel(false)}
              activeViewId={workspace.activeViewId}
              currentViewName={workspace.savedViews.find((view: any) => view.id === workspace.activeViewId)?.name || 'System default'}
              newViewName={workspace.newViewName}
              onNewViewNameChange={workspace.setNewViewName}
              onCreateView={workspace.createSavedView}
              onApplySystemDefault={() => workspace.applyView(null)}
              savedViews={workspace.savedViews}
              defaultViewIds={new Set<string>()}
              onApplyView={(id) => workspace.applyView(workspace.savedViews.find((view: any) => view.id === id) || null)}
              onOverwriteView={workspace.overwriteSavedView}
              onDeleteView={workspace.deleteSavedView}
              describeView={(view: any) => `${view.config.viewMode} · ${view.config.activeTab} · ${view.config.activeLens}`}
            />
            {workspace.rowActionMenu ? (
              <OperationalRowActionMenu
                meta={workspace.rowActionMenu.asset.system}
                title={workspace.rowActionMenu.asset.name}
                onClose={() => workspace.setRowActionMenu(null)}
                sections={rowActionSections as any}
                cursorX={workspace.rowActionMenu.x}
                cursorY={workspace.rowActionMenu.y}
              />
            ) : null}
          </>
        )}
      >
        <AssetGoldenFeatureSurfaces
          columnDefs={columnDefs}
          contextMenu={{
            handleCellContextMenu: (event: any) => {
              if (event?.data) {
                event.event.preventDefault()
                workspace.setRowActionMenu({ asset: event.data, x: event.event.clientX, y: event.event.clientY })
              }
            },
          }}
          dataState={workspace.dataState}
          fontSize={workspace.fontSize}
          rowDensity={workspace.rowDensity}
          rows={workspace.visibleAssets}
          runtime={{}}
          rowInteractions={{
            handleRowClicked: (event: any) => workspace.setQuickLookAsset(event.data),
            handleRowDoubleClicked: (event: any) => workspace.setDetailAsset(event.data),
          }}
          selectionScopeKey={`${workspace.activeTab}:${workspace.viewMode}`}
          viewMode={workspace.viewMode}
          selectedIds={workspace.selectedIds}
          connections={workspace.connections}
          relationships={workspace.relationships}
          onSelectionChanged={(event: any) => {
            workspace.setSelectedIds(event.api.getSelectedRows().map((row: any) => row.id))
          }}
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
    </>
  )
}
