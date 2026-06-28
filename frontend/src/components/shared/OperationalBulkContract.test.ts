import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./WorkspaceToast', () => ({
  showWorkspaceToast: vi.fn(),
}))

import {
  BULK_NO_CHANGES_MESSAGE,
  showOperationalBulkResultToast,
} from './OperationalBulkContract'
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
