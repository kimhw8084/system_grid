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
  BookOpen, Eye, EyeOff, FileText, Users, Mail, MessageSquare, Monitor, MoreVertical,
  Download, Copy, ChevronDown, ChevronUp, Layers, RefreshCcw, Tag, Sliders, Clipboard, Lightbulb, Maximize2, Minimize2, GitCompare, Undo2, List, LayoutGrid, Upload, Terminal, History as HistoryIcon, Edit2 as EditIcon
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { showWorkspaceToast } from './shared/WorkspaceToast'
import { apiFetch } from '../api/apiClient'
import { formatAppDate, formatAppTime, formatAppDay, parseAppDate } from '../utils/dateUtils'
import { AppDropdown } from './shared/AppDropdown'
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
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
  WorkspaceValidationBanner,
  getWorkspaceModalFrameClass,
  getWorkspaceModalShellClass,
  getWorkspaceInputClass,
  useEscapeDismiss,
  useBodyModalFlag,
} from './shared/OperationalWorkspacePrimitives'
import { WorkspaceFlyoutActionCard, WorkspaceFlyoutDropdownEditor } from './shared/WorkspaceFlyout'
import { StatusPill } from './shared/StatusPill'
import { parseCommaSeparatedValues } from '../utils/dataParsers'
import { HeaderScopeSwitch, ToolbarButton, ToolbarGroup, ToolbarIconButton, ToolbarSearch } from './shared/LayoutPrimitives'
import { useOperationalGridLayout, usePersistentJsonState, useWorkspaceDismissHandlers, useWorkspaceSessionValue, useOperationalDetailRoute } from './shared/OperationalWorkspaceHooks'
import {
  useOperationalRowInteractions,
  useOperationalContextMenu,
  useOperationalDismissController
} from './shared/OperationalGridInteractions'
import { WorkspaceCompareShell, WorkspaceDossierShell } from './shared/WorkspaceModalShells'
import { WorkspaceShareHeader } from './shared/WorkspaceShareHeader'
import { OperationalImportModal } from './shared/OperationalImportModal'
import { OperationalDataGrid } from './shared/OperationalDataGrid'
import {
  OperationalAnchoredPanel,
  OperationalDisplayPanel,
  OperationalGroupedGridSection,
  OperationalGroupedGridView,
  OperationalSavedViewsPanel,
  OperationalWorkspaceShell,
} from './shared/OperationalWorkspaceShells'
import {
  canonicalizeServiceStatus,
  ServiceDetailsView,
  ServiceForm,
  SERVICE_STATUS_DEFINITIONS as STATUSES,
} from './ServiceRegistry'
import {
  applyOperationalColumnState,
  autoSizeOperationalColumns,
  getOperationalColumnLayoutSnapshot,
  normalizeOperationalColumnLayout,
  sanitizeOperationalColumnLayout,
  sanitizeOperationalFilterModel,
  sanitizeOperationalSortModel,
} from './shared/OperationalGridSizing'
import {
  type OperationalColumnConfig,
  OPERATIONAL_GRID_WIDTHS,
} from './shared/OperationalGridContract'
import {
  buildOperationalGridColumnDefinitions,
  renderOperationalActionButtons,
} from './shared/OperationalGridStandard'

const SERVICE_VIEW_STORAGE_KEY = 'sysgrid_services_views_v1'
const SERVICE_ACTIVE_VIEW_KEY = 'sysgrid_services_active_view_v1'
const SERVICE_FAVORITES_STORAGE_KEY = 'sysgrid_services_favorites_v1'
const SERVICE_UI_STATE_KEY = 'sysgrid_services_ui_state_v1'
const SERVICE_WATCH_STORAGE_KEY = 'sysgrid_services_watch_v1'
const SERVICE_WORKSPACE_PREFERENCE_KEY = 'services_workspace_state_v1'
const SERVICE_WORKSPACE_PREFERENCE_VERSION = 2
const BULK_MENU_MAX_HEIGHT = 560
const SERVICE_FIXED_WIDTH_COLUMN_IDS = new Set([
  'select',
  'id',
  'recent_change',
  'favorite',
  'watch',
  'row_actions',
])

const sanitizeServiceColumnLayout = (layout: any[], preserveWidths: boolean) => {
  const sanitized = sanitizeOperationalColumnLayout(layout, SERVICE_PERSISTED_COLUMN_IDS, preserveWidths).map((column: any) => (
    preserveWidths && SERVICE_FIXED_WIDTH_COLUMN_IDS.has(column?.colId)
      ? {
          ...column,
          width: undefined,
          flex: undefined,
        }
      : column
  ))

  return [...sanitized].sort((a: any, b: any) => {
    const aIndex = SERVICE_DEFAULT_COLUMN_ORDER_MAP.get(a?.colId) ?? 1000
    const bIndex = SERVICE_DEFAULT_COLUMN_ORDER_MAP.get(b?.colId) ?? 1000
    return aIndex - bIndex
  })
}

export const LOGIC_TYPES = ['Threshold', 'Anomaly', 'Availability']
export const CHECK_INTERVAL_MIN = 30
export const CHECK_INTERVAL_MAX = 86400
export const ALERT_DURATION_MIN = 0
export const ALERT_DURATION_MAX = 3600
export const NOTIFICATION_THROTTLE_MIN = 60
export const NOTIFICATION_THROTTLE_MAX = 86400

export const LOGIC_SUGGESTIONS: Record<string, string> = {
  Threshold: 'CPU > 90%',
  Anomaly: 'Trend analysis',
  Availability: 'HTTP 200 check'
}

export const getLogicExtensions = (logicType?: string) => []

export interface OperatorRecord {
  id: number
  username: string
  full_name: string
  external_id: string
  team_id?: number
  team?: string
}

const DEFAULT_SERVICE_VIEWS = []
const DEFAULT_SERVICE_VIEW_IDS = new Set(DEFAULT_SERVICE_VIEWS.map((view) => view.id))
const SERVICE_SUPPORTS_COMPARE = true
const SERVICE_VALID_GROUP_BY = new Set(['raw', 'status', 'environment', 'service_type', 'device_name'])
const SERVICE_PERSISTED_COLUMN_IDS = new Set([
  'select',
  'id',
  'recent_change',
  'favorite',
  'watch',
  'device_name',
  'name',
  'service_type',
  'environment',
  'version',
  'status',
  'purpose',
  'manufacturer',
  'supplier',
  'purchase_type',
  'cost',
  'currency',
  'installation_date',
  'secret_count',
  'created_at',
  'updated_at',
  'row_actions',
])
const SERVICE_DEFAULT_COLUMN_ORDER = [
  'select',
  'id',
  'recent_change',
  'favorite',
  'watch',
  'device_name',
  'name',
  'service_type',
  'environment',
  'version',
  'status',
  'purpose',
  'manufacturer',
  'supplier',
  'purchase_type',
  'cost',
  'installation_date',
  'created_at',
  'updated_at',
  'row_actions',
]
const SERVICE_DEFAULT_COLUMN_ORDER_MAP = new Map(SERVICE_DEFAULT_COLUMN_ORDER.map((colId, index) => [colId, index]))

const readJsonStorage = <T,>(storageKey: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw == null ? fallback : JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const normalizeServiceIdList = (value: any): number[] => {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(
    value
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry) && entry > 0)
  ))
}

const normalizeServiceQuickFilters = (value: any) => ({
  status: Array.isArray(value?.status) ? value.status.filter((entry: any) => typeof entry === 'string' && entry.trim()) : [],
  environment: Array.isArray(value?.environment) ? value.environment.filter((entry: any) => typeof entry === 'string' && entry.trim()) : [],
  service_type: Array.isArray(value?.service_type) ? value.service_type.filter((entry: any) => typeof entry === 'string' && entry.trim()) : [],
  device_name: Array.isArray(value?.device_name) ? value.device_name.filter((entry: any) => typeof entry === 'string' && entry.trim()) : [],
})

const normalizeServiceSavedViews = (value: any) => {
  const parsed = Array.isArray(value) ? value : []
  const systemIds = new Set(DEFAULT_SERVICE_VIEWS.map((view) => view.id))
  const legacyIds = new Set(['ops', 'incident', 'recovery'])
  const customViews = parsed.filter((view: any) => (
    view &&
    typeof view === 'object' &&
    typeof view.id === 'string' &&
    typeof view.name === 'string' &&
    !systemIds.has(view.id) &&
    !legacyIds.has(view.id)
  ))
  return [
    ...DEFAULT_SERVICE_VIEWS.map((view) => parsed.find((entry: any) => entry?.id === view.id) || view),
    ...customViews.map((view: any) => ({
      ...view,
      config: sanitizeServiceViewConfig(view?.config),
    })),
  ]
}

