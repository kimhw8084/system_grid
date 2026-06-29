import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('operational validation wiring contracts', () => {
  it('wires backend field errors through External form state', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/components/External.tsx'), 'utf8')

    expect(source).toMatch(/\bactiveModalBackendFieldErrors\b/)
    expect(source).toMatch(/setActiveModalBackendFieldErrors\(fieldErrors\)/)
    expect(source).toMatch(/backendFieldErrors=\{activeModalBackendFieldErrors\}/)
    expect(source).toMatch(/clearBackendFieldError=\{\(field\) =>/)
    expect(source).toMatch(/mergeOperationalFieldErrors\(backendFieldErrors \|\| \{\}, errors\)/)
  })

  it('wires backend field errors through Services form state', () => {
    const servicesSource = fs.readFileSync(path.join(process.cwd(), 'src/components/ServicesReal.tsx'), 'utf8')
    const registrySource = fs.readFileSync(path.join(process.cwd(), 'src/components/ServiceRegistry.tsx'), 'utf8')

    expect(servicesSource).toMatch(/\bbackendFieldErrors\b/)
    expect(servicesSource).toMatch(/\bbackendGeneralError\b/)
    expect(servicesSource).toMatch(/setBackendFieldErrors\(fieldErrors\)/)
    expect(servicesSource).toMatch(/setBackendGeneralError\(message\)/)
    expect(servicesSource).toMatch(/backendFieldErrors=\{backendFieldErrors\}/)
    expect(servicesSource).toMatch(/backendGeneralError=\{backendGeneralError\}/)
    expect(registrySource).toMatch(/mergeOperationalFieldErrors\(backendFieldErrors \|\| \{\}, validationErrors\)/)
    expect(registrySource).toMatch(/useOperationalFormDirty\(initialDataNormalized, buildInitialFormData, onDirtyChange\)/)
    expect(registrySource).toMatch(/<WorkspaceValidationBanner message=\{bannerMessage\} \/>/)
    expect(registrySource).toMatch(/clearBackendFieldError\?\.\(field\)/)
    expect(registrySource).toMatch(/error=\{fieldErrors\.device_id\}/)
    expect(registrySource).toMatch(/error=\{fieldErrors\.status\}/)
  })
})
