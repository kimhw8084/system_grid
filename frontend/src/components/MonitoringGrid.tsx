import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { javascript } from '@codemirror/lang-javascript'
import { 
  Activity, Plus, Search, Filter, ExternalLink, 
  Trash2, Edit2, Shield, Cpu, Database, Network, 
  Globe, Bell, Info, ChevronRight, X, Check, Save,
  AlertCircle, Clock, Zap, Settings, ArrowRightLeft, Briefcase, UserCheck, Code,
  BookOpen, Eye, EyeOff, FileText, User, Users, Mail, MessageSquare, Monitor, MoreVertical,
  Download, Copy, ChevronDown, ChevronUp, Layers, RefreshCcw, Tag, Sliders, Clipboard, Lightbulb, Maximize2, Minimize2, Star, GitCompare, Undo2, List, LayoutGrid, Upload, Terminal, History as HistoryIcon, Edit2 as EditIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from "ag-grid-react"
import toast from 'react-hot-toast'
import { showWorkspaceToast } from './shared/WorkspaceToast'
import { apiFetch } from '../api/apiClient'
import { formatAppDate, formatAppTime, formatAppDay, parseAppDate } from '../utils/dateUtils'
import { AppDropdown } from './shared/AppDropdown'
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { MONITORING_WORKSPACE_STANDARD } from './shared/OperationalWorkspace'
import { WorkspaceModal } from './shared/WorkspaceModal'
import {
  WorkspaceCollapsibleHeader,
  WorkspaceEmptyState,
  WorkspaceFieldError as FieldError,
  WorkspaceFieldLabel as FieldLabel,
  WorkspaceFloatingPanel,
  WorkspaceHoverPreview as HoverPreview,
  WorkspaceInfoTooltip,
  WorkspaceSectionBadge,
  WorkspaceModalFooter,
  WorkspaceModalHeader,
  WorkspacePanelHint as PanelHint,
  WorkspacePanelSubtitle as PanelSubtitle,
  WorkspacePanelTitle as PanelTitle,
  WorkspaceSectionCard,
  WorkspaceSelectField as MonitoringSelectField,
  WorkspaceSplitView,
  WorkspaceValidationBanner,
  getWorkspaceModalFrameClass,
  getWorkspaceModalShellClass,
  getWorkspaceInputClass,
  useWorkspaceAnchoredLayer,
  useEscapeDismiss,
  useBodyModalFlag,
} from './shared/OperationalWorkspacePrimitives'
import { StatusPill } from './shared/StatusPill'
import { PageHeader, ToolbarButton, ToolbarGroup, ToolbarIconButton, ToolbarSearch, ToolbarSegmented } from './shared/LayoutPrimitives'
import { WorkspaceCommandBar } from './shared/WorkspaceCommandBar'
import { useOperationalGridLayout, usePersistentJsonState, useWorkspaceDismissHandlers, useWorkspaceSessionValue } from './shared/OperationalWorkspaceHooks'
import { WorkspaceCompareShell, WorkspaceDossierShell, WorkspaceHistoryShell } from './shared/WorkspaceModalShells'
import { OperationalImportModal } from './shared/OperationalImportModal'
import {
  applyOperationalColumnSizing,
  applyOperationalColumnState,
  autoSizeOperationalColumns,
  getOperationalColumnLayoutSnapshot,
  normalizeOperationalColumnLayout,
  OPERATIONAL_GRID_AUTO_SIZE_STRATEGY
} from './shared/OperationalGridSizing'

const MONITORING_VIEW_STORAGE_KEY = 'sysgrid_monitoring_views_v1'
const MONITORING_ACTIVE_VIEW_KEY = 'sysgrid_monitoring_active_view_v1'
const MONITORING_FAVORITES_STORAGE_KEY = 'sysgrid_monitoring_favorites_v1'
const MONITORING_UI_STATE_KEY = 'sysgrid_monitoring_ui_state_v1'
const MONITORING_WATCH_STORAGE_KEY = 'sysgrid_monitoring_watch_v1'
const BULK_MENU_MAX_HEIGHT = 560
const MONITORING_FIXED_WIDTH_COLUMN_IDS = new Set([
  'select',
  'id',
  'recent_change',
  'favorite',
  'watch',
  'is_active',
  'check_interval',
  'row_actions',
])

const STATUSES = [
  { value: 'Existing', label: 'Existing', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'Planned', label: 'Planned', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { value: 'Decommissioned', label: 'Decommissioned', color: 'bg-slate-500/20 text-slate-400 border-white/20' },
  { value: 'Deleted', label: 'Deleted', color: 'bg-slate-800 text-slate-500 border-white/5' }
]

const MONITORING_SEVERITIES = [
  { value: 'Critical', label: 'Critical', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { value: 'Warning', label: 'Warning', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'Info', label: 'Info', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' }
]

const MONITORING_OWNER_ROLES = [
  { value: 'Primary Support', label: 'Primary Support' },
  { value: 'Escalation', label: 'Escalation' },
  { value: 'Observer', label: 'Observer' }
]

const CHECK_INTERVAL_MIN = 15
const CHECK_INTERVAL_MAX = 86400
const ALERT_DURATION_MIN = 0
const ALERT_DURATION_MAX = 86400
const NOTIFICATION_THROTTLE_MIN = 60
const NOTIFICATION_THROTTLE_MAX = 604800

interface MonitoringLogicEntry {
  id: number
  type: 'Threshold' | 'Regex' | 'Query' | 'Health Check' | 'Log Pattern' | 'Synthetic' | 'Custom'
  description: string
  logic_info: string
}

interface MonitoringOwner {
  operator_id: number
  role: string
  name?: string | null
  external_id?: string | null
}

interface OperatorRecord {
  id: number
  full_name?: string | null
  username?: string | null
  external_id?: string | null
  team?: string | null
  team_id?: number | null
  email?: string | null
}

interface MonitoringTeamOption {
  id: number
  name: string
  description?: string | null
  source?: string | null
  operators?: Array<{ id: number; external_id?: string | null }>
}

const MONITORING_REQUIRED_FIELD_NAMES = new Set(['title', 'category', 'status', 'severity'])

const DEFAULT_MONITORING_VIEWS = []
const DEFAULT_MONITORING_VIEW_IDS = new Set(DEFAULT_MONITORING_VIEWS.map((view) => view.id))
const MONITORING_SUPPORTS_COMPARE = MONITORING_WORKSPACE_STANDARD.sharedCapabilities.includes('compare')

const slugifyViewId = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `view-${Date.now()}`

const FLOATING_PANEL_EDGE = 16

const getAnchoredFloatingStyle = ({
  rect,
  width,
  height,
  zIndex,
  offset = 4
}: {
  rect: DOMRect
  width: number
  height: number
  zIndex: number
  offset?: number
}) => {
  const vW = window.innerWidth
  const vH = window.innerHeight
  
  // Pivot logic: align right edge of menu to right edge of trigger
  let left = rect.right - width
  let top = rect.bottom + offset

  // Viewport containment and flipping
  if (left < FLOATING_PANEL_EDGE) left = rect.left
  if (top + height > vH - FLOATING_PANEL_EDGE) top = rect.top - height - offset
  
  left = Math.max(FLOATING_PANEL_EDGE, Math.min(left, vW - width - FLOATING_PANEL_EDGE))
  top = Math.max(FLOATING_PANEL_EDGE, Math.min(top, vH - height - FLOATING_PANEL_EDGE))

  return {
    position: 'fixed' as const,
    top: Math.floor(top),
    left: Math.floor(left),
    width,
    maxHeight: `calc(100vh - ${FLOATING_PANEL_EDGE * 2}px)`,
    zIndex
  }
}

const getPointFloatingStyle = ({
  x,
  y,
  width,
  height,
  zIndex,
  offset = 0
}: {
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  offset?: number
}) => {
  const vW = window.innerWidth
  const vH = window.innerHeight

  const style: any = {
    position: 'fixed' as const,
    width,
    maxHeight: `calc(100vh - ${FLOATING_PANEL_EDGE * 2}px)`,
    zIndex
  }

  // Horizontal positioning
  if (x + width > vW - FLOATING_PANEL_EDGE) {
    style.right = vW - x
  } else {
    style.left = Math.max(FLOATING_PANEL_EDGE, x)
  }

  // Vertical positioning
  if (y + height > vH - FLOATING_PANEL_EDGE) {
    style.bottom = vH - y
  } else {
    style.top = Math.max(FLOATING_PANEL_EDGE, y)
  }

  return style
}

// Isolated component to prevent UI state changes (menus) from triggering AgGrid recalculations
const GridMatrix = React.memo(({ 
  gridRef, 
  rowData, 
  columnDefs, 
  autoSizeStrategy,
  colResizeDefault,
  fontSize, 
  rowDensity, 
  context,
  getRowId,
  onGridReady,
  onSelectionChanged,
  onColumnResized,
  onColumnMoved,
  onDragStopped,
  onColumnPinned,
  onColumnVisible,
  onFilterChanged,
  onSortChanged,
  onRowClicked,
  onRowDoubleClicked,
  onCellContextMenu,
  getRowClass,
  onFirstDataRendered,
  onRowDataUpdated
}: any) => {
  const apiRef = useRef<any>(null)

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    suppressMovable: false
  }), [])

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.refreshCells({ force: true })
    }
  }, [context])

  return (
    <AgGridReact
      ref={(ref) => {
        apiRef.current = ref?.api
        if (gridRef) {
          if (typeof gridRef === 'function') gridRef(ref)
          else gridRef.current = ref
        }
      }}
      rowData={rowData}
      columnDefs={columnDefs}
      autoSizeStrategy={autoSizeStrategy}
      colResizeDefault={colResizeDefault}
      defaultColDef={defaultColDef}
      getRowId={getRowId}
      rowSelection="multiple"
      animateRows={true}
      headerHeight={fontSize + rowDensity + 10}
      rowHeight={fontSize + rowDensity + 4}
      context={context}
      onGridReady={onGridReady}
      onSelectionChanged={onSelectionChanged}
      onColumnResized={onColumnResized}
      onColumnMoved={onColumnMoved}
      onDragStopped={onDragStopped}
      onColumnPinned={onColumnPinned}
      onColumnVisible={onColumnVisible}
      onFilterChanged={onFilterChanged}
      onSortChanged={onSortChanged}
      onRowClicked={onRowClicked}
      onRowDoubleClicked={onRowDoubleClicked}
      onCellContextMenu={onCellContextMenu}
      getRowClass={getRowClass}
      onFirstDataRendered={onFirstDataRendered}
      onRowDataUpdated={onRowDataUpdated}
      suppressScrollOnNewData={true}
      suppressCellFocus={true}
      suppressRowClickSelection={true}
      enableCellTextSelection={true}
      suppressMovableColumns={false}
      ensureDomOrder={true}
      overlayNoRowsTemplate="<span class='text-slate-500 font-semibold text-[10px]'>No monitoring data found</span>"
    />
  )
}, (prev, next) => {
  return prev.rowData === next.rowData && 
         prev.columnDefs === next.columnDefs && 
         prev.fontSize === next.fontSize && 
         prev.rowDensity === next.rowDensity &&
         prev.context?.favoriteIds === next.context?.favoriteIds &&
         prev.context?.watchIds === next.context?.watchIds
})
GridMatrix.displayName = 'GridMatrix'


const getMonitorGroupValue = (item: any, field: string) => {
  if (field === 'notification_method') return item.notification_method || 'No notification path'
  return item[field] || 'Unspecified'
}

