import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const FRONTEND_ROOT = process.cwd()
const repoRoot = path.resolve(FRONTEND_ROOT, '..')
const oldSource = execFileSync('git', ['show', 'HEAD:frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx'], { cwd: repoRoot, encoding: 'utf8' })

const targets = [
  'src/components/assets/AssetGoldenOperationalWorkspace.tsx',
  'src/components/assets/assetGoldenData.ts',
  'src/components/assets/AssetGoldenFeatureSurfaces.tsx',
  'src/components/assets/AssetGoldenDialogs.tsx',
]

const normalizeLines = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean)

const overlap = (sourceText, targetText) => {
  const sourceLines = normalizeLines(sourceText)
  const targetLines = normalizeLines(targetText)
  const sourceSet = new Set(sourceLines)
  const common = targetLines.filter((line) => sourceSet.has(line))
  const charHash = crypto.createHash('sha256').update(targetText).digest('hex').slice(0, 12)
  return {
    lineCount: targetLines.length,
    commonLineCount: common.length,
    overlapPercent: targetLines.length ? Number(((common.length / targetLines.length) * 100).toFixed(2)) : 0,
    charSimilarityProxy: charHash,
  }
}

const results = []
for (const target of targets) {
  const absolute = path.join(FRONTEND_ROOT, target)
  const targetText = await fs.readFile(absolute, 'utf8')
  results.push({
    file: `frontend/${target}`,
    ...overlap(oldSource, targetText),
  })
}

console.log(JSON.stringify({
  baselineLineCount: normalizeLines(oldSource).length,
  results,
}, null, 2))
