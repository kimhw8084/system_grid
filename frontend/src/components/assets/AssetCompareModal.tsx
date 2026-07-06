import React, { useMemo, useState } from 'react'
import { WorkspaceModal } from '../shared/WorkspaceModal'
import { WorkspaceCompareShell } from '../shared/WorkspaceModalShells'
import { StatusPill } from '../shared/StatusPill'

export function AssetCompareModal({
  items,
  onClose,
}: {
  items: any[]
  onClose: () => void
}) {
  const [isMaximized, setIsMaximized] = useState(false)

  const fields = useMemo(() => [
    { label: 'Status', getValue: (item: any) => item.status || 'Unknown' },
    { label: 'System', getValue: (item: any) => item.system || 'N/A' },
    { label: 'Type', getValue: (item: any) => item.type || 'N/A' },
    { label: 'Environment', getValue: (item: any) => item.environment || 'N/A' },
    { label: 'Owner', getValue: (item: any) => item.owner || 'N/A' },
    { label: 'Manufacturer', getValue: (item: any) => item.manufacturer || 'N/A' },
    { label: 'Model', getValue: (item: any) => item.model || 'N/A' },
    { label: 'Primary IP', getValue: (item: any) => item.primary_ip || 'N/A' },
    { label: 'Mgmt IP', getValue: (item: any) => item.management_ip || 'N/A' },
    { label: 'Rack', getValue: (item: any) => item.rack_name || 'N/A' },
    { label: 'Site', getValue: (item: any) => item.site_name || 'N/A' },
    { label: 'Resources', getValue: (item: any) => item.hardware_summary || 'N/A', multiline: true },
  ], [])

  const diffMap = useMemo(() => {
    const map: Record<string, any[]> = {}
    fields.forEach((field) => {
      const values = items.map(field.getValue)
      map[field.label] = Array.from(new Set(values))
    })
    return map
  }, [fields, items])

  return (
    <WorkspaceModal
      isOpen
      onClose={onClose}
      size="workspace"
      className={isMaximized ? 'h-[92vh]' : 'h-[82vh]'}
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized((current) => !current)}
      title="Compare Assets"
      subtitle="Compare selected asset records side by side."
      hideFooterClose
    >
      <WorkspaceCompareShell
        body={(
          <div className="grid min-h-0 flex-1 overflow-hidden">
            <div className="custom-scrollbar overflow-auto pr-1">
              <div className="min-w-[960px] rounded-lg border border-white/5 bg-black/20">
                <div className="grid border-b border-white/5 bg-white/[0.03]" style={{ gridTemplateColumns: `220px repeat(${items.length}, minmax(220px, 1fr))` }}>
                  <div className="border-r border-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Field</div>
                  {items.map((item) => (
                    <div key={item.id} className="border-r border-white/5 px-4 py-3 last:border-r-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">{item.system || 'Unassigned'}</p>
                      <p className="pt-1 text-sm font-semibold text-white">{item.name}</p>
                      <div className="pt-2">
                        <StatusPill value={item.status || 'Unknown'} />
                      </div>
                    </div>
                  ))}
                </div>
                {fields.map((field) => {
                  const hasDifference = diffMap[field.label]?.length > 1
                  return (
                    <div key={field.label} className={`grid border-b border-white/5 last:border-b-0 ${hasDifference ? 'bg-amber-500/[0.04]' : ''}`} style={{ gridTemplateColumns: `220px repeat(${items.length}, minmax(220px, 1fr))` }}>
                      <div className="border-r border-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        {field.label}
                      </div>
                      {items.map((item) => (
                        <div key={`${field.label}:${item.id}`} className="border-r border-white/5 px-4 py-3 text-[11px] text-slate-200 last:border-r-0">
                          <div className={field.multiline ? 'whitespace-pre-wrap leading-relaxed' : ''}>
                            {field.getValue(item)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      />
    </WorkspaceModal>
  )
}
