import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./WorkspaceToast', () => ({
  showWorkspaceToast: vi.fn(),
}))

import {
  showOperationalBulkResultToast,
} from './OperationalBulkContract'
import { OPERATIONAL_ACTION_LABELS } from './OperationalActionLabels'
import {
  buildLifecycleDependencyGuardResult,
  formatLifecycleDependencyTooltipReason,
} from './OperationalDependencyGuard'
import { OperationalDisabledActionTooltip } from './OperationalDisabledActionTooltip'
import { BULK_NO_CHANGES_MESSAGE } from './OperationalLifecycleToasts'
import { OperationalRowActionMenu } from './OperationalRowActionMenu'
import { showWorkspaceToast } from './WorkspaceToast'

const mockedShowWorkspaceToast = vi.mocked(showWorkspaceToast)

describe('showOperationalBulkResultToast wording', () => {
  beforeEach(() => {
    mockedShowWorkspaceToast.mockReset()
  })

  it('uses selected records for one-of-one updates', () => {
    showOperationalBulkResultToast({
      action: 'update',
      totalSelected: 1,
      changedCount: 1,
      fieldLabel: 'Status',
    })

    expect(mockedShowWorkspaceToast).toHaveBeenCalledWith(
      'Updated 1 of 1 selected records: Status changed.',
      { type: 'success' },
    )
  })

  it('uses selected records for one-of-one archive', () => {
    showOperationalBulkResultToast({
      action: 'archive',
      totalSelected: 1,
      changedCount: 1,
    })

    expect(mockedShowWorkspaceToast).toHaveBeenCalledWith(
      'Archived 1 of 1 selected records.',
      { type: 'success' },
    )
  })

  it('uses selected records for one-of-one restore', () => {
    showOperationalBulkResultToast({
      action: 'restore',
      totalSelected: 1,
      changedCount: 1,
    })

    expect(mockedShowWorkspaceToast).toHaveBeenCalledWith(
      'Restored 1 of 1 selected records.',
      { type: 'success' },
    )
  })

  it('uses selected records for one-of-one purge', () => {
    showOperationalBulkResultToast({
      action: 'purge',
      totalSelected: 1,
      changedCount: 1,
    })

    expect(mockedShowWorkspaceToast).toHaveBeenCalledWith(
      'Permanently purged 1 of 1 selected records.',
      { type: 'success' },
    )
  })

  it('allows revert for purge when truthful revert data is supplied', () => {
    const onRevert = vi.fn()

    showOperationalBulkResultToast({
      action: 'purge',
      totalSelected: 1,
      changedCount: 1,
      onRevert,
    })

    expect(mockedShowWorkspaceToast).toHaveBeenCalledWith(
      'Permanently purged 1 of 1 selected records.',
      { type: 'success', onRevert },
    )
  })

  it('keeps the no-op wording exact', () => {
    showOperationalBulkResultToast({
      action: 'update',
      totalSelected: 1,
      changedCount: 0,
      fieldLabel: 'Status',
    })

    expect(mockedShowWorkspaceToast).toHaveBeenCalledWith(
      BULK_NO_CHANGES_MESSAGE,
      { type: 'success' },
    )
  })

  it('keeps partial wording exact with selected records', () => {
    showOperationalBulkResultToast({
      action: 'update',
      totalSelected: 3,
      changedCount: 1,
      unchangedCount: 2,
      fieldLabel: 'Environment',
    })

    expect(mockedShowWorkspaceToast).toHaveBeenCalledWith(
      'Updated 1 of 3 selected records: Environment changed. 2 already matched.',
      { type: 'success' },
    )
  })
})

describe('shared lifecycle contract wiring', () => {
  it('keeps active purge labels free of Purge Selection wording', () => {
    expect(OPERATIONAL_ACTION_LABELS.purge).toBe('Purge')
    expect(OPERATIONAL_ACTION_LABELS.purgeSelection).toBe('Purge')
    expect(OPERATIONAL_ACTION_LABELS.purgeSelection).not.toContain('Selection')
  })

  it('renders disabled tooltip host with label and reason separately', () => {
    render(
      React.createElement(OperationalDisabledActionTooltip, {
        disabled: true,
        reason: 'Blocked by linked credentials.',
        children: React.createElement('button', { type: 'button', disabled: true }, OPERATIONAL_ACTION_LABELS.purge),
      }),
    )

    expect(screen.getByText('Purge')).toBeTruthy()
    expect(screen.getByText('Blocked by linked credentials.')).toBeTruthy()
    const host = document.querySelector('[data-disabled-tooltip-host="true"]')
    expect(host?.getAttribute('title')).toBe('Blocked by linked credentials.')
    expect(host?.getAttribute('tabindex')).toBe('0')
  })

  it('uses the disabled tooltip wrapper in row action menus', () => {
    render(
      React.createElement(OperationalRowActionMenu, {
        cursorX: 120,
        cursorY: 120,
        meta: 'ID 7 · Service',
        title: 'Synthetic Service',
        onClose: () => {},
        sections: [{
          id: 'archive',
          columns: 1,
          items: [{
            id: 'purge',
            label: OPERATIONAL_ACTION_LABELS.purge,
            icon: () => null,
            disabled: true,
            disabledReason: 'Purge is unavailable because logical-services backend does not support truthful purge/revert yet.',
            onClick: () => {},
          }],
        }],
      }),
    )

    expect(screen.getByText('Purge')).toBeTruthy()
    const host = document.querySelector('[data-disabled-tooltip-host="true"]')
    expect(host?.getAttribute('title')).toContain('logical-services backend does not support truthful purge/revert yet')
  })

  it('formats dependency blockers into a shared tooltip reason', () => {
    const result = buildLifecycleDependencyGuardResult({
      blockers: [
        {
          blockerType: 'external_link',
          blockerEntity: 'external link',
          blockerId: 1,
          blockerName: 'Billing API',
          relationship: 'linked',
        },
        {
          blockerType: 'credential',
          blockerEntity: 'credential',
          blockerId: 2,
          blockerName: 'vault/payments-token',
          relationship: 'attached',
        },
      ],
    })

    expect(result.canPurge).toBe(false)
    expect(formatLifecycleDependencyTooltipReason(result)).toBe(
      'Linked to 2 external links: Billing API, vault/payments-token.',
    )
  })
})
