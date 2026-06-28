export type LifecycleDependencyBlocker = {
  blockerType: string
  blockerEntity: string
  blockerId?: string | number | null
  blockerName: string
  relationship: string
  detailTarget?: string | null
  archivedAllowed?: boolean
}

export type LifecycleDependencyGuardResult = {
  canPurge: boolean
  blockers: LifecycleDependencyBlocker[]
  summaryReason?: string
  detailedReason?: string
  tooltipReason?: string
}

const describeBlocker = (blocker: LifecycleDependencyBlocker) => blocker.blockerName

export const formatLifecycleDependencyTooltipReason = (result: LifecycleDependencyGuardResult) => {
  if (result.tooltipReason) return result.tooltipReason
  if (!result.blockers.length) return result.summaryReason || result.detailedReason || ''

  const primaryEntity = result.blockers[0]?.blockerEntity || 'records'
  const names = result.blockers.map(describeBlocker).filter(Boolean)
  const label = result.blockers.length === 1 ? primaryEntity : `${primaryEntity}s`
  return `Linked to ${result.blockers.length} ${label}: ${names.join(', ')}.`
}

export const buildLifecycleDependencyGuardResult = ({
  blockers,
  summaryReason,
  detailedReason,
  tooltipReason,
}: {
  blockers?: LifecycleDependencyBlocker[]
  summaryReason?: string
  detailedReason?: string
  tooltipReason?: string
}): LifecycleDependencyGuardResult => {
  const normalizedBlockers = blockers || []
  const canPurge = normalizedBlockers.length === 0 && !summaryReason && !detailedReason && !tooltipReason
  return {
    canPurge,
    blockers: normalizedBlockers,
    summaryReason,
    detailedReason,
    tooltipReason: canPurge ? undefined : (tooltipReason || detailedReason || summaryReason),
  }
}
