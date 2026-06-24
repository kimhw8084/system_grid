import { describe, expect, it } from 'vitest'

import { parseOperationalApiValidationError } from './OperationalFieldValidation'

describe('parseOperationalApiValidationError', () => {
  it('parses JSON strings with field_errors', () => {
    expect(
      parseOperationalApiValidationError('{"field_errors":{"name":"Required"},"detail":"Validation failed"}')
    ).toEqual({
      fieldErrors: { name: 'Required' },
      generalError: 'Validation failed',
    })
  })

  it('parses Error.message JSON payloads from res.text()', () => {
    const result = parseOperationalApiValidationError(
      new Error('{"errors":[{"field":"status","message":"Unsupported status"}]}')
    )

    expect(result.fieldErrors).toEqual({ status: 'Unsupported status' })
    expect(result.generalError).toBeNull()
  })

  it('parses plain detail, message, and error strings', () => {
    expect(parseOperationalApiValidationError({ detail: 'Invalid payload' }).generalError).toBe('Invalid payload')
    expect(parseOperationalApiValidationError({ message: 'Save failed' }).generalError).toBe('Save failed')
    expect(parseOperationalApiValidationError({ error: 'Backend unavailable' }).generalError).toBe('Backend unavailable')
  })

  it('parses errors arrays with field/message pairs', () => {
    expect(
      parseOperationalApiValidationError({
        errors: [
          { field: 'environment', message: 'Environment is required' },
          { field: 'type', message: 'Type is invalid' },
        ],
      }).fieldErrors
    ).toEqual({
      environment: 'Environment is required',
      type: 'Type is invalid',
    })
  })

  it('parses FastAPI detail arrays', () => {
    expect(
      parseOperationalApiValidationError({
        detail: [
          { loc: ['body', 'name'], msg: 'Field required' },
          { loc: ['body', 'metadata_json'], msg: 'Must be an object' },
        ],
      }).fieldErrors
    ).toEqual({
      name: 'Field required',
      metadata_json: 'Must be an object',
    })
  })

  it('parses object field_errors arrays into inline strings', () => {
    expect(
      parseOperationalApiValidationError({
        field_errors: {
          contacts_json: ['At least one contact is required'],
        },
      }).fieldErrors
    ).toEqual({
      contacts_json: 'At least one contact is required',
    })
  })
})
