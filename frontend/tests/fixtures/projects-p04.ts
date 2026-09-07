export const p04ManagerFixture = {
  project: {
    name: 'Qualification Analysis Automation',
    objective: 'Reduce manual review time while preserving qualification evidence.',
    problem: 'Manual qualification review delays engineering decisions and obscures evidence handoffs.',
    owner_id: 'mina.chen',
    phase: 'Executing',
    priority: 'High',
    start_date: '2026-10-05',
    target_date: '2026-10-30',
    architecture_assessment: 'Yes',
    outcome_phase: 'Pilot',
  },
  delivery: { percent: 58, method: 'Weighted by canonical planning weight.' },
  milestone: { title: 'Pilot validation', point_date: '2026-10-23' },
  blocker: { reason: 'Validation dataset approval', resolver_id: 'mina.chen', review_date: '2026-10-20' },
  outcome: { phase: 'Pilot', result: 'Unassessed', display: 'Not yet verified' },
} as const
