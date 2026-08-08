import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Clipboard,
  Copy,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  GitCompare,
  HelpCircle,
  LayoutGrid,
  Settings,
  ShieldAlert,
  Sliders,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { ToolbarButton, ToolbarGroup, ToolbarIconButton } from './shared/LayoutPrimitives'
import {
  OperationalAnchoredPanel,
  OperationalDisplayPanel,
  OperationalSavedViewsPanel,
} from './shared/OperationalWorkspaceShells'
import { WorkspaceFloatingPanel, useWorkspaceAnchoredLayer } from './shared/OperationalWorkspacePrimitives'
import { WorkspaceFlyoutActionCard } from './shared/WorkspaceFlyout'
import { WorkspaceModal } from './shared/WorkspaceModal'
import { WorkspaceCompareShell } from './shared/WorkspaceModalShells'
import { OperationalRowActionMenu, type OperationalRowActionSectionModel } from './shared/OperationalRowActionMenu'
import {
  useOperationalContextMenu,
  useOperationalDismissController,
} from './shared/OperationalGridInteractions'
import {
  usePersistentJsonState,
  useWorkspaceOverlayController,
} from './shared/OperationalWorkspaceHooks'
import {
  applyOperationalColumnState,
  getOperationalColumnLayoutSnapshot,
  sanitizeOperationalFilterModel,
  sanitizeOperationalSortModel,
} from './shared/OperationalGridSizing'
import {
  isRemoteWorkspaceViewId,
  useCollaborativeWorkspaceViews,
} from './shared/CollaborativeWorkspaceViews'
import {
  DEFAULT_FAR_VIEW_CONFIG,
  FAR_ACTIVE_VIEW_KEY,
  FAR_COLLABORATIVE_VIEW_MIGRATION_KEY,
  FAR_PERSISTED_COLUMN_IDS,
  FAR_SYSTEM_VIEW_IDS,
  FAR_VIEW_STORAGE_KEY,
  type FarSavedView,
  type FarWorkspaceViewConfig,
  normalizeFarSavedViews,
  sanitizeFarWorkspaceViewConfig,
} from './FAR.workspaceState'

const selectedRows = (modes: any[] | undefined, selectedIds: number[]) => {
  const selected = new Set(selectedIds.map(Number))
  return (modes || []).filter((mode) => selected.has(Number(mode.id)))
}

const readSortModel = (api: any) => (
  (api?.getColumnState?.() || [])
    .filter((column: any) => column?.sort === 'asc' || column?.sort === 'desc')
    .map((column: any) => ({ colId: column.colId, sort: column.sort }))
)

const compareValue = (value: unknown) => {
  if (Array.isArray(value)) return String(value.length)
  if (value == null || value === '') return '—'
  return String(value)
}

type FarSavedViewPanelModel = {
  id: string
  name: string
  config: { groupBy?: string }
  scope?: 'personal' | 'team'
  source?: 'remote' | 'local' | 'system'
}

