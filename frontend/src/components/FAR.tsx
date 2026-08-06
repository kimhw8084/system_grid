import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { WorkspaceEmptyState, useWorkspaceAnchoredLayer } from "./shared/OperationalWorkspacePrimitives";
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ShieldAlert, Zap, Save, X, PlusCircle, User,
  RefreshCcw, AlertTriangle, Lightbulb, ShieldCheck, 
  Activity, Server, FileText, Clipboard, ArrowRight, Shield, 
  CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye,
  Target, AlertCircle, Settings, Layers, Box, Link2, ExternalLink,
  ChevronLeft, Book, Download, Copy, Terminal, Check, HelpCircle, EyeOff, MoreVertical, Monitor, Upload, Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { toast } from 'react-hot-toast'
import { formatAppDate } from '../utils/dateUtils'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'
import { ConfigRegistryModal } from './ConfigRegistry'
import { MonitoringForm } from './monitoring/MonitoringForm'
import { ProjectForm } from './Projects'
import { RootCauseFormModal, MitigationFormModal, PreventionFormModal, ResolutionManagerModal } from './shared/FARModals'
import { EnhancedRcaDetails } from './Research'
import { OperationalSavedViewsPanel, OperationalWorkspaceShell } from './shared/OperationalWorkspaceShells'
import { OperationalDataGrid } from './shared/OperationalDataGrid'
import { isOperationalAutoResizeSource } from './shared/OperationalGridSizing'
import { OperationalBulkPreviewModal } from './shared/OperationalBulkPreviewModal'
import { WorkspaceModal } from './shared/WorkspaceModal'
import { useOperationalBulkWorkflow } from './shared/useOperationalBulkWorkflow'
import { ToolbarButton, ToolbarGroup, ToolbarIconButton, ToolbarSearch } from './shared/LayoutPrimitives'
import {
  useCollaborativeWorkspaceViews,
  type CollaborativeSavedView,
} from './shared/CollaborativeWorkspaceViews'
import {
  DEFAULT_FAR_FILTERS,
  applyFARFilters,
  extractFARRows,
  readFARRecordId,
  sanitizeFARSavedViewDefinition,
  updateFARRecordSearch,
  type FARFilterState,
  type FARRawRecord,
  type FARSavedViewDefinition,
  type FARWorkspaceMode,
} from './far/FARDomain'
import {
  confirmAndExecuteFARNestedLifecycle,
  FARNestedLifecycleCancelled,
} from './far/FARLifecycle'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// --- Types ---
interface FailureMode {
  id: number
  system_name: string
  failure_type: string
  title: string
  effect: string
  severity: number
  occurrence: number
  detection: number
  rpn: number
  status: string
  version: number
  risk_band?: string
  maturity_level?: number
  owner_user_id?: string | null
  owner_team?: string | null
  due_at?: string | null
  is_retired?: boolean
  affected_assets: any[]
  causes: any[]
  mitigations: any[]
  prevention_actions: any[]
}

type FARSavedView = CollaborativeSavedView<FARSavedViewDefinition>

const FAR_SYSTEM_VIEW_ID = 'far-system-default'
const FAR_SYSTEM_VIEW_IDS = new Set([FAR_SYSTEM_VIEW_ID])
const FAR_WORKSPACE_MODES: Array<{ id: FARWorkspaceMode; label: string }> = [
  { id: 'failure_modes', label: 'Failure Modes' },
  { id: 'causes', label: 'Causes' },
  { id: 'mitigations', label: 'Mitigations' },
  { id: 'prevention', label: 'Prevention' },
]
const FAR_PRESETS: Array<{ id: FARFilterState['preset']; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'high-risk', label: 'High Risk' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'recent', label: 'Recent' },
]

