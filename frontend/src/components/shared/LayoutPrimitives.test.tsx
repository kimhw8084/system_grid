import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ToolbarButton } from './LayoutPrimitives'

describe('ToolbarButton', () => {
  it('keeps the shared inline layout contract', () => {
    render(<ToolbarButton>Save</ToolbarButton>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.className).toContain('inline-flex')
    expect(button.className).toContain('items-center')
    expect(button.className).toContain('gap-2')
    expect(button.className).toContain('whitespace-nowrap')
    expect(button.className).toContain('shrink-0')
  })
})
