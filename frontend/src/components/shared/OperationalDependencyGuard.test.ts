import { describe, expect, it } from 'vitest'

import {
  buildLifecycleDependencyGuardResult,
  formatLifecycleDependencyTooltipReason,
} from './OperationalDependencyGuard'

describe('OperationalDependencyGuard', () => {
  it('formats blocker names into a specific tooltip reason', () => {
    const result = buildLifecycleDependencyGuardResult({
      blockers: [
        {
          blockerType: 'external_link',
          blockerEntity: 'external link',
          blockerId: 1,
          blockerName: 'Peer B',
          relationship: 'linked',
        },
        {
          blockerType: 'credential',
          blockerEntity: 'credential',
          blockerId: 2,
          blockerName: 'API Key A',
          relationship: 'attached',
        },
      ],
    })

    expect(result.canPurge).toBe(false)
    expect(formatLifecycleDependencyTooltipReason(result)).toBe(
      'Linked to 2 external links: Peer B, API Key A.',
    )
  })

  it('preserves honest limitation text when detailed blocker names are unavailable', () => {
    const result = buildLifecycleDependencyGuardResult({
      summaryReason: 'Purge is blocked because one or more selected external records are linked or credentialed. Detailed blocker names are not available from the current backend response.',
    })

    expect(result.canPurge).toBe(false)
    expect(formatLifecycleDependencyTooltipReason(result)).toBe(
      'Purge is blocked because one or more selected external records are linked or credentialed. Detailed blocker names are not available from the current backend response.',
    )
  })
})