const sanitizeServiceViewConfig = (config: any) => {
  const safeConfig = config && typeof config === 'object' ? config : {}
  return {
    fontSize: Number.isFinite(safeConfig.fontSize) ? safeConfig.fontSize : 11,
    rowDensity: Number.isFinite(safeConfig.rowDensity) ? safeConfig.rowDensity : 8,
    hiddenColumns: Array.isArray(safeConfig.hiddenColumns)
      ? safeConfig.hiddenColumns.filter((entry: any) => typeof entry === 'string' && SERVICE_PERSISTED_COLUMN_IDS.has(entry))
      : [],
    groupBy: typeof safeConfig.groupBy === 'string' && SERVICE_VALID_GROUP_BY.has(safeConfig.groupBy) ? safeConfig.groupBy : 'raw',
    showFilterBar: safeConfig.showFilterBar !== false,
    columnLayoutState: sanitizeServiceColumnLayout(Array.isArray(safeConfig.columnLayoutState) ? safeConfig.columnLayoutState : [], true),
    quickFilter: typeof safeConfig.quickFilter === 'string' ? safeConfig.quickFilter : '',
    quickFilters: normalizeServiceQuickFilters(safeConfig.quickFilters),
    filterModel: sanitizeOperationalFilterModel(safeConfig.filterModel, SERVICE_PERSISTED_COLUMN_IDS),
    sortModel: sanitizeOperationalSortModel(safeConfig.sortModel, SERVICE_PERSISTED_COLUMN_IDS),
  }
}

const normalizeServiceWorkspaceState = (value: any) => {
  if (!value || typeof value !== 'object') return null
  const uiState = value.uiState && typeof value.uiState === 'object' ? value.uiState : {}
  const normalized = {
    version: SERVICE_WORKSPACE_PREFERENCE_VERSION,
    savedViews: normalizeServiceSavedViews(value.savedViews),
    activeViewId: typeof value.activeViewId === 'string' && value.activeViewId.trim() ? value.activeViewId : null,
    favoriteIds: normalizeServiceIdList(value.favoriteIds),
    watchIds: normalizeServiceIdList(value.watchIds),
    uiState: {
      activeTab: uiState.activeTab === 'deleted' ? 'deleted' : 'active',
      fontSize: Number.isFinite(uiState.fontSize) ? uiState.fontSize : 11,
      rowDensity: Number.isFinite(uiState.rowDensity) ? uiState.rowDensity : 8,
      hiddenColumns: Array.isArray(uiState.hiddenColumns)
        ? uiState.hiddenColumns.filter((entry: any) => typeof entry === 'string' && SERVICE_PERSISTED_COLUMN_IDS.has(entry))
        : ['created_at', 'updated_at'],
      quickFilters: normalizeServiceQuickFilters(uiState.quickFilters),
      groupBy: typeof uiState.groupBy === 'string' && SERVICE_VALID_GROUP_BY.has(uiState.groupBy) ? uiState.groupBy : 'raw',
      showFilterBar: uiState.showFilterBar !== false,
      columnLayoutState: sanitizeServiceColumnLayout(Array.isArray(uiState.columnLayoutState) ? uiState.columnLayoutState : [], false),
      lastVisitedAt: Number.isFinite(uiState.lastVisitedAt) ? uiState.lastVisitedAt : 0,
      searchTerm: typeof uiState.searchTerm === 'string' ? uiState.searchTerm : '',
    }
  }
  return normalized
}

const readServiceWorkspaceStateFromLocalStorage = () => normalizeServiceWorkspaceState({
  savedViews: readJsonStorage<any[]>(SERVICE_VIEW_STORAGE_KEY, []),
  activeViewId: typeof window === 'undefined' ? null : window.localStorage.getItem(SERVICE_ACTIVE_VIEW_KEY),
  favoriteIds: readJsonStorage<number[]>(SERVICE_FAVORITES_STORAGE_KEY, []),
  watchIds: readJsonStorage<number[]>(SERVICE_WATCH_STORAGE_KEY, []),
  uiState: readJsonStorage(SERVICE_UI_STATE_KEY, null),
})

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
const getMonitorGroupValue = (item: any, field: string) => {
  if (field === 'notification_method') return item.notification_method || 'No notification path'
  return item[field] || 'Unspecified'
}

const readServiceUiState = () => {
  return readServiceWorkspaceStateFromLocalStorage()?.uiState ?? null
}

const SERVICE_STATUSES = STATUSES.map((status) => status.value)
const SERVICE_PURCHASE_TYPES = ['One-time', 'Subscription', 'OEM', 'Free']
const getServiceTitle = (service: any) => service?.name || `Service ${service?.id ?? 'Unknown'}`
const NETWORK_STATUSES = SERVICE_STATUSES
const NETWORK_LINK_TYPES = ['Database', 'Application', 'OS', 'Middleware', 'API']
const NETWORK_DIRECTIONS = ['Production', 'Stage', 'Development', 'Lab']
const NETWORK_UNITS = ['USD', 'EUR', 'KRW', 'JPY', 'GBP']

const normalizeServiceRecord = (service: any) => {
  const status = canonicalizeServiceStatus(service?.status)
  const serviceType = service?.service_type || 'Service'
  const environment = service?.environment || 'Production'
  const title = getServiceTitle(service)
  const hostName = service?.device_name || 'Floating'
  const configKeys = Object.keys(service?.config_json || {})

  return {
    ...service,
    title,
    category: serviceType,
    status,
    severity: environment,
    platform: environment,
    type: serviceType,
    device_name: hostName,
    monitored_service_names: configKeys,
    impact: service?.supplier || '',
    notification_method: service?.purchase_type || '',
    notification_recipients: [],
    owners: service?.device_id ? [{ operator_id: Number(service.device_id), role: 'Host', name: hostName, external_id: String(service.device_id) }] : [],
    owner_team: environment,
    is_active: !service?.is_deleted,
    is_deleted: Boolean(service?.is_deleted),
    secret_count: Number(service?.secret_count || service?.secrets?.length || 0),
  }
}

const sanitizeServicePayload = (item: any) => ({
  name: String(item?.name || item?.title || '').trim(),
  service_type: String(item?.service_type || item?.type || item?.category || 'Service').trim(),
  status: canonicalizeServiceStatus(item?.status),
  version: item?.version ? String(item.version).trim() : null,
  environment: item?.environment ? String(item.environment).trim() : 'Production',
  device_id: item?.device_id === '' || item?.device_id == null ? null : Number(item.device_id),
  config_json: item?.config_json && typeof item.config_json === 'object' ? item.config_json : {},
  custom_attributes: item?.custom_attributes && typeof item.custom_attributes === 'object' ? item.custom_attributes : {},
  logic_json: Array.isArray(item?.logic_json) ? item.logic_json : [],
  purchase_type: item?.purchase_type ? String(item.purchase_type).trim() : 'One-time',
  license_key: item?.license_key ? String(item.license_key).trim() : null,
  purchase_date: item?.purchase_date ? String(item.purchase_date).trim() : null,
  expiry_date: item?.expiry_date ? String(item.expiry_date).trim() : null,
  installation_date: item?.installation_date ? String(item.installation_date).trim() : null,
  purpose: item?.purpose ? String(item.purpose).trim() : null,
  documentation_link: item?.documentation_link ? String(item.documentation_link).trim() : null,
  manufacturer: item?.manufacturer ? String(item.manufacturer).trim() : null,
  supplier: item?.supplier ? String(item.supplier).trim() : null,
  cost: item?.cost === '' || item?.cost == null ? 0 : Number(item.cost),
  currency: item?.currency ? String(item.currency).trim() : 'USD',
})
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
                <p className="text-[9px] font-bold text-slate-500 uppercase">Live Service Registry</p>
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