const readMonitoringUiState = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(MONITORING_UI_STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

interface MonitoringRecoveryDoc {
  id: number
  note?: string
  added_at?: string
}

const sanitizeMonitoringPayload = (item: any) => {
  if (!item) return item
  const next = { ...item }
  delete next.created_at
  delete next.updated_at
  delete next.version
  delete next.is_deleted
  delete next.device_name
  delete next.recovery_doc_titles
  delete next.recovery_doc_details
  delete next.monitored_service_names

  // Deep sanitize logic_json
  if (Array.isArray(next.logic_json)) {
    next.logic_json = next.logic_json.map((entry: any) => ({
      ...entry,
      id: typeof entry.id === 'string' ? parseInt(entry.id.replace(/\D/g, '') || '0', 10) : Number(entry.id)
    }))
  }

  // Deep sanitize owners
  if (Array.isArray(next.owners)) {
    next.owners = next.owners
      .filter((o: any) => o.operator_id !== null && o.operator_id !== undefined)
      .map((o: any) => ({
        ...o,
        operator_id: Number(o.operator_id)
      }))
  }

  // Deep sanitize recovery_docs
  if (Array.isArray(next.recovery_docs)) {
    next.recovery_docs = next.recovery_docs.map((d: any) => {
      if (typeof d === 'number') return { id: d }
      return { 
        id: Number(d.id), 
        note: d.note || '',
        added_at: d.added_at || null
      }
    })
  }

  return next
}

const ObservabilityHUD = ({ items }: any) => {
  const stats = useMemo(() => {
    if (!items?.length) return null
    const active = items.filter((i: any) => i.status === 'Existing').length
    const critical = items.filter((i: any) => i.severity === 'Critical' || i.severity === 'S1').length
    const recent = items.filter((i: any) => {
      const updated = parseAppDate(i.updated_at)
      return updated ? (new Date().getTime() - updated.getTime() < 3600000) : false // 1 hour
    }).length
    return { active, critical, recent }
  }, [items])

  if (!stats) return null

  return (
    <div className="grid grid-cols-4 gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
       <div className="bg-black/40 border border-white/5 p-6 rounded-lg backdrop-blur-xl shadow-xl group hover:border-blue-500/20 transition-all">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover:text-blue-400 transition-colors">Global Pulse</p>
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/20">
                <Activity size={24} className="animate-pulse" />
             </div>
             <div>
                <h4 className="text-2xl font-black text-white tracking-tighter">{stats.active} Active Traces</h4>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Live Infrastructure Monitoring</p>
             </div>
          </div>
       </div>
       <div className="bg-black/40 border border-white/5 p-6 rounded-lg backdrop-blur-xl shadow-xl group hover:border-rose-500/20 transition-all">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover:text-rose-400 transition-colors">Alert Flux</p>
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-rose-600/10 rounded-lg flex items-center justify-center text-rose-500 border border-rose-500/20">
                <Bell size={24} className={stats.critical > 0 ? 'animate-bounce' : ''} />
             </div>
             <div>
                <h4 className="text-2xl font-black text-white tracking-tighter">{stats.critical} Critical Events</h4>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Immediate Intervention Required</p>
             </div>
          </div>
       </div>
       <div className="bg-black/40 border border-white/5 p-6 rounded-lg backdrop-blur-xl shadow-xl group hover:border-emerald-500/20 transition-all">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover:text-emerald-400 transition-colors">Discovery Momentum</p>
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-emerald-600/10 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Zap size={24} />
             </div>
             <div>
                <h4 className="text-2xl font-black text-white tracking-tighter">{stats.recent} New Signals</h4>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Captured in current session</p>
             </div>
          </div>
       </div>
       <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-lg backdrop-blur-xl shadow-xl flex items-center justify-between group hover:bg-indigo-600/20 transition-all">
          <div>
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Health Stability</p>
             <h4 className="text-2xl font-black text-white tracking-tighter">{stats.critical === 0 ? 'Optimal' : 'Degraded'}</h4>
          </div>
          <Shield size={28} className="text-indigo-500 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all" />
       </div>
    </div>
  )
}

export default function MonitoringGrid() {
  const persistedUiState = readMonitoringUiState()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const idParam = searchParams.get('id')
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  
  // --- STYLE LABORATORY STATE ---
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(8)
  const [showDisplayMenu, setShowDisplayMenu] = useState(false)
  const [showViewsMenu, setShowViewsMenu] = useState(false)
  const [showRegistry, setShowRegistry] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(persistedUiState?.hiddenColumns ?? ['created_at', 'updated_at'])
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>(persistedUiState?.activeTab === 'deleted' ? 'deleted' : 'active')
  const [showFilterBar, setShowFilterBar] = useState<boolean>(persistedUiState?.showFilterBar ?? true)

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [historyItem, setHistoryItem] = useState<any>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [recipientPopup, setRecipientPopup] = useState<{ recipients: string[], method: string } | null>(null)
  const [bkmPopup, setBkmPopup] = useState<{ ids: number[], titles: string[], monitorId?: number } | null>(null)
  const [activeBkm, setActiveBkm] = useState<any>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [isBulkSeverityOpen, setIsBulkSeverityOpen] = useState(false)
  const [isBulkNotifyOpen, setIsBulkNotifyOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' })
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [detailDeleteConfirm, setDetailDeleteConfirm] = useState(false)
  const [rowDeleteConfirmId, setRowDeleteConfirmId] = useState<number | null>(null)
  const [rowActionMenu, setRowActionMenu] = useState<{ item: any; style: React.CSSProperties } | null>(null)
  const [isIntelligenceExpanded, setIsIntelligenceExpanded] = useState(false)
  const [gridFilterModel, setGridFilterModel] = useState<Record<string, any>>({})
  const [gridSortModel, setGridSortModel] = useState<any[]>([{ colId: 'favorite', sort: 'desc' }])
  const [savedViews, setSavedViews] = usePersistentJsonState<any[]>(MONITORING_VIEW_STORAGE_KEY, () => {
    const parsed = typeof window !== 'undefined' ? (() => {
      try {
        const raw = window.localStorage.getItem(MONITORING_VIEW_STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    })() : []
    const systemIds = new Set(DEFAULT_MONITORING_VIEWS.map((view) => view.id))
    const legacyIds = new Set(['ops', 'incident', 'recovery'])
    const customViews = Array.isArray(parsed) ? parsed.filter((view: any) => !systemIds.has(view.id) && !legacyIds.has(view.id)) : []
    return [
      ...DEFAULT_MONITORING_VIEWS.map((view) => Array.isArray(parsed) ? parsed.find((entry: any) => entry.id === view.id) || view : view),
      ...customViews,
    ]
  })
  const [activeViewId, setActiveViewId] = useWorkspaceSessionValue<string | null>(
    'sysgrid_monitoring_session_init',
    null,
    () => (typeof window === 'undefined' ? null : window.localStorage.getItem(MONITORING_ACTIVE_VIEW_KEY))
  )
  const [favoriteIds, setFavoriteIds] = usePersistentJsonState<number[]>(MONITORING_FAVORITES_STORAGE_KEY, [])
  const [watchIds, setWatchIds] = usePersistentJsonState<number[]>(MONITORING_WATCH_STORAGE_KEY, [])
  const [quickFilters, setQuickFilters] = useState({ status: [] as string[], severity: [] as string[], platform: [] as string[], owner: [] as string[] })
  const [groupBy, setGroupBy] = useState<string>('raw')
  const [bulkDraft, setBulkDraft] = useState({ status: '', severity: '', notification_method: '' })
  const [expandedBulkSection, setExpandedBulkSection] = useState<'status' | 'severity' | 'notification' | null>(null)
  const [lastVisitedAt] = useState<number>(() => persistedUiState?.lastVisitedAt ?? 0)
  const [pendingIds, setPendingIds] = useState<number[]>([])
  const selectionAnchorRef = useRef<number | null>(null)
  const displayMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const viewsMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const bulkMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const [displayMenuStyle, setDisplayMenuStyle] = useState<React.CSSProperties>({})
  const [viewsMenuStyle, setViewsMenuStyle] = useState<React.CSSProperties>({})
  const [bulkMenuStyle, setBulkMenuStyle] = useState<React.CSSProperties>({})
  const lastUndoRef = useRef<any>(null)
  const [newViewName, setNewViewName] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const autoSizeFrameRef = useRef<number | null>(null)
  const autoSizeTimeoutRef = useRef<number | null>(null)
  const preserveExplicitColumnWidthsRef = useRef(false)
  const {
    columnLayoutState,
    setColumnLayoutState,
    setTransientManualColumnWidths,
    preserveExplicitColumnWidths,
    syncColumnLayoutState,
    applyColumnLayoutState,
    handleColumnResized,
  } = useOperationalGridLayout(persistedUiState?.columnLayoutState ?? [], Boolean(activeViewId))

  const groupSelectionsRef = useRef<Record<string, number[]>>({})

  useEffect(() => {
    preserveExplicitColumnWidthsRef.current = preserveExplicitColumnWidths
  }, [preserveExplicitColumnWidths])

  const clearPendingAutoSize = useCallback(() => {
    if (autoSizeFrameRef.current !== null) {
      window.cancelAnimationFrame(autoSizeFrameRef.current)
      autoSizeFrameRef.current = null
    }
    if (autoSizeTimeoutRef.current !== null) {
      window.clearTimeout(autoSizeTimeoutRef.current)
      autoSizeTimeoutRef.current = null
    }
  }, [])

  useEffect(() => clearPendingAutoSize, [clearPendingAutoSize])

  useEffect(() => {
    setSelectedIds([])
    groupSelectionsRef.current = {}
  }, [groupBy])

  const handleSelectionChanged = useCallback((e: any, groupKey: string = 'raw') => {
    const selectedNodes = e?.api?.getSelectedNodes?.() || []
    const ids = selectedNodes.map((n: any) => n.data?.id).filter(Boolean)
    
    groupSelectionsRef.current[groupKey] = ids
    
    // Aggregate all selections from all groups
    const allSelected = Array.from(new Set(Object.values(groupSelectionsRef.current).flat()))
    setSelectedIds(allSelected)
  }, [])

  const handleColumnMoved = useCallback((event: any) => {
    if (!event.source.includes('drag')) syncColumnLayoutState(event.api)
  }, [syncColumnLayoutState])

  const handleDragStopped = useCallback((event: any) => syncColumnLayoutState(event.api), [syncColumnLayoutState])
  const handleColumnPinned = useCallback((event: any) => syncColumnLayoutState(event.api), [syncColumnLayoutState])
  const handleColumnVisible = useCallback((event: any) => syncColumnLayoutState(event.api), [syncColumnLayoutState])
  const handleFilterChanged = useCallback((e: any) => setGridFilterModel(e.api.getFilterModel() || {}), [])
  const handleMonitoringColumnResized = useCallback((event: any) => {
    const source = event?.source || ''
    const isAutoResizeSource =
      source === 'autosizeColumns' ||
      source === 'sizeColumnsToFit' ||
      source === 'api' ||
      source === 'flex'

    if (!isAutoResizeSource) {
      clearPendingAutoSize()
      setTransientManualColumnWidths(true)
    }

    handleColumnResized(event)
  }, [clearPendingAutoSize, handleColumnResized, setTransientManualColumnWidths])
  
  const handleSortChanged = useCallback((e: any) => {
    const nextSortModel = e.api.getColumnState().filter((col: any) => col.sort).map((col: any) => ({ colId: col.colId, sort: col.sort }))
    setGridSortModel(nextSortModel)
  }, [])

  const handleRowId = useCallback((params: any) => String(params.data.id), [])

  const openRowActionMenuAtPoint = useCallback((item: any, x: number, y: number) => {
    setRowActionMenu({
      item,
      style: getPointFloatingStyle({ x, y, width: 336, height: 432, zIndex: 1115 })
    })
  }, [])

  const handleCellContextMenu = useCallback((e: any) => {
    if (!e?.data) return
    const mouseEvent = e.event as MouseEvent
    mouseEvent?.preventDefault?.()
    openRowActionMenuAtPoint(e.data, mouseEvent.clientX, mouseEvent.clientY)
  }, [openRowActionMenuAtPoint])

  const handleGridReady = useCallback((event: any) => {
    if (typeof window !== 'undefined') {
      ;(window as any).__DEBUG_MONITORING_GRID_API__ = event.api
    }
    // Immediately apply layout if we have it to prevent squish
    if (columnLayoutState.length > 0) {
      applyOperationalColumnState(event.api, columnLayoutState, preserveExplicitColumnWidths)
    }
  }, [columnLayoutState, preserveExplicitColumnWidths])

  const autoSizeMonitoringColumns = useCallback(() => {
    if (!gridRef.current?.api || preserveExplicitColumnWidthsRef.current) return
    clearPendingAutoSize()
    const run = () => {
      if (!gridRef.current?.api || preserveExplicitColumnWidthsRef.current) return
      autoSizeOperationalColumns({
        api: gridRef.current.api,
        skipColumnIds: Array.from(MONITORING_FIXED_WIDTH_COLUMN_IDS),
        onSized: () => {
          if (!gridRef.current?.api || preserveExplicitColumnWidthsRef.current) return
          syncColumnLayoutState(gridRef.current.api, false)
        }
      })
    }
    autoSizeFrameRef.current = window.requestAnimationFrame(() => {
      autoSizeFrameRef.current = null
      run()
    })
    autoSizeTimeoutRef.current = window.setTimeout(() => {
      autoSizeTimeoutRef.current = null
      run()
    }, 48)
  }, [clearPendingAutoSize, syncColumnLayoutState])

  const handleGridDataUpdated = useCallback(() => {
    autoSizeMonitoringColumns()
  }, [autoSizeMonitoringColumns])

  const getRowClass = useCallback((params: any) => {
    let classes = params.node.rowIndex % 2 === 0 ? 'monitoring-grid-row-even' : 'monitoring-grid-row-odd'
    if (params.data && pendingIds.includes(params.data.id)) {
      classes += ' row-ghost opacity-40 grayscale pointer-events-none'
    }
    return classes
  }, [pendingIds])

  const { data: settingsOptions } = useQuery({ 
    queryKey: ['settings-options'], 
    queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) 
  })
  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await (await apiFetch('/api/v1/settings/operators')).json())
  })
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => (await (await apiFetch('/api/v1/settings/teams')).json())
  })

  const categories = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "MonitoringCategory") : [], [settingsOptions])
  const platforms = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "MonitoringPlatform") : [], [settingsOptions])
  const notificationMethods = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "NotificationMethod") : [], [settingsOptions])
  const severities = MONITORING_SEVERITIES
  const ownerRoles = MONITORING_OWNER_ROLES

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: any = 'danger') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant })
  }

  const openRowActionMenu = (event: React.MouseEvent, item: any) => {
    event.stopPropagation()
    openRowActionMenuAtPoint(item, event.clientX, event.clientY)
  }

  const positionUtilityWindow = (button: HTMLButtonElement | null, width: number, height: number, zIndex: number) => {
    if (!button) {
      return {
        position: 'fixed' as const,
        top: 120,
        left: Math.max(FLOATING_PANEL_EDGE, window.innerWidth - width - 40),
        width,
        maxHeight: `calc(100vh - ${FLOATING_PANEL_EDGE * 2}px)`,
        zIndex
      }
    }
    return getAnchoredFloatingStyle({ rect: button.getBoundingClientRect(), width, height, zIndex })
  }

  const toggleBulkWindow = () => {
    setShowBulkMenu((current) => {
      if (current) return false
      setBulkMenuStyle(positionUtilityWindow(bulkMenuButtonRef.current, 340, BULK_MENU_MAX_HEIGHT, 1105))
      return true
    })
  }

  const toggleFavorite = useCallback((monitorId: number) => {
    const id = Number(monitorId)
    setFavoriteIds((current) => current.includes(id) ? current.filter((i) => i !== id) : [...current, id])
  }, [])

  const toggleWatch = useCallback((monitorId: number) => {
    const id = Number(monitorId)
    setWatchIds((current) => current.includes(id) ? current.filter((i) => i !== id) : [...current, id])
  }, [])

  const openCompare = () => {
    if (selectedIds.length < 2 || selectedIds.length > 5) return
    setCompareOpen(true)
  }

  const shouldIgnoreRowSelection = (target: EventTarget | null) => {
    const element = target as HTMLElement | null
    if (!element) return false
    return Boolean(
      element.closest('button, a, input, textarea, select, label') ||
      element.closest('.ag-selection-checkbox') ||
      element.closest('.ag-checkbox-input-wrapper') ||
      element.closest('.row-action-menu-container')
    )
  }

  const handleRowClicked = useCallback((event: any) => {
    if (!event?.node || shouldIgnoreRowSelection(event.event?.target)) return
    if (event.data && pendingIds.includes(event.data.id)) return
    const mouseEvent = event.event as MouseEvent | undefined
    const isToggleSelection = Boolean(mouseEvent?.metaKey || mouseEvent?.ctrlKey)
    const isRangeSelection = Boolean(mouseEvent?.shiftKey)

    if (isRangeSelection && selectionAnchorRef.current !== null) {
      const currentIndex = event.node.rowIndex
      if (currentIndex === null || currentIndex === undefined) return

      const start = Math.min(selectionAnchorRef.current, currentIndex)
      const end = Math.max(selectionAnchorRef.current, currentIndex)
      event.api.deselectAll()
      event.api.forEachNodeAfterFilterAndSort((node: any) => {
        if (node.rowIndex >= start && node.rowIndex <= end && !pendingIds.includes(node.data?.id)) {
          node.setSelected(true)
        }
      })
      return
    }

    if (isToggleSelection) {
      event.node.setSelected(!event.node.isSelected())
      selectionAnchorRef.current = event.node.rowIndex
      return
    }

    event.api.deselectAll()
    event.node.setSelected(true)
    selectionAnchorRef.current = event.node.rowIndex
  }, [pendingIds])

  const handleRowDoubleClicked = useCallback((event: any) => {
    if (!event?.data || shouldIgnoreRowSelection(event.event?.target)) return
    if (pendingIds.includes(event.data.id)) return
    setDetailItem(event.data)
  }, [pendingIds])

  const openRecoveryDocuments = (item: any) => {
    setBkmPopup({
      ids: item.recovery_docs || [],
      titles: item.recovery_doc_titles || [],
      monitorId: item.id
    })
  }

  const renderPrimaryRowActions = (item: any) => {
    const isPending = pendingIds.includes(item.id)
    return (
      <div className={`flex items-center justify-end gap-1.5 pr-2 ${isPending ? 'opacity-20 grayscale pointer-events-none' : ''}`}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setDetailItem(item)
          }}
          title="Open details"
          className="rounded-lg p-1 text-blue-400 transition-all hover:bg-blue-400/10 active:scale-90"
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setEditingItem(item)
            setIsFormOpen(true)
          }}
          title="Edit configuration"
          className="rounded-lg p-1 text-emerald-400 transition-all hover:bg-emerald-400/10 active:scale-90"
        >
          <Edit2 size={13} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setHistoryItem(item)
          }}
          title="View history"
          className="rounded-lg p-1 text-amber-400 transition-all hover:bg-amber-400/10 active:scale-90"
        >
          <Clock size={13} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            openRecoveryDocuments(item)
          }}
          title="Knowledge documents"
          className="rounded-lg p-1 text-purple-400 transition-all hover:bg-purple-400/10 active:scale-90"
        >
          <BookOpen size={13} />
        </button>
        <button
          type="button"
          onClick={(event: any) => openRowActionMenu(event, item)}
          title="More actions"
          className="row-action-trigger row-action-menu-container rounded-lg p-1 text-slate-400 transition-all hover:bg-slate-400/10 hover:text-white active:scale-90"
        >
          <MoreVertical size={13} />
        </button>
      </div>
    )
  }

  const handleExportCSV = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `SysGrid_Monitoring_${new Date().toISOString().split('T')[0]}.csv`,
        allColumns: false,
        onlySelected: false
      })
    }
  }

  const handleCopyToClipboard = () => {
    if (gridRef.current?.api) {
      const csvData = gridRef.current.api.getDataAsCsv({
        allColumns: false,
        onlySelected: true,
        suppressQuotes: true
      })
      if (csvData) {
        navigator.clipboard.writeText(csvData)
          .then(() => showWorkspaceToast("Table data copied to clipboard"))
          .catch(() => showWorkspaceToast("Failed to copy data", { type: 'error' }))
      }
    }
  }

  const buildCurrentViewConfig = () => ({
    fontSize,
    rowDensity,
    hiddenColumns,
    groupBy,
    showFilterBar,
    columnLayoutState: getOperationalColumnLayoutSnapshot(gridRef.current?.api, true) || columnLayoutState,
    quickFilter: searchTerm,
    quickFilters,
    filterModel: gridRef.current?.api?.getFilterModel?.() || gridFilterModel,
    sortModel: gridRef.current?.api?.getColumnState?.()
      ?.filter((col: any) => col.sort)
      .map((col: any) => ({ colId: col.colId, sort: col.sort })) || gridSortModel
  })

  const applySavedView = (viewId: string) => {
    const nextView = savedViews.find((view) => view.id === viewId)
    if (!nextView) return
    const config = nextView.config || {}
    setFontSize(config.fontSize ?? 11)
    setRowDensity(config.rowDensity ?? 8)
    setHiddenColumns(config.hiddenColumns ?? [])
    setGroupBy(config.groupBy ?? 'raw')
    setShowFilterBar(config.showFilterBar ?? true)
    setColumnLayoutState(config.columnLayoutState ?? [])
    setTransientManualColumnWidths(false)
    setSearchTerm(config.quickFilter ?? '')
    setQuickFilters(config.quickFilters ?? { status: [] as string[], severity: [] as string[], platform: [] as string[], owner: [] as string[] })
    setGridFilterModel(config.filterModel ?? {})
    setGridSortModel(config.sortModel ?? [{ colId: 'favorite', sort: 'desc' }])
    setActiveViewId(viewId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MONITORING_ACTIVE_VIEW_KEY, viewId)
    }
    requestAnimationFrame(() => {
      if (gridRef.current?.api) {
        if (Array.isArray(config.columnLayoutState) && config.columnLayoutState.length) {
          applyOperationalColumnState(gridRef.current.api, config.columnLayoutState, true)
        } else {
          applyColumnLayoutState(gridRef.current.api)
        }
        gridRef.current.api.setFilterModel(config.filterModel ?? {})
      }
    })
  }

  const saveCurrentToView = (viewId: string) => {
    const nextViews = savedViews.map((view) => (
      view.id === viewId
        ? { ...view, config: buildCurrentViewConfig() }
        : view
    ))
    setSavedViews(nextViews)
    setActiveViewId(viewId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MONITORING_VIEW_STORAGE_KEY, JSON.stringify(nextViews))
      window.localStorage.setItem(MONITORING_ACTIVE_VIEW_KEY, viewId)
    }
    showWorkspaceToast(`Saved current table to ${nextViews.find((view) => view.id === viewId)?.name}`)
  }

  const createViewFromCurrent = () => {
    const trimmed = newViewName.trim()
    if (!trimmed) {
      showWorkspaceToast('Enter a name for the new view', { type: 'error' })
      return
    }
    const nextIdBase = slugifyViewId(trimmed)
    let nextId = nextIdBase
    let suffix = 2
    while (savedViews.some((view) => view.id === nextId)) {
      nextId = `${nextIdBase}-${suffix++}`
    }
    const nextView = {
      id: nextId,
      name: trimmed,
      config: buildCurrentViewConfig()
    }
    const nextViews = [...savedViews, nextView]
    setSavedViews(nextViews)
    setActiveViewId(nextId)
    setNewViewName('')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MONITORING_VIEW_STORAGE_KEY, JSON.stringify(nextViews))
      window.localStorage.setItem(MONITORING_ACTIVE_VIEW_KEY, nextId)
    }
    showWorkspaceToast(`Saved new view ${trimmed}`)
  }

  const applySystemDefault = () => {
    setActiveViewId(null)
    setTransientManualColumnWidths(false)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(MONITORING_ACTIVE_VIEW_KEY)
    }
    setFontSize(11)
    setRowDensity(8)
    setHiddenColumns([])
    setGroupBy('raw')
    setShowFilterBar(true)
    setColumnLayoutState([])
    setSearchTerm('')
    setQuickFilters({ status: [] as string[], severity: [] as string[], platform: [] as string[], owner: [] as string[] })
    setGridSortModel([{ colId: 'favorite', sort: 'desc' }])
    if (gridRef.current?.api) {
       gridRef.current.api.setFilterModel({})
       gridRef.current.api.applyColumnState({
         defaultState: { sort: null, pinned: null, hide: false },
         applyOrder: true
       })
    }
    showWorkspaceToast('Restored system default view')
  }

  const deleteView = (viewId: string) => {
    const view = savedViews.find((v) => v.id === viewId)
    if (!view) return
    openConfirm(
      `Delete View: ${view.name}?`,
      "Are you sure you want to permanently remove this saved layout?",
      () => {
        const nextViews = savedViews.filter((v) => v.id !== viewId)
        setSavedViews(nextViews)
        if (activeViewId === viewId) {
          setActiveViewId(null)
          if (typeof window !== 'undefined') {
             window.localStorage.removeItem(MONITORING_ACTIVE_VIEW_KEY)
          }
        }
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(MONITORING_VIEW_STORAGE_KEY, JSON.stringify(nextViews))
        }
        showWorkspaceToast(`Deleted view ${view.name}`)
      }
    )
  }

  const dismissWorkspaceMenus = useCallback(() => {
    setShowBulkMenu(false)
    setBulkDeleteConfirm(false)
    setShowDisplayMenu(false)
    setShowViewsMenu(false)
    setRowActionMenu(null)
    setRowDeleteConfirmId(null)
  }, [])

  useWorkspaceDismissHandlers({
    active: showBulkMenu || showDisplayMenu || showViewsMenu || !!rowActionMenu,
    onDismiss: dismissWorkspaceMenus,
    shouldDismiss: (target) => {
      if (target.closest('[data-workspace-panel]')) return false
      if (showBulkMenu && !target.closest('.bulk-menu-container') && !target.closest('.bulk-menu-trigger')) return true
      if (showDisplayMenu && !target.closest('.display-menu-container')) return true
      if (showViewsMenu && !target.closest('.views-menu-container')) return true
      if (rowActionMenu && !target.closest('.row-action-menu-container')) return true
      return false
    },
  })

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest('.ag-root-wrapper') || target.closest('.row-action-menu-container')) {
        event.preventDefault()
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  useEffect(() => {
    const updateMenuPositions = () => {
      if (showDisplayMenu && displayMenuButtonRef.current) {
        setDisplayMenuStyle(getAnchoredFloatingStyle({
          rect: displayMenuButtonRef.current.getBoundingClientRect(),
          width: 320,
          height: 420,
          zIndex: 1100
        }))
      }
      if (showViewsMenu && viewsMenuButtonRef.current) {
        setViewsMenuStyle(getAnchoredFloatingStyle({
          rect: viewsMenuButtonRef.current.getBoundingClientRect(),
          width: 380,
          height: 460,
          zIndex: 1100
        }))
      }
      if (showBulkMenu && bulkMenuButtonRef.current) {
        setBulkMenuStyle(getAnchoredFloatingStyle({
          rect: bulkMenuButtonRef.current.getBoundingClientRect(),
          width: 340,
          height: BULK_MENU_MAX_HEIGHT,
          zIndex: 1105
        }))
      }
    }

    updateMenuPositions()
    if (showDisplayMenu || showBulkMenu || showViewsMenu) {
      window.addEventListener('resize', updateMenuPositions)
      window.addEventListener('scroll', updateMenuPositions, true)
      return () => {
        window.removeEventListener('resize', updateMenuPositions)
        window.removeEventListener('scroll', updateMenuPositions, true)
      }
    }
  }, [showBulkMenu, showDisplayMenu, showViewsMenu])

  const [searchTerm, setSearchTerm] = useState('')

  const { data: allItems, isLoading } = useQuery({
    queryKey: ['monitoring-items'],
    queryFn: async () => (await apiFetch('/api/v1/monitoring?include_deleted=true')).json()
  })

  useEffect(() => {
    if (allItems) {
       // @ts-ignore
       window.__DEBUG_ALL_ITEMS__ = allItems
    }
  }, [allItems])

  const items = useMemo(() => {
    if (!allItems || !Array.isArray(allItems)) return []
    return allItems.filter((i: any) => activeTab === 'active' ? !i.is_deleted : i.is_deleted)
  }, [allItems, activeTab])

  const platformOptions = useMemo(() => {
    const values = Array.from(new Set((items || []).map((item: any) => item.platform).filter(Boolean)))
    return values.sort().map((value) => ({ value, label: value }))
  }, [items])

  const ownerOptions = useMemo(() => {
    const values = Array.from(new Set((items || []).flatMap((item: any) => (item.owners || []).map((owner: any) => owner.name)).filter(Boolean)))
    return values.sort().map((value) => ({ value, label: value }))
  }, [items])

  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.refreshCells({ columns: ['favorite', 'watch'], force: true })
    }
  }, [favoriteIds, watchIds])

  const groupOptions = [
    { value: 'raw', label: 'Raw Rows' },
    { value: 'category', label: 'Category' },
    { value: 'platform', label: 'Platform' },
    { value: 'status', label: 'Status' },
    { value: 'severity', label: 'Severity' },
    { value: 'notification_method', label: 'Notification Path' }
  ]

  const displayedItems = useMemo(() => {
    const filtered = items.filter((item: any) => {
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase()
        const haystack = [
          String(item.id || ''),
          item.device_name,
          item.category,
          item.status,
          item.severity,
          item.title,
          item.platform,
          item.notification_method,
          item.purpose,
          ...(item.owners || []).map((owner: any) => owner.name)
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        
        if (!haystack.includes(query)) return false
      }
      if (quickFilters.status.length > 0 && !quickFilters.status.includes(item.status)) return false
      if (quickFilters.severity.length > 0 && !quickFilters.severity.includes(item.severity)) return false
      if (quickFilters.platform.length > 0 && !quickFilters.platform.includes(item.platform)) return false
      if (quickFilters.owner.length > 0 && !quickFilters.owner.some(o => (item.owners || []).some((owner: any) => owner.name === o))) return false
      return true
    })
    return filtered
  }, [items, quickFilters, searchTerm])

  const sortedItemsForGrouped = useMemo(() => {
    const sorted = [...displayedItems].sort((a: any, b: any) => {
      const aFavorite = favoriteIds.includes(a.id) ? 1 : 0
      const bFavorite = favoriteIds.includes(b.id) ? 1 : 0
      if (aFavorite !== bFavorite) return bFavorite - aFavorite
      
      // If no favorite difference, check grid sort model
      if (gridSortModel.length) {
        for (const sort of gridSortModel) {
          const direction = sort.sort === 'desc' ? -1 : 1
          const aValue = sort.colId === 'owners'
            ? (a.owners || []).map((owner: any) => owner.name).join(', ')
            : a[sort.colId]
          const bValue = sort.colId === 'owners'
            ? (b.owners || []).map((owner: any) => owner.name).join(', ')
            : b[sort.colId]
          const aComparable = aValue == null ? '' : String(aValue).toLowerCase()
          const bComparable = bValue == null ? '' : String(bValue).toLowerCase()
          if (aComparable < bComparable) return -1 * direction
          if (aComparable > bComparable) return 1 * direction
        }
      }
      return a.id - b.id
    })
    return sorted
  }, [displayedItems, favoriteIds, gridSortModel])

  const displayedItemsInOrder = useMemo(() => {
    if (groupBy !== 'raw') return sortedItemsForGrouped
    // Even for raw, we want favorites pinned to top if there's no manual sort overriding it
    // or we can just always use sortedItemsForGrouped for the rowData to keep it consistent.
    return sortedItemsForGrouped
  }, [sortedItemsForGrouped, groupBy])

  useEffect(() => {
    if (!displayedItemsInOrder.length) return
    const timer = window.setTimeout(() => {
      autoSizeMonitoringColumns()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [autoSizeMonitoringColumns, displayedItemsInOrder, fontSize, hiddenColumns, isIntelligenceExpanded])

  const selectedItems = useMemo(
    () => displayedItems.filter((item: any) => selectedIds.includes(item.id)),
    [displayedItems, selectedIds]
  )

  const compareItems = useMemo(() => selectedItems.slice(0, 5), [selectedItems])

  const groupedSections = useMemo(() => {
    if (groupBy === 'raw') return []
    const sections = sortedItemsForGrouped.reduce((acc: Array<{ key: string; label: string; items: any[] }>, item: any) => {
      const label = String(getMonitorGroupValue(item, groupBy))
      const existing = acc.find((section) => section.key === label)
      if (existing) {
        existing.items.push(item)
      } else {
        acc.push({ key: label, label, items: [item] })
      }
      return acc
    }, [])
    return sections.sort((a, b) => a.label.localeCompare(b.label))
  }, [sortedItemsForGrouped, groupBy])

  useEffect(() => {
    if (groupBy === 'raw') return
    setCollapsedGroups((current) => {
      const next = { ...current }
      groupedSections.forEach((section) => {
        if (!(section.key in next)) next[section.key] = false
      })
      Object.keys(next).forEach((key) => {
        if (!groupedSections.some((section) => section.key === key)) delete next[key]
      })
      return next
    })
  }, [groupBy, groupedSections])

  const isRecentChange = useCallback((item: any) => {
    const changedAt = item?.updated_at || item?.created_at
    if (!changedAt || !lastVisitedAt) return false
    const time = parseAppDate(changedAt)?.getTime() || 0
    return time > lastVisitedAt
  }, [lastVisitedAt])

  const bulkPreview = useMemo(() => {
    const field = expandedBulkSection === 'notification' ? 'notification_method' : expandedBulkSection
    if (!field) return null
    const nextValue = expandedBulkSection === 'notification' ? bulkDraft.notification_method : bulkDraft[expandedBulkSection]
    const currentCounts = selectedItems.reduce((acc: Record<string, number>, item: any) => {
      const key = item[field] || 'Unspecified'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    return {
      field,
      nextValue,
      currentCounts: Object.entries(currentCounts)
    }
  }, [bulkDraft, expandedBulkSection, selectedItems])

  useEffect(() => {
    if (!idParam || !allItems) return
    const target = allItems.find((item: any) => String(item.id) === idParam)
    if (!target) return
    setActiveTab(target.is_deleted ? 'deleted' : 'active')
    setDetailItem(target)
  }, [idParam, allItems])

  useEffect(() => {
    selectionAnchorRef.current = null
  }, [activeTab, items])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MONITORING_UI_STATE_KEY, JSON.stringify({
      activeTab,
      fontSize,
      rowDensity,
      hiddenColumns,
      quickFilters,
      groupBy,
      showFilterBar,
      columnLayoutState: normalizeOperationalColumnLayout(columnLayoutState, false),
      selectedIds,
      expandedBulkSection,
      lastVisitedAt,
      searchTerm
    }))
  }, [activeTab, columnLayoutState, expandedBulkSection, fontSize, groupBy, hiddenColumns, lastVisitedAt, quickFilters, rowDensity, searchTerm, selectedIds, showFilterBar])

  useEffect(() => {
    if (!activeViewId || !gridRef.current?.api) return
    applySavedView(activeViewId)
  }, [activeViewId, items.length])

  useEffect(() => {
    if (!gridRef.current?.api || !selectedIds.length) return
    gridRef.current.api.forEachNode((node: any) => {
      node.setSelected(selectedIds.includes(node.data?.id))
    })
    const firstSelectedIndex = displayedItems.findIndex((item: any) => selectedIds.includes(item.id))
    if (firstSelectedIndex >= 0) {
      gridRef.current.api.ensureIndexVisible(firstSelectedIndex, 'middle')
    }
  }, [displayedItems, selectedIds])

  useEffect(() => {
    if (selectedIds.length === 0) {
      setShowBulkMenu(false)
    }
  }, [selectedIds.length])

  useEffect(() => {
    if (typeof window === 'undefined') return
    ;(window as any).__DEBUG_SET_MONITORING_COLUMN_WIDTH__ = (colId: string, width: number) => {
      if (!gridRef.current?.api) return
      gridRef.current.api.applyColumnState({
        state: [{ colId, width }],
        applyOrder: false,
      })
      setTransientManualColumnWidths(true)
      syncColumnLayoutState(gridRef.current.api, true)
    }
    return () => {
      delete (window as any).__DEBUG_SET_MONITORING_COLUMN_WIDTH__
    }
  }, [setTransientManualColumnWidths, syncColumnLayoutState])

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return
      const current = readMonitoringUiState() || {}
      window.localStorage.setItem(MONITORING_UI_STATE_KEY, JSON.stringify({
        ...current,
        lastVisitedAt: Date.now()
      }))
    }
  }, [])

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = []
    if (searchTerm.trim()) {
      chips.push({
        id: 'search',
        label: `Search: ${searchTerm.trim()}`,
        onRemove: () => setSearchTerm('')
      })
    }
    Object.entries(gridFilterModel || {}).forEach(([field, model]) => {
      if (!model) return
      const labelValue = Array.isArray((model as any).values)
        ? (model as any).values.join(', ')
        : (model as any).filter || (model as any).filterTo || (model as any).type || 'Active'
      chips.push({
        id: `filter-${field}`,
        label: `${field}: ${labelValue}`,
        onRemove: () => {
          if (gridRef.current?.api) {
            const nextModel = { ...(gridRef.current.api.getFilterModel() || {}) }
            delete nextModel[field]
            gridRef.current.api.setFilterModel(nextModel)
            setGridFilterModel(nextModel)
          }
        }
      })
    })
    Object.entries(quickFilters).forEach(([field, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return
      const labelValue = Array.isArray(value) ? value.join(', ') : value
      chips.push({
        id: `quick-${field}`,
        label: `${field}: ${labelValue}`,
        onRemove: () => setQuickFilters((current) => ({ ...current, [field]: Array.isArray(value) ? [] : '' }))
      })
    })
    return chips
  }, [gridFilterModel, quickFilters, searchTerm])

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json()
  })

  const runUndo = async () => {
    const undo = lastUndoRef.current
    if (!undo) return
    if (undo.mode === 'bulk') {
      const res = await apiFetch('/api/v1/monitoring/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ ids: undo.ids, action: undo.action, payload: undo.payload || {} })
      })
      if (!res.ok) throw new Error(await res.text())
    } else if (undo.mode === 'restore_snapshots') {
      for (const snapshot of undo.snapshots) {
        const res = await apiFetch(`/api/v1/monitoring/${snapshot.id}`, {
          method: 'PUT',
          body: JSON.stringify(sanitizeMonitoringPayload(snapshot))
        })
        if (!res.ok) throw new Error(await res.text())
      }
    }
    lastUndoRef.current = null
    queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
  }

  const bulkMutation = useMutation({
    onMutate: ({ action, ids: overrideIds }: any) => {
      const idsToUse = overrideIds ?? selectedIds
      setPendingIds(prev => [...new Set([...prev, ...idsToUse])])
    },
    onSettled: (data: any, error: any, variables: any) => {
      const idsToUse = variables.ids ?? selectedIds
      setPendingIds(prev => prev.filter(id => !idsToUse.includes(id)))
    },
    mutationFn: async ({ action, payload = {}, ids: overrideIds }: any) => {
      const idsToUse = overrideIds ?? selectedIds
      const previousSnapshots = (allItems || []).filter((item: any) => idsToUse.includes(item.id)).map((item: any) => ({ ...item }))
      const res = await apiFetch('/api/v1/monitoring/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ ids: idsToUse, action, payload })
      })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      return { result, action, payload, idsToUse, previousSnapshots }
    },
    onSuccess: ({ action, payload, idsToUse, previousSnapshots }: any) => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
      idsToUse.forEach((id: number) => {
        queryClient.invalidateQueries({ queryKey: ['monitoring-history', id] })
      })
      setShowBulkMenu(false)
      setExpandedBulkSection(null)
      setBulkDraft({ status: '', severity: '', notification_method: '' })
      setIsBulkStatusOpen(false)
      setIsBulkSeverityOpen(false)
      setIsBulkNotifyOpen(false)
      
      if (action === 'delete') lastUndoRef.current = { mode: 'bulk', ids: idsToUse, action: 'restore' }
      else if (action === 'restore') lastUndoRef.current = { mode: 'bulk', ids: idsToUse, action: 'delete' }
      else if (action === 'update') lastUndoRef.current = { mode: 'restore_snapshots', snapshots: previousSnapshots, payload }
      else lastUndoRef.current = null

      if (lastUndoRef.current) {
        const verb = action === 'delete' ? 'Archived' : action === 'restore' ? 'Restored' : 'Synchronized';
        const subject = idsToUse.length > 1 ? `${idsToUse.length} monitors` : 'monitor';
        showWorkspaceToast(`${verb} ${subject} in matrix`, {
          onRevert: async () => {
            try {
              await runUndo()
              showWorkspaceToast(`Reverted ${verb.toLowerCase()} operation`, { type: 'success' })
            } catch (error: any) {
              showWorkspaceToast(error.message || 'Undo failed', { type: 'error' })
            }
          }
        })
      }
    },
    onError: (e: any) => showWorkspaceToast(`Operation failed: ${e.message}`, { type: 'error' })
  })

  const columnDefs = useMemo(() => {
    const layoutById = new Map(columnLayoutState.map((column: any) => [column.colId, column]))
    
    const defs = [
    { 
      colId: "select",
      headerName: "", 
      width: 48,
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: 'left', 
      cellClass: 'flex items-center justify-center border-r border-white/5', 
      headerClass: 'flex items-center justify-center border-r border-white/5', 
      suppressSizeToFit: true,
      sortable: false,
      filter: false,
      lockVisible: true
    },
    { 
      colId: "id",
      field: "id", 
      headerName: "ID", 
      width: 90,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 border-r border-white/5 flex items-center justify-center',
      headerClass: 'text-center border-r border-white/5',
      filter: 'agNumberColumnFilter',
      lockVisible: true
    },
    {
      colId: "recent_change",
      headerName: "Chg",
      field: "recent_change",
      width: 80,
      pinned: 'left',
      sortable: false,
      filter: false,
      lockVisible: true,
      cellClass: 'text-center border-r border-white/5 flex items-center justify-center !overflow-visible',
      headerClass: 'text-center border-r border-white/5',
      hide: !isIntelligenceExpanded,
      cellRenderer: (p: any) => {
        if (!p.data || !isRecentChange(p.data)) return null
        const dateStr = formatAppDate(p.data.updated_at || p.data.created_at)
        const author = p.data.created_by_user_id || 'System'
        return (
          <div className="group relative flex items-center justify-center h-full w-full">
            <div className="absolute h-10 w-10 rounded-lg bg-[radial-gradient(circle,_rgba(251,191,36,0.2)_0%,_transparent_70%)] blur-md animate-pulse" />
            <span className="relative z-[1] block h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
            
            {/* Hover Peek Activity */}
            <div className="invisible group-hover:visible absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-[2000] w-52 p-3 rounded-lg border border-white/10 bg-slate-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl pointer-events-none transition-all duration-300 transform scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100">
               <div className="flex items-center gap-2 mb-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                 <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">Recent Activity</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[11px] text-slate-100 font-bold leading-tight">{dateStr}</p>
                 <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-white/5">
                    <User size={10} className="text-slate-500" />
                    <p className="text-[9px] text-slate-500 font-bold tracking-widest">@{author}</p>
                 </div>
               </div>
               {/* Arrow */}
               <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-950/90" />
            </div>
          </div>
        )
      }
    },
    {
      colId: "favorite",
      headerName: "Fav",
      field: "favorite",
      width: 80,
      pinned: 'left',
      cellClass: 'text-center border-r border-white/5 flex items-center justify-center',
      headerClass: 'text-center border-r border-white/5',
      sortable: true,
      filter: false,
      lockVisible: true,
      valueGetter: (p: any) => p.context?.favoriteIds?.includes(p.data?.id) ? 1 : 0,
      cellRenderer: (p: any) => {
        const isFavorite = p.context?.favoriteIds?.includes(p.data?.id)
        return (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={(event) => {
                event.stopPropagation()
                toggleFavorite(p.data.id)
              }}
              title={isFavorite ? 'Unpin monitor' : 'Pin monitor'}
              className={`rounded-lg p-1 transition-all flex items-center justify-center ${isFavorite ? 'text-amber-300' : 'text-slate-600 hover:text-slate-300'}`}
            >
              <Star size={15} className={isFavorite ? 'fill-current' : ''} />
            </button>
          </div>
        )
      }
    },
    {
      colId: "watch",
      headerName: "Watch",
      field: "watch",
      width: 85,
      pinned: 'left',
      cellClass: 'text-center border-r border-white/5 flex items-center justify-center',
      headerClass: 'text-center border-r border-white/5',
      sortable: false,
      filter: false,
      lockVisible: true,
      hide: !isIntelligenceExpanded,
      cellRenderer: (p: any) => {
        const isWatched = p.context?.watchIds?.includes(p.data?.id)
        return (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={(event) => {
                event.stopPropagation()
                toggleWatch(p.data.id)
              }}
              title={isWatched ? 'Unfollow monitor' : 'Follow monitor'}
              className={`rounded-lg p-1 transition-all flex items-center justify-center ${isWatched ? 'text-sky-300' : 'text-slate-600 hover:text-slate-300'}`}
            >
              <Eye size={15} className={isWatched ? 'fill-current' : ''} />
            </button>
          </div>
        )
      }
    },
    { 
      field: "device_name", 
      headerName: "Target Asset", 
      width: 160, 
      filter: true,
      cellClass: "font-bold text-center flex items-center justify-center", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("device_name")
    },
    { 
      field: "title", 
      headerName: "Title", 
      width: 280,
      filter: true,
      cellClass: "font-bold text-left tracking-tight flex items-center", 
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("title")
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 130,
      filter: true,
      cellClass: 'text-center flex items-center justify-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <StatusPill value={p.value || 'Unknown'} fontSize={fontSize} />,
      hide: hiddenColumns.includes("status")
    },
    { 
      field: "owners",
      headerName: "Owners",
      width: 140,
      filter: true,
      cellClass: "text-center font-bold flex items-center justify-center",
      headerClass: 'text-center',
      valueFormatter: (p: any) => p.value?.map((o: any) => o.name).join(', ') || 'N/A',
      cellRenderer: (p: any) => {
        const owners = p.value || []
        const count = owners.length
        if (count === 0) return <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500">N/A</span>
        const summary = count > 1 ? `${owners[0].name} +${count - 1}` : owners[0].name
        const tooltip = owners
          .map((owner: any) => `${owner.name}${owner.role ? ` (${owner.role})` : ''}${owner.external_id ? ` - ${owner.external_id}` : ''}`)
          .join('\n')
        return (
          <HoverPreview summary={summary} tooltip={tooltip} fontSize={fontSize} />
        )
      },
      hide: hiddenColumns.includes("owners")
    },
    { 
      field: "category", 
      headerName: "Category", 
      width: 140,
      filter: true,
      cellClass: 'text-center flex items-center justify-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          'Hardware': 'text-amber-500',
          'Network': 'text-blue-500',
          'OS': 'text-purple-500',
          'Application': 'text-emerald-500',
          'Database': 'text-rose-500'
        }
        return <span style={{ fontSize: `${fontSize}px` }} className={`font-bold ${colors[p.value] || 'text-slate-400'}`}>{p.value || 'N/A'}</span>
      },
      hide: hiddenColumns.includes("category")
    },
    { 
      field: "is_active", 
      headerName: "Existing", 
      width: 70,
      cellClass: 'text-center flex items-center justify-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const isActive = p.value
        const isDeleted = p.data?.is_deleted || p.data?.status === 'Deleted'
        return (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div className={`w-2 h-2 rounded-full ${isDeleted ? 'bg-slate-700' : isActive ? 'bg-emerald-500' : 'bg-rose-500/50'}`} />
              {(isActive && !isDeleted) && (
                <div className="absolute -inset-1 rounded-lg bg-emerald-500 animate-pulse opacity-40 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              )}
            </div>
          </div>
        )
      },      hide: hiddenColumns.includes("is_active")
    },
    { 
      field: "monitored_service_names", 
      headerName: "Services", 
      width: 110, 
      valueFormatter: (p: any) => p.value?.join(', ') || 'N/A',
      cellClass: "text-center flex items-center justify-center", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const names = p.value || []
        const count = names.length
        if (count === 0) return <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold">N/A</span>
        const summary = count > 1 ? `${names[0]} +${count - 1}` : names[0]
        return (
          <div className="flex items-center justify-center h-full">
            <HoverPreview
              summary={summary}
              tooltip={names.join('\n')}
              tone="blue"
              fontSize={fontSize}
            />
          </div>
        )
      },
      hide: hiddenColumns.includes("monitored_service_names")
    },
    { 
      field: "platform", 
      headerName: "Platform", 
      filter: true,
      cellClass: 'text-center font-bold text-slate-300 flex items-center justify-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold">N/A</span>,
      hide: hiddenColumns.includes("platform")
    },
    { 
      field: "severity", 
      headerName: "Severity", 
      width: 130,
      filter: true,
      cellClass: 'text-center flex items-center justify-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <StatusPill value={p.value || 'N/A'} fontSize={fontSize} />,
      hide: hiddenColumns.includes("severity")
    },
    { 
      field: "check_interval", 
      headerName: "Freq", 
      width: 80, 
      cellClass: 'text-center font-bold flex items-center justify-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value ? `${p.value}s` : 'N/A'}</span>,
      hide: hiddenColumns.includes("check_interval")
    },
    { 
      field: "notification_method", 
      headerName: "Notify", 
      width: 130, 
      filter: true,
      cellClass: 'text-center flex items-center justify-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full">
           <button 
             onClick={() => setRecipientPopup({ recipients: p.data.notification_recipients || [], method: p.value })}
             className="flex items-center space-x-1 hover:text-blue-400 transition-colors"
           >
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold text-slate-300 border-b border-dashed border-slate-700">{p.value || 'N/A'}</span>
           </button>
        </div>
      ),
      hide: hiddenColumns.includes("notification_method")
    },
    { 
      field: "purpose", 
      headerName: "Purpose", 
      width: 220,
      filter: true,
      cellClass: "font-bold text-slate-500 text-left truncate px-4 flex items-center", 
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("purpose")
    },
    { 
      field: "created_at", 
      headerName: "Created", 
      width: 180,
      filter: 'agDateColumnFilter',
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? (
        <div className="flex items-center gap-2">
           <Clock size={12} className="opacity-40" />
           <span style={{ fontSize: `${fontSize}px` }}>{formatAppDate(p.value)}</span>
        </div>
      ) : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500">N/A</span>,
      hide: hiddenColumns.includes("created_at")
    },
    { 
      field: "updated_at", 
      headerName: "Updated", 
      width: 180,
      filter: 'agDateColumnFilter',
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? (
        <div className="flex items-center gap-2">
           <Clock size={12} className="opacity-40" />
           <span style={{ fontSize: `${fontSize}px` }}>{formatAppDate(p.value)}</span>
        </div>
      ) : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500">N/A</span>,
      hide: hiddenColumns.includes("updated_at")
    },
    {
      colId: "row_actions",
      headerName: "Action",
      width: 210,
      pinned: 'right',
      cellClass: 'text-right pr-3 flex items-center justify-end',
      headerClass: 'text-center',
      sortable: false,
      filter: false,
      cellRenderer: (p: any) => p.data ? renderPrimaryRowActions(p.data) : null,
      lockVisible: true
    }
  ]
  
  // Inject saved layout state (widths, pinned, sort) into definitions before first render
  const mergedDefs = defs.map((col: any) => {
    if (col.children) {
      return {
        ...col,
        children: col.children.map((child: any) => {
          const colId = child.colId || child.field
          const layout = layoutById.get(colId)
          return applyOperationalColumnSizing(child, layout, preserveExplicitColumnWidths)
        })
      }
    }
    const colId = col.colId || col.field
    const layout = layoutById.get(colId)
    return applyOperationalColumnSizing(col, layout, preserveExplicitColumnWidths)
  })

  // Ensure column order is maintained from state to prevent "jumping" during re-renders
  if (columnLayoutState.length > 0) {
    const orderMap = new Map(columnLayoutState.map((col: any, index: number) => [col.colId, index]))
    return [...mergedDefs].sort((a: any, b: any) => {
      const aId = a.colId || a.field
      const bId = b.colId || b.field
      return (orderMap.get(aId) ?? 1000) - (orderMap.get(bId) ?? 1000)
    })
  }

  return mergedDefs
}, [fontSize, hiddenColumns, columnLayoutState, isIntelligenceExpanded, preserveExplicitColumnWidths]) as any

  const gridContext = useMemo(() => ({ favoriteIds, watchIds }), [favoriteIds, watchIds])
  const autoSizeStrategy = useMemo(
    () => (preserveExplicitColumnWidths ? undefined : OPERATIONAL_GRID_AUTO_SIZE_STRATEGY),
    [preserveExplicitColumnWidths]
  )

  return (
   <div className="h-full min-h-0 flex flex-col space-y-6">
     <PageHeader
       eyebrow="Observability"
       title={
         <div className="flex items-center gap-3">
            <Activity className="text-blue-500" />
            <span>Monitoring</span>
         </div>
       }
       subtitle="Centralized monitoring configuration and operational status"
       actions={
         <ToolbarSegmented
           value={activeTab}
           onChange={(next) => {
             setActiveTab(next as 'active' | 'deleted')
             setSelectedIds([])
           }}
           options={[
             { label: 'Existing', value: 'active' },
             { label: 'Archived', value: 'deleted' }
           ]}
         />
         }
         />

         <WorkspaceCommandBar
        left={
          <>
            <ToolbarSearch
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Scan matrix..."
            />
            <ToolbarGroup>
              <div className="views-menu-container">
                <ToolbarButton active={showViewsMenu} onClick={() => setShowViewsMenu(!showViewsMenu)} ref={viewsMenuButtonRef as any}>
                  <span className="flex items-center gap-2">
                    <LayoutGrid size={14} />
                    Views
                  </span>
                </ToolbarButton>
              </div>
              <div className="display-menu-container">
                <ToolbarButton active={showDisplayMenu} onClick={() => setShowDisplayMenu(!showDisplayMenu)} ref={displayMenuButtonRef as any}>
                  <span className="flex items-center gap-2">
                    <Sliders size={14} />
                    Display
                  </span>
                </ToolbarButton>
              </div>
              <ToolbarIconButton onClick={handleExportCSV} title="Export CSV">
                <FileText size={16} />
              </ToolbarIconButton>
              <ToolbarIconButton onClick={handleCopyToClipboard} title="Copy to clipboard">
                <Clipboard size={16} />
              </ToolbarIconButton>
              <ToolbarIconButton onClick={() => setShowRegistry(true)} title="Registry configuration">
               <Settings size={16} />
              </ToolbarIconButton>
            </ToolbarGroup>
            <ToolbarGroup>
              <ToolbarButton onClick={() => setShowImportModal(true)} title="Import monitoring rows">
                <span className="flex items-center gap-2">
                  <Upload size={14} />
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
              <ToolbarButton
               active={isIntelligenceExpanded}
               onClick={() => setIsIntelligenceExpanded(!isIntelligenceExpanded)}
               title={isIntelligenceExpanded ? 'Hide Activity Columns' : 'Show Activity Columns'}
              >
               <span className="flex items-center gap-2">
                 {isIntelligenceExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                 Activity
               </span>
              </ToolbarButton>
            </ToolbarGroup>
          </>
        }
        secondary={showFilterBar ? (
          <div className="grid w-full gap-3 md:grid-cols-4">
            <AppDropdown
              multi
              value={quickFilters.status}
              onChange={(val) => setQuickFilters((current) => ({ ...current, status: val }))}
              options={STATUSES.filter((status) => status.value !== 'Deleted').map((status) => ({ value: status.value, label: status.label }))}
              label="Status Filter"
              placeholder="All statuses"
            />
            <AppDropdown
              multi
              value={quickFilters.severity}
              onChange={(val) => setQuickFilters((current) => ({ ...current, severity: val }))}
              options={severities.map((severity: any) => ({ value: severity.value, label: severity.label }))}
              label="Severity Filter"
              placeholder="All severities"
            />
            <AppDropdown
              multi
              value={quickFilters.platform}
              onChange={(val) => setQuickFilters((current) => ({ ...current, platform: val }))}
              options={platformOptions}
              label="Platform Filter"
              placeholder="All platforms"
            />
            <AppDropdown
              multi
              value={quickFilters.owner}
              onChange={(val) => setQuickFilters((current) => ({ ...current, owner: val }))}
              options={ownerOptions}
              label="Owner Filter"
              placeholder="All owners"
            />
          </div>
        ) : null}
	        right={
	          <>
              {MONITORING_SUPPORTS_COMPARE && (
                <ToolbarButton
                  onClick={openCompare}
                  disabled={selectedIds.length < 2 || selectedIds.length > 5}
                  active={compareOpen}
                  title="Compare selected monitors"
                >
                  <span className="flex items-center gap-2">
                    <GitCompare size={14} />
                    Compare
                  </span>
                </ToolbarButton>
              )}
		            <ToolbarButton
                onClick={toggleBulkWindow}
                disabled={selectedIds.length === 0}
                active={showBulkMenu}
                title="Bulk actions"
                className="bulk-menu-trigger"
                ref={bulkMenuButtonRef as any}
              >
                <span className="flex items-center gap-2">
                  <Zap size={14} />
                  Bulk Actions
                </span>
              </ToolbarButton>
	            <ToolbarButton
	              onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
	              variant="primary"
              className="px-6 py-2"
            >
              + Add Monitoring
            </ToolbarButton>
          </>
        }
        filterChips={[
          ...activeFilterChips,
          ...(activeFilterChips.length > 0
            ? [{
                id: 'clear-all',
                label: 'Clear All',
                onRemove: () => {
                  setSearchTerm('')
                  setGridFilterModel({})
                  setQuickFilters({ status: [] as string[], severity: [] as string[], platform: [] as string[], owner: [] as string[] })
                  gridRef.current?.api?.setFilterModel({})
                }
              }]
            : []),
        ]}
		      />

      {typeof document !== 'undefined' && createPortal(
        <>
          <AnimatePresence>
            {showDisplayMenu && !!displayMenuStyle.top && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                style={displayMenuStyle}
                className="display-menu-container"
              >
                <WorkspaceFloatingPanel kind="menu" className="p-4">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400">Display density</span>
                      <button onClick={() => setShowDisplayMenu(false)} className="text-slate-500 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-3 rounded-lg border border-white/5 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-semibold text-slate-400">Font</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="8"
                            max="14"
                            step="1"
                            value={fontSize}
                            onChange={e => setFontSize(Number(e.target.value))}
                            className="h-1.5 w-28 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-blue-500"
                          />
                          <span className="w-8 text-right text-[10px] font-black tabular-nums text-white">{fontSize}px</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-semibold text-slate-400">Rows</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="20"
                            step="2"
                            value={rowDensity}
                            onChange={e => setRowDensity(Number(e.target.value))}
                            className="h-1.5 w-28 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-blue-500"
                          />
                          <span className="w-8 text-right text-[10px] font-black tabular-nums text-white">{rowDensity}px</span>
                        </div>
                      </div>
                    </div>
	                  </div>

	                    <div className="space-y-2">
                        <AppDropdown
                          value={groupBy}
                          onChange={(val) => setGroupBy(val)}
                          options={groupOptions}
                          label="Group By"
                        />
                      </div>

	                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-slate-400">Columns</span>
                    <div className="max-h-[240px] space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                      {columnDefs.filter((c: any) => c.field && !c.lockVisible).map((col: any) => (
                        <label key={col.field} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-all hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={!hiddenColumns.includes(col.field)}
                            onChange={() => {
                              if (hiddenColumns.includes(col.field)) {
                                setHiddenColumns(hiddenColumns.filter(f => f !== col.field))
                              } else {
                                setHiddenColumns([...hiddenColumns, col.field])
                              }
                            }}
                            className="sr-only"
                          />
                          <div className={`flex h-4 w-4 items-center justify-center rounded-lg border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-blue-600 border-blue-500' : 'border-white/10 bg-black/40'}`}>
                            {!hiddenColumns.includes(col.field) && <Check size={11} className="text-white" />}
                          </div>
                          <span className={`text-[10px] font-semibold ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>
                            {col.headerName || col.field}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                </WorkspaceFloatingPanel>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showViewsMenu && !!viewsMenuStyle.top && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                style={viewsMenuStyle}
                className="views-menu-container"
              >
                <WorkspaceFloatingPanel kind="menu" className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400">Saved views</p>
                      <p className="pt-1 text-[11px] text-slate-400">Load, save, and overwrite full Monitoring layouts.</p>
                    </div>
                    <button onClick={() => setShowViewsMenu(false)} className="text-slate-500 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400">Current view</p>
                        <p className="pt-1 text-[11px] font-semibold text-slate-100">{activeViewId ? savedViews.find((view) => view.id === activeViewId)?.name : 'Unsaved working view'}</p>
                      </div>
                      {activeViewId && (
                        <button
                          type="button"
                          onClick={() => saveCurrentToView(activeViewId)}
                          className="rounded-lg border border-blue-500/20 bg-blue-600/15 px-3 py-2 text-[10px] font-semibold text-blue-200 transition-all hover:bg-blue-600/25"
                        >
                          Overwrite Current
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newViewName}
                        onChange={(event) => setNewViewName(event.target.value)}
                        placeholder="Save as new view..."
                        className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/40"
                      />
                      <button
                        type="button"
                        onClick={createViewFromCurrent}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-slate-200 transition-all hover:bg-white/[0.08]"
                      >
                        Save New
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
                    <button
                      onClick={applySystemDefault}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                        activeViewId === null
                          ? 'border-emerald-500/30 bg-emerald-500/12'
                          : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className={`text-[10px] font-semibold ${activeViewId === null ? 'text-emerald-300' : 'text-slate-200'}`}>System default</p>
                          <p className="pt-1 text-[10px] text-slate-500">Standard table layout with no active view</p>
                        </div>
                        <span className="text-[9px] font-semibold text-slate-500">Core</span>
                      </div>
                    </button>

                    {savedViews.map((view) => {
                      const isDefaultView = DEFAULT_MONITORING_VIEW_IDS.has(view.id)
                      return (
                        <div key={view.id} className="flex items-center gap-2">
                          <button
                            onClick={() => applySavedView(view.id)}
                            className={`flex-1 rounded-lg border px-3 py-2 text-left transition-all ${
                              activeViewId === view.id
                                ? 'border-blue-500/30 bg-blue-500/12'
                                : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className={`text-[10px] font-semibold ${activeViewId === view.id ? 'text-blue-300' : 'text-slate-200'}`}>{view.name}</p>
                                <p className="pt-1 text-[10px] text-slate-500">{view.config?.groupBy && view.config.groupBy !== 'raw' ? `Grouped by ${groupOptions.find((option) => option.value === view.config.groupBy)?.label || view.config.groupBy}` : 'Raw monitoring table'}</p>
                              </div>
                              <span className="text-[9px] font-semibold text-slate-500">{isDefaultView ? 'Default' : 'Custom'}</span>
                            </div>
                          </button>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => saveCurrentToView(view.id)}
                              title={`Overwrite ${view.name}`}
                              className="rounded-lg border border-white/8 bg-white/[0.03] p-1.5 text-slate-400 transition-all hover:bg-white/[0.06] hover:text-white"
                            >
                              <Save size={12} />
                            </button>
                            {!isDefaultView && (
                              <button
                                onClick={() => deleteView(view.id)}
                                title={`Delete ${view.name}`}
                                className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-1.5 text-rose-500 transition-all hover:bg-rose-500/20"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                </WorkspaceFloatingPanel>
              </motion.div>
            )}
          </AnimatePresence>

	          <AnimatePresence>
		            {showBulkMenu && !!bulkMenuStyle.top && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={bulkMenuStyle}
                  className="bulk-menu-container"
                >
                  <WorkspaceFloatingPanel kind="context" className="max-h-[560px] overflow-y-auto custom-scrollbar p-3">
                  <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                    <p className="text-[10px] font-semibold text-slate-400">Bulk actions</p>
                    <p className="pt-1 text-[12px] font-semibold text-slate-100">{selectedIds.length} monitors selected</p>
                  </div>

                  {activeTab === 'deleted' ? (
                    <button
                      onClick={() => bulkMutation.mutate({ action: 'restore' })}
                      className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left transition-all hover:bg-emerald-500/15"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Restore Selection</p>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowBulkEditModal(true)}
                        className="w-full rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-left transition-all hover:bg-blue-500/15"
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Bulk Edit Table</p>
                        <p className="pt-1 text-[10px] font-semibold text-slate-400">Edit selected monitors row by row using safe columns only.</p>
                      </button>

                      <BulkActionCard
                        title="Set Status"
                        active={expandedBulkSection === 'status'}
                        onClick={() => setExpandedBulkSection(expandedBulkSection === 'status' ? null : 'status')}
                      />
                      {expandedBulkSection === 'status' && (
                        <InlineBulkEditor
                          value={bulkDraft.status}
                          onChange={(value) => setBulkDraft((current) => ({ ...current, status: value }))}
                          options={STATUSES.filter((status) => status.value !== 'Deleted').map((status) => ({ value: status.value, label: status.label }))}
                          placeholder="Choose status"
                          actionLabel="Apply Status"
                          onApply={() => bulkMutation.mutate({ action: 'update', payload: { status: bulkDraft.status } })}
                          disabled={!bulkDraft.status}
                        />
                      )}

                      <BulkActionCard
                        title="Set Severity"
                        active={expandedBulkSection === 'severity'}
                        onClick={() => setExpandedBulkSection(expandedBulkSection === 'severity' ? null : 'severity')}
                      />
                      {expandedBulkSection === 'severity' && (
                        <InlineBulkEditor
                          value={bulkDraft.severity}
                          onChange={(value) => setBulkDraft((current) => ({ ...current, severity: value }))}
                          options={severities.map((severity: any) => ({ value: severity.value, label: severity.label }))}
                          placeholder="Choose severity"
                          actionLabel="Apply Severity"
                          onApply={() => bulkMutation.mutate({ action: 'update', payload: { severity: bulkDraft.severity } })}
                          disabled={!bulkDraft.severity}
                        />
                      )}

                      <BulkActionCard
                        title="Set Notification"
                        active={expandedBulkSection === 'notification'}
                        onClick={() => setExpandedBulkSection(expandedBulkSection === 'notification' ? null : 'notification')}
                      />
                      {expandedBulkSection === 'notification' && (
                        <InlineBulkEditor
                          value={bulkDraft.notification_method}
                          onChange={(value) => setBulkDraft((current) => ({ ...current, notification_method: value }))}
                          options={notificationMethods.map((method: any) => ({ value: method.value, label: method.label }))}
                          placeholder="Choose notification path"
                          actionLabel="Apply Notification"
                          onApply={() => bulkMutation.mutate({ action: 'update', payload: { notification_method: bulkDraft.notification_method } })}
                          disabled={!bulkDraft.notification_method}
                        />
                      )}
                    </div>
                  )}

                  <div className="mx-1 my-3 h-px bg-slate-800" />
                  <button
                    onClick={() => {
                      if (!bulkDeleteConfirm) {
                        setBulkDeleteConfirm(true)
                        return
                      }
                      bulkMutation.mutate({ action: activeTab === 'deleted' ? 'purge' : 'delete' })
                    }}
                    onMouseLeave={() => setBulkDeleteConfirm(false)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                      bulkDeleteConfirm 
                        ? 'border-rose-500 bg-rose-600 animate-pulse' 
                        : 'border-rose-900/70 bg-rose-950/70 hover:bg-rose-950'
                    }`}
                  >
                    <p className={`text-[10px] font-semibold ${bulkDeleteConfirm ? 'text-white' : 'text-rose-300'}`}>
                      {bulkDeleteConfirm 
                        ? (activeTab === 'deleted' ? 'Confirm Permanent Purge?' : 'Confirm De-activation?') 
                        : (activeTab === 'deleted' ? 'Purge Selection' : 'De-activate Selection')}
                    </p>
                  </button>
                  </WorkspaceFloatingPanel>
                </motion.div>
	            )}
	          </AnimatePresence>

	          <AnimatePresence>
            {rowActionMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                style={rowActionMenu.style}
                className="row-action-menu-container"
              >
                <WorkspaceFloatingPanel kind="context" className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold text-slate-400">Row actions</p>
                    <p className="pt-1 text-[11px] font-semibold text-slate-100">ID {rowActionMenu.item.id} · {rowActionMenu.item.device_name || 'No target asset linked'}</p>
                    <p className="truncate pt-1 text-[12px] text-slate-300">{rowActionMenu.item.title}</p>
                  </div>
                  <button
                    onClick={() => setRowActionMenu(null)}
                    className="ml-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    aria-label="Close row actions"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-2.5 custom-scrollbar">
                  <div className="px-3 py-1">
                    <p className="text-[10px] font-semibold text-slate-400">Quick access</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 px-2 pb-3 border-b border-slate-800 mb-2">
                    <button
                      onClick={() => {
                        setDetailItem(rowActionMenu.item)
                        setRowActionMenu(null)
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-blue-400 transition-all hover:border-blue-500/30 hover:bg-blue-600/10 active:scale-95"
                    >
                      <Maximize2 size={14} />
                      Details
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(rowActionMenu.item)
                        setIsFormOpen(true)
                        setRowActionMenu(null)
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-600/10 active:scale-95"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setHistoryItem(rowActionMenu.item)
                        setRowActionMenu(null)
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-amber-400 transition-all hover:border-amber-500/30 hover:bg-amber-600/10 active:scale-95"
                    >
                      <Clock size={14} />
                      History
                    </button>
                  </div>

                  <div className="px-3 py-1">
                    <p className="text-[10px] font-semibold text-slate-400">Related destinations</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-2 pb-1">
                    <button
                      onClick={() => {
                        if (rowActionMenu.item.device_id) navigate(`/asset?id=${rowActionMenu.item.device_id}`)
                        setRowActionMenu(null)
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 transition-all hover:border-slate-700 hover:bg-slate-900"
                    >
                      <Monitor size={12} className="text-blue-400" />
                      Asset
                    </button>
                    <button
                      onClick={() => {
                        const firstDoc = rowActionMenu.item.recovery_docs?.[0]
                        const docId = typeof firstDoc === 'object' ? firstDoc?.id : firstDoc
                        if (docId) navigate(`/knowledge?id=${docId}`)
                        setRowActionMenu(null)
                      }}
                      disabled={!rowActionMenu.item.recovery_docs?.[0]}
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 transition-all hover:border-slate-700 hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-600"
                    >
                      <BookOpen size={12} className="text-emerald-400" />
                      Knowledge
                    </button>
                    <button
                      onClick={() => {
                        toggleWatch(rowActionMenu.item.id)
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 transition-all hover:border-slate-700 hover:bg-slate-900"
                    >
                      {watchIds.includes(rowActionMenu.item.id) ? (
                        <>
                          <EyeOff size={12} className="text-slate-400" />
                          Unwatch
                        </>
                      ) : (
                        <>
                          <Eye size={12} className="text-sky-400" />
                          Watch
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        toggleFavorite(rowActionMenu.item.id)
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 transition-all hover:border-slate-700 hover:bg-slate-900"
                    >
                      {favoriteIds.includes(rowActionMenu.item.id) ? (
                        <>
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Star size={12} className="text-amber-400" />
                          Pin
                        </>
                      )}
                    </button>
                  </div>
		                <div className="mx-2 my-2 h-px bg-slate-800" />
                {activeTab === 'deleted' && (
                  <button
                    onClick={() => {
                      bulkMutation.mutate({ action: 'restore', ids: [rowActionMenu.item.id] })
                      setRowActionMenu(null)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 transition-all hover:bg-emerald-950/80"
                  >
                    <Undo2 size={14} />
                    Restore Monitor
                  </button>
                )}
                <button
                  onClick={() => {
                    const item = rowActionMenu.item
                    if (rowDeleteConfirmId !== item.id) {
                      setRowDeleteConfirmId(item.id)
                      return
                    }
                    bulkMutation.mutate({ action: activeTab === 'active' ? 'delete' : 'purge', ids: [item.id] })
                    setRowActionMenu(null)
                    setRowDeleteConfirmId(null)
                  }}
                  onMouseLeave={() => setRowDeleteConfirmId(null)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                    rowDeleteConfirmId === rowActionMenu.item.id
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'text-rose-300 hover:bg-rose-950/80'
                  }`}
                >
                  <Trash2 size={14} />
                  {rowDeleteConfirmId === rowActionMenu.item.id
                    ? (activeTab === 'active' ? 'Confirm De-activate?' : 'Confirm Purge?')
                    : (activeTab === 'active' ? 'De-activate' : 'Purge')}
                </button>
                </div>
                </WorkspaceFloatingPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}

      {groupBy === 'raw' ? (
	        <div 
            className="monitoring-grid-shell monitoring-grid flex-1 w-full min-h-0 glass-panel rounded-lg overflow-hidden ag-theme-alpine-dark relative"
            style={{ 
              '--ag-font-size': `${fontSize}px`,
              '--ag-font-family': "'Inter', sans-serif",
            } as React.CSSProperties}
          >
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
               <RefreshCcw size={32} className="text-blue-400 animate-spin" />
               <p className="text-[10px] font-semibold text-blue-400">Scanning monitoring matrix...</p>
            </div>
          )}
	          <GridMatrix
            gridRef={gridRef}
	            rowData={displayedItemsInOrder || []} 
	            columnDefs={columnDefs} 
            autoSizeStrategy={autoSizeStrategy}
            colResizeDefault="normal"
            fontSize={fontSize}
            rowDensity={rowDensity}
            context={gridContext}
            getRowId={handleRowId}
            onGridReady={handleGridReady}
	            onSelectionChanged={(e) => handleSelectionChanged(e, 'raw')}
            onColumnResized={handleMonitoringColumnResized}
            onColumnMoved={handleColumnMoved}
            onDragStopped={handleDragStopped}
            onColumnPinned={handleColumnPinned}
            onColumnVisible={handleColumnVisible}
            onFilterChanged={handleFilterChanged}
	            onSortChanged={handleSortChanged}
            onCellContextMenu={handleCellContextMenu}
	            onRowClicked={handleRowClicked}
            onRowDoubleClicked={handleRowDoubleClicked}
            getRowClass={getRowClass}
            onFirstDataRendered={handleGridDataUpdated}
            onRowDataUpdated={handleGridDataUpdated}
	          />

	        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
          <div className="rounded-lg border border-white/5 bg-black/20 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-400">Grouped monitoring matrix</p>
              <p className="pt-1 text-[12px] font-semibold text-slate-100">Sorted by {groupOptions.find((option) => option.value === groupBy)?.label || groupBy}</p>
            </div>
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setCollapsedGroups(groupedSections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: false }), {}))}
                 className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-all"
               >
                 Expand All
               </button>
               <button 
                 onClick={() => setCollapsedGroups(groupedSections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: true }), {}))}
                 className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-all"
               >
                 Collapse All
               </button>
               <div className="w-px h-6 bg-white/10 mx-1" />
               <button 
                 onClick={() => setGroupBy('raw')}
                 className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[9px] font-semibold text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-2"
               >
                 <X size={12} />
                 <span>Cancel</span>
               </button>
            </div>
          </div>
          {groupedSections.map((section) => {
            const isCollapsed = collapsedGroups[section.key]
            const selectedCount = section.items.filter((item: any) => selectedIds.includes(item.id)).length
            return (
              <section key={section.key} className="glass-panel overflow-hidden rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => setCollapsedGroups((current) => ({ ...current, [section.key]: !current[section.key] }))}
                  className="flex w-full items-center justify-between gap-4 border-b border-white/5 bg-white/[0.03] px-5 py-4 text-left transition-all hover:bg-white/[0.05]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[9px] font-semibold text-blue-400">{groupOptions.find((option) => option.value === groupBy)?.label}</span>
                      <h3 className="text-sm font-semibold text-slate-100">{section.label}</h3>
                    </div>
                    <p className="pt-1 text-[11px] text-slate-400">{section.items.length} monitors{selectedCount ? ` · ${selectedCount} selected` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-white/5 bg-black/30 px-2.5 py-1 text-[9px] font-semibold text-slate-300">{section.items.length}</span>
                    {isCollapsed ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
                  </div>
                </button>
                {!isCollapsed && (
                  <div 
                    className="monitoring-grid-shell monitoring-grid w-full glass-panel rounded-lg overflow-hidden ag-theme-alpine-dark relative"
                    style={{ 
                      '--ag-font-size': `${fontSize}px`,
                      '--ag-font-family': "'Inter', sans-serif",
                      height: `${Math.min(600, section.items.length * (fontSize + rowDensity + 5) + 40)}px`
                    } as React.CSSProperties}
                  >
                    <GridMatrix
                      rowData={section.items} 
                      columnDefs={columnDefs} 
                      autoSizeStrategy={autoSizeStrategy}
                      colResizeDefault="normal"
                      fontSize={fontSize}
                      rowDensity={rowDensity}
                      context={gridContext}
                      getRowId={handleRowId}
                      onSelectionChanged={(e) => handleSelectionChanged(e, section.key)}
                      onColumnResized={handleMonitoringColumnResized}
                      onColumnMoved={handleColumnMoved}
                      onDragStopped={handleDragStopped}
                      onColumnPinned={handleColumnPinned}
                      onColumnVisible={handleColumnVisible}
                      onFilterChanged={handleFilterChanged}
                      onSortChanged={handleSortChanged}
                      onCellContextMenu={handleCellContextMenu}
                      onRowClicked={handleRowClicked}
                      onRowDoubleClicked={handleRowDoubleClicked}
                      getRowClass={getRowClass}
                      onFirstDataRendered={handleGridDataUpdated}
                      onRowDataUpdated={handleGridDataUpdated}
                    />
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      <BulkActionModals
        isStatusOpen={isBulkStatusOpen}
        isSeverityOpen={isBulkSeverityOpen}
        isNotifyOpen={isBulkNotifyOpen}
        onClose={() => { setIsBulkStatusOpen(false); setIsBulkSeverityOpen(false); setIsBulkNotifyOpen(false); }}
        onApply={(action, val) => bulkMutation.mutate({ action: 'update', payload: { [action]: val } })}
        count={selectedIds.length}
        severities={severities}
        notificationMethods={notificationMethods}
      />

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      <AnimatePresence>
        {isFormOpen && (
          <MonitoringForm 
            item={editingItem} 
            devices={devices}
            categories={categories}
            severities={severities}
            platforms={platforms}
            teams={teams}
            operators={operators || []}
            notificationMethods={notificationMethods}
            ownerRoles={ownerRoles}
            onClose={() => setIsFormOpen(false)} 
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
              if (editingItem?.id) {
                queryClient.invalidateQueries({ queryKey: ['monitoring-history', editingItem.id] })
              }
              setIsFormOpen(false)
            }}
          />
        )}
        {detailItem && (
          <MonitoringDetailModal
            item={detailItem}
            onClose={() => { setDetailItem(null); setDetailDeleteConfirm(false); }}
            onEdit={(monitor: any) => { setDetailItem(null); setEditingItem(monitor); setIsFormOpen(true); setDetailDeleteConfirm(false); }}
            onOpenHistory={(monitor: any) => { setDetailItem(null); setHistoryItem(monitor); setDetailDeleteConfirm(false); }}
            onOpenBkm={(monitor: any) => { setDetailItem(null); setBkmPopup({ docs: monitor.recovery_docs || [], monitorId: monitor.id }); setDetailDeleteConfirm(false); }}
            onDelete={(monitor: any) => {
              if (!detailDeleteConfirm) {
                setDetailDeleteConfirm(true)
                return
              }
              bulkMutation.mutate({ action: activeTab === 'active' ? 'delete' : 'purge', ids: [monitor.id] })
              setDetailItem(null)
              setDetailDeleteConfirm(false)
            }}
            onOpenAsset={(deviceId: number) => navigate(`/asset?id=${deviceId}`)}
            onOpenKnowledge={(knowledgeId: number) => navigate(`/knowledge?id=${knowledgeId}`)}
            deleteConfirm={detailDeleteConfirm}
          />
        )}
        {historyItem && <MonitoringHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}
        {recipientPopup && <RecipientsModal recipients={recipientPopup.recipients} method={recipientPopup.method} onClose={() => setRecipientPopup(null)} />}
        {bkmPopup && (
          <BkmListModal 
            docs={bkmPopup.docs} 
            monitorId={bkmPopup.monitorId}
            onOpenBkm={setActiveBkm} 
            onClose={() => setBkmPopup(null)} 
          />
        )}
        {activeBkm && <BkmDetailModal bkmId={activeBkm} onClose={() => setActiveBkm(null)} />}
        {compareOpen && <CompareMonitorsModal items={compareItems} onClose={() => setCompareOpen(false)} />}
        {showBulkEditModal && (
          <BulkEditTableModal
            items={selectedItems}
            teams={teams || []}
            operators={operators || []}
            severities={severities}
            notificationMethods={notificationMethods}
            onClose={() => setShowBulkEditModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
              setShowBulkEditModal(false)
            }}
          />
        )}
        <OperationalImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          tableName="monitoring_items"
          displayName="Monitoring"
        />
        <ConfigRegistryModal
            isOpen={showRegistry}
            onClose={() => setShowRegistry(false)}
            title="Monitoring Matrix Enumerations"
            sections={[
                { title: "Categories", category: "MonitoringCategory", icon: Layers },
                { title: "Platforms", category: "MonitoringPlatform", icon: Globe },
                { title: "Notification Methods", category: "NotificationMethod", icon: Bell },
            ]}
        />
      </AnimatePresence>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: #1a1b26;
          --ag-header-background-color: #24283b;
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #3b82f6;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label, .ag-header-group-cell-label { 
            font-weight: 700 !important; 
            text-transform: uppercase !important; 
            letter-spacing: 0.1em !important; 
            font-size: ${fontSize}px !important; 
            justify-content: center !important; 
            white-space: nowrap !important;
        }
        .ag-cell { 
            display: flex; 
            align-items: center; 
            justify-content: center !important; 
            font-weight: 700 !important;
            font-size: ${fontSize}px !important;
        }

	        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
	        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
          .row-action-trigger { opacity: 1; }
	        .ag-side-bar { background-color: #24283b !important; border-left: 1px solid rgba(255,255,255,0.05) !important; }
	      `}</style>
    </div>
  )
}

function BulkActionCard({ title, active, onClick }: { title: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
        active ? 'border-blue-500/40 bg-blue-950/40' : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold text-slate-100">{title}</p>
        <ChevronRight size={14} className={active ? 'text-blue-300' : 'text-slate-500'} />
      </div>
    </button>
  )
}

function InlineBulkEditor({ value, onChange, options, placeholder, actionLabel, onApply, disabled }: any) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b1220] p-3">
      <div className="grid gap-3">
        <AppDropdown
          value={value}
          onChange={(val) => onChange(val)}
          options={options}
          placeholder={placeholder}
        />
        <button
          onClick={onApply}
          disabled={disabled}
          className="rounded-lg border border-blue-500/20 bg-blue-600/15 px-4 py-2.5 text-[10px] font-semibold text-blue-200 transition-all hover:bg-blue-600/25 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-600"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}

function CompareMonitorsModal({ items, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [isMaximized, setIsMaximized] = useState(false)

  const fields = useMemo(() => [
    { label: 'Status', getValue: (item: any) => item.status || 'Unknown' },
    { label: 'Severity', getValue: (item: any) => item.severity || 'N/A' },
    { label: 'Platform', getValue: (item: any) => item.platform || 'N/A' },
    { label: 'Notify', getValue: (item: any) => item.notification_method || 'None' },
    { label: 'Owners', getValue: (item: any) => (item.owners || []).map((owner: any) => owner.name).join(', ') || 'None' },
    { label: 'Recovery', getValue: (item: any) => item.recovery_doc_titles?.join(', ') || 'None linked' },
    { label: 'Purpose', getValue: (item: any) => item.purpose || 'No purpose documented', multiline: true },
    { label: 'Created', getValue: (item: any) => formatAppDate(item.created_at) },
    { label: 'Updated', getValue: (item: any) => formatAppDate(item.updated_at) },
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
      title="Compare Monitors"
      subtitle={`Temporal Variance Analysis · Comparing ${items.length} monitoring states for semantic drift`}
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
                  <StatusPill value={item.severity} />
                </div>
                <h4 className="text-sm font-black text-white truncate mb-1">{item.title}</h4>
                <p className="text-[9px] font-bold text-slate-500 tracking-widest truncate">{item.device_name || 'No Target Asset'}</p>
                
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

function BulkActionModals({ isStatusOpen, isSeverityOpen, isNotifyOpen, onClose, onApply, severities, notificationMethods }: any) {
    const [val, setVal] = useState('')
    
    useEffect(() => { setVal(''); }, [isStatusOpen, isSeverityOpen, isNotifyOpen]);
    useEscapeDismiss(onClose)
    useBodyModalFlag()

    if (isStatusOpen) {
        return (
          <WorkspaceModal
            isOpen={true}
            onClose={onClose}
            size="compact"
            title="Update Status"
            subtitle="Apply a global status change to selection."
            icon={<Tag size={20} />}
            footerRight={
              <div className="flex items-center gap-3">
                <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
                <ToolbarButton 
                  disabled={!val} 
                  onClick={() => onApply('status', val)} 
                  variant="primary"
                >
                  Apply Status
                </ToolbarButton>
              </div>
            }
          >
            <div className="p-2">
              <AppDropdown
                value={val}
                onChange={v => setVal(v)}
                options={STATUSES}
                placeholder="Select Target Status..."
                label="New Status"
              />
            </div>
          </WorkspaceModal>
        )
    }

    if (isSeverityOpen) {
        return (
          <WorkspaceModal
            isOpen={true}
            onClose={onClose}
            size="compact"
            title="Update Severity"
            subtitle="Recalibrate alert priorities for selection."
            icon={<Shield size={20} />}
            footerRight={
              <div className="flex items-center gap-3">
                <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
                <ToolbarButton 
                  disabled={!val} 
                  onClick={() => onApply('severity', val)} 
                  variant="danger"
                >
                  Apply Severity
                </ToolbarButton>
              </div>
            }
          >
            <div className="p-2">
              <AppDropdown
                value={val}
                onChange={v => setVal(v)}
                options={severities.map((s:any) => ({ value: s.value, label: s.label }))}
                placeholder="Select Severity..."
                label="Target Severity"
              />
            </div>
          </WorkspaceModal>
        )
    }

    if (isNotifyOpen) {
        return (
          <WorkspaceModal
            isOpen={true}
            onClose={onClose}
            size="compact"
            title="Update Notification"
            subtitle="Reroute notification paths for selection."
            icon={<Bell size={20} />}
            footerRight={
              <div className="flex items-center gap-3">
                <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
                <ToolbarButton 
                  disabled={!val} 
                  onClick={() => onApply('notification_method', val)} 
                  variant="primary"
                >
                  Apply Method
                </ToolbarButton>
              </div>
            }
          >
            <div className="p-2">
              <AppDropdown
                value={val}
                onChange={v => setVal(v)}
                options={notificationMethods.map((m:any) => ({ value: m.value, label: m.label }))}
                placeholder="Select Method..."
                label="Notification Path"
              />
            </div>
          </WorkspaceModal>
        )
    }

    return null;
}

function BulkEditTableModal({ items, teams, operators, severities, notificationMethods, onClose, onSuccess }: any) {
  const [rows, setRows] = useState(() => items.map((item: any) => ({
    id: item.id,
    title: item.title,
    status: item.status || '',
    severity: item.severity || '',
    notification_method: item.notification_method || '',
    owner_team: item.owner_team || '',
    owner_user_ids: stringifyOwnerUserIds(item.owners || []),
    check_interval: item.check_interval ?? '',
    alert_duration: item.alert_duration ?? '',
    notification_throttle: item.notification_throttle ?? '',
    is_active: item.is_active !== false,
  })))
  const [isMaximized, setIsMaximized] = useState(false)

  useEscapeDismiss(onClose)

  const updateRow = (rowId: number, field: string, value: any) => {
    setRows((current: any[]) => current.map((row: any) => row.id === rowId ? { ...row, [field]: value } : row))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      for (const row of rows) {
        const payload = {
          status: row.status,
          severity: row.severity || null,
          notification_method: row.notification_method || null,
          owner_team: row.owner_team || null,
          owners: parseCommaSeparatedValues(row.owner_user_ids).map((externalId) => ({
            external_id: externalId,
            role: 'Primary Support',
          })),
          check_interval: row.check_interval === '' ? null : Number(row.check_interval),
          alert_duration: row.alert_duration === '' ? null : Number(row.alert_duration),
          notification_throttle: row.notification_throttle === '' ? null : Number(row.notification_throttle),
          is_active: Boolean(row.is_active),
        }
        const res = await apiFetch(`/api/v1/monitoring/${row.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
        await res.json()
      }
    },
    onSuccess: () => {
      showWorkspaceToast(`Updated ${rows.length} monitor${rows.length === 1 ? '' : 's'}`)
      onSuccess()
    },
    onError: (error: any) => showWorkspaceToast(error.message || 'Bulk edit failed', { type: 'error' }),
  })

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title="Bulk Edit Monitoring"
      subtitle="Safe table-based edits for selected monitors."
      icon={<Edit2 size={20} />}
      footerRight={
        <div className="flex items-center gap-3">
          <ToolbarButton onClick={onClose}>Close</ToolbarButton>
          <ToolbarButton 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending} 
            variant="primary"
            className="px-8 whitespace-nowrap"
          >
            {mutation.isPending ? <Clock className="animate-spin mr-2" size={14} /> : <Check className="mr-2" size={14} />}
            <span>Save Bulk Edit</span>
          </ToolbarButton>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-white/10 bg-black/20 px-5 py-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Selection</p>
          <p className="mt-1 text-[12px] font-bold text-slate-200">{rows.length} rows staged for modification</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <WorkspaceInfoTooltip
              label={<span>Allowed team names</span>}
              content={
                (teams || []).length > 0
                  ? (teams || []).map((team: any) => (
                      <div key={team.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-100">{team.name}</p>
                        <p className="mt-1 text-[9px] font-semibold text-slate-500">{team.operators?.length || 0} members</p>
                      </div>
                    ))
                  : <p>No teams available.</p>
              }
            />
            <WorkspaceInfoTooltip
              label={<span>Allowed owner user IDs</span>}
              content={
                (operators || []).length > 0
                  ? (operators as OperatorRecord[]).map((operator) => (
                      <div key={operator.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-100">{operator.external_id || operator.username || String(operator.id)}</p>
                        <p className="mt-1 text-[9px] font-semibold text-slate-500">{operator.full_name || operator.team || 'No team'}</p>
                      </div>
                    ))
                  : <p>No operators available.</p>
              }
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/20 custom-scrollbar">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-slate-950/90 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Title</th>
                <th className="min-w-[160px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Status</th>
                <th className="min-w-[160px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Severity</th>
                <th className="min-w-[180px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Notification</th>
                <th className="min-w-[220px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Owner Team(s)</th>
                <th className="min-w-[240px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Owner User ID(s)</th>
                <th className="min-w-[130px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Freq (s)</th>
                <th className="min-w-[130px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Delay (s)</th>
                <th className="min-w-[150px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Throttle (s)</th>
                <th className="min-w-[120px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row: any) => (
                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-200">{row.title}</td>
                  <td className="px-2 py-2"><AppDropdown value={row.status} onChange={(value) => updateRow(row.id, 'status', value)} options={STATUSES.filter((status) => status.value !== 'Deleted').map((status) => ({ value: status.value, label: status.label }))} placeholder="Status" /></td>
                  <td className="px-2 py-2"><AppDropdown value={row.severity} onChange={(value) => updateRow(row.id, 'severity', value)} options={severities.map((severity: any) => ({ value: severity.value, label: severity.label }))} placeholder="Severity" /></td>
                  <td className="px-2 py-2"><AppDropdown value={row.notification_method} onChange={(value) => updateRow(row.id, 'notification_method', value)} options={notificationMethods.map((method: any) => ({ value: method.value, label: method.label }))} placeholder="Notification" /></td>
                  <td className="px-2 py-2"><input value={row.owner_team} onChange={(event) => updateRow(row.id, 'owner_team', event.target.value)} placeholder="Team names..." className={`${monitoringInputClass()} h-[42px] px-3 py-2 text-[10px]`} /></td>
                  <td className="px-2 py-2"><input value={row.owner_user_ids} onChange={(event) => updateRow(row.id, 'owner_user_ids', event.target.value)} placeholder="User IDs..." className={`${monitoringInputClass()} h-[42px] px-3 py-2 text-[10px]`} /></td>
                  <td className="px-2 py-2"><input type="number" value={row.check_interval} min={CHECK_INTERVAL_MIN} max={CHECK_INTERVAL_MAX} onChange={(event) => updateRow(row.id, 'check_interval', event.target.value)} className={`${monitoringInputClass()} h-[42px] px-3 py-2 text-[10px] [appearance:textfield]`} /></td>
                  <td className="px-2 py-2"><input type="number" value={row.alert_duration} min={ALERT_DURATION_MIN} max={ALERT_DURATION_MAX} onChange={(event) => updateRow(row.id, 'alert_duration', event.target.value)} className={`${monitoringInputClass()} h-[42px] px-3 py-2 text-[10px] [appearance:textfield]`} /></td>
                  <td className="px-2 py-2"><input type="number" value={row.notification_throttle} min={NOTIFICATION_THROTTLE_MIN} max={NOTIFICATION_THROTTLE_MAX} onChange={(event) => updateRow(row.id, 'notification_throttle', event.target.value)} className={`${monitoringInputClass()} h-[42px] px-3 py-2 text-[10px] [appearance:textfield]`} /></td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => updateRow(row.id, 'is_active', !row.is_active)}
                      className={`w-full rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${row.is_active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-black/20 text-slate-500'}`}
                    >
                      {row.is_active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceModal>
  )
}

function RecipientsModal({ recipients, method, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="compact"
      title="Recipient matrix"
      subtitle={`Method: ${method}`}
      icon={<Users size={20} />}
      footerRight={
        <ToolbarButton onClick={onClose}>Dismiss</ToolbarButton>
      }
    >
      <div className="space-y-2">
        {recipients.map((r: string, i: number) => (
          <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-lg flex items-center space-x-3 group hover:border-emerald-500/30 transition-all shadow-inner">
            <Mail size={14} className="text-emerald-500" />
            <span className="text-[11px] font-bold text-slate-100">{r}</span>
          </div>
        ))}
        {recipients.length === 0 && (
          <WorkspaceEmptyState compact title="No recipients defined" description="No direct delivery targets found for this monitoring item." />
        )}
      </div>
    </WorkspaceModal>
  )
}

function BkmListModal({ docs, monitorId, onOpenBkm, onClose }: { docs: any[]; monitorId: number; onOpenBkm: (id: number) => void; onClose: () => void }) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [isMaximized, setIsMaximized] = useState(false)
  const queryClient = useQueryClient()
  const [recoverySearch, setRecoverySearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Normalize incoming docs to rich format immediately
  const normalizedDocs = useMemo(() => {
    return (docs || []).map(d => {
      if (typeof d === 'number') return { id: d, note: '', added_at: new Date().toISOString() }
      if (typeof d === 'object' && d !== null) return { id: Number(d.id), note: d.note || '', added_at: d.added_at }
      return null
    }).filter(Boolean) as MonitoringRecoveryDoc[]
  }, [docs])

  const [linkedDocs, setLinkedDocs] = useState<MonitoringRecoveryDoc[]>(normalizedDocs)

  useEffect(() => {
    setLinkedDocs(normalizedDocs)
  }, [normalizedDocs])

  const { data: knowledgeEntries } = useQuery({
    queryKey: ['knowledge-entries'],
    queryFn: async () => (await apiFetch('/api/v1/knowledge/')).json()
  })

  const filteredKnowledge = useMemo(() => {
    if (!knowledgeEntries) return []
    const linkedIds = linkedDocs.map(d => d.id)
    return knowledgeEntries.filter((e: any) => 
      (e.title.toLowerCase().includes(recoverySearch.toLowerCase()) ||
      e.category.toLowerCase().includes(recoverySearch.toLowerCase())) &&
      !linkedIds.includes(e.id)
    )
  }, [knowledgeEntries, recoverySearch, linkedDocs])

  const mutation = useMutation({
    mutationFn: async (nextDocs: MonitoringRecoveryDoc[]) => {
      const res = await apiFetch(`/api/v1/monitoring/${monitorId}`, {
        method: 'PUT',
        body: JSON.stringify({ recovery_docs: nextDocs })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Failed to update recovery procedures')
      }
      return res.json()
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
      queryClient.invalidateQueries({ queryKey: ['monitoring-history', monitorId] })
      showWorkspaceToast('Synchronized recovery procedures', { type: 'success' })
    },
    onError: (e: any) => showWorkspaceToast(e.message || 'Failed to update recovery procedures', { type: 'error' })
  })

  const isDirty = useMemo(() => {
    return JSON.stringify(linkedDocs) !== JSON.stringify(normalizedDocs)
  }, [linkedDocs, normalizedDocs])

  const toggleRecoveryDoc = (id: number) => {
    const isLinked = linkedDocs.some(d => d.id === id)
    const nextDocs = isLinked 
      ? linkedDocs.filter(d => d.id !== id) 
      : [...linkedDocs, { id, note: '', added_at: new Date().toISOString() }]
    setLinkedDocs(nextDocs)
  }

  const updateNote = (id: number, note: string) => {
    const nextDocs = linkedDocs.map(d => d.id === id ? { ...d, note } : d)
    setLinkedDocs(nextDocs)
  }

  const getTitle = (id: number) => {
    return (knowledgeEntries || []).find((e: any) => e.id === id)?.title || `KB-${id}`
  }

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="wide"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title="Recovery Procedures"
      subtitle="Knowledge-base linkage and operational guidance."
      icon={<BookOpen size={20} />}
      footerRight={
        <div className="flex items-center gap-3">
           <ToolbarButton onClick={onClose}>Dismiss</ToolbarButton>
           <ToolbarButton 
             variant="primary" 
             disabled={!isDirty || mutation.isPending}
             onClick={() => mutation.mutate(linkedDocs)}
           >
              {mutation.isPending ? 'Synchronizing...' : 'Synchronize Procedures'}
           </ToolbarButton>
        </div>
      }
    >
      <div className="space-y-8 pt-4 pb-4">
        <div className="flex items-center justify-between px-1">
           <div className="flex flex-col">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">Linked Procedures (BKM)</p>
              <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">Guaranteed operational response protocol</p>
           </div>
           <button 
             onClick={() => setIsAdding(!isAdding)}
             className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center space-x-1.5 ${isAdding ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'}`}
           >
              {isAdding ? <X size={12}/> : <Plus size={12}/>}
              <span>{isAdding ? 'Close Search' : 'Link Procedure'}</span>
           </button>
        </div>

        <div className="flex-1 space-y-6">
          {isAdding && (
            <div className="space-y-4 mb-8 p-6 bg-amber-500/[0.03] border border-amber-500/10 rounded-lg animate-in fade-in slide-in-from-top-2 shadow-inner">
               <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    value={recoverySearch}
                    onChange={e => setRecoverySearch(e.target.value)}
                    placeholder="Search Knowledge Base by title or category..."
                    className="w-full bg-black/60 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-[11px] font-bold text-white outline-none focus:border-amber-500/50 shadow-inner"
                  />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {filteredKnowledge.map((entry: any) => (
                    <button 
                      key={entry.id}
                      onClick={() => toggleRecoveryDoc(entry.id)}
                      className="text-left p-3 hover:bg-white/5 rounded-lg border border-white/5 flex items-center justify-between group transition-all"
                    >
                       <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-300 group-hover:text-amber-400 block truncate">{entry.title}</span>
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{entry.category}</span>
                       </div>
                       <Plus size={12} className="text-slate-600 group-hover:text-amber-500 shrink-0 ml-4" />
                    </button>
                  ))}
                  {filteredKnowledge.length === 0 && (
                    <div className="col-span-2 py-8 text-center">
                       <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">No available procedures found in registry</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {linkedDocs.map((doc: MonitoringRecoveryDoc, idx: number) => (
              <div 
                key={doc.id} 
                className="w-full bg-black/40 border border-white/5 p-5 rounded-lg space-y-4 group hover:border-amber-500/20 transition-all shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/20" />
                <div className="flex items-start justify-between relative z-10">
                   <div className="flex items-center space-x-4 flex-1 text-left min-w-0">
                      <div className="flex flex-col items-center">
                         <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-[12px] font-black text-slate-600 mb-1">
                            {idx + 1}
                         </div>
                         <div className="w-px h-4 bg-white/5" />
                      </div>
                      <button onClick={() => onOpenBkm(doc.id)} className="min-w-0 group/link">
                         <span className="text-[12px] font-black text-slate-200 block truncate leading-tight group-hover/link:text-amber-400 transition-colors">{getTitle(doc.id)}</span>
                         <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">DOC ID: KB-{doc.id}</span>
                            <div className="h-2.5 w-px bg-white/10" />
                            <div className="flex items-center gap-1.5">
                               <Clock size={10} className="text-slate-600" />
                               <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">
                                  Linked: {doc.added_at ? formatAppDate(doc.added_at) : 'Genesis'}
                               </span>
                            </div>
                         </div>
                      </button>
                   </div>
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleRecoveryDoc(doc.id)}
                        className="p-2 text-slate-700 hover:text-rose-500 transition-colors bg-white/[0.02] border border-white/5 rounded-lg"
                        title="Unlink Procedure"
                      >
                         <Trash2 size={14} />
                      </button>
                   </div>
                </div>
                
                <div className="relative pl-12">
                   <textarea
                     value={doc.note || ''}
                     onChange={e => updateNote(doc.id, e.target.value)}
                     placeholder="Specify operational context for this procedure (e.g. check version first)..."
                     className="w-full bg-white/[0.03] border border-white/5 rounded-lg p-3 text-[11px] font-bold text-slate-300 outline-none focus:border-blue-500/30 transition-all min-h-[80px] resize-none leading-relaxed shadow-inner"
                   />
                   <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-30 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                      <MessageSquare size={10} className="text-slate-500" />
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Operator Guidance</span>
                   </div>
                </div>
              </div>
            ))}
            {linkedDocs.length === 0 && !isAdding && (
               <div className="py-20">
                  <WorkspaceEmptyState 
                    icon={<BookOpen size={32} className="text-slate-800" />} 
                    title="Recovery Protocol Missing" 
                    description="No knowledge-base procedures have been linked to this monitor yet." 
                  />
               </div>
            )}
          </div>
        </div>
      </div>
    </WorkspaceModal>
  )
}

function BkmDetailModal({ bkmId, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [isMaximized, setIsMaximized] = useState(false)
  const { data: bkm, isLoading } = useQuery({
    queryKey: ['knowledge-entry', bkmId],
    queryFn: async () => (await apiFetch(`/api/v1/knowledge/${bkmId}`)).json(),
    enabled: !!bkmId
  })

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title={bkm?.title || 'Loading Document...'}
      subtitle={`BKM ID: KB-${bkmId}`}
      icon={<BookOpen size={20} />}
      footerRight={
        <ToolbarButton onClick={onClose}>Dismiss</ToolbarButton>
      }
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center space-y-4">
             <Clock size={32} className="text-amber-500 animate-spin" />
             <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest animate-pulse">Retrieving Knowledge...</span>
          </div>
        ) : (
          <>
             <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-8 shadow-inner">
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center space-x-2">
                   <Zap size={12}/> <span>Executive Summary</span>
                </h4>
                <p className="text-[13px] font-bold text-slate-200 leading-[1.8] whitespace-pre-wrap">{bkm?.content || 'No content provided.'}</p>
             </div>

             {bkm?.content_json?.steps?.length > 0 && (
               <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] border-l-2 border-amber-500 pl-4">Resolution Workflow</h4>
                  <div className="space-y-4 pl-4">
                     {bkm.content_json.steps.map((step: any, i: number) => (
                        <div key={i} className="flex space-x-6 relative">
                           {i < bkm.content_json.steps.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-white/5" />}
                           <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0 z-10 text-[12px] font-black text-amber-500 shadow-lg">
                              {i + 1}
                           </div>
                           <div className="bg-black/20 border border-white/5 rounded-lg p-5 flex-1 hover:border-amber-500/20 transition-all">
                              <h5 className="text-[11px] font-black uppercase text-slate-200 mb-1">{step.title}</h5>
                              <p className="text-[12px] text-slate-400 font-bold leading-relaxed">{step.description}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
             )}
             
             <div className="flex items-center justify-between px-1 border-t border-white/5 pt-6 mt-6">
                <div className="flex items-center space-x-3">
                   <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 border border-white/5">
                      <User size={16}/>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-white">Operational Kernel</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Knowledge Custodian</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Validated Protocol</p>
                   <p className="text-[8px] font-bold text-slate-700 mt-1">Trace: KNOWLEDGE-SYS-772</p>
                </div>
             </div>
          </>
        )}
      </div>
    </WorkspaceModal>
  )
}

function MonitoringDetailModal({ item, onClose, onEdit, onOpenHistory, onOpenBkm, onDelete, onOpenAsset, onOpenKnowledge, deleteConfirm }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [isMaximized, setIsMaximized] = useState(false)
  const [expandedLogic, setExpandedLogic] = useState<number | null>(item.logic_json?.[0]?.id || null)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [interventionDoc, setInterventionDoc] = useState<any>(null)

  const { data: suggestedKnowledge } = useQuery({
    queryKey: ['monitoring-knowledge-suggestions', item.id, item.device_id],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (item.device_id) params.append('device_id', String(item.device_id))
      params.append('monitoring_id', String(item.id))
      const response = await apiFetch(`/api/v1/knowledge?${params.toString()}`)
      const linked = await response.json()
      if (Array.isArray(linked) && linked.length > 0) return linked
      if (!item.device_id) return linked
      const fallback = await apiFetch(`/api/v1/knowledge?device_id=${item.device_id}`)
      return fallback.json()
    }
  })

  return (
    <>
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title={item.title}
      subtitle={`Monitor ID: ${item.id} · ${item.device_name || 'No Target Asset'}`}
      icon={<Monitor size={20} />}
      forensicLineage={{ createdAt: item.created_at, updatedAt: item.updated_at }}
      status={
        <div className="flex items-center gap-2">
          <StatusPill value={item.status} />
          <StatusPill value={item.severity} />
          <div className="h-3 w-px bg-white/10 mx-1" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
            {item.platform || 'No platform'} · {item.check_interval ? `${item.check_interval}s checks` : 'No frequency'}
          </span>
        </div>
      }
      footerRight={
        <div className="flex items-center gap-3">
            <ToolbarButton onClick={() => onEdit?.(item)}>Edit Monitor</ToolbarButton>
            <ToolbarButton onClick={() => onOpenHistory?.(item)}>History</ToolbarButton>
            <ToolbarButton onClick={() => onOpenBkm?.(item)}>Recovery</ToolbarButton>
            <ToolbarButton 
              variant="danger" 
              onClick={() => {
                if (deleteConfirm) {
                  const action = item.is_deleted ? 'Purged' : 'Archived';
                  onDelete?.(item);
                  showWorkspaceToast(`${action} ${item.title} from matrix`, {
                    type: 'success'
                  });
                } else {
                  onDelete?.(item);
                }
              }}
              className={deleteConfirm ? 'animate-pulse bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : ''}
            >
              {deleteConfirm 
                ? (item.is_deleted ? 'Confirm Purge?' : 'Confirm Archive?') 
                : (item.is_deleted ? 'Purge' : 'Archive')}
            </ToolbarButton>
        </div>
      }
    >
      <WorkspaceDossierShell
          body={
           <WorkspaceSplitView
             className="gap-8"
             sidebar={<div className="space-y-8">
                 <section className="space-y-3">
                    <h3 className="px-1 text-[11px] font-black text-slate-500 uppercase tracking-widest">Target scope</h3>
                    <div className="space-y-3">
                       <button
                         disabled={!item.device_id}
                         onClick={() => item.device_id && onOpenAsset?.(item.device_id)}
                         className="w-full rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-left transition-all hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-30 shadow-inner group"
                       >
                         <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Registry asset</p>
                            <ArrowRightLeft size={10} className="text-blue-500/50 group-hover:translate-x-1 transition-transform" />
                         </div>
                         <p className="text-[11px] font-black text-slate-100">{item.device_name || 'No linked asset'}</p>
                       </button>
                       
                       <div className="bg-black/20 border border-white/5 rounded-lg p-4 shadow-inner space-y-3">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Monitored services</p>
                          <div className="flex flex-wrap gap-1.5">
                             {item.monitored_service_names?.map((name: string, i: number) => (
                               <span key={i} className="bg-blue-600/10 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded-lg text-[9px] font-bold">
                                  {name}
                               </span>
                             ))}
                             {(!item.monitored_service_names || item.monitored_service_names.length === 0) && (
                               <span className="text-[9px] font-bold text-slate-700 italic">No services mapped</span>
                             )}
                          </div>
                       </div>
                    </div>
                 </section>

                 <section className="space-y-3">
                    <h3 className="px-1 text-[11px] font-black text-slate-500 uppercase tracking-widest">Recovery protocol</h3>
                    <div className="space-y-2">
                       {item.recovery_doc_details?.map((doc: any, i: number) => (
                         <button
                           key={i}
                           type="button"
                           onClick={() => doc.note ? setInterventionDoc(doc) : onOpenKnowledge?.(doc.id)}
                           className="w-full bg-slate-900/60 border border-white/5 rounded-lg p-3 flex items-center space-x-3 hover:border-amber-500/30 transition-all cursor-pointer group text-left shadow-inner"
                         >
                            <div className="p-1.5 bg-black/40 rounded-lg text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all"><FileText size={14}/></div>
                            <div className="min-w-0 flex-1">
                               <p className="text-[11px] font-bold text-slate-300 tracking-tight leading-tight group-hover:text-white truncate">{doc.title}</p>
                               <div className="flex items-center justify-between mt-0.5">
                                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Procedure {i+1}</p>
                                  {doc.note && (
                                     <div className="flex items-center gap-1 text-blue-500/60">
                                        <MessageSquare size={8} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Note attached</span>
                                     </div>
                                  )}
                               </div>
                            </div>
                         </button>
                       ))}
                       {(!item.recovery_doc_details || item.recovery_doc_details.length === 0) && (
                         <WorkspaceEmptyState compact icon={<AlertCircle size={18} />} title="No procedures linked" description="Guaranteed operational response protocol missing." />
                       )}
                    </div>
                 </section>

                 <section className="space-y-3">
                    <h3 className="px-1 text-[11px] font-black text-slate-500 uppercase tracking-widest">Operational meta</h3>
                    <div className="bg-white/5 border border-white/5 rounded-lg overflow-hidden divide-y divide-white/5 shadow-inner">
                       {[
                          { label: 'Platform', value: item.platform, color: 'text-blue-400', icon: Globe },
                          { label: 'Frequency', value: `${item.check_interval}s`, color: 'text-slate-300', icon: Clock },
                          { label: 'Throttle', value: `${item.notification_throttle}s`, color: 'text-amber-400', icon: Zap }
                       ].map((stat, i) => (
                          <div key={i} className="p-3 flex items-center justify-between hover:bg-white/5 transition-all">
                             <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-black/40 rounded-lg text-slate-600">
                                   <stat.icon size={12} />
                                </div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                             </div>
                             <span className={`text-[10px] font-black ${stat.color}`}>{stat.value}</span>
                          </div>
                       ))}
                    </div>
                 </section>

                 {item.monitoring_url && (
                    <button 
                       onClick={() => window.open(item.monitoring_url, '_blank')}
                       className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-3"
                    >
                       <ExternalLink size={14} />
                       <span>Open platform console</span>
                    </button>
                 )}
             </div>}
             main={<div className="space-y-8">
                 <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5 group hover:border-white/10 transition-all shadow-inner">
                       <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Info size={14}/></div>
                          <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Operational Purpose</h4>
                       </div>
                       <p className="text-[12px] font-bold text-slate-400 leading-relaxed pl-1">
                          {item.purpose || 'No purpose defined.'}
                       </p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5 group hover:border-white/10 transition-all shadow-inner">
                       <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><Zap size={14}/></div>
                          <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Failure Impact</h4>
                       </div>
                       <p className="text-[12px] font-bold text-slate-400 leading-relaxed pl-1">
                          {item.impact || 'No impact analysis defined.'}
                       </p>
                    </div>
                 </section>

                 <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-slate-800 text-slate-400 rounded-lg"><Code size={16} /></div>
                         <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Logic Specification</h3>
                      </div>
                      <button 
                         onClick={() => setShowLineNumbers(!showLineNumbers)}
                         className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${showLineNumbers ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                      >
                         {showLineNumbers ? 'Line Numbers: ON' : 'Line Numbers: OFF'}
                      </button>
                    </div>
                    <div className="space-y-3">
                       {item.logic_json?.map((log: any) => (
                         <div key={log.id} className="bg-[#0f172a] border border-white/5 rounded-lg overflow-hidden transition-all hover:border-white/10 shadow-lg">
                            <button 
                               onClick={() => setExpandedLogic(expandedLogic === log.id ? null : log.id)}
                               className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all group"
                            >
                               <div className="flex items-center space-x-4">
                                  <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 uppercase tracking-widest">{log.type}</span>
                                  <span className="text-slate-300 font-bold text-[11px] tracking-tight group-hover:text-white transition-colors">{log.description}</span>
                               </div>
                               {expandedLogic === log.id ? <ChevronUp size={16} className="text-slate-600" /> : <ChevronDown size={16} className="text-slate-600" />}
                            </button>
                            <AnimatePresence>
                               {expandedLogic === log.id && (
                                 <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: 'auto', opacity: 1 }} 
                                    exit={{ height: 0, opacity: 0 }} 
                                    className="overflow-hidden bg-black/40 border-t border-white/5"
                                 >
                                    <div className="flex font-mono text-[11px] leading-relaxed overflow-x-auto custom-scrollbar">
                                       {showLineNumbers && (
                                          <div className="bg-white/5 border-r border-white/10 px-3 py-5 text-slate-700 text-right select-none whitespace-pre min-w-[40px]">
                                             {log.logic_info.split('\n').map((_: any, i: number) => i + 1).join('\n')}
                                          </div>
                                       )}
                                       <pre className="p-5 text-emerald-400 flex-1 selection:bg-emerald-500/20">
                                          {log.logic_info}
                                       </pre>
                                    </div>
                                 </motion.div>
                               )}
                            </AnimatePresence>
                         </div>
                       ))}
                       {(!item.logic_json || item.logic_json.length === 0) && (
                         <WorkspaceEmptyState icon={<Terminal size={32} />} title="No logic specification found" description="This monitor has no active logic entries defined." />
                       )}
                    </div>
                 </section>

                 <section className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                       <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg"><Users size={16} /></div>
                       <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Ownership Matrix</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5 shadow-inner">
                          <h4 className="text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Primary Team Mapping</h4>
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                <Briefcase size={14} />
                             </div>
                             <p className="text-[12px] font-black text-slate-200">{item.owner_team || 'Unassigned'}</p>
                          </div>
                       </div>
                       <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5 shadow-inner">
                          <h4 className="text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Assigned Personnel</h4>
                          <div className="flex flex-wrap gap-2">
                             {item.owners?.map((o: any, i: number) => (
                               <div key={i} className="bg-blue-600/10 border border-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                                  <UserCheck size={10} className="text-blue-500" />
                                  <span>{o.name} <span className="text-slate-500 font-normal ml-1">[{o.role}]</span></span>
                               </div>
                             ))}
                             {(!item.owners || item.owners.length === 0) && (
                               <div className="flex items-center gap-2 text-slate-600 py-1">
                                  <AlertCircle size={12} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">No individual owners assigned</span>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                 </section>
             </div>}
           />
        }
      />
    </WorkspaceModal>

    <AnimatePresence>
       {interventionDoc && (
          <WorkspaceModal
            isOpen={true}
            onClose={() => setInterventionDoc(null)}
            size="compact"
            title="Operational Guidance"
            subtitle={`Pre-recovery briefing for: ${interventionDoc.title}`}
            icon={<Shield size={20} className="text-amber-500" />}
            footerRight={
               <div className="flex items-center gap-3">
                  <ToolbarButton onClick={() => setInterventionDoc(null)}>Cancel</ToolbarButton>
                  <ToolbarButton 
                    variant="primary" 
                    onClick={() => {
                       const id = interventionDoc.id;
                       setInterventionDoc(null);
                       onOpenKnowledge?.(id);
                    }}
                  >
                     Confirm & Open Procedure
                  </ToolbarButton>
               </div>
            }
          >
             <div className="space-y-6 pt-2">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-5 shadow-inner">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-black/40 rounded-lg text-amber-500"><MessageSquare size={16} /></div>
                      <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Operator Note</h4>
                   </div>
                   <p className="text-[12px] font-bold text-slate-200 leading-relaxed italic">
                      "{interventionDoc.note}"
                   </p>
                </div>
                
                <div className="flex items-start gap-4 px-1">
                   <div className="mt-1 p-1.5 bg-blue-500/10 rounded-full text-blue-400"><Info size={12} /></div>
                   <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                         The following procedure contains verified restoration steps. Please ensure you have read the guidance note above carefully before initiating recovery.
                      </p>
                   </div>
                </div>
             </div>
          </WorkspaceModal>
       )}
    </AnimatePresence>
    </>
  )
}

// --- REST OF THE FORM COMPONENT ---

const LOGIC_TYPES = ['Threshold', 'Regex', 'Query', 'Health Check', 'Log Pattern', 'Synthetic', 'Custom']

const LOGIC_SUGGESTIONS: any = {
  'Threshold': 'Example: cpu_usage > 90% for 5m\nWait for 3 consecutive violations before alerting.',
  'Regex': 'Example: /.*(Critical|Error|Fatal).*/i\nCapture group $1 for metadata enrichment.',
  'Query': 'Example: SELECT average(load) FROM system_metrics WHERE host = "$TARGET" AND time > now() - 10m',
  'Health Check': 'Example: HTTP GET /api/health\nExpected Status: 200\nTimeout: 5000ms',
  'Log Pattern': 'Example: [TIMESTAMP] [LEVEL] [COMPONENT] [MESSAGE]\nDetect spike in "Connection Refused" patterns.',
  'Synthetic': 'Example: Browser Script\n1. Navigate to /login\n2. Fill credentials\n3. Verify dashboard element exists',
  'Custom': 'Enter full custom logic script or detailed specifications here...'
}

const getLogicExtensions = (logicType?: MonitoringLogicEntry['type']) => {
  if (logicType === 'Query') return [sql()]
  return [javascript()]
}

type MonitoringFormErrors = Record<string, string>

const parseCommaSeparatedValues = (value: string | null | undefined) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

const stringifyOwnerUserIds = (owners: MonitoringOwner[] = []) =>
  owners
    .map((owner) => owner.external_id || owner.name || String(owner.operator_id))
    .filter(Boolean)
    .join(', ')

const isMonitoringFieldRequired = (fieldName: string) => MONITORING_REQUIRED_FIELD_NAMES.has(fieldName)

const buildMonitoringFormErrors = (formData: any) => {
  const errors: MonitoringFormErrors = {}
  const unsafeUrlPattern = /[<>"']|javascript:|data:|vbscript:/i

  if (isMonitoringFieldRequired('title') && !formData.title?.trim()) errors.title = 'Title is required.'
  if (isMonitoringFieldRequired('category') && !formData.category) errors.category = 'Category is required.'
  if (isMonitoringFieldRequired('status') && !formData.status) errors.status = 'Status is required.'
  if (isMonitoringFieldRequired('severity') && !formData.severity) errors.severity = 'Severity is required.'

  if (formData.monitoring_url) {
    try {
      const parsed = new URL(formData.monitoring_url)
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
        errors.monitoring_url = 'Monitoring URL must use http/https and include a host.'
      }
    } catch {
      errors.monitoring_url = 'Monitoring URL must be a valid http/https URL.'
    }
    if (unsafeUrlPattern.test(formData.monitoring_url)) {
      errors.monitoring_url = 'Monitoring URL contains unsafe content.'
    }
  }

  if (Number.isNaN(formData.check_interval) || formData.check_interval < CHECK_INTERVAL_MIN || formData.check_interval > CHECK_INTERVAL_MAX) {
    errors.check_interval = `Check interval must be between ${CHECK_INTERVAL_MIN} and ${CHECK_INTERVAL_MAX} seconds.`
  }
  if (Number.isNaN(formData.alert_duration) || formData.alert_duration < ALERT_DURATION_MIN || formData.alert_duration > ALERT_DURATION_MAX) {
    errors.alert_duration = `Alert duration must be between ${ALERT_DURATION_MIN} and ${ALERT_DURATION_MAX} seconds.`
  }
  if (Number.isNaN(formData.notification_throttle) || formData.notification_throttle < NOTIFICATION_THROTTLE_MIN || formData.notification_throttle > NOTIFICATION_THROTTLE_MAX) {
    errors.notification_throttle = `Notification throttle must be between ${NOTIFICATION_THROTTLE_MIN} and ${NOTIFICATION_THROTTLE_MAX} seconds.`
  }

  if (formData.severity === 'Critical' && !formData.recovery_docs?.length) {
    errors.recovery_docs = 'Critical monitors require at least one linked recovery procedure.'
  }

  ;(formData.logic_json || []).forEach((entry: MonitoringLogicEntry) => {
    if (!entry.description?.trim()) errors[`logic_${entry.id}_description`] = 'Logic description is required.'
    if (!entry.logic_info?.trim()) errors[`logic_${entry.id}_logic_info`] = 'Logic definition is required.'
  })

  return errors
}

const getMonitoringTabErrorCounts = (errors: MonitoringFormErrors) => ({
  context: Object.keys(errors).filter((key) => ['title', 'category', 'status', 'owner_team', 'owners', 'ownership', 'monitoring_url'].includes(key)).length,
  logic: Object.keys(errors).filter((key) => ['check_interval', 'alert_duration'].includes(key) || key.startsWith('logic_')).length,
  alerting: Object.keys(errors).filter((key) => ['severity', 'notification_method', 'notification_throttle', 'recovery_docs'].includes(key)).length,
})

const monitoringInputClass = (error?: string) => getWorkspaceInputClass(error)

function MonitoringAssetField({
  devices,
  deviceId,
  onChange,
  error,
}: {
  devices: any[]
  deviceId: number | null
  onChange: (deviceId: number | null) => void
  error?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [systemFilter, setSystemFilter] = useState('ALL')
  const { triggerRef, panelRef, panelStyle } = useWorkspaceAnchoredLayer(isOpen, { minWidth: 420 })
  const selectedDevice = devices?.find((device: any) => device.id === deviceId)
  const systems = Array.from(new Set((devices || []).map((device: any) => device.system).filter(Boolean))).sort()
  const filteredDevices = (devices || []).filter((device: any) => {
    const matchesSystem = systemFilter === 'ALL' || device.system === systemFilter
    const needle = `${device.name} ${device.system || ''}`.toLowerCase()
    const matchesSearch = !search || needle.includes(search.toLowerCase())
    return matchesSystem && matchesSearch
  })

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setIsOpen(false)
    }
    window.addEventListener('mousedown', handleClick)

    return () => {
      window.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, panelRef, triggerRef])

  return (
    <div className="space-y-1.5">
      <FieldLabel label="Registry Asset" />
      <div>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          ref={(node) => {
            triggerRef.current = node
          }}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${error ? 'border-rose-500/60 bg-rose-500/10' : 'border-white/10 bg-slate-950/70 hover:border-blue-500/30'}`}
        >
          <span className={`text-[clamp(10px,0.85vw,12px)] font-black truncate pr-4 ${selectedDevice ? 'text-slate-100' : 'text-slate-500'}`}>
            {selectedDevice ? `${selectedDevice.name} [${selectedDevice.system}]` : 'Select asset'}
          </span>
          <ChevronDown size={12} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && createPortal(
          <div ref={panelRef} style={panelStyle}>
            <WorkspaceFloatingPanel
              kind="menu"
              className="p-2"
            >
            <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
              <MonitoringSelectField
                label="System Filter"
                value={systemFilter}
                onChange={(value) => setSystemFilter(value)}
                options={[{ value: 'all', label: 'All Systems' }, ...systems.map((system) => ({ value: system, label: system }))]}
                placeholder="All Systems"
                />
              <div className="space-y-1.5">
                <FieldLabel label="Search Asset" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search hostname or system..."
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black text-slate-100 outline-none focus:border-blue-500/40"
                />
              </div>
            </div>
            <div className="mt-2 max-h-52 overflow-y-auto custom-scrollbar space-y-1 pr-1">
              <button
                type="button"
                onClick={() => {
                  onChange(null)
                  setIsOpen(false)
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${deviceId == null ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/5 bg-black/20 hover:border-white/10'}`}
              >
                <p className="text-[9px] font-black text-slate-200">No linked asset</p>
              </button>
              {filteredDevices.map((device: any) => (
                <button
                  key={device.id}
                  type="button"
                  onClick={() => {
                    onChange(device.id)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${device.id === deviceId ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/5 bg-black/20 hover:border-white/10'}`}
                >
                  <p className={`text-[9px] font-black ${device.id === deviceId ? 'text-blue-300' : 'text-slate-200'}`}>{device.name}</p>
                  <p className="mt-0.5 text-[8px] font-black text-slate-500 truncate">{device.system || 'No system'}</p>
                </button>
              ))}
            </div>
            </WorkspaceFloatingPanel>
          </div>,
          document.body
        )}
      </div>
      <FieldError message={error} />
    </div>
  )
}

export function MonitoringForm({ item, devices, categories, severities, platforms, teams, operators, notificationMethods, ownerRoles, onClose, onSuccess }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [activeTab, setActiveTab] = useState<'context' | 'logic' | 'alerting'>('context')
  const [recoverySearch, setRecoverySearch] = useState('')
  const [activeLogicId, setActiveLogicId] = useState<number | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const initialItemPayload = sanitizeMonitoringPayload(item)
  const { logic_json: initialLogicJson = [], ...initialItemFields } = initialItemPayload || {}

  const [formData, setFormData] = useState<{
    category: string
    status: string
    title: string
    spec: string
    platform: string
    monitoring_url: string
    purpose: string
    impact: string
    notification_method: string
    notification_recipients: string[]
    logic: string
    logic_json: MonitoringLogicEntry[]
    device_id: number | null
    monitored_services: number[]
    owner_team: string
    check_interval: number
    alert_duration: number
    notification_throttle: number
    severity: string
    is_active: boolean
    recovery_docs: number[]
    owners: MonitoringOwner[]
  }>({
    category: 'Infrastructure',
    status: 'Planned',
    title: '',
    spec: '',
    platform: platforms?.[0]?.value || 'Zabbix',
    monitoring_url: '',
    purpose: '',
    impact: '',
    notification_method: 'Email',
    notification_recipients: [],
    logic: '',
    device_id: null,
    monitored_services: [],
    owner_team: '',
    check_interval: 60,
    alert_duration: 0,
    notification_throttle: 3600,
    severity: 'Warning',
    is_active: true,
    recovery_docs: [],
    owners: [],
    ...initialItemFields,
    logic_json: initialLogicJson as MonitoringLogicEntry[]
  })

  const [ownershipMode, setOwnershipMode] = useState<'team' | 'individual'>(
    initialItemFields?.owner_team ? 'team' : (initialItemFields?.owners?.length ? 'individual' : 'team')
  )
  const [newOwner, setNewOwner] = useState<{ operator_id: string; role: string }>({ operator_id: '', role: ownerRoles?.[0]?.value || 'Primary Support' })
  const [recipientInput, setRecipientInput] = useState('')
  const [formErrors, setFormErrors] = useState<MonitoringFormErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    target: false,
    ownership: false,
    platform: false,
    context: false,
    logicEntries: false,
    logicEditor: false,
    executionPolicy: false,
    alerting: false,
    recipients: false,
    recovery: false,
  })

  const selectedTeams = useMemo(
    () => {
      const selectedTeamNames = new Set(parseCommaSeparatedValues(formData.owner_team))
      return (teams || []).filter((team: MonitoringTeamOption) => selectedTeamNames.has(team.name))
    },
    [teams, formData.owner_team]
  )

  const teamOperators = useMemo(() => {
    if (!selectedTeams.length) return operators as OperatorRecord[]
    const teamIds = new Set(selectedTeams.map((team) => team.id))
    return (operators as OperatorRecord[]).filter((operator) => operator.team_id != null && teamIds.has(operator.team_id))
  }, [operators, selectedTeams])

  const tabErrors = useMemo(() => getMonitoringTabErrorCounts(formErrors), [formErrors])

  const setOwnershipModeAndNormalize = (mode: 'team' | 'individual') => {
    setOwnershipMode(mode)
    setFormErrors((current) => {
      const next = { ...current }
      delete next.owner_team
      delete next.owners
      delete next.ownership
      return next
    })
  }

  const activeLogicErrors = activeLogicId == null
    ? { description: '', logic_info: '' }
    : {
        description: formErrors[`logic_${activeLogicId}_description`],
        logic_info: formErrors[`logic_${activeLogicId}_logic_info`]
      }

  const toggleSection = (key: string) => {
    setCollapsedSections((current) => ({ ...current, [key]: !current[key] }))
  }

  const addOwner = () => {
    const operatorId = Number(newOwner.operator_id)
    const selectedOperator = teamOperators.find((operator) => operator.id === operatorId) || (operators as OperatorRecord[]).find((operator) => operator.id === operatorId)
    if (selectedOperator && !formData.owners.some((owner) => owner.operator_id === operatorId)) {
       setFormData({
         ...formData,
         owners: [
           ...formData.owners,
           {
             operator_id: operatorId,
             role: newOwner.role,
             name: selectedOperator.full_name || selectedOperator.username || selectedOperator.external_id,
             external_id: selectedOperator.external_id
           }
         ]
       })
       setFormErrors((current) => {
         const next = { ...current }
         delete next.owners
         delete next.ownership
         return next
       })
       setNewOwner({ operator_id: '', role: ownerRoles?.[0]?.value || 'Primary Support' })
    }
  }

  const removeOwner = (idx: number) => {
    const next = [...formData.owners]
    next.splice(idx, 1)
    setFormData({ ...formData, owners: next })
  }

  // Sync is_active with status
  useEffect(() => {
    if (!item) { // Only for new items or when status explicitly changes
       if (formData.status === 'Existing') {
         setFormData(prev => ({ ...prev, is_active: true }))
       } else {
         setFormData(prev => ({ ...prev, is_active: false }))
       }
    }
  }, [formData.status, item])

  // Initialize activeLogicId if entries exist
  useEffect(() => {
    if (formData.logic_json?.length > 0 && activeLogicId === null) {
      setActiveLogicId(formData.logic_json[0].id)
    }
  }, [formData.logic_json])

  useEffect(() => {
    if (Object.keys(formErrors).length === 0 && !generalError) return
    setFormErrors(buildMonitoringFormErrors(formData))
  }, [formData, ownershipMode])

  // Fetch services for selected device
  const { data: deviceServices } = useQuery({
    queryKey: ['device-services', formData.device_id],
    queryFn: async () => {
      if (!formData.device_id) return []
      return (await apiFetch(`/api/v1/logical-services/?device_id=${formData.device_id}`)).json()
    },
    enabled: !!formData.device_id
  })

  // Fetch knowledge entries for recovery docs
  const { data: knowledgeEntries } = useQuery({
    queryKey: ['knowledge-entries'],
    queryFn: async () => (await apiFetch('/api/v1/knowledge/')).json()
  })

  const filteredKnowledge = useMemo(() => {
    if (!knowledgeEntries) return []
    return knowledgeEntries.filter((e: any) => 
      e.title.toLowerCase().includes(recoverySearch.toLowerCase()) ||
      e.category.toLowerCase().includes(recoverySearch.toLowerCase())
    )
  }, [knowledgeEntries, recoverySearch])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = item ? `/api/v1/monitoring/${item.id}` : '/api/v1/monitoring/'
      const method = item ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(sanitizeMonitoringPayload(data)) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Failed to save monitoring item')
      }
      return res.json()
    },
    onSuccess: (data: any) => {
      setGeneralError('')
      const action = item ? 'Synchronized' : 'Deployed';
      const detail = item ? 'Changes propagated' : 'New monitor live';
      showWorkspaceToast(`${action} ${data.title || formData.title}`, {
        type: 'success'
      })
      onSuccess()
    },
    onError: (e: any) => {
      const message = e.message || 'Failed to save monitoring item'
      setGeneralError(message)
      showWorkspaceToast(message, { type: 'error' })
      if (message.toLowerCase().includes('recovery')) setActiveTab('alerting')
      else if (message.toLowerCase().includes('owner') || message.toLowerCase().includes('team')) setActiveTab('context')
      else if (message.toLowerCase().includes('interval') || message.toLowerCase().includes('logic')) setActiveTab('logic')
    }
  })

  const toggleService = (id: number) => {
    const current = [...(formData.monitored_services || [])]
    const idx = current.indexOf(id)
    if (idx > -1) {
      current.splice(idx, 1)
    } else {
      current.push(id)
    }
    setFormData({ ...formData, monitored_services: current })
  }

  const toggleRecoveryDoc = (id: number) => {
    const current = [...(formData.recovery_docs || [])]
    const idx = current.findIndex((d: any) => (typeof d === 'number' ? d === id : d.id === id))
    if (idx > -1) {
      current.splice(idx, 1)
    } else {
      current.push({ id, note: '' })
    }
    setFormData({ ...formData, recovery_docs: current })
  }

  const addLogicEntry = () => {
    const id = Date.now()
    const newEntries: MonitoringLogicEntry[] = [...(formData.logic_json || []), { type: 'Threshold', description: '', logic_info: '', id }]
    setFormData({ ...formData, logic_json: newEntries })
    setActiveLogicId(id)
  }

  const removeLogicEntry = (id: number) => {
    const filtered = formData.logic_json.filter((e: MonitoringLogicEntry) => e.id !== id)
    setFormData({ ...formData, logic_json: filtered })
    if (activeLogicId === id) {
      setActiveLogicId(filtered.length > 0 ? filtered[0].id : null)
    }
  }

  const updateLogicEntry = (id: number, field: keyof MonitoringLogicEntry, value: string) => {
    const newEntries = formData.logic_json.map((e: MonitoringLogicEntry) => e.id === id ? { ...e, [field]: value } : e)
    setFormData({ ...formData, logic_json: newEntries })
  }

  const activeLogicEntry = formData.logic_json?.find((e: MonitoringLogicEntry) => e.id === activeLogicId)
  const selectedDevice = useMemo(
    () => (devices || []).find((device: any) => device.id === formData.device_id),
    [devices, formData.device_id]
  )
  const linkedRecoveryDocs = useMemo(
    () => (knowledgeEntries || []).filter((entry: any) => formData.recovery_docs?.includes(entry.id)),
    [knowledgeEntries, formData.recovery_docs]
  )
  const ownershipSummary = [
    parseCommaSeparatedValues(formData.owner_team).length
      ? `${parseCommaSeparatedValues(formData.owner_team).length} team${parseCommaSeparatedValues(formData.owner_team).length === 1 ? '' : 's'}`
      : null,
    formData.owners?.length
      ? `${formData.owners.length} owner${formData.owners.length === 1 ? '' : 's'}`
      : null,
  ].filter(Boolean).join(' · ') || 'No owners assigned'
  const summaryIssues = useMemo(() => {
    const issues: Array<{ label: string; tab: 'context' | 'logic' | 'alerting'; anchor: string }> = []
    Object.keys(formErrors).forEach((key) => {
      if (['title', 'category', 'status', 'owner_team', 'owners', 'ownership', 'monitoring_url'].includes(key)) {
        issues.push({ label: formErrors[key] || 'Context issue', tab: 'context', anchor: 'monitoring-context-root' })
      } else if (['check_interval', 'alert_duration'].includes(key) || key.startsWith('logic_')) {
        issues.push({ label: formErrors[key] || 'Logic issue', tab: 'logic', anchor: 'monitoring-logic-root' })
      } else if (['severity', 'notification_method', 'notification_throttle', 'recovery_docs'].includes(key)) {
        issues.push({ label: formErrors[key] || 'Alerting issue', tab: 'alerting', anchor: 'monitoring-alerting-root' })
      }
    })
    return issues
  }, [formErrors])

  const addRecipient = () => {
    if (recipientInput && !formData.notification_recipients.includes(recipientInput)) {
      setFormData({ ...formData, notification_recipients: [...formData.notification_recipients, recipientInput] })
      setRecipientInput('')
    }
  }

  const removeRecipient = (r: string) => {
    setFormData({ ...formData, notification_recipients: formData.notification_recipients.filter((item: string) => item !== r) })
  }

  const handleSave = () => {
    const errors = buildMonitoringFormErrors(formData)
    setFormErrors(errors)
    setGeneralError('')
    if (Object.keys(errors).length > 0) {
      const counts = getMonitoringTabErrorCounts(errors)
      if (counts.context > 0) setActiveTab('context')
      else if (counts.logic > 0) setActiveTab('logic')
      else if (counts.alerting > 0) setActiveTab('alerting')
      showWorkspaceToast('Resolve the highlighted form errors before saving', { type: 'error' })
      return
    }
    mutation.mutate(formData)
  }

  const jumpToSection = (tab: 'context' | 'logic' | 'alerting', anchor: string) => {
    setActiveTab(tab)
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 80)
    })
  }

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(prev => !prev)}
      title={item ? 'Update Monitoring' : 'Add Monitoring'}
      subtitle={item ? `Adjusting configuration for ${item.title}` : "Configure monitoring targets, logic, and alert routing."}
      icon={item ? <Edit2 size={20} /> : <Plus size={20} />}
      status={
        <div className="flex items-center gap-2">
          <StatusPill value={formData.status} />
          <StatusPill value={formData.severity} />
          {formData.platform && (
            <>
              <div className="h-3 w-px bg-white/10 mx-1" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{formData.platform}</span>
            </>
          )}
        </div>
      }
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as 'context' | 'logic' | 'alerting')}
      tabs={[
        { id: 'context', label: 'Context', badgeCount: tabErrors.context },
        { id: 'logic', label: 'Logic', badgeCount: tabErrors.logic },
        { id: 'alerting', label: 'Alerting', badgeCount: tabErrors.alerting },
      ]}
      footerLeft={
          <button 
            onClick={() => {
              if (formData.status === 'Existing') {
                setFormData({...formData, is_active: !formData.is_active})
              }
            }}
            disabled={formData.status !== 'Existing'}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
              formData.is_active 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-slate-500/10 border-white/10 text-slate-500 hover:bg-white/5 hover:text-white'
            } ${formData.status !== 'Existing' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{formData.is_active ? 'Monitor Active' : 'Monitor Paused'}</span>
          </button>
      }
      footerRight={
        <div className="flex items-center gap-3 flex-nowrap shrink-0">
          <ToolbarButton onClick={onClose} className="whitespace-nowrap">Close</ToolbarButton>
          <ToolbarButton 
            onClick={handleSave} 
            disabled={mutation.isPending} 
            variant="primary"
            className="px-8 whitespace-nowrap"
          >
            {mutation.isPending ? <Clock className="animate-spin mr-2" size={14} /> : <Check className="mr-2" size={14} />}
            <span>{item ? 'Save Monitoring' : 'Add Monitoring'}</span>
          </ToolbarButton>
        </div>
      }
    >
      <div className="space-y-8 pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-6">
              <div id="monitoring-header-title" className="col-span-12 lg:col-span-6 space-y-2">
                <FieldLabel label="Monitoring Item Title" required />
                <input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. CORE-DB: High CPU Load Alert"
                  className={monitoringInputClass(formErrors.title)}
                />
                <FieldError message={formErrors.title} />
              </div>
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 space-y-2">
                <MonitoringSelectField
                  label="Status"
                  required={isMonitoringFieldRequired('status')}
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: value })}
                  options={STATUSES.map(s => ({ value: s.value, label: s.value }))}
                  error={formErrors.status}
                />
              </div>
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 space-y-2">
                <MonitoringSelectField
                  label="Severity"
                  required={isMonitoringFieldRequired('severity')}
                  value={formData.severity}
                  onChange={(value) => setFormData({ ...formData, severity: value })}
                  options={severities.map((severity: any) => ({ value: severity.value, label: severity.label }))}
                  error={formErrors.severity}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 space-y-2">
                <MonitoringSelectField
                  label="Logic Category"
                  required={isMonitoringFieldRequired('category')}
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value })}
                  options={categories.map((c: any) => ({ value: c.value, label: c.label }))}
                  error={formErrors.category}
                />
              </div>
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 space-y-2">
                <MonitoringSelectField
                  label="Target Platform"
                  value={formData.platform}
                  onChange={(value) => setFormData({ ...formData, platform: value })}
                  options={(platforms || []).map((platform: any) => ({ value: platform.value, label: platform.label }))}
                  placeholder="Select platform"
                  error={formErrors.platform}
                  searchable
                />
              </div>
            </div>
          </div>
          <WorkspaceValidationBanner message={generalError} />

          <WorkspaceSplitView
            main={
              <div className="min-w-0">
                {activeTab === 'context' ? (
                  <div id="monitoring-context-root" className="space-y-5 p-2">
                    <WorkspaceSectionCard id="monitoring-target-card">
                      <WorkspaceCollapsibleHeader
                        title="Target identity"
                        subtitle="Define scope, secure console access, and linked service coverage."
                        badge={<WorkspaceSectionBadge>Asset + scope</WorkspaceSectionBadge>}
                        collapsed={collapsedSections.target}
                        onToggle={() => toggleSection('target')}
                      />
                      {!collapsedSections.target && <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                          <div className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-4 shadow-inner">
                            <div className="flex items-center justify-between">
                              <div>
                                <PanelTitle>Registry asset and service scope</PanelTitle>
                                <PanelSubtitle>Link a registry asset and select the services covered by this monitor.</PanelSubtitle>
                              </div>
                              <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[9px] font-black text-blue-300">
                                {formData.monitored_services?.length || 0} linked
                              </span>
                            </div>

                            <div className="space-y-4">
                              <MonitoringAssetField
                                devices={devices || []}
                                deviceId={formData.device_id}
                                onChange={(deviceId) => setFormData({ ...formData, device_id: deviceId, monitored_services: [] })}
                              />

                              {formData.device_id ? (
                                <div className="space-y-2">
                                  <FieldLabel label="Service Coverage" />
                                  <div className="flex flex-wrap gap-1.5">
                                    {deviceServices?.map((svc: any) => (
                                      <button
                                        key={svc.id}
                                        type="button"
                                        onClick={() => toggleService(svc.id)}
                                        className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-black transition-all ${
                                          formData.monitored_services?.includes(svc.id)
                                            ? 'border-blue-500/40 bg-blue-500/12 text-blue-200'
                                            : 'border-white/10 bg-slate-950/60 text-slate-500 hover:border-white/20 hover:text-slate-200'
                                        }`}
                                      >
                                        {svc.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <WorkspaceEmptyState
                                  compact
                                  title="Choose an asset first"
                                  description="Asset-linked services appear here after a registry asset is selected."
                                />
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <FieldLabel label="Monitoring URL" />
                              <div className="relative group">
                                <Globe size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                  value={formData.monitoring_url}
                                  onChange={e => setFormData({ ...formData, monitoring_url: e.target.value })}
                                  placeholder="https://console.internal/..."
                                  className={`${monitoringInputClass(formErrors.monitoring_url)} pl-9 text-blue-300`}
                                />
                              </div>
                              <FieldError message={formErrors.monitoring_url} />
                            </div>

                            <div className="rounded-lg border border-white/10 bg-black/20 p-4 shadow-inner">
                              <h4 className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Scope Summary</h4>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Primary Asset</span>
                                  <span className="text-[11px] font-bold text-slate-100">{selectedDevice?.name || 'Unlinked'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">System</span>
                                  <span className="text-[11px] font-bold text-slate-100">{selectedDevice?.system || 'Unlinked'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>}
                    </WorkspaceSectionCard>

                    <WorkspaceSectionCard>
                      <WorkspaceCollapsibleHeader
                        title="Operational purpose"
                        subtitle="Document why the monitor exists and what the alert means."
                        collapsed={collapsedSections.context}
                        onToggle={() => toggleSection('context')}
                      />
                      {!collapsedSections.context && <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="space-y-1.5">
                          <FieldLabel label="Purpose" />
                          <textarea
                            value={formData.purpose}
                            onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                            placeholder="Why are we monitoring this?"
                            rows={5}
                            className={`${monitoringInputClass()} resize-none text-[11px] font-bold`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel label="Impact" />
                          <textarea
                            value={formData.impact}
                            onChange={e => setFormData({ ...formData, impact: e.target.value })}
                            placeholder="What happens when this monitor triggers?"
                            rows={5}
                            className={`${monitoringInputClass()} resize-none text-[11px] font-bold`}
                          />
                        </div>
                      </div>}
                    </WorkspaceSectionCard>

                    <WorkspaceSectionCard id="monitoring-ownership-card">
                      <WorkspaceCollapsibleHeader
                        title="Ownership"
                        subtitle="Team and individual ownership are both optional and can coexist."
                        badge={<WorkspaceSectionBadge tone="blue">{ownershipMode === 'team' ? 'Team owner' : 'Individual owners'}</WorkspaceSectionBadge>}
                        collapsed={collapsedSections.ownership}
                        onToggle={() => toggleSection('ownership')}
                      />
                      {!collapsedSections.ownership && <>
                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/30 p-1">
                          {[
                            { id: 'team', label: 'Team owner' },
                            { id: 'individual', label: 'Individual owners' }
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setOwnershipModeAndNormalize(mode.id as 'team' | 'individual')}
                              className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                ownershipMode === mode.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-200'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                        <FieldError message={formErrors.ownership} />
                        <div className="mt-4">
                          {ownershipMode === 'team' ? (
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <FieldLabel label="Owner Team(s)" />
                                <input
                                  value={formData.owner_team}
                                  onChange={(event) => setFormData({ ...formData, owner_team: event.target.value })}
                                  placeholder="Comma-separated team names"
                                  className={monitoringInputClass(formErrors.owner_team)}
                                />
                              </div>
                              <FieldError message={formErrors.owner_team} />
                              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                Optional. Use comma-separated team names from the registered team list.
                              </p>
                              <WorkspaceInfoTooltip
                                label={<span>Allowed team names</span>}
                                content={
                                  (teams || []).length > 0
                                    ? (teams || []).map((team: MonitoringTeamOption) => (
                                        <div key={team.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                                          <p className="text-[10px] font-semibold text-slate-100">{team.name}</p>
                                          <p className="mt-1 text-[9px] font-semibold text-slate-500">{team.operators?.length || 0} members</p>
                                        </div>
                                      ))
                                    : <p>No teams available.</p>
                                }
                              />
                              {selectedTeams.length > 0 && (
                                <div className="rounded-lg border border-white/10 bg-black/20 p-4 shadow-inner">
                                  <p className="text-[11px] font-bold text-slate-100 tracking-tight">{selectedTeams.map((team) => team.name).join(', ')}</p>
                                  <p className="mt-1 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                    {selectedTeams.length} selected team{selectedTeams.length === 1 ? '' : 's'}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-12 gap-3 items-end">
                                <div className="col-span-12 md:col-span-5">
                                  <MonitoringSelectField
                                    label="Operator"
                                    value={newOwner.operator_id}
                                    onChange={(value) => setNewOwner({ ...newOwner, operator_id: value })}
                                    options={(operators as OperatorRecord[]).map((operator) => ({
                                      value: String(operator.id),
                                      label: operator.full_name || operator.username || operator.external_id,
                                      description: `${operator.team || 'No team'}`
                                    }))}
                                    placeholder="Select operator"
                                    error={formErrors.owners}
                                    searchable
                                  />
                                </div>
                                <div className="col-span-12 md:col-span-5">
                                  <MonitoringSelectField
                                    label="Role"
                                    value={newOwner.role}
                                    onChange={(value) => setNewOwner({ ...newOwner, role: value })}
                                    options={ownerRoles.map((r: any) => ({ value: r.value, label: r.label }))}
                                  />
                                </div>
                                <div className="col-span-12 md:col-span-2">
                                  <button
                                    type="button"
                                    onClick={addOwner}
                                    className="w-full rounded-lg border border-blue-500/30 bg-blue-600 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-500/20"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                              <FieldError message={formErrors.owners} />
                              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                                {formData.owners?.length ? formData.owners.map((o: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/40 px-3 py-2 shadow-inner group hover:border-white/10 transition-all">
                                    <div className="min-w-0">
                                      <p className="truncate text-[10px] font-bold text-slate-100">{o.name}</p>
                                      <p className="mt-0.5 text-[8px] font-black text-slate-600 tracking-widest truncate">{o.role}</p>
                                    </div>
                                    <button type="button" onClick={() => removeOwner(idx)} className="rounded-lg p-1.5 text-slate-600 transition-all hover:text-rose-400 hover:bg-rose-500/10">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )) : (
                                  <WorkspaceEmptyState compact title="No owners assigned" description="Add one or more individual owners for this monitor." />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </>}
                    </WorkspaceSectionCard>
                  </div>
                ) : activeTab === 'logic' ? (
                  <div id="monitoring-logic-root" className="grid grid-cols-12 gap-5 p-2 min-h-[560px]">
                    <div className="col-span-12 xl:col-span-4 space-y-5">
                      <WorkspaceSectionCard>
                        <WorkspaceCollapsibleHeader
                          title="Logic entries"
                          subtitle="Manage the checks that feed this monitor."
                          collapsed={collapsedSections.logicEntries}
                          onToggle={() => toggleSection('logicEntries')}
                          action={
                            <button
                              onClick={(e) => { e.stopPropagation(); addLogicEntry() }}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-600/20 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 transition-all hover:bg-emerald-600/35 active:scale-95"
                            >
                              Add entry
                            </button>
                          }
                        />
                        {!collapsedSections.logicEntries && <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-2">
                          {formData.logic_json?.map((entry: MonitoringLogicEntry) => (
                            <div
                              key={entry.id}
                              onClick={() => setActiveLogicId(entry.id)}
                              className={`rounded-lg border p-4 cursor-pointer transition-all relative group shadow-sm ${
                                activeLogicId === entry.id
                                  ? 'bg-blue-600/10 border-blue-500/40 shadow-blue-500/5'
                                  : 'bg-black/40 border-white/5 hover:border-white/20 shadow-inner'
                              }`}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); removeLogicEntry(entry.id) }}
                                className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-700 opacity-0 transition-all group-hover:opacity-100 hover:text-rose-400 hover:bg-rose-500/10"
                              >
                                <X size={10} />
                              </button>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{entry.type}</span>
                                <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">ID {entry.id.toString().slice(-4)}</span>
                              </div>
                              <p className="mt-2 truncate text-[11px] font-bold text-slate-200">{entry.description || 'No description provided'}</p>
                              <p className="mt-1 text-[9px] font-bold text-slate-600 truncate tracking-tight">{entry.logic_info || 'No definition yet'}</p>
                              {(formErrors[`logic_${entry.id}_description`] || formErrors[`logic_${entry.id}_logic_info`]) && (
                                <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-rose-500">Validation error</p>
                              )}
                            </div>
                          ))}
                          {formData.logic_json?.length === 0 && (
                            <WorkspaceEmptyState compact icon={<Settings size={22} />} title="No logic entries defined" description="Add an entry to configure the first check." />
                          )}
                        </div>}
                      </WorkspaceSectionCard>
                    </div>

                    <div className="col-span-12 xl:col-span-8 flex flex-col space-y-5 min-h-0">
                      <WorkspaceSectionCard>
                        <WorkspaceCollapsibleHeader
                          title="Execution policy"
                          subtitle="Keep check cadence, delay, and alert throttle aligned as one operational rule set."
                          collapsed={collapsedSections.executionPolicy}
                          onToggle={() => toggleSection('executionPolicy')}
                        />
                        {!collapsedSections.executionPolicy && <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <FieldLabel label="Check interval" required />
                              <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{CHECK_INTERVAL_MIN}-{CHECK_INTERVAL_MAX}s</span>
                            </div>
                            <div className="relative group">
                              <Clock size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
                              <input
                                type="number"
                                value={formData.check_interval}
                                min={CHECK_INTERVAL_MIN}
                                max={CHECK_INTERVAL_MAX}
                                onChange={e => setFormData({ ...formData, check_interval: Number(e.target.value) })}
                                className={`${monitoringInputClass(formErrors.check_interval)} pl-9 font-bold`}
                              />
                            </div>
                            <FieldError message={formErrors.check_interval} />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <FieldLabel label="Alert duration" required />
                              <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{ALERT_DURATION_MIN}-{ALERT_DURATION_MAX}s</span>
                            </div>
                            <div className="relative group">
                              <AlertCircle size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
                              <input
                                type="number"
                                value={formData.alert_duration}
                                min={ALERT_DURATION_MIN}
                                max={ALERT_DURATION_MAX}
                                onChange={e => setFormData({ ...formData, alert_duration: Number(e.target.value) })}
                                className={`${monitoringInputClass(formErrors.alert_duration)} pl-9 font-bold`}
                              />
                            </div>
                            <FieldError message={formErrors.alert_duration} />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <FieldLabel label="Notification throttle" required />
                              <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{NOTIFICATION_THROTTLE_MIN}-{NOTIFICATION_THROTTLE_MAX}s</span>
                            </div>
                            <input
                              type="number"
                              value={formData.notification_throttle}
                              min={NOTIFICATION_THROTTLE_MIN}
                              max={NOTIFICATION_THROTTLE_MAX}
                              onChange={e => setFormData({ ...formData, notification_throttle: Number(e.target.value) })}
                              className={`${monitoringInputClass(formErrors.notification_throttle)} font-bold`}
                            />
                            <FieldError message={formErrors.notification_throttle} />
                          </div>
                        </div>}
                      </WorkspaceSectionCard>

                      {activeLogicEntry ? (
                        <WorkspaceSectionCard className="flex h-full flex-col min-h-[420px]">
                          <WorkspaceCollapsibleHeader
                            title="Logic editor"
                            subtitle="Edit the active logic entry with the syntax-aware editor."
                            badge={<WorkspaceSectionBadge>{activeLogicEntry.type}</WorkspaceSectionBadge>}
                            collapsed={collapsedSections.logicEditor}
                            onToggle={() => toggleSection('logicEditor')}
                          />
                          {!collapsedSections.logicEditor && <>
                            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                              <MonitoringSelectField
                                label="Logic Type"
                                required
                                value={activeLogicEntry.type}
                                onChange={(value) => updateLogicEntry(activeLogicEntry.id, 'type', value)}
                                options={LOGIC_TYPES.map(t => ({ value: t, label: t }))}
                              />
                              <div className="space-y-1.5">
                                <FieldLabel label="Entry Description" required />
                                <input
                                  value={activeLogicEntry.description}
                                  onChange={e => updateLogicEntry(activeLogicEntry.id, 'description', e.target.value)}
                                  placeholder="Verification logic purpose"
                                  className={`${monitoringInputClass(activeLogicErrors.description)} font-bold`}
                                />
                                <FieldError message={activeLogicErrors.description} />
                              </div>
                            </div>
                            <div className="mt-4 flex-1 flex flex-col space-y-2 min-h-0">
                              <div className="flex items-center justify-between px-1">
                                <FieldLabel label="Logic Information" required />
                                <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Logic Engine</span>
                              </div>
                              <div className={`flex-1 overflow-hidden rounded-lg border shadow-inner min-h-[280px] ${
                                activeLogicErrors.logic_info ? 'border-rose-500/60 bg-rose-500/10' : 'border-white/10 bg-black/40'
                              }`}>
                                <CodeMirror
                                  value={activeLogicEntry.logic_info}
                                  height="100%"
                                  minHeight="280px"
                                  extensions={getLogicExtensions(activeLogicEntry.type)}
                                  basicSetup={{ lineNumbers: true, foldGutter: true }}
                                  placeholder={LOGIC_SUGGESTIONS[activeLogicEntry.type] || 'Enter logic parameters...'}
                                  onChange={(value) => updateLogicEntry(activeLogicEntry.id, 'logic_info', value)}
                                  theme="dark"
                                />
                              </div>
                              <FieldError message={activeLogicErrors.logic_info} />
                            </div>
                          </>}
                        </WorkspaceSectionCard>
                      ) : (
                        <WorkspaceEmptyState icon={<Activity size={32} className="animate-pulse" />} title="Select a logic entry" description="Choose an entry from the left to edit its definition." />
                      )}
                    </div>
                  </div>
                ) : (
                  <div id="monitoring-alerting-root" className="grid grid-cols-12 gap-5 p-2">
                    <div className="col-span-12 xl:col-span-4 space-y-5">
                      <WorkspaceSectionCard>
                        <WorkspaceCollapsibleHeader
                          title="Severity and notification"
                          subtitle="Choose the delivery path and throttling behavior."
                          collapsed={collapsedSections.alerting}
                          onToggle={() => toggleSection('alerting')}
                        />
                        {!collapsedSections.alerting && <div className="mt-4 space-y-4">
                          <MonitoringSelectField
                            label="Notification Method"
                            value={formData.notification_method}
                            onChange={(value) => setFormData({ ...formData, notification_method: value })}
                            options={notificationMethods.map((m:any) => ({ value: m.value, label: m.label }))}
                            error={formErrors.notification_method}
                          />
                          <div className="rounded-lg border border-white/5 bg-black/40 p-5 shadow-inner">
                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Severity Context</p>
                            <p className="mt-2 text-[12px] font-bold text-slate-100">{formData.severity}</p>
                            <p className="mt-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Pinned in the identity header for constant operational context.</p>
                          </div>
                        </div>}
                      </WorkspaceSectionCard>

                      <WorkspaceSectionCard>
                        <WorkspaceCollapsibleHeader
                          title="Recipients"
                          subtitle="Define who receives notifications from this monitor."
                          collapsed={collapsedSections.recipients}
                          onToggle={() => toggleSection('recipients')}
                        />
                        {!collapsedSections.recipients && <div className="mt-4 space-y-4">
                          <div className="flex space-x-2">
                            <input
                              value={recipientInput}
                              onChange={e => setRecipientInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addRecipient()}
                              placeholder="ID or Email..."
                              className={`${monitoringInputClass()} flex-1 py-2.5 text-[11px] font-bold`}
                            />
                            <button onClick={addRecipient} className="rounded-lg bg-blue-600 px-4 text-white transition-all hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"><Plus size={14} /></button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.notification_recipients.map((r: string) => (
                              <div key={r} className="flex items-center space-x-3 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 shadow-sm group hover:border-blue-500/40 transition-all">
                                <span className="text-[10px] font-bold text-blue-300">{r}</span>
                                <button onClick={() => removeRecipient(r)} className="text-slate-600 transition-colors hover:text-rose-400"><X size={10} /></button>
                              </div>
                            ))}
                            {formData.notification_recipients.length === 0 && (
                              <WorkspaceEmptyState compact title="No recipients defined" description="Add one or more destinations for alert delivery." />
                            )}
                          </div>
                        </div>}
                      </WorkspaceSectionCard>
                    </div>

                    <div className="col-span-12 xl:col-span-8 space-y-5">
                      <WorkspaceSectionCard>
                        <WorkspaceCollapsibleHeader
                          title="Recovery procedures"
                          subtitle="Linked recovery guidance is shown to the on-call engineer."
                          badge={formData.severity === 'Critical' ? <WorkspaceSectionBadge tone="rose">Required for Critical</WorkspaceSectionBadge> : undefined}
                          collapsed={collapsedSections.recovery}
                          onToggle={() => toggleSection('recovery')}
                        />
                        {!collapsedSections.recovery && <div className="mt-4 space-y-4">
                          <div className={`space-y-4 rounded-lg border-2 p-6 shadow-inner ${formErrors.recovery_docs ? 'border-rose-500/40 bg-rose-500/10' : 'border-dashed border-white/5 bg-black/40'}`}>
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <PanelTitle>Link recovery documents (BKM)</PanelTitle>
                                <PanelSubtitle>Linked protocols are presented to the on-call engineer.</PanelSubtitle>
                              </div>
                              <div className="flex items-center space-x-2 rounded-lg border border-blue-600/20 bg-blue-600/10 px-3 py-1.5 shrink-0">
                                <List size={10} className="text-blue-400" />
                                <span className="text-[10px] font-black text-blue-300 uppercase">{formData.recovery_docs?.length || 0} linked</span>
                              </div>
                            </div>
                            <div className="relative group">
                              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                              <input
                                value={recoverySearch}
                                onChange={e => setRecoverySearch(e.target.value)}
                                placeholder="Search Knowledge Base..."
                                className={`${monitoringInputClass()} pl-11 py-3 text-[11px] font-bold`}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                              {filteredKnowledge?.map((entry: any) => {
                                 const isLinked = formData.recovery_docs?.some((d: any) => (typeof d === 'number' ? d === entry.id : d.id === entry.id));
                                 return (
                                  <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => toggleRecoveryDoc(entry.id)}
                                    className={`p-4 rounded-lg border text-left transition-all relative overflow-hidden group ${
                                      isLinked
                                        ? 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/5'
                                        : 'bg-black/40 border-white/5 hover:border-white/20'
                                    }`}
                                  >
                                    {isLinked && (
                                      <div className="absolute top-0 right-0 w-7 h-7 bg-blue-600 flex items-center justify-center rounded-lg shadow-lg">
                                        <Check size={12} className="text-white" strokeWidth={4} />
                                      </div>
                                    )}
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-800 text-slate-400 rounded-lg border border-white/5 truncate">{entry.category}</span>
                                      <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest shrink-0">#{entry.id}</span>
                                    </div>
                                    <p className={`text-[11px] font-bold leading-tight ${isLinked ? 'text-blue-100' : 'text-slate-300'} line-clamp-2`}>
                                      {entry.title}
                                    </p>
                                  </button>
                                 )
                              })}
                              {filteredKnowledge?.length === 0 && (
                                <div className="col-span-2 py-10 text-center flex flex-col items-center justify-center space-y-3 opacity-30">
                                   <Search size={32} className="text-slate-700" />
                                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">No knowledge entries detected</p>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4 border-t border-white/5 pt-6">
                               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Configure guidance notes</p>
                               <div className="grid grid-cols-1 gap-4">
                                  {formData.recovery_docs?.map((doc: any, idx: number) => {
                                     const did = typeof doc === 'number' ? doc : doc.id;
                                     const note = typeof doc === 'number' ? '' : doc.note;
                                     const entry = (knowledgeEntries || []).find((e: any) => e.id === did);
                                     return (
                                        <div key={idx} className="bg-black/40 border border-white/5 rounded-lg p-4 space-y-3 group hover:border-blue-500/20 transition-all shadow-inner">
                                           <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                 <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg"><FileText size={12}/></div>
                                                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest truncate max-w-[240px]">{entry?.title || `KB-${did}`}</span>
                                              </div>
                                              <button type="button" onClick={() => toggleRecoveryDoc(did)} className="text-slate-600 hover:text-rose-500 transition-colors">
                                                 <Trash2 size={14} />
                                              </button>
                                           </div>
                                           <textarea
                                              value={note || ''}
                                              onChange={e => {
                                                 const next = [...formData.recovery_docs];
                                                 next[idx] = { id: did, note: e.target.value };
                                                 setFormData({ ...formData, recovery_docs: next });
                                              }}
                                              placeholder="Operational guidance note shown to operator before BKM access..."
                                              className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-[10px] font-bold text-slate-200 outline-none focus:border-blue-500/40 transition-all min-h-[60px] resize-none leading-relaxed"
                                           />
                                        </div>
                                     )
                                  })}
                                  {formData.recovery_docs?.length === 0 && (
                                     <p className="text-[9px] font-bold text-slate-700 italic px-1 py-4 text-center border border-dashed border-white/5 rounded-lg">No procedures linked for configuration.</p>
                                  )}
                               </div>
                            </div>
                            <FieldError message={formErrors.recovery_docs} />
                          </div>
                        </div>}
                      </WorkspaceSectionCard>
                    </div>
                  </div>
                )}
              </div>
            }
          />
      </div>
    </WorkspaceModal>
  )
}

function MonitoringHistoryModal({ item, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [isMaximized, setIsMaximized] = useState(false)
  const queryClient = useQueryClient()
  const { data: history, isLoading } = useQuery({
    queryKey: ['monitoring-history', item.id],
    queryFn: async () => (await apiFetch(`/api/v1/monitoring/${item.id}/history`)).json()
  })

  const [selectedIndices, setSelectedIndices] = useState<number[]>([0])

  const toggleSelection = (idx: number) => {
    if (selectedIndices.includes(idx)) {
       if (selectedIndices.length > 1) {
          setSelectedIndices(selectedIndices.filter(i => i !== idx))
       }
    } else {
       if (selectedIndices.length === 2) {
          setSelectedIndices([selectedIndices[1], idx])
       } else {
          setSelectedIndices([...selectedIndices, idx].sort((a, b) => a - b))
       }
    }
  }

  const indexedVersions = (history || []).map((h: any, i: number) => ({
    ...h,
    v_num: h.version,
    label: formatAppDate(h.created_at)
  }))

  const newer = indexedVersions?.[Math.min(...selectedIndices)]
  const older = selectedIndices.length > 1 
    ? indexedVersions?.[Math.max(...selectedIndices)] 
    : (selectedIndices[0] + 1 < indexedVersions.length ? indexedVersions[selectedIndices[0] + 1] : null)

  const getDiff = (curr: any, prev: any) => {
    if (!curr) return []
    const s1 = curr.snapshot || {}
    const s2 = prev?.snapshot || {}
    const keys = Array.from(new Set([...Object.keys(s1), ...Object.keys(s2)]))
    
    return keys.filter(k => {
      if (['updated_at', 'created_at', 'id', 'version', 'is_deleted', 'monitored_service_names', 'recovery_doc_titles', 'device_name'].includes(k)) return false
      return JSON.stringify(s1[k]) !== JSON.stringify(s2[k])
    }).map(k => ({
      field: k.replace(/_/g, ' '),
      old: s2[k],
      new: s1[k]
    }))
  }

  const diffs = getDiff(newer, older)

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title="Revision History"
      subtitle={`Temporal lineage for ${item.title}`}
      icon={<HistoryIcon size={20} />}
      status={
        <div className="flex items-center gap-4">
          <StatusPill value={item?.status} />
          <div className="h-4 w-px bg-white/10" />
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic whitespace-nowrap">
            {indexedVersions?.length || 0} Snapshot(s)
          </p>
        </div>
      }
      footerRight={
        <ToolbarButton onClick={onClose}>Dismiss</ToolbarButton>
      }
    >
      <WorkspaceHistoryShell
          header={null}
          sidebar={
           <div className="flex h-full flex-col min-h-0">
              <div className="mb-4 flex items-center justify-between px-1">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revision Timeline</h3>
                 <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">{indexedVersions.length} states</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {isLoading ? (
                   <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <RefreshCcw size={24} className="animate-spin text-blue-500" />
                      <span className="text-[10px] font-black text-blue-500 animate-pulse uppercase tracking-widest">Syncing timeline...</span>
                   </div>
                ) : (
                  indexedVersions.map((h: any, idx: number) => {
                    const isSelected = selectedIndices.includes(idx);
                    const isNewest = idx === Math.min(...selectedIndices);
                    return (
                      <button 
                        key={h.id}
                        onClick={() => toggleSelection(idx)}
                        className={`w-full p-4 rounded-lg border text-left transition-all relative group overflow-hidden ${
                          isSelected 
                            ? isNewest ? 'bg-blue-600/20 border-blue-500/40 shadow-lg shadow-blue-500/5' : 'bg-slate-800 border-slate-600' 
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                      >
                        {isSelected && (
                          <div className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black uppercase rounded-lg ${isNewest ? 'bg-blue-400 text-blue-950' : 'bg-slate-500 text-slate-200'}`}>
                             {isNewest ? 'Primary' : 'Ref'}
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-2">
                           <span className={`text-[11px] font-black tracking-tighter ${isSelected ? 'text-white' : 'text-blue-400'}`}>v{h.v_num}</span>
                           <span className={`text-[9px] font-bold ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>
                              {formatAppDay(h.created_at)}
                           </span>
                        </div>
                        <p className={`text-[10px] font-bold leading-tight line-clamp-2 ${isSelected ? 'text-white/90' : 'text-slate-300'}`}>
                           {h.change_summary || 'Configuration Modification'}
                        </p>
                        <div className="mt-2 flex items-center space-x-2 justify-between">
                           <div className="flex items-center space-x-2">
                             <Clock size={10} className={isSelected ? 'text-white/40' : 'text-slate-600'} />
                             <span className={`text-[8px] font-semibold ${isSelected ? 'text-white/40' : 'text-slate-600'}`}>
                                {formatAppTime(h.created_at)}
                             </span>
                           </div>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               toast.promise(apiFetch(`/api/v1/monitoring/${item.id}/restore/${h.id}`, { method: 'POST' }), {
                                   loading: 'Restoring state...',
                                   success: () => { queryClient.invalidateQueries({ queryKey: ['monitoring-items'] }); queryClient.invalidateQueries({ queryKey: ['monitoring-history', item.id] }); return "Restored successfully"; },
                                   error: "Restore failed"
                               })
                             }}
                             className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isSelected ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/40' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                           >
                             Restore
                           </button>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
           </div>
          }
          content={
           <>
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md sticky top-0 z-10">
                 <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                       <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[12px] font-black">v{newer?.v_num}</div>
                       <div className="w-4 h-px bg-slate-700" />
                       <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 text-[12px] font-black">{older ? `v${older.v_num}` : 'Ø'}</div>
                    </div>
                    <div>
                       <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Semantic Delta</h3>
                       <p className="text-[9px] font-bold text-slate-600">{diffs.length} modification vectors detected</p>
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                 {diffs.length > 0 ? (
                    <div className="space-y-6">
                       <div className="overflow-hidden rounded-lg border border-white/5 bg-black/20">
                          <table className="w-full text-left border-collapse">
                             <thead>
                                <tr className="bg-white/5 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                                   <th className="p-4 w-1/4">Property</th>
                                   <th className="p-4 w-3/8 text-rose-500/70">Previous (v{older?.v_num || 'Ø'})</th>
                                   <th className="p-4 w-3/8 text-emerald-500/70">Current (v{newer?.v_num})</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5">
                                {diffs.map((d: any, i: number) => (
                                   <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                      <td className="p-4 align-top">
                                         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{d.field}</span>
                                      </td>
                                      <td className="p-4 align-top">
                                         <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 overflow-hidden">
                                            <pre className="text-[10px] text-slate-500 line-through whitespace-pre-wrap font-mono leading-relaxed break-all">
                                               {typeof d.old === 'object' ? JSON.stringify(d.old, null, 2) : String(d.old ?? '(empty)')}
                                            </pre>
                                         </div>
                                      </td>
                                      <td className="p-4 align-top">
                                         <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 overflow-hidden">
                                            <pre className="text-[10px] text-emerald-400 whitespace-pre-wrap font-mono font-bold leading-relaxed break-all">
                                               {typeof d.new === 'object' ? JSON.stringify(d.new, null, 2) : String(d.new ?? '(empty)')}
                                            </pre>
                                         </div>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 ) : !isLoading ? (
                    <WorkspaceEmptyState icon={<HistoryIcon size={32} />} title="No Diff Data" description="Select two versions to compare or pick a version to see changes from its predecessor." />
                 ) : null}
              </div>
           </>
          }
      />
    </WorkspaceModal>
  )
}
