export type FARRiskBand = 'Critical' | 'High' | 'Moderate' | 'Low'
export type FARStatus = 'Analyzing' | 'Cause Identified' | 'Resolution Identified' | 'Mitigated' | 'Eliminated'
export type FARPresetKey = 'all' | 'high-risk' | 'overdue' | 'unassigned' | 'recent'
export type FARWorkspaceMode = 'failure_modes' | 'causes' | 'mitigations' | 'prevention'
export type FARSyncState = 'loading' | 'synced' | 'saving' | 'unsaved' | 'offline' | 'conflict'

export interface FARRawRecord { [key: string]: unknown }

export interface FARRecord {
  id: number
  title: string
  systemName: string
  failureType: string
  effect: string
  status: FARStatus
  severity: number
  occurrence: number
  detection: number
  rpn: number
  riskBand: FARRiskBand
  maturityLevel: number
  version: number
  owner: string | null
  ownerUserId: string | null
  ownerTeam: string | null
  dueAt: string | null
  affectedAssets: string[]
  causes: string[]
  mitigations: string[]
  preventionActions: string[]
  linkedRcas: string[]
  incidentCount: number
  hasIncidentHistory: boolean
  isRetired: boolean
  createdAt: string | null
  updatedAt: string | null
  ageDays: number
  overdue: boolean
  searchText: string
  raw: FARRawRecord
}

export interface FARFilterState {
  preset: FARPresetKey
  status: string
  riskBand: string
  owner: string
  systems: string[]
  searchTerm: string
  mode: FARWorkspaceMode
}

export interface FARSavedViewDefinition {
  schemaVersion: 1
  filters: FARFilterState
  fontSize: number
  rowDensity: number
  hiddenColumns: string[]
  columnLayoutState: Array<{
    colId: string
    hide?: boolean
    pinned?: 'left' | 'right' | null
    width?: number
    sort?: 'asc' | 'desc'
  }>
}

export const DEFAULT_FAR_FILTERS: FARFilterState = {
  preset: 'all',
  status: 'all',
  riskBand: 'all',
  owner: 'all',
  systems: [],
  searchTerm: '',
  mode: 'failure_modes',
}

const FAR_STATUSES = new Set<FARStatus>([
  'Analyzing',
  'Cause Identified',
  'Resolution Identified',
  'Mitigated',
  'Eliminated',
])
const FAR_MODES = new Set<FARWorkspaceMode>(['failure_modes', 'causes', 'mitigations', 'prevention'])
const FAR_PRESETS = new Set<FARPresetKey>(['all', 'high-risk', 'overdue', 'unassigned', 'recent'])

const object = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
)

