export type WorkStatus = 'To Do' | 'In progress' | 'Blocked' | 'Review' | 'Done' | 'Cancelled'

export const WORK_STATUSES: WorkStatus[] = ['To Do', 'In progress', 'Blocked', 'Review', 'Done', 'Cancelled']
export const BOARD_STATUSES: WorkStatus[] = ['To Do', 'In progress', 'Blocked', 'Review', 'Done']

export const FOCUS_BUCKETS: Record<number, string> = {
  1: 'Overdue blocker or decision',
  2: 'Overdue mandatory critical work',
  3: 'Due today',
  4: 'Active critical-path work',
  5: 'In progress or review',
  6: 'Due within three working days',
  7: 'Overdue follow-up',
  8: 'Other assigned work',
}

export type WorkRow = {
  task: any
  depth: number
  parentId: string | null
  children: string[]
  expanded: boolean
  posInSet: number
  setSize: number
}

export function buildWorkRows(items: any[], expanded: Set<string> = new Set()): WorkRow[] {
  const byParent = new Map<string, any[]>()
  for (const task of items) {
    const parent = task.parent_task_id == null ? '' : String(task.parent_task_id)
    const siblings = byParent.get(parent) || []
    siblings.push(task)
    byParent.set(parent, siblings)
  }
  for (const siblings of byParent.values()) siblings.sort((a, b) => Number(a.order_key || 0) - Number(b.order_key || 0) || String(a.id).localeCompare(String(b.id)))
  const visible: WorkRow[] = []
  const visit = (parentId: string | null, depth: number) => {
    const siblings = byParent.get(parentId || '') || []
    siblings.forEach((task, index) => {
      const id = String(task.id)
      const children = (byParent.get(id) || []).map((item) => String(item.id))
      const isExpanded = children.length > 0 && expanded.has(id)
      visible.push({ task, depth, parentId, children, expanded: isExpanded, posInSet: index + 1, setSize: siblings.length })
      if (isExpanded) visit(id, Math.min(depth + 1, 8))
    })
  }
  visit(null, 1)
  return visible
}

export function treeGridAria(items: any[], expanded: Set<string> = new Set()) {
  const rows = buildWorkRows(items, expanded)
  return { rows, rowCount: rows.length + 1, unfilteredCount: items.length }
}

export function focusDisplayItems(response: any): any[] {
  return Array.isArray(response?.items) ? response.items : []
}

export function parseTaskImportText(text: string, format: 'csv' | 'tsv' = 'csv'): Record<string, string>[] {
  const delimiter = format === 'tsv' ? '\t' : ','
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (!lines.length) return []
  const parse = (line: string) => line.split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ''))
  const headers = parse(lines[0]).map((header) => header.toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1, 501).map((line) => {
    const values = parse(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']))
  })
}

export function transitionLabel(status: string, isBlocked = false): string {
  if (isBlocked) return 'Unblock / waiting'
  return WORK_STATUSES.includes(status as WorkStatus) ? status : 'Unknown status'
}