export default function ServicesReal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const idParam = searchParams.get('id')
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  const { data: userSettings, isSuccess: hasUserSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => (await (await apiFetch('/api/v1/settings/user/settings')).json()),
  })
  const remoteWorkspaceState = useMemo(
    () => normalizeServiceWorkspaceState(userSettings?.[SERVICE_WORKSPACE_PREFERENCE_KEY]),
    [userSettings]
  )
  const localWorkspaceState = useMemo(() => readServiceWorkspaceStateFromLocalStorage(), [])
  const hasStoredFavoriteIds = useMemo(
    () => typeof window !== 'undefined' && window.localStorage.getItem(SERVICE_FAVORITES_STORAGE_KEY) !== null,
    []
  )
  const hasStoredWatchIds = useMemo(
    () => typeof window !== 'undefined' && window.localStorage.getItem(SERVICE_WATCH_STORAGE_KEY) !== null,
    []
  )
  const initialWorkspaceState = useMemo(() => {
    if (!remoteWorkspaceState) return localWorkspaceState
    if (!localWorkspaceState) return remoteWorkspaceState
    return {
      ...remoteWorkspaceState,
      savedViews: localWorkspaceState.savedViews?.length ? localWorkspaceState.savedViews : remoteWorkspaceState.savedViews,
      activeViewId: localWorkspaceState.activeViewId ?? remoteWorkspaceState.activeViewId,
      favoriteIds: hasStoredFavoriteIds ? (localWorkspaceState.favoriteIds ?? []) : remoteWorkspaceState.favoriteIds,
      watchIds: hasStoredWatchIds ? (localWorkspaceState.watchIds ?? []) : remoteWorkspaceState.watchIds,
      uiState: {
        ...remoteWorkspaceState.uiState,
        ...localWorkspaceState.uiState,
      },
    }
  }, [hasStoredFavoriteIds, hasStoredWatchIds, localWorkspaceState, remoteWorkspaceState])
  const persistedUiState = initialWorkspaceState?.uiState ?? null
  
  // --- STYLE LABORATORY STATE ---
  const [fontSize, setFontSize] = useState(persistedUiState?.fontSize ?? 11)
  const [rowDensity, setRowDensity] = useState(persistedUiState?.rowDensity ?? 8)
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
  const [showImportModal, setShowImportModal] = useState(false)
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
  const [savedViews, setSavedViews] = usePersistentJsonState<any[]>(SERVICE_VIEW_STORAGE_KEY, () => {
    return initialWorkspaceState?.savedViews ?? normalizeServiceSavedViews([])
  })
  const [activeViewId, setActiveViewId] = useWorkspaceSessionValue<string | null>(
    'sysgrid_services_session_init',
    null,
    () => initialWorkspaceState?.activeViewId ?? (typeof window === 'undefined' ? null : window.localStorage.getItem(SERVICE_ACTIVE_VIEW_KEY))
  )
  const [favoriteIds, setFavoriteIds] = usePersistentJsonState<number[]>(SERVICE_FAVORITES_STORAGE_KEY, initialWorkspaceState?.favoriteIds ?? [])
  const [watchIds, setWatchIds] = usePersistentJsonState<number[]>(SERVICE_WATCH_STORAGE_KEY, initialWorkspaceState?.watchIds ?? [])
  const [quickFilters, setQuickFilters] = useState(persistedUiState?.quickFilters ?? { status: [] as string[], environment: [] as string[], service_type: [] as string[], device_name: [] as string[] })
  const [searchTerm, setSearchTerm] = useState(persistedUiState?.searchTerm ?? '')
  const [groupBy, setGroupBy] = useState<string>(persistedUiState?.groupBy ?? 'raw')
  const [bulkDraft, setBulkDraft] = useState({ status: '', service_type: '', environment: '' })
  const [expandedBulkSection, setExpandedBulkSection] = useState<'status' | 'service_type' | 'environment' | null>(null)
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
  const servicePreferenceHydratedRef = useRef(false)
  const servicePreferenceMigratedRef = useRef(false)
  const servicePreferenceSyncRef = useRef<string | null>(null)
  const servicePreferenceSyncTimeoutRef = useRef<number | null>(null)
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

  const buildServiceWorkspacePreferencePayload = useCallback(() => normalizeServiceWorkspaceState({
    version: SERVICE_WORKSPACE_PREFERENCE_VERSION,
    savedViews,
    activeViewId,
    favoriteIds,
    watchIds,
    uiState: {
      activeTab,
      fontSize,
      rowDensity,
      hiddenColumns,
      quickFilters,
      groupBy,
      showFilterBar,
      columnLayoutState: normalizeOperationalColumnLayout(columnLayoutState, false),
      lastVisitedAt,
      searchTerm,
    }
  }), [
    activeTab,
    activeViewId,
    columnLayoutState,
    favoriteIds,
    fontSize,
    groupBy,
    hiddenColumns,
    lastVisitedAt,
    quickFilters,
    rowDensity,
    savedViews,
    searchTerm,
    showFilterBar,
    watchIds,
  ])

  useEffect(() => clearPendingAutoSize, [clearPendingAutoSize])

  useEffect(() => {
    if (remoteWorkspaceState && !servicePreferenceHydratedRef.current) {
      servicePreferenceHydratedRef.current = true
      const payload = initialWorkspaceState ?? normalizeServiceWorkspaceState(remoteWorkspaceState)
      const serialized = JSON.stringify(payload)
      servicePreferenceSyncRef.current = serialized
      setSavedViews(payload?.savedViews ?? normalizeServiceSavedViews([]))
      setActiveViewId(payload?.activeViewId ?? null)
      setFavoriteIds(hasStoredFavoriteIds ? (localWorkspaceState?.favoriteIds ?? []) : (payload?.favoriteIds ?? []))
      setWatchIds(hasStoredWatchIds ? (localWorkspaceState?.watchIds ?? []) : (payload?.watchIds ?? []))
      setFontSize(payload?.uiState.fontSize ?? 11)
      setRowDensity(payload?.uiState.rowDensity ?? 8)
      setHiddenColumns(payload?.uiState.hiddenColumns ?? ['created_at', 'updated_at'])
      setActiveTab(payload?.uiState.activeTab === 'deleted' ? 'deleted' : 'active')
      setShowFilterBar(payload?.uiState.showFilterBar !== false)
      setQuickFilters(payload?.uiState.quickFilters ?? normalizeServiceQuickFilters(null))
      setGroupBy(payload?.uiState.groupBy ?? 'raw')
      setColumnLayoutState(payload?.uiState.columnLayoutState ?? [])
      setSearchTerm(payload?.uiState.searchTerm ?? '')
      return
    }

    if (hasUserSettings && !remoteWorkspaceState && !servicePreferenceMigratedRef.current) {
      servicePreferenceMigratedRef.current = true
      const localPayload = buildServiceWorkspacePreferencePayload()
      if (!localPayload) return
      const serialized = JSON.stringify(localPayload)
      servicePreferenceSyncRef.current = serialized
      apiFetch('/api/v1/settings/user/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [SERVICE_WORKSPACE_PREFERENCE_KEY]: localPayload })
      }).catch(() => {})
    }
  }, [
    buildServiceWorkspacePreferencePayload,
    hasStoredFavoriteIds,
    hasStoredWatchIds,
    hasUserSettings,
    initialWorkspaceState,
    localWorkspaceState,
    remoteWorkspaceState,
    setActiveViewId,
    setColumnLayoutState,
    setFavoriteIds,
    setSavedViews,
    setWatchIds,
  ])

  useEffect(() => {
    if (!hasUserSettings) return
    const payload = buildServiceWorkspacePreferencePayload()
    if (!payload) return
    const serialized = JSON.stringify(payload)
    if (servicePreferenceSyncRef.current === serialized) return
    if (servicePreferenceSyncTimeoutRef.current !== null) {
      window.clearTimeout(servicePreferenceSyncTimeoutRef.current)
    }
    servicePreferenceSyncTimeoutRef.current = window.setTimeout(() => {
      apiFetch('/api/v1/settings/user/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [SERVICE_WORKSPACE_PREFERENCE_KEY]: payload })
      })
        .then(() => {
          servicePreferenceSyncRef.current = serialized
        })
        .catch(() => {})
    }, 500)
    return () => {
      if (servicePreferenceSyncTimeoutRef.current !== null) {
        window.clearTimeout(servicePreferenceSyncTimeoutRef.current)
        servicePreferenceSyncTimeoutRef.current = null
      }
    }
  }, [buildServiceWorkspacePreferencePayload, hasUserSettings])

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
  const handleServiceColumnResized = useCallback((event: any) => {
    const source = event?.source || ''
    const isAutoResizeSource =
      source === 'autosizeColumns' ||
      source === 'sizeColumnsToFit' ||
      source === 'api' ||
      source === 'flex'

    if (!isAutoResizeSource) {
      clearPendingAutoSize()
      preserveExplicitColumnWidthsRef.current = true
      setTransientManualColumnWidths(true)
    }

    handleColumnResized(event)
  }, [clearPendingAutoSize, handleColumnResized, setTransientManualColumnWidths])
  
  const handleSortChanged = useCallback((e: any) => {
    const nextSortModel = e.api.getColumnState().filter((col: any) => col.sort).map((col: any) => ({ colId: col.colId, sort: col.sort }))
    setGridSortModel(nextSortModel)
  }, [])

  const handleRowId = useCallback((params: any) => {
    if (params?.data?.id != null) return String(params.data.id)
    return String(params?.node?.id ?? 'unknown-row')
  }, [])
  const openNetworkDetail = useCallback((item: any, replace: boolean = false) => {
    if (!item?.id) return
    setDetailItem(item)
    requestAnimationFrame(() => {
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('id', String(item.id))
        navigate({ search: `?${nextParams.toString()}` }, { replace })
    })
  }, [navigate, searchParams])
  const closeNetworkDetail = useCallback((replace: boolean = true) => {
    setDetailItem(null)
    setDetailDeleteConfirm(false)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('id')
    navigate({ search: nextParams.toString() ? `?${nextParams.toString()}` : '' }, { replace })
  }, [navigate, searchParams])

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
      ;(window as any).__DEBUG_NETWORK_GRID_API__ = event.api
    }
    // Immediately apply layout if we have it to prevent squish
    if (columnLayoutState.length > 0) {
      applyOperationalColumnState(event.api, columnLayoutState, preserveExplicitColumnWidths)
    }
  }, [columnLayoutState, preserveExplicitColumnWidths])

  const autoSizeServiceColumns = useCallback(() => {
    if (!gridRef.current?.api || preserveExplicitColumnWidthsRef.current) return
    clearPendingAutoSize()
    const run = () => {
      if (!gridRef.current?.api || preserveExplicitColumnWidthsRef.current) return
      autoSizeOperationalColumns({
        api: gridRef.current.api,
        skipColumnIds: Array.from(SERVICE_FIXED_WIDTH_COLUMN_IDS),
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
    autoSizeServiceColumns()
  }, [autoSizeServiceColumns])

  const getRowClass = useCallback((params: any) => {
    const rowIndex = typeof params?.node?.rowIndex === 'number' ? params.node.rowIndex : 0
    let classes = rowIndex % 2 === 0 ? 'operational-grid-row-even' : 'operational-grid-row-odd'
    if (params?.data && pendingIds.includes(params.data.id)) {
      classes += ' row-ghost opacity-40 grayscale pointer-events-none'
    }
    return classes
  }, [pendingIds])

  const { data: settingsOptions } = useQuery({ 
    queryKey: ['settings-options'], 
    queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) 
  })
  const serviceTypeOptions = useMemo(() => {
    const options = Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === 'ServiceType') : []
    return options.length > 0
      ? options.map((option: any) => ({ value: option.value, label: option.label }))
      : ['Database', 'Application', 'OS', 'Middleware', 'API'].map((value) => ({ value, label: value }))
  }, [settingsOptions])
  const environmentOptions = useMemo(() => {
    const options = Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === 'Environment') : []
    return options.length > 0
      ? options.map((option: any) => ({ value: option.value, label: option.label }))
      : ['Production', 'Stage', 'Development', 'Lab'].map((value) => ({ value, label: value }))
  }, [settingsOptions])
  const purchaseTypeOptions = useMemo(() => SERVICE_PURCHASE_TYPES.map((value) => ({ value, label: value })), [])

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
    return getAnchoredFloatingStyle({ rect: button.getBoundingClientRect(), width, height, zIndex, offset: 12 })
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
    setFavoriteIds((current) => {
      const normalized = normalizeServiceIdList(current)
      return normalized.includes(id) ? normalized.filter((i) => i !== id) : [...normalized, id]
    })
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

  const { handleRowDoubleClicked } = useOperationalRowInteractions({
    onRowDoubleClick: (item: any) => openNetworkDetail(item),
    pendingIds
  })

  const renderPrimaryRowActions = (item: any) => {
    if (!item?.id) return null
    const isPending = pendingIds.includes(item.id)
    return (
      <div className={isPending ? 'opacity-20 grayscale pointer-events-none' : ''}>
        {renderOperationalActionButtons(
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                openNetworkDetail(item)
              }}
              title="Open details"
              className="text-blue-400 hover:bg-blue-400/10"
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
              className="text-emerald-400 hover:bg-emerald-400/10"
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              onClick={(event: any) => openRowActionMenu(event, item)}
              title="More actions"
              className="row-action-trigger row-action-menu-container text-slate-400 hover:bg-slate-400/10 hover:text-white"
            >
              <MoreVertical size={13} />
            </button>
          </>
        )}
      </div>
    )
  }

  const handleExportCSV = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `SysGrid_Services_${new Date().toISOString().split('T')[0]}.csv`,
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

  const buildCurrentViewConfig = () =>
    sanitizeServiceViewConfig({
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
    const config = sanitizeServiceViewConfig(nextView.config)
    setFontSize(config.fontSize ?? 11)
    setRowDensity(config.rowDensity ?? 8)
    setHiddenColumns(config.hiddenColumns ?? [])
    setGroupBy(config.groupBy ?? 'raw')
    setShowFilterBar(config.showFilterBar ?? true)
    setColumnLayoutState(config.columnLayoutState ?? [])
    setTransientManualColumnWidths(false)
    setSearchTerm(config.quickFilter ?? '')
    setQuickFilters(config.quickFilters ?? { status: [] as string[], environment: [] as string[], service_type: [] as string[], device_name: [] as string[] })
    setGridFilterModel(config.filterModel ?? {})
    setGridSortModel((config.sortModel && config.sortModel.length > 0) ? config.sortModel : [{ colId: 'favorite', sort: 'desc' }])
    setActiveViewId(viewId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SERVICE_ACTIVE_VIEW_KEY, viewId)
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
      window.localStorage.setItem(SERVICE_VIEW_STORAGE_KEY, JSON.stringify(nextViews))
      window.localStorage.setItem(SERVICE_ACTIVE_VIEW_KEY, viewId)
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
      window.localStorage.setItem(SERVICE_VIEW_STORAGE_KEY, JSON.stringify(nextViews))
      window.localStorage.setItem(SERVICE_ACTIVE_VIEW_KEY, nextId)
    }
    showWorkspaceToast(`Saved new view ${trimmed}`)
  }

  const applySystemDefault = () => {
    setActiveViewId(null)
    setTransientManualColumnWidths(false)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SERVICE_ACTIVE_VIEW_KEY)
    }
    setFontSize(11)
    setRowDensity(8)
    setHiddenColumns([])
    setGroupBy('raw')
    setShowFilterBar(true)
    setColumnLayoutState([])
    setSearchTerm('')
    setQuickFilters({ status: [] as string[], environment: [] as string[], service_type: [] as string[], device_name: [] as string[] })
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
             window.localStorage.removeItem(SERVICE_ACTIVE_VIEW_KEY)
          }
        }
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SERVICE_VIEW_STORAGE_KEY, JSON.stringify(nextViews))
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
          zIndex: 1100,
          offset: 12
        }))
      }
      if (showViewsMenu && viewsMenuButtonRef.current) {
        setViewsMenuStyle(getAnchoredFloatingStyle({
          rect: viewsMenuButtonRef.current.getBoundingClientRect(),
          width: 380,
          height: 460,
          zIndex: 1100,
          offset: 12
        }))
      }
      if (showBulkMenu && bulkMenuButtonRef.current) {
        setBulkMenuStyle(positionUtilityWindow(bulkMenuButtonRef.current, 340, BULK_MENU_MAX_HEIGHT, 1105))
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

  const { data: allItems, isLoading } = useQuery({
    queryKey: ['logical-services'],
    queryFn: async () => (await apiFetch('/api/v1/logical-services/?include_deleted=true')).json()
  })

  const lifecycleCounts = useMemo(() => {
    if (!Array.isArray(allItems)) return { existing: 0, archived: 0 }
    return {
      existing: allItems.filter((item: any) => !item.is_deleted).length,
      archived: allItems.filter((item: any) => item.is_deleted).length,
    }
  }, [allItems])

  useEffect(() => {
    if (allItems) {
       // @ts-ignore
       window.__DEBUG_ALL_ITEMS__ = allItems
    }
  }, [allItems])

  const items = useMemo(() => {
    if (!allItems || !Array.isArray(allItems)) return []
    return allItems
      .map((service: any) => normalizeServiceRecord(service))
      .filter((item: any) => activeTab === 'active' ? !item.is_deleted : item.is_deleted)
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
    { value: 'status', label: 'Status' },
    { value: 'environment', label: 'Environment' },
    { value: 'service_type', label: 'Type' },
    { value: 'device_name', label: 'Host' }
  ]

  const displayedItems = useMemo(() => {
    const filtered = items.filter((item: any) => {
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase()
        const haystack = [
          String(item.id || ''),
          item.name,
          item.service_type,
          item.device_name,
          item.environment,
          item.version,
          item.status,
          item.purchase_type,
          item.installation_date,
          item.manufacturer,
          item.supplier,
          item.purpose,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        
        if (!haystack.includes(query)) return false
      }
      if (quickFilters.status.length > 0 && !quickFilters.status.includes(item.status)) return false
      if (quickFilters.environment.length > 0 && !quickFilters.environment.includes(item.environment)) return false
      if (quickFilters.service_type.length > 0 && !quickFilters.service_type.includes(item.service_type)) return false
      if (quickFilters.device_name.length > 0 && !quickFilters.device_name.includes(item.device_name)) return false
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
      autoSizeServiceColumns()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [autoSizeServiceColumns, displayedItemsInOrder, fontSize, hiddenColumns, isIntelligenceExpanded])

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
    const field = expandedBulkSection
    if (!field) return null
    const nextValue = bulkDraft[field]
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
    if (!idParam || !Array.isArray(allItems)) return
    const target = allItems.find((item: any) => String(item.id) === idParam)
    if (!target) {
      setDetailItem((current: any) => (current && String(current.id) === idParam ? null : current))
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('id')
      navigate({ search: nextParams.toString() ? `?${nextParams.toString()}` : '' }, { replace: true })
      return
    }
    setActiveTab(target.is_deleted ? 'deleted' : 'active')
    setDetailItem(normalizeServiceRecord(target))
  }, [allItems, idParam, navigate, searchParams])

  useEffect(() => {
    selectionAnchorRef.current = null
  }, [activeTab, items])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SERVICE_UI_STATE_KEY, JSON.stringify({
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
  }, [displayedItems, selectedIds])

  useEffect(() => {
    if (selectedIds.length === 0) {
      setShowBulkMenu(false)
    }
  }, [selectedIds.length])

  useEffect(() => {
    if (typeof window === 'undefined') return
    ;(window as any).__DEBUG_SET_NETWORK_COLUMN_WIDTH__ = (colId: string, width: number) => {
      if (!gridRef.current?.api) return
      gridRef.current.api.applyColumnState({
        state: [{ colId, width }],
        applyOrder: false,
      })
      setTransientManualColumnWidths(true)
      syncColumnLayoutState(gridRef.current.api, true)
    }
    return () => {
      delete (window as any).__DEBUG_SET_NETWORK_COLUMN_WIDTH__
    }
  }, [setTransientManualColumnWidths, syncColumnLayoutState])

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return
      const current = readServiceUiState() || {}
      window.localStorage.setItem(SERVICE_UI_STATE_KEY, JSON.stringify({
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
      const res = await apiFetch('/api/v1/logical-services/bulk-action', {
        method: 'POST',
        body: JSON.stringify({
          ids: undo.ids,
          action: undo.action === 'restore' ? 'restore' : 'delete',
        })
      })
      if (!res.ok) throw new Error(await res.text())
    }
    lastUndoRef.current = null
    queryClient.invalidateQueries({ queryKey: ['logical-services'] })
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
      let res
      if (action === 'update') {
        const directPayload = {
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.service_type ? { service_type: payload.service_type } : {}),
          ...(payload.environment ? { environment: payload.environment } : {}),
        }
        res = await apiFetch('/api/v1/logical-services/bulk-action', {
          method: 'POST',
          body: JSON.stringify({ ids: idsToUse, action: 'update', payload: directPayload })
        })
      } else if (action === 'restore') {
        res = await apiFetch('/api/v1/logical-services/bulk-action', {
          method: 'POST',
          body: JSON.stringify({ ids: idsToUse, action: 'restore' })
        })
      } else if (action === 'purge') {
        res = await apiFetch('/api/v1/logical-services/bulk-action', {
          method: 'POST',
          body: JSON.stringify({ ids: idsToUse, action: 'delete' })
        })
      } else {
        res = await apiFetch('/api/v1/logical-services/bulk-action', {
          method: 'POST',
          body: JSON.stringify({ ids: idsToUse, action: 'delete' })
        })
      }
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      return { result, action, payload, idsToUse, previousSnapshots }
    },
    onSuccess: ({ result, action, payload, idsToUse, previousSnapshots }: any) => {
      queryClient.invalidateQueries({ queryKey: ['logical-services'] })
      setShowBulkMenu(false)
      setExpandedBulkSection(null)
      setBulkDraft({ status: '', service_type: '', environment: '' })
      setIsBulkStatusOpen(false)
      setIsBulkSeverityOpen(false)
      setIsBulkNotifyOpen(false)
      
      const changedCount = Number(result?.changed ?? idsToUse.length)
      if (changedCount <= 0) {
        lastUndoRef.current = null
        return
      }

      if (action === 'delete') lastUndoRef.current = { mode: 'bulk', ids: idsToUse, action: 'restore' }
      else if (action === 'restore') lastUndoRef.current = { mode: 'bulk', ids: idsToUse, action: 'delete' }
      else lastUndoRef.current = null

      if (lastUndoRef.current) {
        showWorkspaceToast(result?.summary || 'Updated service records', {
          onRevert: async () => {
            try {
              await runUndo()
              showWorkspaceToast('Reverted service operation', { type: 'success' })
            } catch (error: any) {
              showWorkspaceToast(error.message || 'Undo failed', { type: 'error' })
            }
          }
        })
      } else {
        showWorkspaceToast(result?.summary || 'Updated service records', { type: 'success' })
      }
    },
    onError: (e: any) => showWorkspaceToast(`Operation failed: ${e.message}`, { type: 'error' })
  })

  const columnDefs = useMemo(() => {
    const columnConfigs: OperationalColumnConfig[] = [
      {
        kind: 'plain',
        field: 'device_name',
        headerName: 'Host',
        width: 180,
        hide: hiddenColumns.includes('device_name'),
      },
      {
        kind: 'identity',
        field: 'name',
        headerName: 'Name',
        width: 220,
        hide: hiddenColumns.includes('name'),
      },
      {
        kind: 'plain',
        field: 'service_type',
        headerName: 'Type',
        width: 140,
        hide: hiddenColumns.includes('service_type'),
      },
      {
        kind: 'plain',
        field: 'environment',
        headerName: 'Environment',
        width: 140,
        hide: hiddenColumns.includes('environment'),
      },
      {
        kind: 'plain',
        field: 'version',
        headerName: 'Version',
        width: 120,
        hide: hiddenColumns.includes('version'),
      },
      {
        kind: 'mappedBadge',
        field: 'status',
        headerName: 'Status',
        width: 120,
        fontSize,
        hide: hiddenColumns.includes('status'),
        knownValues: STATUSES.map((status) => status.label),
        colorMap: Object.fromEntries(STATUSES.map((status) => [status.label, status.color])),
      },
      {
        kind: 'prose',
        field: 'purpose',
        headerName: 'Purpose',
        width: 240,
        proseMode: 'compact',
        hide: hiddenColumns.includes('purpose'),
      },
      {
        kind: 'plain',
        field: 'manufacturer',
        headerName: 'Manufacturer',
        width: 160,
        hide: hiddenColumns.includes('manufacturer'),
      },
      {
        kind: 'plain',
        field: 'supplier',
        headerName: 'Supplier',
        width: 160,
        hide: hiddenColumns.includes('supplier'),
      },
      {
        kind: 'plain',
        field: 'purchase_type',
        headerName: 'License Type',
        width: 150,
        hide: hiddenColumns.includes('purchase_type'),
      },
      {
        kind: 'plain',
        field: 'cost',
        headerName: 'Cost',
        width: 120,
        formatValue: (value, params) => value != null ? `${params.data?.currency || 'USD'} ${value}` : 'N/A',
        hide: hiddenColumns.includes('cost'),
      },
      {
        kind: 'plain',
        field: 'secret_count',
        headerName: 'Secrets',
        width: 100,
        formatValue: (value) => String(value ?? 0),
        hide: hiddenColumns.includes('secret_count'),
      },
      {
        kind: 'date',
        field: 'installation_date',
        headerName: 'Deployed',
        width: 160,
        hide: hiddenColumns.includes('installation_date'),
      },
      {
        kind: 'date',
        field: 'created_at',
        headerName: 'Created',
        width: OPERATIONAL_GRID_WIDTHS.date,
        hide: hiddenColumns.includes('created_at'),
      },
      {
        kind: 'date',
        field: 'updated_at',
        headerName: 'Updated',
        width: OPERATIONAL_GRID_WIDTHS.date,
        hide: hiddenColumns.includes('updated_at'),
      },
      {
        kind: 'action',
        width: OPERATIONAL_GRID_WIDTHS.standardAction,
        renderActions: renderPrimaryRowActions,
      },
    ]

    return buildOperationalGridColumnDefinitions({
      utilityColumnsConfig: {
        includeRecentChange: true,
        includeFavorite: true,
        includeWatch: true,
        isIntelligenceExpanded,
        isRecentChange,
        onToggleFavorite: toggleFavorite,
        onToggleWatch: toggleWatch,
        itemLabel: 'service',
      },
      columnConfigs,
      columnLayoutState,
      preserveExplicitColumnWidths,
    })
  }, [
    columnLayoutState,
    fontSize,
    hiddenColumns,
    isIntelligenceExpanded,
    isRecentChange,
    preserveExplicitColumnWidths,
    renderPrimaryRowActions,
    toggleFavorite,
    toggleWatch,
  ]) as any

  const gridContext = useMemo(() => ({ favoriteIds, watchIds }), [favoriteIds, watchIds])
  const serviceGridRuntime = useMemo(() => ({
    preserveExplicitColumnWidths,
    handleGridReady,
    handleColumnResized: handleServiceColumnResized,
    handleColumnMoved,
    handleDragStopped,
    handleColumnPinned,
    handleColumnVisible,
    handleFilterChanged,
    handleSortChanged,
  }), [
    preserveExplicitColumnWidths,
    handleGridReady,
    handleServiceColumnResized,
    handleColumnMoved,
    handleDragStopped,
    handleColumnPinned,
    handleColumnVisible,
    handleFilterChanged,
    handleSortChanged,
  ])
  const serviceRowInteractions = useMemo(() => ({
    handleRowClicked,
    handleRowDoubleClicked,
  }), [handleRowClicked, handleRowDoubleClicked])
  const serviceContextMenu = useMemo(() => ({
    handleCellContextMenu,
  }), [handleCellContextMenu])
  const rowMenuItem = rowActionMenu?.item ?? null

  return (
   <OperationalWorkspaceShell
      className="overflow-hidden"
      header={{
        eyebrow: "Services",
        title: (
          <div className="flex items-center gap-3">
            <Activity className="text-blue-500" />
            <span>Services</span>
          </div>
        ),
        subtitle: "Centralized logical service registry and operational ownership view",
        actions: (
          <HeaderScopeSwitch
            label="Service Scope"
            summary={`${lifecycleCounts.existing} active · ${lifecycleCounts.archived} deleted`}
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
        ),
      }}
      toolbarSearch={(
        <ToolbarSearch
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search services, hosts, or metadata..."
        />
      )}
      toolbarControls={(
        <>
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
            <ToolbarButton onClick={() => setShowImportModal(true)} title="Import service rows">
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
      )}
      secondaryToolbar={showFilterBar ? (
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
            value={quickFilters.environment}
            onChange={(val) => setQuickFilters((current) => ({ ...current, environment: val }))}
            options={Array.from(new Set((items || []).map((item: any) => item.environment).filter(Boolean))).sort().map((value) => ({ value, label: value }))}
            label="Environment Filter"
            placeholder="All environments"
          />
          <AppDropdown
            multi
            value={quickFilters.service_type}
            onChange={(val) => setQuickFilters((current) => ({ ...current, service_type: val }))}
            options={Array.from(new Set((items || []).map((item: any) => item.service_type).filter(Boolean))).sort().map((value) => ({ value, label: value }))}
            label="Type Filter"
            placeholder="All types"
          />
          <AppDropdown
            multi
            value={quickFilters.device_name}
            onChange={(val) => setQuickFilters((current) => ({ ...current, device_name: val }))}
            options={Array.from(new Set((items || []).map((item: any) => item.device_name).filter(Boolean))).sort().map((value) => ({ value, label: value }))}
            label="Host Filter"
            placeholder="All hosts"
          />
        </div>
      ) : null}
      toolbarActions={(
        <>
          {SERVICE_SUPPORTS_COMPARE && (
            <ToolbarButton
              onClick={openCompare}
              disabled={selectedIds.length < 2 || selectedIds.length > 5}
              active={compareOpen}
              title="Compare selected services"
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
            + Add Service
          </ToolbarButton>
        </>
      )}
      filterChips={[
        ...activeFilterChips,
        ...(activeFilterChips.length > 0
          ? [{
              id: 'clear-all',
              label: 'Clear All',
              onRemove: () => {
                setSearchTerm('')
                setGridFilterModel({})
                setQuickFilters({ status: [] as string[], environment: [] as string[], service_type: [] as string[], device_name: [] as string[] })
                gridRef.current?.api?.setFilterModel({})
              }
            }]
          : []),
      ]}
      floatingPanels={
        <>
          <OperationalDisplayPanel
            isOpen={showDisplayMenu}
            panelStyle={displayMenuStyle}
            onClose={() => setShowDisplayMenu(false)}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            rowDensity={rowDensity}
            onRowDensityChange={setRowDensity}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOptions={groupOptions}
            columns={columnDefs}
            hiddenColumns={hiddenColumns}
            onToggleColumn={(field) => {
              if (hiddenColumns.includes(field)) {
                setHiddenColumns(hiddenColumns.filter((entry) => entry !== field))
              } else {
                setHiddenColumns([...hiddenColumns, field])
              }
            }}
          />

          <OperationalSavedViewsPanel
            isOpen={showViewsMenu}
            panelStyle={viewsMenuStyle}
            entityLabel="Services"
            onClose={() => setShowViewsMenu(false)}
            activeViewId={activeViewId}
            currentViewName={activeViewId ? savedViews.find((view) => view.id === activeViewId)?.name || 'Unsaved working view' : 'Unsaved working view'}
            newViewName={newViewName}
            onNewViewNameChange={setNewViewName}
            onCreateView={createViewFromCurrent}
            onApplySystemDefault={applySystemDefault}
            savedViews={savedViews}
            defaultViewIds={DEFAULT_SERVICE_VIEW_IDS}
            onApplyView={applySavedView}
            onOverwriteView={saveCurrentToView}
            onDeleteView={deleteView}
            describeView={(view) => view.config?.groupBy && view.config.groupBy !== 'raw'
              ? `Grouped by ${groupOptions.find((option) => option.value === view.config.groupBy)?.label || view.config.groupBy}`
              : 'Raw service table'}
          />

          <OperationalAnchoredPanel
            isOpen={showBulkMenu && !!bulkMenuStyle.top}
            panelKey="bulk-menu"
            style={bulkMenuStyle}
            className="bulk-menu-container"
            yOffset={10}
          >
            <WorkspaceFloatingPanel kind="context" className="max-h-[560px] overflow-y-auto custom-scrollbar p-3">
              <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-400">Bulk actions</p>
                <p className="pt-1 text-[12px] font-semibold text-slate-100">{selectedIds.length} services selected</p>
              </div>

              {activeTab === 'deleted' ? (
                <button
                  onClick={() => bulkMutation.mutate({ action: 'restore' })}
                  disabled={bulkMutation.isPending}
                  className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left transition-all hover:bg-emerald-500/15 disabled:opacity-50"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                    {bulkMutation.isPending ? <Activity size={10} className="inline animate-spin" /> : 'Restore Selection'}
                  </p>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowBulkEditModal(true)}
                    className="w-full rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-left transition-all hover:bg-blue-500/15"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Bulk Edit Table</p>
                    <p className="pt-1 text-[10px] font-semibold text-slate-400">Edit selected services row by row using safe columns only.</p>
                  </button>

                  <WorkspaceFlyoutActionCard
                    title="Set Status"
                    active={expandedBulkSection === 'status'}
                    onClick={() => setExpandedBulkSection(expandedBulkSection === 'status' ? null : 'status')}
                  />
                  {expandedBulkSection === 'status' && (
                    <WorkspaceFlyoutDropdownEditor
                      value={bulkDraft.status}
                      onChange={(value) => setBulkDraft((current) => ({ ...current, status: value }))}
                      options={STATUSES.filter((status) => status.value !== 'Deleted').map((status) => ({ value: status.value, label: status.label }))}
                      placeholder="Choose status"
                      actionLabel="Apply Status"
                      onApply={() => bulkMutation.mutate({ action: 'update', payload: { status: bulkDraft.status } })}
                      disabled={!bulkDraft.status || bulkMutation.isPending}
                    />
                  )}

                  <WorkspaceFlyoutActionCard
                    title="Set Type"
                    active={expandedBulkSection === 'service_type'}
                    onClick={() => setExpandedBulkSection(expandedBulkSection === 'service_type' ? null : 'service_type')}
                  />
                  {expandedBulkSection === 'service_type' && (
                    <WorkspaceFlyoutDropdownEditor
                      value={bulkDraft.service_type}
                      onChange={(value) => setBulkDraft((current) => ({ ...current, service_type: value }))}
                      options={serviceTypeOptions}
                      placeholder="Choose type"
                      actionLabel="Apply Type"
                      onApply={() => bulkMutation.mutate({ action: 'update', payload: { service_type: bulkDraft.service_type } })}
                      disabled={!bulkDraft.service_type || bulkMutation.isPending}
                    />
                  )}

                  <WorkspaceFlyoutActionCard
                    title="Set Environment"
                    active={expandedBulkSection === 'environment'}
                    onClick={() => setExpandedBulkSection(expandedBulkSection === 'environment' ? null : 'environment')}
                  />
                  {expandedBulkSection === 'environment' && (
                    <WorkspaceFlyoutDropdownEditor
                      value={bulkDraft.environment}
                      onChange={(value) => setBulkDraft((current) => ({ ...current, environment: value }))}
                      options={environmentOptions}
                      placeholder="Choose environment"
                      actionLabel="Apply Environment"
                      onApply={() => bulkMutation.mutate({ action: 'update', payload: { environment: bulkDraft.environment } })}
                      disabled={!bulkDraft.environment || bulkMutation.isPending}
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
                disabled={bulkMutation.isPending}
                className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                  bulkDeleteConfirm
                    ? 'border-rose-500 bg-rose-600 animate-pulse'
                    : 'border-rose-900/70 bg-rose-950/70 hover:bg-rose-950'
                } disabled:opacity-50`}
              >
                <p className={`text-[10px] font-semibold ${bulkDeleteConfirm ? 'text-white' : 'text-rose-300'}`}>
                  {bulkMutation.isPending ? <Activity size={10} className="inline animate-spin" /> : (
                    bulkDeleteConfirm
                      ? (activeTab === 'deleted' ? 'Confirm Permanent Purge?' : 'Confirm De-activation?')
                      : (activeTab === 'deleted' ? 'Purge Selection' : 'De-activate Selection')
                  )}
                </p>
              </button>
            </WorkspaceFloatingPanel>
          </OperationalAnchoredPanel>

          <OperationalAnchoredPanel
            isOpen={Boolean(rowActionMenu && rowMenuItem)}
            panelKey="row-action-menu"
            style={rowActionMenu?.style || {}}
            className="row-action-menu-container"
          >
            {rowActionMenu && rowMenuItem ? (
            <WorkspaceFloatingPanel kind="context" className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold text-slate-400">Row actions</p>
                    <p className="pt-1 text-[11px] font-semibold text-slate-100">ID {rowMenuItem.id} · {rowMenuItem.device_name || 'No host linked'}</p>
                    <p className="truncate pt-1 text-[12px] text-slate-300">{rowMenuItem.title}</p>
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
                        if (!rowMenuItem?.id) return
                        openNetworkDetail(rowMenuItem)
                        setRowActionMenu(null)
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-blue-400 transition-all hover:border-blue-500/30 hover:bg-blue-600/10 active:scale-95"
                    >
                      <Maximize2 size={14} />
                      Details
                    </button>
                    <button
                      onClick={() => {
                        if (!rowMenuItem?.id) return
                        setEditingItem(rowMenuItem)
                        setIsFormOpen(true)
                        setRowActionMenu(null)
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-600/10 active:scale-95"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                  </div>

                  <div className="mx-2 my-2 h-px bg-slate-800" />
                {activeTab === 'deleted' && (
                  <button
                    onClick={() => {
                      if (!rowMenuItem?.id) return
                      bulkMutation.mutate({ action: 'restore', ids: [rowMenuItem.id] })
                      setRowActionMenu(null)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 transition-all hover:bg-emerald-950/80"
                  >
                    <Undo2 size={14} />
                    Restore Service
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!rowMenuItem?.id) return
                    if (rowDeleteConfirmId !== rowMenuItem.id) {
                      setRowDeleteConfirmId(rowMenuItem.id)
                      return
                    }
                    bulkMutation.mutate({ action: activeTab === 'active' ? 'delete' : 'purge', ids: [rowMenuItem.id] })
                    setRowActionMenu(null)
                    setRowDeleteConfirmId(null)
                  }}
                  onMouseLeave={() => setRowDeleteConfirmId(null)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                    rowDeleteConfirmId === rowMenuItem.id
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'text-rose-300 hover:bg-rose-950/80'
                  }`}
                >
                  <Trash2 size={14} />
                    {rowDeleteConfirmId === rowMenuItem.id
                    ? (activeTab === 'active' ? 'Confirm Delete?' : 'Confirm Purge?')
                    : (activeTab === 'active' ? 'Delete' : 'Purge')}
                </button>
                </div>
            </WorkspaceFloatingPanel>
            ) : null}
          </OperationalAnchoredPanel>
        </>
      }
    >

      {groupBy === 'raw' ? (
	        <OperationalDataGrid
            gridRef={gridRef}
            rows={displayedItemsInOrder || []}
            columnDefs={columnDefs}
            runtime={serviceGridRuntime}
            rowInteractions={serviceRowInteractions}
            contextMenu={serviceContextMenu}
            fontSize={fontSize}
            rowDensity={rowDensity}
            context={gridContext}
            getRowId={handleRowId}
            onSelectionChanged={(e) => handleSelectionChanged(e, 'raw')}
            getRowClass={getRowClass}
            onFirstDataRendered={handleGridDataUpdated}
            onRowDataUpdated={handleGridDataUpdated}
            noRowsLabel="No service data found"
            loading={isLoading}
            loadingIcon={<RefreshCcw size={32} className="text-blue-400 animate-spin" />}
            loadingLabel={<p className="text-[10px] font-semibold text-blue-400">Scanning service registry...</p>}
          />
      ) : (
        <OperationalGroupedGridView
          summary={(
            <div>
              <p className="text-[10px] font-semibold text-slate-400">Grouped service registry</p>
              <p className="pt-1 text-[12px] font-semibold text-slate-100">Sorted by {groupOptions.find((option) => option.value === groupBy)?.label || groupBy}</p>
            </div>
          )}
          actions={(
            <>
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
            </>
          )}
          sections={(
            <>
          {groupedSections.map((section) => {
            const isCollapsed = collapsedGroups[section.key]
            const selectedCount = section.items.filter((item: any) => selectedIds.includes(item.id)).length
            return (
              <OperationalGroupedGridSection
                key={section.key}
                labelMeta={<span className="text-[9px] font-semibold text-blue-400">{groupOptions.find((option) => option.value === groupBy)?.label}</span>}
                label={section.label}
                count={section.items.length}
                countLabel="services"
                selectedCount={selectedCount}
                collapsed={isCollapsed}
                onToggle={() => setCollapsedGroups((current) => ({ ...current, [section.key]: !current[section.key] }))}
              >
                {!isCollapsed ? (
                  <OperationalDataGrid
                      rows={section.items}
                      columnDefs={columnDefs}
                      runtime={serviceGridRuntime}
                      rowInteractions={serviceRowInteractions}
                      contextMenu={serviceContextMenu}
                      fontSize={fontSize}
                      rowDensity={rowDensity}
                      context={gridContext}
                      getRowId={handleRowId}
                      onSelectionChanged={(e) => handleSelectionChanged(e, section.key)}
                      getRowClass={getRowClass}
                      onFirstDataRendered={handleGridDataUpdated}
                      onRowDataUpdated={handleGridDataUpdated}
                      noRowsLabel="No service data found"
                      height={`${Math.min(600, section.items.length * (fontSize + rowDensity + 5) + 40)}px`}
                    />
                ) : null}
              </OperationalGroupedGridSection>
            )
          })}
            </>
          )}
        />
      )}

      <BulkActionModals
        isStatusOpen={isBulkStatusOpen}
        isSeverityOpen={isBulkSeverityOpen}
        isNotifyOpen={isBulkNotifyOpen}
        onClose={() => { setIsBulkStatusOpen(false); setIsBulkSeverityOpen(false); setIsBulkNotifyOpen(false); }}
        onApply={(action, val) => bulkMutation.mutate({ action: 'update', payload: { [action]: val } })}
      />

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => { confirmModal.onConfirm?.(); setConfirmModal((prev: any) => ({ ...prev, isOpen: false })); }}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      <AnimatePresence>
        {isFormOpen && (
          <ServiceRecordForm
            key={`service-form-${editingItem?.id || 'new'}`}
            item={editingItem}
            devices={devices}
            options={settingsOptions || []}
            onClose={() => {
              setIsFormOpen(false)
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['logical-services'] })
              setIsFormOpen(false)
            }}
          />
        )}
        {detailItem && (
          <ServiceRecordDetailModal
            key={`service-detail-${detailItem.id}`}
            item={detailItem}
            onClose={() => closeNetworkDetail()}
            onEdit={(monitor: any) => { closeNetworkDetail(); setEditingItem(monitor); setIsFormOpen(true); }}
            onDelete={(monitor: any) => {
              if (!detailDeleteConfirm) {
                setDetailDeleteConfirm(true)
                return
              }
              bulkMutation.mutate({ action: activeTab === 'active' ? 'delete' : 'purge', ids: [monitor.id] })
              closeNetworkDetail()
            }}
            onOpenAsset={(deviceId: number) => navigate(`/asset?id=${deviceId}`)}
            deleteConfirm={detailDeleteConfirm}
            options={settingsOptions || []}
            devices={devices || []}
          />
        )}
        {compareOpen && <CompareServicesModal key={`services-compare-${compareItems.filter(Boolean).map((item) => item.id).join('-') || 'empty'}`} items={compareItems} onClose={() => setCompareOpen(false)} />}
        {showBulkEditModal && (
          <BulkEditTableModal
            key={`services-bulk-edit-${selectedItems.filter(Boolean).map((item) => item.id).join('-') || 'empty'}`}
            items={selectedItems}
            linkPurposeOptions={serviceTypeOptions}
            cableTypeOptions={purchaseTypeOptions}
            onClose={() => setShowBulkEditModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['logical-services'] })
              setShowBulkEditModal(false)
            }}
          />
        )}
        <OperationalImportModal
          key="services-import-modal"
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          tableName="logical_services"
          displayName="Services"
        />
        <ConfigRegistryModal
            key="services-config-registry"
            isOpen={showRegistry}
            onClose={() => setShowRegistry(false)}
            title="Service Enumerations"
            sections={[
                { title: "Service Types", category: "ServiceType", icon: Layers },
                { title: "Environments", category: "Environment", icon: Globe },
                { title: "Statuses", category: "Status", icon: Bell },
            ]}
        />
      </AnimatePresence>
    </OperationalWorkspaceShell>
  )
}

