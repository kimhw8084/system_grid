import { describe, expect, it } from 'vitest'
import { shouldUseProjectsWorkPlan } from './ProjectsWorkPlan'

describe('P05 route contract', () => {
  it('supports My day, Work, Board, and Plan deep links', () => {
    expect(shouldUseProjectsWorkPlan('/projects/my-day')).toMatchObject({ scope: 'my-day' })
    expect(shouldUseProjectsWorkPlan('/projects/p1/work')).toMatchObject({ scope: 'work', projectId: 'p1', board: false })
    expect(shouldUseProjectsWorkPlan('/projects/p1/work', '?layout=board')).toMatchObject({ scope: 'work', board: true })
    expect(shouldUseProjectsWorkPlan('/projects/p1/plan')).toMatchObject({ scope: 'plan', projectId: 'p1' })
  })
})
