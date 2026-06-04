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
  AlertCircle, Clock, Zap, Settings,
  BookOpen, Eye, EyeOff, FileText, User, Mail, MessageSquare, Monitor, MoreVertical,
  Download, Copy, ChevronDown, ChevronUp, Layers, RefreshCcw, Tag, Sliders, Clipboard, Lightbulb, Maximize2, Minimize2, Star, GitCompare, Undo2, List, LayoutGrid
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from "ag-grid-react"
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { AppDropdown } from './shared/AppDropdown'
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { MONITORING_WORKSPACE_STANDARD } from './shared/OperationalWorkspace'
import {
  WorkspaceFieldError as FieldError,
  WorkspaceFieldLabel as FieldLabel,
  WorkspaceHoverPreview as HoverPreview,
  WorkspaceModalFooter,
  WorkspaceModalHeader,
  WorkspacePanelHint as PanelHint,
  WorkspacePanelSubtitle as PanelSubtitle,
  WorkspacePanelTitle as PanelTitle,
  WorkspaceSectionCard,
  WorkspaceSelectField as MonitoringSelectField,
  WorkspaceStickyIdentityBar,
  WorkspaceValidationBanner,
  getWorkspaceModalFrameClass,
  getWorkspaceModalShellClass,
  getWorkspaceInputClass,
} from './shared/OperationalWorkspacePrimitives'
import { StatusPill } from './shared/StatusPill'
import { PageHeader, PageToolbar, ToolbarButton, ToolbarGroup, ToolbarIconButton, ToolbarSearch, ToolbarSegmented } from './shared/LayoutPrimitives'

const MONITORING_VIEW_STORAGE_KEY = 'sysgrid_monitoring_views_v1'
const MONITORING_ACTIVE_VIEW_KEY = 'sysgrid_monitoring_active_view_v1'
const MONITORING_FAVORITES_STORAGE_KEY = 'sysgrid_monitoring_favorites_v1'
const MONITORING_UI_STATE_KEY = 'sysgrid_monitoring_ui_state_v1'
const MONITORING_WATCH_STORAGE_KEY = 'sysgrid_monitoring_watch_v1'
const BULK_MENU_MAX_HEIGHT = 560

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
  onFirstDataRendered
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
      suppressScrollOnNewData={true}
      suppressCellFocus={true}
      suppressRowClickSelection={true}
      enableCellTextSelection={true}
      suppressMovableColumns={false}
      ensureDomOrder={true}
      overlayNoRowsTemplate="<span class='text-slate-500 font-black uppercase tracking-widest text-[10px]'>No monitoring data found</span>"
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

const sanitizeMonitoringPayload = (item: any) => {
  if (!item) return item
  const next = { ...item }
  delete next.created_at
  delete next.updated_at
  delete next.version
  delete next.is_deleted
  delete next.device_name
  delete next.recovery_doc_titles
  delete next.monitored_service_names
  return next
}

const useEscapeDismiss = (onClose: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
}

const useBodyModalFlag = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const body = document.body
    const currentCount = Number(body.dataset.sysgridModalCount || '0')
    const nextCount = currentCount + 1
    body.dataset.sysgridModalCount = String(nextCount)
    body.dataset.sysgridModalOpen = 'true'
    return () => {
      const updatedCount = Math.max(0, Number(body.dataset.sysgridModalCount || '1') - 1)
      if (updatedCount === 0) {
        delete body.dataset.sysgridModalCount
        delete body.dataset.sysgridModalOpen
      } else {
        body.dataset.sysgridModalCount = String(updatedCount)
        body.dataset.sysgridModalOpen = 'true'
      }
    }
  }, [])
}

