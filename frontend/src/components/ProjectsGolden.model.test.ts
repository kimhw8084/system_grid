import { describe, expect, it } from 'vitest'
import {
  PROJECT_TASK_STATUSES,
  buildPortfolioMetrics,
  buildProjectAttentionItems,
  filterProjectsForGoldenView,
  getProjectExecutionProgress,
  moveProjectTaskStatus,
  normalizeProjectFilterValue,
  resolveProjectGoldenView,
} from './ProjectsGolden.model'

const NOW = new Date('2026-08-28T12:00:00Z')

const projects = [
  {
    id: 1,
    name: 'Alpha',
    status: 'In Progress',
    priority: 'Highest',
    owner: 'alice',
    man_hours_saved: 120,
    tasks: [
      { id: 11, name: 'Blocked path', status: 'Blocked', progress: 30, owner: '', end_date: '2026-08-27T12:00:00Z' },
      { id: 12, name: 'Review gate', status: 'Review', progress: 90, owner: 'alice', end_date: '2026-08-30T12:00:00Z' },
      { id: 13, name: 'Done', status: 'Completed', progress: 10, owner: 'bob', end_date: '2026-08-20T12:00:00Z' },
    ],
  },
  {
    id: 2,
    name: 'Beta',
    status: 'Planning',
    priority: 'Low',
    owner: 'bob',
    tasks: [{ id: 21, name: 'Queued', status: 'To Do', progress: 0, owner: 'bob', end_date: '2026-09-10T12:00:00Z' }],
  },
]

describe('Projects golden model', () => {
  it('normalizes every all-priority spelling to the canonical ALL token', () => {
    expect(normalizeProjectFilterValue('ALL')).toBe('ALL')
    expect(normalizeProjectFilterValue('all')).toBe('ALL')
    expect(normalizeProjectFilterValue(' All ')).toBe('ALL')
  })

  it('keeps the approved view set deterministic for deep links', () => {
    expect(resolveProjectGoldenView('board')).toBe('board')
    expect(resolveProjectGoldenView('workspace')).toBe('workspace')
    expect(resolveProjectGoldenView('unknown')).toBe('portfolio')
  })

  it('uses the same five-state lifecycle already consumed by Precision Gantt', () => {
    expect(PROJECT_TASK_STATUSES).toEqual(['To Do', 'In Progress', 'Blocked', 'Review', 'Completed'])
  })

  it('derives completion from the same task truth instead of a second persisted score', () => {
    expect(getProjectExecutionProgress(projects[0])).toBe(73)
  })

  it('surfaces blocked, overdue, due-soon and unassigned execution signals', () => {
    const attention = buildProjectAttentionItems(projects, NOW)
    expect(attention.some((item) => item.kind === 'blocked' && item.taskId === 11)).toBe(true)
    expect(attention.some((item) => item.kind === 'overdue' && item.taskId === 11)).toBe(true)
    expect(attention.some((item) => item.kind === 'due-soon' && item.taskId === 12)).toBe(true)
    expect(attention.some((item) => item.kind === 'unassigned' && item.taskId === 11)).toBe(true)
  })

  it('moves board work by updating the existing task status only', () => {
    const moved = moveProjectTaskStatus(projects[0], 12, 'Completed')
    expect(moved.tasks.find((task: any) => task.id === 12)?.status).toBe('Completed')
    expect(projects[0].tasks.find((task: any) => task.id === 12)?.status).toBe('Review')
  })

  it('applies search/status/priority filters with canonical ALL behavior', () => {
    expect(filterProjectsForGoldenView(projects, '', 'ALL', 'all')).toHaveLength(2)
    expect(filterProjectsForGoldenView(projects, 'alp', 'ALL', 'ALL').map((project) => project.id)).toEqual([1])
    expect(filterProjectsForGoldenView(projects, '', 'Planning', 'Low').map((project) => project.id)).toEqual([2])
  })

  it('builds portfolio metrics without adding backend schema', () => {
    const metrics = buildPortfolioMetrics(projects, NOW)
    expect(metrics.projects).toBe(2)
    expect(metrics.blocked).toBe(1)
    expect(metrics.overdue).toBe(1)
    expect(metrics.dueSoon).toBe(1)
    expect(metrics.manHoursSaved).toBe(120)
  })
})
