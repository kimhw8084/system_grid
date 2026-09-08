import { describe, expect, it } from 'vitest'
import { readPV1PerformanceMetrics, recordApiTiming, routeClass } from './pv1Performance'

describe('PV1 field observability contract', () => {
  it('records route/command boundaries with safe attribution and no identifiers', () => {
    expect(routeClass('/api/v2/projects/project-1/commands')).toBe('/api/v2/projects/:projectId/commands')
    recordApiTiming('/api/v2/projects/project-1/commands', 'POST', 24, 409, {
      requestId: 'request-1',
      commandId: 'command-1',
      projectionLagMs: 42,
      scheduleCalculationVersion: 'schedule-v1',
      scheduleCalculationDurationMs: 7,
    })
    const metric = readPV1PerformanceMetrics().at(-1)
    expect(metric?.kind).toBe('command')
    expect(metric?.workspace).toBe('projects')
    expect(metric?.status_class).toBe('4xx')
    expect(metric?.command_id_present).toBe(true)
    expect(metric?.projection_lag_ms).toBe(42)
    expect(metric).not.toHaveProperty('requestId')
    expect(metric).not.toHaveProperty('commandId')
    expect(metric).not.toHaveProperty('project-1')
  })
})