const ObservabilityHUD = ({ items }: any) => {
  const stats = useMemo(() => {
    if (!items?.length) return null
    const active = items.filter((i: any) => i.status === 'Existing').length
    const critical = items.filter((i: any) => i.severity === 'Critical' || i.severity === 'S1').length
    const recent = items.filter((i: any) => {
      const updated = new Date(i.updated_at)
      return new Date().getTime() - updated.getTime() < 3600000 // 1 hour
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

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [historyItem, setHistoryItem] = useState<any>(null)
  const [recipientPopup, setRecipientPopup] = useState<{ recipients: string[], method: string } | null>(null)
  const [bkmPopup, setBkmPopup] = useState<{ ids: number[], titles: string[], monitorId?: number } | null>(null)
  const [activeBkm, setActiveBkm] = useState<any>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  
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
  const [savedViews, setSavedViews] = useState<any[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_MONITORING_VIEWS
    try {
      const raw = window.localStorage.getItem(MONITORING_VIEW_STORAGE_KEY)
      if (!raw) return DEFAULT_MONITORING_VIEWS
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return DEFAULT_MONITORING_VIEWS
      
      // Merge system defaults with persisted versions (to get latest config)
      // and append any custom views that are not in the default list
      const systemIds = new Set(DEFAULT_MONITORING_VIEWS.map(v => v.id))
      const legacyIds = new Set(['ops', 'incident', 'recovery'])
      const customViews = parsed.filter((v: any) => !systemIds.has(v.id) && !legacyIds.has(v.id))
      
      return [
        ...DEFAULT_MONITORING_VIEWS.map((view) => parsed.find((entry: any) => entry.id === view.id) || view),
        ...customViews
      ]
    } catch {
      return DEFAULT_MONITORING_VIEWS
    }
  })
  const [activeViewId, setActiveViewId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    // Reset to system default (no view) on the very first load of a browser session
    const isFirstLoad = !window.sessionStorage.getItem('sysgrid_monitoring_session_init')
    if (isFirstLoad) {
      window.sessionStorage.setItem('sysgrid_monitoring_session_init', 'true')
      return null
    }
    return window.localStorage.getItem(MONITORING_ACTIVE_VIEW_KEY)
  })
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(MONITORING_FAVORITES_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [watchIds, setWatchIds] = useState<number[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(MONITORING_WATCH_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [quickFilters, setQuickFilters] = useState({ status: '', severity: '', platform: '', owner: '' })
  const [groupBy, setGroupBy] = useState<string>('raw')
  const [columnLayoutState, setColumnLayoutState] = useState<any[]>([])
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

  const groupSelectionsRef = useRef<Record<string, number[]>>({})

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

  const handleColumnResized = useCallback((event: any) => {
    if (event.finished) syncColumnLayoutState(event.api)
  }, [])

  const handleColumnMoved = useCallback((event: any) => {
    if (!event.source.includes('drag')) syncColumnLayoutState(event.api)
  }, [])

  const handleDragStopped = useCallback((event: any) => syncColumnLayoutState(event.api), [])
  const handleColumnPinned = useCallback((event: any) => syncColumnLayoutState(event.api), [])
  const handleColumnVisible = useCallback((event: any) => syncColumnLayoutState(event.api), [])
  const handleFilterChanged = useCallback((e: any) => setGridFilterModel(e.api.getFilterModel() || {}), [])
  
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
    // Immediately apply layout if we have it to prevent squish
    if (columnLayoutState.length > 0) {
      event.api.applyColumnState({
        state: columnLayoutState,
        applyOrder: true,
        defaultState: { sort: null }
      });
    }
  }, [columnLayoutState])

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
          .then(() => toast.success("Table data copied to clipboard"))
          .catch(() => toast.error("Failed to copy data"))
      }
    }
  }

  const getColumnLayoutSnapshot = (api: any) => {
    if (!api?.getColumnState) return []
    return api.getColumnState().map((column: any) => ({
      colId: column.colId,
      width: column.width,
      hide: column.hide,
      pinned: column.pinned,
      flex: column.flex,
      sort: column.sort,
      sortIndex: column.sortIndex
    }))
  }

  const syncColumnLayoutState = (api: any) => {
    const nextLayout = getColumnLayoutSnapshot(api)
    if (!nextLayout.length) return
    setColumnLayoutState(nextLayout)
  }

  const applyColumnLayoutState = (api: any) => {
    if (!api || !columnLayoutState.length) return
    api.applyColumnState({
      state: columnLayoutState,
      applyOrder: true,
      defaultState: { sort: null }
    })
  }

  const buildCurrentViewConfig = () => ({
    fontSize,
    rowDensity,
    hiddenColumns,
    groupBy,
    columnLayoutState: gridRef.current?.api?.getColumnState() || columnLayoutState,
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
    setColumnLayoutState(config.columnLayoutState ?? [])
    setSearchTerm(config.quickFilter ?? '')
    setQuickFilters(config.quickFilters ?? { status: '', severity: '', platform: '', owner: '' })
    setGridFilterModel(config.filterModel ?? {})
    setGridSortModel(config.sortModel ?? [{ colId: 'favorite', sort: 'desc' }])
    setActiveViewId(viewId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MONITORING_ACTIVE_VIEW_KEY, viewId)
    }
    requestAnimationFrame(() => {
      if (gridRef.current?.api) {
        if (Array.isArray(config.columnLayoutState) && config.columnLayoutState.length) {
          gridRef.current.api.applyColumnState({
            state: config.columnLayoutState,
            applyOrder: true,
            defaultState: { sort: null }
          })
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
    toast.success(`Saved current table to ${nextViews.find((view) => view.id === viewId)?.name}`)
  }

  const createViewFromCurrent = () => {
    const trimmed = newViewName.trim()
    if (!trimmed) {
      toast.error('Enter a name for the new view')
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
    toast.success(`Saved new view ${trimmed}`)
  }

  const applySystemDefault = () => {
    setActiveViewId(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(MONITORING_ACTIVE_VIEW_KEY)
    }
    setFontSize(11)
    setRowDensity(8)
    setHiddenColumns([])
    setGroupBy('raw')
    setColumnLayoutState([])
    setSearchTerm('')
    setQuickFilters({ status: '', severity: '', platform: '', owner: '' })
    setGridSortModel([{ colId: 'favorite', sort: 'desc' }])
    if (gridRef.current?.api) {
       gridRef.current.api.setFilterModel({})
       gridRef.current.api.applyColumnState({
         defaultState: { sort: null, flex: 1, pinned: null, hide: false },
         applyOrder: true
       })
    }
    toast.success('Restored system default view')
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
        toast.success(`Deleted view ${view.name}`)
      }
    )
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showBulkMenu && !target.closest('.bulk-menu-container') && !target.closest('.bulk-menu-trigger')) {
        setShowBulkMenu(false)
        setBulkDeleteConfirm(false)
      }
      if (showDisplayMenu && !target.closest('.display-menu-container')) {
        setShowDisplayMenu(false)
      }
      if (showViewsMenu && !target.closest('.views-menu-container')) {
        setShowViewsMenu(false)
      }
      if (rowActionMenu && !target.closest('.row-action-menu-container')) {
        setRowActionMenu(null)
        setRowDeleteConfirmId(null)
      }
    }
    if (showBulkMenu || showDisplayMenu || showViewsMenu || rowActionMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showBulkMenu, showDisplayMenu, showViewsMenu, rowActionMenu])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowBulkMenu(false)
        setBulkDeleteConfirm(false)
        setShowDisplayMenu(false)
        setShowViewsMenu(false)
        setRowActionMenu(null)
        setRowDeleteConfirmId(null)
      }
    }
    if (showBulkMenu || showDisplayMenu || showViewsMenu || rowActionMenu) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showBulkMenu, showDisplayMenu, showViewsMenu, rowActionMenu])

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

  useEffect(() => {
    if (gridRef.current?.api && items?.length > 0) {
      gridRef.current.api.autoSizeColumns(['platform'])
    }
  }, [items])

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
      if (quickFilters.status && item.status !== quickFilters.status) return false
      if (quickFilters.severity && item.severity !== quickFilters.severity) return false
      if (quickFilters.platform && item.platform !== quickFilters.platform) return false
      if (quickFilters.owner && !(item.owners || []).some((owner: any) => owner.name === quickFilters.owner)) return false
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
    return new Date(changedAt).getTime() > lastVisitedAt
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
    window.localStorage.setItem(MONITORING_VIEW_STORAGE_KEY, JSON.stringify(savedViews))
  }, [savedViews])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MONITORING_FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds))
  }, [favoriteIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MONITORING_WATCH_STORAGE_KEY, JSON.stringify(watchIds))
  }, [watchIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MONITORING_UI_STATE_KEY, JSON.stringify({
      activeTab,
      fontSize,
      rowDensity,
      hiddenColumns,
      quickFilters,
      groupBy,
      columnLayoutState,
      selectedIds,
      expandedBulkSection,
      lastVisitedAt,
      searchTerm
    }))
  }, [activeTab, columnLayoutState, expandedBulkSection, fontSize, groupBy, hiddenColumns, lastVisitedAt, quickFilters, rowDensity, searchTerm, selectedIds])

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
      if (!value) return
      chips.push({
        id: `quick-${field}`,
        label: `${field}: ${value}`,
        onRemove: () => setQuickFilters((current) => ({ ...current, [field]: '' }))
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
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-in fade-in slide-in-from-bottom-4' : 'animate-out fade-out slide-out-to-bottom-4'} relative overflow-hidden rounded-lg border border-slate-700 bg-[#020617] p-0 shadow-2xl`}>
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-100">Bulk Operation Applied</p>
                  <p className="text-[10px] font-bold text-slate-400">Successfully modified {idsToUse.length} item{idsToUse.length > 1 ? 's' : ''}.</p>
                </div>
                <button 
                  onClick={() => toast.dismiss(t.id)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={async () => {
                    toast.dismiss(t.id)
                    try {
                      await runUndo()
                      toast.success('Undo complete', { id: 'undo-success' })
                    } catch (error: any) {
                      toast.error(error.message || 'Undo failed', { id: 'undo-error' })
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-600/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200 hover:bg-blue-600/25 transition-colors"
                >
                  <Undo2 size={12} />
                  Undo Change
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
            
            {/* Progress Gauge */}
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500/20 w-full">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: 0 }}
                transition={{ duration: 7.5, ease: 'linear' }}
                className="h-full bg-blue-500"
              />
            </div>
          </div>
        ), { duration: 7500, id: 'bulk-toast' })
      }
    },
    onError: (e: any) => toast.error(`Operation failed: ${e.message}`, { id: 'bulk-error' })
  })

  const columnDefs = useMemo(() => {
    const layoutById = new Map(columnLayoutState.map((column: any) => [column.colId, column]))
    
    const defs = [
    { 
      colId: "select",
      headerName: "", 
      width: 48,
      minWidth: 48,
      maxWidth: 48,
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: 'left', 
      cellClass: 'flex items-center justify-center border-r border-white/5', 
      headerClass: 'flex items-center justify-center border-r border-white/5', 
      suppressSizeToFit: true,
      resizable: false,
      sortable: false,
      filter: false,
      suppressHide: true
    },
    { 
      colId: "id",
      field: "id", 
      headerName: "ID", 
      width: 90,
      minWidth: 90,
      maxWidth: 120,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 border-r border-white/5 flex items-center justify-center',
      headerClass: 'text-center border-r border-white/5',
      filter: 'agNumberColumnFilter',
      suppressHide: true
    },
    {
      colId: "recent_change",
      headerName: "Chg",
      field: "recent_change",
      width: 80,
      minWidth: 80,
      maxWidth: 80,
      pinned: 'left',
      sortable: false,
      filter: false,
      resizable: false,
      suppressHide: true,
      cellClass: 'text-center border-r border-white/5 flex items-center justify-center !overflow-visible',
      headerClass: 'text-center border-r border-white/5',
      hide: !isIntelligenceExpanded,
      cellRenderer: (p: any) => {
        if (!p.data || !isRecentChange(p.data)) return null
        const dateStr = new Date(p.data.updated_at || p.data.created_at).toLocaleString()
        const author = p.data.created_by_user_id || 'System'
        return (
          <div className="group relative flex items-center justify-center h-full w-full">
            <div className="absolute h-10 w-10 rounded-full bg-[radial-gradient(circle,_rgba(251,191,36,0.2)_0%,_transparent_70%)] blur-md animate-pulse" />
            <span className="relative z-[1] block h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
            
            {/* Hover Peek Intelligence */}
            <div className="invisible group-hover:visible absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-[2000] w-52 p-3 rounded-lg border border-white/10 bg-slate-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl pointer-events-none transition-all duration-300 transform scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100">
               <div className="flex items-center gap-2 mb-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                 <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">Recent Intelligence</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[11px] text-slate-100 font-bold leading-tight">{dateStr}</p>
                 <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-white/5">
                    <User size={10} className="text-slate-500" />
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">@{author}</p>
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
      minWidth: 80,
      maxWidth: 80,
      pinned: 'left',
      cellClass: 'text-center border-r border-white/5 flex items-center justify-center',
      headerClass: 'text-center border-r border-white/5',
      sortable: true,
      filter: false,
      resizable: false,
      suppressHide: true,
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
      minWidth: 85,
      maxWidth: 85,
      pinned: 'left',
      cellClass: 'text-center border-r border-white/5 flex items-center justify-center',
      headerClass: 'text-center border-r border-white/5',
      sortable: false,
      filter: false,
      resizable: false,
      suppressHide: true,
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
      minWidth: 140,
      filter: true,
      cellClass: "font-bold text-center flex items-center justify-center", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("device_name")
    },
    { 
      field: "title", 
      headerName: "Title", 
      minWidth: 220,
      width: 280,
      flex: 2.2, 
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
      minWidth: 110,
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
      minWidth: 120,
      filter: true,
      cellClass: "text-center font-bold flex items-center justify-center", 
      headerClass: 'text-center',
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
      minWidth: 120,
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
      minWidth: 70,
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
                <div className="absolute -inset-1 rounded-full bg-emerald-500 animate-pulse opacity-40 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
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
      minWidth: 100,
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
      minWidth: 100,
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
      minWidth: 110,
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
      minWidth: 80,
      cellClass: 'text-center font-bold flex items-center justify-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value ? `${p.value}s` : 'N/A'}</span>,
      hide: hiddenColumns.includes("check_interval")
    },
    { 
      field: "notification_method", 
      headerName: "Notify", 
      width: 130, 
      minWidth: 110,
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
      minWidth: 180,
      flex: 1, 
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
           <span style={{ fontSize: `${fontSize}px` }}>{new Date(p.value).toLocaleString()}</span>
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
           <span style={{ fontSize: `${fontSize}px` }}>{new Date(p.value).toLocaleString()}</span>
        </div>
      ) : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500">N/A</span>,
      hide: hiddenColumns.includes("updated_at")
    },
    {
      colId: "row_actions",
      headerName: "Action",
      width: 210,
      minWidth: 210,
      maxWidth: 210,
      pinned: 'right',
      cellClass: 'text-right pr-3 flex items-center justify-end',
      headerClass: 'text-center',
      resizable: false,
      sortable: false,
      filter: false,
      cellRenderer: (p: any) => p.data ? renderPrimaryRowActions(p.data) : null,
      suppressHide: true
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
          if (!layout) return child
          return {
            ...child,
            width: layout.width ?? child.width,
            pinned: layout.pinned ?? child.pinned,
            hide: child.hide !== undefined ? child.hide : layout.hide,
            flex: layout.flex ?? child.flex
          }
        })
      }
    }
    const colId = col.colId || col.field
    const layout = layoutById.get(colId)
    if (!layout) return col
    return {
      ...col,
      width: layout.width ?? col.width,
      pinned: layout.pinned ?? col.pinned,
      hide: col.hide !== undefined ? col.hide : layout.hide,
      flex: layout.flex ?? col.flex
    }
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
}, [fontSize, hiddenColumns, columnLayoutState, isIntelligenceExpanded]) as any

  const gridContext = useMemo(() => ({ favoriteIds, watchIds }), [favoriteIds, watchIds])

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

         <PageToolbar
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
              <ToolbarButton
               active={isIntelligenceExpanded}
               onClick={() => setIsIntelligenceExpanded(!isIntelligenceExpanded)}
               title={isIntelligenceExpanded ? 'Hide Intelligence Columns' : 'Show Intelligence Columns'}
              >
               <span className="flex items-center gap-2">
                 {isIntelligenceExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                 Intelligence
               </span>
              </ToolbarButton>
              </ToolbarGroup>
              </>
              }
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
		      />

      <div className="grid gap-3 md:grid-cols-4">
        <AppDropdown
          value={quickFilters.status}
          onChange={(val) => setQuickFilters((current) => ({ ...current, status: val }))}
          options={STATUSES.filter((status) => status.value !== 'Deleted').map((status) => ({ value: status.value, label: status.label }))}
          label="Status Filter"
          placeholder="All statuses"
        />
        <AppDropdown
          value={quickFilters.severity}
          onChange={(val) => setQuickFilters((current) => ({ ...current, severity: val }))}
          options={severities.map((severity: any) => ({ value: severity.value, label: severity.label }))}
          label="Severity Filter"
          placeholder="All severities"
        />
        <AppDropdown
          value={quickFilters.platform}
          onChange={(val) => setQuickFilters((current) => ({ ...current, platform: val }))}
          options={platformOptions}
          label="Platform Filter"
          placeholder="All platforms"
        />
        <AppDropdown
          value={quickFilters.owner}
          onChange={(val) => setQuickFilters((current) => ({ ...current, owner: val }))}
          options={ownerOptions}
          label="Owner Filter"
          placeholder="All owners"
        />
      </div>

      <AnimatePresence>
        {activeFilterChips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-wrap items-center gap-2"
          >
            {activeFilterChips.map((chip) => (
              <button
                key={chip.id}
                onClick={chip.onRemove}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.08]"
              >
                {chip.label}
              </button>
            ))}
	            <button
	              onClick={() => {
	                setSearchTerm('')
	                setGridFilterModel({})
                  setQuickFilters({ status: '', severity: '', platform: '', owner: '' })
	                gridRef.current?.api?.setFilterModel({})
	              }}
              className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 transition-all hover:text-white"
            >
              Clear All
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {typeof document !== 'undefined' && createPortal(
        <>
          <AnimatePresence>
            {showDisplayMenu && !!displayMenuStyle.top && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                style={displayMenuStyle}
                className="display-menu-container rounded-lg border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl"
              >
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Display Density</span>
                      <button onClick={() => setShowDisplayMenu(false)} className="text-slate-500 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-3 rounded-lg border border-white/5 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-black uppercase text-slate-500">Font</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="8"
                            max="14"
                            step="1"
                            value={fontSize}
                            onChange={e => setFontSize(Number(e.target.value))}
                            className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-slate-800 accent-blue-500"
                          />
                          <span className="w-8 text-right text-[10px] font-black tabular-nums text-white">{fontSize}px</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-black uppercase text-slate-500">Rows</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="20"
                            step="2"
                            value={rowDensity}
                            onChange={e => setRowDensity(Number(e.target.value))}
                            className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-slate-800 accent-blue-500"
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
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Columns</span>
                    <div className="max-h-[240px] space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                      {columnDefs.filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
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
                          <div className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-blue-600 border-blue-500' : 'border-white/10 bg-black/40'}`}>
                            {!hiddenColumns.includes(col.field) && <Check size={11} className="text-white" />}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>
                            {col.headerName || col.field}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
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
                className="views-menu-container rounded-lg border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Saved Views</p>
                      <p className="pt-1 text-[11px] text-slate-400">Load, save, and overwrite full Monitoring layouts.</p>
                    </div>
                    <button onClick={() => setShowViewsMenu(false)} className="text-slate-500 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Current View</p>
                        <p className="pt-1 text-[11px] font-semibold text-slate-100">{activeViewId ? savedViews.find((view) => view.id === activeViewId)?.name : 'Unsaved working view'}</p>
                      </div>
                      {activeViewId && (
                        <button
                          type="button"
                          onClick={() => saveCurrentToView(activeViewId)}
                          className="rounded-lg border border-blue-500/20 bg-blue-600/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-blue-200 transition-all hover:bg-blue-600/25"
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
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 transition-all hover:bg-white/[0.08]"
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
                          <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${activeViewId === null ? 'text-emerald-300' : 'text-slate-200'}`}>System Default</p>
                          <p className="pt-1 text-[10px] text-slate-500">Standard table layout with no active view</p>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">Core</span>
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
                                <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${activeViewId === view.id ? 'text-blue-300' : 'text-slate-200'}`}>{view.name}</p>
                                <p className="pt-1 text-[10px] text-slate-500">{view.config?.groupBy && view.config.groupBy !== 'raw' ? `Grouped by ${groupOptions.find((option) => option.value === view.config.groupBy)?.label || view.config.groupBy}` : 'Raw monitoring table'}</p>
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">{isDefaultView ? 'Default' : 'Custom'}</span>
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
                  className="bulk-menu-container max-h-[560px] overflow-y-auto rounded-lg border border-slate-700 bg-[#020617] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
                >
                  <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">Bulk Actions</p>
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
                    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${bulkDeleteConfirm ? 'text-white' : 'text-rose-300'}`}>
                      {bulkDeleteConfirm 
                        ? (activeTab === 'deleted' ? 'Confirm Permanent Purge?' : 'Confirm De-activation?') 
                        : (activeTab === 'deleted' ? 'Purge Selection' : 'De-activate Selection')}
                    </p>
                  </button>
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
                className="row-action-menu-container overflow-hidden rounded-lg border border-slate-700 bg-[#020617] shadow-[0_24px_80px_rgba(0,0,0,0.62)]"
              >
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Row Actions</p>
                    <p className="pt-1 text-[11px] font-semibold text-slate-100">ID {rowActionMenu.item.id} · {rowActionMenu.item.device_name || 'No target asset linked'}</p>
                    <p className="truncate pt-1 text-[12px] text-slate-300">{rowActionMenu.item.title}</p>
                  </div>
                  <button
                    onClick={() => setRowActionMenu(null)}
                    className="ml-3 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    aria-label="Close row actions"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-2.5 custom-scrollbar">
                  <div className="px-3 py-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Quick Access</p>
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
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Related Destinations</p>
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
                        if (rowActionMenu.item.recovery_docs?.[0]) navigate(`/knowledge?id=${rowActionMenu.item.recovery_docs[0]}`)
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
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Scanning Monitoring Matrix...</p>
            </div>
          )}
	          <GridMatrix
            gridRef={gridRef}
	            rowData={displayedItemsInOrder || []} 
	            columnDefs={columnDefs} 
            fontSize={fontSize}
            rowDensity={rowDensity}
            context={gridContext}
            getRowId={handleRowId}
            onGridReady={handleGridReady}
	            onSelectionChanged={(e) => handleSelectionChanged(e, 'raw')}
            onColumnResized={handleColumnResized}
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
	          />

	        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
          <div className="rounded-lg border border-white/5 bg-black/20 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Grouped Intelligence Matrix</p>
              <p className="pt-1 text-[12px] font-black uppercase tracking-tight text-slate-100">Sorted by {groupOptions.find((option) => option.value === groupBy)?.label || groupBy}</p>
            </div>
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setCollapsedGroups(groupedSections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: false }), {}))}
                 className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white transition-all"
               >
                 Expand All
               </button>
               <button 
                 onClick={() => setCollapsedGroups(groupedSections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: true }), {}))}
                 className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white transition-all"
               >
                 Collapse All
               </button>
               <div className="w-px h-6 bg-white/10 mx-1" />
               <button 
                 onClick={() => setGroupBy('raw')}
                 className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[9px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-2"
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
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">{groupOptions.find((option) => option.value === groupBy)?.label}</span>
                      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-100">{section.label}</h3>
                    </div>
                    <p className="pt-1 text-[11px] text-slate-400">{section.items.length} monitors{selectedCount ? ` · ${selectedCount} selected` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-white/5 bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">{section.items.length}</span>
                    {isCollapsed ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
                  </div>
                </button>
                {!isCollapsed && (
                  <div 
                    className="monitoring-grid-shell monitoring-grid w-full glass-panel rounded-b-lg overflow-hidden ag-theme-alpine-dark relative"
                    style={{ 
                      '--ag-font-size': `${fontSize}px`,
                      '--ag-font-family': "'Inter', sans-serif",
                      height: `${Math.min(600, section.items.length * (fontSize + rowDensity + 5) + 40)}px`
                    } as React.CSSProperties}
                  >
                    <GridMatrix
                      rowData={section.items} 
                      columnDefs={columnDefs} 
                      fontSize={fontSize}
                      rowDensity={rowDensity}
                      context={gridContext}
                      getRowId={handleRowId}
                      onSelectionChanged={(e) => handleSelectionChanged(e, section.key)}
                      onColumnResized={handleColumnResized}
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
            onOpenBkm={(monitor: any) => { setDetailItem(null); setBkmPopup({ ids: monitor.recovery_docs || [], titles: monitor.recovery_doc_titles || [], monitorId: monitor.id }); setDetailDeleteConfirm(false); }}
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
        {bkmPopup && <BkmListModal ids={bkmPopup.ids} titles={bkmPopup.titles} onOpenBkm={setActiveBkm} onClose={() => setBkmPopup(null)} />}
        {activeBkm && <BkmDetailModal bkmId={activeBkm} onClose={() => setActiveBkm(null)} />}
        {compareOpen && <CompareMonitorsModal items={compareItems} onClose={() => setCompareOpen(false)} />}
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
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-100">{title}</p>
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
          className="rounded-lg border border-blue-500/20 bg-blue-600/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200 transition-all hover:bg-blue-600/25 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-600"
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

  const fields = useMemo(() => [
    { label: 'Status', getValue: (item: any) => item.status || 'Unknown' },
    { label: 'Severity', getValue: (item: any) => item.severity || 'N/A' },
    { label: 'Platform', getValue: (item: any) => item.platform || 'N/A' },
    { label: 'Notify', getValue: (item: any) => item.notification_method || 'None' },
    { label: 'Owners', getValue: (item: any) => (item.owners || []).map((owner: any) => owner.name).join(', ') || 'None' },
    { label: 'Recovery', getValue: (item: any) => item.recovery_doc_titles?.join(', ') || 'None linked' },
    { label: 'Purpose', getValue: (item: any) => item.purpose || 'No purpose documented', multiline: true },
    { label: 'Created', getValue: (item: any) => item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A' },
    { label: 'Updated', getValue: (item: any) => item.updated_at ? new Date(item.updated_at).toLocaleString() : 'N/A' },
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

  const modal = (
    <div onClick={onClose} className={`fixed inset-0 z-[3220] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('wide')}`}>
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`glass-panel ${getWorkspaceModalShellClass('wide')} overflow-y-auto custom-scrollbar rounded-lg border border-slate-700 bg-[#020617] p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Compare Monitors</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className={`grid gap-4 ${gridCols}`}>
          {items.map((item: any) => (
            <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">ID {item.id} · {item.device_name || 'No asset'}</p>
              <h4 className="pt-2 text-sm font-semibold text-slate-100 truncate">{item.title}</h4>
              <div className="mt-3 space-y-2 text-[11px] text-slate-300">
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
      </motion.div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}

function CompareRow({ label, value, multiline = false, colorIndex = -1 }: { label: string; value: string; multiline?: boolean; colorIndex?: number }) {
  const isDiff = colorIndex !== -1
  
  const diffStyles = [
    { border: 'border-amber-500/40', bg: 'bg-amber-500/5', text: 'text-amber-400', val: 'text-amber-200' },
    { border: 'border-sky-500/40', bg: 'bg-sky-500/5', text: 'text-sky-400', val: 'text-sky-200' },
    { border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', text: 'text-emerald-400', val: 'text-emerald-200' },
    { border: 'border-rose-500/40', bg: 'bg-rose-500/5', text: 'text-rose-400', val: 'text-rose-200' },
    { border: 'border-purple-500/40', bg: 'bg-purple-500/5', text: 'text-purple-400', val: 'text-purple-200' },
  ]

  const style = isDiff ? diffStyles[colorIndex % diffStyles.length] : { border: 'border-slate-800', bg: 'bg-[#0b1220]', text: 'text-slate-500', val: 'text-slate-200' }

  return (
    <div className={`rounded-lg border px-3 py-2 ${style.border} ${style.bg} ${isDiff ? 'shadow-[0_0_15px_rgba(0,0,0,0.1)]' : ''} ${multiline ? '' : 'flex items-center justify-between gap-3'}`}>
      <div className="flex items-center gap-2">
        <p className={`text-[8px] font-black uppercase tracking-[0.16em] ${style.text}`}>{label}</p>
        {isDiff && <div className={`w-1 h-1 rounded-full ${style.text.replace('text-', 'bg-')} animate-pulse`} />}
      </div>
      <p className={`pt-1 font-bold ${style.val} ${multiline ? 'leading-5' : 'text-right'}`}>{value}</p>
    </div>
  )
}

function BulkActionModals({ isStatusOpen, isSeverityOpen, isNotifyOpen, onClose, onApply, severities, notificationMethods }: any) {
    const [val, setVal] = useState('')
    
    useEffect(() => { setVal(''); }, [isStatusOpen, isSeverityOpen, isNotifyOpen]);
    useEscapeDismiss(onClose)

    if (isStatusOpen) {
        const modal = (
            <div onClick={onClose} className={`fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('compact')}`}>
               <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`glass-panel ${getWorkspaceModalShellClass('compact')} p-10 rounded-lg border border-blue-500/30 space-y-6`}>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-blue-400 flex items-center space-x-3">
                      <Tag size={24}/> <span>Set Status</span>
                  </h2>
                  <AppDropdown
                    value={val}
                    onChange={v => setVal(v)}
                    options={STATUSES}
                    placeholder="Select Status..."
                  />
                  <div className="flex space-x-3 pt-2">
                     <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
                     <button disabled={!val} onClick={() => onApply('status', val)} className="flex-1 py-3 bg-blue-600 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Apply</button>
                  </div>
               </motion.div>
            </div>
        )
        return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
    }

    if (isSeverityOpen) {
        const modal = (
            <div onClick={onClose} className={`fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('compact')}`}>
               <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`glass-panel ${getWorkspaceModalShellClass('compact')} p-10 rounded-lg border border-rose-500/30 space-y-6`}>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-rose-400 flex items-center space-x-3">
                      <Shield size={24}/> <span>Set Severity</span>
                  </h2>
                  <AppDropdown
                    value={val}
                    onChange={v => setVal(v)}
                    options={severities.map((s:any) => ({ value: s.value, label: s.label }))}
                    placeholder="Select Severity..."
                  />
                  <div className="flex space-x-3 pt-2">
                     <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
                     <button disabled={!val} onClick={() => onApply('severity', val)} className="flex-1 py-3 bg-rose-600 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-rose-500/20 active:scale-95 transition-all">Apply</button>
                  </div>
               </motion.div>
            </div>
        )
        return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
    }

    if (isNotifyOpen) {
        const modal = (
            <div onClick={onClose} className={`fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('compact')}`}>
               <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`glass-panel ${getWorkspaceModalShellClass('compact')} p-10 rounded-lg border border-amber-500/30 space-y-6`}>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-amber-400 flex items-center space-x-3">
                      <Bell size={24}/> <span>Set Notification</span>
                  </h2>
                  <AppDropdown
                    value={val}
                    onChange={v => setVal(v)}
                    options={notificationMethods.map((m:any) => ({ value: m.value, label: m.label }))}
                    placeholder="Select Method..."
                  />
                  <div className="flex space-x-3 pt-2">
                     <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
                     <button disabled={!val} onClick={() => onApply('notification_method', val)} className="flex-1 py-3 bg-amber-600 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Apply</button>
                  </div>
               </motion.div>
            </div>
        )
        return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
    }

    return null;
}

function RecipientsModal({ recipients, method, onClose }: any) {
  useEscapeDismiss(onClose)
  const modal = (
    <div onClick={onClose} className={`fixed inset-0 z-[3220] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('compact')}`}>
      <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`glass-panel ${getWorkspaceModalShellClass('compact')} p-6 rounded-lg border-emerald-500/20`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase text-emerald-400">Recipient Matrix</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Bell size={12} className="text-slate-500" />
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Method: {method}</span>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {recipients.map((r: string, i: number) => (
            <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-lg flex items-center space-x-3 group hover:border-emerald-500/30 transition-all">
              <Mail size={14} className="text-emerald-500" />
              <span className="text-[11px] font-bold text-slate-200">{r}</span>
            </div>
          ))}
          {recipients.length === 0 && <p className="text-center py-4 text-slate-600 text-[10px]">No recipients defined</p>}
        </div>
      </motion.div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}

function BkmListModal({ ids, titles, monitorId, onOpenBkm, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const queryClient = useQueryClient()
  const [recoverySearch, setRecoverySearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [linkedIds, setLinkedIds] = useState<number[]>(ids || [])
  const [linkedTitles, setLinkedTitles] = useState<string[]>(titles || [])

  useEffect(() => {
    setLinkedIds(ids || [])
    setLinkedTitles(titles || [])
  }, [ids, titles])

  const { data: knowledgeEntries } = useQuery({
    queryKey: ['knowledge-entries'],
    queryFn: async () => (await apiFetch('/api/v1/knowledge/')).json()
  })

  const filteredKnowledge = useMemo(() => {
    if (!knowledgeEntries) return []
    return knowledgeEntries.filter((e: any) => 
      (e.title.toLowerCase().includes(recoverySearch.toLowerCase()) ||
      e.category.toLowerCase().includes(recoverySearch.toLowerCase())) &&
      !linkedIds.includes(e.id)
    )
  }, [knowledgeEntries, recoverySearch, linkedIds])

  const mutation = useMutation({
    mutationFn: async (newIds: number[]) => {
      const res = await apiFetch(`/api/v1/monitoring/${monitorId}`, {
        method: 'PUT',
        body: JSON.stringify({ recovery_docs: newIds })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Failed to update recovery procedures')
      }
      return res.json()
    },
    onSuccess: (_data, newIds) => {
      const titleMap = new Map((knowledgeEntries || []).map((entry: any) => [entry.id, entry.title]))
      setLinkedIds(newIds)
      setLinkedTitles(newIds.map((id: number) => String(titleMap.get(id) || `KB-${id}`)))
      queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
      queryClient.invalidateQueries({ queryKey: ['monitoring-history', monitorId] })
      toast.success('Recovery procedures updated')
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update recovery procedures')
  })

  const toggleRecoveryDoc = (id: number) => {
    const nextIds = linkedIds.includes(id) ? linkedIds.filter((i: number) => i !== id) : [...linkedIds, id]
    mutation.mutate(nextIds)
  }

  const modal = (
    <div onClick={onClose} className={`fixed inset-0 z-[3220] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('standard')}`}>
      <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`glass-panel ${getWorkspaceModalShellClass('standard')} p-6 rounded-lg border-amber-500/20 flex flex-col`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
             <BookOpen size={20} className="text-amber-500" />
             <h3 className="text-sm font-black uppercase text-amber-500 tracking-tight">Recovery Procedures</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
        </div>

        <div className="flex items-center justify-between mb-4">
           <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Linked Procedures (BKM)</p>
           <button 
             onClick={() => setIsAdding(!isAdding)}
             className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center space-x-1.5 ${isAdding ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'}`}
           >
              {isAdding ? <X size={12}/> : <Plus size={12}/>}
              <span>{isAdding ? 'Close Search' : 'Link Procedure'}</span>
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
          {isAdding && (
            <div className="space-y-3 mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg animate-in fade-in slide-in-from-top-2">
               <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    value={recoverySearch}
                    onChange={e => setRecoverySearch(e.target.value)}
                    placeholder="Search Knowledge Base..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-[10px] font-bold outline-none focus:border-amber-500/50"
                  />
               </div>
               <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {filteredKnowledge.map((entry: any) => (
                    <button 
                      key={entry.id}
                      onClick={() => toggleRecoveryDoc(entry.id)}
                      className="w-full text-left p-2 hover:bg-white/5 rounded-lg flex items-center justify-between group transition-all"
                    >
                       <span className="text-[10px] font-bold text-slate-300 group-hover:text-amber-400">{entry.title}</span>
                       <Plus size={12} className="text-slate-600 group-hover:text-amber-500" />
                    </button>
                  ))}
                  {filteredKnowledge.length === 0 && <p className="text-center py-4 text-[9px] text-slate-600 uppercase font-black">No available procedures found</p>}
               </div>
            </div>
          )}

          {linkedIds.map((id: number, i: number) => (
            <div 
              key={id} 
              className="w-full bg-black/40 border border-white/5 p-4 rounded-lg flex items-center justify-between group hover:border-amber-500/50 hover:bg-amber-500/5 transition-all shadow-lg"
            >
              <button onClick={() => onOpenBkm(id)} className="flex items-center space-x-4 flex-1">
                 <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                    <FileText size={16} />
                 </div>
                 <div>
                    <span className="text-[11px] font-black uppercase text-slate-200 block leading-tight">{linkedTitles[i]}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">DOC ID: KB-{id}</span>
                 </div>
              </button>
              <div className="flex items-center space-x-2">
                 <button 
                   onClick={() => toggleRecoveryDoc(id)}
                   className="p-2 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                   title="Unlink Procedure"
                 >
                    <Trash2 size={14} />
                 </button>
                 <ChevronRight size={14} className="text-slate-700 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
          {linkedIds.length === 0 && !isAdding && (
             <div className="py-12 flex flex-col items-center justify-center space-y-3 border-2 border-dashed border-white/5 rounded-lg">
                <BookOpen size={24} className="text-slate-800" />
                <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest text-center px-8">No recovery procedures linked to this monitor</p>
             </div>
          )}
        </div>
      </motion.div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}

function BkmDetailModal({ bkmId, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const { data: bkm, isLoading } = useQuery({
    queryKey: ['knowledge-entry', bkmId],
    queryFn: async () => (await apiFetch(`/api/v1/knowledge/${bkmId}`)).json(),
    enabled: !!bkmId
  })

  const modal = (
    <div onClick={onClose} className={`fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('wide')}`}>
      <motion.div onClick={e => e.stopPropagation()} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`glass-panel ${getWorkspaceModalShellClass('wide')} flex flex-col p-8 rounded-lg border-amber-500/30`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-white">{bkm?.title || 'Loading Document...'}</h2>
                <div className="flex items-center space-x-2 mt-0.5">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Operational Triage Instruction</span>
                   <span className="w-1 h-1 rounded-full bg-slate-700" />
                   <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">BKM ID: KB-{bkmId}</span>
                </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8">
           {isLoading ? (
             <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Clock size={32} className="text-amber-500 animate-spin" />
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest animate-pulse">Retrieving Knowledge...</span>
             </div>
           ) : (
             <>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-6">
                   <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center space-x-2">
                      <Zap size={12}/> <span>Executive Summary</span>
                   </h4>
                   <p className="text-slate-300 font-bold leading-relaxed text-[13px]">{bkm.content || 'No content provided.'}</p>
                </div>

                {bkm.content_json?.steps?.length > 0 && (
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
             </>
           )}
        </div>
      </motion.div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}

function MonitoringDetailModal({ item, onClose, onEdit, onOpenHistory, onOpenBkm, onDelete, onOpenAsset, onOpenKnowledge, deleteConfirm }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [expandedLogic, setExpandedLogic] = useState<number | null>(item.logic_json?.[0]?.id || null)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
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

  const modal = (
    <div onClick={onClose} className={`fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('workspace')}`}>
      <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`glass-panel ${getWorkspaceModalShellClass('workspace')} flex flex-col p-6 sm:p-8 rounded-lg border-blue-500/20 overflow-hidden shadow-[0_0_120px_rgba(37,99,235,0.12)]`}>
        <div className="mb-6 border-b border-white/10 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-600/10 text-blue-400">
                <Monitor size={24} strokeWidth={1.75} />
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.24em] text-blue-400">Monitor {item.id}</span>
                  <StatusPill value={item.status} />
                  <StatusPill value={item.severity} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-white">{item.title}</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {item.device_name || 'No linked asset'} // {item.platform || 'No platform'} // {item.check_interval ? `${item.check_interval}s checks` : 'No frequency'}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ToolbarButton onClick={() => onEdit?.(item)}>Edit Monitor</ToolbarButton>
            <ToolbarButton onClick={() => onOpenHistory?.(item)}>History</ToolbarButton>
            <ToolbarButton onClick={() => onOpenBkm?.(item)}>Recovery</ToolbarButton>
            <ToolbarButton 
              variant="danger" 
              onClick={() => onDelete?.(item)}
              className={deleteConfirm ? 'animate-pulse bg-rose-600 border-rose-500 text-white' : ''}
            >
              {deleteConfirm 
                ? (item.is_deleted ? 'Confirm Purge?' : 'Confirm De-activate?') 
                : (item.is_deleted ? 'Purge' : 'De-activate')}
            </ToolbarButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
           <div className="grid grid-cols-1 sm:grid-cols-12 gap-8">
              <div className="sm:col-span-7 space-y-8">
                 <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5 group hover:border-white/10 transition-all">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center space-x-2">
                          <Info size={12}/> <span>Purpose</span>
                       </h4>
                       <p className="text-[12px] font-bold text-slate-300 leading-relaxed">
                          {item.purpose || 'No purpose defined.'}
                       </p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5 group hover:border-white/10 transition-all">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center space-x-2">
                          <Zap size={12}/> <span>Impact</span>
                       </h4>
                       <p className="text-[12px] font-bold text-slate-300 leading-relaxed">
                          {item.impact || 'No impact analysis defined.'}
                       </p>
                    </div>
                 </section>

                 <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.24em] flex items-center">
                         <Settings size={14} className="mr-3" /> Logic Specification
                      </h3>
                      <button 
                         onClick={() => setShowLineNumbers(!showLineNumbers)}
                         className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${showLineNumbers ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                      >
                         {showLineNumbers ? 'Hide Line Numbers' : 'Show Line Numbers'}
                      </button>
                    </div>
                    <div className="space-y-3">
                       {item.logic_json?.map((log: any) => (
                         <div key={log.id} className="bg-[#0f172a] border border-white/5 rounded-lg overflow-hidden transition-all hover:border-white/10">
                            <button 
                               onClick={() => setExpandedLogic(expandedLogic === log.id ? null : log.id)}
                               className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
                            >
                               <div className="flex items-center space-x-4">
                                  <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter">{log.type}</span>
                                  <span className="text-slate-300 font-bold text-[11px] tracking-tight">{log.description}</span>
                               </div>
                               {expandedLogic === log.id ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                            </button>
                            <AnimatePresence>
                               {expandedLogic === log.id && (
                                 <motion.div 
                                    initial={{ height: 0 }} 
                                    animate={{ height: 'auto' }} 
                                    exit={{ height: 0 }} 
                                    className="overflow-hidden bg-black/40 border-t border-white/5"
                                 >
                                    <div className="flex font-mono text-[12px] leading-relaxed overflow-x-auto custom-scrollbar">
                                       {showLineNumbers && (
                                          <div className="bg-white/5 border-r border-white/10 px-3 py-5 text-slate-600 text-right select-none whitespace-pre min-w-[40px]">
                                             {log.logic_info.split('\n').map((_: any, i: number) => i + 1).join('\n')}
                                          </div>
                                       )}
                                       <pre className="p-5 text-blue-300 flex-1">
                                          {log.logic_info}
                                       </pre>
                                    </div>
                                 </motion.div>
                               )}
                            </AnimatePresence>
                         </div>
                       ))}
                    </div>
                 </section>
              </div>

              <div className="sm:col-span-5 space-y-8">
                 <section className="space-y-3">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.24em] flex items-center px-1">
                       <ChevronRight size={14} className="mr-3" /> Incident Jump Path
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       <button
                         disabled={!item.device_id}
                         onClick={() => item.device_id && onOpenAsset?.(item.device_id)}
                         className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-left transition-all hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                       >
                         <p className="text-[8px] font-black uppercase tracking-[0.25em] text-blue-400">Open Asset</p>
                         <p className="mt-2 text-[10px] font-bold uppercase text-slate-200">{item.device_name || 'No linked asset'}</p>
                       </button>
                       <button
                         disabled={!item.recovery_docs?.length}
                         onClick={() => item.recovery_docs?.[0] && onOpenKnowledge?.(item.recovery_docs[0])}
                         className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-left transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                       >
                         <p className="text-[8px] font-black uppercase tracking-[0.25em] text-amber-400">Open Recovery BKM</p>
                         <p className="mt-2 text-[10px] font-bold uppercase text-slate-200">
                           {item.recovery_doc_titles?.[0] || 'No recovery document linked'}
                         </p>
                       </button>
                    </div>
                 </section>

                 {/* Reliability Matrix */}
                 <section className="space-y-3">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.24em] flex items-center px-1">
                       <Bell size={14} className="mr-3" /> Reliability Matrix
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                       {[
                          { label: 'Severity', value: item.severity, color: 'text-slate-200', icon: Shield },
                          { label: 'Platform', value: item.platform, color: 'text-blue-400', icon: Globe },
                          { label: 'Frequency', value: `${item.check_interval}s`, color: 'text-slate-300', icon: Clock },
                          { label: 'Throttle', value: `${item.notification_throttle}s`, color: 'text-amber-400', icon: Zap }
                       ].map((stat, i) => (
                          <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
                            <div className="flex items-center justify-between mb-2">
                               <stat.icon size={12} className="text-slate-600" />
                               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                            </div>
                               {stat.label === 'Severity' ? <StatusPill value={String(stat.value)} /> : <span className={`text-[12px] font-black ${stat.color} tracking-tighter`}>{stat.value}</span>}
                         </div>
                       ))}
                    </div>
                 </section>

                 <section className="space-y-3">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.24em] flex items-center px-1">
                       <BookOpen size={14} className="mr-3" /> Recovery Procedures
                    </h3>
                    <div className="space-y-2">
                       {item.recovery_doc_titles?.map((title: string, i: number) => (
                         <button
                           key={i}
                           type="button"
                           onClick={() => item.recovery_docs?.[i] && onOpenKnowledge?.(item.recovery_docs[i])}
                           className="w-full bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 flex items-center space-x-3 hover:border-amber-500/30 transition-all cursor-pointer group text-left"
                         >
                            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all"><FileText size={14}/></div>
                            <span className="text-[11px] font-black text-slate-300 tracking-tight leading-tight">{title}</span>
                         </button>
                       ))}
                       {item.recovery_doc_titles?.length === 0 && (
                          <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-4 text-center">
                             <AlertCircle size={18} className="mx-auto text-rose-500 mb-2" />
                             <p className="text-[10px] font-black text-rose-500 uppercase">No BKM Linked</p>
                          </div>
                       )}
                    </div>
                 </section>

                 <section className="space-y-3">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.24em] flex items-center px-1">
                       <Lightbulb size={14} className="mr-3" /> Suggested Runbooks
                    </h3>
                    <div className="space-y-2">
                       {suggestedKnowledge?.slice(0, 3).map((entry: any) => (
                         <button
                           key={entry.id}
                           type="button"
                           onClick={() => onOpenKnowledge?.(entry.id)}
                           className="w-full rounded-lg border border-sky-500/15 bg-sky-500/5 p-3 text-left transition-all hover:bg-sky-500/10"
                         >
                           <p className="text-[11px] font-black text-slate-200 tracking-tight">{entry.title}</p>
                           <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-500">
                             {entry.metadata_json?.entry_type || entry.category} // {entry.metadata_json?.verification?.state || entry.status}
                           </p>
                         </button>
                       ))}
                       {!suggestedKnowledge?.length && (
                         <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 text-center">
                           <p className="text-[10px] font-bold uppercase text-slate-600">No suggested runbooks yet</p>
                         </div>
                       )}
                    </div>
                 </section>

                 {item.monitoring_url && (
                    <button 
                       onClick={() => window.open(item.monitoring_url, '_blank')}
                       className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-lg font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-3"
                    >
                       <ExternalLink size={14} />
                       <span>Open Platform Console</span>
                    </button>
                 )}
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
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

const buildMonitoringFormErrors = (formData: any, ownershipMode: 'team' | 'individual') => {
  const errors: MonitoringFormErrors = {}
  const unsafeUrlPattern = /[<>"']|javascript:|data:|vbscript:/i

  if (!formData.title?.trim()) errors.title = 'Title is required.'
  if (!formData.category) errors.category = 'Category is required.'
  if (!formData.status) errors.status = 'Status is required.'
  if (!formData.severity) errors.severity = 'Severity is required.'
  if (!formData.platform) errors.platform = 'Platform is required.'
  if (!formData.notification_method) errors.notification_method = 'Notification method is required.'

  if (ownershipMode === 'team') {
    if (!formData.owner_team) errors.owner_team = 'Select a team owner.'
    if (formData.owners?.length) errors.ownership = 'Choose either a team owner or individual owners, not both.'
  } else {
    if (!formData.owners?.length) errors.owners = 'Add at least one individual owner.'
    if (formData.owner_team) errors.ownership = 'Choose either a team owner or individual owners, not both.'
  }

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
  context: Object.keys(errors).filter((key) => ['title', 'category', 'status', 'platform', 'owner_team', 'owners', 'ownership', 'monitoring_url'].includes(key)).length,
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
  const containerRef = useRef<HTMLDivElement | null>(null)
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
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    window.addEventListener('mousedown', handleClick)

    // Auto-scroll logic
    const timer = setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)

    return () => {
      window.removeEventListener('mousedown', handleClick)
      clearTimeout(timer)
    }
  }, [isOpen])

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <FieldLabel label="Registry Asset" />
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${error ? 'border-rose-500/60 bg-rose-500/10' : 'border-white/10 bg-slate-950/70 hover:border-blue-500/30'}`}
        >
          <span className={`text-[clamp(10px,0.85vw,12px)] font-black truncate pr-4 ${selectedDevice ? 'text-slate-100' : 'text-slate-500'}`}>
            {selectedDevice ? `${selectedDevice.name} [${selectedDevice.system}]` : 'Select asset'}
          </span>
          <ChevronDown size={12} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-lg border border-white/10 bg-[#020617] p-2 shadow-[0_24px_60px_rgba(2,6,23,0.48)]">
            <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
              <MonitoringSelectField
                label="System Filter"
                value={systemFilter}
                onChange={(value) => setSystemFilter(value)}
                options={[{ value: 'ALL', label: 'All Systems' }, ...systems.map((system) => ({ value: system, label: system }))]}
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
          </div>
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

  const selectedTeam = useMemo(
    () => (teams || []).find((team: MonitoringTeamOption) => team.name === formData.owner_team),
    [teams, formData.owner_team]
  )

  const teamOperators = useMemo(() => {
    if (!selectedTeam?.id) return operators as OperatorRecord[]
    return (operators as OperatorRecord[]).filter((operator) => operator.team_id === selectedTeam.id)
  }, [operators, selectedTeam])

  const tabErrors = useMemo(() => getMonitoringTabErrorCounts(formErrors), [formErrors])

  const setOwnershipModeAndNormalize = (mode: 'team' | 'individual') => {
    setOwnershipMode(mode)
    setFormData((current) => ({
      ...current,
      owner_team: mode === 'team' ? current.owner_team : '',
      owners: mode === 'individual' ? current.owners : []
    }))
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
    setFormErrors(buildMonitoringFormErrors(formData, ownershipMode))
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
    onSuccess: () => {
      setGeneralError('')
      toast.success(item ? 'Logic synchronized' : 'Logic deployed to matrix')
      onSuccess()
    },
    onError: (e: any) => {
      const message = e.message || 'Failed to save monitoring item'
      setGeneralError(message)
      toast.error(message)
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
    const idx = current.indexOf(id)
    if (idx > -1) {
      current.splice(idx, 1)
    } else {
      current.push(id)
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
    const errors = buildMonitoringFormErrors(formData, ownershipMode)
    setFormErrors(errors)
    setGeneralError('')
    if (Object.keys(errors).length > 0) {
      const counts = getMonitoringTabErrorCounts(errors)
      if (counts.context > 0) setActiveTab('context')
      else if (counts.logic > 0) setActiveTab('logic')
      else if (counts.alerting > 0) setActiveTab('alerting')
      toast.error('Resolve the highlighted form errors before saving')
      return
    }
    mutation.mutate(formData)
  }

  const modal = (
    <div onClick={onClose} className={`fixed inset-0 z-[3210] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('workspace')}`}>
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`glass-panel w-full overflow-hidden flex flex-col rounded-lg border-blue-500/20 shadow-[0_0_80px_rgba(37,99,235,0.08)] ${isMaximized ? 'max-w-none h-[calc(100vh-3rem)]' : getWorkspaceModalShellClass('workspace')}`}
      >
        <WorkspaceModalHeader
          icon={<Zap size={20} />}
          title={item ? 'Update Monitoring' : 'Add Monitoring'}
          subtitle="Configure monitoring targets, logic, and alert routing."
          status={<StatusPill value={formData.status} />}
          closeControl={
            <button onClick={onClose} className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500/90 text-transparent transition-all hover:text-rose-950" title="Close">
              <X size={10} strokeWidth={3} />
            </button>
          }
          maximizeControl={
            <button onClick={() => setIsMaximized(prev => !prev)} className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/90 text-transparent transition-all hover:text-emerald-950" title={isMaximized ? 'Restore size' : 'Maximize'}>
              {isMaximized ? <Minimize2 size={8} strokeWidth={3} /> : <Maximize2 size={8} strokeWidth={3} />}
            </button>
          }
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as 'context' | 'logic' | 'alerting')}
          tabs={[
            { id: 'context', label: 'Context', badgeCount: tabErrors.context },
            { id: 'logic', label: 'Logic', badgeCount: tabErrors.logic },
            { id: 'alerting', label: 'Alerting', badgeCount: tabErrors.alerting },
          ]}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 pr-4 sm:px-8">
           <WorkspaceStickyIdentityBar>
             <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_repeat(2,minmax(180px,0.6fr))]">
               <div className="space-y-2">
                 <FieldLabel label="Title" required />
                 <input
                   value={formData.title}
                   onChange={e => setFormData({ ...formData, title: e.target.value })}
                   placeholder="e.g. CORE-DB: High CPU Load Alert"
                   className={monitoringInputClass(formErrors.title)}
                 />
                 <FieldError message={formErrors.title} />
               </div>
               <MonitoringSelectField
                 label="Status"
                 required
                 value={formData.status}
                 onChange={(value) => setFormData({ ...formData, status: value })}
                 options={STATUSES.map(s => ({ value: s.value, label: s.value }))}
                 error={formErrors.status}
               />
               <MonitoringSelectField
                 label="Severity"
                 required
                 value={formData.severity}
                 onChange={(value) => setFormData({ ...formData, severity: value })}
                 options={severities.map((severity: any) => ({ value: severity.value, label: severity.label }))}
                 error={formErrors.severity}
               />
             </div>
           </WorkspaceStickyIdentityBar>
           <WorkspaceValidationBanner message={generalError} />
           {activeTab === 'context' ? (
             <div className="grid grid-cols-12 gap-5 p-2">
               <div className="col-span-12 xl:col-span-5 space-y-5">
                 <WorkspaceSectionCard>
                   <div className="mb-3 flex items-center justify-between">
                     <PanelTitle>Target identification</PanelTitle>
                     <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[8px] font-black text-slate-500">
                       Asset + Scope
                     </span>
                   </div>
                   <div className="space-y-3">
                     <MonitoringAssetField
                       devices={devices || []}
                       deviceId={formData.device_id}
                       onChange={(deviceId) => setFormData({ ...formData, device_id: deviceId, monitored_services: [] })}
                     />
                     {formData.device_id && (
                       <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                         <div className="mb-2 flex items-center justify-between">
                           <FieldLabel label="Service Scope" />
                           <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[8px] font-black text-blue-300">
                             {formData.monitored_services?.length || 0} Bound
                           </span>
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                           {deviceServices?.map((svc: any) => (
                             <button
                               key={svc.id}
                               type="button"
                               onClick={() => toggleService(svc.id)}
                               className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-black transition-all ${
                                 formData.monitored_services?.includes(svc.id)
                                   ? 'border-blue-500/40 bg-blue-500/12 text-blue-200'
                                   : 'border-white/10 bg-slate-950/60 text-slate-400 hover:border-white/20 hover:text-slate-200'
                               }`}
                             >
                               {svc.name}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                     <MonitoringSelectField
                       label="Category"
                       required
                       value={formData.category}
                       onChange={(value) => setFormData({ ...formData, category: value })}
                       options={categories.map((c: any) => ({ value: c.value, label: c.label }))}
                       error={formErrors.category}
                     />
                   </div>
                 </WorkspaceSectionCard>

                 <WorkspaceSectionCard>
                   <div className="mb-3 flex items-center justify-between">
                     <div>
                       <PanelTitle>Ownership</PanelTitle>
                       <PanelSubtitle>
                         Choose a team owner or named operators.
                       </PanelSubtitle>
                     </div>
                     <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[8px] font-black text-blue-300">
                       {ownershipMode === 'team' ? 'Team Mode' : `${formData.owners?.length || 0} Operators`}
                     </span>
                   </div>
                   <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/30 p-1">
                     {[
                       { id: 'team', label: 'Team Owner' },
                       { id: 'individual', label: 'Individual Owners' }
                     ].map((mode) => (
                       <button
                         key={mode.id}
                         type="button"
                         onClick={() => setOwnershipModeAndNormalize(mode.id as 'team' | 'individual')}
                         className={`rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] transition-all ${
                           ownershipMode === mode.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-200'
                         }`}
                       >
                         {mode.label}
                       </button>
                     ))}
                   </div>
                   <FieldError message={formErrors.ownership} />
                   {ownershipMode === 'team' ? (
                     <div className="space-y-2">
                       <MonitoringSelectField
                         label="Owner Team"
                         required
                         value={formData.owner_team}
                         onChange={(value) => setFormData({ ...formData, owner_team: value, owners: [] })}
                         options={(teams || []).map((team: MonitoringTeamOption) => ({
                           value: team.name,
                           label: team.name,
                           description: `${team.operators?.length || 0} members`
                         }))}
                         placeholder="Select team"
                         error={formErrors.owner_team}
                         searchable
                       />
                       {selectedTeam && (
                         <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                           <div className="flex items-center justify-between">
                             <div className="min-w-0">
                               <p className="text-[10px] font-black text-slate-200 truncate">{selectedTeam.name}</p>
                               <p className="mt-0.5 text-[8px] font-black text-slate-500 truncate">
                                 {(selectedTeam.operators?.length || 0)} synced or managed operators
                               </p>
                             </div>
                             <span className="rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-black text-slate-500 shrink-0">
                               {selectedTeam.source || 'manual'}
                             </span>
                           </div>
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="space-y-3">
                       <div className="grid grid-cols-12 gap-2 items-end">
                         <div className="col-span-12 md:col-span-5">
                           <MonitoringSelectField
                             label="Operator"
                             required
                             value={newOwner.operator_id}
                             onChange={(value) => setNewOwner({ ...newOwner, operator_id: value })}
                             options={(operators as OperatorRecord[]).map((operator) => ({
                               value: String(operator.id),
                               label: operator.full_name || operator.username || operator.external_id,
                               description: `${operator.team || 'No team'}`
                             }))}
                             placeholder="Select"
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
                             className="w-full rounded-lg border border-blue-500/30 bg-blue-600 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-all hover:bg-blue-500"
                           >
                             Add
                           </button>
                         </div>
                       </div>
                       <FieldError message={formErrors.owners} />
                       <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                         {formData.owners?.length ? formData.owners.map((o: any, idx: number) => (
                           <div key={idx} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                             <div className="min-w-0">
                               <p className="truncate text-[10px] font-black text-slate-100">{o.name}</p>
                               <p className="mt-0.5 text-[8px] font-black text-slate-500 truncate">
                                 {o.role}
                               </p>
                             </div>
                             <button type="button" onClick={() => removeOwner(idx)} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:text-rose-400">
                               <Trash2 size={12} />
                             </button>
                           </div>
                         )) : (
                           <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[9px] font-black text-slate-600">
                             No owners assigned
                           </div>
                         )}
                       </div>
                     </div>
                   )}
                 </WorkspaceSectionCard>
               </div>

               <div className="col-span-12 xl:col-span-7 space-y-4">
                 <WorkspaceSectionCard>
                   <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                     <MonitoringSelectField
                       label="Platform"
                       required
                       value={formData.platform}
                       onChange={(value) => setFormData({ ...formData, platform: value })}
                       options={(platforms || []).map((platform: any) => ({ value: platform.value, label: platform.label }))}
                       placeholder="Select platform"
                       error={formErrors.platform}
                       searchable
                     />
                     <div className="space-y-1.5">
                       <FieldLabel label="Monitoring URL" />
                       <div className="relative">
                         <Globe size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                         <input
                           value={formData.monitoring_url}
                           onChange={e => setFormData({ ...formData, monitoring_url: e.target.value })}
                           placeholder="https://console.internal/..."
                           className={`${monitoringInputClass(formErrors.monitoring_url)} pl-9 text-blue-300`}
                         />
                       </div>
                       <FieldError message={formErrors.monitoring_url} />
                     </div>
                   </div>
                 </WorkspaceSectionCard>

                 <WorkspaceSectionCard>
                    <div className="mb-3">
                     <PanelTitle>Operational context</PanelTitle>
                   </div>
                   <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                     <div className="space-y-1.5">
                       <FieldLabel label="Purpose" />
                       <textarea
                         value={formData.purpose}
                         onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                         placeholder="Why are we monitoring this?"
                         rows={4}
                         className={`${monitoringInputClass()} resize-none text-[10px]`}
                       />
                     </div>
                     <div className="space-y-1.5">
                       <FieldLabel label="Impact" />
                       <textarea
                         value={formData.impact}
                         onChange={e => setFormData({ ...formData, impact: e.target.value })}
                         placeholder="What happens when this monitor triggers?"
                         rows={4}
                         className={`${monitoringInputClass()} resize-none text-[10px]`}
                       />
                     </div>
                   </div>
                 </WorkspaceSectionCard>
               </div>
             </div>
           ) : activeTab === 'logic' ? (
             <div className="grid grid-cols-12 gap-5 p-2 h-full min-h-[500px]">
                <div className="col-span-12 xl:col-span-4 space-y-4">
                   <WorkspaceSectionCard>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-[clamp(11px,0.9vw,13px)] font-black tracking-tight text-slate-100 uppercase">
                         <Settings size={12}/> <span>Logic Entries</span>
                      </div>
                      <button 
                         onClick={addLogicEntry}
                          className="px-2.5 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600/40 transition-all flex items-center space-x-1"
                      >
                         <Plus size={10}/> <span>Add Entry</span>
                      </button>
                   </div>

                   <div className="mt-4 space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-2">
                      {formData.logic_json?.map((entry: MonitoringLogicEntry) => (
                        <div 
                          key={entry.id}
                          onClick={() => setActiveLogicId(entry.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all relative group ${
                            activeLogicId === entry.id 
                              ? 'bg-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-500/5' 
                              : 'bg-black/40 border-white/5 hover:border-white/20'
                          }`}
                        >
                           <button 
                             onClick={(e) => { e.stopPropagation(); removeLogicEntry(entry.id); }}
                             className="absolute -right-1.5 -top-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                           >
                             <X size={10}/>
                           </button>
                           <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{entry.type}</span>
                              <span className="text-[8px] font-bold text-slate-600">ID {entry.id.toString().slice(-4)}</span>
                           </div>
                           <p className="text-[10px] font-bold text-slate-300 truncate pr-2">{entry.description || 'No description'}</p>
                           {(formErrors[`logic_${entry.id}_description`] || formErrors[`logic_${entry.id}_logic_info`]) && (
                             <p className="mt-1.5 text-[8px] font-black text-rose-400">Required field missing</p>
                           )}
                        </div>
                      ))}
                      {formData.logic_json?.length === 0 && (
                        <div className="py-10 text-center text-slate-600 text-[9px] font-black border-2 border-dashed border-white/5 rounded-lg uppercase tracking-widest">
                           No entries defined
                        </div>
                      )}
                   </div>
                   </WorkspaceSectionCard>

                   <WorkspaceSectionCard>
                      <div className="grid grid-cols-1 gap-3">
                         <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                               <FieldLabel label="Frequency (Sec)" required />
                               <span className="text-[8px] font-bold text-slate-600">{CHECK_INTERVAL_MIN}-{CHECK_INTERVAL_MAX}</span>
                            </div>
                            <div className="relative">
                               <Clock size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                               <input 
                                 type="number"
                                 value={formData.check_interval}
                                 min={CHECK_INTERVAL_MIN}
                                 max={CHECK_INTERVAL_MAX}
                                 onChange={e => setFormData({...formData, check_interval: Number(e.target.value)})}
                                 className={`${monitoringInputClass(formErrors.check_interval)} pl-9`}
                               />
                            </div>
                            <FieldError message={formErrors.check_interval} />
                         </div>
                         <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                               <FieldLabel label="Delay (Sec)" required />
                               <span className="text-[8px] font-bold text-slate-600">{ALERT_DURATION_MIN}-{ALERT_DURATION_MAX}</span>
                            </div>
                            <div className="relative">
                               <AlertCircle size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                               <input 
                                 type="number"
                                 value={formData.alert_duration}
                                 min={ALERT_DURATION_MIN}
                                 max={ALERT_DURATION_MAX}
                                 onChange={e => setFormData({...formData, alert_duration: Number(e.target.value)})}
                                 className={`${monitoringInputClass(formErrors.alert_duration)} pl-9`}
                               />
                            </div>
                            <FieldError message={formErrors.alert_duration} />
                         </div>
                      </div>
                   </WorkspaceSectionCard>
                </div>

                <div className="col-span-12 xl:col-span-8 flex flex-col space-y-4 h-full">
                   {activeLogicEntry ? (
                     <WorkspaceSectionCard className="flex h-full flex-col">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                               className={`${monitoringInputClass(activeLogicErrors.description)}`}
                             />
                             <FieldError message={activeLogicErrors.description} />
                           </div>
                        </div>

                        <div className="mt-4 flex-1 flex flex-col space-y-2 min-h-0">
                           <div className="flex items-center justify-between px-1">
                              <FieldLabel label="Logic Information" required />
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                                Editor
                              </span>
                           </div>
                           
                           <div className={`flex-1 overflow-hidden rounded-lg border shadow-inner min-h-[240px] ${
                             activeLogicErrors.logic_info ? 'border-rose-500/60 bg-rose-500/10' : 'border-white/10 bg-black/40'
                           }`}>
                              <CodeMirror
                                value={activeLogicEntry.logic_info}
                                height="100%"
                                minHeight="240px"
                                extensions={getLogicExtensions(activeLogicEntry.type)}
                                basicSetup={{ lineNumbers: true, foldGutter: true }}
                                placeholder={LOGIC_SUGGESTIONS[activeLogicEntry.type] || 'Enter logic parameters...'}
                                onChange={(value) => updateLogicEntry(activeLogicEntry.id, 'logic_info', value)}
                                theme="dark"
                              />
                           </div>
                           <FieldError message={activeLogicErrors.logic_info} />
                           <div className="flex justify-end pt-1">
                              <span className="text-[8px] font-black text-slate-500 bg-black/60 px-2 py-1 rounded-lg border border-white/5 uppercase tracking-[0.1em]">
                                 {activeLogicEntry.logic_info.length} Chars | {activeLogicEntry.logic_info.split('\n').length} Lines
                              </span>
                           </div>
                        </div>
                     </WorkspaceSectionCard>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-lg space-y-4 bg-black/10">
                        <Activity size={32} className="text-slate-700 animate-pulse" />
                        <div className="text-center">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select logic entry</p>
                           <p className="text-[8px] text-slate-600 font-bold mt-1 uppercase">Logic specification matrix</p>
                        </div>
                     </div>
                   )}
                </div>
             </div>
           ) : (
             <div className="grid grid-cols-12 gap-5 p-2">
                <div className="col-span-12 xl:col-span-4 space-y-4">
                   <WorkspaceSectionCard>
                     <PanelTitle>Alert routing rules</PanelTitle>
                     <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                        <PanelSubtitle>Severity level</PanelSubtitle>
                        <p className="pt-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tight">Pinned in the header for context.</p>
                     </div>

                     <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
                      <div className="space-y-1.5">
                         <div className="flex items-center justify-between">
                            <FieldLabel label="Throttle (Seconds)" required />
                            <span className="text-[8px] font-bold text-slate-600">{NOTIFICATION_THROTTLE_MIN}-{NOTIFICATION_THROTTLE_MAX}</span>
                         </div>
                         <input 
                           type="number"
                           value={formData.notification_throttle}
                           min={NOTIFICATION_THROTTLE_MIN}
                           max={NOTIFICATION_THROTTLE_MAX}
                           onChange={e => setFormData({...formData, notification_throttle: Number(e.target.value)})}
                           className={monitoringInputClass(formErrors.notification_throttle)}
                         />
                         <FieldError message={formErrors.notification_throttle} />
                      </div>
                     </div>

                     <div className="mt-3 space-y-3">
                      <MonitoringSelectField
                        label="Notification Method"
                        required
                        value={formData.notification_method}
                        onChange={(value) => setFormData({...formData, notification_method: value})}
                        options={notificationMethods.map((m:any) => ({ value: m.value, label: m.label }))}
                        error={formErrors.notification_method}
                      />
                      
                      <div className="space-y-1.5">
                         <FieldLabel label="Recipients Matrix" />
                         <div className="flex space-x-2">
                            <input 
                              value={recipientInput}
                              onChange={e => setRecipientInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addRecipient()}
                              placeholder="ID or Email..."
                              className={`${monitoringInputClass()} flex-1 py-2 text-[10px]`}
                            />
                            <button onClick={addRecipient} className="bg-slate-800 hover:bg-slate-700 text-white px-3 rounded-lg transition-all shrink-0"><Plus size={12}/></button>
                         </div>
                      </div>
                     </div>

                     <div className="flex flex-wrap gap-1.5 mt-2 px-1">
                        {formData.notification_recipients.map((r: string) => (
                          <div key={r} className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">
                             <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">{r}</span>
                             <button onClick={() => removeRecipient(r)} className="text-slate-500 hover:text-rose-400 transition-colors"><X size={10}/></button>
                          </div>
                        ))}
                        {formData.notification_recipients.length === 0 && (
                          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest px-1">No recipients defined</p>
                        )}
                     </div>
                   </WorkspaceSectionCard>
                </div>

                <div className="col-span-12 xl:col-span-8 space-y-4">
                   <WorkspaceSectionCard>
                     <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2">
                       <div className="flex items-center space-x-2 text-[clamp(11px,0.9vw,13px)] font-black tracking-tight text-slate-100 uppercase">
                          <Activity size={12}/> <span>Recovery Procedures</span>
                       </div>
                       {formData.severity === 'Critical' && (
                         <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[8px] font-black text-rose-300">
                           Required for Critical
                         </span>
                       )}
                     </div>
                   
                   <div className="space-y-3">
                      <div className={`space-y-4 rounded-lg border-2 p-4 ${formErrors.recovery_docs ? 'border-rose-500/40 bg-rose-500/10' : 'border-dashed border-white/10 bg-black/20'}`}>
                         <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                               <PanelTitle>Link recovery documents</PanelTitle>
                               <PanelSubtitle>Linked docs are presented to the on-call engineer.</PanelSubtitle>
                            </div>
                            <div className="flex items-center space-x-2 bg-blue-600/10 px-2 py-1 rounded-lg border border-blue-600/20 shrink-0">
                               <List size={10} className="text-blue-400" />
                               <span className="text-[9px] font-black text-blue-400">{formData.recovery_docs?.length || 0} Linked</span>
                            </div>
                         </div>

                         <div className="relative group">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input 
                              value={recoverySearch}
                              onChange={e => setRecoverySearch(e.target.value)}
                              placeholder="Search Knowledge Base..."
                              className={`${monitoringInputClass()} pl-11 py-3 text-[11px] shadow-2xl`}
                            />
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredKnowledge?.map((entry: any) => (
                               <button
                                 key={entry.id}
                                 type="button"
                                 onClick={() => toggleRecoveryDoc(entry.id)}
                                 className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group/item ${
                                   formData.recovery_docs?.includes(entry.id)
                                     ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                     : 'bg-black/40 border-white/5 hover:border-white/20'
                                 }`}
                               >
                                  {formData.recovery_docs?.includes(entry.id) && (
                                    <div className="absolute top-0 right-0 w-6 h-6 bg-blue-600 flex items-center justify-center rounded-bl-lg shadow-lg">
                                       <Check size={10} className="text-white" strokeWidth={4} />
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-1.5 mb-1.5">
                                     <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-white/5 truncate">{entry.category}</span>
                                     <span className="text-[8px] font-bold text-slate-600 shrink-0">#{entry.id}</span>
                                  </div>
                                  <p className={`text-[10px] font-black leading-tight transition-colors ${formData.recovery_docs?.includes(entry.id) ? 'text-blue-300' : 'text-slate-300'} line-clamp-2`}>
                                    {entry.title}
                                  </p>
                               </button>
                            ))}
                            {filteredKnowledge?.length === 0 && (
                               <div className="col-span-2 py-6 text-center text-slate-600 text-[9px] font-black uppercase tracking-widest">No entries found</div>
                            )}
                         </div>
                         <FieldError message={formErrors.recovery_docs} />
                      </div>
                   </div>
                   
                           <div className="mt-4 bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-start space-x-3">
                              <div className="p-1.5 bg-white/5 rounded-lg text-slate-500 mt-0.5 shrink-0">
                                 <AlertCircle size={14} />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                 <PanelHint>Operational note</PanelHint>
                                 <p className="text-[9px] font-semibold leading-relaxed text-slate-500 line-clamp-2">Link high-quality recovery documentation to reduce MTTR and give the on-call engineer a clear starting point.</p>
                              </div>
                           </div>
                   </WorkspaceSectionCard>
                </div>
             </div>
           )}
        </div>

        <WorkspaceModalFooter
          left={
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
          right={
            <>
              <button onClick={onClose} className="px-6 sm:px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all">Abort</button>
              <button 
                onClick={handleSave}
                disabled={mutation.isPending}
                className="px-8 sm:px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:bg-slate-700 flex items-center space-x-2"
              >
                {mutation.isPending ? <Clock className="animate-spin" size={14} /> : <Check size={14} />}
                <span>{item ? 'Save Monitoring' : 'Add Monitoring'}</span>
              </button>
            </>
          }
        />
      </motion.div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}

function MonitoringHistoryModal({ item, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
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

  const newer = history?.[Math.min(...selectedIndices)]
  const older = selectedIndices.length > 1 ? history?.[Math.max(...selectedIndices)] : history?.[selectedIndices[0] + 1]

  const getDiff = (curr: any, prev: any) => {
    if (!curr) return []
    const s1 = curr.snapshot || {}
    const s2 = prev?.snapshot || {}
    const keys = Array.from(new Set([...Object.keys(s1), ...Object.keys(s2)]))
    
    return keys.filter(k => {
      if (['updated_at', 'created_at', 'id', 'version', 'is_deleted', 'monitored_service_names', 'recovery_doc_titles', 'device_name'].includes(k)) return false
      return JSON.stringify(s1[k]) !== JSON.stringify(s2[k])
    }).map(k => ({
      field: k,
      old: s2[k],
      new: s1[k]
    }))
  }

  const diffs = getDiff(newer, older)

  const modal = (
    <div onClick={onClose} className={`fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('wide')}`}>
      <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`glass-panel ${getWorkspaceModalShellClass('wide')} flex flex-col p-6 sm:p-8 rounded-lg border-white/10 shadow-[0_0_90px_rgba(15,23,42,0.35)]`}>
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center space-x-6">
              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-blue-400">
                <Clock size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter text-white leading-none">Revision History</h2>
                <div className="flex items-center space-x-2 mt-1">
                   <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.title}</span>
                   <span className="w-1 h-1 rounded-full bg-slate-700" />
                   <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Version Lineage</span>
                </div>
              </div>
           </div>
           
           <div className="flex items-center space-x-4">
              <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-lg">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Comparison Mode</p>
                 <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5">
                       <div className="w-2 h-2 rounded-full bg-blue-500" />
                       <span className="text-[10px] font-black text-white uppercase">v{newer?.version}</span>
                    </div>
                    <ChevronRight size={10} className="text-slate-600" />
                    <div className="flex items-center space-x-1.5">
                       <div className="w-2 h-2 rounded-full bg-slate-600" />
                       <span className="text-[10px] font-black text-slate-400 uppercase">{older ? `v${older.version}` : 'Genesis'}</span>
                    </div>
                 </div>
              </div>
              <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all">
                <X size={24} />
              </button>
           </div>
        </div>

        <div className="flex-1 flex space-x-10 min-h-0">
           {/* Timeline Sidebar */}
           <div className="w-72 flex flex-col min-h-0">
              <div className="mb-4 flex items-center justify-between px-1">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Revision History</h3>
                 <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">{history?.length || 0} States</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {isLoading ? (
                   <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-20">
                      <RefreshCcw size={24} className="animate-spin text-purple-500" />
                      <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest animate-pulse">Syncing Timeline...</span>
                   </div>
                ) : (
                  history?.map((h: any, idx: number) => {
                    const isSelected = selectedIndices.includes(idx);
                    const isNewest = idx === Math.min(...selectedIndices);
                    return (
                      <button 
                        key={h.id}
                        onClick={() => toggleSelection(idx)}
                        className={`w-full p-4 rounded-lg border text-left transition-all relative group overflow-hidden ${
                          isSelected 
                            ? isNewest ? 'bg-blue-600/20 border-blue-500/40 shadow-[0_0_20px_rgba(37,99,235,0.15)]' : 'bg-slate-700 border-slate-500' 
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                      >
                        {isSelected && (
                          <div className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black uppercase rounded-bl-lg ${isNewest ? 'bg-blue-400 text-blue-950' : 'bg-slate-500 text-slate-200'}`}>
                             {isNewest ? 'Primary' : 'Reference'}
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-2">
                           <span className={`text-[11px] font-black uppercase tracking-tighter ${isSelected ? 'text-white' : 'text-blue-400'}`}>v{h.version}</span>
                           <span className={`text-[9px] font-bold ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>
                              {new Date(h.created_at).toLocaleDateString()}
                           </span>
                        </div>
                        <p className={`text-[10px] font-bold leading-tight line-clamp-2 ${isSelected ? 'text-white/90' : 'text-slate-300'}`}>
                           {h.change_summary || 'Configuration Modification'}
                        </p>
                        <div className="mt-2 flex items-center space-x-2">
                           <Clock size={10} className={isSelected ? 'text-white/40' : 'text-slate-600'} />
                           <span className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? 'text-white/40' : 'text-slate-600'}`}>
                              {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="mt-4 p-4 bg-white/[0.03] border border-white/5 rounded-lg">
                 <p className="text-[9px] text-slate-500 font-bold leading-relaxed uppercase">Select two versions to perform a deep semantic comparison. If only one is selected, it compares to its immediate predecessor.</p>
              </div>
           </div>

           {/* Diff Panel */}
           <div className="flex-1 bg-black/40 rounded-lg border border-white/10 overflow-hidden flex flex-col shadow-inner">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md">
                 <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                       <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[12px] font-black">v{newer?.version}</div>
                       <div className="w-4 h-px bg-slate-700" />
                       <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 text-[12px] font-black">{older ? `v${older.version}` : 'Ø'}</div>
                    </div>
                    <div>
                       <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-300">Change Analysis</h3>
                       <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{diffs.length} modification vectors detected</p>
                    </div>
                 </div>
                 <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-black text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest">
                       Diff Ready
                    </span>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                 {diffs.length > 0 ? (
                    <div className="space-y-10">
                       {diffs.map((d: any, i: number) => (
                          <div key={i} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                             <div className="flex items-center justify-between mb-3 px-1">
                                <div className="flex items-center space-x-3">
                                   <div className="w-2 h-6 bg-blue-500 rounded-full" />
                                   <span className="text-[12px] font-black uppercase text-white tracking-[0.2em]">{d.field.replace(/_/g, ' ')}</span>
                                </div>
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Vector Field: {d.field}</span>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                   <div className="flex items-center justify-between px-2">
                                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Pre-Mutation State</span>
                                      <Trash2 size={12} className="text-rose-900" />
                                   </div>
                                   <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-5 relative overflow-hidden min-h-[100px] group transition-all hover:bg-rose-500/10 hover:border-rose-500/20">
                                      <pre className="text-[11px] text-slate-500 line-through whitespace-pre-wrap font-mono leading-relaxed">
                                         {typeof d.old === 'object' ? JSON.stringify(d.old, null, 2) : String(d.old || '(empty_state)')}
                                      </pre>
                                   </div>
                                </div>

                                <div className="space-y-2">
                                   <div className="flex items-center justify-between px-2">
                                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Post-Mutation State</span>
                                      <Zap size={12} className="text-emerald-900" />
                                   </div>
                                   <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-5 relative overflow-hidden min-h-[100px] group transition-all hover:bg-emerald-500/10 hover:border-emerald-500/20">
                                      <pre className="text-[12px] text-emerald-300 whitespace-pre-wrap font-mono font-bold leading-relaxed">
                                         {typeof d.new === 'object' ? JSON.stringify(d.new, null, 2) : String(d.new || '(empty_state)')}
                                      </pre>
                                   </div>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : !isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-6 max-w-md mx-auto">
                       <div className="relative">
                          <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full" />
                          <div className="relative p-8 bg-black/40 rounded-full border border-purple-500/30">
                             <Check size={48} className="text-purple-400" strokeWidth={1} />
                          </div>
                       </div>
                       <div className="text-center space-y-2">
                          <h4 className="text-[13px] font-black text-white uppercase tracking-[0.2em]">Synchronous Integrity</h4>
                          <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-widest">
                             {selectedIndices.length > 1 
                                ? "No semantic variance detected between the selected temporal snapshots. Configuration states are identical." 
                                : "This state represents the system genesis. No previous configuration cycles detected."}
                          </p>
                       </div>
                    </div>
                 ) : null}
              </div>

              {/* Snapshot Footer */}
              <div className="p-4 bg-black/60 border-t border-white/5 flex items-center justify-between">
                 <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                       <User size={12} className="text-slate-600" />
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Authored by: Operational Kernel</span>
                    </div>
                    <div className="flex items-center space-x-2">
                       <Tag size={12} className="text-slate-600" />
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trace ID: {newer?.id}</span>
                    </div>
                 </div>
                 <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Temporal Data Repository - v4.2</div>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}
