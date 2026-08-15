import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const farPath = resolve(process.cwd(), 'src/components/FAR.tsx')
const controlsPath = resolve(process.cwd(), 'src/components/FARGoldenWorkspaceControls.tsx')
const importEnginePath = resolve(process.cwd(), '../backend/app/api/import_engine.py')
const farSource = readFileSync(farPath, 'utf8')
const controlsSource = readFileSync(controlsPath, 'utf8')
const importEngineSource = readFileSync(importEnginePath, 'utf8')

describe('FAR operational data exchange', () => {
  it('uses the shared operational import modal while preserving CSV export', () => {
    expect(farSource).toContain("import { OperationalImportModal } from './shared/OperationalImportModal'")
    expect(farSource).not.toContain("import { BulkImportModal } from './shared/BulkImportModal'")
    expect(farSource).toContain('<OperationalImportModal')
    expect(farSource).toContain('const handleExportCSV = () => {')
  })

  it('exposes a distinct strict round-trip snapshot action', () => {
    expect(farSource).toContain("FAR_IMPORT_SCHEMA_VERSION = '2026-08-far-v1'")
    expect(farSource).toContain("kind: 'snapshot'")
    expect(farSource).toContain('expectedProfile: FAR_IMPORT_PROFILE')
    expect(farSource).toContain('requireSchemaHeaders: true')
    expect(farSource).toContain('expectedSchemaVersion: FAR_IMPORT_SCHEMA_VERSION')
    expect(farSource).toContain('manifestEndpoint: `/api/v1/import/snapshot/${FAR_IMPORT_PROFILE}/manifest`')
    expect(controlsSource).toContain('onRoundTripExport: () => void')
    expect(controlsSource).toContain('title="Export Round-Trip Snapshot"')
  })

  it('promotes far_records out of the generic import path with a writable-only schema', () => {
    expect(importEngineSource).toContain('FAR_IMPORT_SCHEMA_VERSION = "2026-08-far-v1"')
    expect(importEngineSource).toContain('"far_records": ImportProfile(')
    expect(importEngineSource).toContain('fields=FAR_IMPORT_FIELDS')
    expect(importEngineSource).toContain('preview_rows=preview_far_rows')
    expect(importEngineSource).toContain('execute_rows=execute_far_rows')
    expect(importEngineSource).toContain('serialize_example_row=serialize_far_example_row')
    expect(importEngineSource).not.toContain('"far_records": models.FarFailureMode,')

    const fieldsStart = importEngineSource.indexOf('def build_far_import_fields')
    const fieldsEnd = importEngineSource.indexOf('FAR_IMPORT_FIELDS = build_far_import_fields()')
    const fieldsSource = importEngineSource.slice(fieldsStart, fieldsEnd)
    expect(fieldsSource).not.toContain('"version"')
    expect(fieldsSource).not.toContain('"is_deleted"')
    expect(fieldsSource).not.toContain('"has_incident_history"')
    expect(fieldsSource).not.toContain('"rpn"')
    expect(fieldsSource).not.toContain('"metadata_json"')
    expect(importEngineSource).toContain('"rpn": severity * occurrence * detection')
    expect(importEngineSource).toContain('await save_far_history(mode.id, mode.version, db, "Bulk import creation")')
  })

  it('publishes FAR profile/version metadata through schema, download headers, and manifest', () => {
    expect(importEngineSource).toContain('elif profile.key == "far_records":')
    expect(importEngineSource).toContain('headers["X-SysGrid-Schema-Version"] = FAR_IMPORT_SCHEMA_VERSION')
    expect(importEngineSource).toContain('manifest["schema_version"] = FAR_IMPORT_SCHEMA_VERSION')
    expect(importEngineSource).toContain('headers["schema_version"] = FAR_IMPORT_SCHEMA_VERSION')
    expect(importEngineSource).toContain('profile.key not in {"external_entities", "far_records"}')
  })

  it('keeps changed TypeScript and backend Python syntactically valid', () => {
    for (const [path, source] of [[farPath, farSource], [controlsPath, controlsSource]] as const) {
      const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      expect(parsed.parseDiagnostics, `${path} parse diagnostics`).toHaveLength(0)
    }
    const python = spawnSync('python3', ['-c', 'import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text())', importEnginePath], { encoding: 'utf8' })
    expect(python.status, python.stderr).toBe(0)
  })
})
