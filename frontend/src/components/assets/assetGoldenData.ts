import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../../api/apiClient'
import { downloadOperationalImportFile } from '../shared/OperationalImportExport'
import { resolveOperationalDataState } from '../shared/OperationalDataState'

export type AssetTab = 'inventory' | 'deleted'
export type AssetViewMode = 'grid' | 'report' | 'map'
export type AssetLens = 'all' | 'degraded' | 'unowned' | 'security' | 'network'
export type AssetSavedView = {
  id: string
  name: string
  config: {
    activeTab: AssetTab
    viewMode: AssetViewMode
    searchTerm: string
    activeLens: AssetLens
    hiddenColumns: string[]
    fontSize: number
    rowDensity: number
    filters: AssetQuickFilters
  }
}
export type AssetQuickFilters = {
  status: string[]
  system: string[]
  type: string[]
  owner: string[]
}

const STORAGE_KEY = 'sysgrid_asset_golden_workspace_v32'
const DEFAULT_HIDDEN_COLUMNS = [
  'model',
  'os_name',
  'primary_ip',
  'management_ip',
  'hardware_summary',
  'site_name',
  'rack_name',
  'u_start',
  'size_u',
  'power_typical_w',
  'power_max_w',
  'updated_at',
]

const EMPTY_FILTERS: AssetQuickFilters = { status: [], system: [], type: [], owner: [] }

const readStorage = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const writeStorage = (value: any) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `asset-view-${Date.now()}`

const normalizeAsset = (asset: any) => ({
  ...asset,
  id: Number(asset?.id),
  name: asset?.name || 'Unnamed Asset',
  system: asset?.system || 'Unassigned',
  type: asset?.type || 'Physical',
  status: asset?.status || 'Active',
  environment: asset?.environment || 'Production',
  owner: asset?.owner || '',
  manufacturer: asset?.manufacturer || '',
  model: asset?.model || '',
  os_name: asset?.os_name || '',
  primary_ip: asset?.primary_ip || '',
  management_ip: asset?.management_ip || '',
  management_url: asset?.management_url || '',
  hardware_summary: asset?.hardware_summary || 'No hardware summary',
  open_incident_count: Number(asset?.open_incident_count || 0),
  site_name: asset?.site_name || '',
  rack_name: asset?.rack_name || '',
  u_start: asset?.u_start ?? null,
  size_u: asset?.size_u ?? 1,
  power_typical_w: Number(asset?.power_typical_w || 0),
  power_max_w: Number(asset?.power_max_w || 0),
  is_deleted: Boolean(asset?.is_deleted),
  updated_at: asset?.updated_at || asset?.created_at || null,
})

const uniqueValues = (items: any[], field: string) =>
  Array.from(new Set(items.map((item) => String(item?.[field] || '').trim()).filter(Boolean))).sort()

const assetMatchesLens = (asset: any, lens: AssetLens) => {
  if (lens === 'degraded') return asset.status !== 'Active' || Number(asset.open_incident_count || 0) > 0
  if (lens === 'unowned') return !String(asset.owner || '').trim()
  if (lens === 'security') return Boolean(String(asset.management_ip || asset.management_url || '').trim())
  if (lens === 'network') return Boolean(String(asset.primary_ip || asset.management_ip || '').trim())
  return true
}

const matchesTerm = (asset: any, term: string) => {
  const haystack = [
    asset.name,
    asset.system,
    asset.type,
    asset.status,
    asset.environment,
    asset.owner,
    asset.manufacturer,
    asset.model,
    asset.primary_ip,
    asset.management_ip,
    asset.hardware_summary,
  ].join(' ').toLowerCase()
  return haystack.includes(term.toLowerCase())
}

const getAssetConsoleUrl = (asset: any) => {
  const direct = String(asset?.management_url || '').trim()
  if (direct) return /^https?:\/\//i.test(direct) ? direct : `https://${direct}`
  return asset?.management_ip ? `https://${asset.management_ip}` : null
}

