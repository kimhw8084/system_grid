import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Activity, Plus, Search, Filter, ExternalLink, 
  Trash2, Edit2, Shield, Cpu, Database, Network, 
  Globe, Bell, Info, ChevronRight, X, Check, Save,
  AlertCircle, Clock, Zap, Settings,
  BookOpen, Eye, EyeOff, FileText, User, Mail, MessageSquare, Monitor, MoreVertical,
  Download, Copy, ChevronDown, ChevronUp, Layers, RefreshCcw, Tag, Sliders, Clipboard, Lightbulb, Maximize2, Minimize2, Star, GitCompare, Undo2, List
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from "ag-grid-react"
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StyledSelect } from './shared/StyledSelect'
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
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

const DEFAULT_MONITORING_VIEWS = [
  { id: 'ops', name: 'Ops', config: { fontSize: 11, rowDensity: 4, hiddenColumns: [], quickFilter: '', quickFilters: { status: '', severity: '', platform: '', owner: '' }, filterModel: {}, sortModel: [] } },
  { id: 'incident', name: 'Incident', config: { fontSize: 11, rowDensity: 4, hiddenColumns: ['purpose'], quickFilter: '', quickFilters: { status: '', severity: '', platform: '', owner: '' }, filterModel: {}, sortModel: [{ colId: 'severity', sort: 'desc' }] } },
  { id: 'recovery', name: 'Recovery', config: { fontSize: 11, rowDensity: 4, hiddenColumns: ['platform', 'check_interval'], quickFilter: '', quickFilters: { status: '', severity: '', platform: '', owner: '' }, filterModel: {}, sortModel: [] } }
]
const DEFAULT_MONITORING_VIEW_IDS = new Set(DEFAULT_MONITORING_VIEWS.map((view) => view.id))

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
  offset = 2
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
  if (x + width + offset > vW - FLOATING_PANEL_EDGE) {
    style.right = vW - x + offset
  } else {
    style.left = Math.max(FLOATING_PANEL_EDGE, x + offset)
  }

  // Vertical positioning
  if (y + height + offset > vH - FLOATING_PANEL_EDGE) {
    style.bottom = vH - y + offset
  } else {
    style.top = Math.max(FLOATING_PANEL_EDGE, y + offset)
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
}: any) => (
  <AgGridReact
    ref={gridRef}
    rowData={rowData}
    columnDefs={columnDefs}
    getRowId={useCallback((params: any) => String(params.data.id), [])}
    rowSelection="multiple"
    animateRows={true}
    headerHeight={fontSize + rowDensity + 4}
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
    overlayNoRowsTemplate="<span class='text-slate-500 font-black uppercase tracking-widest text-[10px]'>No monitoring data found</span>"
  />
), (prev, next) => {
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

export default function MonitoringGrid() {
  const persistedUiState = readMonitoringUiState()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const idParam = searchParams.get('id')
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  
  // --- STYLE LABORATORY STATE ---
  const [fontSize, setFontSize] = useState(persistedUiState?.fontSize ?? 11)
  const [rowDensity, setRowDensity] = useState(persistedUiState?.rowDensity ?? 4)
  const [showDisplayMenu, setShowDisplayMenu] = useState(false)
  const [showViewsMenu, setShowViewsMenu] = useState(false)
  const [showRegistry, setShowRegistry] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(persistedUiState?.hiddenColumns ?? [])
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>(persistedUiState?.activeTab === 'deleted' ? 'deleted' : 'active')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [historyItem, setHistoryItem] = useState<any>(null)
  const [servicePopup, setServicePopup] = useState<{ names: string[], title: string } | null>(null)
  const [recipientPopup, setRecipientPopup] = useState<{ recipients: string[], method: string } | null>(null)
  const [ownerPopup, setOwnerPopup] = useState<{ owners: any[], title: string } | null>(null)
  const [bkmPopup, setBkmPopup] = useState<{ ids: number[], titles: string[], monitorId?: number } | null>(null)
  const [activeBkm, setActiveBkm] = useState<any>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  
  const [selectedIds, setSelectedIds] = useState<number[]>(persistedUiState?.selectedIds ?? [])
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [isBulkSeverityOpen, setIsBulkSeverityOpen] = useState(false)
  const [isBulkNotifyOpen, setIsBulkNotifyOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' })
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [detailDeleteConfirm, setDetailDeleteConfirm] = useState(false)
  const [rowDeleteConfirmId, setRowDeleteConfirmId] = useState<number | null>(null)
  const [rowActionMenu, setRowActionMenu] = useState<{ item: any; style: React.CSSProperties } | null>(null)
  const [gridFilterModel, setGridFilterModel] = useState<Record<string, any>>({})
  const [gridSortModel, setGridSortModel] = useState<any[]>(persistedUiState?.gridSortModel ?? [{ colId: 'favorite', sort: 'desc' }])
  const [savedViews, setSavedViews] = useState<any[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_MONITORING_VIEWS
    try {
      const raw = window.localStorage.getItem(MONITORING_VIEW_STORAGE_KEY)
      if (!raw) return DEFAULT_MONITORING_VIEWS
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return DEFAULT_MONITORING_VIEWS
      return DEFAULT_MONITORING_VIEWS.map((view) => parsed.find((entry: any) => entry.id === view.id) || view)
    } catch {
      return DEFAULT_MONITORING_VIEWS
    }
  })
  const [activeViewId, setActiveViewId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
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
  const [quickFilters, setQuickFilters] = useState(persistedUiState?.quickFilters ?? { status: '', severity: '', platform: '', owner: '' })
  const [groupBy, setGroupBy] = useState<string>(persistedUiState?.groupBy ?? 'raw')
  const [columnLayoutState, setColumnLayoutState] = useState<any[]>(persistedUiState?.columnLayoutState ?? [])
  const [bulkDraft, setBulkDraft] = useState({ status: '', severity: '', notification_method: '' })
  const [expandedBulkSection, setExpandedBulkSection] = useState<'status' | 'severity' | 'notification' | null>(persistedUiState?.expandedBulkSection ?? null)
  const [lastVisitedAt] = useState<number>(() => persistedUiState?.lastVisitedAt ?? 0)
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

  const { data: settingsOptions } = useQuery({ 
    queryKey: ['settings-options'], 
    queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) 
  })

  const categories = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "MonitoringCategory") : [], [settingsOptions])
  const severities = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "MonitoringSeverity") : [], [settingsOptions])
  const notificationMethods = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "NotificationMethod") : [], [settingsOptions])
  const ownerRoles = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "MonitoringOwnerRole") : [], [settingsOptions])

  const openConfirm = useCallback((title: string, message: string, onConfirm: () => void, variant: any = 'danger') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant })
  }, [])

  const openRowActionMenu = useCallback((event: React.MouseEvent, item: any) => {
    event.stopPropagation()
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setRowActionMenu({
      item,
      style: getAnchoredFloatingStyle({ rect, width: 336, height: 432, zIndex: 1115 })
    })
  }, [])

  const openRowActionMenuAtPoint = useCallback((item: any, x: number, y: number) => {
    setRowActionMenu({
      item,
      style: getPointFloatingStyle({ x, y, width: 336, height: 432, zIndex: 1115 })
    })
  }, [])

  const toggleFavorite = useCallback((monitorId: any) => {
    if (monitorId == null) return
    const id = Number(monitorId)
    if (isNaN(id)) return
    setFavoriteIds((current) => current.includes(id) ? current.filter((i) => i !== id) : [...current, id])
  }, [])

  const toggleWatch = useCallback((monitorId: any) => {
    if (monitorId == null) return
    const id = Number(monitorId)
    if (isNaN(id)) return
    setWatchIds((current) => current.includes(id) ? current.filter((i) => i !== id) : [...current, id])
  }, [])

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

  const openCompare = () => {
    if (selectedIds.length < 2 || selectedIds.length > 3) return
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
        if (node.rowIndex >= start && node.rowIndex <= end) {
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
  }, [])

  const handleRowDoubleClicked = useCallback((event: any) => {
    if (!event?.data || shouldIgnoreRowSelection(event.event?.target)) return
    setDetailItem(event.data)
  }, [])

  const onSelectionChanged = useCallback((e: any) => {
    const selectedNodes = e?.api?.getSelectedNodes?.() || []
    setSelectedIds(selectedNodes.map((n: any) => n.data?.id).filter(Boolean) || [])
  }, [])

  const onColumnResized = useCallback((event: any) => {
    if (event.finished) syncColumnLayoutState(event.api)
  }, [])

  const onColumnMoved = useCallback((event: any) => {
    if (!event.source.includes('drag')) syncColumnLayoutState(event.api)
  }, [])

  const onDragStopped = useCallback((event: any) => syncColumnLayoutState(event.api), [])
  const onColumnPinned = useCallback((event: any) => syncColumnLayoutState(event.api), [])
  const onColumnVisible = useCallback((event: any) => syncColumnLayoutState(event.api), [])
  const onFilterChanged = useCallback((e: any) => setGridFilterModel(e.api.getFilterModel() || {}), [])
  
  const onSortChanged = useCallback((e: any) => {
    const nextSortModel = e.api.getColumnState().filter((col: any) => col.sort).map((col: any) => ({ colId: col.colId, sort: col.sort }))
    setGridSortModel(nextSortModel)
  }, [])

  const onCellContextMenu = useCallback((e: any) => {
    if (!e?.data) return
    const mouseEvent = e.event as MouseEvent
    mouseEvent?.preventDefault?.()
    openRowActionMenuAtPoint(e.data, mouseEvent.clientX, mouseEvent.clientY)
  }, [openRowActionMenuAtPoint])

  const onGridReady = useCallback((event: any) => {
    if (columnLayoutState.length > 0) {
      event.api.applyColumnState({
        state: columnLayoutState,
        applyOrder: true,
        defaultState: { sort: null }
      });
    }
  }, [columnLayoutState])

  const getRowClass = useCallback((params: any) => 
    params.node.rowIndex % 2 === 0 ? 'monitoring-grid-row-even' : 'monitoring-grid-row-odd', 
  [])

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
      cellClass: 'flex items-center justify-center border-r border-white/5 pl-2', 
      headerClass: 'flex items-center justify-center border-r border-white/5 pl-2', 
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
      suppressMovable: true,
      cellClass: 'text-center border-r border-white/5 flex items-center justify-center !overflow-visible',
      headerClass: 'text-center border-r border-white/5',
      suppressHide: true,
      cellRenderer: (p: any) => p.data && isRecentChange(p.data) ? (
        <div className="relative flex items-center justify-center h-full w-full">
          <div className="absolute h-10 w-10 rounded-full bg-[radial-gradient(circle,_rgba(251,191,36,0.2)_0%,_transparent_70%)] blur-md animate-pulse" />
          <span className="relative z-[1] block h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
        </div>
      ) : null
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
      suppressMovable: true,
      suppressHide: true,
      valueGetter: (p: any) => {
        const id = p.data?.id ? Number(p.data.id) : null
        return (id != null && p.context?.favoriteIds?.includes(id)) ? 1 : 0
      },
      cellRenderer: (p: any) => {
        const id = p.data?.id ? Number(p.data.id) : null
        const isFavorite = id != null && p.context?.favoriteIds?.includes(id)
        return (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={(event) => {
                event.stopPropagation()
                toggleFavorite(p.data.id)
              }}
              title={isFavorite ? 'Unpin monitor' : 'Pin monitor'}
              className={`rounded-md p-1 transition-all flex items-center justify-center ${isFavorite ? 'text-amber-300' : 'text-slate-600 hover:text-slate-300'}`}
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
      cellRenderer: (p: any) => {
        const id = p.data?.id ? Number(p.data.id) : null
        const isWatched = id != null && p.context?.watchIds?.includes(id)
        return (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={(event) => {
                event.stopPropagation()
                toggleWatch(p.data.id)
              }}
              title={isWatched ? 'Unfollow monitor' : 'Follow monitor'}
              className={`rounded-md p-1 transition-all flex items-center justify-center ${isWatched ? 'text-sky-300' : 'text-slate-600 hover:text-slate-300'}`}
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
      rowGroup: groupBy === 'device_name',
      cellClass: "font-bold text-center flex items-center justify-center", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("device_name") || groupBy === 'device_name'
    },
    { 
      field: "title", 
      headerName: "Title", 
      minWidth: 220,
      width: 280,
      flex: 2.2, 
      filter: true,
      cellClass: "font-bold text-left uppercase tracking-tight flex items-center", 
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
      rowGroup: groupBy === 'status',
      cellClass: 'text-center flex items-center justify-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <StatusPill value={p.value || 'Unknown'} fontSize={fontSize} />,
      hide: hiddenColumns.includes("status") || groupBy === 'status'
    },
    { 
      field: "owners", 
      headerName: "Owners", 
      width: 140,
      minWidth: 120,
      filter: true,
      cellClass: "text-center font-bold uppercase flex items-center justify-center", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const owners = p.value || []
        const count = owners.length
        if (count === 0) return <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500">N/A</span>
        return (
          <button
            onClick={() => setOwnerPopup({ owners, title: p.data.title })}
            className="border-b border-dashed border-slate-700 text-left hover:text-blue-300"
            style={{ fontSize: `${fontSize}px` }}
          >
            {count > 1 ? `${owners[0].name} +${count-1}` : owners[0].name}
          </button>
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
      rowGroup: groupBy === 'category',
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
        return <span style={{ fontSize: `${fontSize}px` }} className={`font-bold uppercase ${colors[p.value] || 'text-slate-400'}`}>{p.value || 'N/A'}</span>
      },
      hide: hiddenColumns.includes("category") || groupBy === 'category'
    },
    { 
      field: "is_active", 
      headerName: "Live", 
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
        if (count === 0) return <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>
        return (
          <div className="flex items-center justify-center h-full">
            <button 
              onClick={() => setServicePopup({ names, title: p.data.title })}
              className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded-lg font-bold text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              style={{ fontSize: `${fontSize}px` }}
            >
              {count}
            </button>
          </div>
        )
      },
      hide: hiddenColumns.includes("monitored_service_names")
    },
    { 
      field: "platform", 
      headerName: "Platform", 
      width: 120, 
      minWidth: 100,
      filter: true,
      rowGroup: groupBy === 'platform',
      cellClass: 'text-center font-bold uppercase text-slate-300 flex items-center justify-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("platform") || groupBy === 'platform'
    },
    { 
      field: "severity", 
      headerName: "Severity", 
      width: 130,
      minWidth: 110,
      filter: true,
      rowGroup: groupBy === 'severity',
      cellClass: 'text-center flex items-center justify-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <StatusPill value={p.value || 'N/A'} fontSize={fontSize} />,
      hide: hiddenColumns.includes("severity") || groupBy === 'severity'
    },
    { 
      field: "check_interval", 
      headerName: "Freq", 
      width: 80, 
      minWidth: 80,
      cellClass: 'text-center font-bold uppercase flex items-center justify-center', 
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
      rowGroup: groupBy === 'notification_method',
      cellClass: 'text-center flex items-center justify-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full">
           <button 
             onClick={() => setRecipientPopup({ recipients: p.data.notification_recipients || [], method: p.value })}
             className="flex items-center space-x-1 hover:text-blue-400 transition-colors"
           >
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase text-slate-300 border-b border-dashed border-slate-700">{p.value || 'N/A'}</span>
           </button>
        </div>
      ),
      hide: hiddenColumns.includes("notification_method") || groupBy === 'notification_method'
    },
    { 
      field: "purpose", 
      headerName: "Purpose", 
      minWidth: 180,
      flex: 1, 
      filter: true,
      cellClass: "font-bold text-slate-500 uppercase text-left truncate px-4 flex items-center", 
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("purpose")
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
  return defs.map((col: any) => {
    const colId = col.colId || col.field
    const layout = layoutById.get(colId)
    if (!layout) return col
    return {
      ...col,
      width: layout.width ?? col.width,
      pinned: layout.pinned ?? col.pinned,
      hide: layout.hide ?? col.hide,
      flex: layout.flex ?? col.flex
    }
  })
}, [fontSize, groupBy, hiddenColumns, columnLayoutState, favoriteIds, watchIds]) as any

  const gridContext = useMemo(() => ({ favoriteIds, watchIds }), [favoriteIds, watchIds])

  const autoGroupColumnDef = useMemo(() => ({
    headerName: groupBy === 'raw' ? 'View' : `Grouped by ${groupOptions.find((option) => option.value === groupBy)?.label || groupBy}`,
    minWidth: 220,
    cellRendererParams: {
      suppressCount: false
    }
  }), [groupBy])

  const groupedColumns = useMemo(() => {
    const layoutById = new Map(columnLayoutState.map((column: any) => [column.colId, column]))
    return columnDefs
      .filter((column: any) => !column.hide)
      .map((column: any) => {
        const colId = column.colId || column.field
        const layout = layoutById.get(colId)
        return {
          key: colId,
          label: column.headerName || '',
          width: layout?.width || column.width || column.minWidth || 120,
          headerClass: column.headerClass || '',
          cellClass: column.cellClass || '',
          pinned: layout?.pinned || column.pinned || null,
          sortable: column.sortable !== false && !column.checkboxSelection && !['recent_change', 'favorite', 'watch', 'row_actions'].includes(colId),
          sort: gridSortModel.find((entry: any) => entry.colId === colId)?.sort || null,
          render: (item: any) => {
            if (column.checkboxSelection) {
              const checked = selectedIds.includes(item.id)
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => toggleGroupedCheckbox(item, event)}
                  onClick={(event) => event.stopPropagation()}
                  className="h-4 w-4 rounded border-white/10 bg-black/40 accent-blue-500"
                />
              )
            }
            if (typeof column.cellRenderer === 'function') {
              return column.cellRenderer({ value: item[column.field], data: item, context: gridContext })
            }
            return item[column.field]
          }
        }
      })
  }, [columnDefs, columnLayoutState, gridSortModel, selectedIds, gridContext])

  const groupedTableMinWidth = useMemo(
    () => groupedColumns.reduce((total: number, column: any) => total + (Number(column.width) || 120), 0),
    [groupedColumns]
  )

  const groupedStickyOffsets = useMemo(() => {
    const offsets: Record<string, { left?: number; right?: number }> = {}
    let left = 0
    groupedColumns.forEach((column: any) => {
      if (column.pinned === 'left') {
        offsets[column.key] = { ...(offsets[column.key] || {}), left }
        left += Number(column.width) || 0
      }
    })
    let right = 0
    ;[...groupedColumns].reverse().forEach((column: any) => {
      if (column.pinned === 'right') {
        offsets[column.key] = { ...(offsets[column.key] || {}), right }
        right += Number(column.width) || 0
      }
    })
    return offsets
  }, [groupedColumns])

  return (
    <div className="h-full min-h-0 flex flex-col space-y-4">
      <PageHeader
        eyebrow="Operations"
        title="Monitoring Matrix"
        subtitle="High-reliability infrastructure observability"
        actions={
          <ToolbarSegmented
            value={activeTab}
            onChange={(next) => {
              setActiveTab(next as 'active' | 'deleted')
              setSelectedIds([])
            }}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Deleted', value: 'deleted' }
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
                    <Save size={14} />
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
          </>
        }
	        right={
	          <>
              <ToolbarButton
                onClick={openCompare}
                disabled={selectedIds.length < 2 || selectedIds.length > 3}
                active={compareOpen}
                title="Compare selected monitors"
              >
                <span className="flex items-center gap-2">
                  <GitCompare size={14} />
                  Compare
                </span>
              </ToolbarButton>
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
        <StyledSelect
          value={quickFilters.status}
          onChange={(e) => setQuickFilters((current) => ({ ...current, status: e.target.value }))}
          options={STATUSES.filter((status) => status.value !== 'Deleted').map((status) => ({ value: status.value, label: status.label }))}
          label="Status Filter"
          placeholder="All statuses"
        />
        <StyledSelect
          value={quickFilters.severity}
          onChange={(e) => setQuickFilters((current) => ({ ...current, severity: e.target.value }))}
          options={severities.map((severity: any) => ({ value: severity.value, label: severity.label }))}
          label="Severity Filter"
          placeholder="All severities"
        />
        <StyledSelect
          value={quickFilters.platform}
          onChange={(e) => setQuickFilters((current) => ({ ...current, platform: e.target.value }))}
          options={platformOptions}
          label="Platform Filter"
          placeholder="All platforms"
        />
        <StyledSelect
          value={quickFilters.owner}
          onChange={(e) => setQuickFilters((current) => ({ ...current, owner: e.target.value }))}
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
                        <StyledSelect
                          value={groupBy}
                          onChange={(e) => setGroupBy(e.target.value)}
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
                          <button
                            onClick={() => saveCurrentToView(view.id)}
                            title={`Overwrite ${view.name}`}
                            className="rounded-lg border border-white/8 bg-white/[0.03] p-2 text-slate-400 transition-all hover:bg-white/[0.06] hover:text-white"
                          >
                            <Save size={13} />
                          </button>
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
                  className="bulk-menu-container max-h-[560px] overflow-y-auto rounded-xl border border-slate-700 bg-[#020617] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
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
                className="row-action-menu-container overflow-hidden rounded-xl border border-slate-700 bg-[#020617] shadow-[0_24px_80px_rgba(0,0,0,0.62)]"
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
            onGridReady={onGridReady}
	            onSelectionChanged={onSelectionChanged}
            onColumnResized={onColumnResized}
            onColumnMoved={onColumnMoved}
            onDragStopped={onDragStopped}
            onColumnPinned={onColumnPinned}
            onColumnVisible={onColumnVisible}
            onFilterChanged={onFilterChanged}
	            onSortChanged={onSortChanged}
            onCellContextMenu={onCellContextMenu}
	            onRowClicked={onRowClicked}
            onRowDoubleClicked={onRowDoubleClicked}
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
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="grouped-monitoring-table border-collapse table-fixed" style={{ minWidth: `${groupedTableMinWidth}px`, width: `${groupedTableMinWidth}px` }}>
                      <colgroup>
                        {groupedColumns.map((column: any) => (
                          <col key={column.key} style={{ width: `${column.width}px` }} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-900/50" style={{ height: `${fontSize + rowDensity + 4}px` }}>
                          {groupedColumns.map((column: any) => (
                            <th
                              key={column.key}
                              onClick={() => column.sortable && cycleGroupedSort(column.key)}
                              className={`px-0 py-0 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 ${column.headerClass || ''} ${column.sortable ? 'cursor-pointer select-none hover:text-slate-200' : ''} ${column.pinned ? 'sticky z-[2] backdrop-blur-md' : ''}`}
                              style={{
                                fontSize: `${fontSize}px`,
                                height: `${fontSize + rowDensity + 4}px`,
                                left: groupedStickyOffsets[column.key]?.left,
                                right: groupedStickyOffsets[column.key]?.right,
                                background: column.pinned ? '#1a1b26' : undefined
                              }}
                            >
                              <span className="flex items-center justify-center gap-1 h-full border-r border-white/5">
                                <span>{column.label}</span>
                                {column.sort === 'asc' && <ChevronUp size={12} className="text-blue-400" />}
                                {column.sort === 'desc' && <ChevronDown size={12} className="text-blue-400" />}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map((item: any, rowIndex: number) => {
                          const selected = selectedIds.includes(item.id)
                          return (
                            <tr
                              key={item.id}
                              onClick={(event) => handleGroupedRowClick(item, event)}
                              onDoubleClick={() => setDetailItem(item)}
                              onContextMenu={(event) => {
                                event.preventDefault()
                                openRowActionMenuAtPoint(item, event.clientX, event.clientY)
                              }}
                              className={`cursor-pointer border-b border-white/5 transition-all group ${selected ? 'bg-blue-600/20' : rowIndex % 2 === 0 ? 'bg-[#0f172a] hover:bg-white/[0.05]' : 'bg-[#020617] hover:bg-white/[0.05]'}`}
                              style={{ height: `${fontSize + rowDensity + 4}px` }}
                            >
                              {groupedColumns.map((column: any) => (
                                <td
                                  key={column.key}
                                  className={`h-full overflow-hidden whitespace-nowrap px-0 py-0 align-middle font-bold text-slate-200 text-ellipsis ${column.cellClass || ''} ${column.pinned ? 'sticky z-[1]' : ''}`}
                                  style={{
                                    fontSize: `${fontSize}px`,
                                    height: `${fontSize + rowDensity + 4}px`,
                                    maxHeight: `${fontSize + rowDensity + 4}px`,
                                    left: groupedStickyOffsets[column.key]?.left,
                                    right: groupedStickyOffsets[column.key]?.right,
                                    background: selected
                                      ? 'rgba(37, 99, 235, 0.2)'
                                      : column.pinned
                                        ? rowIndex % 2 === 0 ? '#0f172a' : '#020617'
                                        : undefined
                                  }}
                                >
                                  <div className={`flex items-center justify-center h-full ${column.key !== 'row_actions' ? 'border-r border-white/5' : ''}`}>
                                    {column.render(item)}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
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
            notificationMethods={notificationMethods}
            ownerRoles={ownerRoles}
            onClose={() => setIsFormOpen(false)} 
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
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
        {servicePopup && <ServicesModal names={servicePopup.names} title={servicePopup.title} onClose={() => setServicePopup(null)} />}
        {recipientPopup && <RecipientsModal recipients={recipientPopup.recipients} method={recipientPopup.method} onClose={() => setRecipientPopup(null)} />}
        {ownerPopup && <OwnersModal owners={ownerPopup.owners} title={ownerPopup.title} onClose={() => setOwnerPopup(null)} />}
        {bkmPopup && <BkmListModal ids={bkmPopup.ids} titles={bkmPopup.titles} onOpenBkm={setActiveBkm} onClose={() => setBkmPopup(null)} />}
        {activeBkm && <BkmDetailModal bkmId={activeBkm} onClose={() => setActiveBkm(null)} />}
        {compareOpen && <CompareMonitorsModal items={compareItems} onClose={() => setCompareOpen(false)} />}
        <ConfigRegistryModal
            isOpen={showRegistry}
            onClose={() => setShowRegistry(false)}
            title="Monitoring Matrix Enumerations"
            sections={[
                { title: "Categories", category: "MonitoringCategory", icon: Layers },
                { title: "Severity Levels", category: "MonitoringSeverity", icon: AlertCircle },
                { title: "Notification Methods", category: "NotificationMethod", icon: Bell },
                { title: "Owner Roles", category: "MonitoringOwnerRole", icon: User },
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
        .ag-header-cell-label { 
            font-weight: 700 !important; 
            text-transform: uppercase !important; 
            letter-spacing: 0.1em !important; 
            font-size: ${fontSize}px !important; 
            justify-content: center !important; 
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
      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
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
    <div className="rounded-xl border border-slate-800 bg-[#0b1220] p-3">
      <div className="grid gap-3">
        <StyledSelect
          value={value}
          onChange={(e) => onChange(e.target.value)}
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

function OwnersModal({ owners, title, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  return (
    <div onClick={onClose} className="fixed inset-0 z-[3220] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-6">
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-lg rounded-xl border border-slate-700 bg-[#020617] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Owner Contacts</h3>
            <p className="pt-1 text-[11px] text-slate-400">{title}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-2">
          {owners.map((owner: any, index: number) => (
            <div key={`${owner.name}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-slate-100">{owner.name}</p>
                  <p className="pt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">{owner.role || 'Owner'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-300">{owner.external_id || 'No contact path'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function CompareMonitorsModal({ items, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  return (
    <div onClick={onClose} className="fixed inset-0 z-[3220] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-6">
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-6xl rounded-xl border border-slate-700 bg-[#020617] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Compare Monitors</h3>
            <p className="pt-1 text-[11px] text-slate-400">Read the selected monitors side-by-side before you bulk-edit or de-activate them.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className={`grid gap-4 ${items.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {items.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">ID {item.id} · {item.device_name || 'No asset'}</p>
              <h4 className="pt-2 text-sm font-semibold text-slate-100">{item.title}</h4>
              <div className="mt-3 space-y-2 text-[11px] text-slate-300">
                <CompareRow label="Status" value={item.status || 'Unknown'} />
                <CompareRow label="Severity" value={item.severity || 'N/A'} />
                <CompareRow label="Platform" value={item.platform || 'N/A'} />
                <CompareRow label="Notify" value={item.notification_method || 'None'} />
                <CompareRow label="Owners" value={(item.owners || []).map((owner: any) => owner.name).join(', ') || 'None'} />
                <CompareRow label="Recovery" value={item.recovery_doc_titles?.join(', ') || 'None linked'} />
                <CompareRow label="Purpose" value={item.purpose || 'No purpose documented'} multiline />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function CompareRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={`rounded-lg border border-slate-800 bg-[#0b1220] px-3 py-2 ${multiline ? '' : 'flex items-center justify-between gap-3'}`}>
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`pt-1 text-slate-200 ${multiline ? 'leading-5' : 'text-right'}`}>{value}</p>
    </div>
  )
}

function BulkActionModals({ isStatusOpen, isSeverityOpen, isNotifyOpen, onClose, onApply, severities, notificationMethods }: any) {
    const [val, setVal] = useState('')
    
    useEffect(() => { setVal(''); }, [isStatusOpen, isSeverityOpen, isNotifyOpen]);
    useEscapeDismiss(onClose)

    if (isStatusOpen) return (
        <div onClick={onClose} className="fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-6">
           <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-lg border border-blue-500/30 space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tighter text-blue-400 flex items-center space-x-3">
                  <Tag size={24}/> <span>Set Status</span>
              </h2>
              <StyledSelect
                value={val}
                onChange={e => setVal(e.target.value)}
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

    if (isSeverityOpen) return (
        <div onClick={onClose} className="fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-6">
           <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-lg border border-rose-500/30 space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tighter text-rose-400 flex items-center space-x-3">
                  <Shield size={24}/> <span>Set Severity</span>
              </h2>
              <StyledSelect
                value={val}
                onChange={e => setVal(e.target.value)}
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

    if (isNotifyOpen) return (
        <div onClick={onClose} className="fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-6">
           <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-lg border border-amber-500/30 space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tighter text-amber-400 flex items-center space-x-3">
                  <Bell size={24}/> <span>Set Notification</span>
              </h2>
              <StyledSelect
                value={val}
                onChange={e => setVal(e.target.value)}
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

    return null;
}

// --- POPUP MODALS ---

function ServicesModal({ names, title, onClose }: any) {
  useEscapeDismiss(onClose)
  return (
    <div onClick={onClose} className="fixed inset-0 z-[3220] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-6">
      <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-md p-6 rounded-lg border-blue-500/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase text-blue-400">Monitored Services</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
        </div>
        <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Linked to: {title}</p>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {names.map((name: string, i: number) => (
            <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-lg flex items-center space-x-3">
              <Shield size={14} className="text-blue-500" />
              <span className="text-[11px] font-bold text-slate-200">{name}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function RecipientsModal({ recipients, method, onClose }: any) {
  useEscapeDismiss(onClose)
  return (
    <div onClick={onClose} className="fixed inset-0 z-[3220] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-6">
      <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-md p-6 rounded-lg border-emerald-500/20">
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
      toast.success('Recovery procedures updated')
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update recovery procedures')
  })

  const toggleRecoveryDoc = (id: number) => {
    const nextIds = linkedIds.includes(id) ? linkedIds.filter((i: number) => i !== id) : [...linkedIds, id]
    mutation.mutate(nextIds)
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[3220] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-6">
      <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-lg p-6 rounded-lg border-amber-500/20 flex flex-col max-h-[85vh]">
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
}

function BkmDetailModal({ bkmId, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const { data: bkm, isLoading } = useQuery({
    queryKey: ['knowledge-entry', bkmId],
    queryFn: async () => (await apiFetch(`/api/v1/knowledge/${bkmId}`)).json(),
    enabled: !!bkmId
  })

  return (
    <div onClick={onClose} className="fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-8">
      <motion.div onClick={e => e.stopPropagation()} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-4xl h-[80vh] flex flex-col p-8 rounded-lg border-amber-500/30">
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
    <div onClick={onClose} className="fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-4 sm:p-8">
      <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-6xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col p-6 sm:p-8 rounded-lg border-blue-500/20 overflow-hidden shadow-[0_0_120px_rgba(37,99,235,0.12)]">
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

export function MonitoringForm({ item, devices, categories, severities, notificationMethods, ownerRoles, onClose, onSuccess }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [activeTab, setActiveTab] = useState<'context' | 'logic' | 'alerting'>('context')
  const [recoverySearch, setRecoverySearch] = useState('')
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [activeLogicId, setActiveLogicId] = useState<number | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)

  const [formData, setFormData] = useState({
    category: 'Infrastructure',
    status: 'Planned',
    title: '',
    spec: '',
    platform: 'Zabbix',
    monitoring_url: '',
    purpose: '',
    impact: '',
    notification_method: 'Email',
    notification_recipients: [],
    logic: '',
    logic_json: [],
    device_id: null,
    monitored_services: [],
    check_interval: 60,
    alert_duration: 0,
    notification_throttle: 3600,
    severity: 'Warning',
    is_active: true,
    recovery_docs: [],
    owners: [],
    ...sanitizeMonitoringPayload(item)
  })

  const [newOwner, setNewOwner] = useState({ name: '', external_id: '', role: ownerRoles?.[0]?.value || 'Primary Support' })

  const addOwner = () => {
    if (newOwner.name && newOwner.external_id) {
       setFormData({ ...formData, owners: [...formData.owners, newOwner] })
       setNewOwner({ name: '', external_id: '', role: ownerRoles?.[0]?.value || 'Primary Support' })
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

  const [recipientInput, setRecipientInput] = useState('')

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
      toast.success(item ? 'Logic synchronized' : 'Logic deployed to matrix')
      onSuccess()
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save monitoring item')
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
    const newEntries = [...(formData.logic_json || []), { type: 'Threshold', description: '', logic_info: '', id }]
    setFormData({ ...formData, logic_json: newEntries })
    setActiveLogicId(id)
  }

  const removeLogicEntry = (id: number) => {
    const filtered = formData.logic_json.filter((e: any) => e.id !== id)
    setFormData({ ...formData, logic_json: filtered })
    if (activeLogicId === id) {
      setActiveLogicId(filtered.length > 0 ? filtered[0].id : null)
    }
  }

  const updateLogicEntry = (id: number, field: string, value: string) => {
    const newEntries = formData.logic_json.map((e: any) => e.id === id ? { ...e, [field]: value } : e)
    setFormData({ ...formData, logic_json: newEntries })
  }

  const activeLogicEntry = formData.logic_json?.find((e: any) => e.id === activeLogicId)

  const addRecipient = () => {
    if (recipientInput && !formData.notification_recipients.includes(recipientInput)) {
      setFormData({ ...formData, notification_recipients: [...formData.notification_recipients, recipientInput] })
      setRecipientInput('')
    }
  }

  const removeRecipient = (r: string) => {
    setFormData({ ...formData, notification_recipients: formData.notification_recipients.filter((item: string) => item !== r) })
  }

  const modal = (
    <div onClick={onClose} className="fixed inset-0 z-[3210] flex items-center justify-center bg-[rgba(2,6,23,0.6)] backdrop-blur-[12px] p-4 sm:p-6">
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`glass-panel w-full overflow-hidden flex flex-col rounded-lg border-blue-500/20 shadow-[0_0_80px_rgba(37,99,235,0.08)] ${isMaximized ? 'max-w-none h-[calc(100vh-3rem)]' : 'max-w-7xl h-full sm:h-[90vh]'}`}
      >
        <div className="border-b border-white/10 px-6 py-4 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500/90 text-transparent transition-all hover:text-rose-950" title="Close">
                  <X size={10} strokeWidth={3} />
                </button>
                <button onClick={() => setIsMaximized(prev => !prev)} className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/90 text-transparent transition-all hover:text-emerald-950" title={isMaximized ? 'Restore size' : 'Maximize'}>
                  {isMaximized ? <Minimize2 size={8} strokeWidth={3} /> : <Maximize2 size={8} strokeWidth={3} />}
                </button>
              </div>
              <div className="ml-2 p-3 bg-blue-600/10 rounded-lg text-blue-400 border border-blue-500/20">
                <Zap size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tighter text-white">
                  {item ? 'Update Monitoring' : 'Add Monitoring'}
                </h2>
                <div className="mt-1 flex items-center space-x-2">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Monitoring editor</span>
                   <span className="w-1 h-1 rounded-full bg-slate-700" />
                   <StatusPill value={formData.status} />
                </div>
              </div>
            </div>

            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
              {[
                { id: 'context', label: 'Context' },
                { id: 'logic', label: 'Logic' },
                { id: 'alerting', label: 'Alerting' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 sm:px-6 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 pr-4 sm:px-8">
           {activeTab === 'context' ? (
             <div className="grid grid-cols-12 gap-8 p-2">
                <div className="col-span-12 sm:col-span-4 space-y-6">
                   <div className="space-y-4">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 border-l-2 border-blue-600 pl-3">Target Identification</h3>
                      <StyledSelect 
                        label="Registry Asset"
                        value={formData.device_id}
                        onChange={(e: any) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value);
                            setFormData({...formData, device_id: val, monitored_services: []});
                        }}
                        options={devices?.map((d: any) => ({ value: d.id, label: `${d.name} [${d.system}]` })) || []}
                        placeholder="Select Device..."
                      />

                      {formData.device_id && (
                        <div className="p-4 bg-white/5 rounded-lg border border-white/5 space-y-3">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Service Scope</label>
                              <span className="text-[8px] font-bold text-blue-500 uppercase bg-blue-500/10 px-2 py-0.5 rounded-full">
                                {formData.monitored_services?.length || 0} Bound
                              </span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {deviceServices?.map((svc: any) => (
                                <button
                                  key={svc.id}
                                  onClick={() => toggleService(svc.id)}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center space-x-1.5 border ${
                                    formData.monitored_services?.includes(svc.id)
                                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                      : 'bg-black/40 border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
                                  }`}
                                >
                                  {formData.monitored_services?.includes(svc.id) ? <Check size={8} strokeWidth={4} /> : <div className="w-1 h-1 rounded-full bg-slate-700" />}
                                  <span>{svc.name}</span>
                                </button>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <StyledSelect 
                        label="Category"
                        value={formData.category}
                        onChange={(e: any) => setFormData({...formData, category: e.target.value})}
                        options={categories.map((c:any) => ({ value: c.value, label: c.label }))}
                      />
                      <StyledSelect 
                        label="Status"
                        value={formData.status}
                        onChange={(e: any) => setFormData({...formData, status: e.target.value})}
                        options={STATUSES.map(s => ({ value: s.value, label: s.value }))}
                      />
                   </div>
                   
                   <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/5">
                      <div className="flex items-center justify-between px-1">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ownership</h3>
                         <span className="text-[8px] font-bold text-blue-500 uppercase bg-blue-500/10 px-2 py-0.5 rounded-full">{formData.owners?.length || 0} Assigned</span>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-2">
                         <div className="col-span-4">
                            <input 
                              value={newOwner.name}
                              onChange={e => setNewOwner({...newOwner, name: e.target.value})}
                              placeholder="Name..."
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500"
                            />
                         </div>
                         <div className="col-span-3">
                            <input 
                              value={newOwner.external_id}
                              onChange={e => setNewOwner({...newOwner, external_id: e.target.value})}
                              placeholder="ID..."
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500"
                            />
                         </div>
                         <div className="col-span-4">
                            <select 
                              value={newOwner.role}
                              onChange={e => setNewOwner({...newOwner, role: e.target.value})}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500 appearance-none"
                            >
                               {ownerRoles.map((r:any) => <option key={r.id} value={r.value}>{r.label}</option>)}
                            </select>
                         </div>
                         <div className="col-span-1">
                            <button onClick={addOwner} className="w-full h-full flex items-center justify-center bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-all"><Plus size={14}/></button>
                         </div>
                      </div>

                      <div className="space-y-1 mt-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                         {formData.owners?.map((o: any, idx: number) => (
                           <div key={idx} className="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5 group">
                              <div className="flex items-center space-x-3">
                                 <User size={12} className="text-blue-500" />
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-200">{o.name}</span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{o.role} | ID: {o.external_id}</span>
                                 </div>
                              </div>
                              <button onClick={() => removeOwner(idx)} className="p-1 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="col-span-12 sm:col-span-8 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Title</label>
                        <input 
                          value={formData.title}
                          onChange={e => setFormData({...formData, title: e.target.value})}
                          placeholder="e.g. CORE-DB: High CPU Load Alert"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Platform</label>
                        <input 
                          value={formData.platform}
                          onChange={e => setFormData({...formData, platform: e.target.value})}
                          placeholder="e.g. Zabbix, Prometheus"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Monitoring URL</label>
                      <div className="relative group">
                        <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                          value={formData.monitoring_url}
                          onChange={e => setFormData({...formData, monitoring_url: e.target.value})}
                          placeholder="https://console.internal/..."
                          className="w-full bg-black/40 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-[12px] font-bold text-blue-400 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
	                      <div className="space-y-2">
	                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center space-x-2">
	                          <Info size={14}/> <span>Purpose</span>
	                        </label>
                        <textarea 
                          value={formData.purpose}
                          onChange={e => setFormData({...formData, purpose: e.target.value})}
                          placeholder="Why are we monitoring this? How does it help the team?"
                          rows={4}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[11px] font-bold text-white outline-none focus:border-blue-500 transition-all resize-none"
                        />
                      </div>
	                      <div className="space-y-2">
	                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center space-x-2">
	                          <Zap size={14}/> <span>Impact</span>
	                        </label>
                        <textarea 
                          value={formData.impact}
                          onChange={e => setFormData({...formData, impact: e.target.value})}
                          placeholder="What does it mean if this alert notifies? What is the consequence?"
                          rows={4}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[11px] font-bold text-white outline-none focus:border-blue-500 transition-all resize-none"
                        />
                      </div>
                   </div>
                </div>
             </div>
           ) : activeTab === 'logic' ? (
             <div className="grid grid-cols-12 gap-8 p-2 h-full min-h-[500px]">
                {/* Left: Logic Entry Selection */}
                <div className="col-span-12 sm:col-span-4 space-y-4">
                   <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center space-x-2">
                         <Settings size={14}/> <span>Logic Entries</span>
                      </h3>
                      <button 
                         onClick={addLogicEntry}
                         className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600/40 transition-all flex items-center space-x-1"
                      >
                         <Plus size={12}/> <span>Add Entry</span>
                      </button>
                   </div>

                   <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {formData.logic_json?.map((entry: any) => (
                        <div 
                          key={entry.id}
                          onClick={() => setActiveLogicId(entry.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all relative group ${
                            activeLogicId === entry.id 
                              ? 'bg-blue-600/10 border-blue-500/50 shadow-lg' 
                              : 'bg-black/40 border-white/5 hover:border-white/20'
                          }`}
                        >
                           <button 
                             onClick={(e) => { e.stopPropagation(); removeLogicEntry(entry.id); }}
                             className="absolute -right-2 -top-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                           >
                             <X size={12}/>
                           </button>
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black uppercase text-blue-400">{entry.type}</span>
                              <span className="text-[8px] font-bold text-slate-600 uppercase">Entry #{entry.id.toString().slice(-4)}</span>
                           </div>
                           <p className="text-[11px] font-bold text-slate-300 truncate">{entry.description || 'No description provided'}</p>
                        </div>
                      ))}
                      {formData.logic_json?.length === 0 && (
                        <div className="py-12 text-center text-slate-600 text-[10px] uppercase font-black border-2 border-dashed border-white/5 rounded-lg">
                           No logic entries defined
                        </div>
                      )}
                   </div>

                   <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="grid grid-cols-1 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Check Frequency (Seconds)</label>
                            <div className="relative">
                               <Clock size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                               <input 
                                 type="number"
                                 value={formData.check_interval}
                                 onChange={e => setFormData({...formData, check_interval: parseInt(e.target.value)})}
                                 className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                               />
                            </div>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Alert Duration (Seconds Delay)</label>
                            <div className="relative">
                               <AlertCircle size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                               <input 
                                 type="number"
                                 value={formData.alert_duration}
                                 onChange={e => setFormData({...formData, alert_duration: parseInt(e.target.value)})}
                                 className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                               />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Right: Detailed Logic Editor */}
                <div className="col-span-12 sm:col-span-8 flex flex-col space-y-4 h-full">
                   {activeLogicEntry ? (
                     <>
                        <div className="grid grid-cols-2 gap-4">
                           <StyledSelect 
                             label="Logic Type"
                             value={activeLogicEntry.type}
                             onChange={e => updateLogicEntry(activeLogicEntry.id, 'type', e.target.value)}
                             options={LOGIC_TYPES.map(t => ({ value: t, label: t }))}
                           />
                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</label>
                             <input 
                               value={activeLogicEntry.description}
                               onChange={e => updateLogicEntry(activeLogicEntry.id, 'description', e.target.value)}
                               placeholder="What does this logic check?"
                               className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                             />
                           </div>
                        </div>

                        <div className="flex-1 flex flex-col space-y-2 min-h-0">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Logic Information</label>
                              <button 
                                onClick={() => setShowLineNumbers(!showLineNumbers)}
                                className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${showLineNumbers ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                              >
                                {showLineNumbers ? 'Hide Line Numbers' : 'Show Line Numbers'}
                              </button>
                           </div>
                           
                           <div className="flex-1 bg-black/40 border border-white/10 rounded-lg overflow-hidden flex font-mono text-[12px] shadow-inner relative group min-h-[200px]">
                              {showLineNumbers && (
                                <div className="bg-white/5 border-r border-white/10 px-3 py-4 text-slate-600 text-right select-none whitespace-pre leading-relaxed min-w-[40px]">
                                   {activeLogicEntry.logic_info.split('\n').map((_, i) => i + 1).join('\n')}
                                </div>
                              )}
                              <textarea 
                                value={activeLogicEntry.logic_info}
                                onChange={e => updateLogicEntry(activeLogicEntry.id, 'logic_info', e.target.value)}
                                placeholder={LOGIC_SUGGESTIONS[activeLogicEntry.type] || 'Enter logic parameters...'}
                                className="flex-1 bg-transparent p-4 outline-none text-blue-300 resize-none leading-relaxed custom-scrollbar placeholder:text-slate-700"
                                spellCheck={false}
                              />
                              
                              <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <span className="text-[8px] font-black text-slate-500 uppercase bg-black/60 px-2 py-1 rounded-lg border border-white/5">
                                    {activeLogicEntry.logic_info.length} Chars | {activeLogicEntry.logic_info.split('\n').length} Lines
                                 </span>
                              </div>
                           </div>
                        </div>
                     </>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-lg space-y-4">
                        <Activity size={40} className="text-slate-700" />
                        <div className="text-center">
                           <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Select an entry to modify logic</p>
                           <p className="text-[9px] text-slate-600 uppercase font-bold mt-1">Logic Specification Environment</p>
                        </div>
                     </div>
                   )}
                </div>
             </div>
           ) : (
             <div className="grid grid-cols-12 gap-8 p-2">
                {/* Left: Severity & Throttling */}
                <div className="col-span-12 sm:col-span-4 space-y-6">
                   <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 border-l-2 border-blue-600 pl-3">Alert Routing Rules</h3>
                   
                   <StyledSelect 
                     label="Severity Level"
                     value={formData.severity}
                     onChange={(e: any) => setFormData({...formData, severity: e.target.value})}
                     options={severities.map((s:any) => ({ value: s.value, label: s.label }))}
                   />

                   <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/5">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notification Throttle (Seconds)</label>
                         <p className="text-[8px] text-slate-600 uppercase font-bold mb-2 tracking-tight">Minimum time between re-alerts for the same issue</p>
                         <input 
                           type="number"
                           value={formData.notification_throttle}
                           onChange={e => setFormData({...formData, notification_throttle: parseInt(e.target.value)})}
                           className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                         />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <StyledSelect 
                        label="Primary Notification Method"
                        value={formData.notification_method}
                        onChange={(e: any) => setFormData({...formData, notification_method: e.target.value})}
                        options={notificationMethods.map((m:any) => ({ value: m.value, label: m.label }))}
                      />
                      
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recipients Matrix</label>
                         <div className="flex space-x-2">
                            <input 
                              value={recipientInput}
                              onChange={e => setRecipientInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addRecipient()}
                              placeholder="Channel ID or Email..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-[11px] outline-none focus:border-blue-500"
                            />
                            <button onClick={addRecipient} className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-lg transition-all"><Plus size={14}/></button>
                         </div>
                         <div className="flex flex-wrap gap-2 mt-2">
                            {formData.notification_recipients.map((r: string) => (
                              <div key={r} className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">
                                 <span className="text-[10px] font-bold text-blue-300">{r}</span>
                                 <button onClick={() => removeRecipient(r)} className="text-slate-500 hover:text-rose-400"><X size={10}/></button>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                {/* Right: Recovery Methods (Linked Knowledge) */}
                <div className="col-span-12 sm:col-span-8 space-y-6">
                   <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center space-x-2 border-b border-white/5 pb-2">
                      <Activity size={14}/> <span>Recovery Procedures (Linked BKM/Knowledge)</span>
                   </h3>
                   
                   <div className="space-y-4">
                      <div className="p-6 border-2 border-dashed border-white/5 rounded-lg space-y-6">
                         <div className="flex items-center justify-between">
                            <div className="space-y-1">
                               <p className="text-[12px] font-black text-white uppercase tracking-tighter">Link Recovery Documents</p>
                               <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Documentation linked here will be presented to the on-call engineer during an alert.</p>
                            </div>
                            <div className="flex items-center space-x-2 bg-blue-600/10 px-3 py-1 rounded-lg border border-blue-600/20">
                               <List size={12} className="text-blue-400" />
                               <span className="text-[10px] font-black text-blue-400">{formData.recovery_docs?.length || 0} Linked</span>
                            </div>
                         </div>

                         <div className="relative group">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input 
                              value={recoverySearch}
                              onChange={e => setRecoverySearch(e.target.value)}
                              placeholder="Search Knowledge Base for Recovery Procedures..."
                              className="w-full bg-black/60 border border-white/10 rounded-lg pl-11 pr-4 py-4 text-[11px] font-black outline-none focus:border-blue-500 transition-all shadow-2xl"
                            />
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredKnowledge?.map((entry: any) => (
                               <button
                                 key={entry.id}
                                 type="button"
                                 onClick={() => toggleRecoveryDoc(entry.id)}
                                 className={`p-4 rounded-lg border text-left transition-all relative overflow-hidden group/item ${
                                   formData.recovery_docs?.includes(entry.id)
                                     ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                     : 'bg-black/40 border-white/5 hover:border-white/20'
                                 }`}
                               >
                                  {formData.recovery_docs?.includes(entry.id) && (
                                    <div className="absolute top-0 right-0 w-8 h-8 bg-blue-600 flex items-center justify-center rounded-bl-xl shadow-lg">
                                       <Check size={14} className="text-white" strokeWidth={4} />
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2 mb-2">
                                     <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-white/5">{entry.category}</span>
                                     <span className="text-[8px] font-bold text-slate-600 uppercase">#{entry.id}</span>
                                  </div>
                                  <p className={`text-[11px] font-black uppercase tracking-tight leading-tight transition-colors ${formData.recovery_docs?.includes(entry.id) ? 'text-blue-300' : 'text-slate-300'}`}>
                                    {entry.title}
                                  </p>
                               </button>
                            ))}
                            {filteredKnowledge?.length === 0 && (
                               <div className="col-span-2 py-8 text-center text-slate-600 text-[10px] uppercase font-black">No matching knowledge entries found</div>
                            )}
                         </div>
                      </div>
                   </div>
                   
	                   <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 flex items-start space-x-3">
	                      <div className="p-2 bg-white/5 rounded-lg text-slate-500 mt-1">
	                         <AlertCircle size={16} />
	                      </div>
	                      <div className="space-y-1">
	                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational Note</p>
	                         <p className="text-[9px] text-slate-400 font-bold leading-relaxed">Link high-quality recovery documentation to reduce MTTR and give the on-call engineer a clear starting point.</p>
	                      </div>
	                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="border-t border-white/10 px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
           <div className="flex items-center space-x-2 pl-1">
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
           </div>

           <div className="flex flex-wrap items-center justify-end gap-3 pr-1">
              <button onClick={onClose} className="px-6 sm:px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all">Abort</button>
              <button 
                onClick={() => mutation.mutate(formData)}
                disabled={mutation.isPending}
                className="px-8 sm:px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:bg-slate-700 flex items-center space-x-2"
              >
                {mutation.isPending ? <Clock className="animate-spin" size={14} /> : <Check size={14} />}
                <span>{item ? 'Save Monitoring' : 'Add Monitoring'}</span>
              </button>
           </div>
          </div>
        </div>
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
    <div onClick={onClose} className="fixed inset-0 z-[3240] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] p-4 sm:p-10">
      <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-7xl h-full flex flex-col p-6 sm:p-8 rounded-lg border-white/10 shadow-[0_0_90px_rgba(15,23,42,0.35)]">
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
