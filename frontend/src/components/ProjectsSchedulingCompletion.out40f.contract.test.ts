import { describe, expect, it } from 'vitest'
import {
  projectTaskDrawerChecklistLabels,
  projectTaskDrawerDependencyLabel,
  syncProjectTaskDrawerAccessibleName,
} from './ProjectsSchedulingCompletion'

describe('OUT-40 Slice F Task Drawer accessibility contract', () => {
  it('writes an accessible name only when it changes', () => {
    const attributes = new Map<string, string>()
    let writes = 0
    const control = {
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) => { writes += 1; attributes.set(name, value) },
    }
    expect(syncProjectTaskDrawerAccessibleName(control, 'Remove checklist item Verify threshold')).toBe(true)
    expect(syncProjectTaskDrawerAccessibleName(control, 'Remove checklist item Verify threshold')).toBe(false)
    expect(attributes.get('aria-label')).toBe('Remove checklist item Verify threshold')
    expect(writes).toBe(1)
  })

  it('builds task-specific checklist labels', () => {
    expect(projectTaskDrawerChecklistLabels('Yield Guardian task B', 'Verify threshold')).toEqual({
      toggle: 'Toggle checklist item Verify threshold',
      remove: 'Remove checklist item Verify threshold',
      addInput: 'Add checklist item for Yield Guardian task B',
      addButton: 'Add checklist item for Yield Guardian task B',
    })
  })

  it('builds exact dependency labels', () => {
    expect(projectTaskDrawerDependencyLabel('Yield Guardian task B', 'Yield Guardian task A', 'remove')).toBe('Remove dependency Yield Guardian task A')
    expect(projectTaskDrawerDependencyLabel('Yield Guardian task B', null, 'add')).toBe('Add selected dependency to Yield Guardian task B')
  })
})
