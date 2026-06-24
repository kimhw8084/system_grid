// VendorsReal.tsx
// MonitoringGrid golden-template clone wired to the Vendor/Contract/Personnel data contract.
// Detail modal main content = full VendorDetails tabbed panel (Overview, Contracts, Personnel)
// transplanted verbatim from Vendor.tsx.

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Activity, Plus, Search, Filter, ExternalLink,
  Trash2, Edit2, Globe, Bell, Info, ChevronRight, X, Check, Save,
  AlertCircle, Clock, Zap, Settings, Briefcase, UserCheck, FileText, User, Users,
  Mail, Monitor, MoreVertical, Download, Copy, ChevronDown, ChevronUp, Layers,
  RefreshCcw, Tag, Sliders, Clipboard, Maximize2, Minimize2, Star, GitCompare,
  Undo2, List, LayoutGrid, Upload, HistoryIcon, Shield, Eye, EyeOff, Phone,
  ShieldCheck, ArrowRight, Server, Key, Terminal, Flag, Check as CheckIcon
} from 'lucide-react'
import { History as HistoryIcon2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { showWorkspaceToast } from './shared/WorkspaceToast'
import {
  computeFloatingPanelRect,
  FLOATING_PANEL_EDGE,
} from './shared/OperationalGridInteractions'
import { apiFetch } from '../api/apiClient'
import { formatAppDate, formatAppTime, formatAppDay, parseAppDate } from '../utils/dateUtils'
import { AppDropdown } from './shared/AppDropdown'
import { ConfigRegistryModal } from './ConfigRegistry'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { VENDOR_WORKSPACE_STANDARD } from './shared/OperationalWorkspace'
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
  WorkspaceSelectField as VendorSelectField,
  WorkspaceSplitView,
  WorkspaceValidationBanner,
  getWorkspaceModalFrameClass,
  getWorkspaceModalShellClass,
  getWorkspaceInputClass,
  useWorkspaceAnchoredLayer,
  useEscapeDismiss,
  useBodyModalFlag,
} from './shared/OperationalWorkspacePrimitives'
import { WorkspaceFlyoutActionCard, WorkspaceFlyoutDropdownEditor } from './shared/WorkspaceFlyout'
import { StatusPill } from './shared/StatusPill'
import { HeaderScopeSwitch, ToolbarButton, ToolbarGroup, ToolbarIconButton, ToolbarSearch } from './shared/LayoutPrimitives'
import { useOperationalGridLayout, usePersistentJsonState, useWorkspaceDismissHandlers, useWorkspaceSessionValue } from './shared/OperationalWorkspaceHooks'
import { WorkspaceCompareShell, WorkspaceDossierShell, WorkspaceHistoryShell } from './shared/WorkspaceModalShells'
import { OperationalImportModal } from './shared/OperationalImportModal'
import { OperationalGridMatrix } from './shared/OperationalGridMatrix'
import { OperationalDisplayPanel, OperationalGridSurface, OperationalSavedViewsPanel, OperationalWorkspaceFrame } from './shared/OperationalWorkspaceShells'
import {
  applyOperationalColumnSizing,
  applyOperationalColumnState,
  autoSizeOperationalColumns,
  getOperationalColumnLayoutSnapshot,
  normalizeOperationalColumnLayout,
  OPERATIONAL_GRID_AUTO_SIZE_STRATEGY,
  sanitizeOperationalColumnLayout,
  sanitizeOperationalFilterModel,
  sanitizeOperationalSortModel,
} from './shared/OperationalGridSizing'
import { WorkspaceShareHeader } from './shared/WorkspaceShareHeader'

// ---------------------------------------------------------------------------
// Storage keys (vendor-namespaced to avoid collisions with monitoring)
// ---------------------------------------------------------------------------
const VENDOR_VIEW_STORAGE_KEY        = 'sysgrid_vendor_views_v1'
const VENDOR_ACTIVE_VIEW_KEY         = 'sysgrid_vendor_active_view_v1'
const VENDOR_FAVORITES_STORAGE_KEY   = 'sysgrid_vendor_favorites_v1'
const VENDOR_UI_STATE_KEY            = 'sysgrid_vendor_ui_state_v1'
const VENDOR_WATCH_STORAGE_KEY       = 'sysgrid_vendor_watch_v1'
const VENDOR_WORKSPACE_PREFERENCE_KEY     = 'vendor_workspace_state_v1'
const VENDOR_WORKSPACE_PREFERENCE_VERSION = 1
const BULK_MENU_MAX_HEIGHT = 480
const VENDOR_FIXED_WIDTH_COLUMN_IDS = new Set([
  'select', 'id', 'favorite', 'watch', 'row_actions',
])
const VENDOR_PERSISTED_COLUMN_IDS = new Set([
  'select', 'id', 'favorite', 'watch',
  'name', 'country', 'primary_personnel_name', 'primary_personnel_email',
  'active_contract_count', 'contract_count', 'earliest_expiry_date',
  'personnel_count', 'created_at', 'updated_at', 'row_actions',
])
const VENDOR_VALID_GROUP_BY = new Set(['raw', 'country'])
// 

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------
const readJsonStorage = <T,>(storageKey: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw == null ? fallback : JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const normalizeVendorIdList = (value: any): number[] => {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(
    value.map((e) => Number(e)).filter((e) => Number.isFinite(e) && e > 0)
  ))
}

const normalizeVendorQuickFilters = (value: any) => ({
  country:         Array.isArray(value?.country)  ? value.country.filter((e: any) => typeof e === 'string' && e.trim())  : [],
  contractStatus:  Array.isArray(value?.contractStatus) ? value.contractStatus.filter((e: any) => typeof e === 'string' && e.trim()) : [],
})

const sanitizeVendorViewConfig = (config: any) => {
  const safeConfig = config && typeof config === 'object' ? config : {}
  return {
    fontSize:          Number.isFinite(safeConfig.fontSize) ? safeConfig.fontSize : 11,
    rowDensity:        Number.isFinite(safeConfig.rowDensity) ? safeConfig.rowDensity : 8,
    hiddenColumns:     Array.isArray(safeConfig.hiddenColumns)
      ? safeConfig.hiddenColumns.filter((e: any) => typeof e === 'string' && VENDOR_PERSISTED_COLUMN_IDS.has(e))
      : [],
    groupBy:           typeof safeConfig.groupBy === 'string' && VENDOR_VALID_GROUP_BY.has(safeConfig.groupBy) ? safeConfig.groupBy : 'raw',
    showFilterBar:     safeConfig.showFilterBar !== false,
    columnLayoutState: sanitizeOperationalColumnLayout(
      Array.isArray(safeConfig.columnLayoutState) ? safeConfig.columnLayoutState : [],
      VENDOR_PERSISTED_COLUMN_IDS, true
    ),
    quickFilter:  typeof safeConfig.quickFilter === 'string' ? safeConfig.quickFilter : '',
    quickFilters: normalizeVendorQuickFilters(safeConfig.quickFilters),
    filterModel:  sanitizeOperationalFilterModel(safeConfig.filterModel, VENDOR_PERSISTED_COLUMN_IDS),
    sortModel:    sanitizeOperationalSortModel(safeConfig.sortModel, VENDOR_PERSISTED_COLUMN_IDS),
  }
}

const normalizeVendorSavedViews = (value: any) => {
  const parsed = Array.isArray(value) ? value : []
  return parsed.filter((view: any) =>
    view && typeof view === 'object' && typeof view.id === 'string' && typeof view.name === 'string'
  ).map((view: any) => ({ ...view, config: sanitizeVendorViewConfig(view?.config) }))
}

const normalizeVendorWorkspaceState = (value: any) => {
  if (!value || typeof value !== 'object') return null
  const uiState = value.uiState && typeof value.uiState === 'object' ? value.uiState : {}
  return {
    version:       VENDOR_WORKSPACE_PREFERENCE_VERSION,
    savedViews:    normalizeVendorSavedViews(value.savedViews),
    activeViewId:  typeof value.activeViewId === 'string' && value.activeViewId.trim() ? value.activeViewId : null,
    favoriteIds:   normalizeVendorIdList(value.favoriteIds),
    watchIds:      normalizeVendorIdList(value.watchIds),
    uiState: {
      fontSize:          Number.isFinite(uiState.fontSize) ? uiState.fontSize : 11,
      rowDensity:        Number.isFinite(uiState.rowDensity) ? uiState.rowDensity : 8,
      hiddenColumns:     Array.isArray(uiState.hiddenColumns)
        ? uiState.hiddenColumns.filter((e: any) => typeof e === 'string' && VENDOR_PERSISTED_COLUMN_IDS.has(e))
        : ['created_at', 'updated_at'],
      quickFilters:      normalizeVendorQuickFilters(uiState.quickFilters),
      groupBy:           typeof uiState.groupBy === 'string' && VENDOR_VALID_GROUP_BY.has(uiState.groupBy) ? uiState.groupBy : 'raw',
      showFilterBar:     uiState.showFilterBar !== false,
      columnLayoutState: sanitizeOperationalColumnLayout(Array.isArray(uiState.columnLayoutState) ? uiState.columnLayoutState : [], VENDOR_PERSISTED_COLUMN_IDS, false),
      lastVisitedAt:     Number.isFinite(uiState.lastVisitedAt) ? uiState.lastVisitedAt : 0,
      searchTerm:        typeof uiState.searchTerm === 'string' ? uiState.searchTerm : '',
    }
  }
}

const readVendorWorkspaceStateFromLocalStorage = () => normalizeVendorWorkspaceState({
  savedViews:    readJsonStorage<any[]>(VENDOR_VIEW_STORAGE_KEY, []),
  activeViewId:  typeof window === 'undefined' ? null : window.localStorage.getItem(VENDOR_ACTIVE_VIEW_KEY),
  favoriteIds:   readJsonStorage<number[]>(VENDOR_FAVORITES_STORAGE_KEY, []),
  watchIds:      readJsonStorage<number[]>(VENDOR_WATCH_STORAGE_KEY, []),
  uiState:       readJsonStorage(VENDOR_UI_STATE_KEY, null),
})

const slugifyViewId = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `view-${Date.now()}`

const readVendorUiState = () => readVendorWorkspaceStateFromLocalStorage()?.uiState ?? null

const getAnchoredFloatingStyle = ({ rect, width, height, zIndex, offset = 4 }: {
  rect: DOMRect; width: number; height: number; zIndex: number; offset?: number
}) => {
  const vW = window.innerWidth
  const vH = window.innerHeight
  let left = rect.right - width
  let top  = rect.bottom + offset
  if (left < FLOATING_PANEL_EDGE) left = rect.left
  if (top + height > vH - FLOATING_PANEL_EDGE) top = rect.top - height - offset
  left = Math.max(FLOATING_PANEL_EDGE, Math.min(left, vW - width - FLOATING_PANEL_EDGE))
  top  = Math.max(FLOATING_PANEL_EDGE, Math.min(top,  vH - height - FLOATING_PANEL_EDGE))
  return { position: 'fixed' as const, top: Math.floor(top), left: Math.floor(left), width, maxHeight: `calc(100vh - ${FLOATING_PANEL_EDGE * 2}px)`, zIndex }
}

const getPointFloatingStyle = ({
  x,
  y,
  width,
  height,
  zIndex,
}: {
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}) => {
  const rect = computeFloatingPanelRect({
    x,
    y,
    preferredWidth: width,
    preferredHeight: height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  })

  return {
    position: 'fixed' as const,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    maxHeight: rect.maxHeight,
    zIndex,
  }
}

const getVendorGroupValue = (item: any, field: string) => {
  if (field === 'country') return item.country || 'Unknown Region'
  return item[field] || 'Unspecified'
}

