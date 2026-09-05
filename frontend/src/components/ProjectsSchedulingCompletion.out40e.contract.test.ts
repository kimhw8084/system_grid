import { describe, expect, it } from 'vitest'
import { syncTimelineDependencyButtonGlyph, timelineDependencyControlLabel, timelineDependencyRelationMatches } from './ProjectsSchedulingCompletion'

const fixture = () => ({
  id: 901,
  name: 'P01 — Timeline keyboard dependency fixture',
  metadata_json: { adoption_state: 'Pilot' },
  tasks: [
    { id: 9011, name: 'Timeline task A', dependencies_json: [], metadata_json: {} },
    { id: 9012, name: 'Timeline task B', dependencies_json: [9011], metadata_json: {} },
    { id: 9013, name: 'Timeline task C', dependencies_json: [], metadata_json: {} },
  ],
})

describe('OUT-40 Slice E Timeline dependency keyboard contract', () => {
  it('names dependency controls deterministically for source, target, and cancellation states', () => {
    expect(timelineDependencyControlLabel(null, 9011, 'Timeline task A')).toBe('Start dependency from Timeline task A')
    const source = { id: '9011', name: 'Timeline task A' }
    expect(timelineDependencyControlLabel(source, 9011, 'Timeline task A')).toBe('Cancel dependency from Timeline task A')
    expect(timelineDependencyControlLabel(source, 9013, 'Timeline task C')).toBe('Add dependency from Timeline task A to Timeline task C')
  })

  it('recognizes canonical dependency presence without inventing a parallel dependency model', () => {
    const project = fixture()
    expect(timelineDependencyRelationMatches(project, 9011, 9012, true)).toBe(true)
    expect(timelineDependencyRelationMatches(project, 9011, 9013, false)).toBe(true)
    project.tasks[2].dependencies_json = [{ id: '9011', type: 'FS', lag_days: 0 }]
    expect(timelineDependencyRelationMatches(project, '9011', '9013', true)).toBe(true)
    expect(timelineDependencyRelationMatches(project, '9011', '9013', false)).toBe(false)
  })
  it('keeps Timeline dependency decoration idempotent when the glyph is already rendered', () => {
    let value: string | null = '↗'
    let writes = 0
    const button = {
      get textContent() { return value },
      set textContent(next: string | null) { writes += 1; value = next },
    }
    expect(syncTimelineDependencyButtonGlyph(button)).toBe('↗')
    expect(writes).toBe(0)
    value = ''
    expect(syncTimelineDependencyButtonGlyph(button)).toBe('↗')
    expect(writes).toBe(1)
  })

})
