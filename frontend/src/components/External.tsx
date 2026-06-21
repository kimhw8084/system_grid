import { useSearchParams } from 'react-router-dom'
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Trash2, Globe, X, RefreshCcw, Search, Edit2, LayoutGrid, List, FileText, Clipboard, 
  Link as LinkIcon, Share2, ExternalLink, Shield, Server, Database, Cloud, Activity, 
  Sliders, Settings, User, Users, Mail, Phone, Tag, Info, AlertCircle, Briefcase, 
  Clock, DollarSign, Target, ChevronRight, Layers, Box, Cpu, Zap, FileJson, MoreVertical, Eye, EyeOff, Key, Upload, Check, Maximize2,
  Star, GitCompare, Minimize2, ChevronUp, ChevronDown, Bell, Undo2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiFetch } from "../api/apiClient"
import { parseAppDate, formatAppDate } from '../utils/dateUtils'
import { 
  HeaderScopeSwitch,
  ToolbarGroup, 
  ToolbarSearch, 
  ToolbarButton, 
  ToolbarIconButton, 
  ToolbarSegmented 
} from './shared/LayoutPrimitives'


import { AppDropdown } from './shared/AppDropdown'
import { StyledSelect } from "./shared/StyledSelect"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { ConfigRegistryModal } from "./ConfigRegistry"
import { WorkspaceShareHeader } from './shared/WorkspaceShareHeader'
import { WorkspaceCompareShell } from './shared/WorkspaceModalShells'
import { WorkspaceFlyoutActionCard, WorkspaceFlyoutDropdownEditor } from './shared/WorkspaceFlyout'
import { useOperationalGridLayout, usePersistentJsonState, useWorkspaceDismissHandlers } from './shared/OperationalWorkspaceHooks'
import { useWorkspaceAnchoredLayer, WorkspaceEmptyState, useEscapeDismiss, useBodyModalFlag, WorkspaceFloatingPanel, WorkspaceSplitView } from './shared/OperationalWorkspacePrimitives'
import { OperationalAnchoredPanel, OperationalDisplayPanel, OperationalGridSurface, OperationalGroupedGridSection, OperationalGroupedGridView, OperationalSavedViewsPanel, OperationalWorkspaceShell } from './shared/OperationalWorkspaceShells'
import { OperationalImportModal } from './shared/OperationalImportModal'
import { EXTERNAL_WORKSPACE_STANDARD } from './shared/OperationalWorkspace'
import { WorkspaceModal } from './shared/WorkspaceModal'
import { OperationalGridMatrix } from './shared/OperationalGridMatrix'
import {
  applyOperationalColumnSizing,
  autoSizeOperationalColumns,
  OPERATIONAL_GRID_AUTO_SIZE_STRATEGY,
  sanitizeOperationalColumnLayout,
  sanitizeOperationalFilterModel,
  sanitizeOperationalSortModel,
} from './shared/OperationalGridSizing'

// --- Sub-components ---

const toTitle = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

const parseMetadataObject = (value: any) => {
  if (!value) return {}
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value || '{}')
  } catch {
    return {}
  }
}

const getMetaValue = (entity: any, key: string) => parseMetadataObject(entity?.metadata_json)?.[key]
const getMetaText = (entity: any, key: string) => {
  const value = getMetaValue(entity, key)
  return typeof value === 'string' ? value.trim() : value
}

const ACCOUNTABLE_OWNER_OPTIONS = [
  { value: 'team', label: 'Team' },
  { value: 'individual', label: 'Individual' },
]

const CONTACT_ROLE_OPTIONS = ['Primary', 'Operational', 'Escalation', 'Security', 'Business']
const SECRET_TYPE_OPTIONS = ['VaultReference', 'SharedSecret', 'Token', 'KeyPair', 'Certificate']
const SECRET_STATUS_OPTIONS = ['Active', 'RotationDue', 'Disabled']
const VAULT_PROVIDER_OPTIONS = ['1Password', 'Bitwarden', 'HashiCorp Vault', 'AWS Secrets Manager', 'Azure Key Vault', 'Other']
const LINK_DIRECTION_OPTIONS = ['Inbound', 'Outbound', 'Bidirectional']
const LINK_PROTOCOL_OPTIONS = ['HTTPS', 'HTTP', 'TCP', 'UDP', 'SFTP', 'SSH', 'Database', 'Other']
const LINK_NETWORK_ZONE_OPTIONS = ['Internet', 'DMZ', 'Partner', 'Internal', 'Restricted']
const LINK_TRANSPORT_SECURITY_OPTIONS = ['TLS', 'mTLS', 'VPN', 'None', 'Other']

const extensionMetadataKeysByType: Record<string, string[]> = {
  Equipment: ['manufacturer', 'model', 'serial_number'],
  'Physical Server': ['rack_id', 'unit_position', 'os'],
  'Virtual Server': ['hypervisor', 'vcpu', 'vram', 'os'],
  Switch: ['management_url', 'ports', 'firmware'],
  DB: ['engine', 'instance_name'],
  API: ['version'],
  Script: ['runtime', 'path', 'schedule'],
}

const FALLBACK_EXTERNAL_TYPE_OPTIONS = Object.keys(extensionMetadataKeysByType).map((value) => ({
  value,
  label: value,
}))

const reservedMetadataKeys = new Set([
  'business_purpose',
])

const EXTERNAL_VIEW_STORAGE_KEY = 'sysgrid_external_views_v1'
const EXTERNAL_ACTIVE_VIEW_KEY = 'sysgrid_external_active_view_v1'
const EXTERNAL_UI_STATE_KEY = 'sysgrid_external_ui_state_v1'
const EXTERNAL_FAVORITES_STORAGE_KEY = 'sysgrid_external_favorites_v1'
const EXTERNAL_WATCH_STORAGE_KEY = 'sysgrid_external_watch_v1'
const EXTERNAL_SUPPORTS_COMPARE = EXTERNAL_WORKSPACE_STANDARD.sharedCapabilities.includes('compare')
const EXTERNAL_FIXED_WIDTH_COLUMN_IDS = new Set(['select', 'id', 'recent_change', 'favorite', 'watch', 'row_actions'])
const EXTERNAL_DEFAULT_GROUP_OPTIONS = [
  { value: 'raw', label: 'Raw Registry' },
  { value: 'type', label: 'Type' },
  { value: 'status', label: 'Status' },
  { value: 'environment', label: 'Environment' },
  { value: 'criticality', label: 'Criticality' },
]
const EXTERNAL_PERSISTED_COLUMN_IDS = new Set([
  'select',
  'id',
  'recent_change',
  'favorite',
  'watch',
  'name',
  'external_entity_name',
  'direction',
  'device_name',
  'service_name',
  'purpose',
  'protocol',
  'port',
  'type',
  'internal_owner',
  'status',
  'environment',
  'link_count',
  'warning_count',
  'row_actions',
])

const normalizeExternalHiddenColumns = (value: any) =>
  Array.isArray(value)
    ? value.filter((entry) => typeof entry === 'string' && EXTERNAL_PERSISTED_COLUMN_IDS.has(entry))
    : []

const normalizeExternalQuickFilters = (value: any) => ({
  status: Array.isArray(value?.status) ? value.status.filter((entry: any) => typeof entry === 'string' && entry.trim()) : [] as string[],
  type: Array.isArray(value?.type) ? value.type.filter((entry: any) => typeof entry === 'string' && entry.trim()) : [] as string[],
  environment: Array.isArray(value?.environment) ? value.environment.filter((entry: any) => typeof entry === 'string' && entry.trim()) : [] as string[],
  owner: Array.isArray(value?.owner) ? value.owner.filter((entry: any) => typeof entry === 'string' && entry.trim()) : [] as string[],
  direction: Array.isArray(value?.direction) ? value.direction.filter((entry: any) => typeof entry === 'string' && entry.trim()) : [] as string[],
  protocol: Array.isArray(value?.protocol) ? value.protocol.filter((entry: any) => typeof entry === 'string' && entry.trim()) : [] as string[],
})

const sanitizeExternalViewConfig = (config: any) => {
  const safeConfig = config && typeof config === 'object' ? config : {}
  return {
    fontSize: Number.isFinite(safeConfig.fontSize) ? safeConfig.fontSize : 11,
    rowDensity: Number.isFinite(safeConfig.rowDensity) ? safeConfig.rowDensity : 8,
    hiddenColumns: normalizeExternalHiddenColumns(safeConfig.hiddenColumns),
    groupBy: typeof safeConfig.groupBy === 'string' ? safeConfig.groupBy : 'raw',
    activeTab: (safeConfig.activeTab === 'deleted' ? 'deleted' : 'active') as 'active' | 'deleted',
    searchTerm: typeof safeConfig.searchTerm === 'string' ? safeConfig.searchTerm : '',
    showFilterBar: safeConfig.showFilterBar !== false,
    quickFilters: normalizeExternalQuickFilters(safeConfig.quickFilters),
    columnLayoutState: sanitizeOperationalColumnLayout(
      Array.isArray(safeConfig.columnLayoutState) ? safeConfig.columnLayoutState : [],
      EXTERNAL_PERSISTED_COLUMN_IDS,
      true
    ),
    filterModel: sanitizeOperationalFilterModel(safeConfig.filterModel, EXTERNAL_PERSISTED_COLUMN_IDS),
    sortModel: sanitizeOperationalSortModel(safeConfig.sortModel, EXTERNAL_PERSISTED_COLUMN_IDS),
  }
}

const normalizeExternalSavedViews = (value: any) =>
  (Array.isArray(value) ? value : []).filter((view: any) => (
    view &&
    typeof view === 'object' &&
    typeof view.id === 'string' &&
    typeof view.name === 'string'
  )).map((view: any) => ({
    ...view,
    config: sanitizeExternalViewConfig(view.config),
  }))

const normalizeExternalWorkspaceState = (value: any) => {
  const normalized = sanitizeExternalViewConfig(value)
  return {
    ...normalized,
  }
}

