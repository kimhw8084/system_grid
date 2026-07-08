import React, { useMemo, useState } from 'react'
import { WorkspaceModal } from '../shared/WorkspaceModal'
import { WorkspaceCompareShell } from '../shared/WorkspaceModalShells'
import { StatusPill } from '../shared/StatusPill'
import { GitCompare } from 'lucide-react'
import { useEscapeDismiss, useBodyModalFlag } from '../shared/OperationalWorkspacePrimitives'

export function AssetCompareModal({
  items,
  onClose,
}: {
  items: any[]
  onClose: () => void
}) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [isMaximized, setIsMaximized] = useState(false)
  const [showDiffsOnly, setShowDiffsOnly] = useState(false)

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
      const unique = Array.from(new Set(values))
      if (unique.length > 1) {
        map[field.label] = unique
      }
    })
    return map
  }, [fields, items])

  const visibleFields = useMemo(() => {
    if (!showDiffsOnly) return fields
    return fields.filter((field) => {
      return Boolean(diffMap[field.label])
    })
  }, [fields, showDiffsOnly, diffMap])

  const gridCols = items.length === 2 ? 'md:grid-cols-2' : items.length === 3 ? 'md:grid-cols-3' : items.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-5'

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title="Compare Assets"
      subtitle={`Temporal Variance Analysis · Comparing ${items.length} assets for configuration drift`}
      icon={<GitCompare size={20} />}
      hideFooterClose
    >
      <WorkspaceCompareShell
        header={(
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-lg w-full justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Comparison Set:</span>
              <span className="text-[11px] font-bold text-slate-300">{items.length} Assets Loaded</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDiffsOnly}
                onChange={(e) => setShowDiffsOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/10 bg-black/40 text-blue-500 focus:ring-blue-500/20"
              />
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Show Differences Only</span>
            </label>
          </div>
        )}
        body={(
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto mt-4 custom-scrollbar">
            {visibleFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center w-full">
                <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-1.5 animate-pulse">No Differences Identified</p>
                <p className="text-slate-400 text-[11px] font-semibold max-w-md leading-relaxed">
                  These selected assets are completely identical across all compared fields. Uncheck "Show Differences Only" in the header to view the full property alignment.
                </p>
              </div>
            ) : (
              <div className={`grid gap-4 ${gridCols}`}>
                {items.map((item: any) => (
                  <div key={item.id} className="rounded-lg border border-white/5 bg-black/40 p-5 shadow-inner flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">ID {item.id}</span>
                      <StatusPill value={item.status || 'Unknown'} />
                    </div>
                    <h4 className="text-sm font-black text-white truncate mb-1">{item.name}</h4>
                    <p className="text-[9px] font-bold text-slate-500 tracking-widest truncate">{item.system || 'Unassigned System'}</p>
                    
                    <div className="mt-6 space-y-2.5 flex-1">
                      {visibleFields.map((f) => {
                        const val = f.getValue(item)
                        const diffSet = diffMap[f.label]
                        const colorIndex = diffSet ? diffSet.indexOf(val) : -1
                        return (
                          <CompareRow 
                            key={f.label} 
                            label={f.label} 
                            value={val} 
                            multiline={f.multiline} 
                            colorIndex={colorIndex}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      />
    </WorkspaceModal>
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
