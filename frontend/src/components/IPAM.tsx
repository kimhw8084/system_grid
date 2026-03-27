import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Network, Trash2, X } from "lucide-react"
import { AgGridReact } from "ag-grid-react"

import { motion } from "framer-motion"

export default function IPAM() {
  const queryClient = useQueryClient()
  const { data: subnets } = useQuery({ queryKey: ["subnets"], queryFn: async () => (await fetch("/api/v1/ipam/subnets")).json() })
  const columnDefs = [
    { field: "network_cidr", headerName: "CIDR", flex: 1, cellClass: 'text-center', headerClass: 'text-center' }, 
    { field: "vlan_id", headerName: "VLAN", width: 100, cellClass: 'text-center', headerClass: 'text-center' }, 
    { field: "name", headerName: "Name", flex: 1, cellClass: 'text-center', headerClass: 'text-center' }
  ]
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col space-y-4">
      <h1 className="text-2xl font-black uppercase italic">IPAM Engine</h1>
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark">
        <AgGridReact rowData={Array.isArray(subnets) ? subnets : []} columnDefs={columnDefs} />
      </div>
      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.9);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 10px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; padding-left: 8px !important; }
      `}</style>
    </motion.div>
  )
}
