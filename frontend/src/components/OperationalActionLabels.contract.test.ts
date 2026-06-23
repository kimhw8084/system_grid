import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) => (
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
)

describe('Operational archive language contract', () => {
  it('keeps archive and purge labels canonical in Monitoring, External, and Services', () => {
    const monitoringSource = readSource('src/components/MonitoringGrid.tsx')
    const externalSource = readSource('src/components/External.tsx')
    const servicesSource = readSource('src/components/ServicesReal.tsx')
    const combinedSource = `${monitoringSource}\n${externalSource}\n${servicesSource}`

    expect(combinedSource).not.toMatch(/\bDe-activate\b/)
    expect(combinedSource).not.toMatch(/\bDeactivate\b/)
    expect(combinedSource).not.toMatch(/\bDe-active\b/)
    expect(combinedSource).not.toMatch(/\bDeactivation\b/)

    expect(monitoringSource).toMatch(/\bOPERATIONAL_ACTION_LABELS\.archive\b/)
    expect(monitoringSource).toMatch(/\bOPERATIONAL_ACTION_LABELS\.archiveSelection\b/)
    expect(externalSource).toMatch(/\bOPERATIONAL_ACTION_LABELS\.archive\b/)
    expect(externalSource).toMatch(/\bOPERATIONAL_ACTION_LABELS\.archiveSelection\b/)
    expect(servicesSource).toMatch(/\bOPERATIONAL_ACTION_LABELS\.archive\b/)
    expect(servicesSource).toMatch(/\bOPERATIONAL_ACTION_LABELS\.archiveSelection\b/)

    expect(combinedSource).toMatch(/\bPurge\b/)
  })
})
