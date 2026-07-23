import React from 'react'
import { MoreVertical } from 'lucide-react'
import type { VendorTableRow } from './vendorGoldenTypes'

type VendorColumnOptions = { onActions: (vendor: VendorTableRow, event: React.MouseEvent<HTMLButtonElement>) => void }

/** Shared business-column baseline for every Vendor grid mode. */
export function buildVendorGoldenColumns({ onActions }: VendorColumnOptions) {
  return [
    { colId: 'select', width: 48, pinned: 'left', checkboxSelection: true, headerCheckboxSelection: true, sortable: false, filter: false },
    { field: 'name', headerName: 'Vendor Name', pinned: 'left', width: 220, minWidth: 150, filter: true, sortable: true },
    { field: 'country', headerName: 'Country', width: 140, minWidth: 110, filter: true },
    { field: 'primary_personnel_name', headerName: 'Primary Contact', width: 190, minWidth: 140, filter: true },
    { field: 'primary_personnel_email', headerName: 'Contact Email', width: 220, minWidth: 160, filter: true },
    { field: 'active_contract_count', headerName: 'Active Contracts', width: 140, minWidth: 120, filter: 'agNumberColumnFilter' },
    { field: 'contract_count', headerName: 'Total Contracts', width: 140, minWidth: 120, filter: 'agNumberColumnFilter' },
    { field: 'earliest_expiry_date', headerName: 'Earliest Expiry', width: 150, minWidth: 130, filter: 'agDateColumnFilter' },
    { field: 'personnel_count', headerName: 'Personnel', width: 110, minWidth: 90, filter: 'agNumberColumnFilter' },
    { field: 'created_at', headerName: 'Created', width: 170, minWidth: 140, filter: 'agDateColumnFilter' },
    { field: 'updated_at', headerName: 'Updated', width: 170, minWidth: 140, filter: 'agDateColumnFilter' },
    { colId: 'row_actions', headerName: 'Actions', pinned: 'right', width: 86, sortable: false, filter: false, cellRenderer: (params: { data?: VendorTableRow }) => params.data ? <button aria-label="Vendor actions" onClick={(event) => onActions(params.data!, event)}><MoreVertical size={15} /></button> : null },
  ]
}
