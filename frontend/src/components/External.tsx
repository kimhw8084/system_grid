import { useSearchParams } from 'react-router-dom'
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Trash2, Globe, X, RefreshCcw, Search, Edit2, LayoutGrid, List, FileText, Clipboard, 
  Link as LinkIcon, Share2, ExternalLink, Shield, Server, Database, Cloud, Activity, 
  Sliders, Settings, Check, User, Mail, Phone, Tag, Info, AlertCircle, Briefcase, 
  Clock, DollarSign, Target, ChevronRight, Layers, Box, Cpu, Zap, FileJson, MoreVertical, Eye, EyeOff, Key
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiFetch } from "../api/apiClient"
import { 
  PageHeader, 
  PageToolbar, 
  ToolbarGroup, 
  ToolbarSearch, 
  ToolbarButton, 
  ToolbarIconButton, 
  ToolbarSegmented 
} from './shared/LayoutPrimitives'
import { StyledSelect } from "./shared/StyledSelect"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { ConfigRegistryModal } from "./ConfigRegistry"
import { OPERATIONAL_GRID_AUTO_SIZE_STRATEGY } from './shared/OperationalGridSizing'

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

const reservedMetadataKeys = new Set([
  'business_purpose',
])

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

const ExternalForm = ({ initialData, onSave, isSaving, options, teams, operators }: any) => {
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
  const types = ensureCurrentOption(getOptions('ExternalType'), formData.type)
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

  return (
    <div className="space-y-8 py-6">
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

      <div className="flex space-x-4 pt-4 border-t border-white/5">
        <button
          disabled={isSaving}
          onClick={() => {
            if (!validate()) return
            onSave({
              ...formData,
              internal_team_id: formData.ownership_mode === 'team' && formData.internal_team_id ? parseInt(formData.internal_team_id, 10) : null,
              internal_operator_id: formData.ownership_mode === 'individual' && formData.internal_operator_id ? parseInt(formData.internal_operator_id, 10) : null,
            })
          }}
          className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
        >
          {isSaving && <RefreshCcw size={18} className="animate-spin" />}
          <span>{initialData.id ? 'Synchronize Entity Manifest' : 'Authorize External Registry Admission'}</span>
        </button>
      </div>
    </div>
  )
}

