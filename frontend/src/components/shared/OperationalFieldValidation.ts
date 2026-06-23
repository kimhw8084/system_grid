export type OperationalFieldErrors = Record<string, string>

export function getOperationalFieldError(errors: OperationalFieldErrors | undefined, fieldName: string): string | undefined {
  return errors ? errors[fieldName] : undefined
}

export function mergeOperationalFieldErrors(
  existingErrors: OperationalFieldErrors,
  newErrors: OperationalFieldErrors
): OperationalFieldErrors {
  return { ...existingErrors, ...newErrors }
}

export function parseOperationalApiValidationError(error: any): {
  fieldErrors: OperationalFieldErrors
  generalError: string | null
} {
  const fieldErrors: OperationalFieldErrors = {}
  let generalError: string | null = null

  if (typeof error === 'string') {
    generalError = error
  } else if (error && typeof error === 'object') {
    if (error.field_errors) {
      Object.assign(fieldErrors, error.field_errors)
    }
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err: any) => {
        if (err.field && err.message) {
          fieldErrors[err.field] = err.message
        }
      })
    }
    if (error.detail) {
      if (Array.isArray(error.detail)) {
        error.detail.forEach((err: any) => {
          if (err.loc && Array.isArray(err.loc) && err.loc.length > 1) {
            fieldErrors[err.loc[1]] = err.msg
          }
        })
      } else if (typeof error.detail === 'string') {
        generalError = error.detail
      }
    }
    if (!generalError && (error.message || error.error)) {
      generalError = error.message || error.error
    }
  }

  return { fieldErrors, generalError }
}