// ---------------------------------------------------------------------------
// Vendor KPI HUD
// ---------------------------------------------------------------------------
const VendorObservabilityHUD = ({ items }: any) => {
  const stats = useMemo(() => {
    if (!items?.length) return null
    const now = new Date()
    const totalContracts = items.reduce((acc: number, v: any) => acc + (v.contracts?.length || 0), 0)
    const activeContracts = items.reduce((acc: number, v: any) => {
      return acc + (v.contracts || []).filter((c: any) => {
        const start = parseAppDate(c.effective_date)
        const end   = parseAppDate(c.expiry_date)
        return (!start || start <= now) && (!end || end >= now) && c.status === 'Completed'
      }).length
    }, 0)
    const expiring = items.reduce((acc: number, v: any) => {
      const cutoff = new Date(now.getTime() + 30 * 24 * 3600 * 1000)
      return acc + (v.contracts || []).filter((c: any) => {
        const end = parseAppDate(c.expiry_date)
        return end && end > now && end <= cutoff
      }).length
    }, 0)
    const countries = new Set(items.map((v: any) => v.country).filter(Boolean)).size
    return { total: items.length, totalContracts, activeContracts, expiring, countries }
  }, [items])

  if (!stats) return null
  return (
    <div className="grid grid-cols-4 gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="bg-black/40 border border-white/5 p-6 rounded-lg backdrop-blur-xl shadow-xl group hover:border-blue-500/20 transition-all">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover:text-blue-400 transition-colors">Vendor Roster</p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/20">
            <Briefcase size={24} />
          </div>
          <div>
            <h4 className="text-2xl font-black text-white tracking-tighter">{stats.total} Vendors</h4>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Active partners</p>
          </div>
        </div>
      </div>
      <div className="bg-black/40 border border-white/5 p-6 rounded-lg backdrop-blur-xl shadow-xl group hover:border-emerald-500/20 transition-all">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover:text-emerald-400 transition-colors">Active Contracts</p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600/10 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <Check size={24} />
          </div>
          <div>
            <h4 className="text-2xl font-black text-white tracking-tighter">{stats.activeContracts} Active</h4>
            <p className="text-[9px] font-bold text-slate-500 uppercase">{stats.totalContracts} total SLAs</p>
          </div>
        </div>
      </div>
      <div className={`bg-black/40 border border-white/5 p-6 rounded-lg backdrop-blur-xl shadow-xl group hover:border-amber-500/20 transition-all ${stats.expiring > 0 ? 'border-amber-500/20' : ''}`}>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 transition-colors ${stats.expiring > 0 ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-400'}`}>Expiring Soon</p>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${stats.expiring > 0 ? 'bg-amber-600/10 text-amber-400 border-amber-500/20' : 'bg-black/40 text-slate-600 border-white/5'}`}>
            <AlertCircle size={24} className={stats.expiring > 0 ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h4 className="text-2xl font-black text-white tracking-tighter">{stats.expiring} Due</h4>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Within 30 days</p>
          </div>
        </div>
      </div>
      <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-lg backdrop-blur-xl shadow-xl flex items-center justify-between group hover:bg-indigo-600/20 transition-all">
        <div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Coverage</p>
          <h4 className="text-2xl font-black text-white tracking-tighter">{stats.countries} Regions</h4>
        </div>
        <Globe size={28} className="text-indigo-500 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline section header used in the detail panel (kept from Vendor.tsx)
// ---------------------------------------------------------------------------
const SectionHeader = ({ icon: Icon, title, color = 'text-blue-400' }: any) => (
  <div className="flex items-center space-x-3 border-b border-white/5 pb-2 mb-4">
    <Icon size={16} className={color} />
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
  </div>
)

const InfoCard = ({ label, value, icon: Icon }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-lg space-y-1">
    <div className="flex items-center space-x-2 text-slate-500">
      <Icon size={12} />
      <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-xs font-bold text-white uppercase tracking-tight">{value || '---'}</p>
  </div>
)

// ---------------------------------------------------------------------------
// CONTRACT STATUS LABELS
// ---------------------------------------------------------------------------
const CONTRACT_STATUSES = ['Drafted', 'In Review', 'Completed', 'Cancelled', 'Expired']

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
export default function VendorsReal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const idParam = searchParams.get('id')
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)

  // User settings / remote workspace prefs
  const { data: userSettings, isSuccess: hasUserSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => (await apiFetch('/api/v1/settings/user/settings')).json(),
  })
  const remoteWorkspaceState = useMemo(
    () => normalizeVendorWorkspaceState(userSettings?.[VENDOR_WORKSPACE_PREFERENCE_KEY]),
    [userSettings]
  )
  const localWorkspaceState  = useMemo(() => readVendorWorkspaceStateFromLocalStorage(), [])
  const hasStoredFavoriteIds = useMemo(() => typeof window !== 'undefined' && window.localStorage.getItem(VENDOR_FAVORITES_STORAGE_KEY) !== null, [])
  const hasStoredWatchIds    = useMemo(() => typeof window !== 'undefined' && window.localStorage.getItem(VENDOR_WATCH_STORAGE_KEY)    !== null, [])
  const initialWorkspaceState = useMemo(() => {
    if (!remoteWorkspaceState) return localWorkspaceState
    if (!localWorkspaceState)  return remoteWorkspaceState
    return {
      ...remoteWorkspaceState,
      savedViews:    localWorkspaceState.savedViews?.length ? localWorkspaceState.savedViews : remoteWorkspaceState.savedViews,
      activeViewId:  localWorkspaceState.activeViewId ?? remoteWorkspaceState.activeViewId,
      favoriteIds:   hasStoredFavoriteIds ? (localWorkspaceState.favoriteIds ?? []) : remoteWorkspaceState.favoriteIds,
      watchIds:      hasStoredWatchIds    ? (localWorkspaceState.watchIds    ?? []) : remoteWorkspaceState.watchIds,
      uiState: { ...remoteWorkspaceState.uiState, ...localWorkspaceState.uiState },
    }
  }, [hasStoredFavoriteIds, hasStoredWatchIds, localWorkspaceState, remoteWorkspaceState])
  const persistedUiState = initialWorkspaceState?.uiState ?? null

  // --- UI STATE ---
  const [fontSize,        setFontSize]        = useState(persistedUiState?.fontSize    ?? 11)
  const [rowDensity,      setRowDensity]      = useState(persistedUiState?.rowDensity  ?? 8)
  const [showDisplayMenu, setShowDisplayMenu] = useState(false)
  const [showViewsMenu,   setShowViewsMenu]   = useState(false)
  const [showRegistry,    setShowRegistry]    = useState(false)
  const [hiddenColumns,   setHiddenColumns]   = useState<string[]>(persistedUiState?.hiddenColumns ?? ['created_at', 'updated_at'])
  const [showFilterBar,   setShowFilterBar]   = useState<boolean>(persistedUiState?.showFilterBar ?? true)
  const [isIntelligenceExpanded, setIsIntelligenceExpanded] = useState(false)

  // Modals
  const [isFormOpen,       setIsFormOpen]       = useState(false)
  const [editingItem,      setEditingItem]      = useState<any>(null)
  const [detailItem,       setDetailItem]       = useState<any>(null)
  const [showImportModal,  setShowImportModal]  = useState(false)
  const [compareOpen,      setCompareOpen]      = useState(false)
  const [confirmModal,     setConfirmModal]     = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' })
  const [detailDeleteConfirm, setDetailDeleteConfirm] = useState(false)

  // Selection
  const [selectedIds,        setSelectedIds]        = useState<number[]>([])
  const [showBulkMenu,       setShowBulkMenu]       = useState(false)
  const [bulkDeleteConfirm,  setBulkDeleteConfirm]  = useState(false)
  const [rowDeleteConfirmId, setRowDeleteConfirmId] = useState<number | null>(null)
  const [rowActionMenu,      setRowActionMenu]      = useState<{ item: any; point: { x: number; y: number } } | null>(null)
  const [pendingIds,         setPendingIds]         = useState<number[]>([])
  const selectionAnchorRef    = useRef<number | null>(null)

  // Grid state
  const [gridFilterModel, setGridFilterModel] = useState<Record<string, any>>({})
  const [gridSortModel,   setGridSortModel]   = useState<any[]>([{ colId: 'favorite', sort: 'desc' }])
  const [searchTerm,      setSearchTerm]      = useState(persistedUiState?.searchTerm ?? '')
  const [groupBy,         setGroupBy]         = useState<string>(persistedUiState?.groupBy ?? 'raw')
  const [quickFilters,    setQuickFilters]    = useState(persistedUiState?.quickFilters ?? { country: [] as string[], contractStatus: [] as string[] })
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [newViewName,     setNewViewName]     = useState('')
  const [lastVisitedAt]   = useState<number>(() => persistedUiState?.lastVisitedAt ?? 0)

  // Saved views
  const [savedViews, setSavedViews] = usePersistentJsonState<any[]>(VENDOR_VIEW_STORAGE_KEY, () =>
    initialWorkspaceState?.savedViews ?? normalizeVendorSavedViews([])
  )
  const [activeViewId, setActiveViewId] = useWorkspaceSessionValue<string | null>(
    'sysgrid_vendor_session_init', null,
    () => initialWorkspaceState?.activeViewId ?? (typeof window === 'undefined' ? null : window.localStorage.getItem(VENDOR_ACTIVE_VIEW_KEY))
  )
  const [favoriteIds, setFavoriteIds] = usePersistentJsonState<number[]>(VENDOR_FAVORITES_STORAGE_KEY, initialWorkspaceState?.favoriteIds ?? [])
  const [watchIds,    setWatchIds]    = usePersistentJsonState<number[]>(VENDOR_WATCH_STORAGE_KEY,     initialWorkspaceState?.watchIds    ?? [])

  // Refs
  const displayMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const viewsMenuButtonRef   = useRef<HTMLButtonElement | null>(null)
  const bulkMenuButtonRef    = useRef<HTMLButtonElement | null>(null)
  const lastUndoRef          = useRef<any>(null)
  const [displayMenuStyle, setDisplayMenuStyle] = useState<React.CSSProperties>({})
  const [viewsMenuStyle,   setViewsMenuStyle]   = useState<React.CSSProperties>({})
  const [bulkMenuStyle,    setBulkMenuStyle]    = useState<React.CSSProperties>({})
  const autoSizeFrameRef   = useRef<number | null>(null)
  const autoSizeTimeoutRef = useRef<number | null>(null)
  const vendorPreferenceHydratedRef  = useRef(false)
  const vendorPreferenceMigratedRef  = useRef(false)
  const vendorPreferenceSyncRef      = useRef<string | null>(null)
  const vendorPreferenceSyncTimeout  = useRef<number | null>(null)
  const preserveExplicitColumnWidthsRef = useRef(false)

  const {
    columnLayoutState, setColumnLayoutState, setTransientManualColumnWidths,
    preserveExplicitColumnWidths, syncColumnLayoutState, applyColumnLayoutState, handleColumnResized,
  } = useOperationalGridLayout(persistedUiState?.columnLayoutState ?? [], Boolean(activeViewId))

  const groupSelectionsRef = useRef<Record<string, number[]>>({})

  useEffect(() => { preserveExplicitColumnWidthsRef.current = preserveExplicitColumnWidths }, [preserveExplicitColumnWidths])

  const clearPendingAutoSize = useCallback(() => {
    if (autoSizeFrameRef.current !== null)   { window.cancelAnimationFrame(autoSizeFrameRef.current);   autoSizeFrameRef.current   = null }
    if (autoSizeTimeoutRef.current !== null) { window.clearTimeout(autoSizeTimeoutRef.current);          autoSizeTimeoutRef.current = null }
  }, [])

  // Remote preference sync helpers
  const buildVendorWorkspacePreferencePayload = useCallback(() => normalizeVendorWorkspaceState({
    version: VENDOR_WORKSPACE_PREFERENCE_VERSION,
    savedViews, activeViewId, favoriteIds, watchIds,
    uiState: { fontSize, rowDensity, hiddenColumns, quickFilters, groupBy, showFilterBar,
      columnLayoutState: normalizeOperationalColumnLayout(columnLayoutState, false), lastVisitedAt, searchTerm }
  }), [savedViews, activeViewId, favoriteIds, watchIds, fontSize, rowDensity, hiddenColumns, quickFilters, groupBy, showFilterBar, columnLayoutState, lastVisitedAt, searchTerm])

  useEffect(() => clearPendingAutoSize, [clearPendingAutoSize])

  useEffect(() => {
    if (remoteWorkspaceState && !vendorPreferenceHydratedRef.current) {
      vendorPreferenceHydratedRef.current = true
      const payload = initialWorkspaceState ?? normalizeVendorWorkspaceState(remoteWorkspaceState)
      vendorPreferenceSyncRef.current = JSON.stringify(payload)
      setSavedViews(payload?.savedViews ?? [])
      setActiveViewId(payload?.activeViewId ?? null)
      setFavoriteIds(hasStoredFavoriteIds ? (localWorkspaceState?.favoriteIds ?? []) : (payload?.favoriteIds ?? []))
      setWatchIds(hasStoredWatchIds ? (localWorkspaceState?.watchIds ?? []) : (payload?.watchIds ?? []))
      setFontSize(payload?.uiState.fontSize ?? 11)
      setRowDensity(payload?.uiState.rowDensity ?? 8)
      setHiddenColumns(payload?.uiState.hiddenColumns ?? ['created_at', 'updated_at'])
      setShowFilterBar(payload?.uiState.showFilterBar !== false)
      setQuickFilters(payload?.uiState.quickFilters ?? normalizeVendorQuickFilters(null))
      setGroupBy(payload?.uiState.groupBy ?? 'raw')
      setColumnLayoutState(payload?.uiState.columnLayoutState ?? [])
      setSearchTerm(payload?.uiState.searchTerm ?? '')
      return
    }
    if (hasUserSettings && !remoteWorkspaceState && !vendorPreferenceMigratedRef.current) {
      vendorPreferenceMigratedRef.current = true
      const localPayload = buildVendorWorkspacePreferencePayload()
      if (!localPayload) return
      vendorPreferenceSyncRef.current = JSON.stringify(localPayload)
      apiFetch('/api/v1/settings/user/settings', { method: 'PATCH', body: JSON.stringify({ [VENDOR_WORKSPACE_PREFERENCE_KEY]: localPayload }) }).catch(() => {})
    }
  }, [buildVendorWorkspacePreferencePayload, hasStoredFavoriteIds, hasStoredWatchIds, hasUserSettings, initialWorkspaceState, localWorkspaceState, remoteWorkspaceState, setActiveViewId, setColumnLayoutState, setFavoriteIds, setSavedViews, setWatchIds])

  useEffect(() => {
    if (!hasUserSettings) return
    const payload = buildVendorWorkspacePreferencePayload()
    if (!payload) return
    const serialized = JSON.stringify(payload)
    if (vendorPreferenceSyncRef.current === serialized) return
    if (vendorPreferenceSyncTimeout.current !== null) window.clearTimeout(vendorPreferenceSyncTimeout.current)
    vendorPreferenceSyncTimeout.current = window.setTimeout(() => {
      apiFetch('/api/v1/settings/user/settings', { method: 'PATCH', body: JSON.stringify({ [VENDOR_WORKSPACE_PREFERENCE_KEY]: payload }) })
        .then(() => { vendorPreferenceSyncRef.current = serialized }).catch(() => {})
    }, 500)
    return () => { if (vendorPreferenceSyncTimeout.current !== null) { window.clearTimeout(vendorPreferenceSyncTimeout.current); vendorPreferenceSyncTimeout.current = null } }
  }, [buildVendorWorkspacePreferencePayload, hasUserSettings])

  useEffect(() => { setSelectedIds([]); groupSelectionsRef.current = {} }, [groupBy])

  // --- EVENT HANDLERS ---
  const handleSelectionChanged = useCallback((e: any, groupKey = 'raw') => {
    const ids = (e?.api?.getSelectedNodes?.() || []).map((n: any) => n.data?.id).filter(Boolean)
    groupSelectionsRef.current[groupKey] = ids
    setSelectedIds(Array.from(new Set(Object.values(groupSelectionsRef.current).flat())))
  }, [])

  const handleColumnMoved    = useCallback((event: any) => { if (!event.source.includes('drag')) syncColumnLayoutState(event.api) }, [syncColumnLayoutState])
  const handleDragStopped    = useCallback((event: any) => syncColumnLayoutState(event.api), [syncColumnLayoutState])
  const handleColumnPinned   = useCallback((event: any) => syncColumnLayoutState(event.api), [syncColumnLayoutState])
  const handleColumnVisible  = useCallback((event: any) => syncColumnLayoutState(event.api), [syncColumnLayoutState])
  const handleFilterChanged  = useCallback((e: any) => setGridFilterModel(e.api.getFilterModel() || {}), [])
  const handleVendorColumnResized = useCallback((event: any) => {
    const source = event?.source || ''
    const isAutoResizeSource = source === 'autosizeColumns' || source === 'sizeColumnsToFit' || source === 'api' || source === 'flex'
    if (!isAutoResizeSource) { clearPendingAutoSize(); preserveExplicitColumnWidthsRef.current = true; setTransientManualColumnWidths(true) }
    handleColumnResized(event)
  }, [clearPendingAutoSize, handleColumnResized, setTransientManualColumnWidths])
  const handleSortChanged = useCallback((e: any) => {
    setGridSortModel(e.api.getColumnState().filter((col: any) => col.sort).map((col: any) => ({ colId: col.colId, sort: col.sort })))
  }, [])
  const handleRowId = useCallback((params: any) => String(params.data.id), [])

  const openRowActionMenuAtPoint = useCallback((item: any, x: number, y: number) => {
    setRowActionMenu({
      item,
    })
  }, [])

  const handleCellContextMenu = useCallback((e: any) => {
    if (!e?.data) return
    const mouseEvent = e.event as MouseEvent
    mouseEvent?.preventDefault?.()
    openRowActionMenuAtPoint(e.data, mouseEvent.clientX, mouseEvent.clientY)
  }, [openRowActionMenuAtPoint])
  const handleGridReady = useCallback((event: any) => {
    if (typeof window !== 'undefined') (window as any).__DEBUG_VENDORS_GRID_API__ = event.api
    if (columnLayoutState.length > 0) applyOperationalColumnState(event.api, columnLayoutState, preserveExplicitColumnWidths)
  }, [columnLayoutState, preserveExplicitColumnWidths])

  const autoSizeVendorColumns = useCallback(() => {
    if (!gridRef.current?.api || preserveExplicitColumnWidthsRef.current) return
    clearPendingAutoSize()
    const run = () => {
      if (!gridRef.current?.api || preserveExplicitColumnWidthsRef.current) return
      autoSizeOperationalColumns({ api: gridRef.current.api, skipColumnIds: Array.from(VENDOR_FIXED_WIDTH_COLUMN_IDS), onSized: () => { if (!gridRef.current?.api || preserveExplicitColumnWidthsRef.current) return; syncColumnLayoutState(gridRef.current.api, false) } })
    }
    autoSizeFrameRef.current   = window.requestAnimationFrame(() => { autoSizeFrameRef.current = null; run() })
    autoSizeTimeoutRef.current = window.setTimeout(() => { autoSizeTimeoutRef.current = null; run() }, 48)
  }, [clearPendingAutoSize, syncColumnLayoutState])
  const handleGridDataUpdated = useCallback(() => autoSizeVendorColumns(), [autoSizeVendorColumns])
  const getRowClass = useCallback((params: any) => {
    let classes = params.node.rowIndex % 2 === 0 ? 'vendor-grid-row-even' : 'vendor-grid-row-odd'
    if (params.data && pendingIds.includes(params.data.id)) classes += ' row-ghost opacity-40 grayscale pointer-events-none'
    return classes
  }, [pendingIds])

  const shouldIgnoreRowSelection = (target: EventTarget | null) => {
    const el = target as HTMLElement | null
    if (!el) return false
    return Boolean(el.closest('button, a, input, textarea, select, label') || el.closest('.ag-selection-checkbox') || el.closest('.row-action-menu-container'))
  }
  const handleRowClicked = useCallback((event: any) => {
    if (!event?.node || shouldIgnoreRowSelection(event.event?.target)) return
    if (event.data && pendingIds.includes(event.data.id)) return
    const mouseEvent = event.event as MouseEvent | undefined
    const isToggle = Boolean(mouseEvent?.metaKey || mouseEvent?.ctrlKey)
    const isRange  = Boolean(mouseEvent?.shiftKey)
    if (isRange && selectionAnchorRef.current !== null) {
      const currentIndex = event.node.rowIndex
      if (currentIndex == null) return
      const start = Math.min(selectionAnchorRef.current, currentIndex)
      const end   = Math.max(selectionAnchorRef.current, currentIndex)
      event.api.deselectAll()
      event.api.forEachNodeAfterFilterAndSort((node: any) => { if (node.rowIndex >= start && node.rowIndex <= end && !pendingIds.includes(node.data?.id)) node.setSelected(true) })
      return
    }
    if (isToggle) { event.node.setSelected(!event.node.isSelected()); selectionAnchorRef.current = event.node.rowIndex; return }
    event.api.deselectAll(); event.node.setSelected(true); selectionAnchorRef.current = event.node.rowIndex
  }, [pendingIds])
  const handleRowDoubleClicked = useCallback((event: any) => {
    if (!event?.data || shouldIgnoreRowSelection(event.event?.target)) return
    if (pendingIds.includes(event.data.id)) return
    setDetailItem(event.data)
  }, [pendingIds])

  // --- TOOLBAR ACTIONS ---
  const handleExportCSV = () => {
    if (gridRef.current?.api) gridRef.current.api.exportDataAsCsv({ fileName: `SysGrid_Vendors_${new Date().toISOString().split('T')[0]}.csv`, allColumns: false, onlySelected: false })
  }
  const handleCopyToClipboard = () => {
    if (!gridRef.current?.api) return
    const csvData = gridRef.current.api.getDataAsCsv({ allColumns: false, onlySelected: true, suppressQuotes: true })
    if (csvData) navigator.clipboard.writeText(csvData).then(() => showWorkspaceToast('Table data copied to clipboard')).catch(() => showWorkspaceToast('Failed to copy data', { type: 'error' }))
  }
  const positionUtilityWindow = (button: HTMLButtonElement | null, width: number, height: number, zIndex: number) => {
    if (!button) return { position: 'fixed' as const, top: 120, left: Math.max(FLOATING_PANEL_EDGE, window.innerWidth - width - 40), width, maxHeight: `calc(100vh - ${FLOATING_PANEL_EDGE * 2}px)`, zIndex }
    return getAnchoredFloatingStyle({ rect: button.getBoundingClientRect(), width, height, zIndex, offset: 12 })
  }
  const toggleBulkWindow = () => {
    setShowBulkMenu((current) => {
      if (current) return false
      setBulkMenuStyle(positionUtilityWindow(bulkMenuButtonRef.current, 320, BULK_MENU_MAX_HEIGHT, 1105))
      return true
    })
  }
  const toggleFavorite = useCallback((vendorId: number) => {
    const id = Number(vendorId)
    setFavoriteIds((current) => { const n = normalizeVendorIdList(current); return n.includes(id) ? n.filter(i => i !== id) : [...n, id] })
  }, [])
  const toggleWatch = useCallback((vendorId: number) => {
    const id = Number(vendorId)
    setWatchIds((current) => current.includes(id) ? current.filter(i => i !== id) : [...current, id])
  }, [])
  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: any = 'danger') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant })
  }
  const openRowActionMenu = (event: React.MouseEvent, item: any) => {
    event.stopPropagation()
    openRowActionMenuAtPoint(item, event.clientX, event.clientY)
  }

  // --- VIEW MANAGEMENT ---
  const buildCurrentViewConfig = () => sanitizeVendorViewConfig({
    fontSize, rowDensity, hiddenColumns, groupBy, showFilterBar,
    columnLayoutState: getOperationalColumnLayoutSnapshot(gridRef.current?.api, true) || columnLayoutState,
    quickFilter: searchTerm, quickFilters,
    filterModel: gridRef.current?.api?.getFilterModel?.() || gridFilterModel,
    sortModel:   gridRef.current?.api?.getColumnState?.()?.filter((col: any) => col.sort).map((col: any) => ({ colId: col.colId, sort: col.sort })) || gridSortModel,
  })
  const applySavedView = (viewId: string) => {
    const nextView = savedViews.find((view) => view.id === viewId)
    if (!nextView) return
    const config = sanitizeVendorViewConfig(nextView.config)
    setFontSize(config.fontSize ?? 11); setRowDensity(config.rowDensity ?? 8)
    setHiddenColumns(config.hiddenColumns ?? []); setGroupBy(config.groupBy ?? 'raw')
    setShowFilterBar(config.showFilterBar ?? true); setColumnLayoutState(config.columnLayoutState ?? [])
    setTransientManualColumnWidths(false); setSearchTerm(config.quickFilter ?? '')
    setQuickFilters(config.quickFilters ?? { country: [] as string[], contractStatus: [] as string[] })
    setGridFilterModel(config.filterModel ?? {}); setGridSortModel((config.sortModel?.length > 0) ? config.sortModel : [{ colId: 'favorite', sort: 'desc' }])
    setActiveViewId(viewId)
    if (typeof window !== 'undefined') window.localStorage.setItem(VENDOR_ACTIVE_VIEW_KEY, viewId)
    requestAnimationFrame(() => {
      if (!gridRef.current?.api) return
      if (Array.isArray(config.columnLayoutState) && config.columnLayoutState.length) applyOperationalColumnState(gridRef.current.api, config.columnLayoutState, true)
      else applyColumnLayoutState(gridRef.current.api)
      gridRef.current.api.setFilterModel(config.filterModel ?? {})
    })
  }
  const saveCurrentToView = (viewId: string) => {
    const nextViews = savedViews.map((view) => view.id === viewId ? { ...view, config: buildCurrentViewConfig() } : view)
    setSavedViews(nextViews); setActiveViewId(viewId)
    if (typeof window !== 'undefined') { window.localStorage.setItem(VENDOR_VIEW_STORAGE_KEY, JSON.stringify(nextViews)); window.localStorage.setItem(VENDOR_ACTIVE_VIEW_KEY, viewId) }
    showWorkspaceToast(`Saved current table to ${nextViews.find(v => v.id === viewId)?.name}`)
  }
  const createViewFromCurrent = () => {
    const trimmed = newViewName.trim()
    if (!trimmed) { showWorkspaceToast('Enter a name for the new view', { type: 'error' }); return }
    let nextId = slugifyViewId(trimmed); let suffix = 2
    while (savedViews.some((view) => view.id === nextId)) nextId = `${slugifyViewId(trimmed)}-${suffix++}`
    const nextViews = [...savedViews, { id: nextId, name: trimmed, config: buildCurrentViewConfig() }]
    setSavedViews(nextViews); setActiveViewId(nextId); setNewViewName('')
    if (typeof window !== 'undefined') { window.localStorage.setItem(VENDOR_VIEW_STORAGE_KEY, JSON.stringify(nextViews)); window.localStorage.setItem(VENDOR_ACTIVE_VIEW_KEY, nextId) }
    showWorkspaceToast(`Saved new view ${trimmed}`)
  }
  const applySystemDefault = () => {
    setActiveViewId(null); setTransientManualColumnWidths(false)
    if (typeof window !== 'undefined') window.localStorage.removeItem(VENDOR_ACTIVE_VIEW_KEY)
    setFontSize(11); setRowDensity(8); setHiddenColumns([]); setGroupBy('raw'); setShowFilterBar(true)
    setColumnLayoutState([]); setSearchTerm(''); setQuickFilters({ country: [] as string[], contractStatus: [] as string[] })
    setGridSortModel([{ colId: 'favorite', sort: 'desc' }])
    if (gridRef.current?.api) { gridRef.current.api.setFilterModel({}); gridRef.current.api.applyColumnState({ defaultState: { sort: null, pinned: null, hide: false }, applyOrder: true }) }
    showWorkspaceToast('Restored system default view')
  }
  const deleteView = (viewId: string) => {
    const view = savedViews.find((v) => v.id === viewId)
    if (!view) return
    openConfirm(`Delete View: ${view.name}?`, 'Remove this saved layout?', () => {
      const nextViews = savedViews.filter((v) => v.id !== viewId)
      setSavedViews(nextViews)
      if (activeViewId === viewId) { setActiveViewId(null); if (typeof window !== 'undefined') window.localStorage.removeItem(VENDOR_ACTIVE_VIEW_KEY) }
      if (typeof window !== 'undefined') window.localStorage.setItem(VENDOR_VIEW_STORAGE_KEY, JSON.stringify(nextViews))
      showWorkspaceToast(`Deleted view ${view.name}`)
    })
  }
  const dismissWorkspaceMenus = useCallback(() => { setShowBulkMenu(false); setBulkDeleteConfirm(false); setShowDisplayMenu(false); setShowViewsMenu(false); setRowActionMenu(null); setRowDeleteConfirmId(null) }, [])
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
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest('.ag-root-wrapper') || target.closest('.row-action-menu-container')) event.preventDefault()
    }
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  useEffect(() => {
    const update = () => {
      if (showDisplayMenu && displayMenuButtonRef.current) setDisplayMenuStyle(getAnchoredFloatingStyle({ rect: displayMenuButtonRef.current.getBoundingClientRect(), width: 320, height: 420, zIndex: 1100, offset: 12 }))
      if (showViewsMenu   && viewsMenuButtonRef.current)   setViewsMenuStyle(  getAnchoredFloatingStyle({ rect: viewsMenuButtonRef.current.getBoundingClientRect(),   width: 380, height: 460, zIndex: 1100, offset: 12 }))
      if (showBulkMenu    && bulkMenuButtonRef.current)    setBulkMenuStyle(positionUtilityWindow(bulkMenuButtonRef.current, 320, BULK_MENU_MAX_HEIGHT, 1105))
    }
    update()
    if (showDisplayMenu || showBulkMenu || showViewsMenu) {
      window.addEventListener('resize', update); window.addEventListener('scroll', update, true)
      return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
    }
  }, [showBulkMenu, showDisplayMenu, showViewsMenu])

  // --- DATA QUERIES ---
  const { data: allVendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => (await apiFetch('/api/v1/vendors/')).json()
  })
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json()
  })
  const { data: systems } = useQuery({
    queryKey: ['settings', 'LogicalSystem'],
    queryFn: async () => (await apiFetch('/api/v1/settings/options?category=LogicalSystem')).json()
  })

  // Processed rows with computed aggregate fields for grid display
  const processedVendors = useMemo(() => {
    if (!allVendors || !Array.isArray(allVendors)) return []
    return allVendors.map((v: any) => {
      const contracts = v.contracts || []
      const personnel = v.personnel || []
      const primary   = personnel.find((p: any) => p.id === v.primary_personnel_id)
      const now = new Date()
      const activeContracts = contracts.filter((c: any) => {
        const start = parseAppDate(c.effective_date)
        const end   = parseAppDate(c.expiry_date)
        return (!start || start <= now) && (!end || end >= now) && c.status === 'Completed'
      })
      const expiryDates = contracts.map((c: any) => parseAppDate(c.expiry_date)).filter(Boolean).map((d: any) => d!.getTime())
      return {
        ...v,
        primary_personnel_name:  primary?.name         || null,
        primary_personnel_email: primary?.company_email || null,
        primary_personnel_phone: primary?.phone         || null,
        active_contract_count:   activeContracts.length,
        contract_count:          contracts.length,
        earliest_expiry_date:    expiryDates.length > 0 ? new Date(Math.min(...expiryDates)).toISOString() : null,
        personnel_count:         personnel.length,
      }
    })
  }, [allVendors])

  const lifecycleCounts = useMemo(() => {
    if (!Array.isArray(processedVendors)) return { active: 0 }
    return { active: processedVendors.filter((v: any) => !v.is_deleted).length }
  }, [processedVendors])

  const items = useMemo(() => processedVendors.filter((v: any) => !v.is_deleted), [processedVendors])

  const countryOptions = useMemo(() => {
    const vals = Array.from(new Set((items || []).map((v: any) => v.country).filter(Boolean)))
    return vals.sort().map((value) => ({ value, label: value }))
  }, [items])

  // Filtering & display
  const displayedItems = useMemo(() => {
    return items.filter((item: any) => {
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase()
        const hay = [String(item.id || ''), item.name, item.country, item.primary_personnel_name, item.primary_personnel_email].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (quickFilters.country.length        > 0 && !quickFilters.country.includes(item.country)) return false
      if (quickFilters.contractStatus.length > 0) {
        const now = new Date()
        const hasMatch = (item.contracts || []).some((c: any) => {
          const end = parseAppDate(c.expiry_date)
          if (quickFilters.contractStatus.includes('active')) {
            const start = parseAppDate(c.effective_date)
            if ((!start || start <= now) && (!end || end >= now) && c.status === 'Completed') return true
          }
          if (quickFilters.contractStatus.includes('expiring')) {
            const cutoff = new Date(now.getTime() + 30 * 24 * 3600 * 1000)
            if (end && end > now && end <= cutoff) return true
          }
          if (quickFilters.contractStatus.includes('expired')) {
            if (end && end < now) return true
          }
          return false
        })
        if (!hasMatch) return false
      }
      return true
    })
  }, [items, quickFilters, searchTerm])

  const sortedItemsForGrouped = useMemo(() => {
    return [...displayedItems].sort((a: any, b: any) => {
      const aFav = favoriteIds.includes(a.id) ? 1 : 0
      const bFav = favoriteIds.includes(b.id) ? 1 : 0
      if (aFav !== bFav) return bFav - aFav
      return a.name?.localeCompare(b.name) ?? 0
    })
  }, [displayedItems, favoriteIds])

  const groupedSections = useMemo(() => {
    if (groupBy === 'raw') return []
    const sections = sortedItemsForGrouped.reduce((acc: Array<{ key: string; label: string; items: any[] }>, item: any) => {
      const label = String(getVendorGroupValue(item, groupBy))
      const existing = acc.find((s) => s.key === label)
      if (existing) { existing.items.push(item) } else { acc.push({ key: label, label, items: [item] }) }
      return acc
    }, [])
    return sections.sort((a, b) => a.label.localeCompare(b.label))
  }, [sortedItemsForGrouped, groupBy])

  useEffect(() => {
    if (groupBy === 'raw') return
    setCollapsedGroups((current) => {
      const next = { ...current }
      groupedSections.forEach((section) => { if (!(section.key in next)) next[section.key] = false })
      Object.keys(next).forEach((key) => { if (!groupedSections.some((s) => s.key === key)) delete next[key] })
      return next
    })
  }, [groupBy, groupedSections])

  const isRecentChange = useCallback((item: any) => {
    const changedAt = item?.updated_at || item?.created_at
    if (!changedAt || !lastVisitedAt) return false
    return (parseAppDate(changedAt)?.getTime() || 0) > lastVisitedAt
  }, [lastVisitedAt])

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = []
    if (searchTerm.trim()) chips.push({ id: 'search', label: `Search: ${searchTerm.trim()}`, onRemove: () => setSearchTerm('') })
    Object.entries(gridFilterModel || {}).forEach(([field, model]) => {
      if (!model) return
      const labelValue = Array.isArray((model as any).values) ? (model as any).values.join(', ') : (model as any).filter || 'Active'
      chips.push({ id: `filter-${field}`, label: `${field}: ${labelValue}`, onRemove: () => {
        if (!gridRef.current?.api) return
        const next = { ...(gridRef.current.api.getFilterModel() || {}) }; delete next[field]
        gridRef.current.api.setFilterModel(next); setGridFilterModel(next)
      }})
    })
    Object.entries(quickFilters).forEach(([field, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return
      const labelValue = Array.isArray(value) ? value.join(', ') : value
      chips.push({ id: `quick-${field}`, label: `${field}: ${labelValue}`, onRemove: () => setQuickFilters((current) => ({ ...current, [field]: Array.isArray(value) ? [] : '' })) })
    })
    return chips
  }, [gridFilterModel, quickFilters, searchTerm])

  const selectedItems = useMemo(() => displayedItems.filter((item: any) => selectedIds.includes(item.id)), [displayedItems, selectedIds])

  useEffect(() => { if (!displayedItems.length) return; const t = window.setTimeout(() => autoSizeVendorColumns(), 0); return () => window.clearTimeout(t) }, [autoSizeVendorColumns, displayedItems, fontSize, hiddenColumns, isIntelligenceExpanded])
  useEffect(() => { selectionAnchorRef.current = null }, [items])
  useEffect(() => { if (selectedIds.length === 0) setShowBulkMenu(false) }, [selectedIds.length])
  useEffect(() => { if (gridRef.current?.api) gridRef.current.api.refreshCells({ columns: ['favorite', 'watch'], force: true }) }, [favoriteIds, watchIds])
  useEffect(() => { if (!activeViewId || !gridRef.current?.api) return; applySavedView(activeViewId) }, [activeViewId, items.length])
  useEffect(() => {
    if (!gridRef.current?.api || !selectedIds.length) return
    gridRef.current.api.forEachNode((node: any) => { node.setSelected(selectedIds.includes(node.data?.id)) })
  }, [displayedItems, selectedIds])
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(VENDOR_UI_STATE_KEY, JSON.stringify({ fontSize, rowDensity, hiddenColumns, quickFilters, groupBy, showFilterBar, columnLayoutState: normalizeOperationalColumnLayout(columnLayoutState, false), lastVisitedAt, searchTerm }))
  }, [columnLayoutState, fontSize, groupBy, hiddenColumns, lastVisitedAt, quickFilters, rowDensity, searchTerm, showFilterBar])
  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return
      const current = readVendorUiState() || {}
      window.localStorage.setItem(VENDOR_UI_STATE_KEY, JSON.stringify({ ...current, lastVisitedAt: Date.now() }))
    }
  }, [])

  // Update detailItem if vendor data refreshes in background
  useEffect(() => {
    if (detailItem && processedVendors) {
      const updated = processedVendors.find((v: any) => v.id === detailItem.id)
      if (updated) setDetailItem(updated)
    }
  }, [processedVendors, detailItem?.id])

  // Deep-link support
  useEffect(() => {
    if (!idParam || !Array.isArray(processedVendors)) return
    const target = processedVendors.find((v: any) => String(v.id) === idParam)
    if (!target) {
      setDetailItem((current: any) => (current && String(current.id) === idParam ? null : current))
      const nextParams = new URLSearchParams(searchParams); nextParams.delete('id')
      navigate({ search: nextParams.toString() ? `?${nextParams.toString()}` : '' }, { replace: true })
      return
    }
    setDetailItem(target)
  }, [processedVendors, idParam, navigate, searchParams])

  // --- BULK MUTATION ---
  const bulkMutation = useMutation({
    onMutate: ({ ids: overrideIds }: any) => { const ids = overrideIds ?? selectedIds; setPendingIds(prev => [...new Set([...prev, ...ids])]) },
    onSettled: (_: any, __: any, variables: any) => { const ids = variables.ids ?? selectedIds; setPendingIds(prev => prev.filter(id => !ids.includes(id))) },
    mutationFn: async ({ action, ids: overrideIds }: any) => {
      const idsToUse = overrideIds ?? selectedIds
      const res = await apiFetch('/api/v1/vendors/bulk-action', { method: 'POST', body: JSON.stringify({ ids: idsToUse, action, target: 'vendor' }) })
      if (!res.ok) throw new Error(await res.text())
      return { result: await res.json(), action, idsToUse }
    },
    onSuccess: ({ action, idsToUse }: any) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setShowBulkMenu(false)
      if (action === 'delete') lastUndoRef.current = { action: 'restore', ids: idsToUse }
      else if (action === 'restore') lastUndoRef.current = { action: 'delete', ids: idsToUse }
      else lastUndoRef.current = null
      if (lastUndoRef.current) {
        showWorkspaceToast(`Updated ${idsToUse.length} vendor(s)`, { onRevert: async () => {
          const undo = lastUndoRef.current; if (!undo) return
          await apiFetch('/api/v1/vendors/bulk-action', { method: 'POST', body: JSON.stringify({ ids: undo.ids, action: undo.action, target: 'vendor' }) })
          lastUndoRef.current = null; queryClient.invalidateQueries({ queryKey: ['vendors'] })
          showWorkspaceToast('Reverted vendor operation', { type: 'success' })
        }})
      } else {
        showWorkspaceToast(`Updated ${idsToUse.length} vendor(s)`, { type: 'success' })
      }
    },
    onError: (e: any) => showWorkspaceToast(`Operation failed: ${e.message}`, { type: 'error' })
  })

  // --- ROW PRIMARY ACTIONS ---
  const renderPrimaryRowActions = (item: any) => {
    const isPending = pendingIds.includes(item.id)
    return (
      <div className={`flex items-center justify-end gap-1.5 pr-2 ${isPending ? 'opacity-20 grayscale pointer-events-none' : ''}`}>
        <button type="button" onClick={(e) => { e.stopPropagation(); setDetailItem(item) }} title="Open details" className="rounded-lg p-1 text-blue-400 transition-all hover:bg-blue-400/10 active:scale-90">
          <Maximize2 size={13} />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsFormOpen(true) }} title="Edit vendor" className="rounded-lg p-1 text-emerald-400 transition-all hover:bg-emerald-400/10 active:scale-90">
          <Edit2 size={13} />
        </button>
        <button type="button" onClick={(e: any) => openRowActionMenu(e, item)} title="More actions" className="row-action-trigger row-action-menu-container rounded-lg p-1 text-slate-400 transition-all hover:bg-slate-400/10 hover:text-white active:scale-90">
          <MoreVertical size={13} />
        </button>
      </div>
    )
  }

  // --- COLUMN DEFINITIONS ---
  const columnDefs = useMemo(() => {
    const layoutById = new Map(columnLayoutState.map((col: any) => [col.colId, col]))
    const lockFixed = (column: any, layout?: any) => {
      const colId = column.colId || column.field
      const lockedWidth = layout?.width ?? column.width ?? column.initialWidth
      if (!VENDOR_FIXED_WIDTH_COLUMN_IDS.has(colId) || lockedWidth == null) return column
      return { ...column, width: lockedWidth, initialWidth: lockedWidth, minWidth: lockedWidth, maxWidth: lockedWidth, flex: undefined, initialFlex: undefined }
    }
    const defs = [
      { colId: 'select', headerName: '', width: 48, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left', cellClass: 'flex items-center justify-center border-r border-white/5', headerClass: 'flex items-center justify-center border-r border-white/5', suppressSizeToFit: true, sortable: false, filter: false, lockVisible: true },
      { colId: 'id', field: 'id', headerName: 'ID', width: 80, pinned: 'left', cellClass: 'text-center font-bold text-slate-500 border-r border-white/5 flex items-center justify-center', headerClass: 'text-center border-r border-white/5', filter: 'agNumberColumnFilter', lockVisible: true },
      { colId: 'favorite', headerName: 'Fav', field: 'favorite', width: 70, pinned: 'left', cellClass: 'text-center border-r border-white/5 flex items-center justify-center', headerClass: 'text-center border-r border-white/5', sortable: true, filter: false, lockVisible: true,
        valueGetter: (p: any) => p.context?.favoriteIds?.includes(p.data?.id) ? 1 : 0,
        cellRenderer: (p: any) => {
          const isFav = p.context?.favoriteIds?.includes(p.data?.id)
          return (<div className="flex h-full w-full items-center justify-center"><button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.data.id) }} title={isFav ? 'Unpin vendor' : 'Pin vendor'} className={`rounded-lg p-1 transition-all flex items-center justify-center ${isFav ? 'text-amber-300' : 'text-slate-600 hover:text-slate-300'}`}><Star size={15} className={isFav ? 'fill-current' : ''} /></button></div>)
        }
      },
      { colId: 'watch', headerName: 'Watch', field: 'watch', width: 80, pinned: 'left', cellClass: 'text-center border-r border-white/5 flex items-center justify-center', headerClass: 'text-center border-r border-white/5', sortable: false, filter: false, lockVisible: true, hide: !isIntelligenceExpanded,
        cellRenderer: (p: any) => {
          const isWatched = p.context?.watchIds?.includes(p.data?.id)
          return (<div className="flex h-full w-full items-center justify-center"><button onClick={(e) => { e.stopPropagation(); toggleWatch(p.data.id) }} title={isWatched ? 'Unwatch' : 'Watch'} className={`rounded-lg p-1 transition-all flex items-center justify-center ${isWatched ? 'text-sky-300' : 'text-slate-600 hover:text-slate-300'}`}><Eye size={15} className={isWatched ? 'fill-current' : ''} /></button></div>)
        }
      },
      { field: 'name', headerName: 'Vendor Name', width: 200, filter: true, pinned: 'left', cellClass: 'font-bold text-left tracking-tight flex items-center', headerClass: 'text-left', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }} className="block min-w-0 truncate whitespace-nowrap overflow-hidden text-ellipsis uppercase">{p.value}</span>, hide: hiddenColumns.includes('name') },
      { field: 'country', headerName: 'Country', width: 130, filter: true, cellClass: 'text-center font-bold flex items-center justify-center', headerClass: 'text-center', cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }} className="font-bold">{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold">N/A</span>, hide: hiddenColumns.includes('country') },
      { field: 'primary_personnel_name', headerName: 'Primary Contact', width: 180, filter: true, cellClass: 'text-center flex items-center justify-center', headerClass: 'text-center', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }} className="font-bold">{p.value || '---'}</span>, hide: hiddenColumns.includes('primary_personnel_name') },
      { field: 'primary_personnel_email', headerName: 'Email', width: 200, filter: true, cellClass: 'font-mono text-blue-400 flex items-center', headerClass: 'text-center', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || '---'}</span>, hide: hiddenColumns.includes('primary_personnel_email') },
      { field: 'active_contract_count', headerName: 'Active Contracts', width: 140, filter: 'agNumberColumnFilter', cellClass: 'text-center font-bold text-emerald-400 flex items-center justify-center', headerClass: 'text-center', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value ?? 0}</span>, hide: hiddenColumns.includes('active_contract_count') },
      { field: 'contract_count', headerName: 'Total Contracts', width: 130, filter: 'agNumberColumnFilter', cellClass: 'text-center font-bold flex items-center justify-center', headerClass: 'text-center', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value ?? 0}</span>, hide: hiddenColumns.includes('contract_count') },
      { field: 'earliest_expiry_date', headerName: 'Earliest Expiry', width: 140, filter: 'agDateColumnFilter', cellClass: 'text-center flex items-center justify-center', headerClass: 'text-center',
        cellRenderer: (p: any) => {
          if (!p.value) return <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold">—</span>
          const date = parseAppDate(p.value)
          const isExpired  = date && date < new Date()
          const isExpiring = !isExpired && date && date < new Date(Date.now() + 30 * 24 * 3600 * 1000)
          return <span style={{ fontSize: `${fontSize}px` }} className={`font-bold ${isExpired ? 'text-rose-500' : isExpiring ? 'text-amber-400' : 'text-emerald-500'}`}>{formatAppDay(p.value)}</span>
        },
        hide: hiddenColumns.includes('earliest_expiry_date')
      },
      { field: 'personnel_count', headerName: 'Personnel', width: 110, filter: 'agNumberColumnFilter', cellClass: 'text-center font-bold flex items-center justify-center', headerClass: 'text-center', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value ?? 0}</span>, hide: hiddenColumns.includes('personnel_count') },
      { field: 'created_at', headerName: 'Created', width: 170, filter: 'agDateColumnFilter', cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center', headerClass: 'text-center', cellRenderer: (p: any) => p.value ? <div className="flex items-center gap-2"><Clock size={12} className="opacity-40" /><span style={{ fontSize: `${fontSize}px` }}>{formatAppDate(p.value)}</span></div> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500">—</span>, hide: hiddenColumns.includes('created_at') },
      { field: 'updated_at', headerName: 'Updated', width: 170, filter: 'agDateColumnFilter', cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center', headerClass: 'text-center', cellRenderer: (p: any) => p.value ? <div className="flex items-center gap-2"><Clock size={12} className="opacity-40" /><span style={{ fontSize: `${fontSize}px` }}>{formatAppDate(p.value)}</span></div> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500">—</span>, hide: hiddenColumns.includes('updated_at') },
      { colId: 'row_actions', headerName: 'Action', width: 180, pinned: 'right', cellClass: 'text-right pr-3 flex items-center justify-end', headerClass: 'text-center', sortable: false, filter: false, cellRenderer: (p: any) => p.data ? renderPrimaryRowActions(p.data) : null, lockVisible: true },
    ]

    const mergedDefs = defs.map((col: any) => {
      const colId  = col.colId || col.field
      const layout = layoutById.get(colId)
      return lockFixed(applyOperationalColumnSizing(col, layout, preserveExplicitColumnWidths), layout)
    })
    if (columnLayoutState.length > 0) {
      const orderMap = new Map(columnLayoutState.map((col: any, index: number) => [col.colId, index]))
      return [...mergedDefs].sort((a: any, b: any) => (orderMap.get(a.colId || a.field) ?? 1000) - (orderMap.get(b.colId || b.field) ?? 1000))
    }
    return mergedDefs
  }, [fontSize, hiddenColumns, columnLayoutState, isIntelligenceExpanded, preserveExplicitColumnWidths]) as any

  const gridContext  = useMemo(() => ({ favoriteIds, watchIds }), [favoriteIds, watchIds])
  const autoSizeStrategy = useMemo(() => (preserveExplicitColumnWidths ? undefined : OPERATIONAL_GRID_AUTO_SIZE_STRATEGY), [preserveExplicitColumnWidths])

  const groupOptions = [
    { value: 'raw',     label: 'Raw Rows' },
    { value: 'country', label: 'Country / Region' },
  ]

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <OperationalWorkspaceFrame
      header={{
        eyebrow: 'Resources',
        title: (
          <div className="flex items-center gap-3">
            <Globe className="text-blue-500" />
            <span>Vendors</span>
          </div>
        ),
        subtitle: 'Vendor capability, contract intelligence & personnel directory',
        actions: (
          <HeaderScopeSwitch
            label="Registry Scope"
            summary={`${lifecycleCounts.active} active partners`}
            value="active"
            onChange={() => {}}
            options={[{ label: 'Active', value: 'active' }]}
          />
        ),
      }}
      commandBar={{
        left: (
          <>
            <ToolbarSearch value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search vendors..." />
            <ToolbarGroup>
              <div className="views-menu-container">
                <ToolbarButton active={showViewsMenu} onClick={() => setShowViewsMenu(!showViewsMenu)} ref={viewsMenuButtonRef as any}>
                  <span className="flex items-center gap-2"><LayoutGrid size={14} />Views</span>
                </ToolbarButton>
              </div>
              <div className="display-menu-container">
                <ToolbarButton active={showDisplayMenu} onClick={() => setShowDisplayMenu(!showDisplayMenu)} ref={displayMenuButtonRef as any}>
                  <span className="flex items-center gap-2"><Sliders size={14} />Display</span>
                </ToolbarButton>
              </div>
              <ToolbarIconButton onClick={handleExportCSV} title="Export CSV"><FileText size={16} /></ToolbarIconButton>
              <ToolbarIconButton onClick={handleCopyToClipboard} title="Copy to clipboard"><Clipboard size={16} /></ToolbarIconButton>
              <ToolbarIconButton onClick={() => setShowRegistry(true)} title="Registry configuration"><Settings size={16} /></ToolbarIconButton>
            </ToolbarGroup>
            <ToolbarGroup>
              <ToolbarButton active={showFilterBar} onClick={() => setShowFilterBar((c) => !c)} title={showFilterBar ? 'Hide filters' : 'Show filters'}>
                <span className="flex items-center gap-2">{showFilterBar ? <EyeOff size={14} /> : <Eye size={14} />}Filters</span>
              </ToolbarButton>
              <ToolbarButton active={isIntelligenceExpanded} onClick={() => setIsIntelligenceExpanded(!isIntelligenceExpanded)} title={isIntelligenceExpanded ? 'Hide activity columns' : 'Show activity columns'}>
                <span className="flex items-center gap-2">{isIntelligenceExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}Activity</span>
              </ToolbarButton>
            </ToolbarGroup>
          </>
        ),
        secondary: showFilterBar ? (
          <div className="grid w-full gap-3 md:grid-cols-2">
            <AppDropdown multi value={quickFilters.country} onChange={(val) => setQuickFilters((c) => ({ ...c, country: val }))} options={countryOptions} label="Country Filter" placeholder="All regions" />
            <AppDropdown multi value={quickFilters.contractStatus} onChange={(val) => setQuickFilters((c) => ({ ...c, contractStatus: val }))} options={[{ value: 'active', label: 'Active' }, { value: 'expiring', label: 'Expiring (30d)' }, { value: 'expired', label: 'Expired' }]} label="Contract Status" placeholder="All statuses" />
          </div>
        ) : null,
        right: (
          <>
            <ToolbarButton onClick={toggleBulkWindow} disabled={selectedIds.length === 0} active={showBulkMenu} title="Bulk actions" className="bulk-menu-trigger" ref={bulkMenuButtonRef as any}>
              <span className="flex items-center gap-2"><Zap size={14} />Bulk Actions</span>
            </ToolbarButton>
            <ToolbarButton onClick={() => { setEditingItem(null); setIsFormOpen(true) }} variant="primary" className="px-6 py-2">
              + Add Vendor
            </ToolbarButton>
          </>
        ),
        filterChips: [
          ...activeFilterChips,
          ...(activeFilterChips.length > 0 ? [{ id: 'clear-all', label: 'Clear All', onRemove: () => { setSearchTerm(''); setGridFilterModel({}); setQuickFilters({ country: [] as string[], contractStatus: [] as string[] }); gridRef.current?.api?.setFilterModel({}) } }] : []),
        ],
      }}
    >

      {typeof document !== 'undefined' && createPortal(
        <>
          <OperationalDisplayPanel
            isOpen={showDisplayMenu} panelStyle={displayMenuStyle} onClose={() => setShowDisplayMenu(false)}
            fontSize={fontSize} onFontSizeChange={setFontSize} rowDensity={rowDensity} onRowDensityChange={setRowDensity}
            groupBy={groupBy} onGroupByChange={setGroupBy} groupOptions={groupOptions}
            columns={columnDefs} hiddenColumns={hiddenColumns}
            onToggleColumn={(field) => { if (hiddenColumns.includes(field)) setHiddenColumns(hiddenColumns.filter(e => e !== field)); else setHiddenColumns([...hiddenColumns, field]) }}
          />

          <OperationalSavedViewsPanel
            isOpen={showViewsMenu} panelStyle={viewsMenuStyle} entityLabel="Vendors" onClose={() => setShowViewsMenu(false)}
            activeViewId={activeViewId} currentViewName={activeViewId ? savedViews.find(v => v.id === activeViewId)?.name || 'Unsaved working view' : 'Unsaved working view'}
            newViewName={newViewName} onNewViewNameChange={setNewViewName} onCreateView={createViewFromCurrent}
            onApplySystemDefault={applySystemDefault} savedViews={savedViews} defaultViewIds={new Set()}
            onApplyView={applySavedView} onOverwriteView={saveCurrentToView} onDeleteView={deleteView}
            describeView={(view: any) => view.config?.groupBy && view.config.groupBy !== 'raw' ? `Grouped by ${groupOptions.find(o => o.value === view.config.groupBy)?.label || view.config.groupBy}` : 'Raw vendor table'}
          />

          <AnimatePresence>
            {showBulkMenu && !!bulkMenuStyle.top && (
              <motion.div key="vendor-bulk-menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} style={bulkMenuStyle} className="bulk-menu-container">
                <WorkspaceFloatingPanel kind="context" className="max-h-[480px] overflow-y-auto custom-scrollbar p-3">
                  <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                    <p className="text-[10px] font-semibold text-slate-400">Bulk actions</p>
                    <p className="pt-1 text-[12px] font-semibold text-slate-100">{selectedIds.length} vendors selected</p>
                  </div>
                  <div className="mx-1 my-3 h-px bg-slate-800" />
                  <button
                    onClick={() => { if (!bulkDeleteConfirm) { setBulkDeleteConfirm(true); return } bulkMutation.mutate({ action: 'delete' }) }}
                    onMouseLeave={() => setBulkDeleteConfirm(false)}
                    disabled={bulkMutation.isPending}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${bulkDeleteConfirm ? 'border-rose-500 bg-rose-600 animate-pulse' : 'border-rose-900/70 bg-rose-950/70 hover:bg-rose-950'} disabled:opacity-50`}
                  >
                    <p className={`text-[10px] font-semibold ${bulkDeleteConfirm ? 'text-white' : 'text-rose-300'}`}>
                      {bulkMutation.isPending ? <Activity size={10} className="inline animate-spin" /> : (bulkDeleteConfirm ? 'Confirm Archive?' : 'Archive Selection')}
                    </p>
                  </button>
                </WorkspaceFloatingPanel>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {rowActionMenu && (
              <motion.div key="vendor-row-action-menu" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} style={rowActionMenu.style} className="row-action-menu-container">
                <WorkspaceFloatingPanel kind="context" className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold text-slate-400">Row actions</p>
                      <p className="pt-1 text-[11px] font-semibold text-slate-100">{rowActionMenu.item.name}</p>
                      <p className="text-[9px] text-slate-500">{rowActionMenu.item.country || 'No region'}</p>
                    </div>
                    <button onClick={() => setRowActionMenu(null)} className="ml-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition-all hover:bg-white/[0.08] hover:text-white" aria-label="Close row actions"><X size={13} /></button>
                  </div>
                  <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-2.5 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-2 px-2 pb-3 border-b border-slate-800 mb-2">
                      <button onClick={() => { setDetailItem(rowActionMenu.item); setRowActionMenu(null) }} className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-blue-400 transition-all hover:border-blue-500/30 hover:bg-blue-600/10 active:scale-95"><Maximize2 size={14} />Details</button>
                      <button onClick={() => { setEditingItem(rowActionMenu.item); setIsFormOpen(true); setRowActionMenu(null) }} className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-600/10 active:scale-95"><Edit2 size={14} />Edit</button>
                      <button onClick={() => { toggleWatch(rowActionMenu.item.id) }} className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase text-slate-200 transition-all hover:bg-slate-900">
                        {watchIds.includes(rowActionMenu.item.id) ? <><EyeOff size={12} className="text-slate-400" />Unwatch</> : <><Eye size={12} className="text-sky-400" />Watch</>}
                      </button>
                      <button onClick={() => { toggleFavorite(rowActionMenu.item.id) }} className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase text-slate-200 transition-all hover:bg-slate-900">
                        {favoriteIds.includes(rowActionMenu.item.id) ? <><Star size={12} className="fill-amber-400 text-amber-400" />Unpin</> : <><Star size={12} className="text-amber-400" />Pin</>}
                      </button>
                    </div>
                    <div className="mx-2 my-2 h-px bg-slate-800" />
                    <button
                      onClick={() => {
                        const item = rowActionMenu.item
                        if (rowDeleteConfirmId !== item.id) { setRowDeleteConfirmId(item.id); return }
                        bulkMutation.mutate({ action: 'delete', ids: [item.id] }); setRowActionMenu(null); setRowDeleteConfirmId(null)
                      }}
                      onMouseLeave={() => setRowDeleteConfirmId(null)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em] transition-all ${rowDeleteConfirmId === rowActionMenu.item.id ? 'bg-rose-600 text-white animate-pulse' : 'text-rose-300 hover:bg-rose-950/80'}`}
                    >
                      <Trash2 size={14} />{rowDeleteConfirmId === rowActionMenu.item.id ? 'Confirm Archive?' : 'Archive Vendor'}
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
        <OperationalGridSurface
          className="vendor-grid-shell vendor-grid"
          style={{ '--ag-font-size': `${fontSize}px`, '--ag-font-family': "'Inter', sans-serif" } as React.CSSProperties}
          loading={isLoading}
          loadingIcon={<RefreshCcw size={32} className="text-blue-400 animate-spin" />}
          loadingLabel={<p className="text-[10px] font-semibold text-blue-400">Loading vendor registry...</p>}
        >
          <OperationalGridMatrix
            gridRef={gridRef}
            rowData={sortedItemsForGrouped}
            columnDefs={columnDefs}
            autoSizeStrategy={autoSizeStrategy}
            colResizeDefault="normal"
            fontSize={fontSize}
            rowDensity={rowDensity}
            context={gridContext}
            getRowId={handleRowId}
            onGridReady={handleGridReady}
            onSelectionChanged={(e) => handleSelectionChanged(e, 'raw')}
            onColumnResized={handleVendorColumnResized}
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
            noRowsLabel="No vendor records found"
          />
        </OperationalGridSurface>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
          <div className="rounded-lg border border-white/5 bg-black/20 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-400">Grouped vendor matrix</p>
              <p className="pt-1 text-[12px] font-semibold text-slate-100">Sorted by {groupOptions.find(o => o.value === groupBy)?.label || groupBy}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setCollapsedGroups(groupedSections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: false }), {}))} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-all">Expand All</button>
              <button onClick={() => setCollapsedGroups(groupedSections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: true }), {}))} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-all">Collapse All</button>
              <button onClick={() => setGroupBy('raw')} className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[9px] font-semibold text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-2"><X size={12} /><span>Cancel</span></button>
            </div>
          </div>
          {groupedSections.map((section) => {
            const isCollapsed = collapsedGroups[section.key]
            const selCount = section.items.filter((item: any) => selectedIds.includes(item.id)).length
            return (
              <section key={section.key} className="glass-panel overflow-hidden rounded-lg border border-white/5">
                <button type="button" onClick={() => setCollapsedGroups((c) => ({ ...c, [section.key]: !c[section.key] }))} className="flex w-full items-center justify-between gap-4 border-b border-white/5 bg-white/[0.03] px-5 py-4 text-left transition-all hover:bg-white/[0.05]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[9px] font-semibold text-blue-400">{groupOptions.find(o => o.value === groupBy)?.label}</span>
                      <h3 className="text-sm font-semibold text-slate-100">{section.label}</h3>
                    </div>
                    <p className="pt-1 text-[11px] text-slate-400">{section.items.length} vendors{selCount ? ` · ${selCount} selected` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-white/5 bg-black/30 px-2.5 py-1 text-[9px] font-semibold text-slate-300">{section.items.length}</span>
                    {isCollapsed ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
                  </div>
                </button>
                {!isCollapsed && (
                  <OperationalGridSurface
                    className="vendor-grid-shell vendor-grid w-full"
                    style={{ '--ag-font-size': `${fontSize}px`, '--ag-font-family': "'Inter', sans-serif", height: `${Math.min(600, section.items.length * (fontSize + rowDensity + 5) + 40)}px` } as React.CSSProperties}
                  >
                    <OperationalGridMatrix
                      rowData={section.items} columnDefs={columnDefs} autoSizeStrategy={autoSizeStrategy}
                      colResizeDefault="normal" fontSize={fontSize} rowDensity={rowDensity} context={gridContext}
                      getRowId={handleRowId}
                      onSelectionChanged={(e) => handleSelectionChanged(e, section.key)}
                      onColumnResized={handleVendorColumnResized} onColumnMoved={handleColumnMoved}
                      onDragStopped={handleDragStopped} onColumnPinned={handleColumnPinned} onColumnVisible={handleColumnVisible}
                      onFilterChanged={handleFilterChanged} onSortChanged={handleSortChanged} onCellContextMenu={handleCellContextMenu}
                      onRowClicked={handleRowClicked} onRowDoubleClicked={handleRowDoubleClicked}
                      getRowClass={getRowClass} onFirstDataRendered={handleGridDataUpdated} onRowDataUpdated={handleGridDataUpdated}
                      noRowsLabel="No vendors in this group"
                    />
                  </OperationalGridSurface>
                )}
              </section>
            )
          })}
        </div>
      )}

      <ConfirmationModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} onConfirm={() => { confirmModal.onConfirm?.(); setConfirmModal((prev: any) => ({ ...prev, isOpen: false })); }} title={confirmModal.title} message={confirmModal.message} variant={confirmModal.variant} />

      <AnimatePresence>
        {isFormOpen && (
          <VendorCreateForm
            key={`vendor-form-${editingItem?.id || 'new'}`}
            item={editingItem}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); setIsFormOpen(false) }}
          />
        )}
        {detailItem && (
          <VendorDetailPanel
            key={`vendor-detail-${detailItem.id}`}
            vendor={detailItem}
            devices={devices}
            systems={systems}
            onClose={() => { setDetailItem(null); setDetailDeleteConfirm(false) }}
            onDelete={(vendor: any) => {
              if (!detailDeleteConfirm) { setDetailDeleteConfirm(true); return }
              bulkMutation.mutate({ action: 'delete', ids: [vendor.id] }); setDetailItem(null); setDetailDeleteConfirm(false)
            }}
            deleteConfirm={detailDeleteConfirm}
          />
        )}
        <OperationalImportModal key="vendor-import-modal" isOpen={showImportModal} onClose={() => setShowImportModal(false)} tableName="vendors" displayName="Vendors" />
        <ConfigRegistryModal key="vendor-config-registry" isOpen={showRegistry} onClose={() => setShowRegistry(false)} title="Vendor Matrix Enumerations" sections={[ { title: 'Country List', category: 'VendorCountry', icon: Globe }, { title: 'Device Type', category: 'VendorDeviceType', icon: Monitor } ]} />
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
        .ag-header-cell-label { font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: ${fontSize}px !important; justify-content: center !important; white-space: nowrap !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; font-weight: 700 !important; font-size: ${fontSize}px !important; }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
        .row-action-trigger { opacity: 1; }
      `}</style>
    </OperationalWorkspaceFrame>
  )
}

// ===========================================================================
// VENDOR CREATE FORM (simple – mirrors original VendorForm)
// ===========================================================================
function VendorCreateForm({ item, onClose, onSuccess }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ name: '', country: 'South Korea', ...item })
  const { data: countries } = useQuery({ queryKey: ['settings', 'VendorCountry'], queryFn: async () => (await apiFetch('/api/v1/settings/options?category=VendorCountry')).json() })
  const countryOptions = useMemo(() => (countries && countries.length > 0) ? countries : [{ label: 'South Korea', value: 'South Korea' }, { label: 'USA', value: 'USA' }], [countries])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url    = data.id ? `/api/v1/vendors/${data.id}` : '/api/v1/vendors/'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { toast.success('Vendor record saved'); onSuccess?.() }
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[500px] p-10 rounded-lg border border-blue-500/30 flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h2 className="text-2xl font-bold uppercase text-blue-400 flex items-center gap-3"><Briefcase size={24} />{item?.id ? 'Edit Vendor' : 'New Vendor'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>
        <div className="space-y-6 mt-6">
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Vendor Name</label>
            <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-all" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Country</label>
            <select value={formData.country || 'South Korea'} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white [color-scheme:dark] outline-none focus:border-blue-500/50 transition-all">
              {countryOptions.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex space-x-3 pt-10 mt-auto">
          <button onClick={onClose} className="flex-1 py-4 text-[11px] font-bold uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate(formData)} className="flex-[2] py-4 bg-blue-600 text-white rounded-lg text-[11px] font-bold uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
            {mutation.isPending ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} Save Vendor
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ===========================================================================
// VENDOR DETAIL PANEL — WorkspaceModal shell + full VendorDetails tab content
// ===========================================================================
function VendorDetailPanel({ vendor, devices, systems, onClose, onDelete, deleteConfirm }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const queryClient = useQueryClient()
  const [isMaximized, setIsMaximized]           = useState(false)
  const [activeTab, setActiveTab]               = useState('Overview')
  const [isEditing, setIsEditing]               = useState(false)
  const [formData, setFormData]                 = useState({ ...vendor })
  const [hasChanges, setHasChanges]             = useState(false)
  const [showPersonnelModal, setShowPersonnelModal]         = useState<any>(null)
  const [showContractModal, setShowContractModal]           = useState<any>(null)
  const [activeContractDetails, setActiveContractDetails]   = useState<any>(null)
  const [confirmingContractId, setConfirmingContractId]     = useState<number | null>(null)
  const [confirmingPersonnelId, setConfirmingPersonnelId]   = useState<number | null>(null)

  useEffect(() => { if (!isEditing) { setFormData({ ...vendor }); setHasChanges(false) } }, [vendor, isEditing])
  const updateField = (field: string, value: any) => { setFormData({ ...formData, [field]: value }); setHasChanges(true) }

  const { data: countries } = useQuery({ queryKey: ['settings', 'VendorCountry'], queryFn: async () => (await apiFetch('/api/v1/settings/options?category=VendorCountry')).json() })
  const countryOptions = useMemo(() => (countries && countries.length > 0) ? countries : [{ label: 'South Korea', value: 'South Korea' }, { label: 'USA', value: 'USA' }], [countries])

  const vendorMutation = useMutation({
    mutationFn: async (data: any) => (await apiFetch(`/api/v1/vendors/${vendor.id}`, { method: 'PUT', body: JSON.stringify(data) })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); setIsEditing(false); setHasChanges(false); toast.success('Vendor Profile Updated') }
  })
  const personnelMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/vendors/personnel/${data.id}` : `/api/v1/vendors/${vendor.id}/personnel`
      return (await apiFetch(url, { method: data.id ? 'PUT' : 'POST', body: JSON.stringify(data) })).json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); setShowPersonnelModal(null); toast.success('Personnel Updated') }
  })
  const deletePersonnelMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/vendors/personnel/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Personnel Removed') }
  })
  const contractMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, vendor_id: vendor.id }
      const url = payload.id ? `/api/v1/vendors/contracts/${payload.id}` : `/api/v1/vendors/contracts/`
      return (await apiFetch(url, { method: payload.id ? 'PUT' : 'POST', body: JSON.stringify(payload) })).json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); setShowContractModal(null); setActiveContractDetails(null); toast.success('Contract Synchronized') }
  })
  const deleteContractMutation = useMutation({
    mutationFn: async (id: number) => apiFetch('/api/v1/vendors/bulk-action', { method: 'POST', body: JSON.stringify({ ids: [id], action: 'delete', target: 'contract' }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Contract Terminated') }
  })

  const primaryPersonnel = vendor.personnel?.find((p: any) => p.id === vendor.primary_personnel_id)
  const now = new Date()
  const activeContractCount = (vendor.contracts || []).filter((c: any) => {
    const start = parseAppDate(c.effective_date); const end = parseAppDate(c.expiry_date)
    return (!start || start <= now) && (!end || end >= now) && c.status === 'Completed'
  }).length

  return (
    <>
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title={
        <div className="flex items-center gap-3">
          <span>{vendor.name}</span>
          <WorkspaceShareHeader id={String(vendor.id)} title={vendor.name} />
        </div>
      }
      subtitle={`Partner ID: ${vendor.id} · ${vendor.country || 'No Region'}`}
      icon={<Globe size={20} />}
      forensicLineage={{ createdAt: vendor.created_at, updatedAt: vendor.updated_at }}
      status={
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
            {vendor.personnel?.length || 0} personnel · {vendor.contracts?.length || 0} contracts · {activeContractCount} active
          </span>
        </div>
      }
      footerRight={
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <ToolbarButton onClick={() => setIsEditing(true)}>Edit Vendor</ToolbarButton>
          ) : (
            <>
              <ToolbarButton onClick={() => { setFormData({ ...vendor }); setIsEditing(false); setHasChanges(false) }}>Cancel</ToolbarButton>
              {hasChanges && <ToolbarButton variant="primary" onClick={() => vendorMutation.mutate(formData)}>Save Changes</ToolbarButton>}
            </>
          )}
          <ToolbarButton
            variant="danger"
            onClick={() => onDelete?.(vendor)}
            className={`${deleteConfirm ? 'animate-pulse bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : ''} whitespace-nowrap`}
          >
            {deleteConfirm ? 'Confirm Archive?' : 'Archive'}
          </ToolbarButton>
        </div>
      }
    >
      <WorkspaceDossierShell
        body={
          <WorkspaceSplitView
            className="gap-8"
            sidebar={
              <div className="space-y-8">
                {/* Vendor KPI summary */}
                <section className="space-y-3">
                  <h3 className="px-1 text-[11px] font-black text-slate-500 uppercase tracking-widest">Vendor Summary</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Personnel',       value: vendor.personnel?.length || 0,  color: 'text-blue-400',   icon: User },
                      { label: 'Contracts',        value: vendor.contracts?.length || 0,  color: 'text-amber-400',  icon: FileText },
                      { label: 'Active Contracts', value: activeContractCount,             color: 'text-emerald-400', icon: Check },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-between hover:bg-white/[0.08] transition-all shadow-inner">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-black/40 rounded-lg text-slate-600"><stat.icon size={12} /></div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <span className={`text-[10px] font-black ${stat.color}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Primary contact */}
                <section className="space-y-3">
                  <h3 className="px-1 text-[11px] font-black text-slate-500 uppercase tracking-widest">Primary Contact</h3>
                  {primaryPersonnel ? (
                    <div className="bg-black/20 border border-white/5 rounded-lg p-4 space-y-3 shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/20"><User size={14} /></div>
                        <div>
                          <p className="text-[11px] font-black text-slate-100">{primaryPersonnel.name}</p>
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{primaryPersonnel.position}</p>
                        </div>
                      </div>
                      {primaryPersonnel.company_email && <div className="flex items-center gap-2 text-[10px] font-mono text-blue-400"><Mail size={10} /><span className="truncate">{primaryPersonnel.company_email}</span></div>}
                      {primaryPersonnel.phone && <div className="flex items-center gap-2 text-[10px] text-slate-300"><Phone size={10} className="text-amber-500" /><span>{primaryPersonnel.phone}</span></div>}
                    </div>
                  ) : (
                    <WorkspaceEmptyState compact icon={<User size={18} />} title="No primary contact" description="Assign a primary contact in the Overview tab." />
                  )}
                </section>

                {/* Country badge */}
                {vendor.country && (
                  <section className="space-y-3">
                    <h3 className="px-1 text-[11px] font-black text-slate-500 uppercase tracking-widest">Region</h3>
                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-lg p-4 flex items-center gap-3">
                      <Globe size={16} className="text-indigo-400" />
                      <span className="text-sm font-black text-white uppercase tracking-tight">{vendor.country}</span>
                    </div>
                  </section>
                )}
              </div>
            }
            main={
              <div className="space-y-0">
                {/* Tab navigation */}
                <div className="flex border-b border-white/5 mb-8">
                  {['Overview', 'Contracts', 'Personnel'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/20'}`}
                    >
                      {tab === 'Overview'   && <LayoutGrid size={13} />}
                      {tab === 'Contracts'  && <FileText   size={13} />}
                      {tab === 'Personnel'  && <User       size={13} />}
                      {tab}
                    </button>
                  ))}
                </div>

                {/* ── OVERVIEW TAB ── */}
                {activeTab === 'Overview' && (
                  <div className="space-y-8 max-w-4xl">
                    <div className="flex items-center justify-between">
                      <SectionHeader icon={Info} title="Vendor Profile Overview" />
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Vendor Name</label>
                          {isEditing ? (
                            <input value={formData.name} onChange={(e) => updateField('name', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-all" />
                          ) : (
                            <p className="text-sm font-bold text-white uppercase">{vendor.name}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Country</label>
                          {isEditing ? (
                            <select value={formData.country || 'South Korea'} onChange={(e) => updateField('country', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white [color-scheme:dark] outline-none focus:border-blue-500/50 transition-all">
                              {countryOptions.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            <p className="text-sm font-bold text-white uppercase">{vendor.country}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Primary Personnel</label>
                          {isEditing ? (
                            <select value={formData.primary_personnel_id || ''} onChange={(e) => updateField('primary_personnel_id', e.target.value ? Number(e.target.value) : null)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white [color-scheme:dark] outline-none focus:border-blue-500/50 transition-all">
                              <option value="">Select Personnel...</option>
                              {vendor.personnel?.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>)}
                            </select>
                          ) : (
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-600/10 rounded-lg text-blue-400 border border-blue-500/20"><User size={16} /></div>
                              <div>
                                <p className="text-sm font-bold text-white uppercase tracking-tight">{primaryPersonnel?.name || 'UNASSIGNED'}</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{primaryPersonnel?.position || '---'}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="pt-2">
                          <InfoCard label="Direct Email" icon={Mail} value={primaryPersonnel?.company_email} />
                        </div>
                        <div>
                          <InfoCard label="Contact Phone" icon={Phone} value={primaryPersonnel?.phone} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-10 mt-10 border-t border-white/5">
                      <SectionHeader icon={LayoutGrid} title="Entity Summary Dashboard" />
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { icon: User, color: 'text-blue-400', label: 'Personnel', value: vendor.personnel?.length || 0, sub: 'Assigned Members' },
                          { icon: FileText, color: 'text-amber-400', label: 'Contracts', value: vendor.contracts?.length || 0, sub: 'Total SLAs' },
                          { icon: Check, color: 'text-emerald-400', label: 'Active', value: activeContractCount, sub: 'Valid Contracts' },
                          { icon: Activity, color: 'text-slate-500', label: 'Insights', value: '---', sub: 'Future Metrics', dim: true },
                        ].map((stat, i) => (
                          <div key={i} className={`bg-white/5 border border-white/5 p-6 rounded-lg space-y-2 ${stat.dim ? 'opacity-50' : ''}`}>
                            <div className={`flex items-center gap-3 ${stat.color}`}>
                              <stat.icon size={20} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <p className="text-3xl font-bold text-white">{stat.value}</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase">{stat.sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CONTRACTS TAB ── */}
                {activeTab === 'Contracts' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <SectionHeader icon={FileText} title="Service Level Agreements" />
                      <button onClick={() => setShowContractModal({ title: '', contract_id: '', covered_systems: [], covered_assets: [], scope_of_work: [], schedule: {}, document_link: '', previous_contract_changes: '' })} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap">
                        <Plus size={14} /> Register New Contract
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {vendor.contracts?.map((c: any) => (
                        <div key={c.id} className="bg-white/5 border border-white/5 rounded-lg p-6 group hover:bg-white/10 transition-all cursor-pointer" onClick={() => setActiveContractDetails(c)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-6">
                              <div className="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center text-blue-400 border border-white/5 group-hover:border-blue-500/30 transition-all shrink-0"><FileText size={20} /></div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">{c.title}</h4>
                                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase ${c.status === 'Completed' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : c.status === 'In Review' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>{c.status || 'Drafted'}</span>
                                </div>
                                <div className="flex items-center space-x-6">
                                  <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest">
                                    <div className="flex flex-col"><span className="text-slate-500 mb-1">Effective</span><span className="text-white">{formatAppDay(c.effective_date)}</span></div>
                                    <div className="flex flex-col border-l border-white/10 pl-4"><span className="text-slate-500 mb-1">Expiring</span>
                                      <span className={(() => { const d = parseAppDate(c.expiry_date); return d && d < now ? 'text-rose-500' : 'text-emerald-500' })()}>{c.expiry_date ? formatAppDay(c.expiry_date) : 'OPEN-ENDED'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest border-l border-white/10 pl-6">
                                    <div className="flex flex-col">
                                      <span className="text-slate-500 mb-1">Systems</span>
                                      <div className="flex items-center gap-1.5">
                                        {c.covered_systems?.slice(0, 1).map((s: string) => <span key={s} className="text-indigo-400">{s}</span>)}
                                        {c.covered_systems?.length > 1 && <span className="text-slate-500">+{c.covered_systems.length - 1}</span>}
                                        {(!c.covered_systems || c.covered_systems.length === 0) && <span className="text-slate-700">None</span>}
                                      </div>
                                    </div>
                                    <div className="flex flex-col border-l border-white/10 pl-4">
                                      <span className="text-slate-500 mb-1">Assets</span>
                                      <span className="text-amber-400">{c.covered_assets?.length || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {confirmingContractId === c.id ? (
                                <button onClick={(e) => { e.stopPropagation(); deleteContractMutation.mutate(c.id); setConfirmingContractId(null) }} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest animate-pulse whitespace-nowrap">Confirm?</button>
                              ) : (
                                <button onClick={(e) => { e.stopPropagation(); setConfirmingContractId(c.id); setTimeout(() => setConfirmingContractId(null), 3000) }} className="p-2 text-slate-600 hover:text-rose-400 transition-all"><Trash2 size={16} /></button>
                              )}
                              <ArrowRight size={16} className="text-slate-600 group-hover:text-blue-400 transition-all" />
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!vendor.contracts || vendor.contracts.length === 0) && (
                        <div className="py-20 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest bg-black/20 rounded-lg border border-dashed border-white/5">No active service contracts found</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── PERSONNEL TAB ── */}
                {activeTab === 'Personnel' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <SectionHeader icon={User} title="Assigned Personnel" />
                      <button onClick={() => setShowPersonnelModal({ name: '', name_original: '', position: '', team: '', company_email: '', internal_email: '', phone: '', accounts: [], pcs: [] })} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap">
                        <Plus size={14} /> Add Member
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {vendor.personnel?.map((p: any) => (
                        <div key={p.id} className="bg-white/5 border border-white/5 rounded-lg p-6 group hover:bg-white/10 transition-all">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/20"><User size={20} /></div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">{p.name}</h4>
                                  {p.name_original && <span className="text-[10px] text-slate-500 font-bold">({p.name_original})</span>}
                                </div>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.position} // {p.team}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button onClick={() => setShowPersonnelModal(p)} className="p-2 text-slate-500 hover:text-blue-400 transition-all"><Edit2 size={16} /></button>
                              {confirmingPersonnelId === p.id ? (
                                <button onClick={() => { deletePersonnelMutation.mutate(p.id); setConfirmingPersonnelId(null) }} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest animate-pulse whitespace-nowrap">Confirm?</button>
                              ) : (
                                <button onClick={() => { setConfirmingPersonnelId(p.id); setTimeout(() => setConfirmingPersonnelId(null), 3000) }} className="p-2 text-slate-500 hover:text-rose-400 transition-all"><Trash2 size={16} /></button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-8">
                            <div className="space-y-4">
                              <p className="text-[8px] font-bold text-slate-600 uppercase border-b border-white/5 pb-1">Communications</p>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-[10px] text-slate-300 font-mono"><Mail size={12} className="text-blue-500" /><span>{p.company_email}</span></div>
                                {p.internal_email && <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono"><ShieldCheck size={12} className="text-emerald-500" /><span>{p.internal_email}</span></div>}
                                <div className="flex items-center space-x-2 text-[10px] text-slate-300 font-mono"><Phone size={12} className="text-amber-500" /><span>{p.phone}</span></div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <p className="text-[8px] font-bold text-slate-600 uppercase border-b border-white/5 pb-1">System Accounts ({p.accounts?.length || 0})</p>
                              <div className="space-y-1">
                                {p.accounts?.map((acc: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                                    <span className="text-emerald-400">{acc.type}</span><span className="text-white">{acc.username}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <p className="text-[8px] font-bold text-slate-600 uppercase border-b border-white/5 pb-1">Managed Assets ({p.pcs?.length || 0})</p>
                              <div className="space-y-1">
                                {p.pcs?.map((pc: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                                    <span className="text-indigo-400">{pc.type}</span><span className="text-white">{pc.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!vendor.personnel || vendor.personnel.length === 0) && (
                        <div className="py-20 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest bg-black/20 rounded-lg border border-dashed border-white/5">No personnel records identified</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            }
          />
        }
      />
    </WorkspaceModal>

    <AnimatePresence>
      {showPersonnelModal && <PersonnelForm item={showPersonnelModal} onClose={() => setShowPersonnelModal(null)} onSave={(d: any) => personnelMutation.mutate(d)} isSaving={personnelMutation.isPending} />}
      {showContractModal && <ContractRegistrationForm item={showContractModal} onClose={() => setShowContractModal(null)} onSave={(d: any) => contractMutation.mutate(d)} isSaving={contractMutation.isPending} />}
      {activeContractDetails && <ContractDetailsForm item={activeContractDetails} devices={devices} systems={systems} onClose={() => setActiveContractDetails(null)} onSave={(d: any) => contractMutation.mutate(d)} isSaving={contractMutation.isPending} />}
    </AnimatePresence>
    </>
  )
}

// ===========================================================================
// PERSONNEL FORM — verbatim from Vendor.tsx
// ===========================================================================
function PersonnelForm({ item, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })
  const [isEditing, setIsEditing] = useState(!item.id)
  const [selectedAccIndex, setSelectedAccIndex] = useState<number | null>(null)
  const [isEditingAcc, setIsEditingAcc] = useState(false)
  const [selectedPcIndex, setSelectedPcIndex] = useState<number | null>(null)
  const [isEditingPc, setIsEditingPc] = useState(false)
  const isNew = !item.id
  const updateField = (field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value }))

  const { data: deviceTypes } = useQuery({ queryKey: ['settings', 'VendorDeviceType'], queryFn: async () => (await apiFetch('/api/v1/settings/options?category=VendorDeviceType')).json() })
  const deviceTypeOptions = useMemo(() => (deviceTypes && deviceTypes.length > 0) ? deviceTypes : [{ label: 'PC', value: 'PC' }, { label: 'VDI', value: 'VDI' }, { label: 'Laptop', value: 'Laptop' }, { label: 'Workstation', value: 'Workstation' }], [deviceTypes])

  const addAccount = () => { const newAcc = { type: 'LDAP', username: '', purpose_description: '' }; const accs = [...(formData.accounts || []), newAcc]; setFormData({ ...formData, accounts: accs }); setSelectedAccIndex(accs.length - 1); setIsEditingAcc(true) }
  const addPC      = () => { const newPc  = { name: '', type: 'PC', purpose_description: '' };    const pcs  = [...(formData.pcs  || []), newPc];  setFormData({ ...formData, pcs:  pcs  }); setSelectedPcIndex(pcs.length - 1);   setIsEditingPc(true)  }
  const handleSave = () => { onSave(formData); setIsEditing(false) }
  const updateAccItem = (index: number, field: string, value: any) => { const newAccs = [...formData.accounts]; newAccs[index] = { ...newAccs[index], [field]: value }; setFormData({ ...formData, accounts: newAccs }) }
  const updatePcItem  = (index: number, field: string, value: any) => { const newPcs  = [...formData.pcs];     newPcs[index]  = { ...newPcs[index],  [field]: value }; setFormData({ ...formData, pcs:  newPcs  }) }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[1200px] max-h-[90vh] p-10 rounded-lg border border-blue-500/30 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-bold uppercase text-blue-400 flex items-center gap-3"><User size={24} />Personnel Info</h2>
            {!isEditing && !isNew ? (
              <button onClick={() => setIsEditing(true)} className="px-4 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Edit Personnel</button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-1.5 bg-white/5 text-slate-400 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                <button onClick={handleSave} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                  {isSaving ? <RefreshCcw size={12} className="animate-spin" /> : <Save size={12} />} Save Changes
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar mt-8 pr-4">
          <div className="space-y-10">
            <section className="space-y-6">
              <SectionHeader icon={User} title="Identity Info" />
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: 'Name (English)',  field: 'name',           colSpan: 1 },
                  { label: 'Name (Original)', field: 'name_original',  colSpan: 1 },
                  { label: 'Position',        field: 'position',       colSpan: 1 },
                  { label: 'Team',            field: 'team',           colSpan: 1 },
                  { label: 'Email (Company)', field: 'company_email',  colSpan: 2, mono: true },
                  { label: 'Email (Internal)',field: 'internal_email', colSpan: 1, mono: true },
                  { label: 'Phone',           field: 'phone',          colSpan: 1 },
                ].map(({ label, field, colSpan, mono }) => (
                  <div key={field} className={colSpan > 1 ? `col-span-${colSpan}` : ''}>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 tracking-widest">{label}</label>
                    {isEditing ? (
                      <input value={formData[field] || ''} onChange={(e) => updateField(field, e.target.value)} className={`w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 transition-all ${mono ? 'font-mono' : ''}`} />
                    ) : (
                      <p className={`text-sm font-bold py-2 tracking-tight ${mono ? (field === 'company_email' ? 'text-blue-400 font-mono' : 'text-emerald-400 font-mono') : 'text-white uppercase'}`}>{formData[field] || '---'}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-10">
              {/* System Accounts */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <SectionHeader icon={Key} title="System Accounts" color="text-emerald-400" />
                  {isEditing && <button onClick={addAccount} className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-all active:scale-95"><Plus size={14} /></button>}
                </div>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <div className="bg-black/40 rounded-lg border border-white/5 h-[300px] overflow-y-auto custom-scrollbar">
                      {formData.accounts?.map((acc: any, i: number) => (
                        <button key={i} onClick={() => { setSelectedAccIndex(i); setIsEditingAcc(false) }} className={`w-full text-left p-3 border-b border-white/5 transition-all hover:bg-white/5 ${selectedAccIndex === i ? 'bg-emerald-600/10 border-l-2 border-l-emerald-500' : ''}`}>
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-bold uppercase truncate ${selectedAccIndex === i ? 'text-white' : 'text-slate-400'}`}>{acc.username || 'NEW_ACCOUNT'}</span>
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{acc.type}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-8">
                    <AnimatePresence mode="wait">
                      {selectedAccIndex !== null ? (
                        <motion.div key={selectedAccIndex} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 border border-white/5 rounded-lg p-6 relative h-full">
                          {isEditing && (
                            <div className="absolute top-4 right-4 flex items-center space-x-2">
                              {!isEditingAcc ? <button onClick={() => setIsEditingAcc(true)} className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all"><Edit2 size={12} /></button>
                                             : <button onClick={() => setIsEditingAcc(false)} className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"><Check size={12} /></button>}
                              <button onClick={() => { setFormData({ ...formData, accounts: formData.accounts.filter((_: any, idx: number) => idx !== selectedAccIndex) }); setSelectedAccIndex(null) }} className="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition-all"><Trash2 size={12} /></button>
                            </div>
                          )}
                          <div className="space-y-4">
                            {[{ label: 'Account Type', field: 'type' }, { label: 'Username', field: 'username' }, { label: 'Purpose', field: 'purpose_description' }].map(({ label, field }) => (
                              <div key={field}>
                                <label className="text-[8px] font-bold text-slate-600 uppercase mb-1 block">{label}</label>
                                {isEditingAcc ? <input value={formData.accounts[selectedAccIndex][field] || ''} onChange={(e) => updateAccItem(selectedAccIndex, field, e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-emerald-500/30 transition-all" />
                                              : <p className="text-sm font-bold text-white uppercase py-1">{formData.accounts[selectedAccIndex][field] || '---'}</p>}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      ) : (
                        <div className="h-full bg-white/5 border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center text-slate-600 space-y-2 min-h-[200px]">
                          <Key size={24} className="opacity-20" />
                          <p className="text-[9px] font-bold uppercase tracking-widest">Select account to view</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>

              {/* Managed Assets (PCs) */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <SectionHeader icon={Monitor} title="Managed Assets" color="text-indigo-400" />
                  {isEditing && <button onClick={addPC} className="p-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-all active:scale-95"><Plus size={14} /></button>}
                </div>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <div className="bg-black/40 rounded-lg border border-white/5 h-[300px] overflow-y-auto custom-scrollbar">
                      {formData.pcs?.map((pc: any, i: number) => (
                        <button key={i} onClick={() => { setSelectedPcIndex(i); setIsEditingPc(false) }} className={`w-full text-left p-3 border-b border-white/5 transition-all hover:bg-white/5 ${selectedPcIndex === i ? 'bg-indigo-600/10 border-l-2 border-l-indigo-500' : ''}`}>
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-bold uppercase truncate ${selectedPcIndex === i ? 'text-white' : 'text-slate-400'}`}>{pc.name || 'NEW_ASSET'}</span>
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{pc.type}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-8">
                    <AnimatePresence mode="wait">
                      {selectedPcIndex !== null ? (
                        <motion.div key={selectedPcIndex} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 border border-white/5 rounded-lg p-6 relative h-full">
                          {isEditing && (
                            <div className="absolute top-4 right-4 flex items-center space-x-2">
                              {!isEditingPc ? <button onClick={() => setIsEditingPc(true)} className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all"><Edit2 size={12} /></button>
                                           : <button onClick={() => setIsEditingPc(false)} className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"><Check size={12} /></button>}
                              <button onClick={() => { setFormData({ ...formData, pcs: formData.pcs.filter((_: any, idx: number) => idx !== selectedPcIndex) }); setSelectedPcIndex(null) }} className="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition-all"><Trash2 size={12} /></button>
                            </div>
                          )}
                          <div className="space-y-4">
                            <div>
                              <label className="text-[8px] font-bold text-slate-600 uppercase mb-1 block">Asset Name</label>
                              {isEditingPc ? <input value={formData.pcs[selectedPcIndex].name || ''} onChange={(e) => updatePcItem(selectedPcIndex, 'name', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-indigo-500/30 transition-all" />
                                           : <p className="text-sm font-bold text-white uppercase py-1">{formData.pcs[selectedPcIndex].name || '---'}</p>}
                            </div>
                            <div>
                              <label className="text-[8px] font-bold text-slate-600 uppercase mb-1 block">Device Type</label>
                              {isEditingPc ? (
                                <select value={formData.pcs[selectedPcIndex].type || 'PC'} onChange={(e) => updatePcItem(selectedPcIndex, 'type', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white [color-scheme:dark] outline-none focus:border-indigo-500/30 transition-all">
                                  {deviceTypeOptions.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              ) : <p className="text-sm font-bold text-indigo-400 uppercase py-1">{formData.pcs[selectedPcIndex].type || '---'}</p>}
                            </div>
                            <div>
                              <label className="text-[8px] font-bold text-slate-600 uppercase mb-1 block">Purpose</label>
                              {isEditingPc ? <input value={formData.pcs[selectedPcIndex].purpose_description || ''} onChange={(e) => updatePcItem(selectedPcIndex, 'purpose_description', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-indigo-500/30 transition-all" />
                                           : <p className="text-sm font-bold text-white uppercase py-1">{formData.pcs[selectedPcIndex].purpose_description || '---'}</p>}
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="h-full bg-white/5 border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center text-slate-600 space-y-2 min-h-[200px]">
                          <Monitor size={24} className="opacity-20" />
                          <p className="text-[9px] font-bold uppercase tracking-widest">Select asset to view</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ===========================================================================
// CONTRACT REGISTRATION FORM — verbatim from Vendor.tsx
// ===========================================================================
function ContractRegistrationForm({ item, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })
  const updateField = (field: string, value: any) => setFormData({ ...formData, [field]: value })

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[600px] p-10 rounded-lg border border-blue-500/30 flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h2 className="text-2xl font-bold uppercase text-blue-400 flex items-center gap-3"><FileText size={24} />New Contract</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>
        <div className="space-y-4 mt-6">
          {[{ label: 'Contract Title', field: 'title' }, { label: 'Contract ID', field: 'contract_id' }].map(({ label, field }) => (
            <div key={field}>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{label}</label>
              <input value={formData[field] || ''} onChange={(e) => updateField(field, e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-all" />
            </div>
          ))}
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Status</label>
            <select value={formData.status || 'Drafted'} onChange={(e) => updateField('status', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white [color-scheme:dark] outline-none focus:border-blue-500/50 transition-all">
              {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[{ label: 'Effective Date', field: 'effective_date' }, { label: 'Expiry Date', field: 'expiry_date' }].map(({ label, field }) => (
              <div key={field}>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{label}</label>
                <input type="date" value={formData[field]?.split('T')[0] || ''} onChange={(e) => updateField(field, e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white [color-scheme:dark] outline-none focus:border-blue-500/50 transition-all" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex space-x-3 pt-10 mt-auto">
          <button onClick={onClose} className="flex-1 py-4 text-[11px] font-bold uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-[2] py-4 bg-blue-600 text-white rounded-lg text-[11px] font-bold uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
            {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} Register Contract
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ===========================================================================
// CONTRACT DETAILS FORM — verbatim from Vendor.tsx
// ===========================================================================
function ContractDetailsForm({ item, devices, systems, onClose, onSave, isSaving }: any) {
  const [formData, setFormData]           = useState({ ...item })
  const [isEditing, setIsEditing]         = useState(false)
  const [hasChanges, setHasChanges]       = useState(false)
  const [isInfraCollapsed, setIsInfraCollapsed] = useState(true)
  const [selectedSowIndex, setSelectedSowIndex] = useState<number | null>(null)
  const [isEditingSow, setIsEditingSow]   = useState(false)

  const statusOptions = CONTRACT_STATUSES
  const usedSystems = useMemo(() => Array.isArray(systems) ? systems : [], [systems])
  const filteredAssets = useMemo(() => {
    if (!Array.isArray(devices)) return []
    if (!formData.covered_systems?.length) return []
    return devices.filter((d: any) => formData.covered_systems.includes(d.system))
  }, [devices, formData.covered_systems])

  const toggleSystem = (sys: string) => {
    const syss = [...(formData.covered_systems || [])]
    const newSyss = syss.includes(sys) ? syss.filter(s => s !== sys) : [...syss, sys]
    setFormData({ ...formData, covered_systems: newSyss }); setHasChanges(true)
  }
  const toggleAsset = (assetId: number) => {
    const assets = [...(formData.covered_assets || [])]
    const newAssets = assets.includes(assetId) ? assets.filter(id => id !== assetId) : [...assets, assetId]
    setFormData({ ...formData, covered_assets: newAssets }); setHasChanges(true)
  }
  const handleSave   = () => { onSave(formData); setIsEditing(false); setHasChanges(false) }
  const updateField  = (field: string, value: any) => { setFormData({ ...formData, [field]: value }); setHasChanges(true) }
  const updateSchedule = (field: string, value: any) => { setFormData({ ...formData, schedule: { ...formData.schedule, [field]: value } }); setHasChanges(true) }
  const updateSowItem  = (index: number, field: string, value: any) => { const newSow = [...formData.scope_of_work]; newSow[index] = { ...newSow[index], [field]: value }; setFormData({ ...formData, scope_of_work: newSow }); setHasChanges(true) }
  const addSOW = () => { const newSow = { work_description: '', frequency: '', response: '', objective_description: '', importance: 'Medium' }; const sow = [...(formData.scope_of_work || []), newSow]; setFormData({ ...formData, scope_of_work: sow }); setHasChanges(true); setSelectedSowIndex(sow.length - 1); setIsEditingSow(true) }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[1200px] max-h-[95vh] p-10 rounded-lg border border-blue-500/30 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-bold uppercase text-blue-400 flex items-center gap-3"><FileText size={24} />Contract Details</h2>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="px-4 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Enable Edit Mode</button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => { setFormData({ ...item }); setIsEditing(false); setHasChanges(false); setIsEditingSow(false) }} className="px-4 py-1.5 bg-white/5 text-slate-400 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                {hasChanges && <button onClick={handleSave} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">{isSaving ? <RefreshCcw size={12} className="animate-spin" /> : <Save size={12} />} Save Changes</button>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar mt-8 pr-4">
          <div className="space-y-10">
            {/* Row 1: Admin & Policy */}
            <div className="grid grid-cols-2 gap-10">
              <section className="space-y-6">
                <SectionHeader icon={Info} title="Administrative Info" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 tracking-widest">Contract Title</label>
                    {isEditing ? <input value={formData.title || ''} onChange={(e) => updateField('title', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 transition-all" />
                               : <p className="text-sm font-bold text-white uppercase py-2 tracking-tight">{formData.title || '---'}</p>}
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 tracking-widest">Contract ID</label>
                    {isEditing ? <input value={formData.contract_id || ''} onChange={(e) => updateField('contract_id', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 transition-all" />
                               : <p className="text-sm font-bold text-white uppercase py-2 tracking-tight">{formData.contract_id || '---'}</p>}
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 tracking-widest">Status</label>
                    {isEditing ? (
                      <select value={formData.status || 'Drafted'} onChange={(e) => updateField('status', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white [color-scheme:dark] outline-none focus:border-blue-500/50 transition-all">
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <p className="text-sm font-bold text-white uppercase py-2 tracking-tight">{formData.status || 'Drafted'}</p>}
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 tracking-widest">Doc Link</label>
                    {isEditing ? <input value={formData.document_link || ''} onChange={(e) => updateField('document_link', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-blue-500/50 transition-all" />
                               : formData.document_link ? <a href={formData.document_link} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-400 py-2 tracking-tight hover:underline flex items-center gap-2"><ExternalLink size={12} />View Document</a>
                               : <p className="text-sm font-bold text-slate-500 py-2 tracking-tight">No link provided</p>}
                  </div>
                  {[{ label: 'Effective Date', field: 'effective_date' }, { label: 'Expiry Date', field: 'expiry_date' }].map(({ label, field }) => (
                    <div key={field}>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 tracking-widest">{label}</label>
                      {isEditing ? <input type="date" value={formData[field]?.split('T')[0] || ''} onChange={(e) => updateField(field, e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white [color-scheme:dark] outline-none focus:border-blue-500/50 transition-all" />
                                 : <p className="text-sm font-bold text-white py-2 tracking-tight">{formatAppDay(formData[field])}</p>}
                    </div>
                  ))}
                </div>
              </section>
              <section className="space-y-6">
                <SectionHeader icon={Clock} title="Availability & Policy" color="text-emerald-400" />
                <div className="grid grid-cols-2 gap-4">
                  {[{ label: 'Work Schedule', field: 'work_schedule' }, { label: 'On-Call Method', field: 'oncall_method' }].map(({ label, field }) => (
                    <div key={field}>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 tracking-widest">{label}</label>
                      {isEditing ? <input value={formData.schedule?.[field] || ''} onChange={(e) => updateSchedule(field, e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-emerald-500/30 transition-all" />
                                 : <p className="text-sm font-bold text-white uppercase py-2 tracking-tight">{formData.schedule?.[field] || '---'}</p>}
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 tracking-widest">Holiday Policy</label>
                    {isEditing ? <textarea value={formData.schedule?.holiday_policy || ''} onChange={(e) => updateSchedule('holiday_policy', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white min-h-[60px] outline-none focus:border-emerald-500/30 transition-all" />
                               : <p className="text-sm font-bold text-white uppercase py-2 tracking-tight leading-relaxed">{formData.schedule?.holiday_policy || '---'}</p>}
                  </div>
                </div>
              </section>
            </div>

            {/* Row 2: Infrastructure Coverage */}
            <section className="bg-white/5 border border-white/5 rounded-lg overflow-hidden">
              <button onClick={() => setIsInfraCollapsed(!isInfraCollapsed)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-all">
                <div className="flex items-center space-x-3">
                  <Layers size={16} className="text-indigo-400" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Infrastructure Coverage</h3>
                  {isInfraCollapsed && formData.covered_systems?.length > 0 && (
                    <div className="flex items-center space-x-2 ml-4">
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-600/20 text-indigo-400 text-[8px] font-bold uppercase">{formData.covered_systems[0]}</span>
                      {formData.covered_systems.length > 1 && <span className="text-[8px] font-bold text-slate-600">+{formData.covered_systems.length - 1} MORE</span>}
                    </div>
                  )}
                </div>
                {isInfraCollapsed ? <Plus size={14} className="text-slate-500" /> : <X size={14} className="text-slate-500" />}
              </button>
              <AnimatePresence>
                {!isInfraCollapsed && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="p-6 border-t border-white/5 grid grid-cols-2 gap-10">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Covered Systems</label>
                        <div className="bg-black/20 rounded-lg border border-white/5 p-3 h-48 overflow-y-auto custom-scrollbar space-y-1.5">
                          {usedSystems.length === 0 && <p className="text-[8px] text-slate-600 text-center py-16 uppercase font-bold">No active systems found</p>}
                          {usedSystems.map((s: any) => (
                            <label key={s.value} className={`flex items-center space-x-3 p-2 rounded-lg transition-all ${isEditing ? 'hover:bg-white/5 cursor-pointer' : ''}`}>
                              <input disabled={!isEditing} type="checkbox" checked={formData.covered_systems?.includes(s.value)} onChange={() => toggleSystem(s.value)} className="w-4 h-4 rounded-lg border-white/10 bg-slate-900 text-blue-600" />
                              <span className={`text-[10px] font-bold uppercase tracking-tight ${formData.covered_systems?.includes(s.value) ? 'text-white' : 'text-slate-500'}`}>{s.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Propagated Assets</label>
                        <div className="bg-black/20 rounded-lg border border-white/5 p-3 h-48 overflow-y-auto custom-scrollbar space-y-1.5">
                          {filteredAssets.length === 0 && <div className="flex flex-col items-center justify-center h-full space-y-2 text-slate-600"><Server size={20} className="opacity-20" /><p className="text-[8px] uppercase font-bold text-center">Select systems first</p></div>}
                          {filteredAssets.map((a: any) => (
                            <label key={a.id} className={`flex items-center space-x-3 p-2 rounded-lg transition-all ${isEditing ? 'hover:bg-white/5 cursor-pointer' : ''}`}>
                              <input disabled={!isEditing} type="checkbox" checked={formData.covered_assets?.includes(a.id)} onChange={() => toggleAsset(a.id)} className="w-4 h-4 rounded-lg border-white/10 bg-slate-900 text-indigo-600" />
                              <div className="flex flex-col min-w-0">
                                <span className={`text-[10px] font-bold uppercase tracking-tight truncate ${formData.covered_assets?.includes(a.id) ? 'text-white' : 'text-slate-500'}`}>{a.name}</span>
                                <span className="text-[8px] text-slate-600 font-bold uppercase">{a.system}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Row 3: Scope of Work */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <SectionHeader icon={Terminal} title="Scope of Work Matrix" color="text-amber-400" />
                {isEditing && <button onClick={addSOW} className="p-1.5 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-lg transition-all active:scale-95"><Plus size={14} /></button>}
              </div>
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-4 space-y-2">
                  <div className="bg-black/40 rounded-lg border border-white/5 h-[400px] overflow-y-auto custom-scrollbar">
                    {formData.scope_of_work?.map((s: any, i: number) => (
                      <button key={i} onClick={() => { setSelectedSowIndex(i); setIsEditingSow(false) }} className={`w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 ${selectedSowIndex === i ? 'bg-amber-600/10 border-l-2 border-l-amber-500' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-tight truncate flex-1 ${selectedSowIndex === i ? 'text-white' : 'text-slate-400'}`}>{s.work_description || 'Untitled Work'}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-lg ml-2 ${s.importance === 'Critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500'}`}>{s.importance}</span>
                        </div>
                      </button>
                    ))}
                    {(!formData.scope_of_work || formData.scope_of_work.length === 0) && <div className="p-10 text-center text-slate-600 text-[9px] font-bold uppercase tracking-widest">No scope items</div>}
                  </div>
                </div>
                <div className="col-span-8">
                  <AnimatePresence mode="wait">
                    {selectedSowIndex !== null ? (
                      <motion.div key={selectedSowIndex} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="bg-white/5 border border-white/5 rounded-lg p-8 relative h-full">
                        {isEditing && (
                          <div className="absolute top-4 right-4 flex items-center space-x-2">
                            {!isEditingSow ? <button onClick={() => setIsEditingSow(true)} className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all"><Edit2 size={14} /></button>
                                           : <button onClick={() => setIsEditingSow(false)} className="p-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"><Check size={14} /></button>}
                            <button onClick={() => { setFormData({ ...formData, scope_of_work: formData.scope_of_work.filter((_: any, idx: number) => idx !== selectedSowIndex) }); setHasChanges(true); setSelectedSowIndex(null) }} className="p-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition-all"><Trash2 size={14} /></button>
                          </div>
                        )}
                        <div className="space-y-6">
                          <div>
                            <label className="text-[8px] font-bold text-slate-600 uppercase mb-2 block">Work Description</label>
                            {isEditingSow ? <input value={formData.scope_of_work[selectedSowIndex].work_description || ''} onChange={(e) => updateSowItem(selectedSowIndex, 'work_description', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-amber-500/30 transition-all" />
                                          : <p className="text-sm font-bold text-white uppercase tracking-tight">{formData.scope_of_work[selectedSowIndex].work_description || '---'}</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            {[{ label: 'Frequency', field: 'frequency' }, { label: 'Response Time', field: 'response' }].map(({ label, field }) => (
                              <div key={field}>
                                <label className="text-[8px] font-bold text-slate-600 uppercase mb-2 block">{label}</label>
                                {isEditingSow ? <input value={formData.scope_of_work[selectedSowIndex][field] || ''} onChange={(e) => updateSowItem(selectedSowIndex, field, e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-amber-500/30 transition-all" />
                                              : <p className={`text-xs font-bold uppercase tracking-widest ${field === 'response' ? 'text-white font-mono' : 'text-amber-400'}`}>{formData.scope_of_work[selectedSowIndex][field] || '---'}</p>}
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-slate-600 uppercase mb-2 block">Objective & Criticality</label>
                            <div className="flex gap-4">
                              {isEditingSow ? (
                                <>
                                  <input placeholder="Purpose of this task..." value={formData.scope_of_work[selectedSowIndex].objective_description || ''} onChange={(e) => updateSowItem(selectedSowIndex, 'objective_description', e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-amber-500/30 transition-all" />
                                  <select value={formData.scope_of_work[selectedSowIndex].importance || 'Medium'} onChange={(e) => updateSowItem(selectedSowIndex, 'importance', e.target.value)} className="w-32 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none [color-scheme:dark]">
                                    {['Critical', 'High', 'Medium', 'Low'].map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                </>
                              ) : (
                                <div className="flex items-center justify-between w-full p-4 bg-black/20 rounded-lg border border-white/5">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">{formData.scope_of_work[selectedSowIndex].objective_description || 'No objective defined'}</p>
                                  <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${formData.scope_of_work[selectedSowIndex].importance === 'Critical' ? 'bg-rose-600 text-white' : formData.scope_of_work[selectedSowIndex].importance === 'High' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{formData.scope_of_work[selectedSowIndex].importance}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-full bg-white/5 border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center text-slate-600 space-y-4 min-h-[300px]">
                        <Terminal size={48} className="opacity-10" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Select an entry to view details</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* Row 4: Evolution & Changes */}
            <section className="space-y-6">
              <SectionHeader icon={RefreshCcw} title="Evolution & Changes" color="text-blue-400" />
              <div className="bg-white/5 border border-white/5 rounded-lg p-6">
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-3 tracking-widest">Key modifications from previous version</label>
                {isEditing ? (
                  <textarea value={formData.previous_contract_changes || ''} onChange={(e) => updateField('previous_contract_changes', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-xs text-white min-h-[120px] outline-none focus:border-blue-500/30 transition-all" placeholder="Document commercial or technical deviations..." />
                ) : (
                  <p className="text-sm font-bold text-white uppercase py-2 tracking-tight leading-relaxed min-h-[100px] whitespace-pre-wrap">{formData.previous_contract_changes || 'Initial version - no previous changes recorded'}</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
