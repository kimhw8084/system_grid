import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  Boxes,
  Clipboard,
  Download,
  Eye,
  EyeOff,
  GitCompare,
  LayoutGrid,
  List,
  Map,
  MoreVertical,
  Plus,
  RefreshCcw,
  Settings2,
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
import { useOperationalContextMenu } from '../shared/OperationalGridInteractions'
import { AppDropdown } from '../shared/AppDropdown'
import { WorkspaceModal } from '../shared/WorkspaceModal'
import { WorkspaceCompareShell } from '../shared/WorkspaceModalShells'
import { StatusPill } from '../shared/StatusPill'
import toast from 'react-hot-toast'

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

export default function AssetGoldenOperationalWorkspace() {
  const workspace = useAssetGoldenWorkspace()
  const [showDisplayPanel, setShowDisplayPanel] = useState(false)
  const [showSavedViewsPanel, setShowSavedViewsPanel] = useState(false)
  const [showFilterBar, setShowFilterBar] = useState(false)
  const [showCompareOpen, setShowCompareOpen] = useState(false)

  const displayButtonRef = useRef<HTMLButtonElement | null>(null)
  const viewsButtonRef = useRef<HTMLButtonElement | null>(null)
  const gridRef = useRef<any>(null)

  const { handleCellContextMenu } = useOperationalContextMenu({
    onOpenRowActionMenu: useCallback((asset, point) => {
      workspace.setRowActionMenu({ asset, x: point.x, y: point.y })
    }, [workspace])
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
  
  const selectedAssets = useMemo(() => {
    return workspace.visibleAssets.filter((asset) => workspace.selectedIds.includes(asset.id))
  }, [workspace.visibleAssets, workspace.selectedIds])

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

  const LENS_OPTIONS = useMemo(() => [
    { value: 'all', label: 'All Lenses' },
    { value: 'degraded', label: 'Degraded' },
    { value: 'unowned', label: 'Unowned' },
    { value: 'security', label: 'Security' },
    { value: 'network', label: 'Network' },
  ], [])

  const statusOptions = useMemo(() => workspace.filterOptions.status.map(s => ({ value: s, label: s })), [workspace.filterOptions.status])
  const systemOptions = useMemo(() => workspace.filterOptions.system.map(s => ({ value: s, label: s })), [workspace.filterOptions.system])
  const typeOptions = useMemo(() => workspace.filterOptions.type.map(t => ({ value: t, label: t })), [workspace.filterOptions.type])
  const ownerOptions = useMemo(() => workspace.filterOptions.owner.map(o => ({ value: o, label: o })), [workspace.filterOptions.owner])

  const handleCopyToClipboard = () => {
    if (gridRef.current?.api) {
      const csvData = gridRef.current.api.getDataAsCsv({
        allColumns: false,
        onlySelected: true,
        suppressQuotes: true
      })
      if (csvData) {
        navigator.clipboard.writeText(csvData)
          .then(() => toast.success("Selected assets copied to clipboard"))
          .catch(() => toast.error("Failed to copy data"))
      } else {
        const allCsv = gridRef.current.api.getDataAsCsv({
          allColumns: false,
          onlySelected: false,
          suppressQuotes: true
        })
        if (allCsv) {
          navigator.clipboard.writeText(allCsv)
            .then(() => toast.success("All table data copied to clipboard"))
            .catch(() => toast.error("Failed to copy data"))
        }
      }
    } else {
      toast.error("Grid is not ready")
    }
  }

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
        viewMode={workspace.viewMode}
        onViewModeChange={workspace.setViewMode}
        toolbarControls={(
          <ToolbarGroup>
            <ToolbarButton ref={viewsButtonRef} onClick={() => setShowSavedViewsPanel((current) => !current)} active={showSavedViewsPanel}>
              <span className="flex items-center gap-2">
                <LayoutGrid size={14} />
                Views
              </span>
            </ToolbarButton>
            <ToolbarButton ref={displayButtonRef} onClick={() => setShowDisplayPanel((current) => !current)} active={showDisplayPanel}>
              <span className="flex items-center gap-2">
                <Settings2 size={14} />
                Display
              </span>
            </ToolbarButton>
            <ToolbarIconButton onClick={workspace.exportSnapshot} title="Export CSV / Snapshot">
              <Download size={16} />
            </ToolbarIconButton>
            <ToolbarIconButton onClick={handleCopyToClipboard} title="Copy to clipboard">
              <Clipboard size={16} />
            </ToolbarIconButton>
            <ToolbarIconButton onClick={() => workspace.setShowRegistryModal(true)} title="Registry Config">
              <MoreVertical size={16} />
            </ToolbarIconButton>
            <ToolbarButton onClick={() => workspace.setShowImportModal(true)}>
              <span className="flex items-center gap-2">
                <Boxes size={14} />
                Import
              </span>
            </ToolbarButton>
            <ToolbarButton
              active={showFilterBar}
              onClick={() => setShowFilterBar((current) => !current)}
              title={showFilterBar ? 'Hide filters' : 'Show filters'}
            >
              <span className="flex items-center gap-2">
                {showFilterBar ? <EyeOff size={14} /> : <Eye size={14} />}
                Filters
              </span>
            </ToolbarButton>
          </ToolbarGroup>
        )}
        secondaryToolbar={showFilterBar ? (
          <div className="grid w-full gap-3 md:grid-cols-5">
            <AppDropdown
              value={workspace.activeLens}
              onChange={(value) => workspace.setActiveLens((value || 'all') as any)}
              options={LENS_OPTIONS}
              label="Lens Filter"
              placeholder="All Lenses"
            />
            <AppDropdown
              multi
              value={workspace.filters.status}
              onChange={(value) => workspace.setFilters((current: any) => ({ ...current, status: value || [] }))}
              options={statusOptions}
              label="Status Filter"
              placeholder="All statuses"
            />
            <AppDropdown
              multi
              value={workspace.filters.system}
              onChange={(value) => workspace.setFilters((current: any) => ({ ...current, system: value || [] }))}
              options={systemOptions}
              label="System Filter"
              placeholder="All systems"
            />
            <AppDropdown
              multi
              value={workspace.filters.type}
              onChange={(value) => workspace.setFilters((current: any) => ({ ...current, type: value || [] }))}
              options={typeOptions}
              label="Type Filter"
              placeholder="All types"
            />
            <AppDropdown
              multi
              value={workspace.filters.owner}
              onChange={(value) => workspace.setFilters((current: any) => ({ ...current, owner: value || [] }))}
              options={ownerOptions}
              label="Owner Filter"
              placeholder="All owners"
            />
          </div>
        ) : null}
        toolbarActions={(
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => setShowCompareOpen(true)}
              disabled={selectedCount < 2 || selectedCount > 5}
              active={showCompareOpen}
              title="Compare selected assets"
            >
              <span className="flex items-center gap-2">
                <GitCompare size={14} />
                Compare
              </span>
            </ToolbarButton>
            <ToolbarButton onClick={() => workspace.setEditingAsset({})} variant="primary">
              <Plus size={14} /> Register Asset
            </ToolbarButton>
            {selectedCount ? (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                {selectedCount} selected
              </div>
            ) : null}
            <ToolbarButton onClick={workspace.refreshAll}>
              <RefreshCcw size={14} />
            </ToolbarButton>
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
          gridRef={gridRef}
          columnDefs={columnDefs}
          contextMenu={useMemo(() => ({ handleCellContextMenu }), [handleCellContextMenu])}
          dataState={workspace.dataState}
          fontSize={workspace.fontSize}
          rowDensity={workspace.rowDensity}
          rows={workspace.visibleAssets}
          runtime={{}}
          rowInteractions={useMemo(() => ({
            handleRowClicked: undefined,
            handleRowDoubleClicked: undefined,
          }), [])}
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

      {showCompareOpen && (
        <CompareAssetsModal
          items={selectedAssets}
          onClose={() => setShowCompareOpen(false)}
        />
      )}
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
    fields.forEach(f => {
      const vals = items.map(f.getValue)
      const unique = Array.from(new Set(vals))
      if (unique.length > 1) {
        map[f.label] = unique
      }
    })
    return map
  }, [items, fields])

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
      footerRight={
        <ToolbarButton onClick={onClose}>Dismiss</ToolbarButton>
      }
    >
      <WorkspaceCompareShell
        body={
          <div className={`grid gap-4 ${gridCols}`}>
            {items.map((item: any) => (
              <div key={item.id} className="rounded-lg border border-white/5 bg-black/40 p-5 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">ID {item.id}</span>
                  <StatusPill value={item.status} />
                </div>
                <h4 className="text-sm font-black text-white truncate mb-1">{item.name}</h4>
                <p className="text-[9px] font-bold text-slate-500 tracking-widest truncate">{item.system || 'No System'}</p>
                
                <div className="mt-6 space-y-2.5">
                  {fields.map(f => {
                    const val = f.getValue(item)
                    const diffSet = diffMap[f.label]
                    const colorIndex = diffSet ? diffSet.indexOf(val) : -1
                    return (
                      <CompareRow 
                        key={f.label} 
                        label={f.label} 
                        value={val} 
                        multiline={f.multiline} 
                        colorIndex={colorIndex}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        }
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
        {isDiff && <div className={`w-1 h-1 rounded-full ${style.text.replace('text-', 'bg-')} animate-pulse`} />}
      </div>
      <p className={`pt-0.5 font-bold ${style.val} ${multiline ? 'leading-relaxed text-[11px] mt-1' : 'text-right text-[10px]'}`}>{value}</p>
    </div>
  )
}