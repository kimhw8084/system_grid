import { describe, expect, it } from 'vitest'
import {
  PROJECT_GOLDEN_VIEWS,
  PROJECT_TASK_STATUSES,
  buildCrossProjectDependencies,
  buildOwnerWorkload,
  buildPortfolioMetrics,
  buildProjectAttentionItems,
  createProjectTask,
  diversifyAttentionItems,
  filterProjectsForGoldenView,
  getCriticalTaskIds,
  getDaysToDue,
  getProjectExecutionProgress,
  getProjectHealth,
  getProjectMilestones,
  getTaskProgress,
  moveProjectTaskStatus,
  normalizeProjectFilterValue,
  normalizeTaskStatus,
  projectFingerprint,
  resolveProjectGoldenView,
  updateProjectTask,
} from './ProjectsGolden.model'

const NOW = new Date('2026-08-28T12:00:00-05:00')
const projects: any[] = [
  {
    id: 1, name: 'Alpha', status: 'In Progress', priority: 'Highest', owner: 'alice', man_hours_saved: 120,
    metadata_json: { baseline_end_date: '2026-08-31' }, end_date: '2026-09-05',
    tasks: [
      { id: 11, name: 'Blocked path', status: 'Blocked', progress: 30, owner: '', priority: 'High', end_date: '2026-08-27T23:30:00Z', dependencies_json: [] },
      { id: 12, name: 'Review gate', status: 'Review', progress: 90, owner: 'alice', end_date: '2026-08-30', dependencies_json: [11], metadata_json: { milestone: true } },
      { id: 13, name: 'Done', status: 'Completed', progress: 10, owner: 'bob', end_date: '2026-08-20', dependencies_json: [12] },
    ],
  },
  {
    id: 2, name: 'Beta', status: 'Planning', priority: 'Low', owner: 'bob',
    tasks: [{ id: 21, name: 'Queued', status: 'To Do', progress: 0, owner: 'bob', end_date: '2026-09-10', dependencies_json: [12] }],
  },
]