export function useAssetGoldenWorkspace() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const stored = readStorage()

  const [activeTab, setActiveTab] = useState<AssetTab>(stored?.activeTab === 'deleted' ? 'deleted' : 'inventory')
  const [viewMode, setViewMode] = useState<AssetViewMode>(stored?.viewMode || 'grid')
  const [searchTerm, setSearchTerm] = useState(stored?.searchTerm || '')
  const [activeLens, setActiveLens] = useState<AssetLens>(stored?.activeLens || 'all')
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(Array.isArray(stored?.hiddenColumns) ? stored.hiddenColumns : DEFAULT_HIDDEN_COLUMNS)
  const [fontSize, setFontSize] = useState(Number.isFinite(stored?.fontSize) ? stored.fontSize : 11)
  const [rowDensity, setRowDensity] = useState(Number.isFinite(stored?.rowDensity) ? stored.rowDensity : 8)
  const [filters, setFilters] = useState<AssetQuickFilters>(stored?.filters || EMPTY_FILTERS)
  const [savedViews, setSavedViews] = useState<AssetSavedView[]>(Array.isArray(stored?.savedViews) ? stored.savedViews : [])
  const [activeViewId, setActiveViewId] = useState<string | null>(stored?.activeViewId || null)
  const [newViewName, setNewViewName] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [quickLookAsset, setQuickLookAsset] = useState<any | null>(null)
  const [detailAsset, setDetailAsset] = useState<any | null>(null)
  const [editingAsset, setEditingAsset] = useState<any | null>(null)
  const [editingLink, setEditingLink] = useState<any | null>(null)
  const [detailLink, setDetailLink] = useState<any | null>(null)
  const [serviceDetails, setServiceDetails] = useState<any | null>(null)
  const [serviceEdit, setServiceEdit] = useState<any | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showRegistryModal, setShowRegistryModal] = useState(false)
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [rowActionMenu, setRowActionMenu] = useState<{ asset: any; x: number; y: number } | null>(null)

  const devicesQuery = useQuery({
    queryKey: ['asset-golden-devices'],
    queryFn: async () => (await apiFetch('/api/v1/devices?include_deleted=true')).json(),
  })
  const liveDevicesQuery = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json(),
  })
  const optionsQuery = useQuery({
    queryKey: ['settings-options'],
    queryFn: async () => (await apiFetch('/api/v1/settings/options')).json(),
  })
  const relationshipsQuery = useQuery({
    queryKey: ['asset-golden-relationships'],
    queryFn: async () => (await apiFetch('/api/v1/devices/relationships/all')).json(),
  })
  const connectionsQuery = useQuery({
    queryKey: ['asset-golden-connections'],
    queryFn: async () => (await apiFetch('/api/v1/networks/connections')).json(),
  })

  const allAssets = useMemo(
    () => (Array.isArray(devicesQuery.data) ? devicesQuery.data : []).map(normalizeAsset),
    [devicesQuery.data]
  )

  const visiblePool = useMemo(
    () => allAssets.filter((asset) => activeTab === 'deleted' ? asset.is_deleted : !asset.is_deleted),
    [activeTab, allAssets]
  )

  const filterOptions = useMemo(() => ({
    status: uniqueValues(visiblePool, 'status'),
    system: uniqueValues(visiblePool, 'system'),
    type: uniqueValues(visiblePool, 'type'),
    owner: uniqueValues(visiblePool, 'owner'),
  }), [visiblePool])

  const filteredAssets = useMemo(() => {
    return visiblePool.filter((asset) => {
      if (!assetMatchesLens(asset, activeLens)) return false
      if (searchTerm.trim() && !matchesTerm(asset, searchTerm.trim())) return false
      if (filters.status.length && !filters.status.includes(asset.status)) return false
      if (filters.system.length && !filters.system.includes(asset.system)) return false
      if (filters.type.length && !filters.type.includes(asset.type)) return false
      if (filters.owner.length && !filters.owner.includes(asset.owner || '')) return false
      return true
    })
  }, [activeLens, filters, searchTerm, visiblePool])

  const lifecycleCounts = useMemo(() => ({
    inventory: allAssets.filter((asset) => !asset.is_deleted).length,
    purged: allAssets.filter((asset) => asset.is_deleted).length,
  }), [allAssets])

  const filterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = []
    if (activeLens !== 'all') chips.push({ id: 'lens', label: `Lens: ${activeLens}`, onRemove: () => setActiveLens('all') })
    for (const [field, values] of Object.entries(filters) as Array<[keyof AssetQuickFilters, string[]]>) {
      values.forEach((value) => chips.push({
        id: `${field}:${value}`,
        label: `${field}: ${value}`,
        onRemove: () => setFilters((current) => ({ ...current, [field]: current[field].filter((entry) => entry !== value) })),
      }))
    }
    return chips
  }, [activeLens, filters])

  const dataState = useMemo(() => resolveOperationalDataState({
    loading: devicesQuery.isLoading,
    error: devicesQuery.error,
    totalCount: allAssets.length,
    tabCount: visiblePool.length,
    visibleCount: filteredAssets.length,
    emptyLabel: 'No assets have been registered yet.',
    filteredLabel: 'No assets match the current filters.',
    tabEmptyKind: activeTab === 'deleted' ? 'deleted-empty' : 'active-empty',
    tabEmptyLabel: activeTab === 'deleted' ? 'No purged assets are available.' : 'No active assets are available.',
    errorTitle: 'Asset registry unavailable',
    errorDescription: 'The asset inventory request failed.',
  }), [activeTab, allAssets.length, devicesQuery.error, devicesQuery.isLoading, filteredAssets.length, visiblePool.length])

  const linkPurposeOptions = useMemo(() => {
    const options = Array.isArray(optionsQuery.data) ? optionsQuery.data.filter((item: any) => item.category === 'LinkPurpose') : []
    return options.map((item: any) => ({ value: item.value, label: item.label }))
  }, [optionsQuery.data])

  const farmOptions = useMemo(() => {
    const options = Array.isArray(optionsQuery.data) ? optionsQuery.data.filter((item: any) => item.category === 'NetworkFarm') : []
    return options.map((item: any) => ({ value: item.value, label: item.label }))
  }, [optionsQuery.data])

  const cableTypeOptions = useMemo(() => {
    const options = Array.isArray(optionsQuery.data) ? optionsQuery.data.filter((item: any) => item.category === 'NetworkCableType') : []
    return options.map((item: any) => ({ value: item.value, label: item.label }))
  }, [optionsQuery.data])

  const systemsList = useMemo(
    () => (Array.isArray(optionsQuery.data) ? optionsQuery.data.filter((item: any) => item.category === 'LogicalSystem').map((item: any) => item.value) : []),
    [optionsQuery.data]
  )

  useEffect(() => {
    writeStorage({
      activeTab,
      viewMode,
      searchTerm,
      activeLens,
      hiddenColumns,
      fontSize,
      rowDensity,
      filters,
      savedViews,
      activeViewId,
    })
  }, [activeLens, activeTab, activeViewId, filters, fontSize, hiddenColumns, rowDensity, savedViews, searchTerm, viewMode])

  useEffect(() => {
    const routeId = Number(searchParams.get('id') || '')
    if (!routeId || !allAssets.length) return
    const match = allAssets.find((asset) => asset.id === routeId)
    if (match) setDetailAsset(match)
  }, [allAssets, searchParams])

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['asset-golden-devices'] })
    queryClient.invalidateQueries({ queryKey: ['devices'] })
    queryClient.invalidateQueries({ queryKey: ['asset-golden-relationships'] })
    queryClient.invalidateQueries({ queryKey: ['asset-golden-connections'] })
  }, [queryClient])

  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids, payload }: { action: string; ids: number[]; payload?: Record<string, any> }) => {
      if (action === 'update') {
        await Promise.all(ids.map(async (id) => {
          const response = await apiFetch(`/api/v1/devices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload || {}),
          })
          if (!response.ok) throw new Error(await response.text())
        }))
        return { changed: ids.length, summary: `Updated ${ids.length} assets` }
      }
      const response = await apiFetch('/api/v1/devices/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ action, ids }),
      })
      if (!response.ok) throw new Error(await response.text())
      return response.json()
    },
    onSuccess: (result: any) => {
      refreshAll()
      setRowActionMenu(null)
      setSelectedIds([])
      toast.success(result?.summary || 'Asset action completed')
    },
    onError: (error: any) => toast.error(error?.message || 'Asset action failed'),
  })

  const openConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ title, message, onConfirm })
  }, [])

  const performBulkAction = useCallback((action: string, ids?: number[], payload?: Record<string, any>) => {
    const targetIds = ids && ids.length ? ids : selectedIds
    if (!targetIds.length) {
      toast.error('Select at least one asset first')
      return
    }
    bulkMutation.mutate({ action, ids: targetIds, payload })
  }, [bulkMutation, selectedIds])

  const toggleColumn = useCallback((field: string) => {
    setHiddenColumns((current) => current.includes(field) ? current.filter((entry) => entry !== field) : [...current, field])
  }, [])

  const applyView = useCallback((view: AssetSavedView | null) => {
    if (!view) {
      setActiveViewId(null)
      setActiveTab('inventory')
      setViewMode('grid')
      setSearchTerm('')
      setActiveLens('all')
      setHiddenColumns(DEFAULT_HIDDEN_COLUMNS)
      setFontSize(11)
      setRowDensity(8)
      setFilters(EMPTY_FILTERS)
      return
    }
    setActiveViewId(view.id)
    setActiveTab(view.config.activeTab)
    setViewMode(view.config.viewMode)
    setSearchTerm(view.config.searchTerm)
    setActiveLens(view.config.activeLens)
    setHiddenColumns(view.config.hiddenColumns)
    setFontSize(view.config.fontSize)
    setRowDensity(view.config.rowDensity)
    setFilters(view.config.filters)
  }, [])

  const createSavedView = useCallback(() => {
    if (!newViewName.trim()) {
      toast.error('Name the saved view first')
      return
    }
    const view: AssetSavedView = {
      id: slugify(newViewName),
      name: newViewName.trim(),
      config: { activeTab, viewMode, searchTerm, activeLens, hiddenColumns, fontSize, rowDensity, filters },
    }
    setSavedViews((current) => [...current.filter((entry) => entry.id !== view.id), view])
    setActiveViewId(view.id)
    setNewViewName('')
  }, [activeLens, activeTab, filters, fontSize, hiddenColumns, newViewName, rowDensity, searchTerm, viewMode])

  const overwriteSavedView = useCallback((id: string) => {
    setSavedViews((current) => current.map((view) => view.id === id ? ({
      ...view,
      config: { activeTab, viewMode, searchTerm, activeLens, hiddenColumns, fontSize, rowDensity, filters },
    }) : view))
    setActiveViewId(id)
  }, [activeLens, activeTab, filters, fontSize, hiddenColumns, rowDensity, searchTerm, viewMode])

  const deleteSavedView = useCallback((id: string) => {
    setSavedViews((current) => current.filter((view) => view.id !== id))
    if (activeViewId === id) setActiveViewId(null)
  }, [activeViewId])

  const exportSnapshot = useCallback(async () => {
    try {
      await downloadOperationalImportFile({
        tableName: 'devices',
        kind: 'snapshot',
        fallbackFileName: `SysGrid_Assets_${new Date().toISOString().slice(0, 10)}.csv`,
      })
      toast.success('Asset snapshot downloaded')
    } catch (error: any) {
      toast.error(error?.message || 'Export failed')
    }
  }, [])

  const exportTemplate = useCallback(async () => {
    try {
      await downloadOperationalImportFile({
        tableName: 'devices',
        kind: 'template',
        fallbackFileName: 'SysGrid_Assets_Template.csv',
      })
      toast.success('Asset template downloaded')
    } catch (error: any) {
      toast.error(error?.message || 'Template download failed')
    }
  }, [])

  return {
    activeLens,
    activeTab,
    activeViewId,
    allAssets,
    bulkMutation,
    cableTypeOptions,
    confirmState,
    connections: Array.isArray(connectionsQuery.data) ? connectionsQuery.data : [],
    createSavedView,
    dataState,
    detailAsset,
    detailLink,
    devices: Array.isArray(liveDevicesQuery.data) ? liveDevicesQuery.data : [],
    editingAsset,
    editingLink,
    exportSnapshot,
    exportTemplate,
    farmOptions,
    filterChips,
    filterOptions,
    filters,
    fontSize,
    getAssetConsoleUrl,
    hiddenColumns,
    lifecycleCounts,
    linkPurposeOptions,
    newViewName,
    openConfirm,
    options: Array.isArray(optionsQuery.data) ? optionsQuery.data : [],
    overwriteSavedView,
    performBulkAction,
    quickLookAsset,
    refreshAll,
    relationships: Array.isArray(relationshipsQuery.data) ? relationshipsQuery.data : [],
    rowActionMenu,
    rowDensity,
    savedViews,
    searchParams,
    searchTerm,
    selectedIds,
    serviceDetails,
    serviceEdit,
    setActiveLens,
    setActiveTab,
    setConfirmState,
    setDetailAsset,
    setDetailLink,
    setEditingAsset,
    setEditingLink,
    setFilters,
    setFontSize,
    setHiddenColumns,
    setNewViewName,
    setQuickLookAsset,
    setRowActionMenu,
    setRowDensity,
    setSearchParams,
    setSearchTerm,
    setSelectedIds,
    setServiceDetails,
    setServiceEdit,
    setShowImportModal,
    setShowRegistryModal,
    setViewMode,
    showImportModal,
    showRegistryModal,
    systemsList,
    toggleColumn,
    viewMode,
    visibleAssets: filteredAssets,
    visiblePool,
    applyView,
    deleteSavedView,
  }
}
