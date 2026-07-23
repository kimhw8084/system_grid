import { parseAppDate } from '../../utils/dateUtils'
import type { Vendor, VendorTableRow } from './vendorGoldenTypes'

export const VENDOR_QUERY_KEY = ['vendors'] as const
export const VENDOR_LIST_ENDPOINT = '/api/v1/vendors/?include_deleted=true'
export const VENDOR_LIFECYCLE_ENDPOINT = '/api/v1/vendors/bulk-action'

/** The single stable table adapter consumed by raw and grouped Vendor grids. */
export function toVendorTableRows(vendors: Vendor[]): VendorTableRow[] {
  const now = new Date()
  return vendors.map((vendor) => {
    const personnel = Array.isArray(vendor.personnel) ? vendor.personnel : []
    const contracts = Array.isArray(vendor.contracts) ? vendor.contracts : []
    const primary = personnel.find((person) => person.id === vendor.primary_personnel_id)
    const expiry = contracts.map((contract) => parseAppDate(contract.expiry_date)).filter(Boolean) as Date[]
    return {
      ...vendor,
      personnel,
      contracts,
      primary_personnel_name: primary?.name ?? null,
      primary_personnel_email: primary?.company_email ?? null,
      primary_personnel_phone: primary?.phone ?? null,
      active_contract_count: contracts.filter((contract) => {
        const start = parseAppDate(contract.effective_date)
        const end = parseAppDate(contract.expiry_date)
        return contract.status === 'Completed' && (!start || start <= now) && (!end || end >= now)
      }).length,
      contract_count: contracts.length,
      earliest_expiry_date: expiry.length ? new Date(Math.min(...expiry.map((date) => date.getTime()))).toISOString() : null,
      personnel_count: personnel.length,
    }
  })
}
