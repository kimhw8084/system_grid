import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const componentsRoot = path.resolve(process.cwd(), 'src/components')
const read = (fileName: string) => fs.readFileSync(path.join(componentsRoot, fileName), 'utf8')

describe('FAR and Research golden presentation contract', () => {
  it('keeps primary analytical tables on the full golden surface without pre-grid displacement', () => {
    const far = read('FAR.tsx')
    const research = read('Research.tsx')

    expect(far).not.toContain('failure vectors in scope')
    expect(research).not.toContain('mixed records')
    expect(far).not.toContain('surfaceVariant="attached-panel"')
    expect(far).toContain('title="Export filtered FAR CSV"')
    expect(far).toContain('title="Export versioned FAR recovery package"')
    expect(far).toContain('title="Copy to Clipboard"')
    expect(far).toContain('data-far-grid="true"')
    expect(far).toContain('<OperationalDataGrid')
    expect(research).toContain('<div className="flex-1 min-h-0 relative">\n        <OperationalDataGrid')
  })

  it('keeps optional display, filter, and analytical panels collapsed and non-displacing by default', () => {
    const far = read('FAR.tsx')
    const research = read('Research.tsx')

    for (const source of [far, research]) {
      expect(source).toContain('const [showStyleLab, setShowStyleLab] = useState(false)')
      expect(source).toContain('const [showInsights, setShowInsights] = useState(false)')
      expect(source).toContain('<Sliders size={14} /> Display')
      expect(source).toContain('<Activity size={14} /> Insights')
    }
    expect(far).toContain('const [showSystemFilters, setShowSystemFilters] = useState(false)')
    expect(far).toContain('data-far-display-controls="true"')
    expect(far).toContain('data-far-insights="true"')
    expect(far).toContain('className="fixed inset-x-3 bottom-3')
    expect(research).toContain('const [showYearFilters, setShowYearFilters] = useState(false)')
  })

  it('keeps FAR.tsx as the sole runtime and the legacy golden component as an adapter only', () => {
    const far = read('FAR.tsx')
    const shell = read('shared/OperationalWorkspaceShells.tsx')
    const adapter = read('far/FARGoldenWorkspace.tsx')

    expect((far.match(/<OperationalDataGrid/g) || []).length).toBe(1)
    expect(far).toContain('workspace="far"')
    expect(shell).not.toContain("from '../far/FARGoldenWorkspace'")
    expect(shell).not.toContain('<FARGoldenWorkspace')
    expect(adapter).toContain('data-far-compatibility-adapter="true"')
    expect(adapter).not.toContain('OperationalDataGrid')
    expect(adapter).not.toContain('useQuery(')
    expect(adapter).not.toContain('apiFetch(')
  })

  it('fails closed when FAR or Research list endpoints return errors or malformed payloads', () => {
    const far = read('FAR.tsx')
    const domain = read('far/FARDomain.ts')
    const research = read('Research.tsx')

    expect(far).toContain("queryFn: async ({ signal }) =>")
    expect(far).toContain("extractFARRows(payload)")
    expect(domain).toContain("throw new Error(`Invalid FAR ${field}`)")
    expect(research).toContain('if (!response.ok) throw new Error(await response.text())')
    expect(research).toContain('if (!Array.isArray(payload)) throw new Error(`Expected a list response from ${path}`)')
    expect(research).toContain("queryFn: () => fetchResearchList('/api/v1/investigations')")
    expect(research).toContain("queryFn: () => fetchResearchList('/api/v1/rca')")
    expect(research).toContain('const combinedUnavailable = combinedData.length === 0 && (investigationsError || rcaError)')
  })
})
