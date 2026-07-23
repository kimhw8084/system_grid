export type VendorPersonnel = {
  id: number
  name?: string
  company_email?: string
  phone?: string
  position?: string
  team?: string
  accounts?: unknown[]
  pcs?: unknown[]
  [key: string]: unknown
}

export type VendorContract = {
  id: number
  title?: string
  status?: string
  effective_date?: string
  expiry_date?: string
  scope?: unknown
  coverage?: unknown
  schedule?: unknown
  covered_systems?: Array<string | number>
  covered_assets?: number[]
  [key: string]: unknown
}

export type Vendor = {
  id: number
  name: string
  country?: string
  is_deleted?: boolean
  primary_personnel_id?: number | null
  contracts: VendorContract[]
  personnel: VendorPersonnel[]
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export type VendorTableRow = Vendor & {
  primary_personnel_name: string | null
  primary_personnel_email: string | null
  primary_personnel_phone: string | null
  active_contract_count: number
  contract_count: number
  earliest_expiry_date: string | null
  personnel_count: number
}

export type VendorQuickFilters = { country: string[]; contractStatus: string[] }
export type VendorLifecycleOperation = Readonly<{
  ids: readonly number[]
  originalAction: 'delete' | 'restore'
  inverseAction: 'restore' | 'delete'
  targetLabels: readonly string[]
}>
export type VendorSavedView = { id: string; name: string; config: Record<string, unknown> }
export type VendorWorkspaceState = { savedViews: VendorSavedView[]; activeViewId: string | null; quickFilters: VendorQuickFilters }
