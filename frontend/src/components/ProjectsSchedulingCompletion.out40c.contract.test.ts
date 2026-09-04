// SYSGRID_ALLOW_SOURCE_OWNERSHIP_ASSERTION
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/components/ProjectsSchedulingCompletion.tsx'), 'utf8')

describe('OUT-40 Slice C Board keyboard status move accessibility contract', () => {
  it('keeps Board status movement on the existing Projects mutation path and decorates native alternatives', () => {
    expect(source).toContain("PROJECT_TASK_STATUSES")
    expect(source).toContain("data-project-board-move")
    expect(source).toContain("Move ${taskName} to ${destination}")
    expect(source).toContain("button.style.minHeight = '40px'")
    expect(source).toContain("button.style.minWidth = '40px'")
    expect(source).toContain("queryClient.getMutationCache().subscribe")
    expect(source).toContain("mutation?.options?.scope?.id !== 'projects-authoritative-write'")
  })

  it('announces exact mutation outcome and restores focus to the moved Board card', () => {
    expect(source).toContain('data-project-board-live-status="true"')
    expect(source).toContain('role="status"')
    expect(source).toContain('aria-live="polite"')
    expect(source).toContain('data-project-board-focus-target')
    expect(source).toContain('card.focus({ preventScroll: true })')
    expect(source).toContain('moved to ${pending.toStatus}')
    expect(source).toContain('Could not move ${pending.taskName} to ${pending.toStatus}')
  })
})