function CompareServicesModal({ items, onClose }: any) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [isMaximized, setIsMaximized] = useState(false)

  const fields = useMemo(() => [
    { label: 'Status', getValue: (item: any) => item.status || 'Unknown' },
    { label: 'Host', getValue: (item: any) => item.device_name || 'Floating' },
    { label: 'Type', getValue: (item: any) => item.service_type || item.type || 'N/A' },
    { label: 'Environment', getValue: (item: any) => item.environment || 'N/A' },
    { label: 'Version', getValue: (item: any) => item.version || 'N/A' },
    { label: 'Manufacturer', getValue: (item: any) => item.manufacturer || 'N/A' },
    { label: 'Supplier', getValue: (item: any) => item.supplier || 'N/A' },
    { label: 'Vault Entries', getValue: (item: any) => String(item.secret_count ?? 0) },
    { label: 'Cost', getValue: (item: any) => item.cost != null ? `${item.currency || 'USD'} ${item.cost}` : 'N/A' },
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
      title="Compare Services"
      subtitle={`Temporal Variance Analysis · Comparing ${items.length} service records for semantic drift`}
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

function BulkActionModals({ isStatusOpen, isSeverityOpen, isNotifyOpen, onClose, onApply }: any) {
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
            title="Update Type"
            subtitle="Recalibrate the connection type for selection."
            icon={<Shield size={20} />}
            footerRight={
              <div className="flex items-center gap-3">
                <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
                <ToolbarButton 
                  disabled={!val} 
                  onClick={() => onApply('link_type', val)} 
                  variant="danger"
                >
                  Apply Type
                </ToolbarButton>
              </div>
            }
          >
            <div className="p-2">
              <AppDropdown
                value={val}
                onChange={v => setVal(v)}
                options={NETWORK_LINK_TYPES.map((value) => ({ value, label: value }))}
                placeholder="Select Type..."
                label="Target Type"
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
            title="Update Direction"
            subtitle="Reroute the connection direction for selection."
            icon={<Bell size={20} />}
            footerRight={
              <div className="flex items-center gap-3">
                <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
                <ToolbarButton 
                  disabled={!val} 
                  onClick={() => onApply('direction', val)} 
                  variant="primary"
                >
                  Apply Direction
                </ToolbarButton>
              </div>
            }
          >
            <div className="p-2">
              <AppDropdown
                value={val}
                onChange={v => setVal(v)}
                options={NETWORK_DIRECTIONS.map((value) => ({ value, label: value }))}
                placeholder="Select Direction..."
                label="Target Direction"
              />
            </div>
          </WorkspaceModal>
        )
    }

    return null;
}