const requiredText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid FAR ${field}`)
  return value.trim()
}

const optionalText = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

const integer = (value: unknown, field: string, minimum: number, maximum: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`Invalid FAR ${field}`)
  return parsed
}

const validDate = (value: unknown): string | null => {
  const candidate = optionalText(value)
  if (!candidate) return null
  const timestamp = Date.parse(candidate)
  if (!Number.isFinite(timestamp)) throw new Error('Invalid FAR date')
  return new Date(timestamp).toISOString()
}

const stringList = (value: unknown, preferredKeys: string[]): string[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (typeof entry === 'string' && entry.trim()) return [entry.trim()]
    const record = object(entry)
    for (const key of preferredKeys) {
      const candidate = optionalText(record[key])
      if (candidate) return [candidate]
    }
    return []
  })
}

export const farRiskBand = (rpn: number): FARRiskBand => {
  if (rpn >= 300) return 'Critical'
  if (rpn >= 200) return 'High'
  if (rpn >= 100) return 'Moderate'
  return 'Low'
}

export function normalizeFARRecord(rawValue: unknown, _index = 0, now = new Date()): FARRecord {
  const raw = object(rawValue)
  const id = integer(raw.id, 'id', 1, Number.MAX_SAFE_INTEGER)
  const title = requiredText(raw.title, 'title')
  const systemName = requiredText(raw.system_name, 'system_name')
  const failureType = requiredText(raw.failure_type, 'failure_type')
  const rawStatus = requiredText(raw.status, 'status')
  if (!FAR_STATUSES.has(rawStatus as FARStatus)) throw new Error(`Unknown FAR status: ${rawStatus}`)
  const status = rawStatus as FARStatus
  const severity = integer(raw.severity, 'severity', 1, 10)
  const occurrence = integer(raw.occurrence, 'occurrence', 1, 10)
  const detection = integer(raw.detection, 'detection', 1, 10)
  const rpn = integer(raw.rpn, 'rpn', 1, 1000)
  if (rpn !== severity * occurrence * detection) throw new Error(`FAR RPN mismatch for ${id}`)
  const version = integer(raw.version, 'version', 1, Number.MAX_SAFE_INTEGER)
  const computedBand = farRiskBand(rpn)
  const responseBand = optionalText(raw.risk_band)
  if (responseBand && responseBand !== computedBand) throw new Error(`FAR risk band mismatch for ${id}`)
  const ownerUserId = optionalText(raw.owner_user_id)
  const ownerTeam = optionalText(raw.owner_team)
  const owner = ownerTeam || ownerUserId
  const dueAt = validDate(raw.due_at)
  const createdAt = validDate(raw.created_at)
  const updatedAt = validDate(raw.updated_at)
  const referenceDate = createdAt ? new Date(createdAt) : now
  const ageDays = Math.max(0, Math.floor((now.getTime() - referenceDate.getTime()) / 86_400_000))
  const isRetired = Boolean(raw.is_retired)
  const overdue = Boolean(dueAt && Date.parse(dueAt) < now.getTime() && !isRetired && status !== 'Eliminated')
  const affectedAssets = stringList(raw.affected_assets, ['name', 'system', 'primary_ip', 'id'])
  const causes = stringList(raw.causes, ['cause_text', 'responsible_team', 'id'])
  const mitigations = stringList(raw.mitigations, ['mitigation_steps', 'mitigation_type', 'status', 'id'])
  const preventionActions = stringList(raw.prevention_actions, ['prevention_action', 'responsible_team', 'id'])
  const linkedRcas = stringList(raw.linked_rcas, ['title', 'incident_type', 'status', 'id'])
  const effect = optionalText(raw.effect) || ''
  const hasIncidentHistory = Boolean(raw.has_incident_history)
  const incidentCount = Array.isArray(raw.linked_rcas) ? raw.linked_rcas.length : (hasIncidentHistory ? 1 : 0)
  const maturityLevel = integer(raw.maturity_level ?? 0, 'maturity_level', 0, 8)
  const searchText = [
    id, title, systemName, failureType, effect, status, ownerUserId, ownerTeam,
    ...affectedAssets, ...causes, ...mitigations, ...preventionActions, ...linkedRcas,
  ].filter(Boolean).join(' ').toLocaleLowerCase()

  return {
    id, title, systemName, failureType, effect, status, severity, occurrence, detection,
    rpn, riskBand: computedBand, maturityLevel, version, owner, ownerUserId, ownerTeam,
    dueAt, affectedAssets, causes, mitigations, preventionActions, linkedRcas,
    incidentCount, hasIncidentHistory, isRetired, createdAt, updatedAt, ageDays, overdue,
    searchText, raw,
  }
}

export function extractFARRows(payload: unknown, now = new Date()): FARRecord[] {
  const value = object(payload)
  const candidates = Array.isArray(payload)
    ? payload
    : [value.items, value.modes, value.records, value.data, value.results].find(Array.isArray) ?? []
  return (candidates as unknown[]).map((row, index) => normalizeFARRecord(row, index, now))
}

export function farPresetMatches(record: FARRecord, preset: FARPresetKey, now = new Date()): boolean {
  if (preset === 'high-risk') return record.rpn >= 200
  if (preset === 'overdue') return record.overdue
  if (preset === 'unassigned') return !record.owner
  if (preset === 'recent') {
    const updated = record.updatedAt ? Date.parse(record.updatedAt) : Number.NaN
    return Number.isFinite(updated) && now.getTime() - updated <= 14 * 86_400_000
  }
  return true
}

export function applyFARFilters(records: FARRecord[], filters: FARFilterState, now = new Date()): FARRecord[] {
  const query = filters.searchTerm.trim().toLocaleLowerCase()
  return records
    .filter((record) => farPresetMatches(record, filters.preset, now))
    .filter((record) => filters.mode === 'failure_modes'
      || (filters.mode === 'causes' && record.causes.length > 0)
      || (filters.mode === 'mitigations' && record.mitigations.length > 0)
      || (filters.mode === 'prevention' && record.preventionActions.length > 0))
    .filter((record) => filters.status === 'all' || record.status === filters.status)
    .filter((record) => filters.riskBand === 'all' || record.riskBand === filters.riskBand)
    .filter((record) => filters.owner === 'all' || (record.owner || 'Unassigned') === filters.owner)
    .filter((record) => filters.systems.length === 0 || filters.systems.includes(record.systemName))
    .filter((record) => !query || record.searchText.includes(query))
    .sort((left, right) => right.rpn - left.rpn || right.ageDays - left.ageDays || left.title.localeCompare(right.title))
}

export function sanitizeFARSavedViewDefinition(value: unknown): FARSavedViewDefinition {
  const source = object(value)
  const rawFilters = object(source.filters)
  const preset = FAR_PRESETS.has(rawFilters.preset as FARPresetKey) ? rawFilters.preset as FARPresetKey : 'all'
  const mode = FAR_MODES.has(rawFilters.mode as FARWorkspaceMode) ? rawFilters.mode as FARWorkspaceMode : 'failure_modes'
  const hiddenColumns = Array.isArray(source.hiddenColumns)
    ? [...new Set(source.hiddenColumns.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()))].slice(0, 100)
    : []
  const columnLayoutState = Array.isArray(source.columnLayoutState)
    ? source.columnLayoutState.flatMap((item) => {
        const record = object(item)
        const colId = optionalText(record.colId)
        if (!colId) return []
        const next: FARSavedViewDefinition['columnLayoutState'][number] = { colId }
        if (typeof record.hide === 'boolean') next.hide = record.hide
        const pinned = record.pinned
        if (pinned === 'left' || pinned === 'right') {
          next.pinned = pinned
        } else if (pinned === null) {
          next.pinned = null
        }
        if (typeof record.width === 'number' && Number.isFinite(record.width) && record.width >= 40 && record.width <= 2000) next.width = Math.trunc(record.width)
        if (record.sort === 'asc' || record.sort === 'desc') next.sort = record.sort
        return [next]
      }).slice(0, 100)
    : []
  return {
    schemaVersion: 1,
    filters: {
      preset,
      mode,
      status: optionalText(rawFilters.status) || 'all',
      riskBand: optionalText(rawFilters.riskBand) || 'all',
      owner: optionalText(rawFilters.owner) || 'all',
      systems: Array.isArray(rawFilters.systems)
        ? [...new Set(rawFilters.systems.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()))].slice(0, 200)
        : [],
      searchTerm: optionalText(rawFilters.searchTerm) || '',
    },
    fontSize: Math.min(14, Math.max(8, Number.isFinite(Number(source.fontSize)) ? Number(source.fontSize) : 11)),
    rowDensity: Math.min(24, Math.max(4, Number.isFinite(Number(source.rowDensity)) ? Number(source.rowDensity) : 10)),
    hiddenColumns,
    columnLayoutState,
  }
}

export function formatFARDate(value: string | null): string {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Not recorded'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export function readFARRecordId(search = ''): number | null {
  const params = new URLSearchParams(search)
  const candidate = params.get('far') || params.get('record') || params.get('id')
  if (!candidate || !/^\d+$/.test(candidate)) return null
  const id = Number(candidate)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function updateFARRecordSearch(search: string, recordId: number | string | null): string {
  const params = new URLSearchParams(search)
  params.delete('record')
  params.delete('id')
  if (recordId !== null && /^\d+$/.test(String(recordId))) params.set('far', String(recordId))
  else params.delete('far')
  const value = params.toString()
  return value ? `?${value}` : ''
}
