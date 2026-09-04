import { describe, expect, it } from 'vitest'
import { buildTaskKeyboardMovePlan, syncTaskKeyboardMoveButtonGlyph, taskKeyboardMoveRelationMatches } from './ProjectsSchedulingCompletion'

const fixture = () => ({
  id: 901,
  name: 'P01 — Yield Guardian',
  tasks: [
    { id: 9011, name: 'Yield Guardian task A', order_index: 10, metadata_json: {} },
    { id: 9012, name: 'Yield Guardian task B', order_index: 20, metadata_json: {} },
    { id: 90121, name: 'Yield Guardian task B child', order_index: 30, metadata_json: { wbs_parent_id: 9012 } },
    { id: 9013, name: 'Yield Guardian task C', order_index: 40, metadata_json: {} },
  ],
})

describe('OUT-40 Slice D task keyboard sibling reorder contract', () => {
  it('plans same-parent earlier/later movement through the existing before-target drag semantics', () => {
    const project = fixture()
    expect(buildTaskKeyboardMovePlan(project, 9012, 'earlier')).toEqual({
      taskId: '9012',
      direction: 'earlier',
      neighborId: '9011',
      dragTaskId: '9012',
      dropTargetId: '9011',
    })
    expect(buildTaskKeyboardMovePlan(project, 9012, 'later')).toEqual({
      taskId: '9012',
      direction: 'later',
      neighborId: '9013',
      dragTaskId: '9013',
      dropTargetId: '9012',
    })
    expect(buildTaskKeyboardMovePlan(project, 9011, 'earlier')).toBeNull()
    expect(buildTaskKeyboardMovePlan(project, 9013, 'later')).toBeNull()
  })

  it('never treats a WBS child as a root sibling and recognizes persisted neighbor order', () => {
    const project = fixture()
    const earlier = buildTaskKeyboardMovePlan(project, 9012, 'earlier')!
    expect(earlier.neighborId).toBe('9011')

    const persisted = fixture()
    persisted.tasks.find((task) => task.id === 9012)!.order_index = 10
    persisted.tasks.find((task) => task.id === 90121)!.order_index = 20
    persisted.tasks.find((task) => task.id === 9011)!.order_index = 30
    persisted.tasks.find((task) => task.id === 9013)!.order_index = 40
    expect(taskKeyboardMoveRelationMatches(persisted, earlier)).toBe(true)
    expect(persisted.tasks.find((task) => task.id === 90121)?.metadata_json.wbs_parent_id).toBe(9012)
  })

  it('writes keyboard move glyphs only when the rendered label actually changes', () => {
    let value: string | null = '↑'
    let writes = 0
    const button = {
      get textContent() { return value },
      set textContent(next: string | null) { writes += 1; value = next },
    }

    expect(syncTaskKeyboardMoveButtonGlyph(button, 'earlier')).toBe('↑')
    expect(writes).toBe(0)
    expect(syncTaskKeyboardMoveButtonGlyph(button, 'later')).toBe('↓')
    expect(writes).toBe(1)
    expect(value).toBe('↓')
  })

})
