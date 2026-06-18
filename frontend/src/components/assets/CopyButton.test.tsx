import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyButton } from './CopyButton'

const toastSpies = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSpies.success,
    error: toastSpies.error,
  },
}))

describe('CopyButton', () => {
  beforeEach(() => {
    vi.useRealTimers()
    toastSpies.success.mockReset()
    toastSpies.error.mockReset()
  })

  it('copies to the clipboard, stops propagation, and resets its state', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText },
    })

    render(<CopyButton value="secret-token" label="API Token" />)

    const button = screen.getByRole('button')
    const stopPropagation = vi.fn()
    fireEvent.click(button, { stopPropagation })

    await act(async () => {
      await Promise.resolve()
    })

    expect(writeText).toHaveBeenCalledWith('secret-token')
    expect(toastSpies.success).toHaveBeenCalledWith('API Token Copied')

    const svg = button.querySelector('svg')
    expect(svg?.innerHTML).toContain('path')

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    const reverted = button.querySelector('svg')
    expect(reverted?.innerHTML).toContain('rect')
  })

  it('uses the default success label when no label is provided', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })

    render(<CopyButton value="secret-token" />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(toastSpies.success).toHaveBeenCalledWith('Value Copied'))
  })

  it('shows an error toast when the clipboard write fails', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })

    render(<CopyButton value="secret-token" />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(toastSpies.error).toHaveBeenCalledWith('Unable to copy value'))
    expect(toastSpies.success).not.toHaveBeenCalled()
  })
})