function newIdempotencyKey(prefix: string) {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${random}`
}

function normalizeFARSavedViews(views: FARSavedView[]): FARSavedView[] {
  const seen = new Set<string>()
  return views.filter((view) => {
    if (!view.id || seen.has(view.id)) return false
    seen.add(view.id)
    return true
  })
}

const FAILURE_TYPES = [
  { value: 'Design', label: 'Design' },
  { value: 'Process', label: 'Process' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Software', label: 'Software' },
  { value: 'Network', label: 'Network' },
  { value: 'Human', label: 'Human' },
  { value: 'Environment', label: 'Environment' },
]

// --- Constants for Guided Scoring ---
const SEVERITY_LEVELS = [
  { value: 10, label: 'HAZARDOUS (NO WARNING)', desc: 'Safety issue or total compliance failure. Extreme risk to the enterprise.' },
  { value: 9, label: 'HAZARDOUS (WITH WARNING)', desc: 'Potential safety issue or major compliance risk. High probability of legal impact.' },
  { value: 8, label: 'VERY HIGH', desc: 'System total failure, major data loss, no workaround exists. Business critical.' },
  { value: 7, label: 'HIGH', desc: 'System operational but major performance impact. High user dissatisfaction.' },
  { value: 6, label: 'MODERATE', desc: 'Significant impact on primary function, but workaround exists. Noticeable degradation.' },
  { value: 5, label: 'LOW', desc: 'Minor impact on performance or usability. Minimal business disruption.' },
  { value: 4, label: 'VERY LOW', desc: 'Noticeable impact but system remains functional. Easily manageable.' },
  { value: 3, label: 'MINOR', desc: 'Slight annoyance to users. No functional impairment.' },
  { value: 2, label: 'VERY MINOR', desc: 'Hardly noticeable impact. Cosmetic or trace-level issue.' },
  { value: 1, label: 'NONE', desc: 'No discernible effect on system or user experience.' },
]

const OCCURRENCE_LEVELS = [
  { value: 10, label: 'CERTAIN', desc: 'Inevitable. Occurs multiple times per day. Constant risk exposure.' },
  { value: 9, label: 'VERY HIGH', desc: 'Likely to occur daily. High-frequency failure profile.' },
  { value: 8, label: 'HIGH', desc: 'Likely to occur weekly. Recurring operational disruption.' },
  { value: 7, label: 'MODERATELY HIGH', desc: 'Occurs once or twice per month. Periodic impact.' },
  { value: 6, label: 'MODERATE', desc: 'Occurs once every few months. Occasional risk.' },
  { value: 5, label: 'LOW', desc: 'Occurs once or twice per year. Infrequent failure mode.' },
  { value: 4, label: 'VERY LOW', desc: 'Occurs once every few years. Rare occurrence.' },
  { value: 3, label: 'REMOTE', desc: 'Unlikely but possible. Minimal historical evidence.' },
  { value: 2, label: 'VERY REMOTE', desc: 'Extremely unlikely. Speculative failure mode.' },
  { value: 1, label: 'NEARLY IMPOSSIBLE', desc: 'Never expected to occur. Theoretical risk only.' },
]

const DETECTION_LEVELS = [
  { value: 10, label: 'IMPOSSIBLE', desc: 'Zero monitoring. Discovered only via total system blackout or user report.' },
  { value: 9, label: 'VERY REMOTE', desc: 'Visible only after catastrophic failure has completed. Post-mortem discovery.' },
  { value: 8, label: 'REMOTE', desc: 'Requires manual log inspection or audit. High latency in visibility.' },
  { value: 7, label: 'VERY LOW', desc: 'Alerts exist but are buried in noise. Easily missed by NOC/SOC.' },
  { value: 6, label: 'LOW', desc: 'Standard monitoring, but delayed or inconsistent. Unreliable visibility.' },
  { value: 5, label: 'MODERATE', desc: 'Reliable alerts exist but require human triage for verification.' },
  { value: 4, label: 'MODERATELY HIGH', desc: 'Proactive alerts with clear root cause identification.' },
  { value: 3, label: 'HIGH', desc: 'Real-time dashboarding and active, automated health checks.' },
  { value: 2, label: 'VERY HIGH', desc: 'Automated self-healing or failsafe systems. Immediate notification.' },
  { value: 1, label: 'ALMOST CERTAIN', desc: 'Predictive analytics prevents failure before it manifests.' },
]

const maturityLevels = [
  { lv: 8, label: 'Prevented', desc: 'Eliminated / Design Proofed', color: 'bg-emerald-500', tooltip: 'DESIGN PROOF: Failure mode eliminated by architectural change or permanent hardware/software design proofing.' },
  { lv: 7, label: 'Triple Shield', desc: 'Monitoring + Resolution + Workaround', color: 'bg-emerald-400', tooltip: 'TRIPLE SHIELD: Full defense-in-depth. Automated detection, immediate workaround, and verified BKM are all active.' },
  { lv: 6, label: 'Automated Fix', desc: 'Monitoring + Resolution', color: 'bg-sky-500', tooltip: 'STABLE DEFENSE: Monitoring identifies failure and a permanent BKM fix is available. Lacks an immediate temporary workaround.' },
  { lv: 5, label: 'Hybrid Patch', desc: 'Resolution + Workaround', color: 'bg-sky-400', tooltip: 'HYBRID PATCH: Permanent fix and temporary workaround identified. Lacks automated monitoring to detect onset.' },
  { lv: 4, label: 'Resolved Only', desc: 'Manual Permanent Fix', color: 'bg-blue-500', tooltip: 'RESOLUTION ONLY: A verified permanent fix exists, but failure is silent (no monitoring) and has no immediate workaround.' },
  { lv: 3, label: 'Detect & Patch', desc: 'Monitoring + Workaround', color: 'bg-amber-500', tooltip: 'DETECT & PATCH: Monitoring provides visibility and a workaround reduces impact, but no permanent BKM has been identified.' },
  { lv: 2, label: 'Workaround Only', desc: 'Temporary Patch Only', color: 'bg-amber-400', tooltip: 'WORKAROUND ONLY: A temporary patch exists for recovery, but we are blind to failure onset (no monitoring).' },
  { lv: 1, label: 'Visibility Only', desc: 'Monitoring Without Action', color: 'bg-rose-400', tooltip: 'MONITORING ONLY: We can see the failure occurring via telemetry, but have no workaround or permanent resolution playbook.' },
  { lv: 0, label: 'Exposed', desc: 'No Monitoring / No Action', color: 'bg-rose-600', tooltip: 'SYSTEM EXPOSED: Critical blind spot. No telemetry, no workaround, and no permanent resolution identified. High risk.' }
]

function assertFAROnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('FAR is in read-only offline mode. Mutations are not queued.')
  }
}

async function fetchFarList(path: string, signal?: AbortSignal) {
  const response = await apiFetch(path, { signal })
  if (!response.ok) throw new Error(await response.text())
  const payload = await response.json()
  if (!Array.isArray(payload)) throw new Error(`Expected a list response from ${path}`)
  return payload
}

const METRIC_DEFINITIONS: any = {
  SRI: {
    title: "System Reliability Index (SRI)",
    formula: "SRI = 100 × [1 - (RPN_avg / 500)]",
    description: "Represents the aggregate health of the infrastructure's risk profile. A score of 100 signifies zero documented risk exposure, while lower scores indicate high-criticality failure modes with frequent occurrence or visibility gaps."
  },
  RiskDensity: {
    title: "Risk Density Profile",
    formula: "D_risk = Σ RPN / Σ Assets_affected",
    description: "Measures risk concentration across assets. High density indicates that a small number of physical or logical assets are bearing a disproportionate amount of system-wide failure risk."
  },
  MitigationRatio: {
    title: "Global Mitigation Coverage",
    formula: "M_cov = (N_mitigated / N_total) × 100",
    description: "Evaluates the breadth of the defense-in-depth strategy. Measures the percentage of failure modes that have at least one verified Monitoring or temporary Workaround protocol established."
  },
  AvgSeverity: {
    title: "Mean Failure Criticality",
    formula: "RPN_avg = (1 / N) Σ RPN_i",
    description: "The average Risk Priority Number across the entire registry. Used to monitor long-term trends in the inherent severity of documented risks, independent of the number of entries."
  }
}

function MetricHelpModal({ metric, onClose }: { metric: string | null, onClose: () => void }) {
  if (!metric || !METRIC_DEFINITIONS[metric]) return null;
  const def = METRIC_DEFINITIONS[metric];
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-md p-10 rounded-lg border border-blue-500/30 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-xl font-bold uppercase tracking-tighter text-blue-400  flex items-center space-x-3">
             <Info size={24}/> <span>{def.title}</span>
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Mathematical Derivation</p>
            <div className="bg-black/40 border border-white/5 rounded-lg p-6 font-serif text-lg text-blue-300 text-center shadow-inner">
               {def.formula}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Functional Definition</p>
            <p className="text-[13px] text-slate-300 leading-relaxed font-bold tracking-tight ">
              {def.description}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-3 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-500/20">Acknowledge</button>
      </motion.div>
    </div>
  )
}

export default function FAR() {
  const [showImportModal, setShowImportModal] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine)
  const gridRef = useRef<any>(null)
  const interactionVersionRef = useRef(0)
  const requestedViewBaselineRef = useRef(0)
  const requestedViewAppliedRef = useRef<string | null>(null)
  const pendingColumnStateRef = useRef<FARSavedViewDefinition['columnLayoutState'] | null>(null)
  const suppressColumnCaptureRef = useRef(false)
  const firstDataColumnLayoutAppliedRef = useRef(false)
  const retirementPreviewRef = useRef<any>(null)

  const [showWizard, setShowWizard] = useState(false)
  const [selectedModeId, setSelectedModeId] = useState<number | null>(() => (
    typeof window === 'undefined' ? null : readFARRecordId(window.location.search)
  ))
  const [deepLinkNotice, setDeepLinkNotice] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSystems, setSelectedSystems] = useState<string[]>([])
  const [preset, setPreset] = useState<FARFilterState['preset']>('all')
  const [workspaceMode, setWorkspaceMode] = useState<FARWorkspaceMode>('failure_modes')
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskBandFilter, setRiskBandFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [retirementReason, setRetirementReason] = useState('')
  const [retirementPreflight, setRetirementPreflight] = useState<{ ids: number[]; title: string } | null>(null)
  const [showMaturityHelp, setShowMaturityHelp] = useState(false)
  const [showRpnHelp, setShowRpnHelp] = useState(false)
  const [activeMetricHelp, setActiveMetricHelp] = useState<string | null>(null)

  const [incidentListModal, setIncidentListModal] = useState<{show: boolean, rcas: any[]}>({ show: false, rcas: [] })
  const [selectedRcaDetail, setSelectedRcaDetail] = useState<any>(null)
  const [resolutionManagerModal, setResolutionManagerModal] = useState<{show: boolean, cause: any}>({ show: false, cause: null })

  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(false)
  const [showSystemFilters, setShowSystemFilters] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [columnLayoutState, setColumnLayoutState] = useState<FARSavedViewDefinition['columnLayoutState']>([])
  const [showConfig, setShowConfig] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showSavedViews, setShowSavedViews] = useState(false)
  const { triggerRef: viewsButtonRef, panelRef: viewsPanelRef, panelStyle: viewsPanelStyle } = useWorkspaceAnchoredLayer(showSavedViews, { minWidth: 420 })
  const [newViewName, setNewViewName] = useState('')
  const [activeViewId, setActiveViewId] = useState<string | null>(FAR_SYSTEM_VIEW_ID)
  const [savedViews, setSavedViews] = useState<FARSavedView[]>(() => [{
    id: FAR_SYSTEM_VIEW_ID,
    name: 'FAR default',
    config: sanitizeFARSavedViewDefinition({}),
    scope: 'personal',
    source: 'system',
    schemaVersion: 1,
    revision: 1,
  }])
  
  const [bkmGuidanceModal, setBkmGuidanceModal] = useState<{show: boolean, cause: any}>({ show: false, cause: null })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncOnlineState = () => setIsOnline(window.navigator.onLine)
    window.addEventListener('online', syncOnlineState)
    window.addEventListener('offline', syncOnlineState)
    return () => {
      window.removeEventListener('online', syncOnlineState)
      window.removeEventListener('offline', syncOnlineState)
    }
  }, [])

  const markInteraction = useCallback(() => {
    interactionVersionRef.current += 1
  }, [])

  const selectMode = useCallback((modeId: number | null) => {
    setSelectedModeId(modeId)
    const canonical = updateFARRecordSearch(searchParams.toString(), modeId)
    const current = searchParams.toString()
    const next = canonical.startsWith('?') ? canonical.slice(1) : canonical
    if (current !== next) navigate({ search: canonical }, { replace: true })
  }, [navigate, searchParams])

  const toggleContextPanel = useCallback((panel: 'views' | 'display' | 'filters' | 'insights' | 'columns') => {
    const nextOpen = panel === 'views' ? !showSavedViews
      : panel === 'display' ? !showStyleLab
        : panel === 'filters' ? !showSystemFilters
          : panel === 'insights' ? !showInsights
            : !showColumnPicker
    setShowSavedViews(panel === 'views' && nextOpen)
    setShowStyleLab(panel === 'display' && nextOpen)
    setShowSystemFilters(panel === 'filters' && nextOpen)
    setShowInsights(panel === 'insights' && nextOpen)
    setShowColumnPicker(panel === 'columns' && nextOpen)
  }, [showColumnPicker, showInsights, showSavedViews, showStyleLab, showSystemFilters])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setShowSavedViews(false)
      setShowStyleLab(false)
      setShowSystemFilters(false)
      setShowInsights(false)
      setShowColumnPicker(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleModeKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, modeId: FARWorkspaceMode) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = FAR_WORKSPACE_MODES.findIndex((item) => item.id === modeId)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? FAR_WORKSPACE_MODES.length - 1
        : event.key === 'ArrowRight' ? (currentIndex + 1) % FAR_WORKSPACE_MODES.length
          : (currentIndex - 1 + FAR_WORKSPACE_MODES.length) % FAR_WORKSPACE_MODES.length
    const nextMode = FAR_WORKSPACE_MODES[nextIndex].id
    markInteraction()
    setWorkspaceMode(nextMode)
    requestAnimationFrame(() => {
      const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      tabs?.[nextIndex]?.focus()
    })
  }, [markInteraction])

  const { data: modes, isLoading: modesLoading, isError: modesError, error: modesQueryError } = useQuery<FailureMode[]>({
    queryKey: ['far', 'modes'], 
    queryFn: async ({ signal }) => {
      const payload = await fetchFarList('/api/v1/far/modes', signal)
      extractFARRows(payload)
      return payload as FailureMode[]
    },
  })

  const farRecords = useMemo(() => extractFARRows(modes || []), [modes])
  const farFilters = useMemo<FARFilterState>(() => ({
    preset,
    mode: workspaceMode,
    status: statusFilter,
    riskBand: riskBandFilter,
    owner: ownerFilter,
    systems: selectedSystems,
    searchTerm,
  }), [ownerFilter, preset, riskBandFilter, searchTerm, selectedSystems, statusFilter, workspaceMode])

  const currentViewDefinition = useMemo<FARSavedViewDefinition>(() => sanitizeFARSavedViewDefinition({
    schemaVersion: 1,
    filters: farFilters,
    fontSize,
    rowDensity,
    hiddenColumns,
    columnLayoutState,
  }), [columnLayoutState, farFilters, fontSize, hiddenColumns, rowDensity])

  const collaborativeViews = useCollaborativeWorkspaceViews<FARSavedViewDefinition, FARSavedView>({
    workspaceKey: 'far',
    migrationKey: 'sysgrid-far-collaborative-views-v1',
    systemViewIds: FAR_SYSTEM_VIEW_IDS,
    currentViews: savedViews,
    setCurrentViews: setSavedViews,
    normalizeViews: normalizeFARSavedViews,
    sanitizeDefinition: sanitizeFARSavedViewDefinition,
    activeViewId,
    onActiveViewIdChange: setActiveViewId,
    currentDefinition: currentViewDefinition,
  })

  const applySavedView = useCallback((view: FARSavedView, explicit = true) => {
    const config = sanitizeFARSavedViewDefinition(view.config)
    setPreset(config.filters.preset)
    setWorkspaceMode(config.filters.mode)
    setStatusFilter(config.filters.status)
    setRiskBandFilter(config.filters.riskBand)
    setOwnerFilter(config.filters.owner)
    setSelectedSystems(config.filters.systems)
    setSearchTerm(config.filters.searchTerm)
    setFontSize(config.fontSize)
    setRowDensity(config.rowDensity)
    setHiddenColumns(config.hiddenColumns)
    setColumnLayoutState(config.columnLayoutState)
    pendingColumnStateRef.current = config.columnLayoutState
    if (gridRef.current?.api && config.columnLayoutState.length) {
      gridRef.current.api.applyColumnState({ state: config.columnLayoutState, applyOrder: true })
    }
    setActiveViewId(view.id)
    collaborativeViews.setViewLink(view.id)
    if (explicit) markInteraction()
  }, [collaborativeViews, markInteraction])

  useEffect(() => {
    const requestedId = collaborativeViews.requestedViewId
    if (!requestedId || requestedViewAppliedRef.current === requestedId) return
    const requested = savedViews.find((view) => view.id === requestedId)
    if (!requested) return
    if (interactionVersionRef.current !== requestedViewBaselineRef.current) return
    requestedViewAppliedRef.current = requestedId
    applySavedView(requested, false)
  }, [applySavedView, collaborativeViews.requestedViewId, savedViews])

  useEffect(() => {
    const requestedModeId = readFARRecordId(searchParams.toString())
    setSelectedModeId((current) => current === requestedModeId ? current : requestedModeId)
  }, [searchParams])

  useEffect(() => {
    if (!selectedModeId || !modes) return
    const mode = modes.find((candidate) => Number(candidate.id) === selectedModeId)
    if (!mode) {
      setDeepLinkNotice('The requested FAR record is unavailable or outside the active tenant.')
      selectMode(null)
      return
    }
    setDeepLinkNotice(null)
    if (!gridRef.current?.api) return
    requestAnimationFrame(() => {
      gridRef.current.api.forEachNode((node: any) => {
        if (Number(node.data?.id) === selectedModeId) {
          node.setSelected(true)
          gridRef.current.api.ensureNodeVisible(node, 'middle')
        }
      })
    })
  }, [modes, selectMode, selectedModeId])

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })
  const availableSystems = useMemo(() => [...new Set([
    ...(options?.filter((option: any) => option.category === 'LogicalSystem').map((system: any) => String(system.value)) || []),
    ...farRecords.map((record) => record.systemName),
  ])].sort((left, right) => left.localeCompare(right)), [farRecords, options])

  const filteredModes = useMemo(() => {
    const selected = applyFARFilters(farRecords, farFilters)
    const selectedIds = new Set(selected.map((record) => record.id))
    return (modes || []).filter((mode) => selectedIds.has(Number(mode.id)))
  }, [farFilters, farRecords, modes])

  const selectedMode = useMemo(() => modes?.find((mode) => Number(mode.id) === selectedModeId), [modes, selectedModeId])
  const owners = useMemo(() => [...new Set(farRecords.map((record) => record.owner || 'Unassigned'))].sort(), [farRecords])

  const downloadExchange = useCallback(async (format: 'csv' | 'structured') => {
    const endpoint = format === 'csv' ? '/api/v1/far/exchange/export/csv' : '/api/v1/far/exchange/export/structured'
    const response = await apiFetch(endpoint)
    if (!response.ok) throw new Error(await response.text())
    const blob = await response.blob()
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = format === 'csv' ? 'sysgrid-far.csv' : 'sysgrid-far.json'
    anchor.click()
    URL.revokeObjectURL(href)
  }, [])

  const handleExportCSV = () => {
    void downloadExchange('csv').catch((error) => toast.error(error instanceof Error ? error.message : 'FAR export failed.'))
  }

  const handleCopyToClipboard = () => {
    const csvData = gridRef.current?.api?.getDataAsCsv?.({
      allColumns: false,
      onlySelected: true,
      suppressQuotes: true,
    })
    if (!csvData) return
    navigator.clipboard.writeText(csvData)
      .then(() => toast.success('Selected failure vectors copied to clipboard'))
      .catch(() => toast.error('Failed to copy selected failure vectors'))
  }

  const captureColumnState = useCallback((event: any) => {
    if (suppressColumnCaptureRef.current || isOperationalAutoResizeSource(String(event?.source || ''))) return
    const state = event?.api?.getColumnState?.()
    if (!Array.isArray(state)) return
    setColumnLayoutState(sanitizeFARSavedViewDefinition({ columnLayoutState: state }).columnLayoutState)
  }, [])


  const {
    bulkMutation,
    bulkOperationPreview,
    requestBulkPreview,
    setBulkOperationPreview,
  } = useOperationalBulkWorkflow<any>({
    selectedIds,
    fieldLabels: {},
    selectionErrorMessage: 'Select at least one active failure vector.',
    previewErrorMessage: 'Unable to prepare the FAR retirement preview.',
    executionErrorMessage: 'Unable to retire the selected failure vectors.',
    revertErrorMessage: 'FAR retirement is restored through the explicit Admin restore flow.',
    getSnapshots: (ids) => (modes || []).filter((mode) => ids.includes(Number(mode.id))),
    previewRequest: async ({ action, ids, payload }) => {
      if (action !== 'delete') throw new Error('Unsupported FAR bulk action.')
      const reason = String(payload.reason || retirementReason).trim()
      if (reason.length < 3) throw new Error('A retirement reason of at least three characters is required.')
      const current = new Map((modes || []).map((mode) => [Number(mode.id), mode]))
      const expectedVersions = Object.fromEntries(ids.map((id) => {
        const mode = current.get(id)
        if (!mode) throw new Error(`Failure mode ${id} is no longer available.`)
        return [id, Number(mode.version)]
      }))
      const idempotencyKey = newIdempotencyKey('far-retirement')
      const response = await apiFetch('/api/v1/far/modes/retirement/preview', {
        method: 'POST',
        body: JSON.stringify({
          ids,
          expected_versions: expectedVersions,
          reason,
          idempotency_key: idempotencyKey,
        }),
      })
      if (!response.ok) throw new Error(await response.text())
      const preview = { ...(await response.json()), idempotency_key: idempotencyKey }
      retirementPreviewRef.current = preview
      return {
        ...preview,
        action,
        blockers: Array.isArray(preview.blockers)
          ? preview.blockers.map((blocker: any) => ({ ...blocker, reason: blocker.reason || blocker.code || 'Blocked by server validation' }))
          : [],
      }
    },
    executeRequest: async ({ action }) => {
      if (action !== 'delete') throw new Error('Unsupported FAR bulk action.')
      const preview = retirementPreviewRef.current
      if (!preview?.preview_token || !preview?.preview_hash) throw new Error('Retirement preview expired. Prepare a new preview.')
      const response = await apiFetch('/api/v1/far/modes/retirement/execute', {
        method: 'POST',
        body: JSON.stringify({
          preview_token: preview.preview_token,
          preview_hash: preview.preview_hash,
          idempotency_key: preview.idempotency_key,
          confirm: true,
        }),
      })
      if (!response.ok) throw new Error(await response.text())
      return response.json()
    },
    refresh: () => queryClient.invalidateQueries({ queryKey: ['far', 'modes'] }),
    buildRevertRequest: () => null,
    onExecutionSuccess: () => {
      retirementPreviewRef.current = null
      setRetirementReason('')
      setSelectedIds([])
      gridRef.current?.api?.deselectAll?.()
    },
  })

  // AgGrid Defs (High Density)
  const mutationBlocked = !isOnline || Boolean(modesError)
  const [isNarrowViewport, setIsNarrowViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const media = window.matchMedia('(max-width: 640px)')
    const update = () => setIsNarrowViewport(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  const openRetirementPreflight = useCallback((mode: any, node: any) => {
    if (mutationBlocked || !mode?.id) return
    const id = Number(mode.id)
    node?.setSelected?.(true)
    setRetirementReason('')
    setRetirementPreflight({ ids: [id], title: String(mode.title || `Failure mode ${id}`) })
    toast('Review the selected failure vector and enter a retirement reason before preview.')
  }, [mutationBlocked])

  const openSelectedRetirementPreflight = useCallback(() => {
    if (mutationBlocked || selectedIds.length === 0) return
    const selected = (modes || []).filter((mode) => selectedIds.includes(Number(mode.id)))
    if (selected.length !== selectedIds.length) {
      toast.error('One or more selected failure vectors are no longer available. Refresh and select them again.')
      return
    }
    setRetirementReason('')
    setRetirementPreflight({
      ids: [...selectedIds],
      title: selected.length === 1 ? String(selected[0].title || `Failure mode ${selectedIds[0]}`) : `${selected.length} selected failure vectors`,
    })
  }, [modes, mutationBlocked, selectedIds])

  const columnDefs = useMemo(() => [
    { 
      colId: "selection",
      headerName: "", 
      width: 50,
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: isNarrowViewport ? null : 'left',
      cellClass: 'flex items-center justify-center border-r border-white/5 pl-2', 
      headerClass: 'flex items-center justify-center border-r border-white/5 pl-2',
      suppressSizeToFit: true,
      resizable: false,
      sortable: false,
      filter: false,
      lockVisible: true
    },
    { 
      field: "id", 
      headerName: "ID", 
      width: 70,
      pinned: isNarrowViewport ? null : 'left',
      cellClass: 'text-center font-bold text-slate-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
    },
    { 
      field: "system_name", 
      headerName: "System", 
      width: 120,
      cellClass: 'text-center font-bold text-rose-400 uppercase',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("system_name")
    },
    { 
      field: "failure_type", 
      headerName: "Type", 
      width: 100,
      cellClass: 'text-center font-bold text-slate-400 uppercase',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("failure_type")
    },
    { 
      field: "title", 
      headerName: "Failure Mode", 
      flex: 2,
      cellClass: 'text-left font-bold uppercase text-white pl-4',
      headerClass: 'text-left pl-4',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("title")
    },
    {
      field: "risk_band",
      headerName: "Risk",
      width: 105,
      cellClass: 'text-center font-bold uppercase',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      cellRenderer: (p: any) => {
        const value = p.value || (p.data?.rpn >= 300 ? 'Critical' : p.data?.rpn >= 200 ? 'High' : p.data?.rpn >= 100 ? 'Moderate' : 'Low')
        const className = value === 'Critical' ? 'text-rose-400' : value === 'High' ? 'text-orange-400' : value === 'Moderate' ? 'text-amber-400' : 'text-emerald-400'
        return <span className={className}>{value}</span>
      },
      hide: hiddenColumns.includes("risk_band")
    },
    {
      field: "status",
      headerName: "Status",
      width: 145,
      cellClass: 'text-center font-bold text-slate-300 uppercase',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("status")
    },
    {
      colId: "owner",
      headerName: "Owner",
      width: 145,
      valueGetter: (p: any) => p.data?.owner_team || p.data?.owner_user_id || 'Unassigned',
      cellClass: 'text-center font-bold text-blue-300',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("owner")
    },
    {
      field: "effect",
      headerName: "Effect",
      minWidth: 220,
      flex: 1,
      cellClass: 'text-left text-slate-300',
      headerClass: 'text-left',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("effect")
    },
    {
      colId: "affected_scope",
      headerName: "Affected Scope",
      width: 190,
      valueGetter: (p: any) => (p.data?.affected_assets || []).map((item: any) => item?.name || item?.id).filter(Boolean).join(', ') || 'None',
      cellClass: 'text-left text-slate-400',
      headerClass: 'text-left',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("affected_scope")
    },
    { 
      field: "severity", 
      headerName: "S", 
      width: 70,
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => {
        const val = p.value || 0;
        const color = val >= 8 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 
                      val >= 5 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div onClick={() => setShowRpnHelp(true)} className={`flex items-center justify-center w-14 h-5 rounded-lg border shadow-sm cursor-pointer hover:scale-105 transition-all ${color}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold leading-none">{val}</span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("severity")
    },
    { 
      field: "occurrence", 
      headerName: "O", 
      width: 70,
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => {
        const val = p.value || 0;
        const color = val >= 7 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 
                      val >= 4 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div onClick={() => setShowRpnHelp(true)} className={`flex items-center justify-center w-14 h-5 rounded-lg border shadow-sm cursor-pointer hover:scale-105 transition-all ${color}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold leading-none">{val}</span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("occurrence")
    },
    { 
      field: "detection", 
      headerName: "D", 
      width: 70,
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => {
        const val = p.value || 0;
        const color = val >= 7 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 
                      val >= 4 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div onClick={() => setShowRpnHelp(true)} className={`flex items-center justify-center w-14 h-5 rounded-lg border shadow-sm cursor-pointer hover:scale-105 transition-all ${color}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold leading-none">{val}</span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("detection")
    },
    { 
      field: "rpn", 
      headerName: "RPN", 
      width: 80,
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => {
        const val = p.value || 0;
        const color = val >= 300 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' :
                      val >= 200 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      val >= 100 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div onClick={() => setShowRpnHelp(true)} className={`flex items-center justify-center w-14 h-5 rounded-lg border shadow-sm cursor-pointer hover:scale-105 transition-all ${color}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold leading-none">{val}</span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("rpn")
    },
    { 
      colId: "maturity",
      headerName: "Maturity", 
      width: 140,
      cellClass: 'text-center',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      cellRenderer: (p: any) => {
        const mode = p.data;
        const lv = Math.max(0, Math.min(8, Number(mode?.maturity_level ?? 0)));
        const ml = maturityLevels.find(m => m.lv === lv) || maturityLevels[maturityLevels.length-1];
        const colorClass = ml.lv >= 6 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                          ml.lv >= 4 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          ml.lv >= 1 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-rose-500/20 text-rose-400 border-rose-500/30';

        return (
          <div className="flex items-center justify-center h-full w-full">
            <div onClick={() => setShowMaturityHelp(true)} className={`flex items-center justify-center w-28 h-5 rounded-lg border shadow-sm cursor-pointer hover:scale-105 transition-all ${colorClass}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase tracking-tighter leading-none">
                Lv{ml.lv} {ml.label}
              </span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("maturity")
    },
    {
      colId: "vectors",
      headerName: "Vectors",
      width: 160,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const m = p.data?.mitigations || [];
        const c = p.data?.causes || [];
        const mons = m.filter((i:any) => i.mitigation_type === 'Monitoring').length;
        const wrks = m.filter((i:any) => i.mitigation_type === 'Workaround').length;
        const prevs = (p.data?.prevention_actions || []).length;
        const res = c.flatMap((i:any) => i.resolutions || []).length;
        
        const Badge = ({label, value, color}: any) => (
          <div className="flex flex-col items-center min-w-[24px]">
             <span className="text-[7px] text-slate-500 font-bold uppercase leading-none mb-0.5">{label}</span>
             <span className={`text-[10px] font-bold leading-none ${color}`}>{value}</span>
          </div>
        )

        return (
          <div className="flex items-center justify-center gap-2 h-full">
             <Badge label="C/R" value={`${c.length}/${res}`} color="text-blue-400" />
             <div className="w-px h-3 bg-white/10" />
             <Badge label="W" value={wrks} color="text-amber-400" />
             <div className="w-px h-3 bg-white/10" />
             <Badge label="M" value={mons} color="text-sky-400" />
             <div className="w-px h-3 bg-white/10" />
             <Badge label="P" value={prevs} color="text-emerald-400" />
          </div>
        )
      }
    },
    {
      colId: 'analytical_focus',
      headerName: workspaceMode === 'causes' ? 'Causes' : workspaceMode === 'mitigations' ? 'Mitigations' : workspaceMode === 'prevention' ? 'Prevention' : 'Analytical Focus',
      minWidth: 240,
      flex: 1,
      hide: workspaceMode === 'failure_modes',
      lockVisible: workspaceMode !== 'failure_modes',
      valueGetter: (p: any) => {
        const items = workspaceMode === 'causes' ? p.data?.causes : workspaceMode === 'mitigations' ? p.data?.mitigations : workspaceMode === 'prevention' ? p.data?.prevention_actions : []
        return (items || []).map((item: any) => item?.cause_text || item?.description || item?.action_text || item?.title || item?.id).filter(Boolean).join(' · ') || 'None'
      },
      cellClass: 'text-left text-slate-300',
      headerClass: 'text-left',
      filter: 'agTextColumnFilter',
    },
    {
      field: "linked_rcas",
      headerName: "Incidents",
      width: 120,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const rcas = p.data?.linked_rcas || [];
        const count = rcas.length;
        if (count === 0) return <span className="text-slate-600 font-bold uppercase tracking-widest text-[9px]">None</span>;
        
        const color = count >= 5 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 
                      count >= 2 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                      'bg-purple-500/20 text-purple-400 border-purple-500/30';

        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className="group relative">
              <button 
                onClick={() => setIncidentListModal({ show: true, rcas })}
                className={`flex items-center justify-center w-14 h-5 rounded-lg border shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer ${color}`}
              >
                <span style={{ fontSize: `${fontSize}px` }} className="font-bold leading-none">{count}</span>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                <div className="bg-slate-900 border border-white/20 rounded-lg p-3 shadow-2xl min-w-[200px]">
                   <p className="text-[9px] font-bold uppercase text-purple-400 mb-2 border-b border-white/5 pb-1">Linked RCA Records</p>
                   <div className="space-y-1">
                      {rcas.map((r: any) => (
                        <div key={r.id} className="text-[8px] font-bold text-slate-300 uppercase py-0.5">• {r.title}</div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        );
      },
      hide: hiddenColumns.includes("linked_rcas")
    },
    { 
      field: "updated_at",
      headerName: "Updated",
      width: 135,
      valueFormatter: (p: any) => p.value ? formatAppDate(p.value, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded',
      cellClass: 'text-center text-slate-400',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("updated_at")
    },
    {
      field: "created_by_user_id", 
      headerName: "Created By", 
      width: 120, 
      filter: true, 
      cellClass: 'text-center font-bold text-blue-400 uppercase', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || 'SYSTEM'}</span>,
      hide: hiddenColumns.includes("created_by_user_id")
    },
    {
      colId: "actions",
      headerName: "Action",
      width: 100,
      minWidth: 100,
      pinned: isNarrowViewport ? null : 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
               <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
                   <button onClick={() => p.data?.id && selectMode(Number(p.data.id))} title="Matrix Detail" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><Eye size={14}/></button>
                   <button disabled={mutationBlocked} onClick={() => { if (mutationBlocked) return; selectMode(Number(p.data.id)); setShowWizard(true); }} title={mutationBlocked ? "Read-only offline/degraded mode" : "Edit Matrix"} className="p-1.5 text-amber-400 hover:text-amber-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
                   <button disabled={mutationBlocked} onClick={() => openRetirementPreflight(p.data, p.node)} title={mutationBlocked ? "Read-only offline/degraded mode" : "Select for evidence-preserving retirement"} className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
               </div>
        </div>
      )
    }
  ].map((column: any) => {
    const columnId = String(column.colId || column.field || '')
    const explicitWidth = typeof column.width === 'number' && typeof column.flex !== 'number'
      ? column.width
      : null
    const utilityWidthLocked = columnId === 'selection' || columnId === 'actions'

    if (explicitWidth !== null) {
      const boundedMaxWidth = utilityWidthLocked
        ? explicitWidth
        : Math.max(explicitWidth, Math.min(explicitWidth * 2, 320))
      return {
        ...column,
        cellDataType: false,
        initialWidth: explicitWidth,
        minWidth: utilityWidthLocked ? explicitWidth : Math.min(explicitWidth, 80),
        maxWidth: boundedMaxWidth,
        suppressAutoSize: true,
        suppressSizeToFit: true,
      }
    }

    const flexBounds = columnId === 'title'
      ? { minWidth: 260, maxWidth: 420 }
      : columnId === 'effect'
        ? { minWidth: 220, maxWidth: 420 }
        : columnId === 'analytical_focus'
          ? { minWidth: isNarrowViewport ? 160 : 240, maxWidth: isNarrowViewport ? 240 : 480 }
          : {}

    return {
      ...column,
      ...flexBounds,
      cellDataType: false,
      suppressAutoSize: true,
    }
  }), [fontSize, hiddenColumns, isNarrowViewport, mutationBlocked, openRetirementPreflight, workspaceMode]) as any

  const canonicalColumnLayoutState = useMemo(() => columnDefs.map((column: any, index: number) => {
    const state: Record<string, any> = {
      colId: String(column.colId || column.field || index),
      pinned: column.pinned ?? null,
      hide: Boolean(column.hide),
    }
    if (typeof column.flex === 'number') state.flex = column.flex
    else if (typeof column.width === 'number') {
      state.width = column.width
      state.flex = null
    }
    return state
  }), [columnDefs])

  const applyInitialColumnLayout = useCallback((api: any) => {
    const pending = pendingColumnStateRef.current
    const sourceState = pending?.length ? pending : canonicalColumnLayoutState
    const normalizedState = sourceState.map((entry: any) => {
      const colId = String(entry.colId || '')
      const normalized = { ...entry }
      if (isNarrowViewport && ['selection', 'id', 'actions'].includes(colId)) normalized.pinned = null
      if (colId === 'analytical_focus') normalized.hide = workspaceMode === 'failure_modes'
      return normalized
    })
    const state = isNarrowViewport && workspaceMode !== 'failure_modes'
      ? [
          ...normalizedState.filter((entry: any) => String(entry.colId || '') === 'analytical_focus'),
          ...normalizedState.filter((entry: any) => String(entry.colId || '') !== 'analytical_focus'),
        ]
      : normalizedState
    if (!api?.applyColumnState || !state.length) return
    suppressColumnCaptureRef.current = true
    api.applyColumnState({ state, applyOrder: true })
    requestAnimationFrame(() => {
      api.applyColumnState({ state, applyOrder: true })
      if (workspaceMode !== 'failure_modes') {
        api.setColumnsVisible?.(['analytical_focus'], true)
        api.ensureColumnVisible?.('analytical_focus', isNarrowViewport ? 'start' : 'end')
      }
      window.setTimeout(() => {
        suppressColumnCaptureRef.current = false
      }, 0)
    })
  }, [canonicalColumnLayoutState, isNarrowViewport, workspaceMode])

  const synchronizeAnalyticalFocus = useCallback((api: any = gridRef.current?.api) => {
    if (!api) return false
    const active = workspaceMode !== 'failure_modes'
    const column = api.getColumn?.('analytical_focus')
    if (!column) return false
    if (column.isVisible?.() !== active) api.setColumnsVisible?.(['analytical_focus'], active)
    if (active && isNarrowViewport) {
      suppressColumnCaptureRef.current = true
      api.moveColumns?.(['analytical_focus'], 0)
      window.requestAnimationFrame(() => {
        suppressColumnCaptureRef.current = false
      })
    }
    if (active) api.ensureColumnVisible?.('analytical_focus', isNarrowViewport ? 'start' : 'end')
    api.refreshHeader?.()
    return true
  }, [isNarrowViewport, workspaceMode])

  const farGridRuntime = useMemo(() => ({
    preserveExplicitColumnWidths: true,
    handleGridReady: (event: any) => {
      applyInitialColumnLayout(event.api)
      synchronizeAnalyticalFocus(event.api)
    },
    handleColumnResized: captureColumnState,
    handleColumnMoved: captureColumnState,
    handleDragStopped: captureColumnState,
    handleColumnPinned: captureColumnState,
    handleColumnVisible: captureColumnState,
    handleSortChanged: captureColumnState,
  }), [applyInitialColumnLayout, captureColumnState, synchronizeAnalyticalFocus])

  useEffect(() => {
    synchronizeAnalyticalFocus()
    const frame = window.requestAnimationFrame(() => synchronizeAnalyticalFocus())
    return () => window.cancelAnimationFrame(frame)
  }, [columnLayoutState, synchronizeAnalyticalFocus])

  // Advanced Metrics Calculation
  const metrics = useMemo(() => {
    const activeModes = filteredModes || []
    const totalRPN = activeModes.reduce((acc: number, m: any) => acc + (m.rpn || 0), 0)
    const avgRPN = activeModes.length ? totalRPN / activeModes.length : 0
    const sri = Math.max(0, Math.round(100 * (1 - avgRPN / 500))) 
    
    const getMaturity = (mode: any) => Math.max(0, Math.min(8, Number(mode?.maturity_level ?? 0)))

    const maturityDist = activeModes.reduce((acc: any, mode: any) => {
      const lv = getMaturity(mode);
      acc[lv] = (acc[lv] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const mitigated = activeModes.filter((m: any) => (m.mitigations?.length || 0) > 0).length
    const mitRatio = activeModes.length ? Math.round((mitigated / activeModes.length) * 100) : 0
    const totalAssets = activeModes.reduce((acc: number, m: any) => acc + (m.affected_assets?.length || 0), 0)
    const riskDensity = totalAssets ? (totalRPN / totalAssets).toFixed(1) : '0.0'
    return { total: activeModes.length, sri, mitRatio, riskDensity, avgRPN: Math.round(avgRPN), maturityDist }
  }, [filteredModes])

  const currentSavedView = savedViews.find((view) => view.id === activeViewId) || savedViews[0]
  const applySystemDefault = useCallback(() => {
    const view = savedViews.find((candidate) => candidate.id === FAR_SYSTEM_VIEW_ID)
    if (view) applySavedView(view)
  }, [applySavedView, savedViews])

  const createSavedView = useCallback(async () => {
    const name = newViewName.trim()
    if (!name) {
      toast.error('Name the FAR view before saving it.')
      return
    }
    const result = await collaborativeViews.createView(name, currentViewDefinition)
    if (!result.view) {
      toast.error(result.error || 'Unable to save the FAR view.')
      return
    }
    setActiveViewId(result.view.id)
    collaborativeViews.setViewLink(result.view.id)
    setNewViewName('')
    toast.success(result.persisted ? 'FAR view saved.' : 'FAR view saved locally for offline fallback.')
  }, [collaborativeViews, currentViewDefinition, newViewName])

  const overwriteSavedView = useCallback(async (id: string) => {
    const view = savedViews.find((candidate) => candidate.id === id)
    if (!view) return
    const result = await collaborativeViews.updateView(id, view.name, currentViewDefinition)
    if (result.conflict) return
    if (!result.view) toast.error(result.error || 'Unable to overwrite the FAR view.')
    else toast.success(result.persisted ? 'FAR view updated.' : 'FAR view retained locally.')
  }, [collaborativeViews, currentViewDefinition, savedViews])

  const renameSavedView = useCallback(async (id: string, name: string) => {
    const view = savedViews.find((candidate) => candidate.id === id)
    if (!view) return false
    const result = await collaborativeViews.updateView(id, name, view.config)
    if (!result.view) {
      if (!result.conflict) toast.error(result.error || 'Unable to rename the FAR view.')
      return false
    }
    return true
  }, [collaborativeViews, savedViews])

  const deleteSavedView = useCallback(async (id: string) => {
    const result = await collaborativeViews.deleteView(id)
    if (!result.persisted && result.error) {
      toast.error(result.error)
      return
    }
    if (activeViewId === id) applySystemDefault()
  }, [activeViewId, applySystemDefault, collaborativeViews])

  const syncMessage = modesError
    ? (modesQueryError instanceof Error ? modesQueryError.message : 'FAR data validation failed.')
    : collaborativeViews.lastError || undefined

  return (
    <OperationalWorkspaceShell
      archetype="analytical"
      workspace="far"
      header={{
        eyebrow: 'Analysis',
        title: (
          <div className="flex items-center gap-3">
            <Target size={22} className="text-rose-500" />
            <span>Failure Matrix</span>
          </div>
        ),
        subtitle: 'Reliability Knowledge Engine // FMEA Studio',
      }}
      toolbarSearch={(
        <ToolbarSearch value={searchTerm} onChange={(event) => { markInteraction(); setSearchTerm(event.target.value) }} placeholder="Scan failure modes, causes, controls, owners..." ariaLabel="Search FAR failure modes" />
      )}
      toolbarControls={(
        <ToolbarGroup>
          <ToolbarButton ref={viewsButtonRef as any} active={showSavedViews} onClick={() => toggleContextPanel('views')} title="Collaborative FAR views">
            <Save size={14} /> Views
          </ToolbarButton>
          <ToolbarButton active={showStyleLab} onClick={() => toggleContextPanel('display')} title="Display density controls">
            <Sliders size={14} /> Display
          </ToolbarButton>
          <ToolbarButton active={showSystemFilters} onClick={() => toggleContextPanel('filters')} title="System filters">
            {showSystemFilters ? <EyeOff size={14} /> : <Eye size={14} />} Filters
          </ToolbarButton>
          <ToolbarButton
            active={showInsights}
            onClick={() => toggleContextPanel('insights')}
            title={showInsights ? 'Close reliability insights' : 'Open reliability insights'}
            ariaLabel="Insights"
            className={showInsights ? 'relative z-[120]' : ''}
          >
            <Activity size={14} /> Insights
          </ToolbarButton>
          <ToolbarIconButton onClick={() => toggleContextPanel('columns')} active={showColumnPicker} title="Column Configuration"><LayoutGrid size={16} /></ToolbarIconButton>
          <ToolbarIconButton onClick={() => setShowRpnHelp(true)} title="RPN Definition Matrix"><HelpCircle size={16} /></ToolbarIconButton>
          <ToolbarIconButton onClick={() => setShowConfig(true)} title="Matrix Registry Enums"><Settings size={16} /></ToolbarIconButton>
        </ToolbarGroup>
      )}
      toolbarActions={(
        <ToolbarGroup>
          <ToolbarIconButton onClick={handleExportCSV} title="Export filtered FAR CSV"><FileText size={16} /></ToolbarIconButton>
          <ToolbarIconButton onClick={() => void downloadExchange('structured').catch((error) => toast.error(error instanceof Error ? error.message : 'FAR recovery export failed.'))} title="Export versioned FAR recovery package"><Download size={16} /></ToolbarIconButton>
          <ToolbarIconButton onClick={handleCopyToClipboard} disabled={selectedIds.length === 0} title="Copy to Clipboard"><Clipboard size={16} /></ToolbarIconButton>
          <ToolbarButton disabled={mutationBlocked} onClick={() => !mutationBlocked && setShowImportModal(true)} title={mutationBlocked ? "Read-only offline/degraded mode" : "Import Bulk Risk Data"}><Upload size={14} /> Import</ToolbarButton>
          <ToolbarButton
            variant="danger"
            disabled={mutationBlocked || selectedIds.length === 0}
            onClick={openSelectedRetirementPreflight}
            title={mutationBlocked ? "Read-only offline/degraded mode" : "Review selected failure vectors before retirement preview"}
          ><Trash2 size={14} /> Retire Selected{selectedIds.length ? ` (${selectedIds.length})` : ''}</ToolbarButton>
          <ToolbarButton variant="danger" disabled={mutationBlocked} onClick={() => { if (mutationBlocked) return; selectMode(null); setShowWizard(true); }}><ShieldAlert size={14} /> Add Failure Mode</ToolbarButton>
        </ToolbarGroup>
      )}
      secondaryToolbar={(
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar" aria-label="FAR workspace controls">
          <div data-far-mode-control="true" className="flex shrink-0 items-center gap-1 rounded-lg border border-white/5 bg-black/20 p-1" role="tablist" aria-label="FAR analytical mode">
            {FAR_WORKSPACE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={workspaceMode === mode.id}
                tabIndex={workspaceMode === mode.id ? 0 : -1}
                onKeyDown={(event) => handleModeKeyDown(event, mode.id)}
                onClick={() => { markInteraction(); setWorkspaceMode(mode.id) }}
                className={`rounded-lg px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${workspaceMode === mode.id ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {FAR_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={preset === item.id}
                onClick={() => { markInteraction(); setPreset(item.id) }}
                className={`rounded-lg border px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${preset === item.id ? 'border-blue-500/40 bg-blue-500/15 text-blue-200' : 'border-white/5 bg-white/[0.03] text-slate-500 hover:text-white'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {showSystemFilters ? (
            <div data-far-filter-bar="true" className="flex shrink-0 items-center gap-2">
              <select aria-label="FAR status filter" value={statusFilter} onChange={(event) => { markInteraction(); setStatusFilter(event.target.value) }} className="h-8 shrink-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-[9px] font-bold uppercase text-slate-300">
                <option value="all">All statuses</option>
                <option value="Analyzing">Analyzing</option>
                <option value="Cause Identified">Cause Identified</option>
                <option value="Resolution Identified">Resolution Identified</option>
                <option value="Mitigated">Mitigated</option>
                <option value="Eliminated">Eliminated</option>
              </select>
              <select aria-label="FAR risk band filter" value={riskBandFilter} onChange={(event) => { markInteraction(); setRiskBandFilter(event.target.value) }} className="h-8 shrink-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-[9px] font-bold uppercase text-slate-300">
                <option value="all">All risk bands</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Moderate">Moderate</option>
                <option value="Low">Low</option>
              </select>
              <select aria-label="FAR owner filter" value={ownerFilter} onChange={(event) => { markInteraction(); setOwnerFilter(event.target.value) }} className="h-8 shrink-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-[9px] font-bold uppercase text-slate-300">
                <option value="all">All owners</option>
                {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
              </select>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => { markInteraction(); setSelectedSystems([]) }} className={`rounded-lg border px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider ${selectedSystems.length === 0 ? 'border-rose-500 bg-rose-600 text-white' : 'border-white/5 bg-white/5 text-slate-500'}`}>All systems</button>
                {availableSystems.map((system: string) => (
                  <button key={system} onClick={() => { markInteraction(); setSelectedSystems((current) => current.includes(system) ? current.filter((item) => item !== system) : [...current, system]) }} className={`rounded-lg border px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${selectedSystems.includes(system) ? 'border-white/20 bg-white/10 text-white' : 'border-white/5 bg-white/5 text-slate-500'}`}>{system}</button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
      floatingPanels={(
        <OperationalSavedViewsPanel
          isOpen={showSavedViews}
          panelRef={viewsPanelRef}
          panelStyle={viewsPanelStyle}
          entityLabel="FAR"
          onClose={() => setShowSavedViews(false)}
          activeViewId={activeViewId}
          currentViewName={currentSavedView?.name || 'FAR default'}
          newViewName={newViewName}
          onNewViewNameChange={setNewViewName}
          onCreateView={() => void createSavedView()}
          onApplySystemDefault={applySystemDefault}
          savedViews={savedViews}
          defaultViewIds={FAR_SYSTEM_VIEW_IDS}
          onApplyView={(id) => {
            const view = savedViews.find((candidate) => candidate.id === id)
            if (view) applySavedView(view)
          }}
          onOverwriteView={(id) => void overwriteSavedView(id)}
          onRenameView={renameSavedView}
          onDeleteView={(id) => void deleteSavedView(id)}
          describeView={(view) => {
            const config = sanitizeFARSavedViewDefinition(view.config)
            const mode = FAR_WORKSPACE_MODES.find((item) => item.id === config.filters.mode)?.label || 'Failure Modes'
            return `${mode} · ${config.filters.preset} · ${config.filters.riskBand === 'all' ? 'all risks' : config.filters.riskBand}`
          }}
          syncStatus={collaborativeViews.status}
          syncMessage={syncMessage}
          onCopyViewLink={(id) => void collaborativeViews.copyViewLink(id)}
          conflictMessage={collaborativeViews.conflict?.message}
          onReloadConflict={collaborativeViews.reloadConflict}
          onSaveConflictCopy={() => void collaborativeViews.saveConflictCopy()}
        />
      )}
    >
      <AnimatePresence>
        {showStyleLab && (
          <motion.div data-far-display-controls="true" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} role="dialog" aria-label="FAR display controls" className="fixed inset-x-3 bottom-3 z-[110] max-h-[70vh] overflow-auto md:inset-x-auto md:bottom-auto md:right-4 md:top-36 md:w-[680px]">
            <div className="bg-slate-950/95 border border-rose-500/20 rounded-lg p-4 flex items-center justify-between gap-4 backdrop-blur-xl shadow-2xl">
               <div className="flex items-center space-x-12">
                  <div className="flex items-center space-x-3">
                     <Activity size={16} className="text-rose-400" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Display Density</span>
                  </div>
                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4"><span className="text-[9px] font-bold text-slate-500 uppercase">Font Size</span><div className="flex items-center space-x-2"><input type="range" min="8" max="14" step="1" value={fontSize} onChange={e => { markInteraction(); setFontSize(Number(e.target.value)) }} className="w-32 accent-rose-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"/><span className="text-[10px] text-white w-4 font-bold">{fontSize}px</span></div></div>
                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6"><span className="text-[9px] font-bold text-slate-500 uppercase">Row Density</span><div className="flex items-center space-x-2"><input type="range" min="4" max="24" step="2" value={rowDensity} onChange={e => { markInteraction(); setRowDensity(Number(e.target.value)) }} className="w-32 accent-rose-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"/><span className="text-[10px] text-white w-4 font-bold">{rowDensity}px</span></div></div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInsights && (
          <motion.div data-far-insights="true" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} role="dialog" aria-modal="false" aria-label="FAR reliability insights" className="fixed inset-x-3 bottom-3 z-[109] max-h-[75vh] overflow-auto md:inset-x-auto md:bottom-auto md:right-4 md:top-[26rem] md:max-h-[calc(100vh-27rem)] md:w-[720px]">
            <div className="glass-panel rounded-lg border border-white/10 bg-slate-950/95 p-4 space-y-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-white">Reliability insights</h2>
                <button
                  type="button"
                  onClick={() => setShowInsights(false)}
                  aria-label="Close reliability panel"
                  title="Close reliability panel"
                  className="relative z-[121] rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <StatCard id="failure-modes" label="Failure Modes" value={metrics.total} suffix="RECORDS" color="rose" onHelp={() => setActiveMetricHelp("SRI")} />
                <StatCard id="SRI" label="Reliability Index" value={metrics.sri} suffix="/100" color={metrics.sri > 70 ? "emerald" : "rose"} onHelp={() => setActiveMetricHelp("SRI")} />
                <StatCard id="RiskDensity" label="Risk Density" value={metrics.riskDensity} suffix="RPN/ASSET" color="amber" onHelp={() => setActiveMetricHelp("RiskDensity")} />
                <StatCard id="MitigationRatio" label="Mitigation Ratio" value={metrics.mitRatio} suffix="%" color="sky" onHelp={() => setActiveMetricHelp("MitigationRatio")} />
                <StatCard id="AvgSeverity" label="Avg Severity" value={metrics.avgRPN} suffix="AVG RPN" color="rose" onHelp={() => setActiveMetricHelp("AvgSeverity")} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-rose-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white">Failure Inventory Maturity Profile</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-end gap-1 h-8">
                    {maturityLevels.slice().reverse().map((ml: any) => {
                      const count = (metrics as any).maturityDist[ml.lv] || 0
                      const pct = filteredModes?.length ? (count / filteredModes.length) * 100 : 0
                      return (
                        <div key={ml.lv} className="w-4 h-full relative group cursor-help">
                          <div className={`w-full rounded-lg transition-all ${ml.color} ${count === 0 ? 'opacity-5' : 'opacity-40 group-hover:opacity-100'}`} style={{ height: `${Math.max(10, pct)}%` }} />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-nowrap bg-black border border-white/10 px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest">
                            {ml.label}: {count}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="w-px h-4 bg-white/10 mx-2" />
                  <button onClick={() => setShowMaturityHelp(true)} className="p-1 text-slate-500 hover:text-white transition-colors" title="Maturity Level Definitions"><HelpCircle size={14} /></button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="flex-1 min-h-0 relative"
        data-far-grid="true"
        data-far-loading={modesLoading ? 'true' : undefined}
        data-far-empty={!modesLoading && !modesError && filteredModes.length === 0 ? 'true' : undefined}
        data-far-error={modesError && !(modes?.length) ? 'true' : undefined}
        data-far-sync-state={!isOnline || modesError ? 'offline' : collaborativeViews.status}
      >
        <OperationalDataGrid
          gridRef={gridRef}
          rows={filteredModes || []}
          columnDefs={columnDefs as any}
          runtime={farGridRuntime}
          onFirstDataRendered={(event) => {
            if (!firstDataColumnLayoutAppliedRef.current) {
              firstDataColumnLayoutAppliedRef.current = true
              applyInitialColumnLayout(event.api)
            }
            synchronizeAnalyticalFocus(event.api)
          }}
          onRowDataUpdated={(event) => synchronizeAnalyticalFocus(event.api)}
          quickFilterText={searchTerm}
          fontSize={fontSize}
          rowDensity={rowDensity}
          noRowsLabel="No failure modes in scope"
          loading={modesLoading}
          loadingIcon={<RefreshCcw size={28} className="animate-spin text-rose-400" />}
          loadingLabel={<p className="text-[10px] font-semibold text-rose-300">Loading failure analysis registry...</p>}
          stateAction={modesError && !(modes?.length) ? (
            <button
              type="button"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['far', 'modes'] })}
              className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-rose-200 hover:bg-rose-500/20"
            >
              Retry
            </button>
          ) : (!modesLoading && filteredModes.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                markInteraction()
                setPreset('all')
                setWorkspaceMode('failure_modes')
                setStatusFilter('all')
                setRiskBandFilter('all')
                setOwnerFilter('all')
                setSelectedSystems([])
                setSearchTerm('')
              }}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-200 hover:bg-white/[0.08]"
            >
              Clear filters
            </button>
          ) : undefined)}
          dataState={modesError && !(modes?.length) ? {
            kind: 'query-error',
            noRowsLabel: 'No failure modes in scope',
            title: 'Failure analysis registry unavailable',
            description: modesQueryError instanceof Error ? modesQueryError.message : 'The FAR registry could not be loaded or failed strict contract validation.',
          } : (!modesLoading && filteredModes.length === 0 ? {
            kind: 'filtered-empty',
            noRowsLabel: 'No failure modes in scope',
            title: 'No failure modes in scope',
            description: 'Create a failure mode or adjust the current analytical mode, preset, system, owner, status, risk, or search filters.',
            notice: deepLinkNotice ? { tone: 'info', title: 'FAR record unavailable', description: deepLinkNotice } : !isOnline || modesError ? { tone: 'warning', title: 'Read-only offline fallback', description: 'The last validated FAR snapshot remains visible. Mutations are disabled and are not queued.' } : collaborativeViews.status === 'offline' ? { tone: 'warning', title: 'Saved-view persistence unavailable', description: 'Remote saved-view changes cannot be persisted right now.' } : undefined,
          } : {
            kind: 'ready',
            noRowsLabel: 'No failure modes in scope',
            notice: deepLinkNotice
              ? { tone: 'info', title: 'FAR record unavailable', description: deepLinkNotice }
              : !isOnline || modesError
              ? { tone: 'warning', title: 'Read-only offline fallback', description: 'The last validated FAR snapshot remains visible. Mutations are disabled and are not queued.' }
              : collaborativeViews.status === 'offline'
                ? { tone: 'warning', title: 'Saved-view persistence unavailable', description: 'Remote saved-view changes cannot be persisted right now.' }
              : collaborativeViews.status === 'conflict'
                ? { tone: 'error', title: 'Saved-view conflict', description: collaborativeViews.conflict?.message || 'Reload the server view or save a personal copy.' }
                : collaborativeViews.status === 'unsaved'
                  ? { tone: 'info', title: 'Unsaved view changes', description: 'The current FAR layout differs from the active saved view.' }
                  : undefined,
          })}
          onSelectionChanged={(event) => setSelectedIds(event?.api?.getSelectedNodes().map((node: any) => Number(node.data?.id)).filter(Boolean) || [])}
          suppressRowClickSelection={false}
        />
        <AnimatePresence>
          {showColumnPicker && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} role="dialog" aria-label="FAR column controls" className="absolute top-0 right-0 bottom-0 w-64 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 z-[60] flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-widest text-rose-400 flex items-center space-x-2"><Sliders size={14} /> <span>Columns</span></h3><button onClick={() => setShowColumnPicker(false)} className="text-slate-500 hover:text-white"><X size={18}/></button></div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                {columnDefs.filter((c: any) => c.field && !c.lockVisible).map((col: any) => (
                  <label key={col.field} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all">
                    <input type="checkbox" checked={!hiddenColumns.includes(col.field)} onChange={() => { markInteraction(); setHiddenColumns(prev => prev.includes(col.field) ? prev.filter(f => f !== col.field) : [...prev, col.field]) }} className="sr-only" />
                    <div className={`w-4 h-4 rounded-lg border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-rose-600 border-rose-500 shadow-lg shadow-rose-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>{!hiddenColumns.includes(col.field) && <Check size={12} className="text-white mx-auto" />}</div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>{col.headerName || col.field}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
          {selectedModeId && selectedMode && (
            <FailureDetailView
              mode={selectedMode}
              allModes={modes || []}
              onClose={() => selectMode(null)}
              onUpdate={(type: string) => {
                if (type === 'edit') {
                  setShowWizard(true);
                } else {
                  queryClient.invalidateQueries({ queryKey: ['far', 'modes'] });
                }
              }}
              setBkmGuidanceModal={setBkmGuidanceModal}
              setResolutionManagerModal={setResolutionManagerModal}
            />
          )}
      </AnimatePresence>

      <AnimatePresence>
        {incidentListModal.show && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-4xl p-8 rounded-lg border border-purple-500/30 space-y-6 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-xl font-bold uppercase tracking-tighter text-purple-400 flex items-center space-x-3">
                   <ShieldAlert size={24}/> <span>Linked Incident Forensic Registry</span>
                </h2>
                <button onClick={() => setIncidentListModal({ show: false, rcas: [] })} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead className="sticky top-0 bg-slate-900 border-b border-white/10 z-10">
                      <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                         <th className="py-3 px-4 w-12 text-center text-blue-400">#</th>
                         <th className="py-3 px-4 w-16">ID</th>
                         <th className="py-3 px-4">Incident Title</th>
                         <th className="py-3 px-4 w-40">Occurrence Datetime</th>
                         <th className="py-3 px-4 w-32">Lead Owner</th>
                         <th className="py-3 px-4 w-24 text-center">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {incidentListModal.rcas.map((r: any, idx: number) => (
                        <tr 
                          key={r.id}
                          onClick={() => {
                            setSelectedRcaDetail(r);
                            setIncidentListModal({ show: false, rcas: [] });
                          }}
                          className="group cursor-pointer hover:bg-purple-500/5 transition-colors"
                        >
                          <td className="py-4 px-4 text-center text-[10px] font-bold text-slate-600 group-hover:text-blue-400">{idx + 1}</td>
                          <td className="py-4 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">RCA-{r.id}</td>
                          <td className="py-4 px-4">
                             <div className="text-[11px] font-bold text-slate-200 uppercase group-hover:text-white transition-colors leading-tight">{r.title}</div>
                          </td>
                          <td className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                             {r.occurrence_at ? formatAppDate(r.occurrence_at, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'N/A'}
                          </td>
                          <td className="py-4 px-4">
                             <div className="text-[10px] font-bold text-blue-400/70 group-hover:text-blue-400 uppercase tracking-widest truncate max-w-[120px]">
                                {r.owners?.[0] || r.owner || 'N/A'}
                             </div>
                          </td>
                          <td className="py-4 px-4">
                             <div className="flex justify-center">
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg border ${
                                   r.status === 'RESOLVED' || r.status === 'CLOSED' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-purple-400 border-purple-500/30 bg-purple-500/10'
                                }`}>{r.status}</span>
                             </div>
                          </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </div>
              <button onClick={() => setIncidentListModal({ show: false, rcas: [] })} className="w-full py-3.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all">Dismiss Registry View</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedRcaDetail && (
          <EnhancedRcaDetails 
            item={selectedRcaDetail} 
            devices={[]} // We can pass an empty array or fetch devices if needed
            options={options}
            failureModes={modes}
            onClose={() => setSelectedRcaDetail(null)} 
            onSave={() => {
              setSelectedRcaDetail(null);
              queryClient.invalidateQueries({ queryKey: ['far', 'modes'] });
            }}
            fontSize={fontSize}
            rowDensity={rowDensity}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMaturityHelp && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-2xl rounded-lg border border-white/10 bg-slate-900 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                   <h2 className="text-xl font-bold uppercase tracking-widest text-white ">Maturity Matrix Glossary</h2>
                   <button onClick={() => setShowMaturityHelp(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                </div>
                <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                   <table className="w-full text-xs">
                      <thead className="bg-white/5 border-b border-white/5">
                         <tr>
                            <th className="px-4 py-2 text-center font-bold uppercase tracking-widest text-slate-500">Lv</th>
                            <th className="px-4 py-2 text-left font-bold uppercase tracking-widest text-slate-500">Status Title</th>
                            <th className="px-4 py-2 text-left font-bold uppercase tracking-widest text-slate-500">Architecture Definition</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {[...maturityLevels].reverse().map(ml => (
                           <tr key={ml.lv} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-lg font-bold text-white shadow-lg ${ml.color}`}>{ml.lv}</span></td>
                              <td className="px-4 py-3 font-bold text-white uppercase ">{ml.label}</td>
                              <td className="px-4 py-3 text-slate-400 font-bold tracking-tight">{ml.tooltip}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </motion.div>
          </div>
        )}

        {showRpnHelp && (
          <RpnDefinitionModal onClose={() => setShowRpnHelp(false)} />
        )}
      </AnimatePresence>

      <MetricHelpModal metric={activeMetricHelp} onClose={() => setActiveMetricHelp(null)} />

      <ConfigRegistryModal isOpen={showConfig} onClose={() => setShowConfig(false)} title="Reliability Matrix Registry" sections={[{ title: "Systems", category: "LogicalSystem", icon: LayoutGrid }, { title: "Risk Cats", category: "RiskCategory", icon: Target }, { title: "Teams", category: "BusinessUnit", icon: User }]} />
      <FARImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['far', 'modes'] })}
      />

      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-6xl h-[85vh] flex flex-col rounded-lg border border-rose-500/20 overflow-hidden shadow-2xl">
               <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
                  <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tighter text-white">{selectedMode ? 'Edit Failure Mode' : 'New Failure Mode'}</h1>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em]">Reliability Engineering Risk Documentation Studio</p>
                  </div>
                  <button onClick={() => setShowWizard(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                 <FARWizard initialData={selectedMode} onComplete={() => { setShowWizard(false); queryClient.invalidateQueries({ queryKey: ['far', 'modes'] }); }} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <WorkspaceModal
        isOpen={Boolean(retirementPreflight)}
        onClose={() => { setRetirementPreflight(null); setRetirementReason('') }}
        size="standard"
        icon={<ShieldAlert size={17} className="text-rose-300" />}
        title="FAR bulk preview"
        subtitle="Prepare an evidence-preserving retirement preview before anything changes."
        hideFooterClose
        footerLeft={(
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck size={14} className="text-emerald-300" />
            Selection is staged only; no record changes until the server preview is confirmed.
          </div>
        )}
        footerRight={(
          <>
            <ToolbarButton onClick={() => { setRetirementPreflight(null); setRetirementReason('') }}>Cancel</ToolbarButton>
            <ToolbarButton
              variant="danger"
              disabled={!retirementPreflight || retirementReason.trim().length < 3}
              ariaLabel="Prepare retirement preview"
              onClick={() => {
                if (!retirementPreflight) return
                requestBulkPreview({
                  action: 'delete',
                  ids: retirementPreflight.ids,
                  payload: { reason: retirementReason.trim() },
                })
                setRetirementPreflight(null)
              }}
            >
              <Eye size={14} /> Prepare preview
            </ToolbarButton>
          </>
        )}
      >
        <div className="space-y-5 pt-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/70 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Requested action</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">Retire failure vectors</p>
            <p className="pt-1 text-xs text-slate-400">{retirementPreflight?.title || 'Selected failure vector'}</p>
            <p className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{retirementPreflight?.ids.length || 0} failure vector{retirementPreflight?.ids.length === 1 ? '' : 's'} staged</p>
          </div>
          <label htmlFor="far-retirement-preflight-reason" className="block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Retirement reason</span>
            <textarea
              id="far-retirement-preflight-reason"
              data-far-retirement-reason="true"
              value={retirementReason}
              onChange={(event) => setRetirementReason(event.target.value)}
              placeholder="Required before preview"
              className="min-h-[110px] w-full rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-slate-100 outline-none transition-colors focus:border-rose-500/40"
            />
          </label>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            The preview remains blocked until the reason contains at least three characters.
          </div>
        </div>
      </WorkspaceModal>

      <OperationalBulkPreviewModal
        isOpen={Boolean(bulkOperationPreview)}
        workspaceLabel="FAR"
        actionLabel="Retire failure vectors"
        preview={bulkOperationPreview?.preview || null}
        previewBasis="workspace-snapshot"
        result={bulkOperationPreview?.result || null}
        isExecuting={bulkMutation.isPending}
        onClose={() => setBulkOperationPreview(null)}
        onConfirm={() => bulkOperationPreview && bulkMutation.mutate({
          action: bulkOperationPreview.action,
          ids: bulkOperationPreview.ids,
          payload: bulkOperationPreview.payload,
        })}
      />

      <AnimatePresence>
        {bkmGuidanceModal.show && bkmGuidanceModal.cause && (
          <BkmGuidanceModal 
            cause={bkmGuidanceModal.cause} 
            onClose={() => setBkmGuidanceModal({ show: false, cause: null })} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resolutionManagerModal.show && resolutionManagerModal.cause && (
          <ResolutionManagerModal 
            isOpen={resolutionManagerModal.show}
            cause={resolutionManagerModal.cause}
            modeId={selectedMode?.id}
            onClose={() => setResolutionManagerModal({ show: false, cause: null })}
            onSave={() => queryClient.invalidateQueries({ queryKey: ['far', 'modes'] })}
          />
        )}
      </AnimatePresence>
    </OperationalWorkspaceShell>
  )
}

function parseFARCsv(text: string): Record<string, unknown>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }
  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  if (rows.length < 2) return []
  const headers = rows[0].map((value) => value.trim())
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function FARImportModal({ isOpen, onClose, onImported }: { isOpen: boolean; onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState('')
  const [schemaId, setSchemaId] = useState('sysgrid.far.v1')
  const [records, setRecords] = useState<Record<string, unknown>[]>([])
  const [preview, setPreview] = useState<any>(null)
  const [previewKey, setPreviewKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) return
    setFileName('')
    setSchemaId('sysgrid.far.v1')
    setRecords([])
    setPreview(null)
    setPreviewKey('')
    setError(null)
  }, [isOpen])

  const previewMutation = useMutation({
    mutationFn: async () => {
      assertFAROnline()
      if (!records.length) throw new Error('Choose a FAR JSON or CSV file containing at least one record.')
      const idempotencyKey = newIdempotencyKey('far-import-preview')
      const response = await apiFetch('/api/v1/far/exchange/import/preview', {
        method: 'POST',
        body: JSON.stringify({ schema_id: schemaId, records, idempotency_key: idempotencyKey }),
      })
      if (!response.ok) throw new Error(await response.text())
      setPreviewKey(idempotencyKey)
      return response.json()
    },
    onSuccess: setPreview,
    onError: (reason: any) => setError(reason?.message || 'FAR import preview failed.'),
  })

  const executeMutation = useMutation({
    mutationFn: async () => {
      assertFAROnline()
      if (!preview?.can_execute || !preview?.preview_token || !previewKey) throw new Error('A valid import preview is required.')
      const response = await apiFetch('/api/v1/far/exchange/import/execute', {
        method: 'POST',
        body: JSON.stringify({
          preview_token: preview.preview_token,
          preview_hash: preview.preview_hash,
          idempotency_key: previewKey,
          confirm: true,
        }),
      })
      if (!response.ok) throw new Error(await response.text())
      return response.json()
    },
    onSuccess: (result: any) => {
      toast.success(`Imported ${Number(result?.changed_count || 0)} FAR records.`)
      onImported()
      onClose()
    },
    onError: (reason: any) => setError(reason?.message || 'FAR import execution failed.'),
  })

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="FAR import">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 p-6">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">Validated FAR Import</h2>
            <p className="pt-1 text-[10px] font-semibold text-slate-400">Preview first. Execution is transactional, actor-bound, tenant-bound, and idempotent.</p>
          </div>
          <button onClick={onClose} aria-label="Close FAR import" className="text-slate-500 hover:text-white"><X size={20} /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <label className="block rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
            <Upload size={24} className="mx-auto text-rose-400" />
            <span className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-slate-300">{fileName || 'Choose sysgrid.far.v1 JSON or legacy FAR CSV'}</span>
            <input
              type="file"
              accept=".json,.csv,application/json,text/csv"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setError(null)
                setPreview(null)
                setFileName(file.name)
                try {
                  const text = await file.text()
                  if (file.name.toLowerCase().endsWith('.csv')) {
                    setSchemaId('far_records')
                    setRecords(parseFARCsv(text))
                  } else {
                    const payload = JSON.parse(text)
                    const nextRecords = Array.isArray(payload) ? payload : payload?.records
                    if (!Array.isArray(nextRecords)) throw new Error('JSON must be an array or a FAR package with a records array.')
                    setSchemaId(typeof payload?.schema_id === 'string' ? payload.schema_id : 'sysgrid.far.v1')
                    setRecords(nextRecords)
                  }
                } catch (reason: any) {
                  setRecords([])
                  setError(reason?.message || 'Unable to parse the selected file.')
                }
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 text-[10px] font-semibold text-slate-400">
            <div className="rounded-lg border border-white/5 bg-black/20 p-3"><span className="block text-slate-500">Schema</span><span className="text-white">{schemaId}</span></div>
            <div className="rounded-lg border border-white/5 bg-black/20 p-3"><span className="block text-slate-500">Rows</span><span className="text-white">{records.length}</span></div>
          </div>
          {preview ? (
            <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold uppercase">
                <div className="rounded-lg bg-blue-500/10 p-3 text-blue-300">{preview.record_count} total</div>
                <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-300">{preview.valid_count} valid</div>
                <div className="rounded-lg bg-amber-500/10 p-3 text-amber-300">{preview.warning_count} warnings</div>
                <div className="rounded-lg bg-rose-500/10 p-3 text-rose-300">{preview.error_count} errors</div>
              </div>
              {preview.errors?.length ? <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-rose-950/30 p-3 text-[9px] text-rose-200">{JSON.stringify(preview.errors, null, 2)}</pre> : null}
              {preview.warnings?.length ? <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-amber-950/20 p-3 text-[9px] text-amber-200">{JSON.stringify(preview.warnings, null, 2)}</pre> : null}
            </div>
          ) : null}
          {error ? <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-[10px] text-rose-200">{error}</div> : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-white/10 p-5">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-[10px] font-bold uppercase text-slate-300">Cancel</button>
          <button onClick={() => previewMutation.mutate()} disabled={!records.length || previewMutation.isPending || executeMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-[10px] font-bold uppercase text-white disabled:opacity-40">{previewMutation.isPending ? 'Previewing…' : 'Preview import'}</button>
          <button onClick={() => executeMutation.mutate()} disabled={!preview?.can_execute || executeMutation.isPending} className="rounded-lg bg-rose-600 px-4 py-2 text-[10px] font-bold uppercase text-white disabled:opacity-40">{executeMutation.isPending ? 'Importing…' : 'Confirm import'}</button>
        </div>
      </motion.div>
    </div>
  )
}

function BkmGuidanceModal({ cause, onClose }: { cause: any, onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-4xl p-8 rounded-lg border border-emerald-500/30 space-y-6 flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(16,185,129,0.1)]">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                <ShieldCheck size={28}/>
             </div>
             <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-emerald-400 flex items-center space-x-3">
                   <span>Operational Guidance Registry</span>
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Forensic Lineage // {cause.cause_text}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="space-y-4">
            {(cause.resolutions || []).map((res: any, idx: number) => (
              <div key={res.id} className="bg-white/5 border border-white/5 rounded-lg overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl">
                 <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <span className="text-xl font-black text-slate-700">{idx + 1}</span>
                       <div>
                          <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest leading-none">
                             {res.knowledge_bkm?.title || 'UNNAMED_BKM_ARTIFACT'}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                             <div className="flex items-center gap-1.5">
                                <Clock size={10} className="text-slate-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                   Logged {formatAppDate(res.created_at)}
                                </span>
                             </div>
                             <div className="w-px h-2 bg-white/10" />
                             <div className="flex items-center gap-1.5">
                                <User size={10} className="text-slate-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                   {res.responsible_team || 'SYSTEM_OPS'}
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/knowledge?id=${res.knowledge_id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-lg group-hover:scale-105"
                    >
                       <Zap size={12} />
                       Jump to BKM
                    </button>
                 </div>
                 <div className="p-6 space-y-4">
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Operational Context & Guidance</p>
                       <div className="bg-black/40 border border-white/5 rounded-lg p-4 text-[13px] text-slate-300 font-bold uppercase leading-relaxed tracking-tight shadow-inner">
                          {res.guidance_notes || res.preventive_follow_up || 'NO OPERATIONAL GUIDANCE PROVIDED FOR THIS RESOLUTION VECTOR.'}
                       </div>
                    </div>
                 </div>
              </div>
            ))}
            {(!cause.resolutions || cause.resolutions.length === 0) && (
              <div className="py-20 flex flex-col items-center justify-center opacity-20 space-y-4">
                 <Shield size={48} className="text-slate-500" />
                 <WorkspaceEmptyState title="No guidance protocols found" description="No standard operating procedures are linked." />
              </div>
            )}
          </div>
        </div>

        <div className="pt-4">
           <button onClick={onClose} className="w-full py-4 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all">Dismiss Guidance Registry</button>
        </div>
      </motion.div>
    </div>
  )
}

function StatCard({ id, label, value, suffix, color, onHelp }: any) {
  const bgColors: any = { emerald: 'bg-emerald-500/5', rose: 'bg-rose-500/5', amber: 'bg-amber-500/5', sky: 'bg-sky-500/5' }
  const textColors: any = { emerald: 'text-emerald-400', rose: 'text-rose-400', amber: 'text-amber-400', sky: 'text-sky-400' }
  return (
    <div data-far-metric={id} className={`glass-panel p-4 rounded-lg border-white/5 ${bgColors[color]} flex flex-col justify-between group overflow-hidden relative min-h-[90px] w-64`}>
      <div className="flex items-center justify-between relative z-10">
         <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
         <button onClick={onHelp} className="p-1 text-slate-600 hover:text-white transition-colors"><HelpCircle size={12}/></button>
      </div>
      <div className="flex items-baseline gap-1 relative z-10 leading-none mt-2">
         <h4 className={`text-2xl font-bold tracking-tighter  ${textColors[color]}`}>{value}</h4>
         <span className="text-[9px] font-bold text-slate-600 uppercase  tracking-tighter">{suffix}</span>
      </div>
    </div>
  )
}

function FailureDetailView({ mode, allModes, onClose, onUpdate, setBkmGuidanceModal, setResolutionManagerModal }: { mode: any, allModes: any[], onClose: () => void, onUpdate: (type: string) => void, setBkmGuidanceModal: any, setResolutionManagerModal: any }) {
  const [activeTab, setActiveTab] = useState('causal')
  const [showAllAssets, setShowAllAssets] = useState(false)

  const systemRank = useMemo(() => {
    if (!allModes) return 0;
    const sameSystem = allModes.filter((m: any) => m.system_name === mode.system_name)
      .sort((a: any, b: any) => b.rpn - a.rpn);
    return sameSystem.findIndex((m: any) => m.id === mode.id) + 1;
  }, [allModes, mode.id, mode.system_name]);

  const humanSummary = useMemo(() => {
    if (mode.rpn >= 300) return "This is a high-criticality risk with significant operational exposure. Immediate mitigation is prioritized.";
    if (mode.rpn >= 100) return "This failure mode represents a moderate operational risk. Standard monitoring is recommended.";
    return "This is a low-impact failure mode with established containment vectors.";
  }, [mode.rpn]);

  return (
    <div data-far-overlay="true" data-far-detail-record={String(mode.id)} className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6 font-bold uppercase tracking-tight" role="dialog" aria-modal="true" aria-label="Failure mode dossier">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-[1200px] h-[90vh] flex flex-col rounded-lg border border-rose-500/30 bg-[#02040a] overflow-hidden shadow-2xl relative">
         
         {/* HEADER SECTION */}
         <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex flex-col shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/5 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                      <div className="px-2 py-0.5 rounded-lg bg-rose-600/10 border border-rose-500/20 text-[9px] font-bold text-rose-500  uppercase">VECTOR_{mode.id}</div>
                      <div className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400  uppercase tracking-widest">{mode.system_name}</div>
                      <div className="px-2 py-0.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-[9px] font-bold text-blue-400  uppercase tracking-widest">RANK #{systemRank}</div>
                  </div>
                  <h2 className="text-3xl font-bold text-white  tracking-tighter leading-none uppercase">{mode.title}</h2>
                  <p className="text-xs text-rose-400 italic font-medium lowercase tracking-normal mt-1">"{humanSummary}"</p>
              </div>

              <div className="flex items-center gap-4">
                  <div className="flex gap-1.5 bg-black/40 p-1.5 rounded-lg border border-white/5 shadow-xl">
                      <HeaderScore label="S" value={mode.severity} color="rose" />
                      <HeaderScore label="O" value={mode.occurrence} color="amber" />
                      <HeaderScore label="D" value={mode.detection} color="sky" />
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 ">Risk Priority</p>
                      <div className="flex items-baseline gap-1 leading-none">
                         <p className={`text-4xl font-bold tracking-tighter ${mode.rpn >= 300 ? 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'text-white'}`}>{mode.rpn}</p>
                         <p className="text-[8px] font-bold text-slate-500  uppercase">RPN</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button 
                      onClick={() => onUpdate('edit')} 
                      className="p-2 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 rounded-lg text-amber-400 hover:text-white transition-all"
                      title="Edit Matrix Configuration"
                    >
                      <Edit2 size={18}/>
                    </button>
                    <button onClick={onClose} aria-label="Close failure mode dossier" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all border border-white/10"><X size={20}/></button>
                  </div>
              </div>
            </div>

            {/* EFFECT & IMPACTS ON OWN ROW */}
            <div className="mt-4 flex flex-col space-y-3 relative z-10">
               <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg px-4 py-2 flex items-center gap-3">
                  <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest shrink-0">Effect Forensics:</p>
                  <p className="text-[11px] text-slate-200 font-bold uppercase  tracking-tight leading-none truncate">{mode.effect || 'NULL_EFFECT_STATEMENT'}</p>
               </div>

               <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] text-slate-500 font-bold mr-2 uppercase tracking-widest">Affected Infrastructure:</span>
                  {mode.affected_assets?.slice(0, showAllAssets ? undefined : 3).map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-slate-400 ">
                       <Server size={10} className="text-rose-500" /> {a.name}
                    </div>
                  ))}
                  {mode.affected_assets?.length > 3 && (
                    <button onClick={() => setShowAllAssets(!showAllAssets)} className="px-2 py-0.5 bg-rose-600/10 border border-rose-500/20 rounded-lg text-[9px] font-bold text-rose-500  hover:bg-rose-600/20 transition-all">
                       {showAllAssets ? 'SHOW LESS' : `+ ${mode.affected_assets.length - 3} MORE ENTITIES`}
                    </button>
                  )}
                  {(!mode.affected_assets || mode.affected_assets.length === 0) && <span className="text-[9px] text-slate-700  font-bold uppercase tracking-widest">No infrastructure mappings established</span>}
               </div>
            </div>

            {/* TABS ON OWN ROW */}
            <div className="mt-6 flex items-center relative z-10">
               <div className="flex space-x-1 bg-black/60 p-0.5 rounded-lg border border-white/5">
                 {[{ id: 'causal', label: 'Causal Forensics', icon: Zap }, { id: 'roadmap', label: 'Strategic Roadmap', icon: ShieldCheck }, { id: 'history', label: 'Research History', icon: Activity }].map(t => (
                   <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-6 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === t.id ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><t.icon size={12} /> {t.label}</button>
                 ))}
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-hidden flex flex-col p-6">
            <AnimatePresence mode="wait">
               {activeTab === 'causal' && <CausalTab mode={mode} onUpdate={onUpdate} setBkmGuidanceModal={setBkmGuidanceModal} setResolutionManagerModal={setResolutionManagerModal} />}
               {activeTab === 'roadmap' && <RoadmapTab mode={mode} onUpdate={onUpdate} />}
               {activeTab === 'history' && <HistoryTab mode={mode} onUpdate={onUpdate} />}
            </AnimatePresence>
         </div>

         <div className="px-8 py-2 bg-black/80 border-t border-white/5 flex items-center justify-between shrink-0">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">System Integrity Vector Analysis // {mode.title}</p>
            <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
               <span>S: {mode.severity}</span>
               <span className="w-1 h-1 rounded-full bg-slate-800" />
               <span>O: {mode.occurrence}</span>
               <span className="w-1 h-1 rounded-full bg-slate-800" />
               <span>D: {mode.detection}</span>
            </div>
         </div>
      </motion.div>
    </div>
  )
}

function HeaderScore({ label, value, color }: any) {
  const textColors: any = { rose: 'text-rose-500', amber: 'text-amber-500', sky: 'text-sky-400' }
  const bgColors: any = { rose: 'bg-rose-500/10', amber: 'bg-amber-500/10', sky: 'bg-sky-500/10' }
  const borderColors: any = { rose: 'border-rose-500/20', amber: 'border-amber-500/20', sky: 'border-sky-500/20' }
  return (
    <div className={`w-11 h-11 rounded-lg ${bgColors[color]} border ${borderColors[color]} flex flex-col items-center justify-center`}>
       <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</p>
       <p className={`text-xl font-bold leading-none ${textColors[color]}`}>{value}</p>
    </div>
  )
}

export function GaugeSelector({ label, value, onChange, levels, color, accent }: any) {
  const current = levels.find((l: any) => l.value === value)
  return (
    <div className="space-y-3">
       <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-400  tracking-widest uppercase">{label}</label>
          <div className="flex items-center gap-2">
             <span className={`text-2xl font-bold ${color}`}>{value}</span>
             <span className="text-slate-700 text-[10px] font-bold">/ 10</span>
          </div>
       </div>
       <div className="relative h-2 bg-black/40 rounded-lg border border-white/5">
          <div className={`absolute left-0 top-0 h-full rounded-lg ${accent} transition-all duration-300`} style={{ width: `${(value / 10) * 100}%` }} />
          <input 
            type="range" min="1" max="10" step="1" 
            value={value} 
            onChange={e => onChange(Number(e.target.value))}
            onClick={e => e.stopPropagation()}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
       </div>
       <div className="bg-black/20 border border-white/5 rounded-lg p-3 min-h-[50px]">
          <p className={`text-[11px] font-bold uppercase  ${color} leading-none mb-1.5`}>{current?.label}</p>
          <p className="text-[10px] text-slate-500 font-bold leading-tight lowercase">{current?.desc}</p>
       </div>
    </div>
  )
}

function FARWizard({ initialData, onComplete }: any) {
  const buildFormData = (value: any) => {
    const base = {
      system_name: '',
      failure_type: 'Design',
      title: '',
      effect: '',
      severity: 1,
      occurrence: 1,
      detection: 1,
      affected_assets: [],
      status: 'Analyzing',
      owner_user_id: null,
      owner_team: null,
      due_at: null,
      ...value
    }
    if (base.affected_assets && base.affected_assets.length > 0 && typeof base.affected_assets[0] === 'object') {
      base.affected_assets = base.affected_assets.map((a: any) => a.id)
    }
    return base
  }
  const [formData, setFormData] = useState<any>(() => {
    return buildFormData(initialData)
  })
  const [assetSearch, setAssetSearch] = useState('')
  useEffect(() => {
    setFormData(buildFormData(initialData))
    setAssetSearch('')
  }, [initialData])
  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })
  const systems = options?.filter((o: any) => o.category === 'LogicalSystem') || []
  const { data: devices } = useQuery({ 
    queryKey: ['devices-far', formData.system_name], 
    enabled: !!formData.system_name, 
    queryFn: async () => (await apiFetch(`/api/v1/devices?system=${encodeURIComponent(formData.system_name)}`)).json() 
  })
  const mutation = useMutation({ 
    mutationFn: async (data: any) => {
      assertFAROnline()
      const affectedAssetIds = Array.isArray(data.affected_assets)
        ? data.affected_assets.map((asset: any) => Number(typeof asset === 'object' ? asset.id : asset)).filter((id: number) => Number.isInteger(id) && id > 0)
        : []
      const payload: Record<string, unknown> = {
        system_name: String(data.system_name || '').trim(),
        failure_type: String(data.failure_type || 'Design').trim(),
        title: String(data.title || '').trim(),
        effect: data.effect ? String(data.effect) : null,
        severity: Number(data.severity),
        occurrence: Number(data.occurrence),
        detection: Number(data.detection),
        status: data.status || 'Analyzing',
        owner_user_id: data.owner_user_id || null,
        owner_team: data.owner_team || null,
        due_at: data.due_at || null,
        affected_asset_ids: affectedAssetIds,
        metadata_json: data.metadata_json && typeof data.metadata_json === 'object' ? data.metadata_json : {},
        idempotency_key: newIdempotencyKey(data.id ? 'far-mode-update' : 'far-mode-create'),
      }
      if (data.id) {
        payload.expected_version = Number(data.version)
        payload.change_summary = 'Failure mode updated from the FAR workspace'
      }
      const url = data.id ? `/api/v1/far/modes/${data.id}` : '/api/v1/far/modes'
      const response = await apiFetch(url, {
        method: data.id ? 'PUT' : 'POST', 
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(await response.text())
      return response.json()
    }, 
    onSuccess: () => { toast.success('Registry synchronized'); onComplete() },
    onError: (error: any) => toast.error(error?.message || 'FAR mutation failed.'),
  })
  const rpn = formData.severity * formData.occurrence * formData.detection

  return (
    <div className="grid grid-cols-12 gap-6 font-bold uppercase tracking-tight">
       <div className="col-span-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 ">Operational Domain *</label>
                <StyledSelect options={systems.map((s: any) => ({ label: s.label, value: s.value }))} value={formData.system_name} onChange={e => setFormData({ ...formData, system_name: e.target.value })} />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 ">Root Classification *</label>
                <StyledSelect options={FAILURE_TYPES} value={formData.failure_type} onChange={e => setFormData({ ...formData, failure_type: e.target.value })} />
             </div>
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-bold text-slate-500 ">Incidence Signature *</label>
             <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="E.G., DATABASE_CONNECTION_TIMEOUT" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-rose-500  placeholder:text-slate-700" />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-bold text-slate-500 ">Consequence Assessment (Effect)</label>
             <textarea value={formData.effect} onChange={e => setFormData({ ...formData, effect: e.target.value })} placeholder="Describe the systemic consequences..." className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-xs font-bold text-white min-h-[60px] outline-none focus:border-rose-500 custom-scrollbar  placeholder:text-slate-700" />
          </div>
          <div className="bg-black/20 p-4 rounded-lg border border-white/5 space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-slate-500 ">Blast Radius Entities</label>
                <div className="relative">
                   <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" />
                   <input value={assetSearch} onChange={e => setAssetSearch(e.target.value)} placeholder="SCAN..." className="bg-black/40 border border-white/10 rounded-lg pl-7 pr-2 py-1 text-[9px] font-bold outline-none focus:border-rose-500 w-32" />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {devices?.filter((d: any) => !assetSearch || d.name.toLowerCase().includes(assetSearch.toLowerCase())).map((d: any) => (
                  <label key={d.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${formData.affected_assets.includes(d.id) ? 'bg-rose-500/10 border-rose-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={formData.affected_assets.includes(d.id)} 
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormData({ 
                          ...formData, 
                          affected_assets: formData.affected_assets.includes(d.id) 
                            ? formData.affected_assets.filter((id: any) => id !== d.id) 
                            : [...formData.affected_assets, d.id] 
                        });
                      }} 
                    />
                    <Server size={12} className={formData.affected_assets.includes(d.id) ? 'text-rose-500' : 'text-slate-700'} />
                    <div className="min-w-0">
                       <p className="text-[11px] font-bold truncate  leading-none">{d.name}</p>
                       <p className="text-[9px] text-slate-600 font-bold truncate mt-1">{d.model}</p>
                    </div>
                  </label>
                ))}
                {(!devices || devices.length === 0) && <div className="col-span-2 py-8 text-center text-slate-600 text-[9px] font-bold">Select a system to view assets</div>}
             </div>
          </div>
       </div>

       <div className="col-span-6 space-y-4">
          <div className="bg-white/[0.02] p-5 rounded-lg border border-white/5 space-y-5">
             <GaugeSelector label="Severity" value={formData.severity} onChange={(v: any) => setFormData({ ...formData, severity: v })} levels={SEVERITY_LEVELS} color="text-rose-500" accent="bg-rose-500" />
             <GaugeSelector label="Occurrence" value={formData.occurrence} onChange={(v: any) => setFormData({ ...formData, occurrence: v })} levels={OCCURRENCE_LEVELS} color="text-amber-500" accent="bg-amber-500" />
             <GaugeSelector label="Detection" value={formData.detection} onChange={(v: any) => setFormData({ ...formData, detection: v })} levels={DETECTION_LEVELS} color="text-sky-400" accent="bg-sky-400" />
          </div>

          <div className="bg-[#0f111a] rounded-lg p-5 border border-white/10 flex items-center justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-[50px] pointer-events-none" />
             <div>
                <p className="text-[9px] font-bold text-slate-500  mb-1 uppercase tracking-widest leading-none">Risk Priority Number (RPN)</p>
                <div className="flex items-baseline gap-1.5">
                   <h4 className={`text-4xl font-bold tracking-tighter ${rpn >= 300 ? 'text-rose-600' : rpn >= 200 ? 'text-orange-400' : rpn >= 100 ? 'text-amber-400' : 'text-emerald-400'}`}>{rpn}</h4>
                   <span className={`text-[10px] font-bold ${rpn >= 300 ? 'text-rose-500' : rpn >= 200 ? 'text-orange-400' : rpn >= 100 ? 'text-amber-400' : 'text-emerald-500'}`}>{rpn >= 300 ? 'CRITICAL' : rpn >= 200 ? 'HIGH' : rpn >= 100 ? 'MODERATE' : 'LOW'}</span>
                </div>
             </div>
             <button 
               disabled={!formData.system_name || !formData.title || mutation.isPending} 
               onClick={() => mutation.mutate(formData)} 
               className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-4 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-2xl shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-2 "
             >
               {mutation.isPending ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} COMMIT
             </button>
          </div>
       </div>
    </div>
  )
}

function CausalTab({ mode, onUpdate, setBkmGuidanceModal, setResolutionManagerModal }: any) {
  const [activeModal, setActiveModal] = useState<any>(null)
  const queryClient = useQueryClient()
  const deleteCauseMutation = useMutation({
    mutationFn: async ({ cause, reason }: { cause: any; reason: string }) =>
      confirmAndExecuteFARNestedLifecycle({
        entityType: 'cause',
        entityId: Number(cause.id),
        expectedVersion: Number(cause.version),
        reason,
        modeId: Number(mode.id),
        label: 'Unlink this root cause from the current failure mode?',
      }),
    onSuccess: () => {
      toast.success('Root cause evidence preserved and unlinked')
      queryClient.invalidateQueries({ queryKey: ['far', 'modes'] })
      onUpdate()
    },
    onError: (error: any) => {
      if (error instanceof FARNestedLifecycleCancelled) return
      toast.error(error.message || 'Failed to unlink root cause')
    }
  })

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex-1 flex flex-col space-y-6">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-amber-500 ">Root Cause Attribution Matrix</h3>
             {mode.linked_rcas?.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                   <Activity size={12} className="text-purple-400" />
                   <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">{mode.linked_rcas.length} Research Cases Linked</span>
                </div>
             )}
          </div>
          <button onClick={() => setActiveModal({ isOpen: true, modeId: mode.id })} className="px-6 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase  hover:bg-amber-600 hover:text-white transition-all">+ Add Root Cause</button>
       </div>
       
       <div className="flex-1 bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col shadow-2xl">
          <table className="w-full text-left border-collapse">
             <thead className="bg-white/[0.03] border-b border-white/10">
                <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ">
                   <th className="px-8 py-4">Root Cause Description (Logical Origin)</th>
                   <th className="px-8 py-4 text-center">Occur Lv</th>
                   <th className="px-8 py-4">Responsible Unit</th>
                   <th className="px-8 py-4">Linked Incidents</th>
                   <th className="px-8 py-4 text-center">BKMs</th>
                   <th className="px-8 py-4 text-right">Ops</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5 font-bold uppercase  text-[11px]">
                {mode.causes?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                     <td className="px-8 py-5 text-white normal-case leading-relaxed">{c.cause_text}</td>
                     <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <div className="w-12 h-1.5 bg-white/5 rounded-lg overflow-hidden border border-white/5">
                              <div className="h-full bg-amber-500" style={{ width: `${c.occurrence_level * 10}%` }} />
                           </div>
                           <span className="text-amber-500 w-4 font-black">{c.occurrence_level}</span>
                        </div>
                     </td>
                     <td className="px-8 py-5 text-slate-400 font-black">{c.responsible_team || 'UNASSIGNED'}</td>
                     <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                           {(mode.linked_rcas || []).map((r: any) => (
                              <div key={r.id} className="flex items-center gap-1.5 text-[8px] text-purple-400">
                                 <Activity size={8} />
                                 <span className="truncate max-w-[120px]">{r.title}</span>
                              </div>
                           ))}
                           {(!mode.linked_rcas || mode.linked_rcas.length === 0) && <span className="text-slate-700 text-[8px]">NONE</span>}
                        </div>
                     </td>
                     <td className="px-8 py-5 text-center">
                        <button 
                          onClick={() => c.resolutions?.length > 0 && setBkmGuidanceModal({ show: true, cause: c })}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${
                            c.resolutions?.length > 0 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 hover:scale-105 active:scale-95 cursor-pointer' 
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 opacity-50 cursor-not-allowed'
                          }`}
                        >
                           {c.resolutions?.length || 0} BKMS
                        </button>
                     </td>
                     <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => setResolutionManagerModal({ show: true, cause: c })}
                             className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                             title="Manage BKM Guidance"
                           >
                              <Book size={14}/>
                           </button>
                           <button 
                             onClick={() => setActiveModal({ isOpen: true, modeId: mode.id, initialData: c })}
                             className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                             title="Edit Attribution"
                           >
                              <Edit2 size={14}/>
                           </button>
                           <button
                             onClick={() => {
                               const reason = window.prompt('Reason for unlinking this cause from the failure mode:')?.trim()
                               if (reason) deleteCauseMutation.mutate({ cause: c, reason })
                             }}
                             disabled={deleteCauseMutation.isPending && deleteCauseMutation.variables?.cause?.id === c.id}
                             className="p-1.5 text-slate-600 hover:text-rose-500 transition-all rounded-lg"
                             title="Unlink attribution (evidence is retained)"
                           >
                             <Trash2 size={14}/>
                           </button>
                        </div>
                     </td>
                  </tr>
                ))}
                {(!mode.causes?.length) && (
                  <tr><td colSpan={6} className="py-32 text-center opacity-20 font-bold uppercase tracking-[0.3em]">No attribution traces linked to this vector</td></tr>
                )}
             </tbody>
          </table>
       </div>

       <RootCauseFormModal 
          isOpen={activeModal?.isOpen}
          onClose={() => setActiveModal(null)}
          modeId={activeModal?.modeId}
          initialData={activeModal?.initialData}
          onSave={onUpdate}
       />
    </motion.div>
  )
}

       function RpnDefinitionModal({ onClose }: { onClose: () => void }) {
       return (
       <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-10">
       <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-4xl p-12 rounded-lg border border-amber-500/30 shadow-2xl relative">
       <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><X size={32}/></button>

       <div className="flex items-center gap-6 mb-12 border-b border-white/5 pb-8">
         <div className="w-20 h-20 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xl shadow-amber-600/20">
            <Target size={40}/>
         </div>
         <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Risk Priority Number</h2>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-[0.3em]">Criticality Scoring Matrix (S × O × D)</p>
         </div>
       </div>

       <div className="grid grid-cols-3 gap-8">
         <div className="space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
               <Shield size={20}/>
               <h3 className="text-sm font-black uppercase tracking-widest">Severity (S)</h3>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed">Impact of the failure on the system or safety. (1 = No impact, 10 = Systemic destruction / Safety risk).</p>
         </div>
         <div className="space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
               <Activity size={20}/>
               <h3 className="text-sm font-black uppercase tracking-widest">Occurrence (O)</h3>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed">Likelihood of the failure mode happening. (1 = Remote, 10 = Constant/Inevitable).</p>
         </div>
         <div className="space-y-4">
            <div className="flex items-center gap-3 text-sky-500">
               <Search size={20}/>
               <h3 className="text-sm font-black uppercase tracking-widest">Detection (D)</h3>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed">Ability to detect the failure before it impacts. (1 = Certain detection, 10 = Undetectable).</p>
         </div>
       </div>

       <div className="mt-12 p-8 bg-black/40 rounded-lg border border-white/5">
         <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Threshold Logic</span>
            <div className="flex gap-4">
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> <span className="text-[10px] font-bold text-emerald-500 uppercase">Low (1-99)</span></div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> <span className="text-[10px] font-bold text-amber-500 uppercase">Moderate (100-199)</span></div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500" /> <span className="text-[10px] font-bold text-rose-500 uppercase">High (200-299) / Critical (300+)</span></div>
            </div>
         </div>
         <div className="text-6xl font-black text-center text-white tracking-tighter">RPN = S <span className="text-slate-700">×</span> O <span className="text-slate-700">×</span> D</div>
       </div>
       </motion.div>
       </div>
       )
       }

       function MaturityDefinitionModal({ onClose }: { onClose: () => void }) {
       return (
       <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-10">
       <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-4xl p-12 rounded-lg border border-blue-500/30 shadow-2xl relative">
       <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><X size={32}/></button>

       <div className="flex items-center gap-6 mb-12 border-b border-white/5 pb-8">
         <div className="w-20 h-20 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
            <Zap size={40}/>
         </div>
         <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Maturity Spectrum</h2>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.3em]">Risk Mitigation Lifecycle (Lv0 - Lv8)</p>
         </div>
       </div>

       <div className="grid grid-cols-2 gap-x-12 gap-y-4">
         {maturityLevels.map((ml) => (
            <div key={ml.lv} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/5">
               <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 font-black border border-blue-500/20 shadow-inner">Lv{ml.lv}</div>
               <div>
                  <h4 className="text-[11px] font-black uppercase text-white tracking-widest">{ml.label}</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 leading-tight">{ml.desc}</p>
               </div>
            </div>
         ))}
       </div>
       </motion.div>
       </div>
       )
       }
function RoadmapTab({ mode, onUpdate }: any) {
  const [activeMitigationModal, setActiveMitigationModal] = useState<any>(null)
  const [activePreventionModal, setActivePreventionModal] = useState<any>(null)
  const [selectedCauseId, setSelectedCauseId] = useState<number | null>(null)
  const [deletingMitigationId, setDeletingMitigationId] = useState<number | null>(null)
  const deletingMitigationIdRef = React.useRef<number | null>(null)
  
  const queryClient = useQueryClient()
  const { data: bkms } = useQuery({ queryKey: ['knowledge', 'bkms'], queryFn: async () => (await apiFetch('/api/v1/knowledge/?category=BKM')).json() })
  const { data: monitoring } = useQuery({ queryKey: ['monitoring-items'], queryFn: async () => (await apiFetch('/api/v1/monitoring/')).json() })
  const deleteMitigationMutation = useMutation({
    mutationFn: async ({ mitigation, reason }: { mitigation: any; reason: string }) =>
      confirmAndExecuteFARNestedLifecycle({
        entityType: 'mitigation',
        entityId: Number(mitigation.id),
        expectedVersion: Number(mitigation.version),
        reason,
        label: 'Retire this mitigation while preserving its evidence?',
      }),
    onSuccess: () => {
      toast.success('Mitigation evidence preserved and retired')
      queryClient.invalidateQueries({ queryKey: ['far', 'modes'] })
      onUpdate()
    },
    onError: (error: any) => {
      setDeletingMitigationId(null)
      if (error instanceof FARNestedLifecycleCancelled) return
      toast.error(error.message || 'Failed to retire mitigation')
    },
    onSettled: () => {
      deletingMitigationIdRef.current = null
    }
  })

  useEffect(() => {
    if (!selectedCauseId && mode.causes?.length > 0) {
      setSelectedCauseId(mode.causes[0].id)
    }
  }, [mode.causes, selectedCauseId])

  useEffect(() => {
    if (deletingMitigationId !== null && !mode.mitigations?.some((mitigation: any) => mitigation.id === deletingMitigationId)) {
      setDeletingMitigationId(null)
    }
  }, [deletingMitigationId, mode.mitigations])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex-1 flex flex-col space-y-6">
       <div className="flex items-center gap-4 shrink-0 overflow-x-auto pb-2 scrollbar-hide">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest shrink-0">Select Root Cause:</span>
          {(mode.causes || []).map((cause: any) => (
             <button 
                key={cause.id}
                onClick={() => setSelectedCauseId(cause.id)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border transition-all whitespace-nowrap ${selectedCauseId === cause.id ? 'bg-rose-600/10 border-rose-500 text-rose-500' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}
             >
                {cause.cause_text}
             </button>
          ))}
          {mode.causes?.length === 0 && <span className="text-[10px] font-black text-slate-700 uppercase">No causes attributed to this vector</span>}
       </div>

       <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-sky-400 ">Strategic Mitigation Roadmap</h3>
          <div className="flex flex-nowrap gap-2">
             <button onClick={() => setActiveMitigationModal({ isOpen: true, type: 'WORKAROUND' })} disabled={!selectedCauseId} className="px-6 py-2 whitespace-nowrap bg-amber-600/20 border border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase  hover:bg-amber-600 hover:text-white transition-all disabled:opacity-20">+ Add Workaround</button>
             <button onClick={() => setActiveMitigationModal({ isOpen: true, type: 'MONITORING' })} disabled={!selectedCauseId} className="px-6 py-2 whitespace-nowrap bg-sky-600/20 border border-sky-500/30 text-sky-400 rounded-lg text-[10px] font-bold uppercase  hover:bg-sky-600 hover:text-white transition-all disabled:opacity-20">+ Add Monitoring</button>
             <button onClick={() => setActivePreventionModal({ isOpen: true })} disabled={!selectedCauseId} className="px-6 py-2 whitespace-nowrap bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold uppercase  hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-20">+ Add Prevention</button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          <div className="bg-black/40 border border-white/5 rounded-lg overflow-hidden shadow-2xl">
             <table className="w-full text-left border-collapse">
                <thead className="bg-white/[0.03] border-b border-white/10">
                   <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ">
                      <th className="px-8 py-4">Shield Type</th>
                      <th className="px-8 py-4">Deployment Protocol / Plan</th>
                      <th className="px-8 py-4 text-center">Cause Context</th>
                      <th className="px-8 py-4 text-center">Status</th>
                      <th className="px-8 py-4 text-right">Ops</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-bold uppercase  text-[11px]">
                   {mode.mitigations?.filter((m: any) => m.cause_id === selectedCauseId).map((m: any) => (
                     <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-5">
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${m.mitigation_type === 'Monitoring' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>{m.mitigation_type}</span>
                        </td>
                        <td className="px-8 py-5 text-white  max-w-xl">
                           <div className="space-y-1">
                              {m.mitigation_steps?.split('\n').map((line: string, i: number) => (
                                <div key={i} className="flex gap-3">
                                   <span className="text-slate-600 text-[9px] font-black">{i + 1}.</span>
                                   <span className="normal-case font-medium text-slate-300 uppercase">{line}</span>
                                </div>
                              ))}
                              {m.monitoring_item && (
                                 <div className="flex items-center gap-3 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg mt-2 group/item hover:bg-sky-500/10 transition-all">
                                    <Monitor size={14} className="text-sky-400" />
                                    <span className="text-sky-400 tracking-tight normal-case font-black uppercase">Linked Monitor: {m.monitoring_item.title}</span>
                                 </div>
                              )}
                           </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <div className="flex flex-col items-center gap-1">
                              <span className="text-[9px] font-black text-rose-400/70 truncate max-w-[150px]">{mode.causes?.find((c:any)=>c.id === m.cause_id)?.cause_text || 'GLOBAL_VECTOR'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${m.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-white/10'}`}>
                              {m.status?.toUpperCase() || 'PLANNED'}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                           <button
                             onClick={() => {
                               if (deletingMitigationIdRef.current !== null) return
                               const reason = window.prompt('Reason for retiring this mitigation:')?.trim()
                               if (!reason) return
                               deletingMitigationIdRef.current = m.id
                               setDeletingMitigationId(m.id)
                               deleteMitigationMutation.mutate({ mitigation: m, reason })
                             }}
                             disabled={deletingMitigationId !== null}
                             className="p-2 text-slate-600 hover:text-rose-500 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                             title="Retire mitigation (evidence is retained)"
                           >
                             <Trash2 size={16}/>
                           </button>
                        </td>
                     </tr>
                   ))}
                   {mode.mitigations?.filter((m: any) => m.cause_id === selectedCauseId).length === 0 && (
                      <tr><td colSpan={5} className="py-20 text-center opacity-20 font-bold uppercase tracking-[0.3em]">No mitigation shields active for this cause</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       <MitigationFormModal 
          isOpen={activeMitigationModal?.isOpen}
          onClose={() => setActiveMitigationModal(null)}
          modeId={mode.id}
          causeId={selectedCauseId}
          type={activeMitigationModal?.type}
          bkms={bkms}
          monitoring={monitoring}
          onSave={onUpdate}
       />

       <PreventionFormModal 
          isOpen={activePreventionModal?.isOpen}
          onClose={() => setActivePreventionModal(null)}
          modeId={mode.id}
          causeId={selectedCauseId}
          onSave={onUpdate}
       />
    </motion.div>
  )
}
  function HistoryTab({ mode, onUpdate }: any) {
    const [isLinking, setIsLinking] = useState(false)
    const [search, setSearch] = useState('')
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const { data: research } = useQuery({ 
      queryKey: ['research-items'], 
      queryFn: async () => (await apiFetch('/api/v1/investigations')).json() 
    })

    const filteredResearch = useMemo(() => {
      if (!research) return []
      return research.filter((r: any) => 
        !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.summary?.toLowerCase().includes(search.toLowerCase())
      )
    }, [research, search])

    const linkMutation = useMutation({
      mutationFn: async (researchId: number) => {
        assertFAROnline()
        const currentLinks = mode.metadata_json?.linked_research_ids || []
        if (currentLinks.includes(researchId)) {
          toast.error('Research artifact already linked')
          return
        }
        const updatedMetadata = { ...mode.metadata_json, linked_research_ids: [...currentLinks, researchId] }
        const res = await apiFetch(`/api/v1/far/modes/${mode.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            expected_version: mode.version,
            metadata_json: updatedMetadata,
            change_summary: 'Research artifact linked to FAR failure mode',
            idempotency_key: newIdempotencyKey('far-research-link'),
          })
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      },
      onSuccess: () => {
        toast.success('Research Artifact Linked to Vector')
        setIsLinking(false)
        onUpdate()
        queryClient.invalidateQueries({ queryKey: ['far', 'modes'] })
      },
      onError: (err: any) => {
        toast.error(`Linking Failed: ${err.message}`)
      }
    })
    const unlinkMutation = useMutation({
      mutationFn: async (researchId: number) => {
        assertFAROnline()
        const currentLinks = mode.metadata_json?.linked_research_ids || []
        const updatedMetadata = {
          ...mode.metadata_json,
          linked_research_ids: currentLinks.filter((id: number) => id !== researchId)
        }
        const res = await apiFetch(`/api/v1/far/modes/${mode.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            expected_version: mode.version,
            metadata_json: updatedMetadata,
            change_summary: 'Research artifact unlinked from FAR failure mode',
            idempotency_key: newIdempotencyKey('far-research-unlink'),
          })
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      },
      onSuccess: () => {
        toast.success('Research artifact unlinked')
        onUpdate()
        queryClient.invalidateQueries({ queryKey: ['far', 'modes'] })
      },
      onError: (err: any) => {
        toast.error(`Unlink Failed: ${err.message}`)
      }
    })

    const linkedResearch = useMemo(() => {
      if (!research || !mode.metadata_json?.linked_research_ids) return []
      return research.filter((r: any) => mode.metadata_json.linked_research_ids.includes(r.id))
    }, [research, mode.metadata_json])
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex-1 flex flex-col space-y-6">
         <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 ">Analytical Research History</h3>
            <button onClick={() => setIsLinking(true)} className="px-6 py-2 bg-slate-800/50 border border-white/10 text-slate-400 rounded-lg text-[10px] font-bold uppercase  hover:bg-slate-700 hover:text-white transition-all">+ Link Research Artifact</button>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {linkedResearch.map((r: any) => (
               <div key={r.id} className="bg-white/5 border border-white/5 rounded-lg p-6 flex items-center justify-between group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-6">
                     <div className="p-4 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20"><Activity size={24}/></div>
                     <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">{r.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="text-[9px] font-bold text-slate-500 uppercase">Status: {r.status}</span>
                           <span className="text-[9px] font-bold text-slate-500 uppercase">ID: {r.id}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={() => navigate(`/research?type=research&id=${r.id}`)} className="p-2.5 bg-white/5 rounded-lg text-slate-500 hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100"><Eye size={18}/></button>
                     <button onClick={() => unlinkMutation.mutate(r.id)} className="p-2.5 bg-white/5 rounded-lg text-slate-500 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                  </div>
               </div>
            ))}
            {linkedResearch.length === 0 && (
               <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4 opacity-20 ">
                  <Activity size={48} className="text-slate-500" />
                  <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-center max-w-md">No historical research artifacts currently mapped to this failure vector</p>
                  <button onClick={() => navigate('/research')} className="text-[10px] font-bold uppercase underline tracking-widest text-rose-500">Initiate New Research Case</button>
               </div>
            )}
         </div>
         <AnimatePresence>
            {isLinking && (
               <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-lg p-10 rounded-lg border border-white/10 space-y-6">
                     <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-xl font-bold uppercase text-white tracking-tighter">Link Research</h3>
                        <button onClick={() => setIsLinking(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                     </div>
                     <div className="relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input 
                          value={search} 
                          onChange={e => setSearch(e.target.value)} 
                          placeholder="Search research artifacts..." 
                          className="w-full bg-black/40 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-xs font-bold text-white outline-none focus:border-rose-500" 
                        />
                     </div>
                     <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {filteredResearch?.map((r: any) => (
                          <button 
                            key={r.id} 
                            onClick={() => linkMutation.mutate(r.id)}
                            className="w-full text-left p-4 rounded-lg bg-white/5 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all group"
                          >
                             <p className="text-[11px] font-bold text-white uppercase">{r.title}</p>
                             <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Status: {r.status}</p>
                          </button>
                        ))}
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </motion.div>
    )
  }
