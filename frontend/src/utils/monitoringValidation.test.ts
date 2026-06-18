import { describe, expect, it } from 'vitest'
import { buildMonitoringFormErrors, getMonitoringTabErrorCounts, isMonitoringFieldRequired } from './monitoringValidation'

describe('monitoringValidation', () => {
  it('tracks the required fields used by the monitoring form', () => {
    expect(isMonitoringFieldRequired('title')).toBe(true)
    expect(isMonitoringFieldRequired('severity')).toBe(true)
    expect(isMonitoringFieldRequired('owner_team')).toBe(false)
  })

  it('builds validation errors for missing required fields and unsafe URLs', () => {
    const errors = buildMonitoringFormErrors({
      title: '   ',
      category: '',
      status: '',
      severity: '',
      monitoring_url: 'javascript:alert(1)',
    })

    expect(errors).toMatchObject({
      title: 'Title is required.',
      category: 'Category is required.',
      status: 'Status is required.',
      severity: 'Severity is required.',
      monitoring_url: 'Monitoring URL contains unsafe content.',
    })
  })

  it('accepts valid http and https URLs', () => {
    expect(buildMonitoringFormErrors({ title: 'Title', category: 'infra', status: 'Live', severity: 'High', monitoring_url: 'https://example.com/path' })).toEqual({})
    expect(buildMonitoringFormErrors({ title: 'Title', category: 'infra', status: 'Live', severity: 'High', monitoring_url: 'http://example.com' })).toEqual({})
  })

  it('reports malformed monitoring URLs that fail URL parsing', () => {
    expect(buildMonitoringFormErrors({
      title: 'Title',
      category: 'infra',
      status: 'Live',
      severity: 'High',
      monitoring_url: 'http://',
    })).toEqual({
      monitoring_url: 'Monitoring URL must be a valid http/https URL.',
    })
  })

  it('groups errors by tab for focused form feedback', () => {
    const counts = getMonitoringTabErrorCounts({
      title: 'required',
      owner_team: 'required',
      monitoring_url: 'invalid',
      check_interval: 'required',
      logic_rule: 'broken',
      severity: 'required',
      notification_method: 'required',
      recovery_docs: 'required',
    })

    expect(counts).toEqual({
      context: 3,
      logic: 2,
      alerting: 3,
    })
  })
})
