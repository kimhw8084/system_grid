import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Network, Trash2, X } from "lucide-react"
import { AgGridReact } from "ag-grid-react"

export default function IPAM() {
  const queryClient = useQueryClient()
  const { data: subnets } = useQuery({ queryKey: ["subnets"], queryFn: async () => (await fetch("/api/v1/ipam/subnets")).json() })
  const columnDefs = [{ field: "network_cidr", headerName: "CIDR", flex: 1 }, { field: "vlan_id", headerName: "VLAN", width: 100 }, { field: "name", headerName: "Name", flex: 1 }]
  return (
    <div className="h-full flex flex-col space-y-4">
      <h1 className="text-2xl font-black uppercase text-blue-400 italic">IPAM Engine</h1>
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark">
        <AgGridReact rowData={Array.isArray(subnets) ? subnets : []} columnDefs={columnDefs} />
      </div>
    </div>
  )
}
