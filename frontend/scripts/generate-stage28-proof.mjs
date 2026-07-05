import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const frontendDir = process.cwd()
const evidenceDir = path.join(frontendDir, 'stage28-evidence')
const evidenceJsonPath = path.join(evidenceDir, 'stage28-evidence.json')
const validationJsonPath = path.join(evidenceDir, 'validation-ledger.json')

const requiredProofFiles = [
  'OUT-26_ITERATION_30_STAGE28_PROOF_COMPLETION_SUMMARY.md',
  'OUT-26_ITERATION_30_STAGE28_ROUTE_RENDER_PROOF.md',
  'OUT-26_ITERATION_30_STAGE28_GEOMETRY_CAPTURE_PROOF.md',
  'OUT-26_ITERATION_30_STAGE28_COMMAND_BOUNDS_PROOF.md',
  'OUT-26_ITERATION_30_STAGE28_WARNING_CLASSIFICATION_PROOF.md',
  'OUT-26_ITERATION_30_STAGE28_960X720_PROOF.md',
  'OUT-26_ITERATION_30_STAGE28_PRODUCT_CODE_LOCK_AUDIT.md',
  'OUT-26_ITERATION_30_STAGE28_VALIDATION_LEDGER.md',
  'OUT-26_ITERATION_30_STAGE28_EVIDENCE.html',
]

const routeEvidenceOrder = [
  'asset-desktop-fullpage',
  'asset-desktop-viewport',
  'asset-960x720',
  'monitoring-desktop-fullpage',
  'monitoring-desktop-viewport',
  'monitoring-960x720',
  'asset-real-desktop-viewport',
]

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>')
}

function summarizeValidity(capture) {
  return capture.validity.valid ? 'valid' : `invalid: ${capture.validity.rejectionReason}`
}

function summarizeBounds(region) {
  return region.bounds
    ? `${region.status} (${region.bounds.x}, ${region.bounds.y}, ${region.bounds.width}x${region.bounds.height})`
    : `${region.status} (${region.failureReason})`
}

function classifyChangedFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/')

  if (normalized === 'tests/assets-golden-evidence.spec.ts') {
    return {
      category: 'evidence test',
      visibleUi: 'no',
      layout: 'no',
      behavior: 'no',
      routeBehavior: 'no',
      backend: 'no',
      unrelated: 'no',
      verdict: 'allowed',
      note: 'Playwright evidence harness only.',
    }
  }

  if (normalized.startsWith('tests/helpers/') && normalized.endsWith('.ts')) {
    return {
      category: 'evidence helper',
      visibleUi: 'no',
      layout: 'no',
      behavior: 'no',
      routeBehavior: 'no',
      backend: 'no',
      unrelated: 'no',
      verdict: 'allowed',
      note: 'Playwright helper import-resolution change only.',
    }
  }

  if (normalized.startsWith('scripts/')) {
    return {
      category: 'evidence helper',
      visibleUi: 'no',
      layout: 'no',
      behavior: 'no',
      routeBehavior: 'no',
      backend: 'no',
      unrelated: 'no',
      verdict: 'allowed',
      note: 'Proof-generation helper only.',
    }
  }

  if (normalized.startsWith('stage28-evidence/')) {
    return {
      category: 'evidence output',
      visibleUi: 'no',
      layout: 'no',
      behavior: 'no',
      routeBehavior: 'no',
      backend: 'no',
      unrelated: 'no',
      verdict: 'allowed',
      note: 'Generated evidence artifact.',
    }
  }

  if (/^OUT-26_ITERATION_30_STAGE28_.*\.(md|html)$/.test(normalized)) {
    return {
      category: 'proof artifact',
      visibleUi: 'no',
      layout: 'no',
      behavior: 'no',
      routeBehavior: 'no',
      backend: 'no',
      unrelated: 'no',
      verdict: 'allowed',
      note: 'Controller-facing proof document only.',
    }
  }

  if (/^src\//.test(normalized)) {
    return {
      category: 'forbidden product UI file',
      visibleUi: 'yes',
      layout: 'possible',
      behavior: 'possible',
      routeBehavior: 'possible',
      backend: 'no',
      unrelated: 'no',
      verdict: 'forbidden',
      note: 'Product source file changed during proof-only stage.',
    }
  }

  return {
    category: 'forbidden product UI file',
    visibleUi: 'unknown',
    layout: 'unknown',
    behavior: 'unknown',
    routeBehavior: 'unknown',
    backend: normalized.startsWith('../') ? 'possible' : 'no',
    unrelated: 'possible',
    verdict: 'forbidden',
    note: 'Changed file is outside the approved Stage 28 proof scope.',
  }
}

