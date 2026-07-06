import React from 'react'
import { ArchiveRestore, Trash2, Zap } from 'lucide-react'
import { OperationalAnchoredPanel } from '../shared/OperationalWorkspaceShells'
import { WorkspaceFloatingPanel } from '../shared/OperationalWorkspacePrimitives'
import { WorkspaceFlyoutActionCard, WorkspaceFlyoutDropdownEditor } from '../shared/WorkspaceFlyout'

type AssetBulkActionsPanelProps = {
  activeTab: 'inventory' | 'deleted'
  isOpen: boolean
  panelRef: React.RefObject<HTMLDivElement | null>
  panelStyle: React.CSSProperties
  selectedCount: number
  selectedLabels?: string[]
  onClose: () => void
  onApply: (action: string, payload?: Record<string, any>) => void
  onRequestConfirm: (title: string, message: string, onConfirm: () => void) => void
}

const STATUS_OPTIONS = ['Active', 'Offline', 'Failed', 'Retired']
const ENV_OPTIONS = ['Production', 'Staging', 'Development', 'Lab']

export function AssetBulkActionsPanel({
  activeTab,
  isOpen,
  panelRef,
  panelStyle,
  selectedCount,
  selectedLabels = [],
  onClose,
  onApply,
  onRequestConfirm,
}: AssetBulkActionsPanelProps) {
  const [selectedStatus, setSelectedStatus] = React.useState('')
  const [selectedEnv, setSelectedEnv] = React.useState('')
  const [expandedSection, setExpandedSection] = React.useState<'status' | 'environment' | null>(null)

  React.useEffect(() => {
    setSelectedStatus('')
    setSelectedEnv('')
    setExpandedSection(null)
  }, [isOpen, selectedCount, activeTab])

  const selectionPreview = selectedLabels.slice(0, 3).join(', ')
  const selectionSuffix = selectedCount > 3 ? ` +${selectedCount - 3} more` : ''

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
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-blue-400" />
              <p className="text-[10px] font-semibold text-slate-400">Bulk actions</p>
            </div>
            <p className="pt-1 text-[12px] font-semibold text-slate-100">{selectedCount} assets selected</p>
            {selectionPreview ? (
              <p className="pt-1 text-[10px] text-slate-500">{selectionPreview}{selectionSuffix}</p>
            ) : null}
          </div>

          {activeTab === 'inventory' ? (
            <>
              <WorkspaceFlyoutActionCard
                title="Set Status"
                active={expandedSection === 'status'}
                onClick={() => setExpandedSection(expandedSection === 'status' ? null : 'status')}
              />
              {expandedSection === 'status' ? (
                <WorkspaceFlyoutDropdownEditor
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  options={STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
                  placeholder="Choose status"
                  actionLabel="Apply Status"
                  onApply={() => {
                    onApply('update', { status: selectedStatus })
                    onClose()
                  }}
                  disabled={!selectedStatus}
                />
              ) : null}
              <WorkspaceFlyoutActionCard
                title="Set Environment"
                active={expandedSection === 'environment'}
                onClick={() => setExpandedSection(expandedSection === 'environment' ? null : 'environment')}
              />
              {expandedSection === 'environment' ? (
                <WorkspaceFlyoutDropdownEditor
                  value={selectedEnv}
                  onChange={setSelectedEnv}
                  options={ENV_OPTIONS.map((env) => ({ value: env, label: env }))}
                  placeholder="Choose environment"
                  actionLabel="Apply Environment"
                  onApply={() => {
                    onApply('update', { environment: selectedEnv })
                    onClose()
                  }}
                  disabled={!selectedEnv}
                />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onRequestConfirm(
                    'Delete selected assets',
                    `Move ${selectedCount} selected assets to the Purged registry scope?`,
                    () => onApply('delete')
                  )
                  onClose()
                }}
                className="flex w-full items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-left transition-all hover:bg-rose-500/10"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-400">Bulk Delete</p>
                  <p className="pt-1 text-[11px] text-slate-400">Move the current selection to the Purged registry scope.</p>
                </div>
                <Trash2 size={16} className="text-rose-400" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onRequestConfirm(
                    'Restore selected assets',
                    `Return ${selectedCount} selected assets to the Existing registry scope?`,
                    () => onApply('restore')
                  )
                  onClose()
                }}
                className="flex w-full items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-left transition-all hover:bg-emerald-500/10"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">Bulk Restore</p>
                  <p className="pt-1 text-[11px] text-slate-400">Return the current selection to the Existing registry scope.</p>
                </div>
                <ArchiveRestore size={16} className="text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onRequestConfirm(
                    'Purge selected assets',
                    `Permanently remove ${selectedCount} selected assets from the registry? This cannot be undone.`,
                    () => onApply('purge')
                  )
                  onClose()
                }}
                className="flex w-full items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-left transition-all hover:bg-rose-500/10"
              >
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
