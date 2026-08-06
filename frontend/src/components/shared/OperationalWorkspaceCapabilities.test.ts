import { test, expect } from 'vitest'
import { OPERATIONAL_WORKSPACE_CAPABILITY_MATRIX } from './OperationalWorkspace'

test.describe('Operational Workspace Capabilities', () => {
  test('has all required workspace keys', () => {
    const requiredKeys = [
      'monitoring',
      'external',
      'architecture',
      'services',
      'network',
      'assets',
      'far',
      'research',
    ]

    for (const key of requiredKeys) {
      expect(OPERATIONAL_WORKSPACE_CAPABILITY_MATRIX, `Missing key: ${key}`).toHaveProperty(key)
    }
  })

  test('has valid capability tokens and entity labels', () => {
    for (const [key, adapter] of Object.entries(OPERATIONAL_WORKSPACE_CAPABILITY_MATRIX)) {
      expect(adapter.entityLabel, `Missing entityLabel for ${key}`).toBeDefined()
      expect(adapter.entityLabel.length, `Empty entityLabel for ${key}`).toBeGreaterThan(0)
      expect(Array.isArray(adapter.supports), `Supports is not an array for ${key}`).toBe(true)
    }
  })
})