export function useFARGoldenWorkspaceControls({
  gridRef,
  modes,
  selectedIds,
  fontSize,
  setFontSize,
  rowDensity,
  setRowDensity,
  hiddenColumns,
  setHiddenColumns,
  searchTerm,
  setSearchTerm,
  selectedSystems,
  setSelectedSystems,
  showSystemFilters,
  setShowSystemFilters,
  showInsights,
  setShowInsights,
  columnDefs,
  onExport,
  onCopySelected,
  onImport,
  onRetireSelected,
  onAdd,
  onSettings,
  onRpnHelp,
  onOpenDetail,
  onEdit,
}: {
  gridRef: React.RefObject<any>
  modes: any[] | undefined
  selectedIds: number[]
  fontSize: number
  setFontSize: React.Dispatch<React.SetStateAction<number>>
  rowDensity: number
  setRowDensity: React.Dispatch<React.SetStateAction<number>>
  hiddenColumns: string[]
  setHiddenColumns: React.Dispatch<React.SetStateAction<string[]>>
  searchTerm: string
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>
  selectedSystems: string[]
  setSelectedSystems: React.Dispatch<React.SetStateAction<string[]>>
  showSystemFilters: boolean
  setShowSystemFilters: React.Dispatch<React.SetStateAction<boolean>>
  showInsights: boolean
  setShowInsights: React.Dispatch<React.SetStateAction<boolean>>
  columnDefs: any[]
  onExport: () => void
  onCopySelected: () => void
  onImport: () => void
  onRetireSelected: (ids?: number[]) => void
  onAdd: () => void
  onSettings: () => void
  onRpnHelp: () => void
  onOpenDetail: (id: number) => void
  onEdit: (id: number) => void
}) {
  const [savedViews, setSavedViews] = usePersistentJsonState<FarSavedView[]>(FAR_VIEW_STORAGE_KEY, [])
  const [activeViewId, setActiveViewId] = usePersistentJsonState<string | null>(FAR_ACTIVE_VIEW_KEY, null)
  const [newViewName, setNewViewName] = useState('')
  const [gridFilterModel, setGridFilterModel] = useState<Record<string, any>>({})
  const [gridSortModel, setGridSortModel] = useState<Array<{ colId: string; sort: 'asc' | 'desc' }>>([])
  const [columnLayoutState, setColumnLayoutState] = useState<any[]>([])
  const [showActivity, setShowActivity] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [rowActionMenu, setRowActionMenu] = useState<{ item: any; point: { x: number; y: number } } | null>(null)
  const lastRequestedViewRef = useRef<string | null>(null)

  const {
    activeOverlay,
    isOverlayOpen,
    toggleOverlay,
    dismissOverlays,
  } = useWorkspaceOverlayController()
  const showViewsMenu = isOverlayOpen('views')
  const showDisplayMenu = isOverlayOpen('display')
  const showBulkMenu = isOverlayOpen('bulk')

  const { triggerRef: viewsMenuButtonRef, panelRef: viewsMenuPanelRef, panelStyle: viewsMenuStyle } = useWorkspaceAnchoredLayer(showViewsMenu, { minWidth: 420 })
  const { triggerRef: displayMenuButtonRef, panelRef: displayMenuPanelRef, panelStyle: displayMenuStyle } = useWorkspaceAnchoredLayer(showDisplayMenu, { minWidth: 320 })
  const { triggerRef: bulkMenuButtonRef, panelRef: bulkMenuPanelRef, panelStyle: bulkMenuStyle } = useWorkspaceAnchoredLayer(showBulkMenu, { minWidth: 340 })

  const currentDefinition = useMemo<FarWorkspaceViewConfig>(() => sanitizeFarWorkspaceViewConfig({
    fontSize,
    rowDensity,
    hiddenColumns,
    quickFilter: searchTerm,
    quickFilters: { system_name: selectedSystems },
    filterModel: gridFilterModel,
    sortModel: gridSortModel,
    columnLayoutState,
  }), [columnLayoutState, fontSize, gridFilterModel, gridSortModel, hiddenColumns, rowDensity, searchTerm, selectedSystems])

  const normalizedViews = useMemo(() => normalizeFarSavedViews(savedViews), [savedViews])
  const savedViewPanelModels = useMemo<FarSavedViewPanelModel[]>(() => normalizedViews.map((view) => ({
    id: view.id,
    name: view.name,
    scope: view.scope,
    source: view.source,
    config: { groupBy: 'raw' },
  })), [normalizedViews])
  const describeSavedView = useCallback((view: FarSavedViewPanelModel) => {
    const farView = normalizedViews.find((entry) => entry.id === view.id)
    if (!farView) return 'FAR view'
    return `${farView.config.hiddenColumns.length} hidden · ${farView.config.quickFilters.system_name.length || 'all'} systems`
  }, [normalizedViews])

  const collaborativeViews = useCollaborativeWorkspaceViews<FarWorkspaceViewConfig, FarSavedView>({
    workspaceKey: 'far',
    migrationKey: FAR_COLLABORATIVE_VIEW_MIGRATION_KEY,
    systemViewIds: FAR_SYSTEM_VIEW_IDS,
    currentViews: normalizedViews,
    setCurrentViews: setSavedViews,
    normalizeViews: normalizeFarSavedViews,
    sanitizeDefinition: sanitizeFarWorkspaceViewConfig,
    activeViewId,
    onActiveViewIdChange: setActiveViewId,
    currentDefinition,
  })

  const applyViewConfig = useCallback((raw: unknown) => {
    const config = sanitizeFarWorkspaceViewConfig(raw)
    setFontSize(config.fontSize)
    setRowDensity(config.rowDensity)
    setHiddenColumns(config.hiddenColumns)
    setSearchTerm(config.quickFilter)
    setSelectedSystems(config.quickFilters.system_name)
    setGridFilterModel(config.filterModel)
    setGridSortModel(config.sortModel)
    setColumnLayoutState(config.columnLayoutState)

    const api = gridRef.current?.api
    if (!api) return
    applyOperationalColumnState(api, config.columnLayoutState, true)
    api.setFilterModel?.(config.filterModel)
    api.applyColumnState?.({
      state: config.sortModel,
      defaultState: { sort: null },
      applyOrder: false,
    })
  }, [gridRef, setFontSize, setHiddenColumns, setRowDensity, setSearchTerm, setSelectedSystems])

  const applyView = useCallback((id: string) => {
    const view = normalizedViews.find((entry) => entry.id === id)
    if (!view) return
    applyViewConfig(view.config)
    setActiveViewId(view.id)
    collaborativeViews.setViewLink(isRemoteWorkspaceViewId(view.id) ? view.id : null)
  }, [applyViewConfig, collaborativeViews, normalizedViews, setActiveViewId])

  useEffect(() => {
    const requestedId = collaborativeViews.requestedViewId
    if (!requestedId || requestedId === lastRequestedViewRef.current) return
    const view = normalizedViews.find((entry) => entry.id === requestedId)
    if (!view) return
    lastRequestedViewRef.current = requestedId
    applyViewConfig(view.config)
    setActiveViewId(view.id)
  }, [applyViewConfig, collaborativeViews.requestedViewId, normalizedViews, setActiveViewId])

  const createView = useCallback(async () => {
    const name = newViewName.trim()
    if (!name) return
    const result = await collaborativeViews.createView(name, currentDefinition)
    if (!result.view) {
      toast.error(result.error || 'Unable to save FAR view')
      return
    }
    setActiveViewId(result.view.id)
    collaborativeViews.setViewLink(isRemoteWorkspaceViewId(result.view.id) ? result.view.id : null)
    setNewViewName('')
    toast.success(result.persisted ? `Saved ${result.view.name}` : `Saved local fallback ${result.view.name}`)
  }, [collaborativeViews, currentDefinition, newViewName, setActiveViewId])

  const overwriteView = useCallback(async (id: string) => {
    const view = normalizedViews.find((entry) => entry.id === id)
    if (!view) return
    const result = await collaborativeViews.updateView(id, view.name, currentDefinition)
    if (result.conflict) return
    if (!result.view) {
      toast.error(result.error || 'Unable to update FAR view')
      return
    }
    toast.success(result.persisted ? `Updated ${result.view.name}` : `Updated local fallback ${result.view.name}`)
  }, [collaborativeViews, currentDefinition, normalizedViews])

  const renameView = useCallback(async (id: string, name: string) => {
    const view = normalizedViews.find((entry) => entry.id === id)
    if (!view) return false
    const result = await collaborativeViews.updateView(id, name, view.config)
    if (!result.view) {
      toast.error(result.error || 'Unable to rename FAR view')
      return false
    }
    toast.success(`Renamed view to ${result.view.name}`)
    return true
  }, [collaborativeViews, normalizedViews])

  const deleteView = useCallback(async (id: string) => {
    const view = normalizedViews.find((entry) => entry.id === id)
    if (!view) return
    const result = await collaborativeViews.deleteView(id)
    if (result.conflict) return
    if (activeViewId === id) {
      setActiveViewId(null)
      collaborativeViews.setViewLink(null)
    }
    toast.success(result.persisted ? `Deleted ${view.name}` : `Removed local fallback ${view.name}`)
  }, [activeViewId, collaborativeViews, normalizedViews, setActiveViewId])

  const handleGridReady = useCallback((params: any) => {
    const config = currentDefinition
    if (config.columnLayoutState.length) applyOperationalColumnState(params.api, config.columnLayoutState, true)
    params.api.setFilterModel?.(config.filterModel)
    params.api.applyColumnState?.({
      state: config.sortModel,
      defaultState: { sort: null },
      applyOrder: false,
    })
  }, [currentDefinition])

  const syncColumnLayout = useCallback((api: any) => {
    setColumnLayoutState(getOperationalColumnLayoutSnapshot(api, true))
  }, [])

  const gridRuntime = useMemo(() => ({
    preserveExplicitColumnWidths: columnLayoutState.length > 0,
    handleGridReady,
    handleColumnResized: (event: any) => event?.finished && syncColumnLayout(event.api),
    handleColumnMoved: (event: any) => event?.finished !== false && syncColumnLayout(event.api),
    handleDragStopped: (event: any) => syncColumnLayout(event.api),
    handleColumnPinned: (event: any) => syncColumnLayout(event.api),
    handleColumnVisible: (event: any) => syncColumnLayout(event.api),
    handleFilterChanged: (event: any) => setGridFilterModel(sanitizeOperationalFilterModel(event.api?.getFilterModel?.() || {}, FAR_PERSISTED_COLUMN_IDS)),
    handleSortChanged: (event: any) => setGridSortModel(sanitizeOperationalSortModel(readSortModel(event.api), FAR_PERSISTED_COLUMN_IDS) as FarWorkspaceViewConfig['sortModel']),
  }), [columnLayoutState.length, handleGridReady, syncColumnLayout])

  const toggleColumn = useCallback((field: string) => {
    const currentlyHidden = hiddenColumns.includes(field)
    setHiddenColumns((current) => currentlyHidden ? current.filter((entry) => entry !== field) : [...current, field])
    gridRef.current?.api?.setColumnsVisible?.([field], currentlyHidden)
  }, [gridRef, hiddenColumns, setHiddenColumns])

  const exportSelected = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv?.({
      fileName: `SysGrid_FAR_Selected_${new Date().toISOString().split('T')[0]}.csv`,
      allColumns: false,
      onlySelected: true,
    })
  }, [gridRef])

  const copyRow = useCallback(async (item: any) => {
    const value = [item.system_name, item.failure_type, item.title, item.severity, item.occurrence, item.detection, item.rpn, item.status]
      .map(compareValue)
      .join('\t')
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Failure vector copied to clipboard')
    } catch {
      toast.error('Failed to copy failure vector')
    }
  }, [])

  const { handleCellContextMenu } = useOperationalContextMenu({
    onOpenRowActionMenu: (item, point) => {
      dismissOverlays()
      setRowActionMenu({ item, point })
    },
  })

  useEffect(() => {
    if (activeOverlay !== 'rowAction' && rowActionMenu && activeOverlay !== null) setRowActionMenu(null)
  }, [activeOverlay, rowActionMenu])

  useOperationalDismissController({
    active: showBulkMenu || showDisplayMenu || showViewsMenu || Boolean(rowActionMenu),
    onDismiss: () => {
      dismissOverlays()
      setRowActionMenu(null)
    },
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
    hasRowActionMenu: Boolean(rowActionMenu),
  })

  const scopedActivityItems = useMemo(() => {
    const selected = selectedRows(modes, selectedIds)
    return selected.length ? selected : (modes || [])
  }, [modes, selectedIds])

  const activityStats = useMemo(() => scopedActivityItems.reduce((acc, mode) => ({
    incidents: acc.incidents + (mode.linked_rcas?.length || 0),
    causes: acc.causes + (mode.causes?.length || 0),
    mitigations: acc.mitigations + (mode.mitigations?.length || 0),
    prevention: acc.prevention + (mode.prevention_actions?.length || 0),
  }), { incidents: 0, causes: 0, mitigations: 0, prevention: 0 }), [scopedActivityItems])

  const compareItems = useMemo(() => selectedRows(modes, selectedIds), [modes, selectedIds])
  const compareEnabled = compareItems.length >= 2 && compareItems.length <= 5

  const rowActionSections = useMemo<OperationalRowActionSectionModel[]>(() => {
    if (!rowActionMenu?.item) return []
    const item = rowActionMenu.item
    return [
      {
        id: 'quickAccess',
        columns: 3,
        items: [
          { id: 'detail', label: 'Open details', icon: Eye, tone: 'info', onClick: () => { setRowActionMenu(null); onOpenDetail(Number(item.id)) } },
          { id: 'edit', label: 'Edit', icon: Edit2, tone: 'warning', onClick: () => { setRowActionMenu(null); onEdit(Number(item.id)) } },
          { id: 'copy', label: 'Copy row', icon: Copy, onClick: () => { setRowActionMenu(null); void copyRow(item) } },
        ],
      },
      {
        id: 'archive',
        columns: 1,
        items: [
          { id: 'retire', label: 'Retire failure vector', icon: Trash2, tone: 'danger', onClick: () => { setRowActionMenu(null); onRetireSelected([Number(item.id)]) } },
        ],
      },
    ]
  }, [copyRow, onEdit, onOpenDetail, onRetireSelected, rowActionMenu])

  const toolbarControls = (
    <>
      <ToolbarGroup>
        <div className="views-menu-container">
          <ToolbarButton active={showViewsMenu} onClick={() => toggleOverlay('views')} ref={viewsMenuButtonRef as any}>
            <LayoutGrid size={14} /> Views
          </ToolbarButton>
        </div>
        <div className="display-menu-container">
          <ToolbarButton active={showDisplayMenu} onClick={() => toggleOverlay('display')} ref={displayMenuButtonRef as any}>
            <Sliders size={14} /> Display
          </ToolbarButton>
        </div>
        <ToolbarIconButton onClick={onExport} title="Export CSV"><FileText size={16} /></ToolbarIconButton>
        <ToolbarIconButton onClick={onCopySelected} disabled={selectedIds.length === 0} title="Copy to Clipboard"><Clipboard size={16} /></ToolbarIconButton>
      </ToolbarGroup>
      <ToolbarGroup>
        <ToolbarButton active={showSystemFilters} onClick={() => setShowSystemFilters((current) => !current)} title="System filters">
          {showSystemFilters ? <EyeOff size={14} /> : <Eye size={14} />} Filters
        </ToolbarButton>
        <ToolbarButton active={showInsights} onClick={() => setShowInsights((current) => !current)} title="Reliability insights">
          <Activity size={14} /> Insights
        </ToolbarButton>
        <ToolbarButton active={showActivity} onClick={() => setShowActivity((current) => !current)} title="FAR activity summary">
          <Activity size={14} /> Activity
        </ToolbarButton>
        <ToolbarIconButton onClick={onRpnHelp} title="RPN Definition Matrix"><HelpCircle size={16} /></ToolbarIconButton>
      </ToolbarGroup>
    </>
  )

  const toolbarActions = (
    <ToolbarGroup>
      <ToolbarButton onClick={() => setCompareOpen(true)} disabled={!compareEnabled} active={compareOpen} title="Compare 2 to 5 selected failure modes">
        <GitCompare size={14} /> Compare
      </ToolbarButton>
      <div className="bulk-menu-container">
        <ToolbarButton
          onClick={() => toggleOverlay('bulk')}
          disabled={selectedIds.length === 0}
          active={showBulkMenu}
          title="Bulk actions"
          ref={bulkMenuButtonRef as any}
        >
          <Zap size={14} /> Bulk Actions{selectedIds.length ? ` (${selectedIds.length})` : ''}
        </ToolbarButton>
      </div>
      <ToolbarButton onClick={onImport} title="Import Bulk Risk Data"><Upload size={14} /> Import</ToolbarButton>
      <ToolbarIconButton onClick={onSettings} title="Matrix Registry Enums"><Settings size={16} /></ToolbarIconButton>
      <ToolbarButton variant="danger" onClick={onAdd}><ShieldAlert size={14} /> Add Failure Mode</ToolbarButton>
    </ToolbarGroup>
  )

  const floatingPanels = (
    <>
      <OperationalSavedViewsPanel
        isOpen={showViewsMenu}
        panelRef={viewsMenuPanelRef}
        panelStyle={viewsMenuStyle}
        entityLabel="FAR"
        onClose={dismissOverlays}
        activeViewId={activeViewId}
        currentViewName={normalizedViews.find((view) => view.id === activeViewId)?.name || 'Current FAR workspace'}
        newViewName={newViewName}
        onNewViewNameChange={setNewViewName}
        onCreateView={() => { void createView() }}
        onApplySystemDefault={() => {
          applyViewConfig(DEFAULT_FAR_VIEW_CONFIG)
          setActiveViewId(null)
          collaborativeViews.setViewLink(null)
        }}
        savedViews={savedViewPanelModels}
        defaultViewIds={FAR_SYSTEM_VIEW_IDS}
        onApplyView={applyView}
        onOverwriteView={(id) => { void overwriteView(id) }}
        onRenameView={renameView}
        onDeleteView={(id) => { void deleteView(id) }}
        describeView={describeSavedView}
        syncStatus={collaborativeViews.status}
        syncMessage={collaborativeViews.lastError || undefined}
        onCopyViewLink={(id) => { void collaborativeViews.copyViewLink(id && isRemoteWorkspaceViewId(id) ? id : null) }}
        conflictMessage={collaborativeViews.conflict?.message}
        onReloadConflict={() => {
          const serverView = collaborativeViews.conflict?.current
          collaborativeViews.reloadConflict()
          if (serverView) {
            applyViewConfig(serverView.config)
            setActiveViewId(serverView.id)
          }
        }}
        onSaveConflictCopy={() => { void collaborativeViews.saveConflictCopy() }}
      />

      <OperationalDisplayPanel
        isOpen={showDisplayMenu}
        panelRef={displayMenuPanelRef}
        panelStyle={displayMenuStyle}
        title="Display density"
        onClose={dismissOverlays}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        rowDensity={rowDensity}
        onRowDensityChange={setRowDensity}
        columns={columnDefs}
        hiddenColumns={hiddenColumns}
        onToggleColumn={toggleColumn}
      />

      <OperationalAnchoredPanel
        isOpen={showBulkMenu}
        panelKey="bulk-menu"
        panelRef={bulkMenuPanelRef}
        style={bulkMenuStyle}
        className="bulk-menu-container"
        yOffset={10}
      >
        <WorkspaceFloatingPanel kind="context" className="max-h-[560px] overflow-y-auto custom-scrollbar p-3">
          <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400">Bulk actions</p>
            <p className="pt-1 text-[12px] font-semibold text-slate-100">{selectedIds.length} failure modes selected</p>
          </div>
          <div className="space-y-2">
            <WorkspaceFlyoutActionCard title="Copy selected" active={false} onClick={() => { dismissOverlays(); onCopySelected() }} />
            <WorkspaceFlyoutActionCard title="Export selected" active={false} onClick={() => { dismissOverlays(); exportSelected() }} />
            <WorkspaceFlyoutActionCard title="Retire selected" active={false} onClick={() => { dismissOverlays(); onRetireSelected() }} />
          </div>
        </WorkspaceFloatingPanel>
      </OperationalAnchoredPanel>

      {rowActionMenu ? (
        <OperationalRowActionMenu
          meta={`FAR-${rowActionMenu.item.id}`}
          title={rowActionMenu.item.title || 'Failure vector'}
          onClose={() => setRowActionMenu(null)}
          sections={rowActionSections}
          cursorX={rowActionMenu.point.x}
          cursorY={rowActionMenu.point.y}
        />
      ) : null}
    </>
  )

  const activityPanel = (
    <AnimatePresence>
      {showActivity ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="shrink-0 overflow-hidden"
          data-testid="far-activity-panel"
        >
          <div className="glass-panel rounded-lg border border-white/5 bg-[#0a0c14]/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400">FAR Activity</p>
                <p className="pt-1 text-[11px] font-semibold text-slate-100">
                  {selectedIds.length ? `${selectedIds.length} selected failure modes` : `${scopedActivityItems.length} visible failure modes`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Incidents', activityStats.incidents],
                  ['Root causes', activityStats.causes],
                  ['Mitigations', activityStats.mitigations],
                  ['Prevention', activityStats.prevention],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-white/5 bg-black/30 px-4 py-2 text-center">
                    <p className="text-[9px] font-semibold text-slate-500">{label}</p>
                    <p className="pt-1 text-sm font-black text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  const compareModal = (
    <WorkspaceModal
      isOpen={compareOpen}
      onClose={() => setCompareOpen(false)}
      size="workspace"
      title="Compare Failure Modes"
      subtitle={`Risk-vector comparison · ${compareItems.length} selected records`}
      icon={<GitCompare size={20} />}
    >
      <WorkspaceCompareShell
        body={
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {compareItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/5 bg-black/40 p-5 shadow-inner">
                <div className="mb-4 border-b border-white/5 pb-3">
                  <p className="text-[9px] font-semibold text-slate-500">FAR-{item.id}</p>
                  <h3 className="pt-1 text-sm font-semibold text-slate-100">{item.title}</h3>
                </div>
                <div className="space-y-2">
                  {[
                    ['System', item.system_name],
                    ['Type', item.failure_type],
                    ['Status', item.status],
                    ['RPN', item.rpn],
                    ['Severity', item.severity],
                    ['Occurrence', item.occurrence],
                    ['Detection', item.detection],
                    ['Root causes', item.causes?.length || 0],
                    ['Mitigations', item.mitigations?.length || 0],
                    ['Prevention', item.prevention_actions?.length || 0],
                    ['Incidents', item.linked_rcas?.length || 0],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                      <span className="text-[9px] font-semibold text-slate-500">{label}</span>
                      <span className="text-right text-[10px] font-semibold text-slate-200">{compareValue(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        }
      />
    </WorkspaceModal>
  )

  return {
    toolbarControls,
    toolbarActions,
    floatingPanels,
    activityPanel,
    compareModal,
    gridRuntime,
    contextMenu: { handleCellContextMenu },
  }
}