const ExternalDetailsView = ({ entity, links }: { entity: any, links: any[] }) => {
  const [tab, setTab] = useState('overview')
  const insights = useMemo(() => getEntityInsights(entity, links), [entity, links])
  const summaryFacts = [
    ['Business purpose', entity.business_purpose || 'Not documented'],
    ['Type', entity.type || 'Unspecified'],
    ['Environment', entity.environment || 'Unspecified'],
    ['External organization', entity.owner_organization || 'Unassigned'],
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-black/40 p-1 rounded-lg w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutGrid },
            { id: 'org', label: 'Ownership & Contacts', icon: Briefcase },
            { id: 'dependencies', label: 'Dependencies', icon: Share2 },
            { id: 'secrets', label: 'Credentials', icon: Tag },
            { id: 'metadata', label: 'Extensions', icon: List },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center space-x-2 ${tab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <t.icon size={12} /> <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-lg border-white/5 overflow-hidden p-8 bg-black/20">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Linked Dependencies', value: insights.linked.length, tone: 'text-blue-400' },
                { label: 'Stored Credentials', value: entity.secrets?.length || 0, tone: 'text-emerald-400' },
                { label: 'Contacts', value: insights.contacts.length, tone: 'text-amber-400' },
                { label: 'Warnings', value: insights.warnings.length, tone: insights.warnings.length ? 'text-rose-400' : 'text-slate-400' },
              ].map(card => (
                <div key={card.label} className="bg-white/5 border border-white/5 p-5 rounded-lg space-y-2">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.tone}`}>{card.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-900/60 p-5 rounded-lg border border-white/10 space-y-4">
                <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Mission Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Business Purpose</p>
                    <p className="text-sm font-bold text-white">{entity.business_purpose || entity.description || 'Not documented'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">External Organization</p>
                    <p className="text-sm font-bold text-blue-400 break-all">{entity.owner_organization || 'Not documented'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">External Team</p>
                    <p className="text-sm font-bold text-emerald-400 break-all">{entity.owner_team || 'Not documented'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Accountable Owner</p>
                    <p className="text-sm font-bold text-white">{insights.internalOwnerLabel}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-5 rounded-lg border border-white/10 space-y-4">
                <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Registry Snapshot</h3>
                <div className="grid grid-cols-2 gap-3">
                  {summaryFacts.map(([label, value]) => (
                    <div key={label} className="border border-white/5 rounded-lg p-3 bg-black/30">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
                      <p className="text-[10px] font-bold text-white mt-1 break-words">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg border border-white/5 overflow-hidden">
              <div className="px-4 py-2 bg-white/5 border-b border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Attention Required</span>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {insights.warnings.length ? insights.warnings.map(warning => (
                  <span key={warning} className="px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 text-[9px] font-bold uppercase tracking-widest">
                    {warning}
                  </span>
                )) : (
                  <span className="px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-widest">
                    Governance coverage healthy
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'metadata' && (
          <div className="space-y-8">
             <MetadataViewer data={entity.metadata_json} />
          </div>
        )}
        
        {tab === 'secrets' && (
          <ExternalSecretsTab entityId={entity.id} />
        )}

        {tab === 'org' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 p-5 rounded-lg border border-white/10 relative overflow-hidden group">
               <h3 className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-3 flex items-center gap-2"><Target size={12}/> Ownership Context</h3>
               <div className="grid grid-cols-3 gap-6 relative z-10">
                  <div className="flex flex-col border-l-2 border-white/5 pl-4">
                     <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">External Organization</span>
                     <span className="text-sm font-bold text-white tracking-tight ">{entity.owner_organization || 'Unassigned'}</span>
                  </div>
                  <div className="flex flex-col border-l-2 border-emerald-500/30 pl-4">
                     <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">External Team</span>
                     <span className="text-sm font-bold text-emerald-400 tracking-tight ">{entity.owner_team || 'Unassigned'}</span>
                  </div>
                  <div className="flex flex-col border-l-2 border-blue-500/30 pl-4">
                     <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">Accountable Owner</span>
                     <span className="text-sm font-bold text-blue-300 tracking-tight ">{insights.internalOwnerLabel}</span>
                  </div>
               </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Contact Matrix</span>
                <span className="text-[8px] font-bold text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-lg">{insights.contacts.length || 0} Contacts</span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-3">
                   {insights.contacts && insights.contacts.length > 0 ? insights.contacts.map((poc: any, idx: number) => (
                     <div key={idx} className="bg-black/40 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                           <div className="w-7 h-7 rounded-lg bg-amber-600/10 flex items-center justify-center text-amber-400 border border-amber-500/20 font-bold text-[10px]">{poc.full_name?.split(' ').map((part: string) => part[0]).slice(0, 2).join('')}</div>
                           <div>
                              <p className="text-[10px] font-bold text-white leading-none">{poc.full_name}</p>
                              <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">{poc.role}{poc.external_person_id ? ` · ${poc.external_person_id}` : ''}</p>
                           </div>
                        </div>
                        <div className="flex items-center space-x-3">
                           <button onClick={() => window.location.href = `mailto:${poc.email}`} title={poc.email} className="text-slate-500 hover:text-amber-400 transition-colors"><Mail size={12}/></button>
                           <button
                             onClick={() => {
                               if (poc.phone) {
                                 window.location.href = `tel:${poc.phone}`
                               }
                             }}
                             disabled={!poc.phone}
                             title={poc.phone || 'No phone number registered'}
                             className="text-slate-500 hover:text-amber-400 transition-colors disabled:opacity-40 disabled:hover:text-slate-500"
                           >
                             <Phone size={12}/>
                           </button>
                        </div>
                     </div>
                   )) : (
                     <div className="col-span-2 py-6 text-center text-slate-600 font-bold uppercase tracking-widest text-[9px]">No contacts defined</div>
                   )}
              </div>
            </div>
          </div>
        )}

        {tab === 'dependencies' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/5 p-4 rounded-lg">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Mapped Assets</p>
                <p className="text-2xl font-bold text-blue-400">{new Set(insights.linked.map((link: any) => link.device_id)).size}</p>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-lg">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Mapped Services</p>
                <p className="text-2xl font-bold text-emerald-400">{insights.linked.filter((link: any) => link.service_id).length}</p>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-lg">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Audit Trail</p>
                <button
                  onClick={() => window.location.href = `/logs?target_table=external_entities&target_id=${entity.id}`}
                  className="mt-2 text-[9px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300"
                >
                  Open Logs
                </button>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg border border-white/5 overflow-hidden">
              <div className="px-4 py-2 bg-white/5 border-b border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Dependency Matrix</span>
              </div>
              <div className="divide-y divide-white/5">
                {insights.linked.length ? insights.linked.map((link: any) => (
                  <div key={link.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-white">{link.device_name || 'Unknown asset'}{link.service_name ? ` // ${link.service_name}` : ''}</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{link.direction} · {link.protocol || 'Unknown protocol'} · {link.port || 'No port'} · {link.purpose || 'No purpose documented'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => window.location.href = `/asset?id=${link.device_id}`} className="px-3 py-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 text-[8px] font-bold uppercase tracking-widest">Asset</button>
                      {link.service_id && <button onClick={() => window.location.href = `/services?id=${link.service_id}`} className="px-3 py-2 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold uppercase tracking-widest">Service</button>}
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-600 font-bold uppercase tracking-widest text-[9px]">No dependency links mapped yet</div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function External() {
  const [searchParams, setSearchParams] = useSearchParams()
  const entityIdFromUrl = searchParams.get('id')
  const queryClient = useQueryClient()
  const gridRef = useRef<any>(null)
  const [, setGridApi] = useState<any>(null)
  const [, setGridColumnApi] = useState<any>(null)
  
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'deleted' | 'links'>('active')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, id: null, purge: false, type: 'entity' })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
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

  // Update URL when activeDetails changes
  useEffect(() => {
    if (activeDetails) {
      setSearchParams({ id: String(activeDetails.id) })
    } else {
      if (searchParams.has('id')) {
          setSearchParams({})
      }
    }
  }, [activeDetails, setSearchParams, searchParams])


  const { data: links, isLoading: linkLoading } = useQuery({ 
    queryKey: ['external-links'], 
    queryFn: async () => (await (await apiFetch('/api/v1/intelligence/links')).json()) 
  })

  const { data: devices } = useQuery({ 
    queryKey: ['devices'], 
    queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) 
  })
  const registrySummary = useMemo(() => {
    const source = Array.isArray(allEntities) ? allEntities : []
    const missingOwners = source.filter((entity: any) => !getEntityInsights(entity, links || []).hasOwner).length
    const missingDependencies = source.filter((entity: any) => getEntityInsights(entity, links || []).linked.length === 0).length
    const missingContacts = source.filter((entity: any) => !getEntityInsights(entity, links || []).hasPoc).length
    return { total: source.length, missingOwners, missingDependencies, missingContacts }
  }, [allEntities, links])

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

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 100)
    }
  }, [fontSize, rowDensity, entities, links, activeTab])

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

  const columnDefs = useMemo(() => [
    { 
      headerName: "", 
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: 'left', 
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
      minWidth: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
    },
    { 
      field: activeTab === 'links' ? "external_entity_name" : "name", 
      headerName: activeTab === 'links' ? "External Peer" : "Name", 
      pinned: 'left',
      filter: true,
      cellClass: 'text-left font-bold uppercase text-blue-400',
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("name")
    },
    ...(activeTab === 'links' ? [
       { 
         field: "direction", 
         headerName: "Flow", 
         width: 100, 
         cellClass: "text-center",
         headerClass: "text-center",
         cellRenderer: (p: any) => (
           <div className="flex items-center justify-center h-full">
             <div style={{ fontSize: `${fontSize}px` }} className={`px-2 py-0.5 rounded-lg font-bold uppercase inline-block border ${p.value === 'Upstream' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
               {p.value}
             </div>
           </div>
         ),
         hide: hiddenColumns.includes("direction")
       },
       { 
         field: "device_name", 
         headerName: "Internal Asset", 
         width: 150, 
         cellClass: "font-bold text-center uppercase tracking-tight", 
         headerClass: 'text-center', 
         cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || 'N/A'}</span>,
         hide: hiddenColumns.includes("device_name")
       },
       { 
         field: "service_name", 
         headerName: "Logical Service", 
         width: 150, 
         cellClass: "text-center uppercase text-slate-400 font-bold tracking-tight", 
         headerClass: 'text-center', 
         cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || 'N/A'}</span>,
         hide: hiddenColumns.includes("service_name")
       },
       { 
         field: "purpose", 
         headerName: "Interconnect Purpose", 
         flex: 1.5, 
         headerClass: 'text-left', 
         cellClass: 'font-bold uppercase', 
         cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || 'N/A'}</span>,
         hide: hiddenColumns.includes("purpose")
       },
       { field: "protocol", headerName: "Prot", width: 80, cellClass: "text-center font-mono font-bold uppercase", headerClass: 'text-center', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>, hide: hiddenColumns.includes("protocol") },
       { field: "port", headerName: "Port", width: 80, cellClass: "text-center font-mono font-bold uppercase", headerClass: 'text-center', cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>, hide: hiddenColumns.includes("port") },
    ] : [
       { 
         field: "type", 
         headerName: "Type", 
         width: 140, 
         filter: true,
         cellClass: 'text-center', 
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
         field: "internal_owner", 
         headerName: "Accountable Owner", 
         width: 150, 
         filter: true,
         cellClass: 'text-center font-bold text-slate-400', 
         headerClass: 'text-center', 
         cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold">N/A</span>, 
         hide: hiddenColumns.includes("internal_owner") 
       },
       { 
         field: "status", 
         headerName: "Status", 
         width: 130, 
         filter: true,
         cellClass: 'text-center',
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
               <div className={`flex items-center justify-center w-28 h-5 rounded-lg border shadow-sm ${colors[p.value] || 'text-slate-400 border-white/10 bg-white/5'}`}>
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
         field: "environment", 
         headerName: "Env", 
         width: 100, 
         filter: true,
         cellClass: 'text-center font-bold text-slate-400 uppercase', 
         headerClass: 'text-center',
         cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
         hide: hiddenColumns.includes("environment")
       },
       {
         field: "link_count",
         headerName: "Links",
         width: 85,
         cellClass: 'text-center font-bold text-blue-400',
         headerClass: 'text-center',
         hide: hiddenColumns.includes("link_count")
       },
       {
         field: "warning_count",
         headerName: "Warnings",
         width: 100,
         cellClass: 'text-center',
         headerClass: 'text-center',
         cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }} className={`font-bold uppercase ${p.value ? 'text-amber-400' : 'text-emerald-400'}`}>{p.value}</span>,
         hide: hiddenColumns.includes("warning_count")
       },
    ]),
    { 
      headerName: "Action",
      width: 120,
      minWidth: 120,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      resizable: false,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               {activeTab !== 'links' && <button onClick={() => setActiveDetails(p.data)} title="View Details" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><List size={14}/></button>}
               {activeTab === 'active' ? (
                 <>
                   <button onClick={() => setActiveModal(p.data)} title="Edit" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
                   <button onClick={() => setConfirmModal({ isOpen: true, id: p.data.id, purge: false, type: 'entity' })} title="Delete" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
                 </>
               ) : activeTab === 'deleted' ? (
                 <>
                   <button onClick={() => restoreMutation.mutate(p.data.id)} title="Restore" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><RefreshCcw size={14}/></button>
                   <button onClick={() => setConfirmModal({ isOpen: true, id: p.data.id, purge: true, type: 'entity' })} title="Purge" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
                 </>
               ) : (
                 <button onClick={() => setConfirmModal({ isOpen: true, id: p.data.id, purge: false, type: 'link' })} title="Sever Link" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
               )}
           </div>
        </div>
      ),
      lockVisible: true
    }
  ], [fontSize, hiddenColumns, activeTab]) as any

  const autoSizeStrategy = OPERATIONAL_GRID_AUTO_SIZE_STRATEGY

  return (
    <div className="h-full flex flex-col space-y-4 min-h-0 overflow-hidden">
      <PageHeader
        title="Partner IQ"
        subtitle="Global Entity Reference & Interconnect Intelligence"
        actions={
          <ToolbarButton 
            variant="primary"
            onClick={() => activeTab === 'links' ? setShowLinkModal(true) : setActiveModal({})} 
          >
            <Plus size={14} className="mr-2 inline-block" /> {activeTab === 'links' ? 'Map Link' : 'Admission'}
          </ToolbarButton>
        }
      />

      <PageToolbar
        left={
          <ToolbarGroup>
            <ToolbarSegmented
              options={[
                { label: 'Registry', value: 'active' },
                { label: 'Connectivity', value: 'links' },
                { label: 'Archive', value: 'deleted' }
              ]}
              value={activeTab}
              onChange={(val) => setActiveTab(val as any)}
            />
          </ToolbarGroup>
        }
        right={
          <ToolbarGroup>
            <ToolbarSearch 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="SCAN REGISTRY..." 
            />
            
            <div className="w-px h-6 bg-white/10 mx-1" />

            <ToolbarIconButton 
              onClick={() => setShowStyleLab(!showStyleLab)} 
              active={showStyleLab}
              title="Toggle Style Lab"
            >
              <Activity size={14} />
            </ToolbarIconButton>
            <ToolbarIconButton 
              onClick={() => setShowColumnPicker(!showColumnPicker)} 
              active={showColumnPicker}
              title="Column Picker"
            >
              <Sliders size={14} />
            </ToolbarIconButton>
            <ToolbarIconButton 
              onClick={handleExportCSV} 
              title="Export Manifest"
            >
              <FileText size={14} />
            </ToolbarIconButton>
            <ToolbarIconButton 
              onClick={handleCopyToClipboard} 
              title="Secure Copy"
            >
              <Clipboard size={14} />
            </ToolbarIconButton>
            <ToolbarIconButton 
              onClick={() => setShowConfig(true)} 
              title="Registry Config"
            >
              <Settings size={14} />
            </ToolbarIconButton>
          </ToolbarGroup>
        }
      />

      {activeTab !== 'links' && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Registry Entries', value: registrySummary.total, tone: 'text-blue-400' },
            { label: 'Contacts Missing', value: registrySummary.missingContacts, tone: 'text-amber-400' },
            { label: 'Owner Missing', value: registrySummary.missingOwners, tone: 'text-fuchsia-400' },
            { label: 'Unmapped Dependencies', value: registrySummary.missingDependencies, tone: 'text-slate-300' },
          ].map(card => (
            <div key={card.label} className="glass-panel rounded-lg border border-white/5 p-4 bg-black/20">
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{card.label}</p>
              <p className={`text-2xl font-bold mt-2 ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showStyleLab && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 flex items-center justify-between backdrop-blur-md">
               <div className="flex items-center space-x-12">
                  <div className="flex items-center space-x-3">
                     <Activity size={16} className="text-blue-400" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">View Density Laboratory</span>
                  </div>

                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Font Size</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="8" max="14" step="1" 
                            value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                            className="w-32 accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-bold">{fontSize}px</span>
                        </div>
                     </div>

                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Row Density</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="4" max="24" step="2" 
                            value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))}
                            className="w-32 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-bold">{rowDensity}px</span>
                        </div>
                     </div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 glass-panel rounded-lg border border-white/5 overflow-hidden ag-theme-alpine-dark relative">
        {(isLoading || linkLoading) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">Synchronizing Intelligence Matrix...</p>
          </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={activeTab === 'links' ? links : entities} 
          columnDefs={columnDefs as any} 
          headerHeight={fontSize + rowDensity + 10}
          rowHeight={fontSize + rowDensity + 10}
          onGridReady={(params) => {
            setGridApi(params.api)
            setGridColumnApi(params.columnApi)
          }}
          animateRows={true}
          enableCellTextSelection={true}
          autoSizeStrategy={autoSizeStrategy}
          rowSelection="multiple"
          onSelectionChanged={e => setSelectedIds(e?.api?.getSelectedNodes().map((n: any) => n.data?.id).filter(Boolean) || [])}
        />

        <AnimatePresence>
          {showColumnPicker && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-0 right-0 bottom-0 w-64 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 z-[60] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center space-x-2">
                  <Sliders size={14} /> <span>Toggle Columns</span>
                </h3>
                <button onClick={() => setShowColumnPicker(false)} className="text-slate-500 hover:text-white"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                {columnDefs.filter((c: any) => c.field && !c.lockVisible).map((col: any) => (
                  <label key={col.field} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all">
                    <div className="relative flex items-center">
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
                      <div className={`w-4 h-4 rounded-lg border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>
                         {!hiddenColumns.includes(col.field) && <Check size={12} className="text-white mx-auto" />}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>{col.headerName || col.field}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[800px] max-h-[90vh] overflow-y-auto p-10 rounded-lg border border-blue-500/30 custom-scrollbar">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <h2 className="text-2xl font-bold uppercase flex items-center space-x-4 text-blue-400">
                     <Layers size={28}/> <span>{activeModal.id ? 'Modify Entity Registry' : 'Admit External Identity'}</span>
                  </h2>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
               </div>
               <ExternalForm initialData={activeModal} onSave={mutation.mutate} isSaving={mutation.isPending} options={options} teams={teams || []} operators={operators || []} />
            </motion.div>
          </div>
        )}
        {showLinkModal && (
           <LinkForm 
              entities={allEntities?.filter((e: any) => !e.is_deleted)}
              devices={devices}
              onClose={() => setShowLinkModal(false)}
              onSave={(data: any) => linkMutation.mutate(data)}
              isPending={linkMutation.isPending}
           />
        )}
      </AnimatePresence>

      <AnimatePresence>
       {activeDetails && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[900px] max-h-[85vh] overflow-hidden p-10 rounded-lg border border-blue-500/30 flex flex-col">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold uppercase text-blue-400 leading-tight tracking-tighter ">{activeDetails.name}</h2>
                    <div className="flex items-center space-x-3 mt-1">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{activeDetails.type} · {activeDetails.environment}</p>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">ORG: {activeDetails.owner_organization || 'UNASSIGNED'}</p>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">OWNER: {activeDetails.internal_operator_name || activeDetails.internal_team_name || 'UNASSIGNED'}</p>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${
                        activeDetails.status === 'Active' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>STATUS: {activeDetails.status}</p>
                    </div>
                    <div className="mt-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 max-w-2xl">
                       <p className="text-[10px] font-bold text-slate-400  leading-relaxed">
                          "{activeDetails.description || 'No formal functional description provided for this architectural identity.'}"
                       </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button 
                       onClick={() => {
                         navigator.clipboard.writeText(window.location.href);
                         toast.success("Direct link copied to clipboard");
                       }} 
                       className="text-slate-500 hover:text-blue-400 transition-colors p-2"
                       title="Share direct link"
                     >
                       <Share2 size={24}/>
                     </button>
                     <button onClick={() => setActiveDetails(null)} className="text-slate-500 hover:text-white transition-colors p-2"><X size={28}/></button>
                  </div>
                  </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar pt-6">
                  <ExternalDetailsView entity={activeDetails} links={links || []} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: #1a1b26;
          --ag-header-background-color: #24283b;
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #3b82f6;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: ${fontSize}px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-size: ${fontSize}px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; justify-content: center !important; }
        .ag-cell { font-weight: 700 !important; justify-content: center !important; display: flex; align-items: center; font-size: ${fontSize}px !important; }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
      `}</style>
    </div>
  )
}

function LinkForm({ entities, devices, onClose, onSave, isPending }: any) {
  const [formData, setFormData] = useState({
    external_entity_id: '', device_id: '', service_id: '', direction: 'Outbound', purpose: '', protocol: 'TCP', port: '',
    host_or_fqdn: '', path_or_resource: '', network_zone: '', transport_security: '', link_status: 'Active', credential_reference: '',
    credentials: { username: '', vault_path: '', note: '' }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: services } = useQuery({
    queryKey: ['device-services', formData.device_id],
    queryFn: async () => {
      if (!formData.device_id) return []
      return (await apiFetch(`/api/v1/logical-services/?device_id=${formData.device_id}`)).json()
    },
    enabled: !!formData.device_id
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-5xl h-[85vh] rounded-lg border border-indigo-500/20 overflow-hidden flex flex-col shadow-2xl">
        <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
           <div className="space-y-4">
              <div className="flex items-center space-x-3">
                 <div className="px-3 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-[9px] font-black text-indigo-400 uppercase tracking-widest">MAP_INTERCONNECT</div>
                 <div className="px-3 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-widest">DATA_FLOW_ESTABLISHMENT</div>
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tighter text-white">ESTABLISH_LINK</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Mapping Topology Between Global & Local Matrix</p>
           </div>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
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

        <div className="p-10 border-t border-white/5 bg-white/5 shrink-0 flex items-center space-x-4">
           <button onClick={onClose} className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all">Abort</button>
           <button 
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
               })
             }}
             disabled={!formData.external_entity_id || !formData.device_id || isPending}
             className="flex-1 py-5 bg-indigo-600 text-white rounded-lg text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
           >
              {isPending && <RefreshCcw size={16} className="animate-spin" />}
              <span>Establish Interconnect Link</span>
           </button>
        </div>
      </motion.div>
    </div>
  )
}
