import React from "react"
import { useQuery } from "@tanstack/react-query"
import { Terminal } from "lucide-react"
import { AgGridReact } from "ag-grid-react"

export default function Maintenance() {
  const { data: windows } = useQuery({ queryKey: ["maintenance"], queryFn: async () => (await fetch("/api/v1/maintenance/")).json() })
  const columnDefs = [{ field: "title", headerName: "Title", flex: 1 }, { field: "status", headerName: "Status", width: 150 }]
  return (
    <div className="h-full flex flex-col space-y-4">
      <h1 className="text-2xl font-black uppercase text-amber-400 italic">Maintenance Orchestration</h1>
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark">
        <AgGridReact rowData={windows || []} columnDefs={columnDefs} />
      </div>
    </div>
  )
}
