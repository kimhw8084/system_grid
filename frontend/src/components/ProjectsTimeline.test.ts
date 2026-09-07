import { describe, expect, it } from 'vitest'
import { adaptSchedule } from './ProjectsTimeline'
import { shouldUseProjectsTimeline } from './ProjectsTimeline.route'

describe('PV1 canonical Timeline projection', () => {
  it('accepts only the canonical project Timeline route and decodes the project ID', () => {
    expect(shouldUseProjectsTimeline('/projects/project%201/timeline')).toEqual({ projectId: 'project 1' })
    expect(shouldUseProjectsTimeline('/projects/project-1/timeline/')).toEqual({ projectId: 'project-1' })
    expect(shouldUseProjectsTimeline('/projects?view=timeline&id=1')).toBeNull()
    expect(shouldUseProjectsTimeline('/projects/project-1/work')).toBeNull()
  })

  it('projects one canonical task graph into Gantt rows without losing typed edges, baseline, or forecast', () => {
    const project = adaptSchedule({
      project: { id: 'p1', display_key: 'PRJ-1', name: 'Schedule', phase: 'Executing', owner_id: 'owner', target_date: '2026-10-12' },
      calendar: { timezone: 'America/Chicago', working_weekdays: [0, 1, 2, 3, 4], exceptions: [], revision: 2 },
      analysis: { rows: [], critical_task_ids: [] },
      tasks: [
        { id: 'a', title: 'A', kind: 'Task', order_key: 1024, start_date: '2026-10-05', end_date: '2026-10-07' },
        { id: 'b', title: 'B', kind: 'Task', order_key: 2048, start_date: '2026-10-08', end_date: '2026-10-09' },
      ],
      dependencies: [
        { id: 'edge-fs', predecessor_id: 'a', successor_id: 'b', dependency_type: 'FS', lag_days: 0, active: true, revision: 3 },
        { id: 'edge-ss', predecessor_id: 'a', successor_id: 'b', dependency_type: 'SS', lag_days: -1, active: true, revision: 1 },
      ],
      baselines: [{ id: 'base', is_default: true, created_at: '2026-10-01T00:00:00Z', label: 'Approved', snapshot: { tasks: [{ id: 'b', start_date: '2026-10-07', end_date: '2026-10-08' }] } }],
      forecast: { tasks: [{ task_id: 'b', start_date: '2026-10-12', end_date: '2026-10-13' }] },
    })
    const task = project.tasks.find((item: any) => item.id === 'b')
    expect(task.dependencies_json).toEqual([
      { id: 'a', type: 'FS', lag_days: 0, edge_id: 'edge-fs', revision: 3 },
      { id: 'a', type: 'SS', lag_days: -1, edge_id: 'edge-ss', revision: 1 },
    ])
    expect(task.metadata_json).toMatchObject({ baseline_start_date: '2026-10-07', baseline_end_date: '2026-10-08' })
    expect(task).toMatchObject({ forecast_start_date: '2026-10-12', forecast_end_date: '2026-10-13' })
    expect(project.__pv1_calendar.revision).toBe(2)
  })
})
