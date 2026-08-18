import React from 'react'
import { Edit2, Target, Undo2 } from 'lucide-react'
import { ToolbarButton } from './shared/LayoutPrimitives'
import { WorkspaceModal } from './shared/WorkspaceModal'
import { WorkspaceDossierShell } from './shared/WorkspaceModalShells'

export type FarDossierMode = {
  id: number
  title?: string
  system_name?: string
  severity?: number
  occurrence?: number
  detection?: number
  rpn?: number
  is_deleted?: boolean
}

export function getFarDossierRiskTone(rpn: number) {
  if (rpn > 150) return 'critical'
  if (rpn > 80) return 'warning'
  return 'healthy'
}

export function FARDossierShell({
  mode,
  systemRank,
  humanSummary,
  onClose,
  onEdit,
  onRestore,
  children,
}: {
  mode: FarDossierMode
  systemRank: number
  humanSummary: string
  onClose: () => void
  onEdit: () => void
  onRestore: () => void
  children: React.ReactNode
}) {
  const isArchived = Boolean(mode.is_deleted)
  const riskTone = getFarDossierRiskTone(Number(mode.rpn || 0))
  const riskClass = riskTone === 'critical'
    ? 'text-rose-400'
    : riskTone === 'warning'
      ? 'text-amber-400'
      : 'text-emerald-400'

  return (
    <WorkspaceModal
      isOpen
      onClose={onClose}
      size="workspace"
      title="Failure Mode Dossier"
      subtitle={`VECTOR_${mode.id} · ${mode.system_name || 'Unassigned system'} · Rank #${systemRank || '—'}`}
      icon={<Target size={20} />}
      status={isArchived ? <span className="text-[10px] font-semibold text-slate-300">Archived · read-only</span> : undefined}
      footerLeft={(
        <div className="flex flex-wrap items-center gap-3 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
          <span>S {mode.severity}</span>
          <span>O {mode.occurrence}</span>
          <span>D {mode.detection}</span>
          <span className={riskClass}>RPN {mode.rpn}</span>
        </div>
      )}
      footerRight={isArchived ? (
        <ToolbarButton onClick={onRestore} variant="primary">
          <Undo2 size={14} /> Restore failure vector
        </ToolbarButton>
      ) : (
        <ToolbarButton onClick={onEdit} variant="primary">
          <Edit2 size={14} /> Edit failure vector
        </ToolbarButton>
      )}
    >
      <WorkspaceDossierShell
        header={(
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Operational risk summary</p>
            <p className="mt-1 text-sm font-semibold normal-case tracking-normal text-slate-300">{humanSummary}</p>
          </div>
        )}
        body={children}
      />
    </WorkspaceModal>
  )
}
