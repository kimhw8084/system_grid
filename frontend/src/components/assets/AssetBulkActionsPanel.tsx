import React from 'react'
import { ArchiveRestore, Trash2, Zap } from 'lucide-react'
import { OperationalAnchoredPanel } from '../shared/OperationalWorkspaceShells'
import { WorkspaceFloatingPanel } from '../shared/OperationalWorkspacePrimitives'
import { ToolbarButton } from '../shared/LayoutPrimitives'

type AssetBulkActionsPanelProps = {
  activeTab: 'inventory' | 'deleted'
  isOpen: boolean
  panelRef: React.RefObject<HTMLDivElement | null>
  panelStyle: React.CSSProperties
  onClose: () => void
  onApply: (action: string, payload?: Record<string, any>) => void
}

const STATUS_OPTIONS = ['Active', 'Offline', 'Failed', 'Retired']
const ENV_OPTIONS = ['Production', 'Staging', 'Development', 'Lab']

export function AssetBulkActionsPanel({
  activeTab,
  isOpen,
  panelRef,
  panelStyle,
  onClose,
  onApply,
}: AssetBulkActionsPanelProps) {
  const [selectedStatus, setSelectedStatus] = React.useState('')
  const [selectedEnv, setSelectedEnv] = React.useState('')

  return (
    <OperationalAnchoredPanel
      isOpen={isOpen}
      panelRef={panelRef}
      style={panelStyle}
      panelKey="asset-bulk-menu"
      className="bulk-menu-container"
      yOffset={10}
    >
      <WorkspaceFloatingPanel kind="context" className="max-h-[560px] overflow-y-auto p-3 custom-scrollbar">
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Zap size={14} />
              <p className="text-[10px] font-black uppercase tracking-[0.18em]">Bulk Actions</p>
            </div>
            <p className="pt-1 text-[11px] text-slate-400">Apply shared registry actions without shifting the toolbar layout.</p>
          </div>

          {activeTab === 'inventory' ? (
            <>
              <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-400">Set Status</p>
                <div className="flex items-center gap-3">
                  <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none focus:border-blue-500/40">
                    <option value="">Select status...</option>
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <ToolbarButton disabled={!selectedStatus} variant="primary" onClick={() => { onApply('update', { status: selectedStatus }); onClose() }}>Apply</ToolbarButton>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-400">Set Environment</p>
                <div className="flex items-center gap-3">
                  <select value={selectedEnv} onChange={(event) => setSelectedEnv(event.target.value)} className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none focus:border-indigo-500/40">
                    <option value="">Select environment...</option>
                    {ENV_OPTIONS.map((env) => <option key={env} value={env}>{env}</option>)}
                  </select>
                  <ToolbarButton disabled={!selectedEnv} variant="primary" onClick={() => { onApply('update', { environment: selectedEnv }); onClose() }}>Apply</ToolbarButton>
                </div>
              </div>

              <button type="button" onClick={() => { onApply('delete'); onClose() }} className="flex w-full items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-left transition-all hover:bg-rose-500/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-400">Bulk Delete</p>
                  <p className="pt-1 text-[11px] text-slate-400">Move the current selection to the Purged registry scope.</p>
                </div>
                <Trash2 size={16} className="text-rose-400" />
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { onApply('restore'); onClose() }} className="flex w-full items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-left transition-all hover:bg-emerald-500/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">Bulk Restore</p>
                  <p className="pt-1 text-[11px] text-slate-400">Return the current selection to the Existing registry scope.</p>
                </div>
                <ArchiveRestore size={16} className="text-emerald-400" />
              </button>

              <button type="button" onClick={() => { onApply('purge'); onClose() }} className="flex w-full items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-left transition-all hover:bg-rose-500/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-400">Bulk Purge</p>
                  <p className="pt-1 text-[11px] text-slate-400">Permanently remove the current selection from the registry.</p>
                </div>
                <Trash2 size={16} className="text-rose-400" />
              </button>
            </>
          )}
        </div>
      </WorkspaceFloatingPanel>
    </OperationalAnchoredPanel>
  )
}