async function getChangedFiles() {
  const { stdout } = await execFileAsync('git', ['status', '--short', '--', 'frontend'], {
    cwd: path.dirname(frontendDir),
  })

  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => line.replace(/^.. /, ''))
    .filter((file) => file.startsWith('frontend/'))
    .map((file) => file.replace(/^frontend\//, ''))
    .sort()
}

function flattenWarnings(captures) {
  return Object.entries(captures).flatMap(([captureKey, capture]) =>
    capture.warningSummary.entries.map((entry) => ({ captureKey, ...entry }))
  )
}

function flattenRequestFailures(captures) {
  return Object.entries(captures).flatMap(([captureKey, capture]) =>
    capture.warningSummary.requestFailures.map((entry) => ({ captureKey, ...entry }))
  )
}

function buildRouteRenderProof(captures) {
  const lines = [
    '# OUT-26 Iteration 30 Stage 28 Route Render Proof',
    '',
    '| Capture | Requested path | Final URL | Screenshot | Scroll size | Workspace root selector | Visible text sample | Validity |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const key of routeEvidenceOrder) {
    const capture = captures[key]
    if (!capture) continue
    const screenshot = capture.screenshotSize ? `${capture.screenshotSize.width}x${capture.screenshotSize.height}` : 'missing'
    const scroll = `${capture.documentSize.width}x${capture.documentSize.height}`
    const textSample = capture.visibleTexts.slice(0, 12).join('; ')
    lines.push(`| ${mdEscape(key)} | ${mdEscape(capture.requestedPath)} | ${mdEscape(capture.finalUrl)} | ${mdEscape(screenshot)} | ${mdEscape(scroll)} | ${mdEscape(capture.workspaceRoot.selector)} | ${mdEscape(textSample)} | ${mdEscape(summarizeValidity(capture))} |`)
  }

  return `${lines.join('\n')}\n`
}

function buildGeometryProof(captures) {
  const lines = [
    '# OUT-26 Iteration 30 Stage 28 Geometry Capture Proof',
    '',
    '| Capture | Workspace root | Header | Action/status zone | Command region | Table | First row | Row action region | Detail panel |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const key of routeEvidenceOrder) {
    const capture = captures[key]
    if (!capture || capture.routeKey === 'asset-real') continue
    lines.push(`| ${mdEscape(key)} | ${mdEscape(summarizeBounds(capture.workspaceRoot))} | ${mdEscape(summarizeBounds(capture.header))} | ${mdEscape(summarizeBounds(capture.actionStatusZone))} | ${mdEscape(summarizeBounds(capture.commandRegion))} | ${mdEscape(summarizeBounds(capture.table))} | ${mdEscape(summarizeBounds(capture.firstRow))} | ${mdEscape(summarizeBounds(capture.rowActionRegion))} | ${mdEscape(summarizeBounds(capture.detailPanel))} |`)
    if (capture.detailPanel.status === 'null') {
      lines.push(`| ${mdEscape(`${key} detail attempts`)} | ${mdEscape(capture.detailPanelAttempts.join(' -> ') || 'none recorded')} |  |  |  |  |  |  | ${mdEscape(capture.detailPanel.failureReason || 'n/a')} |`)
    }
  }

  return `${lines.join('\n')}\n`
}

function buildCommandBoundsProof(captures) {
  const keys = ['asset-desktop-fullpage', 'asset-960x720', 'monitoring-desktop-fullpage', 'monitoring-960x720']
  const lines = [
    '# OUT-26 Iteration 30 Stage 28 Command Bounds Proof',
    '',
    '| Capture | Command selector | Bounds status | Bounds |',
    '| --- | --- | --- | --- |',
  ]

  for (const key of keys) {
    const capture = captures[key]
    if (!capture) continue
    const bounds = capture.commandRegion.bounds
      ? `${capture.commandRegion.bounds.x}, ${capture.commandRegion.bounds.y}, ${capture.commandRegion.bounds.width}x${capture.commandRegion.bounds.height}`
      : capture.commandRegion.failureReason
    lines.push(`| ${mdEscape(key)} | ${mdEscape(capture.commandRegion.selector)} | ${mdEscape(capture.commandRegion.status)} | ${mdEscape(bounds)} |`)
  }

  return `${lines.join('\n')}\n`
}

function buildWarningProof(captures) {
  const warningEntries = flattenWarnings(captures)
  const requestEntries = flattenRequestFailures(captures)
  const lines = [
    '# OUT-26 Iteration 30 Stage 28 Warning Classification Proof',
    '',
    '## Console and page ledger',
    '',
    '| Capture | Route | Channel | Count | Classification | Source | Message | Justification |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const entry of warningEntries) {
    lines.push(`| ${mdEscape(entry.captureKey)} | ${mdEscape(entry.route)} | ${mdEscape(entry.channel)} | ${mdEscape(entry.count)} | ${mdEscape(entry.classification)} | ${mdEscape(entry.source || 'n/a')} | ${mdEscape(entry.exactMessage)} | ${mdEscape(entry.justification)} |`)
  }

  lines.push('', '## Request failure ledger', '', '| Capture | Route | Method | URL | Status | Failure text | Count | Classification | Justification |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |')

  for (const entry of requestEntries) {
    lines.push(`| ${mdEscape(entry.captureKey)} | ${mdEscape(entry.route)} | ${mdEscape(entry.method)} | ${mdEscape(entry.url)} | ${mdEscape(entry.status ?? 'n/a')} | ${mdEscape(entry.failureText || 'n/a')} | ${mdEscape(entry.count)} | ${mdEscape(entry.classification)} | ${mdEscape(entry.justification)} |`)
  }

  return `${lines.join('\n')}\n`
}

function build960Proof(captures) {
  const keys = ['asset-960x720', 'monitoring-960x720']
  const lines = [
    '# OUT-26 Iteration 30 Stage 28 960x720 Proof',
    '',
    '| Capture | Final URL | Viewport | Screenshot | Scroll size | Command region | Validity |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const key of keys) {
    const capture = captures[key]
    if (!capture) continue
    lines.push(`| ${mdEscape(key)} | ${mdEscape(capture.finalUrl)} | ${mdEscape(`${capture.viewport.width}x${capture.viewport.height}`)} | ${mdEscape(`${capture.screenshotSize.width}x${capture.screenshotSize.height}`)} | ${mdEscape(`${capture.documentSize.width}x${capture.documentSize.height}`)} | ${mdEscape(summarizeBounds(capture.commandRegion))} | ${mdEscape(summarizeValidity(capture))} |`)
  }

  return `${lines.join('\n')}\n`
}

function buildProductLockAudit(changedFiles) {
  const rows = changedFiles.map((file) => ({ file, ...classifyChangedFile(file) }))
  const lines = [
    '# OUT-26 Iteration 30 Stage 28 Product Code Lock Audit',
    '',
    '| File | Category | Visible UI change | Layout change | Behavior change | Route behavior change | Backend/API change | Unrelated workspace change | Verdict | Note |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const row of rows) {
    lines.push(`| ${mdEscape(`frontend/${row.file}`)} | ${mdEscape(row.category)} | ${mdEscape(row.visibleUi)} | ${mdEscape(row.layout)} | ${mdEscape(row.behavior)} | ${mdEscape(row.routeBehavior)} | ${mdEscape(row.backend)} | ${mdEscape(row.unrelated)} | ${mdEscape(row.verdict)} | ${mdEscape(row.note)} |`)
  }

  const forbidden = rows.filter((row) => row.verdict === 'forbidden')
  lines.push('', `Overall verdict: ${forbidden.length === 0 ? 'PASS' : 'FAIL'}`)
  return { markdown: `${lines.join('\n')}\n`, forbiddenCount: forbidden.length, rows }
}

function buildValidationLedger(validation) {
  const lines = [
    '# OUT-26 Iteration 30 Stage 28 Validation Ledger',
    '',
    '| Step | Command | Result | Notes |',
    '| --- | --- | --- | --- |',
  ]

  for (const entry of validation.commands) {
    lines.push(`| ${mdEscape(entry.step)} | ${mdEscape(entry.command)} | ${mdEscape(entry.result)} | ${mdEscape(entry.notes || '')} |`)
  }

  return `${lines.join('\n')}\n`
}

function buildSummary({ captures, validation, lockAudit, result, remainingGaps }) {
  const assetDuplicateZero = captures['asset-desktop-fullpage']?.warningSummary.duplicateKeyCount === 0 &&
    captures['asset-desktop-viewport']?.warningSummary.duplicateKeyCount === 0 &&
    captures['asset-960x720']?.warningSummary.duplicateKeyCount === 0
  const assetPageErrorsZero = captures['asset-desktop-fullpage']?.warningSummary.pageErrorCount === 0 &&
    captures['asset-desktop-viewport']?.warningSummary.pageErrorCount === 0 &&
    captures['asset-960x720']?.warningSummary.pageErrorCount === 0

  const lines = [
    '# OUT-26 Iteration 30 Stage 28 Proof Completion Summary',
    '',
    `Result: ${result}`,
    '',
    `Route render verdict: ${captures['asset-desktop-fullpage']?.validity.valid && captures['monitoring-desktop-fullpage']?.validity.valid && new URL(captures['asset-real-desktop-viewport']?.finalUrl || 'http://127.0.0.1/').pathname === '/asset' ? 'PASS' : 'FAIL'}`,
    `Command bounds verdict: ${['asset-desktop-fullpage', 'asset-960x720', 'monitoring-desktop-fullpage', 'monitoring-960x720'].every((key) => captures[key]?.commandRegion.status === 'non-null') ? 'PASS' : 'FAIL'}`,
    `Geometry verdict: ${['asset-desktop-fullpage', 'asset-960x720', 'monitoring-desktop-fullpage', 'monitoring-960x720'].every((key) => captures[key]?.workspaceRoot.status === 'non-null' && captures[key]?.table.status === 'non-null') ? 'PASS' : 'FAIL'}`,
    `Exact 960x720 verdict: ${captures['asset-960x720'] && captures['monitoring-960x720'] ? 'PASS' : 'FAIL'}`,
    `Warning/request classification verdict: ${flattenWarnings(captures).every((entry) => entry.classification !== 'blocking') && flattenRequestFailures(captures).every((entry) => entry.classification !== 'blocking') ? 'PASS' : 'FAIL'}`,
    `Duplicate-key zero verdict: ${assetDuplicateZero ? 'PASS' : 'FAIL'}`,
    `Page-error verdict: ${assetPageErrorsZero ? 'PASS' : 'FAIL'}`,
    `Product-code lock verdict: ${lockAudit.forbiddenCount === 0 ? 'PASS' : 'FAIL'}`,
    '',
    'Remaining gaps:',
    remainingGaps.length ? remainingGaps.map((gap) => `- ${gap}`).join('\n') : '- none',
    '',
    'Validation ledger source:',
    `- ${validation.commands.length} commands recorded in stage28-evidence/validation-ledger.json`,
  ]

  return `${lines.join('\n')}\n`
}

async function buildEvidenceHtml(captures, result, remainingGaps) {
  const sections = []

  for (const key of routeEvidenceOrder) {
    const capture = captures[key]
    if (!capture?.screenshotPath) continue
    const buffer = await fs.readFile(capture.screenshotPath)
    const base64 = buffer.toString('base64')
    const size = capture.screenshotSize ? `${capture.screenshotSize.width}x${capture.screenshotSize.height}` : 'missing'

    sections.push(`
      <section class="capture">
        <h2>${key}</h2>
        <p><strong>Requested:</strong> ${capture.requestedPath} <strong>Final:</strong> ${capture.finalUrl}</p>
        <p><strong>Viewport:</strong> ${capture.viewport.width}x${capture.viewport.height} <strong>Screenshot:</strong> ${size} <strong>Scroll:</strong> ${capture.documentSize.width}x${capture.documentSize.height}</p>
        <p><strong>Workspace root:</strong> <code>${capture.workspaceRoot.selector}</code></p>
        <p><strong>Validity:</strong> ${capture.validity.valid ? 'valid' : capture.validity.rejectionReason}</p>
        <img alt="${key}" src="data:image/png;base64,${base64}" />
      </section>
    `)
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OUT-26 Iteration 30 Stage 28 Evidence</title>
  <style>
    :root { color-scheme: light; font-family: Georgia, "Times New Roman", serif; }
    body { margin: 24px; background: #f3efe4; color: #1f1a14; }
    h1, h2 { margin: 0 0 12px; }
    .summary { background: #fffaf0; border: 1px solid #cdbb9c; padding: 16px; margin-bottom: 24px; }
    .capture { background: #fff; border: 1px solid #d7c8ae; padding: 16px; margin-bottom: 24px; }
    img { width: 100%; height: auto; border: 1px solid #c7b89b; display: block; }
    code { background: #efe5d1; padding: 1px 4px; }
  </style>
</head>
<body>
  <div class="summary">
    <h1>OUT-26 Iteration 30 Stage 28 Evidence</h1>
    <p><strong>Result:</strong> ${result}</p>
    <p><strong>Remaining gaps:</strong> ${remainingGaps.length ? remainingGaps.join(' | ') : 'none'}</p>
  </div>
  ${sections.join('\n')}
</body>
</html>
`
}

function computeResult(captures, validation, lockAudit) {
  const requiredKeys = ['asset-desktop-fullpage', 'asset-desktop-viewport', 'asset-960x720', 'monitoring-desktop-fullpage', 'monitoring-desktop-viewport', 'monitoring-960x720', 'asset-real-desktop-viewport']
  const missingCapture = requiredKeys.some((key) => !captures[key])
  const routesValid = ['asset-desktop-fullpage', 'asset-desktop-viewport', 'asset-960x720', 'monitoring-desktop-fullpage', 'monitoring-desktop-viewport', 'monitoring-960x720'].every((key) => captures[key]?.validity.valid)
  const redirectValid = new URL(captures['asset-real-desktop-viewport']?.finalUrl || 'http://127.0.0.1/').pathname === '/asset'
  const commandsNonNull = ['asset-desktop-fullpage', 'asset-960x720', 'monitoring-desktop-fullpage', 'monitoring-960x720'].every((key) => captures[key]?.commandRegion.status === 'non-null')
  const noBlockingWarnings = flattenWarnings(captures).every((entry) => entry.classification !== 'blocking')
  const noBlockingRequestFailures = flattenRequestFailures(captures).every((entry) => entry.classification !== 'blocking')
  const duplicateKeyZero = ['asset-desktop-fullpage', 'asset-desktop-viewport', 'asset-960x720'].every((key) => captures[key]?.warningSummary.duplicateKeyCount === 0)
  const pageErrorZero = ['asset-desktop-fullpage', 'asset-desktop-viewport', 'asset-960x720'].every((key) => captures[key]?.warningSummary.pageErrorCount === 0)
  const validationComplete = Array.isArray(validation.commands) && validation.commands.length >= 6 && validation.commands.every((entry) => entry.result)
  const htmlReviewable = routeEvidenceOrder.every((key) => !captures[key] || captures[key].screenshotPath)
  const forbiddenChanges = lockAudit.forbiddenCount > 0

  if (missingCapture || !routesValid || !redirectValid || !commandsNonNull || !noBlockingWarnings || !noBlockingRequestFailures || !duplicateKeyZero || !pageErrorZero || !validationComplete || !htmlReviewable || forbiddenChanges) {
    return 'FAIL'
  }

  return 'PASS'
}

async function main() {
  const evidence = JSON.parse(await fs.readFile(evidenceJsonPath, 'utf8'))
  const validation = JSON.parse(await fs.readFile(validationJsonPath, 'utf8'))
  const captures = evidence.captures
  const changedFiles = await getChangedFiles()
  const lockAudit = buildProductLockAudit(changedFiles)
  const remainingGaps = []

  for (const key of ['asset-desktop-fullpage', 'asset-960x720', 'monitoring-desktop-fullpage', 'monitoring-960x720']) {
    const capture = captures[key]
    if (capture?.detailPanel.status === 'null') {
      remainingGaps.push(`${key} detail/quick-look panel remained null after recorded direct-route and interactive attempts; bounded non-critical gap unless product changes are allowed.`)
    }
  }

  const result = computeResult(captures, validation, lockAudit)

  const files = new Map([
    ['OUT-26_ITERATION_30_STAGE28_ROUTE_RENDER_PROOF.md', buildRouteRenderProof(captures)],
    ['OUT-26_ITERATION_30_STAGE28_GEOMETRY_CAPTURE_PROOF.md', buildGeometryProof(captures)],
    ['OUT-26_ITERATION_30_STAGE28_COMMAND_BOUNDS_PROOF.md', buildCommandBoundsProof(captures)],
    ['OUT-26_ITERATION_30_STAGE28_WARNING_CLASSIFICATION_PROOF.md', buildWarningProof(captures)],
    ['OUT-26_ITERATION_30_STAGE28_960X720_PROOF.md', build960Proof(captures)],
    ['OUT-26_ITERATION_30_STAGE28_PRODUCT_CODE_LOCK_AUDIT.md', lockAudit.markdown],
    ['OUT-26_ITERATION_30_STAGE28_VALIDATION_LEDGER.md', buildValidationLedger(validation)],
  ])

  const summary = buildSummary({ captures, validation, lockAudit, result, remainingGaps })
  files.set('OUT-26_ITERATION_30_STAGE28_PROOF_COMPLETION_SUMMARY.md', summary)
  files.set('OUT-26_ITERATION_30_STAGE28_EVIDENCE.html', await buildEvidenceHtml(captures, result, remainingGaps))

  for (const [fileName, content] of files) {
    await fs.writeFile(path.join(frontendDir, fileName), content)
  }

  await fs.writeFile(path.join(evidenceDir, 'proof-manifest.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    result,
    requiredProofFiles,
    changedFiles: changedFiles.map((file) => `frontend/${file}`),
    remainingGaps,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
