import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const componentsRoot = path.resolve(process.cwd(), 'src/components')
const read = (fileName: string) => fs.readFileSync(path.join(componentsRoot, fileName), 'utf8')

describe('FAR and Research golden presentation contract', () => {
  it('keeps primary tables on the full golden surface without header-count displacement', () => {
    const far = read('FAR.tsx')
    const research = read('Research.tsx')

    expect(far).not.toContain('failure vectors in scope')
    expect(research).not.toContain('mixed records')
    expect(far).not.toContain('surfaceVariant="attached-panel"')
    expect(far).toContain('title="Export CSV"')
    expect(far).toContain('title="Copy to Clipboard"')
    expect(far).toContain('<div className="flex-1 min-h-0 relative">\n        <OperationalDataGrid')
    expect(research).toContain('<div className="flex-1 min-h-0 relative">\n        <OperationalDataGrid')
  })

  it('keeps optional display, filter, and analytical panels collapsed by default', () => {
    const far = read('FAR.tsx')
    const research = read('Research.tsx')

    for (const source of [far, research]) {
      expect(source).toContain('const [showStyleLab, setShowStyleLab] = useState(false)')
      expect(source).toContain('const [showInsights, setShowInsights] = useState(false)')
      expect(source).toContain('<Sliders size={14} /> Display')
      expect(source).toContain('<Activity size={14} /> Insights')
    }
    expect(far).toContain('const [showSystemFilters, setShowSystemFilters] = useState(false)')
    expect(research).toContain('const [showYearFilters, setShowYearFilters] = useState(false)')
  })

  it('fails closed when Research list endpoints return errors or non-list payloads', () => {
    const research = read('Research.tsx')

    expect(research).toContain('if (!response.ok) throw new Error(await response.text())')
    expect(research).toContain('if (!Array.isArray(payload)) throw new Error(`Expected a list response from ${path}`)')
    expect(research).toContain("queryFn: () => fetchResearchList('/api/v1/investigations')")
    expect(research).toContain("queryFn: () => fetchResearchList('/api/v1/rca')")
    expect(research).toContain('const combinedUnavailable = combinedData.length === 0 && (investigationsError || rcaError)')
  })
})
