import { describe, expect, it } from 'vitest'
import { formatOutcomeValue, shouldUseProjectsOutcomes } from './ProjectsOutcomes'

describe('Projects Outcomes route and display helpers', () => {
  it('recognizes canonical and encoded project outcome routes', () => {
    expect(shouldUseProjectsOutcomes('/projects/project-9/outcomes')).toEqual({ projectId: 'project-9' })
    expect(shouldUseProjectsOutcomes('/projects/project%209/outcomes/')).toEqual({ projectId: 'project 9' })
    expect(shouldUseProjectsOutcomes('/projects/project-9/home')).toBeNull()
  })

  it('does not invent missing outcome values', () => {
    expect(formatOutcomeValue(null, '%')).toBe('Not recorded')
    expect(formatOutcomeValue('80', '%')).toBe('80 %')
  })
})
