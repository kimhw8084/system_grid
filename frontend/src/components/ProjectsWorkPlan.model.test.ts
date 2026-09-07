import { describe, expect, it } from 'vitest'
import { buildWorkRows, parseTaskImportText, treeGridAria, transitionLabel } from './ProjectsWorkPlan.model'

describe('P05 work plan model', () => {
  it('keeps collapsed descendants out of the accessible row count', () => {
    const items = [
      { id: 'parent', title: 'Parent', parent_task_id: null, order_key: '1024', kind: 'Summary' },
      { id: 'child', title: 'Child', parent_task_id: 'parent', order_key: '1024', kind: 'Task' },
    ]
    expect(treeGridAria(items).rowCount).toBe(2)
    expect(treeGridAria(items, new Set(['parent'])).rowCount).toBe(3)
    expect(buildWorkRows(items, new Set(['parent']))[1].depth).toBe(2)
  })

  it('parses both CSV and TSV previews without creating records', () => {
    expect(parseTaskImportText('title,status\nOne,To Do')).toEqual([{ title: 'One', status: 'To Do' }])
    expect(parseTaskImportText('title\tprogress\nTwo\t50', 'tsv')).toEqual([{ title: 'Two', progress: '50' }])
  })

  it('names the waiting projection instead of claiming readiness', () => {
    expect(transitionLabel('In progress', true)).toBe('Unblock / waiting')
  })
})