describe('Projects execution intelligence model', () => {
  it('keeps six approved management views and the canonical five task states', () => {
    expect(PROJECT_GOLDEN_VIEWS).toEqual(['portfolio', 'board', 'roadmap', 'owners', 'review', 'workspace'])
    expect(PROJECT_TASK_STATUSES).toEqual(['To Do', 'In Progress', 'Blocked', 'Review', 'Completed'])
    expect(resolveProjectGoldenView('review')).toBe('review')
    expect(resolveProjectGoldenView('unknown')).toBe('portfolio')
  })

  it('normalizes ALL filters and preserves unknown task states for diagnostics', () => {
    expect(normalizeProjectFilterValue('all')).toBe('ALL')
    expect(normalizeTaskStatus('Queued Legacy')).toBe('Unknown')
  })

  it('uses calendar-date semantics without UTC day shifting', () => {
    expect(getDaysToDue('2026-08-28T23:30:00Z', NOW)).toBe(0)
    expect(getDaysToDue('2026-08-27T23:30:00Z', NOW)).toBe(-1)
  })

  it('makes completed progress canonical and reopened progress deterministic', () => {
    expect(getTaskProgress(projects[0].tasks[2])).toBe(100)
    const completed = moveProjectTaskStatus(projects[0], 12, 'Completed')
    expect(completed.tasks.find((task: any) => task.id === 12).progress).toBe(100)
    const reopened = moveProjectTaskStatus(completed, 12, 'Review')
    expect(reopened.tasks.find((task: any) => task.id === 12).progress).toBe(90)
  })

  it('returns the original project for a no-op board move', () => {
    expect(moveProjectTaskStatus(projects[0], 12, 'Review')).toBe(projects[0])
  })

  it('derives the dependency-backed critical path without a new persisted score', () => {
    const critical = getCriticalTaskIds(projects[0])
    expect(critical.has(13)).toBe(false)
    expect(critical.has(12)).toBe(true)
    expect(critical.has(11)).toBe(true)
  })

  it('builds milestone and schedule variance from existing schedule truth only', () => {
    const milestones = getProjectMilestones(projects[0], NOW)
    expect(milestones.some((milestone) => milestone.id === 12)).toBe(true)
    expect(getProjectHealth(projects[0], NOW).scheduleVarianceDays).toBe(5)
  })

  it('produces explainable red health from blocked critical and overdue work', () => {
    const health = getProjectHealth(projects[0], NOW)
    expect(health.level).toBe('red')
    expect(health.blockedCritical).toBe(1)
    expect(health.reasons.some((reason) => reason.includes('blocked critical'))).toBe(true)
  })

  it('groups attention into one incident per task instead of duplicating reasons', () => {
    const attention = buildProjectAttentionItems(projects, NOW)
    const task11 = attention.filter((item) => item.taskId === 11)
    expect(task11).toHaveLength(1)
    expect(task11[0].reasons).toContain('blocked')
    expect(task11[0].reasons).toContain('overdue')
    expect(task11[0].reasons).toContain('unassigned')
    expect(task11[0].reasonLabels.some((label) => label.includes('priority'))).toBe(true)
  })

  it('diversifies a constrained attention queue across projects first', () => {
    const alpha = buildProjectAttentionItems(projects, NOW)[0]
    const items = [
      alpha,
      { ...alpha, id: 'extra-alpha' },
      { ...alpha, id: 'beta-risk', projectId: 2, projectName: 'Beta', taskId: 21, taskName: 'Queued' },
    ]
    const diversified = diversifyAttentionItems(items, 2)
    expect(diversified.map((item) => item.projectId)).toEqual([1, 2])
  })

  it('uses task-weighted portfolio progress while retaining project average context', () => {
    const metrics = buildPortfolioMetrics(projects, NOW)
    expect(metrics.tasks).toBe(4)
    expect(metrics.overallProgress).toBe(Math.round((30 + 90 + 100 + 0) / 4))
    expect(metrics.projectAverageProgress).not.toBeUndefined()
  })

  it('sorts and filters deterministically including watched-only state', () => {
    expect(filterProjectsForGoldenView(projects, '', 'ALL', 'all', 'order')).toHaveLength(2)
    expect(filterProjectsForGoldenView(projects, '', 'ALL', 'ALL', 'order', ['2'], true).map((project) => project.id)).toEqual([2])
    expect(filterProjectsForGoldenView(projects, '', 'ALL', 'ALL', 'health', [], false, NOW)[0].id).toBe(1)
  })

  it('derives owner workload and cross-project dependencies from existing tasks', () => {
    const owners = buildOwnerWorkload(projects, NOW)
    expect(owners.some((row) => row.owner === 'Unassigned' && row.blocked === 1)).toBe(true)
    const cross = buildCrossProjectDependencies(projects)
    expect(cross.some((row) => row.fromProjectId === 1 && row.toProjectId === 2)).toBe(true)
  })

  it('supports task quick capture/edit immutably', () => {
    const added = createProjectTask(projects[1], { id: 22, name: 'Captured', status: 'To Do' })
    expect(added.tasks).toHaveLength(2)
    expect(projects[1].tasks).toHaveLength(1)
    const edited = updateProjectTask(added, 22, { owner: 'alice' })
    expect(edited.tasks.find((task: any) => task.id === 22).owner).toBe('alice')
  })

  it('creates a stable stale-write fingerprint over mutation-relevant project truth', () => {
    expect(projectFingerprint(projects[0])).toBe(projectFingerprint({ ...projects[0] }))
    expect(projectFingerprint(projects[0])).not.toBe(projectFingerprint({ ...projects[0], status: 'Paused' }))
  })

  it('retains project execution progress compatibility', () => {
    expect(getProjectExecutionProgress(projects[0])).toBe(73)
  })
})