const normalizeLegacyContacts = (entity: any) => {
  if (Array.isArray(entity?.contacts_json) && entity.contacts_json.length) return entity.contacts_json
  if (!Array.isArray(entity?.poc_json)) return []
  return entity.poc_json.map((contact: any, index: number) => ({
    role: index === 0 ? 'Primary' : 'Operational',
    full_name: [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() || contact.id || 'Unspecified Contact',
    email: contact.email || '',
    phone: contact.phone || '',
    external_person_id: contact.id || '',
    is_primary: index === 0,
    is_escalation: false,
  }))
}

const getEntityInsights = (entity: any, links: any[] = []) => {
  const metadata = parseMetadataObject(entity?.metadata_json)
  const linked = links.filter((link: any) => link.external_entity_id === entity.id)
  const contacts = normalizeLegacyContacts(entity)
  const hasOwner = entity.ownership_mode === 'individual'
    ? Boolean(entity.internal_operator_id)
    : Boolean(entity.internal_team_id)
  const hasPoc = Boolean(contacts.length)
  const hasSecrets = Boolean(entity.secrets?.length)
  const extensionKeys = Object.keys(metadata || {})
  const warnings = [
    !hasOwner ? 'Owner coverage missing' : null,
    !hasPoc ? 'Contact roster missing' : null,
    !hasSecrets && ['API', 'DB', 'Script'].includes(entity.type) ? 'Credential reference missing' : null,
    linked.length === 0 ? 'No dependency mapping' : null,
    !entity.business_purpose ? 'Business purpose missing' : null,
    (entity.internet_exposed || entity.stores_pii) && !entity.third_party_assessment_status ? 'Assessment status missing' : null,
  ].filter(Boolean) as string[]

  return {
    metadata,
    contacts,
    linked,
    externalOwnerLabel: entity.owner_organization || entity.owner_team || 'Unassigned',
    internalOwnerLabel: entity.ownership_mode === 'individual'
      ? entity.internal_operator_name || entity.internal_operator_external_id || 'Unassigned'
      : entity.internal_team_name || 'Unassigned',
    hasOwner,
    hasPoc,
    hasSecrets,
    extensionKeys,
    warnings,
  }
}

const MetadataEditor = ({
  value,
  onChange,
  onError,
  allowedKeys = [],
}: {
  value: any
  onChange: (v: any) => void
  onError?: (err: string | null) => void
  allowedKeys?: string[]
}) => {
  const [mode, setMode] = useState<'table' | 'json'>('table')
  const [tableRows, setTableRows] = useState(() => {
    const obj = parseMetadataObject(value)
    return Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))
  })
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(parseMetadataObject(value), null, 2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const obj = parseMetadataObject(value)
    setTableRows(Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) })))
    setJsonValue(JSON.stringify(obj, null, 2))
  }, [value])

  const validateAndNotify = (rows: {key: string, value: string}[]) => {
    const obj: any = {}
    const keys = new Set()
    let hasDuplicate = false
    let invalidReservedKey: string | null = null
    let invalidTypeKey: string | null = null

    rows.forEach(r => {
      if (r.key) {
        if (keys.has(r.key)) hasDuplicate = true
        keys.add(r.key)
        if (reservedMetadataKeys.has(r.key)) invalidReservedKey = r.key
        if (allowedKeys.length > 0 && !allowedKeys.includes(r.key)) invalidTypeKey = r.key
        obj[r.key] = r.value
      }
    })

    if (hasDuplicate) {
        setError("Duplicate keys detected")
        onError?.("Duplicate keys detected")
        return false
    } else if (invalidReservedKey) {
        setError(`${invalidReservedKey} is now a structured field`)
        onError?.(`${invalidReservedKey} is now a structured field`)
        return false
    } else if (invalidTypeKey) {
        setError(`${invalidTypeKey} is not allowed for this external type`)
        onError?.(`${invalidTypeKey} is not allowed for this external type`)
        return false
    } else {
        setError(null)
        onError?.(null)
        setJsonValue(JSON.stringify(obj, null, 2))
        onChange(obj)
        return true
    }
  }

  const syncFromJSON = (json: string) => {
    try {
        const obj = JSON.parse(json)
        const keys = Object.keys(obj)
        const reservedKey = keys.find((key) => reservedMetadataKeys.has(key))
        if (reservedKey) {
          setError(`${reservedKey} is now a structured field`)
          onError?.(`${reservedKey} is now a structured field`)
          return false
        }
        const invalidTypeKey = allowedKeys.length > 0 ? keys.find((key) => !allowedKeys.includes(key)) : null
        if (invalidTypeKey) {
          setError(`${invalidTypeKey} is not allowed for this external type`)
          onError?.(`${invalidTypeKey} is not allowed for this external type`)
          return false
        }
        const rows = Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))
        setTableRows(rows)
        setError(null)
        onError?.(null)
        onChange(obj)
        return true
    } catch (e) {
        setError("Invalid JSON format")
        onError?.("Invalid JSON format")
        return false
    }
  }

  return (
    <div className="bg-slate-900/50 rounded-lg border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
         <div className="flex items-center space-x-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">External Entity Metadata</span>
            {error && <span className="text-[8px] font-bold text-rose-500 uppercase animate-pulse">!! {error}</span>}
         </div>
         <div className="flex bg-black/40 rounded-lg p-1">
            <button onClick={() => setMode('table')} className={`px-2 py-1 rounded-lg transition-all ${mode === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={12}/></button>
            <button onClick={() => setMode('json')} className={`px-2 py-1 rounded-lg transition-all ${mode === 'json' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><FileJson size={12}/></button>
         </div>
      </div>
      <div className="p-4 min-h-[120px]">
        {mode === 'table' ? (
          <div className="space-y-2">
            {tableRows.map((row, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input value={row.key} onChange={e => {
                  const n = [...tableRows]; n[i].key = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Key" className={`flex-1 bg-black/40 border ${error === 'Duplicate keys detected' ? 'border-rose-500/50' : 'border-white/5'} rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500`} />
                <input value={row.value} onChange={e => {
                  const n = [...tableRows]; n[i].value = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Values" className="flex-[2] bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] outline-none" />
                <button onClick={() => {
                    const n = tableRows.filter((_, idx) => idx !== i);
                    setTableRows(n); validateAndNotify(n);
                }} className="text-slate-600 hover:text-rose-400 transition-colors"><X size={14}/></button>
              </div>
            ))}
            <button onClick={() => {
                const n = [...tableRows, { key: '', value: '' }];
                setTableRows(n);
            }} className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-2 hover:text-blue-300 transition-colors">+ Add Attribute</button>
          </div>
        ) : (
          <textarea value={jsonValue} onChange={e => {
            setJsonValue(e.target.value);
            syncFromJSON(e.target.value);
          }} className={`w-full h-32 bg-black/40 border ${error === 'Invalid JSON format' ? 'border-rose-500/50' : 'border-white/5'} rounded-lg px-4 py-3 text-[11px] font-mono text-blue-300 outline-none`} />
        )}
      </div>
    </div>
  )
}

const MetadataViewer = ({ data }: { data: any }) => {
  let obj: any = {}
  try {
    obj = typeof data === 'string' ? JSON.parse(data || '{}') : (data || {})
  } catch {
    obj = {}
  }
  return (
    <div className="bg-slate-900/50 rounded-lg border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Metadata Inspection</span>
      </div>
      <table className="w-full text-[10px]">
        <thead className="bg-white/5 border-b border-white/5">
          <tr>
            <th className="px-4 py-2 text-left font-bold uppercase tracking-widest text-slate-500">Key</th>
            <th className="px-4 py-2 text-left font-bold uppercase tracking-widest text-slate-500">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {Object.entries(obj).map(([k, v]) => (
            <tr key={k} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 font-bold uppercase text-blue-400 tracking-tighter w-1/3">{k}</td>
              <td className="px-4 py-3 font-mono text-slate-300">{String(v)}</td>
            </tr>
          ))}
          {Object.keys(obj).length === 0 && (
            <tr><td colSpan={2} className="px-4 py-12 text-center text-slate-600 font-bold uppercase  tracking-widest">No metadata keys defined</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const POCManager = ({ pocs, onChange }: { pocs: any[], onChange: (newPocs: any[]) => void }) => {
  const addPOC = () => {
    onChange([...pocs, { role: 'Operational', full_name: '', email: '', phone: '', external_person_id: '', is_primary: pocs.length === 0, is_escalation: false }])
  }

  const updatePOC = (index: number, field: string, value: any) => {
    const newPocs = [...pocs]
    newPocs[index] = { ...newPocs[index], [field]: value }
    onChange(newPocs)
  }

  const removePOC = (index: number) => {
    onChange(pocs.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-slate-900/50 rounded-lg border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <User size={14} className="text-amber-400" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Authorized Points of Contact</span>
        </div>
        <button onClick={addPOC} className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all">+ Add POC</button>
      </div>
      <div className="p-4 space-y-3">
        {pocs.length === 0 && (
          <div className="py-8 text-center border border-dashed border-white/5 rounded-lg">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest ">No POCs registered</p>
          </div>
        )}
        {pocs.map((poc, idx) => (
          <div key={idx} className="bg-black/40 p-4 rounded-lg border border-white/5 space-y-3 relative group">
            <button onClick={() => removePOC(idx)} className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><X size={14}/></button>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Full Name</label>
                <input value={poc.full_name} onChange={e => updatePOC(idx, 'full_name', e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white outline-none focus:border-amber-500/50" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Role</label>
                <StyledSelect
                  value={poc.role}
                  onChange={e => updatePOC(idx, 'role', e.target.value)}
                  options={CONTACT_ROLE_OPTIONS.map((role) => ({ value: role, label: role }))}
                />
              </div>
              <div>
                <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">External Contact ID</label>
                <input value={poc.external_person_id} onChange={e => updatePOC(idx, 'external_person_id', e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white outline-none focus:border-amber-500/50" placeholder="JD-1234" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">
                <Mail size={10} className="text-slate-500" />
                <input value={poc.email} onChange={e => updatePOC(idx, 'email', e.target.value)} className="flex-1 bg-transparent text-[10px] font-bold text-slate-300 outline-none" placeholder="jane.doe@org.com" />
              </div>
              <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">
                <Phone size={10} className="text-slate-500" />
                <input value={poc.phone} onChange={e => updatePOC(idx, 'phone', e.target.value)} className="flex-1 bg-transparent text-[10px] font-bold text-slate-300 outline-none" placeholder="+1-555-0199" />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                <input type="checkbox" checked={!!poc.is_primary} onChange={e => onChange(pocs.map((entry, entryIndex) => ({ ...entry, is_primary: entryIndex === idx ? e.target.checked : false })))} />
                Primary Contact
              </label>
              <label className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                <input type="checkbox" checked={!!poc.is_escalation} onChange={e => updatePOC(idx, 'is_escalation', e.target.checked)} />
                Escalation Contact
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const ExternalSecretsTab = ({ entityId }: { entityId: number }) => {
  const queryClient = useQueryClient()
  const { data: entities } = useQuery({
    queryKey: ['external-entities', { include_deleted: true }],
    queryFn: async () => (await (await apiFetch('/api/v1/intelligence/entities?include_deleted=true')).json())
  })
  const entity = (entities as any[])?.find((e: any) => e.id === entityId)
  const [newSecret, setNewSecret] = useState({
    secret_label: '',
    secret_type: 'VaultReference',
    username: '',
    vault_provider: '',
    vault_path: '',
    note: '',
    credential_status: 'Active',
    rotation_frequency_days: '',
  })
  const [error, setError] = useState('')

  const addMutation = useMutation({
    mutationFn: async (data: any) => apiFetch(`/api/v1/intelligence/entities/${entityId}/secrets`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      setNewSecret({ secret_label: '', secret_type: 'VaultReference', username: '', vault_provider: '', vault_path: '', note: '', credential_status: 'Active', rotation_frequency_days: '' })
      setError('')
      toast.success('Credential Added') 
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (secretId: number) => apiFetch(`/api/v1/intelligence/entities/${entityId}/secrets/${secretId}`, { method: 'DELETE' }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      toast.success('Credential Revoked') 
    }
  })

  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-white/5 rounded-lg p-6 space-y-4">
        <h3 className="text-[10px] font-bold uppercase text-blue-400 tracking-widest flex items-center gap-2">
          <Shield size={12}/> Register Credential Reference
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Credential Label</label>
            <input value={newSecret.secret_label} onChange={e => setNewSecret({...newSecret, secret_label: e.target.value})} placeholder="Partner production token" className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Credential Type</label>
            <StyledSelect value={newSecret.secret_type} onChange={e => setNewSecret({...newSecret, secret_type: e.target.value})} options={SECRET_TYPE_OPTIONS.map((value) => ({ value, label: value }))} />
          </div>
          <div>
            <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Status</label>
            <StyledSelect value={newSecret.credential_status} onChange={e => setNewSecret({...newSecret, credential_status: e.target.value})} options={SECRET_STATUS_OPTIONS.map((value) => ({ value, label: value }))} />
          </div>
          <div>
            <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Username / ID</label>
            <input value={newSecret.username} onChange={e => setNewSecret({...newSecret, username: e.target.value})} placeholder="E.G. ADMIN_SVC" className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Vault Provider</label>
            <StyledSelect value={newSecret.vault_provider} onChange={e => setNewSecret({...newSecret, vault_provider: e.target.value})} options={VAULT_PROVIDER_OPTIONS.map((value) => ({ value, label: value }))} placeholder="Select provider" />
          </div>
          <div>
            <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Vault Path</label>
            <input value={newSecret.vault_path} onChange={e => setNewSecret({...newSecret, vault_path: e.target.value})} placeholder="vault://partner/prod/token" className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Rotation Frequency (Days)</label>
            <input value={newSecret.rotation_frequency_days} onChange={e => setNewSecret({...newSecret, rotation_frequency_days: e.target.value})} placeholder="90" className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Purpose / Note</label>
            <input value={newSecret.note} onChange={e => setNewSecret({...newSecret, note: e.target.value})} placeholder="Readonly feed access" className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
          </div>
        </div>
        {error && <p className="text-[9px] font-bold text-rose-400">{error}</p>}
        <button 
          disabled={!newSecret.secret_label || (newSecret.secret_type === 'VaultReference' && !newSecret.vault_path)}
          onClick={() => {
            if (!newSecret.secret_label.trim()) {
              setError('Credential label is required')
              return
            }
            if (newSecret.secret_type === 'VaultReference' && !newSecret.vault_path.trim()) {
              setError('Vault path is required for vault-referenced credentials')
              return
            }
            addMutation.mutate({
              ...newSecret,
              vault_provider: newSecret.vault_provider || null,
              vault_path: newSecret.vault_path || null,
              rotation_frequency_days: newSecret.rotation_frequency_days ? parseInt(newSecret.rotation_frequency_days, 10) : null,
            })
          }}
          className="w-full py-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {addMutation.isPending ? <RefreshCcw size={14} className="animate-spin" /> : <Plus size={14} />}
          Register Credential Reference
        </button>
      </div>

      <div className="bg-slate-900/50 rounded-lg border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Authorized Credential Matrix</span>
          <span className="text-[8px] font-bold text-blue-500 uppercase bg-blue-500/10 px-2 py-0.5 rounded-lg">{entity?.secrets?.length || 0} Entries</span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 border-b border-white/5">
              <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">Label</th>
              <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">Vault Path</th>
              <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-[9px] font-bold uppercase tracking-widest text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entity?.secrets?.map((s: any) => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-4 py-3 text-[10px] font-bold text-white">{s.secret_label}</td>
                <td className="px-4 py-3 font-mono text-[10px] text-blue-400/80">{s.vault_path || 'Legacy inline secret'}</td>
                <td className="px-4 py-3 text-[10px] text-slate-400 font-medium ">{s.credential_status || 'Active'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteMutation.mutate(s.id)} className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={14}/>
                  </button>
                </td>
              </tr>
            ))}
            {(!entity?.secrets || entity.secrets.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-600 font-bold uppercase  tracking-widest text-[9px]">No credentials stored for this identity</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ExternalForm = ({
  initialData,
  onSave,
  isSaving,
  options,
  teams,
  operators,
  formId = 'external-entity-form',
  renderActions = true,
}: any) => {
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState(() => {
    const normalizedContacts = normalizeLegacyContacts(initialData)
    return {
      name: initialData.name || '',
      aliases_json: initialData.aliases_json || [],
      type: initialData.type || 'API',
      owner_organization: initialData.owner_organization || '',
      owner_team: initialData.owner_team || '',
      ownership_mode: initialData.ownership_mode || 'team',
      internal_team_id: initialData.internal_team_id ? String(initialData.internal_team_id) : '',
      internal_operator_id: initialData.internal_operator_id ? String(initialData.internal_operator_id) : '',
      status: initialData.status || 'Planned',
      environment: initialData.environment || 'Production',
      description: initialData.description || '',
      notes: initialData.notes || '',
      contacts_json: normalizedContacts,
      business_purpose: initialData.business_purpose || '',
      metadata_json: parseMetadataObject(initialData.metadata_json),
    }
  })

  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []
  const ensureCurrentOption = (entries: Array<{ value: string; label: string }>, currentValue: string) => {
    if (!currentValue) return entries
    return entries.some((entry) => entry.value === currentValue)
      ? entries
      : [{ value: currentValue, label: currentValue }, ...entries]
  }
  const externalTypeOptions = getOptions('ExternalType')
  const types = ensureCurrentOption(externalTypeOptions.length ? externalTypeOptions : FALLBACK_EXTERNAL_TYPE_OPTIONS, formData.type)
  const statusOptions = ensureCurrentOption(getOptions('Status'), formData.status)
  const envOptions = ensureCurrentOption(getOptions('Environment'), formData.environment)
  const selectedTypeOption = types.find((type: any) => type.value === formData.type)
  const allowedMetadataKeys = (selectedTypeOption as any)?.metadata_keys || (extensionMetadataKeysByType as any)[formData.type] || []

  useEffect(() => {
    if (!allowedMetadataKeys.length) return
    setFormData((prev: any) => {
      const nextMeta = { ...prev.metadata_json }
      let changed = false
      for (const key of allowedMetadataKeys) {
        if (!(key in nextMeta)) {
          nextMeta[key] = ''
          changed = true
        }
      }
      const filteredMeta = Object.fromEntries(Object.entries(nextMeta).filter(([key]) => allowedMetadataKeys.includes(key)))
      if (JSON.stringify(filteredMeta) !== JSON.stringify(prev.metadata_json)) changed = true
      return changed ? { ...prev, metadata_json: filteredMeta } : prev
    })
  }, [formData.type])

  const updateField = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const inputClass = (field: string) => `w-full bg-slate-900 border ${errors[field] ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-lg px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all`

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!formData.name.trim()) nextErrors.name = 'Name is required'
    if (formData.ownership_mode === 'team' && !formData.internal_team_id) nextErrors.internal_team_id = 'Accountable team is required'
    if (formData.ownership_mode === 'individual' && !formData.internal_operator_id) nextErrors.internal_operator_id = 'Accountable operator is required'
    if (!formData.business_purpose.trim()) nextErrors.business_purpose = 'Business purpose is required'
    if (!formData.contacts_json.length) nextErrors.contacts_json = 'At least one contact is required'
    if (formData.contacts_json.filter((contact: any) => contact.is_primary).length > 1) nextErrors.contacts_json = 'Only one primary contact is allowed'
    if (metadataError) nextErrors.metadata_json = metadataError
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({
      ...formData,
      internal_team_id: formData.ownership_mode === 'team' && formData.internal_team_id ? parseInt(formData.internal_team_id, 10) : null,
      internal_operator_id: formData.ownership_mode === 'individual' && formData.internal_operator_id ? parseInt(formData.internal_operator_id, 10) : null,
    })
  }

  return (
    <form
      id={formId}
      className="space-y-8 py-6"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
    >
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest border-l-2 border-blue-600 pl-3">Identity & Classification</h3>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 px-1">Entity Name *</label>
            <input value={formData.name} onChange={e => updateField('name', e.target.value)} className={inputClass('name')} placeholder="customer-feed-api" />
            {errors.name && <p className="mt-1 px-1 text-[9px] font-bold text-rose-400">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StyledSelect label="Type" value={formData.type} onChange={e => updateField('type', e.target.value)} options={types} />
            <StyledSelect label="Operational Status" value={formData.status} onChange={e => updateField('status', e.target.value)} options={statusOptions} />
          </div>
          <StyledSelect label="Environment" value={formData.environment} onChange={e => updateField('environment', e.target.value)} options={envOptions} />
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest border-l-2 border-emerald-600 pl-3">Ownership & Scope</h3>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 px-1">External Organization</label>
            <input value={formData.owner_organization} onChange={e => updateField('owner_organization', e.target.value)} className={inputClass('owner_organization')} placeholder="PartnerCo" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 px-1">External Team Label</label>
            <input value={formData.owner_team} onChange={e => updateField('owner_team', e.target.value)} className={inputClass('owner_team')} placeholder="B2B Platform" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StyledSelect label="Accountable Owner Mode" value={formData.ownership_mode} onChange={e => updateField('ownership_mode', e.target.value)} options={ACCOUNTABLE_OWNER_OPTIONS} />
            {formData.ownership_mode === 'team' ? (
              <StyledSelect
                label="Accountable Team *"
                value={formData.internal_team_id}
                onChange={e => updateField('internal_team_id', e.target.value)}
                options={(teams || []).filter((team: any) => !team.is_archived).map((team: any) => ({ value: String(team.id), label: team.name }))}
                error={!!errors.internal_team_id}
                placeholder="Select team"
              />
            ) : (
              <StyledSelect
                label="Accountable Operator *"
                value={formData.internal_operator_id}
                onChange={e => updateField('internal_operator_id', e.target.value)}
                options={(operators || []).map((operator: any) => ({ value: String(operator.id), label: operator.full_name || operator.username || operator.external_id }))}
                error={!!errors.internal_operator_id}
                placeholder="Select operator"
              />
            )}
          </div>
          {(errors.internal_team_id || errors.internal_operator_id) && (
            <p className="px-1 text-[9px] font-bold text-rose-400">{errors.internal_team_id || errors.internal_operator_id}</p>
          )}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 px-1">Business Purpose *</label>
            <textarea value={formData.business_purpose} onChange={e => updateField('business_purpose', e.target.value)} className={`${inputClass('business_purpose')} h-24 resize-none`} placeholder="What business capability depends on this external entity?" />
            {errors.business_purpose && <p className="mt-1 px-1 text-[9px] font-bold text-rose-400">{errors.business_purpose}</p>}
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 px-1">Functional Description</label>
            <textarea value={formData.description} onChange={e => updateField('description', e.target.value)} className={`${inputClass('description')} h-24 resize-none`} placeholder="Operational context for this external dependency" />
          </div>
        </div>

        <div className="col-span-2">
          <POCManager pocs={formData.contacts_json || []} onChange={newPocs => updateField('contacts_json', newPocs)} />
          {(errors.contacts_json || metadataError) && <p className="mt-2 px-1 text-[9px] font-bold text-rose-400">{errors.contacts_json}</p>}
        </div>

        <div className="col-span-2">
          <MetadataEditor value={formData.metadata_json} onChange={v => updateField('metadata_json', v)} onError={setMetadataError} allowedKeys={allowedMetadataKeys} />
          {errors.metadata_json && <p className="mt-2 px-1 text-[9px] font-bold text-rose-400">{errors.metadata_json}</p>}
        </div>
      </div>

      {renderActions ? (
        <div className="flex space-x-4 pt-4 border-t border-white/5">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
          >
            {isSaving && <RefreshCcw size={18} className="animate-spin" />}
            <span>{initialData.id ? 'Synchronize Entity Manifest' : 'Authorize External Registry Admission'}</span>
          </button>
        </div>
      ) : null}
    </form>
  )
}

const ExternalDetailsView = ({
  entity,
  links,
}: {
  entity: any
  links: any[]
}) => {
  const insights = useMemo(() => getEntityInsights(entity, links), [entity, links])
  const summaryFacts = [
    ['Business purpose', entity.business_purpose || 'Not documented'],
    ['Type', entity.type || 'Unspecified'],
    ['Environment', entity.environment || 'Unspecified'],
    ['Accountable owner', insights.internalOwnerLabel],
  ]

  return (
    <WorkspaceSplitView
      className="gap-8"
      sidebar={
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="px-1 text-[11px] font-black text-slate-500 uppercase tracking-widest">Target scope</h3>
            <div className="space-y-3">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">External identity</p>
                  <Globe size={10} className="text-blue-500/50" />
                </div>
                <p className="text-[11px] font-black text-slate-100">{entity.name}</p>
                <p className="mt-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {entity.external_key || 'No external key'} · {entity.status || 'Unknown'}
                </p>
              </div>

              <div className="bg-black/20 border border-white/5 rounded-lg p-4 shadow-inner space-y-3">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Contacts</p>
                <div className="flex flex-wrap gap-1.5">
                  {insights.contacts.length > 0 ? (
                    insights.contacts.map((contact: any, index: number) => (
                      <span
                        key={`${contact.external_person_id || contact.full_name || index}`}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-300"
                      >
                        {contact.full_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] font-bold text-slate-700 italic">No contacts defined</span>
                  )}
                </div>
              </div>

              <div className="bg-black/20 border border-white/5 rounded-lg p-4 shadow-inner space-y-3">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Dependencies</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Links</p>
                    <p className="mt-1 text-[12px] font-black text-blue-400">{insights.linked.length}</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Warnings</p>
                    <p className={`mt-1 text-[12px] font-black ${insights.warnings.length ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {insights.warnings.length}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.href = `/logs?target_table=external_entities&target_id=${entity.id}`}
                  className="w-full rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-300 transition-colors hover:bg-indigo-500/20"
                >
                  Open audit logs
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="px-1 text-[11px] font-black text-slate-500 uppercase tracking-widest">Credentials</h3>
            <div className="bg-black/20 border border-white/5 rounded-lg p-4 shadow-inner">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Stored secrets</p>
                <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-300">
                  {entity.secrets?.length || 0}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {entity.secrets?.length ? (
                  entity.secrets.map((secret: any) => (
                    <div key={secret.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                      <p className="text-[10px] font-bold text-slate-100">{secret.secret_label}</p>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                        {secret.credential_status || 'Active'} · {secret.vault_provider || 'Inline'}
                      </p>
                    </div>
                  ))
                ) : (
                  <WorkspaceEmptyState compact title="No credentials stored" description="This external identity has no credential references yet." />
                )}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="px-1 text-[11px] font-black text-slate-500 uppercase tracking-widest">Operational meta</h3>
            <div className="bg-white/5 border border-white/5 rounded-lg overflow-hidden divide-y divide-white/5 shadow-inner">
              {[
                { label: 'Criticality', value: entity.criticality || 'Low', color: 'text-rose-400', icon: Bell },
                { label: 'Risk', value: entity.risk_rating || 'Low', color: 'text-amber-400', icon: Shield },
                { label: 'Tier', value: entity.dependency_tier || 'Tier 3', color: 'text-blue-400', icon: Layers },
              ].map((stat, index) => (
                <div key={`${stat.label}-${index}`} className="flex items-center justify-between p-3 transition-all hover:bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-black/40 p-1.5 text-slate-600">
                      <stat.icon size={12} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
                  </div>
                  <span className={`text-[10px] font-black ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      }
      main={
        <div className="space-y-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: 'Linked dependencies', value: insights.linked.length, tone: 'text-blue-400' },
              { label: 'Stored credentials', value: entity.secrets?.length || 0, tone: 'text-emerald-400' },
              { label: 'Contacts', value: insights.contacts.length, tone: 'text-amber-400' },
              { label: 'Warnings', value: insights.warnings.length, tone: insights.warnings.length ? 'text-rose-400' : 'text-slate-400' },
            ].map((card) => (
              <div key={card.label} className="rounded-lg border border-white/5 bg-white/[0.03] p-5 shadow-inner">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{card.label}</p>
                <p className={`mt-2 text-3xl font-black ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-5 shadow-inner">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                  <Info size={14} />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Mission Summary</h4>
              </div>
              <p className="pl-1 text-[12px] font-bold leading-relaxed text-slate-400">
                {entity.business_purpose || entity.description || 'Not documented'}
              </p>
            </div>

            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-5 shadow-inner">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                  <Briefcase size={14} />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Ownership Context</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {summaryFacts.map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/5 bg-black/30 p-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</p>
                    <p className="mt-1 break-words text-[10px] font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-800 p-2 text-slate-400">
                  <Users size={16} />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Contact Matrix</h3>
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 overflow-hidden">
              <div className="divide-y divide-white/5">
                {insights.contacts.length ? insights.contacts.map((contact: any) => (
                  <div key={contact.external_person_id || contact.full_name} className="flex items-center justify-between gap-4 p-4 hover:bg-white/5">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-black uppercase text-white">{contact.full_name}</p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-500">
                        {contact.role}{contact.external_person_id ? ` · ${contact.external_person_id}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => contact.email && (window.location.href = `mailto:${contact.email}`)} className="text-slate-500 transition-colors hover:text-amber-400">
                        <Mail size={12} />
                      </button>
                      <button onClick={() => contact.phone && (window.location.href = `tel:${contact.phone}`)} className="text-slate-500 transition-colors hover:text-amber-400">
                        <Phone size={12} />
                      </button>
                    </div>
                  </div>
                )) : (
                  <WorkspaceEmptyState compact title="No contacts defined" description="Accountable contacts have not been registered." />
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="rounded-lg bg-blue-600/10 p-2 text-blue-400">
                <Share2 size={16} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Dependency Matrix</h3>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 overflow-hidden">
              <div className="divide-y divide-white/5">
                {insights.linked.length ? insights.linked.map((link: any) => (
                  <div key={link.id} className="flex items-center justify-between gap-4 p-4 hover:bg-white/5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-white">
                        {link.device_name || 'Unknown asset'}
                        {link.service_name ? ` // ${link.service_name}` : ''}
                      </p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                        {link.direction} · {link.protocol || 'Unknown protocol'} · {link.port || 'No port'} · {link.purpose || 'No purpose documented'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.location.href = `/asset?id=${link.device_id}`}
                        className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-blue-400"
                      >
                        Asset
                      </button>
                      {link.service_id && (
                        <button
                          onClick={() => window.location.href = `/services?id=${link.service_id}`}
                          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-emerald-400"
                        >
                          Service
                        </button>
                      )}
                    </div>
                  </div>
                )) : (
                  <WorkspaceEmptyState compact title="No dependency links mapped yet" description="Use the map link action to register interconnects." />
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="rounded-lg bg-slate-800 p-2 text-slate-400">
                <List size={16} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Metadata</h3>
            </div>
            <MetadataViewer data={entity.metadata_json} />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                <Key size={16} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Credentials</h3>
            </div>
            <ExternalSecretsTab entityId={entity.id} />
          </section>
        </div>
      }
    />
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

function CompareExternalModal({ items, onClose }: { items: any[]; onClose: () => void }) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [isMaximized, setIsMaximized] = useState(false)
  const fields = useMemo(() => [
    { label: 'Status', getValue: (item: any) => item.status || 'Unknown' },
    { label: 'Type', getValue: (item: any) => item.type || 'N/A' },
    { label: 'Subtype', getValue: (item: any) => item.subtype || 'N/A' },
    { label: 'Environment', getValue: (item: any) => item.environment || 'N/A' },
    { label: 'Criticality', getValue: (item: any) => item.criticality || 'N/A' },
    { label: 'Risk Rating', getValue: (item: any) => item.risk_rating || 'N/A' },
    { label: 'Dependency Tier', getValue: (item: any) => item.dependency_tier || 'N/A' },
    { label: 'Organization', getValue: (item: any) => item.owner_organization || 'N/A' },
    { label: 'Accountable Team', getValue: (item: any) => item.owner_team || 'N/A' },
    { label: 'Endpoint (Primary)', getValue: (item: any) => item.primary_endpoint_url || 'N/A' },
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
      title="Compare External Identities"
      subtitle={`Temporal Variance Analysis · Comparing ${items.length} external states for semantic drift`}
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
                  <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${
                    item.status === 'Active'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                  }`}>
                    {item.status || 'Unknown'}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white truncate mb-1">{item.name}</h4>
                <p className="text-[9px] font-bold text-slate-500 tracking-widest truncate">{item.owner_organization || 'No Organization'}</p>
                
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

export default function External() {
  const [searchParams, setSearchParams] = useSearchParams()
  const entityIdFromUrl = searchParams.get('id')
  const externalStorageNamespace = 'sysgrid_external'
  const externalViewStorageKey = `${externalStorageNamespace}_views_v1`
  const externalActiveViewKey = `${externalStorageNamespace}_active_view_v1`
  const externalUiStateKey = `${externalStorageNamespace}_ui_state_v1`
  const externalFavoritesKey = `${externalStorageNamespace}_favorites_v1`
  const externalWatchKey = `${externalStorageNamespace}_watch_v1`
  const externalLastVisitedKey = `${externalStorageNamespace}_last_visited_v1`
  const externalViewLabel = 'External'
  const externalRegistryLabel = 'External Registry'
  const queryClient = useQueryClient()
  const gridRef = useRef<any>(null)
  const [, setGridApi] = useState<any>(null)
  const [, setGridColumnApi] = useState<any>(null)
  const [savedViews, setSavedViews] = usePersistentJsonState(externalViewStorageKey, [] as any[])
  const [activeViewId, setActiveViewId] = usePersistentJsonState<string | null>(externalActiveViewKey, null)
  const [persistedUiState, setPersistedUiState] = usePersistentJsonState(externalUiStateKey, () => normalizeExternalWorkspaceState(null))
  const [fontSize, setFontSize] = useState(persistedUiState.fontSize)
  const [rowDensity, setRowDensity] = useState(persistedUiState.rowDensity)
  const [showDisplayMenu, setShowDisplayMenu] = useState(false)
  const [showViewsMenu, setShowViewsMenu] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showFilterBar, setShowFilterBar] = useState(persistedUiState.showFilterBar ?? true)
  const [isIntelligenceExpanded, setIsIntelligenceExpanded] = useState(false)
  const [lastVisitedAt] = useState<number>(() => {
    try {
      const raw = window.localStorage.getItem(externalLastVisitedKey)
      return raw ? Number(raw) : 0
    } catch { return 0 }
  })
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(persistedUiState.hiddenColumns ?? ['created_at', 'updated_at'])
  const [showConfig, setShowConfig] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'deleted' | 'links'>(persistedUiState.activeTab === 'deleted' ? 'deleted' : 'active')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkSeedEntityId, setLinkSeedEntityId] = useState<number | null>(null)
  const [isWorkspaceMaximized, setIsWorkspaceMaximized] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, id: null, purge: false, type: 'entity' })
  const [searchTerm, setSearchTerm] = useState(persistedUiState.searchTerm)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Cloned states from Monitoring view
  const [groupBy, setGroupBy] = useState<string>(persistedUiState.groupBy || 'raw')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [favoriteIds, setFavoriteIds] = usePersistentJsonState<number[]>(externalFavoritesKey, [])
  const [watchIds, setWatchIds] = usePersistentJsonState<number[]>(externalWatchKey, [])
  const [compareOpen, setCompareOpen] = useState(false)
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [isBulkEnvOpen, setIsBulkEnvOpen] = useState(false)
  const [isBulkCriticalityOpen, setIsBulkCriticalityOpen] = useState(false)
  const [isBulkRiskOpen, setIsBulkRiskOpen] = useState(false)
  const [bulkDraft, setBulkDraft] = useState({ status: '', environment: '', criticality: '', risk_rating: '' })
  const [expandedBulkSection, setExpandedBulkSection] = useState<'status' | 'environment' | 'criticality' | 'risk_rating' | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [rowActionMenu, setRowActionMenu] = useState<{ item: any; style: React.CSSProperties } | null>(null)
  const [rowDeleteConfirmId, setRowDeleteConfirmId] = useState<number | null>(null)

  const [quickFilters, setQuickFilters] = useState(persistedUiState.quickFilters || {
    status: [] as string[],
    type: [] as string[],
    environment: [] as string[],
    owner: [] as string[],
    direction: [] as string[],
    protocol: [] as string[],
  })
  const [gridFilterModel, setGridFilterModel] = useState<Record<string, any>>(persistedUiState.filterModel || {})
  const [gridSortModel, setGridSortModel] = useState<Array<{ colId: string; sort: string }>>(persistedUiState.sortModel || [])
  const [newViewName, setNewViewName] = useState('')
  const [pendingGridRestore, setPendingGridRestore] = useState<any | null>(null)

  const { triggerRef: displayMenuButtonRef, panelRef: displayMenuPanelRef, panelStyle: displayMenuStyle } = useWorkspaceAnchoredLayer(showDisplayMenu, { minWidth: 320 })
  const { triggerRef: viewsMenuButtonRef, panelRef: viewsMenuPanelRef, panelStyle: viewsMenuStyle } = useWorkspaceAnchoredLayer(showViewsMenu, { minWidth: 420 })
  const { triggerRef: bulkMenuButtonRef, panelRef: bulkMenuPanelRef, panelStyle: bulkMenuStyle } = useWorkspaceAnchoredLayer(showBulkMenu, { minWidth: 340 })

  const {
    columnLayoutState,
    setColumnLayoutState,
    preserveExplicitColumnWidths,
    applyColumnLayoutState,
    syncColumnLayoutState,
    handleColumnResized,
  } = useOperationalGridLayout(persistedUiState.columnLayoutState ?? [], Boolean(activeViewId))
  const { data: options } = useQuery({ 
    queryKey: ['settings-options'], 
    queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) 
  })
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => (await (await apiFetch('/api/v1/settings/teams')).json())
  })
  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => (await (await apiFetch('/api/v1/settings/operators')).json())
  })

  const { data: allEntities, isLoading } = useQuery({
    queryKey: ['external-entities', { include_deleted: true }],
    queryFn: async () => (await (await apiFetch('/api/v1/intelligence/entities?include_deleted=true')).json())
  })

  // Deep linking: Open modal if ID is in URL
  useEffect(() => {
    if (allEntities && entityIdFromUrl && !activeDetails) {
      const entity = allEntities.find((e: any) => String(e.id) === entityIdFromUrl)
      if (entity) setActiveDetails(entity)
    }
  }, [allEntities, entityIdFromUrl, activeDetails])

  useEffect(() => {
    if (activeDetails) {
      setSearchParams({ id: String(activeDetails.id) })
    }
  }, [activeDetails, setSearchParams])

  const closeDetails = () => {
    setActiveDetails(null)
    if (searchParams.has('id')) {
      setSearchParams({})
    }
  }


  const { data: links, isLoading: linkLoading } = useQuery({ 
    queryKey: ['external-links'], 
    queryFn: async () => (await (await apiFetch('/api/v1/intelligence/links')).json()) 
  })

  const { data: devices } = useQuery({ 
    queryKey: ['devices'], 
    queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) 
  })

  useWorkspaceDismissHandlers({
    active: showDisplayMenu,
    onDismiss: () => setShowDisplayMenu(false),
    shouldDismiss: (target) => !(
      displayMenuButtonRef.current?.contains(target) ||
      displayMenuPanelRef.current?.contains(target)
    ),
  })

  useWorkspaceDismissHandlers({
    active: showViewsMenu,
    onDismiss: () => setShowViewsMenu(false),
    shouldDismiss: (target) => !(
      viewsMenuButtonRef.current?.contains(target) ||
      viewsMenuPanelRef.current?.contains(target)
    ),
  })

  useWorkspaceDismissHandlers({
    active: showBulkMenu,
    onDismiss: () => setShowBulkMenu(false),
    shouldDismiss: (target) => !(
      bulkMenuButtonRef.current?.contains(target) ||
      bulkMenuPanelRef.current?.contains(target)
    ),
  })

  const entities = useMemo(() => {
    if (!allEntities) return []
    return allEntities
      .map((entity: any) => {
        const insights = getEntityInsights(entity, links || [])
        return {
          ...entity,
          internal_owner: insights.internalOwnerLabel,
          link_count: insights.linked.length,
          warning_count: insights.warnings.length,
        }
      })
      .filter((e: any) => activeTab === 'active' ? !e.is_deleted : e.is_deleted)
  }, [allEntities, activeTab, links])

  const sortedEntities = useMemo(() => {
    const sorted = [...entities].sort((a, b) => {
      // Pin favorites to top
      const aFav = favoriteIds.includes(a.id) ? 1 : 0
      const bFav = favoriteIds.includes(b.id) ? 1 : 0
      if (aFav !== bFav) return bFav - aFav
      
      // Secondary fallback
      return a.id - b.id
    })
    return sorted
  }, [entities, favoriteIds])

  const registryCounts = useMemo(() => ({
    active: allEntities?.filter((entity: any) => !entity.is_deleted).length || 0,
    archived: allEntities?.filter((entity: any) => entity.is_deleted).length || 0,
  }), [allEntities])

  const toFilterOptions = (values: any[]) => Array.from(new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0)))
    .sort()
    .map((value) => ({ value, label: value }))

  const entityFilterOptions = useMemo(() => ({
    status: toFilterOptions(entities.map((entity: any) => entity.status)),
    type: toFilterOptions(entities.map((entity: any) => entity.type)),
    environment: toFilterOptions(entities.map((entity: any) => entity.environment)),
    owner: toFilterOptions(entities.map((entity: any) => entity.internal_owner)),
  }), [entities])

  const filteredEntities = useMemo(() => sortedEntities.filter((entity: any) => {
    if (quickFilters.status.length && !quickFilters.status.includes(entity.status)) return false
    if (quickFilters.type.length && !quickFilters.type.includes(entity.type)) return false
    if (quickFilters.environment.length && !quickFilters.environment.includes(entity.environment)) return false
    if (quickFilters.owner.length && !quickFilters.owner.includes(entity.internal_owner)) return false
    return true
  }), [sortedEntities, quickFilters])

  const filteredLinks: any[] = []

  const getEntityGroupValue = (item: any, field: string) => {
    if (field === 'owner') return item.internal_owner || 'Unassigned'
    return item[field] || 'Unspecified'
  }

  const groupedSections = useMemo(() => {
    if (groupBy === 'raw') return []
    const sections = filteredEntities.reduce((acc: Array<{ key: string; label: string; items: any[] }>, item: any) => {
      const val = getEntityGroupValue(item, groupBy)
      const label = String(val)
      const existing = acc.find((section) => section.key === label)
      if (existing) {
        existing.items.push(item)
      } else {
        acc.push({ key: label, label, items: [item] })
      }
      return acc
    }, [])
    return sections.sort((a, b) => a.label.localeCompare(b.label))
  }, [filteredEntities, groupBy])

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

  useEffect(() => {
    const intelligenceColumnIds = ['recent_change', 'watch']
    setHiddenColumns((current) => {
      if (isIntelligenceExpanded) {
        return current.filter((columnId) => !intelligenceColumnIds.includes(columnId))
      }
      const next = [...current]
      intelligenceColumnIds.forEach((columnId) => {
        if (!next.includes(columnId)) next.push(columnId)
      })
      return next
    })
  }, [isIntelligenceExpanded])

  const isRecentChange = useCallback((item: any) => {
    const changedAt = item?.updated_at || item?.created_at
    if (!changedAt || !lastVisitedAt) return false
    const time = parseAppDate(changedAt)?.getTime() || 0
    return time > lastVisitedAt
  }, [lastVisitedAt])

  // Persist last visited timestamp on unmount
  useEffect(() => {
    return () => {
      try { window.localStorage.setItem(externalLastVisitedKey, String(Date.now())) } catch {}
    }
  }, [externalLastVisitedKey])

  const normalizedSavedViews = useMemo(() => normalizeExternalSavedViews(savedViews), [savedViews])

  const currentWorkspaceConfig = useMemo(() => sanitizeExternalViewConfig({
    fontSize,
    rowDensity,
    hiddenColumns,
    groupBy,
    activeTab,
    searchTerm,
    columnLayoutState,
    filterModel: gridFilterModel,
    sortModel: gridSortModel,
  }), [fontSize, rowDensity, hiddenColumns, groupBy, activeTab, searchTerm, columnLayoutState, gridFilterModel, gridSortModel])

  useEffect(() => {
    setPersistedUiState(currentWorkspaceConfig)
  }, [currentWorkspaceConfig, setPersistedUiState])

  const applyGridState = (config: any) => {
    const api = gridRef.current?.api
    if (!api) return
    applyColumnLayoutState(api, config.columnLayoutState, true)
    api.setFilterModel(config.filterModel || {})
    api.applyColumnState({
      state: (config.sortModel || []).map((entry: any) => ({ colId: entry.colId, sort: entry.sort as 'asc' | 'desc' })),
      defaultState: { sort: null },
      applyOrder: false,
    })
  }

  const applyWorkspaceConfig = (config: any, nextActiveViewId: string | null) => {
    const sanitized = sanitizeExternalViewConfig(config)
    setActiveViewId(nextActiveViewId)
    setFontSize(sanitized.fontSize)
    setRowDensity(sanitized.rowDensity)
    setHiddenColumns(sanitized.hiddenColumns)
    setActiveTab(sanitized.activeTab)
    setSearchTerm(sanitized.searchTerm)
    setGridFilterModel(sanitized.filterModel)
    setGridSortModel(sanitized.sortModel)
    setColumnLayoutState(sanitized.columnLayoutState)
    setGroupBy(sanitized.groupBy || 'raw')
    setPendingGridRestore(sanitized)
    setSelectedIds([])
  }

  const applySystemDefault = () => {
    applyWorkspaceConfig(normalizeExternalWorkspaceState(null), null)
    setGroupBy('raw')
    setShowViewsMenu(false)
  }

  const createViewFromCurrent = () => {
    const trimmedName = newViewName.trim()
    if (!trimmedName) {
      toast.error('Name the view before saving it')
      return
    }
    const nextView = {
      id: `external-${Date.now()}`,
      name: trimmedName,
      config: currentWorkspaceConfig,
    }
    setSavedViews([...normalizedSavedViews, nextView])
    setActiveViewId(nextView.id)
    setNewViewName('')
    setShowViewsMenu(false)
    toast.success('External workspace view saved')
  }

  const saveCurrentToView = (viewId: string) => {
    setSavedViews(normalizedSavedViews.map((view: any) => (
      view.id === viewId
        ? { ...view, config: currentWorkspaceConfig }
        : view
    )))
    setActiveViewId(viewId)
    toast.success('External workspace view updated')
  }

  const deleteView = (viewId: string) => {
    setSavedViews(normalizedSavedViews.filter((view: any) => view.id !== viewId))
    if (activeViewId === viewId) setActiveViewId(null)
    setShowViewsMenu(false)
    toast.success('External workspace view removed')
  }

  const applySavedView = (viewId: string) => {
    const view = normalizedSavedViews.find((entry: any) => entry.id === viewId)
    if (!view) return
    applyWorkspaceConfig(view.config, view.id)
    setShowViewsMenu(false)
  }

  useEffect(() => {
    const api = gridRef.current?.api
    if (!api) return
    if (pendingGridRestore) {
      window.setTimeout(() => {
        applyGridState(pendingGridRestore)
        setPendingGridRestore(null)
      }, 0)
      return
    }
    if (!preserveExplicitColumnWidths) {
      autoSizeOperationalColumns({
        api,
        skipColumnIds: Array.from(EXTERNAL_FIXED_WIDTH_COLUMN_IDS),
      })
    }
  }, [fontSize, rowDensity, entities, links, activeTab, pendingGridRestore, preserveExplicitColumnWidths, columnLayoutState])

  const handleExportCSV = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `SysGrid_External_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`,
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
          .then(() => toast.success("Data copied to secure clipboard"))
          .catch(() => toast.error("Clipboard authorization failed"))
      }
    }
  }

  const toggleFavorite = useCallback((entityId: number) => {
    const id = Number(entityId)
    setFavoriteIds((current) => current.includes(id) ? current.filter((i) => i !== id) : [...current, id])
  }, [setFavoriteIds])

  const toggleWatch = useCallback((entityId: number) => {
    const id = Number(entityId)
    setWatchIds((current) => current.includes(id) ? current.filter((i) => i !== id) : [...current, id])
  }, [setWatchIds])

  const openCompare = () => {
    if (selectedIds.length < 2 || selectedIds.length > 5) return
    setCompareOpen(true)
  }

  const toggleBulkWindow = () => {
    setShowBulkMenu((current) => {
      return !current
    })
  }

  const bulkMutation = useMutation({
    mutationFn: async ({ action, payload = {}, ids: overrideIds }: any) => {
      const idsToUse = overrideIds ?? selectedIds
      const promises = idsToUse.map(async (id: number) => {
        if (action === 'update') {
          const original = allEntities.find((e: any) => e.id === id)
          if (!original) return
          const updatePayload = {
            ...original,
            ...payload
          }
          delete updatePayload.id
          delete updatePayload.created_at
          delete updatePayload.updated_at
          delete updatePayload.created_by_user_id
          delete updatePayload.secrets
          delete updatePayload.internal_team_name
          delete updatePayload.internal_operator_name
          delete updatePayload.internal_operator_external_id

          const res = await apiFetch(`/api/v1/intelligence/entities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatePayload)
          })
          if (!res.ok) throw new Error(await res.text())
        } else if (action === 'delete') {
          const res = await apiFetch(`/api/v1/intelligence/entities/${id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error(await res.text())
        } else if (action === 'purge') {
          const res = await apiFetch(`/api/v1/intelligence/entities/${id}?purge=true`, { method: 'DELETE' })
          if (!res.ok) throw new Error(await res.text())
        } else if (action === 'restore') {
          const res = await apiFetch(`/api/v1/intelligence/entities/${id}/restore`, { method: 'POST' })
          if (!res.ok) throw new Error(await res.text())
        }
      })
      await Promise.all(promises)
      return { action, idsToUse }
    },
    onSuccess: ({ action, idsToUse }) => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      queryClient.invalidateQueries({ queryKey: ['external-links'] })
      setSelectedIds([])
      setShowBulkMenu(false)
      setBulkDraft({ status: '', environment: '', criticality: '', risk_rating: '' })
      setExpandedBulkSection(null)
      toast.success(`Bulk ${action} succeeded on ${idsToUse.length} items.`)
    },
    onError: (e: any) => {
      toast.error(`Bulk operation failed: ${e.message}`)
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/intelligence/entities/${data.id}` : `/api/v1/intelligence/entities`
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      toast.success('External Manifest Synchronized')
      setActiveModal(null)
    },
    onError: (e: any) => toast.error(e.message)
  })

  const linkMutation = useMutation({
    mutationFn: async (data: any) => {
      return (await apiFetch('/api/v1/intelligence/links', { method: 'POST', body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-links'] })
      toast.success('Interconnect Established')
      setShowLinkModal(false)
      setLinkSeedEntityId(null)
    },
    onError: (e: any) => toast.error(e.message || 'Interconnect establishment failed')
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ id, purge, type }: { id: number, purge: boolean, type: 'entity' | 'link' }) => {
      const url = type === 'entity' ? `/api/v1/intelligence/entities/${id}${purge ? '?purge=true' : ''}` : `/api/v1/intelligence/links/${id}`
      const res = await apiFetch(url, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (_, variables) => {
      if (variables.type === 'entity') {
         queryClient.invalidateQueries({ queryKey: ['external-entities'] })
         toast.success(variables.purge ? 'Entity Purged from Global Registry' : 'Entity Moved to Deleted Matrix')
      } else {
         queryClient.invalidateQueries({ queryKey: ['external-links'] })
         toast.success('Link Severed')
      }
      setConfirmModal({ isOpen: false, id: null, purge: false, type: 'entity' })
    },
    onError: (e: any) => toast.error(e.message)
  })

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/intelligence/entities/${id}/restore`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      toast.success('Entity Restored to Active Registry')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const handleExternalRowClick = useCallback((event: any) => {
    if (!event?.node || !event?.data) return
    const target = event.event?.target as HTMLElement | null
    if (target?.closest('button') || target?.closest('a') || target?.closest('input') || target?.closest('.ag-selection-checkbox') || target?.closest('.ag-checkbox-input-wrapper')) return
    const mouseEvent = event.event as MouseEvent | undefined
    const isToggleSelection = Boolean(mouseEvent?.metaKey || mouseEvent?.ctrlKey)
    if (isToggleSelection) {
      event.node.setSelected(!event.node.isSelected())
    } else {
      event.api.deselectAll()
      event.node.setSelected(true)
    }
  }, [])

  const handleExternalSelectionChanged = useCallback((e: any) => {
    const selectedNodes = e?.api?.getSelectedNodes?.() || []
    setSelectedIds(selectedNodes.map((n: any) => n.data?.id).filter(Boolean))
  }, [])

  const getRowClass = useCallback((params: any) => {
    return params.node.rowIndex % 2 === 0 ? 'monitoring-grid-row-even' : 'monitoring-grid-row-odd'
  }, [])

  const openRowActionMenuAtPoint = useCallback((item: any, x: number, y: number) => {
    const vW = window.innerWidth
    const vH = window.innerHeight
    const width = 280
    const height = 360
    const edge = 16
    let left = x
    let top = y + 4
    if (left + width > vW - edge) left = x - width
    if (top + height > vH - edge) top = y - height - 4
    left = Math.max(edge, Math.min(left, vW - width - edge))
    top = Math.max(edge, Math.min(top, vH - height - edge))
    setRowActionMenu({ item, style: { position: 'fixed', top, left, width, zIndex: 1115 } })
  }, [])

  const handleCellContextMenu = useCallback((e: any) => {
    if (!e?.data) return
    const mouseEvent = e.event as MouseEvent
    mouseEvent?.preventDefault?.()
    openRowActionMenuAtPoint(e.data, mouseEvent.clientX, mouseEvent.clientY)
  }, [openRowActionMenuAtPoint])

  const handleExternalRowDoubleClick = (event: any) => {
    if (!event?.data) return
    const target = event.event?.target as HTMLElement | null
    if (target?.closest('button') || target?.closest('a') || target?.closest('input')) return
    setActiveDetails(event.data)
  }

  const getExternalRowId = (params: any) => String(params.data?.id ?? '')

  const renderPrimaryRowActions = (item: any) => (
    <div className="flex items-center justify-end gap-1.5 pr-2">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setActiveDetails(item)
        }}
        title="Open details"
        className="rounded-lg p-1 text-blue-400 transition-all hover:bg-blue-400/10 active:scale-90"
      >
        <Maximize2 size={13} />
      </button>
      {activeTab === 'active' && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setActiveModal(item)
          }}
          title="Edit configuration"
          className="rounded-lg p-1 text-emerald-400 transition-all hover:bg-emerald-400/10 active:scale-90"
        >
          <Edit2 size={13} />
        </button>
      )}
      {activeTab !== 'deleted' && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setConfirmModal({ isOpen: true, id: item.id, purge: false, type: 'entity' })
          }}
          title="Deactivate external"
          className="rounded-lg p-1 text-rose-400 transition-all hover:bg-rose-400/10 active:scale-90"
        >
          <Trash2 size={13} />
        </button>
      )}
      {activeTab === 'deleted' && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              restoreMutation.mutate(item.id)
            }}
            title="Restore external"
            className="rounded-lg p-1 text-emerald-400 transition-all hover:bg-emerald-400/10 active:scale-90"
          >
            <RefreshCcw size={13} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setConfirmModal({ isOpen: true, id: item.id, purge: true, type: 'entity' })
            }}
            title="Purge external"
            className="rounded-lg p-1 text-rose-400 transition-all hover:bg-rose-400/10 active:scale-90"
          >
            <Trash2 size={13} />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={(event: any) => {
          event.stopPropagation()
          openRowActionMenuAtPoint(item, event.clientX, event.clientY)
        }}
        title="More actions"
        className="row-action-trigger row-action-menu-container rounded-lg p-1 text-slate-400 transition-all hover:bg-slate-400/10 hover:text-white active:scale-90"
      >
        <MoreVertical size={13} />
      </button>
    </div>
  )

  const columnDefs = useMemo(() => {
    const layoutById = new Map(columnLayoutState.map((column: any) => [column.colId, column]))
    const lockFixedUtilityWidth = (column: any, layout?: any) => {
      const colId = column.colId || column.field
      const lockedWidth = layout?.width ?? column.width ?? column.initialWidth
      if (!EXTERNAL_FIXED_WIDTH_COLUMN_IDS.has(colId) || lockedWidth == null) return column
      return {
        ...column,
        width: lockedWidth,
        initialWidth: lockedWidth,
        minWidth: lockedWidth,
        maxWidth: lockedWidth,
        flex: undefined,
        initialFlex: undefined,
      }
    }

    const baseColumns = [
    { 
      colId: "select",
      headerName: "", 
      width: 48,
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: 'left', 
      cellClass: 'flex items-center justify-center', 
      headerClass: 'flex items-center justify-center', 
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
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      lockVisible: true
    },
    ...(activeTab !== 'links' ? [
    {
      colId: "recent_change",
      headerName: "Chg",
      field: "recent_change",
      width: 80,
      pinned: 'left',
      sortable: false,
      filter: false,
      lockVisible: true,
      cellClass: 'text-center flex items-center justify-center !overflow-visible',
      headerClass: 'text-center',
      hide: !isIntelligenceExpanded,
      cellRenderer: (p: any) => {
        if (!p.data || !isRecentChange(p.data)) return null
        const dateStr = formatAppDate(p.data.updated_at || p.data.created_at)
        const author = p.data.created_by_user_id || 'System'
        return (
          <div className="group relative flex items-center justify-center h-full w-full">
            <div className="absolute h-10 w-10 rounded-lg bg-[radial-gradient(circle,_rgba(251,191,36,0.2)_0%,_transparent_70%)] blur-md animate-pulse" />
            <span className="relative z-[1] block h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
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
      cellClass: 'text-center flex items-center justify-center',
      headerClass: 'text-center',
      valueGetter: (p: any) => p.context?.favoriteIds?.includes(p.data?.id) ? 1 : 0,
      cellRenderer: (p: any) => {
        const isFavorite = p.context?.favoriteIds?.includes(p.data?.id)
        return (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(p.data.id)
              }}
              title={isFavorite ? 'Unpin peer' : 'Pin peer'}
              className={`rounded-lg p-1 transition-all flex items-center justify-center ${isFavorite ? 'text-amber-300' : 'text-slate-600 hover:text-slate-300'}`}
            >
              <Star size={15} className={isFavorite ? 'fill-current' : ''} />
            </button>
          </div>
        )
      },
      sortable: true,
      filter: false,
      lockVisible: true
    },
    { 
      colId: "watch",
      headerName: "Watch",
      field: "watch",
      width: 85,
      pinned: 'left',
      cellClass: 'text-center flex items-center justify-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const isWatched = p.context?.watchIds?.includes(p.data?.id)
        return (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleWatch(p.data.id)
              }}
              title={isWatched ? 'Unfollow peer' : 'Follow peer'}
              className={`rounded-lg p-1 transition-all flex items-center justify-center ${isWatched ? 'text-sky-300' : 'text-slate-600 hover:text-slate-300'}`}
            >
              <Eye size={15} className={isWatched ? 'fill-current' : ''} />
            </button>
          </div>
        )
      },
      sortable: false,
      filter: false,
      hide: !isIntelligenceExpanded
    }
    ] : []),
    { 
      colId: activeTab === 'links' ? "external_entity_name" : "name",
      field: activeTab === 'links' ? "external_entity_name" : "name", 
      headerName: activeTab === 'links' ? "External Peer" : "Name", 
      pinned: 'left',
      width: 200,
      filter: true,
      cellClass: 'font-bold text-left flex items-center',
      headerClass: 'text-left',
      cellRenderer: (p: any) => (
        activeTab === 'links' ? (
          <span style={{ fontSize: `${fontSize}px` }} className="font-bold text-slate-200">{p.value}</span>
        ) : (
          <button
            type="button"
            title="View Details"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              setActiveDetails(p.data)
            }}
            className="w-full truncate bg-transparent text-left font-bold text-blue-400 uppercase tracking-tight transition-colors hover:text-blue-200"
            style={{ fontSize: `${fontSize}px` }}
          >
            {p.value}
          </button>
        )
      ),
      hide: hiddenColumns.includes("name")
    },
    ...(activeTab === 'links' ? [
      {
        colId: "direction",
        field: "direction",
         headerName: "Flow", 
         width: 120, 
         cellClass: "text-center flex items-center justify-center",
         headerClass: "text-center",
         cellRenderer: (p: any) => (
           <div className="flex items-center justify-center h-full">
             <div style={{ fontSize: `${fontSize}px` }} className={`px-2 py-0.5 rounded-lg font-bold uppercase inline-block border ${p.value === 'Inbound' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : p.value === 'Bidirectional' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
               {p.value}
             </div>
           </div>
         ),
         hide: hiddenColumns.includes("direction")
      },
      {
        colId: "device_name",
        field: "device_name",
         headerName: "Internal Asset", 
         width: 160, 
         cellClass: "font-bold text-center flex items-center justify-center", 
         headerClass: 'text-center', 
         cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || 'N/A'}</span>,
         hide: hiddenColumns.includes("device_name")
      },
      {
        colId: "service_name",
        field: "service_name",
         headerName: "Logical Service", 
         width: 160, 
         cellClass: "text-center text-slate-400 font-bold flex items-center justify-center", 
         headerClass: 'text-center', 
         cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || 'N/A'}</span>,
         hide: hiddenColumns.includes("service_name")
      },
      {
        colId: "purpose",
        field: "purpose",
         headerName: "Interconnect Purpose", 
         flex: 1.5, 
         headerClass: 'text-left', 
         cellClass: 'font-bold text-slate-500 text-left truncate px-4 flex items-center', 
         cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || 'N/A'}</span>,
         hide: hiddenColumns.includes("purpose")
      },
      { colId: "protocol", field: "protocol", headerName: "Prot", width: 80, cellClass: "text-center font-mono font-bold uppercase flex items-center justify-center", headerClass: 'text-center', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>, hide: hiddenColumns.includes("protocol") },
      { colId: "port", field: "port", headerName: "Port", width: 80, cellClass: "text-center font-mono font-bold uppercase flex items-center justify-center", headerClass: 'text-center', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>, hide: hiddenColumns.includes("port") },
    ] : [
      { 
        colId: "type",
        field: "type", 
         headerName: "Type", 
         width: 140, 
         filter: true,
         cellClass: 'text-center flex items-center justify-center', 
         headerClass: 'text-center',
         cellRenderer: (p: any) => {
           const colors: any = {
             'Equipment': 'text-indigo-400',
             'Physical Server': 'text-blue-400',
             'Virtual Server': 'text-sky-400',
             'Switch': 'text-rose-400',
             'Storage': 'text-amber-400',
             'DB': 'text-emerald-400',
             'API': 'text-fuchsia-400',
             'Script': 'text-orange-400'
           }
           return <span style={{ fontSize: `${fontSize}px` }} className={`font-bold uppercase ${colors[p.value] || 'text-slate-500'}`}>{p.value || 'N/A'}</span>
         },
         hide: hiddenColumns.includes("type")
       },
      { 
        colId: "internal_owner",
        field: "internal_owner", 
         headerName: "Owner", 
         width: 140, 
         filter: true,
         cellClass: 'text-center font-bold text-slate-400 flex items-center justify-center', 
         headerClass: 'text-center', 
         cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold">N/A</span>, 
         hide: hiddenColumns.includes("internal_owner") 
       },
      { 
        colId: "status",
        field: "status", 
         headerName: "Status", 
         width: 130, 
         filter: true,
         cellClass: 'text-center flex items-center justify-center',
         headerClass: 'text-center',
         cellRenderer: (p: any) => {
           const colors: any = {
             Active: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20',
             Maintenance: 'text-amber-400 border-amber-500/40 bg-amber-500/20',
             Decommissioned: 'text-rose-400 border-rose-500/40 bg-rose-500/20',
             Planned: 'text-blue-400 border-blue-500/40 bg-blue-500/20',
             Standby: 'text-sky-400 border-sky-500/40 bg-sky-500/20',
             Failed: 'text-rose-500 border-rose-600/40 bg-rose-600/20',
             Provisioning: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/20',
             Reserved: 'text-purple-400 border-purple-500/40 bg-purple-500/20'
           }
           return (
             <div className="flex items-center justify-center h-full w-full">
               <div className={`flex items-center justify-center px-3 h-5 rounded-lg border shadow-sm ${colors[p.value] || 'text-slate-400 border-white/10 bg-white/5'}`}>
                 <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase tracking-tighter leading-none">
                   {p.value || 'Planned'}
                 </span>
               </div>
             </div>
           )
         },
         hide: hiddenColumns.includes("status")
       },
      { 
        colId: "environment",
        field: "environment", 
         headerName: "Env", 
         width: 110, 
         filter: true,
         cellClass: 'text-center font-bold text-slate-400 uppercase flex items-center justify-center', 
         headerClass: 'text-center',
         cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
         hide: hiddenColumns.includes("environment")
       },
      {
        colId: "link_count",
        field: "link_count",
         headerName: "Links",
         width: 85,
         cellClass: 'text-center font-bold text-blue-400 flex items-center justify-center',
         headerClass: 'text-center',
         hide: hiddenColumns.includes("link_count")
       },
    ]),
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

    return baseColumns.map((column: any) => {
      const colId = column.colId || column.field
      const layout = layoutById.get(colId)
      return lockFixedUtilityWidth(applyOperationalColumnSizing(column, layout, preserveExplicitColumnWidths), layout)
    })
  }, [fontSize, hiddenColumns, activeTab, columnLayoutState, isRecentChange, preserveExplicitColumnWidths]) as any

  const autoSizeStrategy = OPERATIONAL_GRID_AUTO_SIZE_STRATEGY
  const gridContext = useMemo(() => ({ activeTab, favoriteIds, watchIds }), [activeTab, favoriteIds, watchIds])

  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.refreshCells({ columns: ['favorite', 'watch'], force: true })
    }
  }, [favoriteIds, watchIds])

  return (
    <OperationalWorkspaceShell
      header={{
        eyebrow: 'External Intelligence',
        title: (
          <div className="flex items-center gap-3">
            <Globe className="text-blue-500" />
            <span>{externalViewLabel}</span>
          </div>
        ),
        subtitle: `${externalRegistryLabel} and dependency intelligence`,
        actions: (
          <HeaderScopeSwitch
            label="Registry Scope"
            summary={`${registryCounts.active} active · ${registryCounts.archived} archived`}
            value={activeTab}
            onChange={(value) => {
              setActiveTab(value as 'active' | 'deleted')
              setSelectedIds([])
            }}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Archived', value: 'deleted' }
            ]}
          />
        ),
      }}
      toolbarSearch={(
        <ToolbarSearch
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Scan registry..."
        />
      )}
      toolbarControls={(
        <>
          <ToolbarGroup>
            <div className="views-menu-container">
              <ToolbarButton active={showViewsMenu} onClick={() => setShowViewsMenu((current) => !current)} ref={viewsMenuButtonRef as any}>
                <span className="flex items-center gap-2">
                  <LayoutGrid size={14} />
                  Views
                </span>
              </ToolbarButton>
            </div>
            <div className="display-menu-container">
              <ToolbarButton active={showDisplayMenu} onClick={() => setShowDisplayMenu((current) => !current)} ref={displayMenuButtonRef as any}>
                <span className="flex items-center gap-2">
                  <Sliders size={14} />
                  Display
                </span>
              </ToolbarButton>
            </div>
            <ToolbarIconButton onClick={handleExportCSV} title="Export Manifest">
              <FileText size={16} />
            </ToolbarIconButton>
            <ToolbarIconButton onClick={handleCopyToClipboard} title="Secure Copy">
              <Clipboard size={16} />
            </ToolbarIconButton>
            <ToolbarIconButton onClick={() => setShowConfig(true)} title="Registry Config">
              <Settings size={16} />
            </ToolbarIconButton>
          </ToolbarGroup>
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => setShowImportModal(true)}
              title="Import external registry rows"
            >
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
              onClick={() => setIsIntelligenceExpanded((current) => !current)}
              title={isIntelligenceExpanded ? 'Collapse activity columns' : 'Expand activity columns'}
            >
              <span className="flex items-center gap-2">
                {isIntelligenceExpanded ? <Minimize2 size={14} /> : <Activity size={14} />}
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
            onChange={(value) => setQuickFilters((current) => ({ ...current, status: value }))}
            options={entityFilterOptions.status}
            label="Status Filter"
            placeholder="All statuses"
          />
          <AppDropdown
            multi
            value={quickFilters.type}
            onChange={(value) => setQuickFilters((current) => ({ ...current, type: value }))}
            options={entityFilterOptions.type}
            label="Type Filter"
            placeholder="All types"
          />
          <AppDropdown
            multi
            value={quickFilters.environment}
            onChange={(value) => setQuickFilters((current) => ({ ...current, environment: value }))}
            options={entityFilterOptions.environment}
            label="Environment Filter"
            placeholder="All environments"
          />
          <AppDropdown
            multi
            value={quickFilters.owner}
            onChange={(value) => setQuickFilters((current) => ({ ...current, owner: value }))}
            options={entityFilterOptions.owner}
            label="Owner Filter"
            placeholder="All owners"
          />
        </div>
      ) : null}
      toolbarActions={(
        <>
          {EXTERNAL_SUPPORTS_COMPARE && (
            <ToolbarButton
              onClick={openCompare}
              disabled={selectedIds.length < 2 || selectedIds.length > 5}
              active={compareOpen}
              title="Compare selected peers"
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
            onClick={() => setActiveModal({})}
            variant="primary"
            className="px-6 py-2"
          >
            + Add {externalViewLabel}
          </ToolbarButton>
        </>
      )}
      filterChips={[
          ...(searchTerm ? [{
            id: 'search',
            label: `Search: ${searchTerm}`,
            onRemove: () => setSearchTerm(''),
          }] : []),
          ...Object.entries({
                status: quickFilters.status,
                type: quickFilters.type,
                environment: quickFilters.environment,
                owner: quickFilters.owner,
              }).flatMap(([key, values]) => values.map((value) => ({
                id: `${key}-${value}`,
                label: `${key}: ${value}`,
                onRemove: () => setQuickFilters((current) => ({
                  ...current,
                  [key]: (current as any)[key].filter((entry: string) => entry !== value),
                })),
              }))),
          ...(searchTerm || Object.values(quickFilters).some(v => v.length)
            ? [{
                id: 'clear-all',
                label: 'Clear All',
                onRemove: () => {
                  setSearchTerm('')
                  setGridFilterModel({})
                  setQuickFilters({
                    status: [],
                    type: [],
                    environment: [],
                    owner: [],
                    direction: [],
                    protocol: [],
                  })
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
            panelRef={displayMenuPanelRef}
            onClose={() => setShowDisplayMenu(false)}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            rowDensity={rowDensity}
            onRowDensityChange={setRowDensity}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOptions={EXTERNAL_DEFAULT_GROUP_OPTIONS}
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
            panelRef={viewsMenuPanelRef}
            entityLabel={externalViewLabel}
            onClose={() => setShowViewsMenu(false)}
            activeViewId={activeViewId}
            currentViewName={activeViewId ? normalizedSavedViews.find((view: any) => view.id === activeViewId)?.name || 'Unsaved working view' : 'Unsaved working view'}
            newViewName={newViewName}
            onNewViewNameChange={setNewViewName}
            onCreateView={createViewFromCurrent}
            onApplySystemDefault={applySystemDefault}
            savedViews={normalizedSavedViews}
            defaultViewIds={new Set<string>()}
            onApplyView={applySavedView}
            onOverwriteView={saveCurrentToView}
            onDeleteView={deleteView}
            describeView={(view: any) => {
              const tabLabel = view.config?.activeTab === 'deleted' ? 'Archive' : 'Registry'
              const groupLabel = view.config?.groupBy && view.config.groupBy !== 'raw'
                ? `Grouped by ${EXTERNAL_DEFAULT_GROUP_OPTIONS.find((o) => o.value === view.config.groupBy)?.label || view.config.groupBy}`
                : 'Raw Table'
              return `${tabLabel} · ${groupLabel} · ${view.config?.searchTerm ? 'Scoped search' : 'Full workspace'}`
            }}
          />

          <OperationalAnchoredPanel
            isOpen={showBulkMenu}
            panelKey="bulk-menu"
            style={bulkMenuStyle}
            className="bulk-menu-container"
            panelRef={bulkMenuPanelRef}
            yOffset={10}
          >
            <WorkspaceFloatingPanel kind="context" className="max-h-[560px] overflow-y-auto custom-scrollbar p-3">
                  <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                    <p className="text-[10px] font-semibold text-slate-400">Bulk actions</p>
                    <p className="pt-1 text-[12px] font-semibold text-slate-100">{selectedIds.length} peers selected</p>
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
                      <WorkspaceFlyoutActionCard
                        title="Set Status"
                        active={expandedBulkSection === 'status'}
                        onClick={() => setExpandedBulkSection(expandedBulkSection === 'status' ? null : 'status')}
                      />
                      {expandedBulkSection === 'status' && (
                        <WorkspaceFlyoutDropdownEditor
                          value={bulkDraft.status}
                          onChange={(value) => setBulkDraft((current) => ({ ...current, status: value }))}
                          options={entityFilterOptions.status}
                          placeholder="Choose status"
                          actionLabel="Apply Status"
                          onApply={() => bulkMutation.mutate({ action: 'update', payload: { status: bulkDraft.status } })}
                          disabled={!bulkDraft.status || bulkMutation.isPending}
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
                          options={entityFilterOptions.environment}
                          placeholder="Choose environment"
                          actionLabel="Apply Environment"
                          onApply={() => bulkMutation.mutate({ action: 'update', payload: { environment: bulkDraft.environment } })}
                          disabled={!bulkDraft.environment || bulkMutation.isPending}
                        />
                      )}

                      <WorkspaceFlyoutActionCard
                        title="Set Criticality"
                        active={expandedBulkSection === 'criticality'}
                        onClick={() => setExpandedBulkSection(expandedBulkSection === 'criticality' ? null : 'criticality')}
                      />
                      {expandedBulkSection === 'criticality' && (
                        <WorkspaceFlyoutDropdownEditor
                          value={bulkDraft.criticality}
                          onChange={(value) => setBulkDraft((current) => ({ ...current, criticality: value }))}
                          options={[
                            { value: 'Low', label: 'Low' },
                            { value: 'Medium', label: 'Medium' },
                            { value: 'High', label: 'High' },
                            { value: 'Critical', label: 'Critical' },
                          ]}
                          placeholder="Choose criticality"
                          actionLabel="Apply Criticality"
                          onApply={() => bulkMutation.mutate({ action: 'update', payload: { criticality: bulkDraft.criticality } })}
                          disabled={!bulkDraft.criticality || bulkMutation.isPending}
                        />
                      )}

                      <WorkspaceFlyoutActionCard
                        title="Set Risk Rating"
                        active={expandedBulkSection === 'risk_rating'}
                        onClick={() => setExpandedBulkSection(expandedBulkSection === 'risk_rating' ? null : 'risk_rating')}
                      />
                      {expandedBulkSection === 'risk_rating' && (
                        <WorkspaceFlyoutDropdownEditor
                          value={bulkDraft.risk_rating}
                          onChange={(value) => setBulkDraft((current) => ({ ...current, risk_rating: value }))}
                          options={[
                            { value: 'Low', label: 'Low' },
                            { value: 'Medium', label: 'Medium' },
                            { value: 'High', label: 'High' },
                          ]}
                          placeholder="Choose risk rating"
                          actionLabel="Apply Risk Rating"
                          onApply={() => bulkMutation.mutate({ action: 'update', payload: { risk_rating: bulkDraft.risk_rating } })}
                          disabled={!bulkDraft.risk_rating || bulkMutation.isPending}
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
                          ? (activeTab === 'deleted' ? 'Confirm Permanent Purge?' : 'Confirm Deactivation?') 
                          : (activeTab === 'deleted' ? 'Purge Selection' : 'Deactivate Selection')
                      )}
                    </p>
                  </button>
            </WorkspaceFloatingPanel>
          </OperationalAnchoredPanel>

          <OperationalAnchoredPanel
            isOpen={!!rowActionMenu}
            panelKey="row-action-menu"
            style={rowActionMenu?.style ?? { position: 'fixed', top: -9999, left: -9999 }}
            className="row-action-menu-container"
          >
            {rowActionMenu ? (
              <WorkspaceFloatingPanel kind="context" className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold text-slate-400">Row actions</p>
                    <p className="pt-1 text-[11px] font-semibold text-slate-100">ID {rowActionMenu.item.id} · {rowActionMenu.item.name}</p>
                    <p className="truncate pt-1 text-[12px] text-slate-300">
                      {rowActionMenu.item.type || 'External Peer'}
                    </p>
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
                  <div className="grid grid-cols-2 gap-2 px-2 pb-3 border-b border-slate-800 mb-2">
                    <button
                      onClick={() => {
                        setActiveDetails(rowActionMenu.item)
                        setRowActionMenu(null)
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-blue-400 transition-all hover:border-blue-500/30 hover:bg-blue-600/10 active:scale-95"
                    >
                      <Maximize2 size={14} />
                      Details
                    </button>
                    {activeTab === 'active' && (
                      <button
                        onClick={() => {
                          setActiveModal(rowActionMenu.item)
                          setRowActionMenu(null)
                        }}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-600/10 active:scale-95"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="px-3 py-1">
                    <p className="text-[10px] font-semibold text-slate-400">Follow options</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-2 pb-1">
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
                        restoreMutation.mutate(rowActionMenu.item.id)
                        setRowActionMenu(null)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 transition-all hover:bg-emerald-950/80"
                    >
                      <Undo2 size={14} />
                      Restore Entity
                    </button>
                  )}

                  {activeTab !== 'deleted' && (
                    <button
                      onClick={() => {
                        const item = rowActionMenu.item
                        setConfirmModal({ 
                          isOpen: true, 
                          id: item.id, 
                          purge: false, 
                        type: 'entity'
                        })
                        setRowActionMenu(null)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em] text-rose-300 transition-all hover:bg-rose-950/80"
                    >
                      <Trash2 size={14} />
                      Deactivate
                    </button>
                  )}

                  {activeTab === 'deleted' && (
                    <button
                      onClick={() => {
                        const item = rowActionMenu.item
                        setConfirmModal({ 
                          isOpen: true, 
                          id: item.id, 
                          purge: true, 
                          type: 'entity' 
                        })
                        setRowActionMenu(null)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em] text-rose-300 transition-all hover:bg-rose-950/80"
                    >
                      <Trash2 size={14} />
                      Purge Identity
                    </button>
                  )}
                </div>
              </WorkspaceFloatingPanel>
            ) : null}
          </OperationalAnchoredPanel>
        </>
      }
    >

      {groupBy === 'raw' ? (
        <OperationalGridSurface
          className="monitoring-grid-shell monitoring-grid"
          style={{
            '--ag-font-size': `${fontSize}px`,
            '--ag-font-family': "'Inter', sans-serif",
          } as React.CSSProperties}
          loading={isLoading || linkLoading}
          loadingIcon={<RefreshCcw size={32} className="text-blue-400 animate-spin" />}
          loadingLabel={<p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">Synchronizing Intelligence Matrix...</p>}
        >
          <OperationalGridMatrix
            gridRef={gridRef}
            rowData={filteredEntities}
            columnDefs={columnDefs as any} 
            autoSizeStrategy={autoSizeStrategy}
            colResizeDefault="normal"
            fontSize={fontSize}
            rowDensity={rowDensity}
            context={gridContext}
            quickFilterText={searchTerm}
            getRowId={getExternalRowId}
            getRowClass={getRowClass}
            onGridReady={(params) => {
              setGridApi(params.api)
              setGridColumnApi(params.columnApi)
              if (pendingGridRestore) {
                applyGridState(pendingGridRestore)
              } else if (columnLayoutState.length) {
                applyColumnLayoutState(params.api, columnLayoutState, preserveExplicitColumnWidths)
                params.api.setFilterModel(gridFilterModel)
                params.api.applyColumnState({
                  state: gridSortModel.map((entry) => ({ colId: entry.colId, sort: entry.sort as 'asc' | 'desc' })),
                  defaultState: { sort: null },
                  applyOrder: false,
                })
              }
            }}
            onSelectionChanged={handleExternalSelectionChanged}
            onColumnResized={handleColumnResized}
            onColumnMoved={(event) => syncColumnLayoutState(event.api, true)}
            onDragStopped={(event) => syncColumnLayoutState(event.api, true)}
            onColumnPinned={(event) => syncColumnLayoutState(event.api, true)}
            onColumnVisible={(event) => syncColumnLayoutState(event.api, true)}
            onFilterChanged={(event) => {
              setGridFilterModel(sanitizeOperationalFilterModel(event.api.getFilterModel(), EXTERNAL_PERSISTED_COLUMN_IDS))
            }}
            onSortChanged={(event) => {
              const nextSortModel = event.columnApi.getColumnState()
                .filter((column: any) => column.sort === 'asc' || column.sort === 'desc')
                .map((column: any) => ({ colId: column.colId, sort: column.sort }))
              setGridSortModel(sanitizeOperationalSortModel(nextSortModel, EXTERNAL_PERSISTED_COLUMN_IDS))
              syncColumnLayoutState(event.api, true)
            }}
            onRowClicked={handleExternalRowClick}
            onRowDoubleClicked={handleExternalRowDoubleClick}
            onCellContextMenu={handleCellContextMenu}
            noRowsLabel="No external registry data found"
          />
          {!isLoading && !linkLoading && !filteredEntities.length && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#020617]/40">
              <div className="w-full max-w-lg px-6">
                <WorkspaceEmptyState
                  title="No external identities found"
                  description="Adjust the current view or admit new external entities to populate the registry."
                />
              </div>
            </div>
          )}
        </OperationalGridSurface>
      ) : (
        <OperationalGroupedGridView
          summary={
            <div>
              <p className="text-[10px] font-semibold text-slate-400">Grouped registry matrix</p>
              <p className="pt-1 text-[12px] font-semibold text-slate-100">Sorted by {EXTERNAL_DEFAULT_GROUP_OPTIONS.find((option) => option.value === groupBy)?.label || groupBy}</p>
            </div>
          }
          actions={
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
          }
          sections={groupedSections.map((section) => {
            const isCollapsed = collapsedGroups[section.key]
            const selectedCount = section.items.filter((item: any) => selectedIds.includes(item.id)).length
            return (
              <OperationalGroupedGridSection
                key={section.key}
                labelMeta={<span className="text-[9px] font-semibold text-blue-400">{EXTERNAL_DEFAULT_GROUP_OPTIONS.find((option) => option.value === groupBy)?.label}</span>}
                label={section.label}
                count={section.items.length}
                countLabel="peers"
                selectedCount={selectedCount}
                collapsed={isCollapsed}
                onToggle={() => setCollapsedGroups((current) => ({ ...current, [section.key]: !current[section.key] }))}
              >
                {!isCollapsed && (
                  <OperationalGridSurface
                    className="monitoring-grid-shell monitoring-grid w-full"
                    style={{
                      '--ag-font-size': `${fontSize}px`,
                      '--ag-font-family': "'Inter', sans-serif",
                      height: `${Math.min(600, section.items.length * (fontSize + rowDensity + 5) + 40)}px`
                    } as React.CSSProperties}
                  >
                    <OperationalGridMatrix
                      rowData={section.items}
                      columnDefs={columnDefs as any}
                      autoSizeStrategy={autoSizeStrategy}
                      colResizeDefault="normal"
                      fontSize={fontSize}
                      rowDensity={rowDensity}
                      context={gridContext}
                      getRowId={getExternalRowId}
                      getRowClass={getRowClass}
                      onGridReady={(params) => {
                        if (pendingGridRestore) {
                          applyGridState(pendingGridRestore)
                        } else if (columnLayoutState.length) {
                          applyColumnLayoutState(params.api, columnLayoutState, preserveExplicitColumnWidths)
                          params.api.setFilterModel(gridFilterModel)
                          params.api.applyColumnState({
                            state: gridSortModel.map((entry) => ({ colId: entry.colId, sort: entry.sort as 'asc' | 'desc' })),
                            defaultState: { sort: null },
                            applyOrder: false,
                          })
                        }
                      }}
                      onSelectionChanged={handleExternalSelectionChanged}
                      onColumnResized={handleColumnResized}
                      onColumnMoved={(event) => syncColumnLayoutState(event.api, true)}
                      onDragStopped={(event) => syncColumnLayoutState(event.api, true)}
                      onColumnPinned={(event) => syncColumnLayoutState(event.api, true)}
                      onColumnVisible={(event) => syncColumnLayoutState(event.api, true)}
                      onFilterChanged={(event) => {
                        setGridFilterModel(sanitizeOperationalFilterModel(event.api.getFilterModel(), EXTERNAL_PERSISTED_COLUMN_IDS))
                      }}
                      onSortChanged={(event) => {
                        const nextSortModel = event.columnApi.getColumnState()
                          .filter((column: any) => column.sort === 'asc' || column.sort === 'desc')
                          .map((column: any) => ({ colId: column.colId, sort: column.sort }))
                        setGridSortModel(sanitizeOperationalSortModel(nextSortModel, EXTERNAL_PERSISTED_COLUMN_IDS))
                        syncColumnLayoutState(event.api, true)
                      }}
                      onRowClicked={handleExternalRowClick}
                      onRowDoubleClicked={handleExternalRowDoubleClick}
                      onCellContextMenu={handleCellContextMenu}
                      noRowsLabel="No external registry data found"
                    />
                  </OperationalGridSurface>
                )}
              </OperationalGroupedGridSection>
            )
          })}
        />
      )}

      <WorkspaceModal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        size="workspace"
        isMaximized={isWorkspaceMaximized}
        onMaximizeToggle={() => setIsWorkspaceMaximized((current) => !current)}
        title={activeModal?.id ? `Modify ${externalViewLabel} Identity` : `Add ${externalViewLabel} Identity`}
        subtitle={activeModal?.id ? `Updating ${activeModal.name || 'external registry record'}` : `Register ${externalViewLabel.toLowerCase()} entities, ownership, and dependency context.`}
        icon={activeModal?.id ? <Edit2 size={20} /> : <Plus size={20} />}
        status={activeModal?.id ? (
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-blue-300">
              {activeModal.type || externalViewLabel}
            </span>
            <span className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-300">
              {activeModal.environment || 'Unspecified'}
            </span>
          </div>
        ) : undefined}
        footerRight={(
          <div className="flex items-center gap-3 shrink-0">
            <ToolbarButton onClick={() => setActiveModal(null)}>Close</ToolbarButton>
            <ToolbarButton
              onClick={() => (document.getElementById('external-entity-form') as HTMLFormElement | null)?.requestSubmit()}
              disabled={mutation.isPending}
              variant="primary"
              className="px-8 whitespace-nowrap inline-flex items-center"
            >
              {mutation.isPending ? <RefreshCcw className="animate-spin mr-2" size={14} /> : <Check className="mr-2" size={14} />}
              <span>{activeModal?.id ? `Save ${externalViewLabel}` : `Add ${externalViewLabel}`}</span>
            </ToolbarButton>
          </div>
        )}
      >
        <ExternalForm
          formId="external-entity-form"
          renderActions={false}
          initialData={activeModal}
          onSave={mutation.mutate}
          isSaving={mutation.isPending}
          options={options}
          teams={teams || []}
          operators={operators || []}
        />
      </WorkspaceModal>

      {showLinkModal && (
         <LinkForm 
            entities={allEntities?.filter((e: any) => !e.is_deleted)}
            devices={devices}
            onClose={() => {
              setShowLinkModal(false)
              setLinkSeedEntityId(null)
            }}
            onSave={(data: any) => linkMutation.mutate(data)}
            isPending={linkMutation.isPending}
            initialExternalEntityId={linkSeedEntityId}
         />
      )}

      {compareOpen && (
        <CompareExternalModal
          items={allEntities?.filter((e: any) => selectedIds.includes(e.id)) || []}
          onClose={() => setCompareOpen(false)}
        />
      )}

      <WorkspaceModal
        isOpen={!!activeDetails}
        onClose={closeDetails}
        size="workspace"
        isMaximized={isWorkspaceMaximized}
        onMaximizeToggle={() => setIsWorkspaceMaximized((current) => !current)}
        title={
          <div className="flex items-center gap-3">
            <span>{activeDetails?.name || `${externalViewLabel} Details`}</span>
            {activeDetails && (
              <WorkspaceShareHeader id={String(activeDetails.id)} title={activeDetails.name} />
            )}
          </div>
        }
        subtitle={activeDetails ? `${activeDetails.type || externalViewLabel} · ${activeDetails.environment || 'Unspecified'} · ${activeDetails.owner_organization || 'Unassigned organization'}` : undefined}
        icon={<Eye size={20} />}
        status={activeDetails ? (
          <div className="flex items-center gap-2">
            <span className={`rounded-lg border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest ${
              activeDetails.status === 'Active'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
            }`}>
              {activeDetails.status || 'Unknown'}
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveModal(activeDetails)
                setActiveDetails(null)
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-emerald-300 transition-colors hover:bg-emerald-500/20"
              title="Edit external identity"
            >
              <Edit2 size={12} />
              Edit
            </button>
          </div>
        ) : undefined}
        footerRight={activeDetails ? (
          <div className="flex items-center gap-3 shrink-0">
            <ToolbarButton
              onClick={() => {
                setActiveModal(activeDetails)
                setActiveDetails(null)
              }}
            >
              Edit
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                setLinkSeedEntityId(activeDetails.id)
                setShowLinkModal(true)
              }}
            >
              Map Link
            </ToolbarButton>
            <ToolbarButton onClick={closeDetails}>Close</ToolbarButton>
          </div>
        ) : undefined}
      >
        {activeDetails ? <ExternalDetailsView entity={activeDetails} links={links || []} /> : null}
      </WorkspaceModal>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null, purge: false, type: 'entity' })}
        onConfirm={() => deleteMutation.mutate({ id: confirmModal.id, purge: confirmModal.purge, type: confirmModal.type })}
        title={confirmModal.type === 'link' ? "Sever Link" : confirmModal.purge ? "Purge External Identity" : "Sever External Manifest"}
        message={confirmModal.type === 'link' ? "Sever this interconnect link?" : confirmModal.purge 
          ? "This will IRREVOCABLY purge the identity from the global registry. Proceed with final termination?" 
          : "This will move the authorized identity to the deleted matrix. All downstream forensics will be preserved. Proceed?"}
        variant="danger"
      />
      <ConfigRegistryModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        title="External Intelligence Enumerations"
        sections={[
            { title: "Entity Types", category: "ExternalType", icon: Globe },
            { title: "Status Options", category: "Status", icon: RefreshCcw },
            { title: "Environments", category: "Environment", icon: Globe }
        ]}
      />
      <OperationalImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        tableName="external_entities"
        displayName={externalRegistryLabel}
      />

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

    </OperationalWorkspaceShell>
  )
}

function LinkForm({ entities, devices, onClose, onSave, isPending, initialExternalEntityId }: any) {
  const [formData, setFormData] = useState({
    external_entity_id: initialExternalEntityId ? String(initialExternalEntityId) : '', device_id: '', service_id: '', direction: 'Outbound', purpose: '', protocol: 'TCP', port: '',
    host_or_fqdn: '', path_or_resource: '', network_zone: '', transport_security: '', link_status: 'Active', credential_reference: '',
    credentials: { username: '', vault_path: '', note: '' }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isMaximized, setIsMaximized] = useState(false)

  const { data: services } = useQuery({
    queryKey: ['device-services', formData.device_id],
    queryFn: async () => {
      if (!formData.device_id) return []
      return (await apiFetch(`/api/v1/logical-services/?device_id=${formData.device_id}`)).json()
    },
    enabled: !!formData.device_id
  })

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized((current) => !current)}
      title="Establish External Link"
      subtitle="Map topology and credentials between the external registry and internal assets."
      icon={<LinkIcon size={20} />}
      status={(
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-indigo-300">
            Map Interconnect
          </span>
          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-emerald-300">
            Data Flow
          </span>
        </div>
      )}
      footerRight={(
        <div className="flex items-center gap-3 shrink-0">
          <ToolbarButton onClick={onClose}>Close</ToolbarButton>
          <ToolbarButton 
            onClick={() => {
              const nextErrors: Record<string, string> = {}
              if (!formData.purpose.trim()) nextErrors.purpose = 'Interconnect purpose is required'
              if (formData.port && (Number(formData.port) < 1 || Number(formData.port) > 65535)) nextErrors.port = 'Port must be between 1 and 65535'
              setErrors(nextErrors)
              if (Object.keys(nextErrors).length) return
              onSave({
                ...formData,
                external_entity_id: parseInt(formData.external_entity_id),
                device_id: parseInt(formData.device_id),
                service_id: formData.service_id ? parseInt(formData.service_id) : null,
                port: formData.port ? parseInt(formData.port, 10) : null,
                network_zone: formData.network_zone || null,
                transport_security: formData.transport_security || null,
                credential_reference: formData.credential_reference || null,
              })
            }}
            disabled={!formData.external_entity_id || !formData.device_id || isPending}
            variant="primary"
            className="px-8 whitespace-nowrap inline-flex items-center"
          >
            {isPending ? <RefreshCcw className="animate-spin mr-2" size={14} /> : <Check className="mr-2" size={14} />}
            <span>Save Link</span>
          </ToolbarButton>
        </div>
      )}
    >
      <div className="space-y-10 pt-6">
           <div className="grid grid-cols-2 gap-10">
              <div className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-lg space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em] flex items-center gap-2"><Globe size={14}/> External Peer</h3>
                 <StyledSelect 
                    label="Target External Entity"
                    value={formData.external_entity_id}
                    onChange={e => setFormData({...formData, external_entity_id: e.target.value})}
                    options={entities?.map((e: any) => ({
                      value: e.id,
                      label: `${e.name} [${e.type || 'Unknown Type'}${e.environment ? ` · ${e.environment}` : ''}]`
                    })) || []}
                    placeholder="Select Remote System..."
                 />
                 <StyledSelect 
                    label="Flow Direction"
                    value={formData.direction}
                    onChange={e => setFormData({...formData, direction: e.target.value})}
                    options={LINK_DIRECTION_OPTIONS.map((value) => ({ value, label: value }))}
                 />
              </div>

              <div className="p-8 bg-emerald-600/5 border border-emerald-500/10 rounded-lg space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] flex items-center gap-2"><Cpu size={14}/> Internal Asset</h3>
                 <StyledSelect 
                    label="Internal Registry Asset"
                    value={formData.device_id}
                    onChange={e => setFormData({...formData, device_id: e.target.value, service_id: ''})}
                    options={devices?.map((d: any) => ({ value: d.id, label: d.name })) || []}
                    placeholder="Select Internal Asset..."
                 />
                 <StyledSelect 
                    label="Logical Service (Optional)"
                    value={formData.service_id}
                    onChange={e => setFormData({...formData, service_id: e.target.value})}
                    options={services?.map((s: any) => ({ value: s.id, label: s.name })) || []}
                    placeholder={formData.device_id ? "Select Service..." : "Select Asset First..."}
                 />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-10 border-t border-white/5 pt-10">
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Link Configuration</h3>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Interconnect Purpose</label>
                    <input 
                      value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all"
                      placeholder="e.g., Daily DB Synchronization Feed"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Protocol</label>
                       <StyledSelect value={formData.protocol} onChange={e => setFormData({...formData, protocol: e.target.value})} options={LINK_PROTOCOL_OPTIONS.map((value) => ({ value, label: value }))} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Port</label>
                       <input 
                         value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-mono font-black text-indigo-300 outline-none focus:border-indigo-500 transition-all"
                         placeholder="443"
                       />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Host / FQDN</label>
                       <input value={formData.host_or_fqdn} onChange={e => setFormData({...formData, host_or_fqdn: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all" placeholder="partner.example.com" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Path / Resource</label>
                       <input value={formData.path_or_resource} onChange={e => setFormData({...formData, path_or_resource: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all" placeholder="/v1/ingest" />
                    </div>
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                    <StyledSelect label="Network Zone" value={formData.network_zone} onChange={e => setFormData({...formData, network_zone: e.target.value})} options={LINK_NETWORK_ZONE_OPTIONS.map((value) => ({ value, label: value }))} placeholder="Select zone" />
                    <StyledSelect label="Transport Security" value={formData.transport_security} onChange={e => setFormData({...formData, transport_security: e.target.value})} options={LINK_TRANSPORT_SECURITY_OPTIONS.map((value) => ({ value, label: value }))} placeholder="Select security" />
                    <StyledSelect label="Link Status" value={formData.link_status} onChange={e => setFormData({...formData, link_status: e.target.value})} options={['Active', 'Planned', 'Disabled'].map((value) => ({ value, label: value }))} />
                 </div>
                 {errors.purpose && <p className="text-[9px] font-bold text-rose-400">{errors.purpose}</p>}
                 {errors.port && <p className="text-[9px] font-bold text-rose-400">{errors.port}</p>}
              </div>

              <div className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-lg space-y-6">
                 <div className="flex items-center space-x-3 text-indigo-400 border-b border-indigo-500/10 pb-4">
                   <Key size={16} />
                   <h3 className="text-[10px] font-black uppercase tracking-widest">Connection Intelligence</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <input 
                      value={formData.credentials.username} onChange={e => setFormData({...formData, credentials: {...formData.credentials, username: e.target.value}})}
                      className="w-full bg-black/60 border border-white/5 rounded-lg px-5 py-4 text-[11px] font-black text-white outline-none focus:border-indigo-500 transition-all"
                      placeholder="Username"
                    />
                    <input value={formData.credentials.vault_path} onChange={e => setFormData({...formData, credentials: {...formData.credentials, vault_path: e.target.value}})} className="w-full bg-black/60 border border-white/5 rounded-lg px-5 py-4 text-[11px] font-black text-white outline-none focus:border-indigo-500 transition-all" placeholder="Vault path" />
                    <textarea 
                      className="col-span-2 w-full bg-black/60 border border-white/5 rounded-lg px-5 py-4 text-[10px] font-bold text-slate-400 outline-none focus:border-indigo-500 transition-all h-24 resize-none"
                      placeholder="Security notes / credential reference..."
                      value={formData.credentials.note}
                      onChange={e => setFormData({...formData, credentials: {...formData.credentials, note: e.target.value}})}
                    />
                 </div>
              </div>
           </div>
      </div>
    </WorkspaceModal>
  )
}