function BulkEditTableModal({ items, linkPurposeOptions, cableTypeOptions, onClose, onSuccess }: any) {
  const [rows, setRows] = useState(() => items.map((item: any) => ({
    id: item.id,
    title: item.name || `Service ${item.id}`,
    status: item.status || '',
    link_type: item.service_type || item.type || item.category || '',
    direction: item.environment || '',
    farm: item.device_name || '',
    purpose: item.purpose || '',
    speed_gbps: item.cost ?? '',
    unit: item.currency || 'USD',
    cable_type: item.purchase_type || '',
    request_link: item.installation_date ? String(item.installation_date).split('T')[0] : '',
    is_active: item.is_active !== false,
  })))
  const [isMaximized, setIsMaximized] = useState(false)
  const initialDirtySnapshot = useMemo(() => JSON.stringify(rows), [])
  const isDirty = useMemo(() => JSON.stringify(rows) !== initialDirtySnapshot, [rows, initialDirtySnapshot])

  const mergeOptionsWithCurrentValue = useCallback((options: Array<{ value: string; label: string }>, value: string) => {
    const current = value ? [{ value, label: value }] : []
    return Array.from(new Map([...(options || []), ...current].map((option: any) => [option.value, option])).values())
  }, [])

  const updateRow = (rowId: number, field: string, value: any) => {
    setRows((current: any[]) => current.map((row: any) => row.id === rowId ? { ...row, [field]: value } : row))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      for (const row of rows) {
        const payload = {
          status: row.status,
          service_type: row.link_type || 'Database',
          environment: row.direction || 'Production',
          purpose: row.purpose || null,
          cost: row.speed_gbps === '' ? 0 : Number(row.speed_gbps),
          currency: row.unit || 'USD',
          purchase_type: row.cable_type || 'One-time',
          installation_date: row.request_link || null,
        }
        const res = await apiFetch(`/api/v1/logical-services/${row.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
        await res.json()
      }
    },
    onSuccess: () => {
      showWorkspaceToast(`Updated ${rows.length} service${rows.length === 1 ? '' : 's'}`)
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
      isDirty={isDirty}
      dirtyConfirmTitle="Discard Bulk Service Changes?"
      dirtyConfirmMessage="You have unsaved bulk service changes. Close this window and discard them?"
      title="Bulk Edit Services"
      subtitle="Safe table-based edits for selected services."
      icon={<Edit2 size={20} />}
      footerRight={
        <div className="flex items-center gap-3">
          <ToolbarButton 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending} 
            variant="primary"
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
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/20 custom-scrollbar">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-slate-950/90 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Service</th>
                <th className="min-w-[140px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Status</th>
                <th className="min-w-[160px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Type</th>
                <th className="min-w-[160px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Environment</th>
                <th className="min-w-[180px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Host</th>
                <th className="min-w-[220px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Purpose</th>
                <th className="min-w-[120px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Cost</th>
                <th className="min-w-[110px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Currency</th>
                <th className="min-w-[160px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">License Type</th>
                <th className="min-w-[220px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Deployed</th>
                <th className="min-w-[120px] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row: any) => (
                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-200">{row.title}</td>
                  <td className="px-2 py-2"><AppDropdown value={row.status} onChange={(value) => updateRow(row.id, 'status', value)} options={STATUSES.filter((status) => status.value !== 'Deleted').map((status) => ({ value: status.value, label: status.label }))} placeholder="Status" /></td>
                  <td className="px-2 py-2"><AppDropdown value={row.link_type} onChange={(value) => updateRow(row.id, 'link_type', value)} options={mergeOptionsWithCurrentValue(linkPurposeOptions, row.link_type)} placeholder="Type" /></td>
                  <td className="px-2 py-2"><AppDropdown value={row.direction} onChange={(value) => updateRow(row.id, 'direction', value)} options={NETWORK_DIRECTIONS.map((value) => ({ value, label: value }))} placeholder="Environment" /></td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-200">{row.farm || 'Unassigned'}</td>
                  <td className="px-2 py-2"><input value={row.purpose} onChange={(event) => updateRow(row.id, 'purpose', event.target.value)} placeholder="Purpose" className={`${serviceInputClass()} h-[42px] px-3 py-2 text-[10px]`} /></td>
                  <td className="px-2 py-2"><input type="number" value={row.speed_gbps} onChange={(event) => updateRow(row.id, 'speed_gbps', event.target.value)} placeholder="Cost" className={`${serviceInputClass()} h-[42px] px-3 py-2 text-[10px] [appearance:textfield]`} /></td>
                  <td className="px-2 py-2"><AppDropdown value={row.unit} onChange={(value) => updateRow(row.id, 'unit', value)} options={NETWORK_UNITS.map((value) => ({ value, label: value }))} placeholder="Currency" /></td>
                  <td className="px-2 py-2"><AppDropdown value={row.cable_type} onChange={(value) => updateRow(row.id, 'cable_type', value)} options={mergeOptionsWithCurrentValue(cableTypeOptions, row.cable_type)} placeholder="License type" /></td>
                  <td className="px-2 py-2"><input type="date" value={row.request_link} onChange={(event) => updateRow(row.id, 'request_link', event.target.value)} placeholder="Deployment date" className={`${serviceInputClass()} h-[42px] px-3 py-2 text-[10px]`} /></td>
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
          <div key={`${i}-${r}`} className="bg-white/5 border border-white/5 p-3 rounded-lg flex items-center space-x-3 group hover:border-emerald-500/30 transition-all shadow-inner">
            <Mail size={14} className="text-emerald-500" />
            <span className="text-[11px] font-bold text-slate-100">{r}</span>
          </div>
        ))}
        {recipients.length === 0 && (
          <WorkspaceEmptyState compact title="No recipients defined" description="No direct delivery targets found for this connection." />
        )}
      </div>
    </WorkspaceModal>
  )
}

function ServiceRecordDetailModal({ item, onClose, onEdit, onDelete, onOpenAsset, deleteConfirm, options, devices }: any) {
  useBodyModalFlag()
  const [isMaximized, setIsMaximized] = useState(false)
  if (!item) return null
  const detailTitle = getServiceTitle(item)

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title={
        <div className="flex items-center gap-3">
          <span>{detailTitle}</span>
          <WorkspaceShareHeader id={String(item.id)} title={detailTitle} />
        </div>
      }
      subtitle={`Service ID: ${item.id} · ${item.device_name || 'Floating host'}`}
      icon={<Database size={20} />}
      forensicLineage={{ createdAt: item.created_at, updatedAt: item.updated_at }}
      status={
        <div className="flex items-center gap-2">
          <StatusPill value={canonicalizeServiceStatus(item?.status)} />
          <StatusPill value={item.service_type || 'Service'} />
          <StatusPill value={item.environment || 'Production'} />
        </div>
      }
      footerRight={
        <div className="flex items-center gap-3">
          {item.device_id ? <ToolbarButton onClick={() => onOpenAsset?.(item.device_id)}>Open Host</ToolbarButton> : null}
          <ToolbarButton onClick={() => onEdit?.(item)}>Edit Service</ToolbarButton>
          <ToolbarButton variant="danger" onClick={() => onDelete?.(item)} className={deleteConfirm ? 'animate-pulse bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : ''}>
            {deleteConfirm ? (item.is_deleted ? 'Confirm Purge?' : 'Confirm Archive?') : (item.is_deleted ? 'Purge' : 'Archive')}
          </ToolbarButton>
        </div>
      }
    >
      <WorkspaceDossierShell body={<ServiceDetailsView service={item} options={options} devices={devices} />} />
    </WorkspaceModal>
  )
}

const serviceInputClass = (error?: string) => getWorkspaceInputClass(error)
function ServiceRecordForm({ item, devices, options, onClose, onSuccess }: any) {
  useBodyModalFlag()
  const queryClient = useQueryClient()
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const dirtyRef = useRef(false)
  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const sanitized = sanitizeServicePayload(payload)
      const url = item?.id ? `/api/v1/logical-services/${item.id}` : '/api/v1/logical-services/'
      const method = item?.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(sanitized) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['logical-services'] })
      onSuccess?.()
    },
    onError: (error: any) => {
      showWorkspaceToast(error?.message || 'Failed to save service record', { type: 'error' })
    },
  })
  const formTitle = item?.id ? getServiceTitle(item) : 'Create Service'

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      isDirty={isDirty}
      resolveIsDirty={() => dirtyRef.current}
      dirtyConfirmTitle="Discard Service Changes?"
      dirtyConfirmMessage="You have unsaved service changes. Close this window and discard them?"
      title={
        <div className="flex items-center gap-3">
          <span>{item?.id ? 'Edit Service' : 'Create Service'}</span>
          {item?.id ? <WorkspaceShareHeader id={String(item.id)} title={formTitle} /> : null}
        </div>
      }
      subtitle={item?.id ? `Service ID ${item.id}` : 'Create a new logical service'}
      icon={<Database size={20} />}
      status={
        <div className="flex items-center gap-2">
          <StatusPill value={canonicalizeServiceStatus(item?.status)} />
          <StatusPill value={item?.service_type || 'Service'} />
          <StatusPill value={item?.environment || 'Production'} />
        </div>
      }
      footerRight={
        <ToolbarButton
          onClick={() => (document.getElementById('service-record-form') as HTMLFormElement | null)?.requestSubmit()}
          disabled={mutation.isPending}
          variant="primary"
          className="px-8 whitespace-nowrap inline-flex items-center"
        >
          {mutation.isPending ? <RefreshCcw className="animate-spin mr-2" size={14} /> : <Check className="mr-2" size={14} />}
          <span>{item?.id ? 'Save Service' : 'Add Service'}</span>
        </ToolbarButton>
      }
    >
      <WorkspaceDossierShell
        body={
          <ServiceForm
            formId="service-record-form"
            initialData={item || {}}
            onSave={(payload: any) => mutation.mutate(payload)}
            isPending={mutation.isPending}
            options={options}
            devices={devices}
            dirtyRef={dirtyRef}
            onDirtyChange={setIsDirty}
            renderActions={false}
          />
        }
      />
    </WorkspaceModal>
  )
}
