import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8')

const views = [
  'MonitoringGrid.tsx',
  'assets/AssetGoldenShellScaffold.tsx',
  'ServicesReal.tsx',
  'External.tsx',
  'NetworkReal.tsx',
  'FAR.tsx',
  'Research.tsx',
  'vendors/VendorGoldenOperationalWorkspace.tsx',
] as const

describe('Golden workspace geometry contract', () => {
  it('locks the accepted frame, toolbar, and grid geometry in shared owners', () => {
    const shell = read('shared/OperationalWorkspaceShells.tsx')
    const layout = read('shared/LayoutPrimitives.tsx')
    const commandBar = read('shared/WorkspaceCommandBar.tsx')

    expect(shell).toContain("GOLDEN_WORKSPACE_GEOMETRY_VERSION = '3'")
    expect(shell).toContain("GOLDEN_WORKSPACE_FRAME_CLASS = 'h-full min-h-0 min-w-0 w-full max-w-full box-border flex flex-col items-stretch space-y-4 overflow-hidden [&>*]:!ml-0 [&>*]:!mr-0 [&>*]:!min-w-0 [&>*]:!max-w-full [&>*]:!w-full [&>*]:self-stretch'")
    expect(shell).toContain("GOLDEN_GRID_BASE_CLASS = 'operational-grid-shell operational-grid relative box-border flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden glass-panel ag-theme-alpine-dark")
    expect(shell).toContain("GOLDEN_GRID_CONTENT_CLASS = 'relative box-border flex min-h-0 min-w-0 w-full max-w-full flex-1 overflow-hidden")
    expect(shell).toContain('data-golden-grid-content="true"')
    expect(shell).toContain('[&_.ag-center-cols-container]:!min-w-full')
    expect(shell).toContain('[&_.ag-center-cols-container]:!max-w-[400%]')
    expect(shell).toContain('[&_.ag-center-cols-container_.ag-row]:!max-w-full')
    expect(shell).not.toContain('[&_.ag-center-cols-container]:!w-full')
    expect(shell).toContain('[&>*]:!w-full')
    expect(shell).toContain("golden: 'rounded-lg'")
    expect(shell).toContain("'attached-panel': 'rounded-t-none border-x border-b border-white/5'")
    expect(shell).toContain('data-golden-geometry-version={GOLDEN_WORKSPACE_GEOMETRY_VERSION}')

    expect(layout).toContain("GOLDEN_PAGE_HEADER_CLASS = 'flex flex-wrap items-start justify-between gap-6'")
    expect(layout).toContain("GOLDEN_PAGE_TOOLBAR_CLASS = 'flex items-center gap-3 overflow-x-auto rounded-lg border border-white/5 bg-black/20 px-4 py-3 backdrop-blur-xl lg:flex-wrap lg:justify-between lg:overflow-visible'")
    expect(layout).toContain('data-golden-page-header="true"')
    expect(layout).toContain('data-golden-page-toolbar="true"')

    expect(commandBar).toContain("GOLDEN_COMMAND_BAR_STACK_CLASS = 'box-border min-w-0 w-full max-w-full self-stretch space-y-4")
    expect(commandBar).toContain("GOLDEN_COMMAND_BAR_SECONDARY_CLASS = 'px-4 py-3'")
    expect(commandBar).toContain("GOLDEN_FILTER_CHIP_ROW_CLASS = 'flex flex-wrap items-center gap-2'")
    expect(commandBar).toContain('data-golden-command-bar="true"')
  })

  it('keeps FAR in the shared shell without a duplicate runtime or grid owner', () => {
    const shell = read('shared/OperationalWorkspaceShells.tsx')
    const farWorkspace = read('far/FARGoldenWorkspace.tsx')
    const farRuntime = read('FAR.tsx')

    expect(shell).not.toContain("workspace === 'far'")
    expect(shell).not.toContain('<FARGoldenWorkspace')
    expect(farWorkspace).toContain('data-far-compatibility-adapter="true"')
    expect(farWorkspace).toContain('{children ?? null}')
    expect(farWorkspace).not.toContain('<AgGridReact')
    expect(farWorkspace).not.toContain('fetch(')
    expect(farRuntime).toContain('<OperationalWorkspaceShell')
    expect(farRuntime).toContain('<OperationalDataGrid')
    expect(farRuntime).toContain('data-far-grid="true"')
    expect(farRuntime).not.toContain('<AgGridReact')
  })

  it.each(views)('%s cannot locally reconstruct fundamental shell geometry', (file) => {
    const source = read(file)
    expect(source).not.toContain('h-full min-h-0 min-w-0 w-full max-w-full box-border flex flex-col items-stretch space-y-4 overflow-hidden')
    expect(source).not.toContain('flex flex-wrap items-start justify-between gap-6')
    expect(source).not.toContain('overflow-x-auto rounded-lg border border-white/5 bg-black/20 px-4 py-3')
    expect(source).not.toContain('rounded-t-none border-x border-b border-white/5')
  })
})
