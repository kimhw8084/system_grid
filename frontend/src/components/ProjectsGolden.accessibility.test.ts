import { afterEach, describe, expect, it } from 'vitest'

import {
  handleProjectNavigationKeyDown,
  syncProjectNavigationTabStops,
} from './shared/WorkspaceModal'

afterEach(() => {
  document.body.innerHTML = ''
})

function primaryNavigation() {
  document.body.innerHTML = `
    <div data-project-primary-nav="true">
      <nav aria-label="Project intent navigation">
        <button type="button">Overview</button>
        <button type="button" aria-current="page">Work</button>
        <button type="button">Plan</button>
      </nav>
      <div data-project-progressive-modes="work">
        <button type="button" aria-current="page">Tasks</button>
        <button type="button">Board</button>
      </div>
    </div>
  `
  syncProjectNavigationTabStops(document)
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
}

describe('Projects keyboard navigation accessibility', () => {
  it('creates one roving tab stop per Project navigation group and visible focus hooks', () => {
    const [overview, work, plan, tasks, board] = primaryNavigation()

    expect([overview.tabIndex, work.tabIndex, plan.tabIndex]).toEqual([-1, 0, -1])
    expect([tasks.tabIndex, board.tabIndex]).toEqual([0, -1])
    for (const button of [overview, work, plan, tasks, board]) {
      expect(button.dataset.projectKeyboardNav).toBe('true')
      expect(button.classList.contains('focus-visible:ring-2')).toBe(true)
    }
  })

  it('moves primary intent focus with ArrowLeft/ArrowRight and Home/End without changing the view', () => {
    const [overview, work, plan] = primaryNavigation()
    work.focus()

    handleProjectNavigationKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }))
    // A synthetic KeyboardEvent without a target is intentionally ignored.
    expect(document.activeElement).toBe(work)

    const right = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    work.dispatchEvent(right)
    expect(right.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(plan)
    expect(plan.getAttribute('aria-current')).toBeNull()

    const home = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })
    plan.dispatchEvent(home)
    expect(document.activeElement).toBe(overview)

    const left = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    overview.dispatchEvent(left)
    expect(document.activeElement).toBe(plan)

    const end = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })
    plan.dispatchEvent(end)
    expect(document.activeElement).toBe(plan)
  })

  it('keeps progressive Work modes in their own roving keyboard group', () => {
    const [, , , tasks, board] = primaryNavigation()
    tasks.focus()

    const right = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    tasks.dispatchEvent(right)
    expect(document.activeElement).toBe(board)

    const left = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    board.dispatchEvent(left)
    expect(document.activeElement).toBe(tasks)
  })
})
