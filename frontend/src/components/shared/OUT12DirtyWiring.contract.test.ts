import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()

const readSource = (relativePath: string) => (
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
)

const extractFunctionBlock = (source: string, functionName: string) => {
  const signaturePattern = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`, 'm')
  const signatureMatch = signaturePattern.exec(source)
  expect(signatureMatch).not.toBeNull()
  const start = signatureMatch!.index
  const bodyStart = start + signatureMatch![0].length - 1

  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(start, index + 1)
      }
    }
  }

  throw new Error(`Unable to extract ${functionName}`)
}

describe('OUT-12 iteration 02 consumer wiring', () => {
  it('wires BkmListModal dirty state through WorkspaceModal without local Escape bypass', () => {
    const source = readSource('src/components/monitoring/BkmListModal.tsx')

    expect(source).toMatch(/<WorkspaceModal[\s\S]*isDirty=\{isDirty\}/)
    expect(source).not.toMatch(/useEscapeDismiss\s*\(\s*onClose\s*\)/)
  })

  it('wires VendorsReal dirty state through WorkspaceModal without local Escape bypass', () => {
    const source = readSource('src/components/vendors/VendorGoldenOperationalWorkspace.tsx')
    const vendorDetailPanel = extractFunctionBlock(source, 'VendorDetailPanel')

    expect(vendorDetailPanel).toMatch(/<WorkspaceModal[\s\S]*isDirty=\{hasChanges\}/)
    expect(vendorDetailPanel).not.toMatch(/useEscapeDismiss\s*\(\s*onClose\s*\)/)
  })

  it('wires NetworkConnectionForm dirty state through WorkspaceModal without local Escape bypass', () => {
    const source = readSource('src/components/NetworkReal.tsx')
    const networkConnectionForm = extractFunctionBlock(source, 'NetworkConnectionForm')

    expect(networkConnectionForm).toMatch(/const isDirty = useMemo/)
    expect(networkConnectionForm).toMatch(/<WorkspaceModal[\s\S]*isDirty=\{isDirty\}/)
    expect(networkConnectionForm).not.toMatch(/useEscapeDismiss\s*\(\s*onClose\s*\)/)
  })
})
