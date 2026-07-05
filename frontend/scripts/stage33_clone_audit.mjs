import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const FRONTEND_ROOT = process.cwd()
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..')
const MONOLITH_BASELINE_PATH = 'frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx'
const previousRevision = 'HEAD^'
const oldSource = execFileSync('git', ['show', `${previousRevision}:${MONOLITH_BASELINE_PATH}`], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
})

const overlapTargets = [
  'src/components/assets/AssetGoldenOperationalWorkspace.tsx',
  'src/components/assets/assetGoldenData.ts',
  'src/components/assets/AssetGoldenFeatureSurfaces.tsx',
  'src/components/assets/AssetGoldenDialogs.tsx',
]

const previousProofFiles = [
  'frontend/OUT-26_ITERATION_34_STAGE32_EVIDENCE.html',
  'frontend/OUT-26_ITERATION_34_STAGE32_CLONE_PROOF_DECOMPOSITION_SUMMARY.md',
  'frontend/stage32-evidence/asset_desktop_full.png',
  'frontend/stage31-evidence/stage31-evidence.json',
  'frontend/stage30-evidence/stage30-evidence.json',
  'frontend/stage29-evidence/asset-real-desktop-viewport.png',
  'frontend/stage28-evidence/stage28-evidence.json',
]

const normalizeLines = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean)

const overlap = (sourceText, targetText) => {
  const sourceLines = normalizeLines(sourceText)
  const targetLines = normalizeLines(targetText)
  const sourceSet = new Set(sourceLines)
  const common = targetLines.filter((line) => sourceSet.has(line))
  return {
    lineCount: targetLines.length,
    commonLineCount: common.length,
    overlapPercent: targetLines.length ? Number(((common.length / targetLines.length) * 100).toFixed(2)) : 0,
    charSimilarityProxy: crypto.createHash('sha256').update(targetText).digest('hex').slice(0, 12),
  }
}

const currentSkeletonPath = path.join(FRONTEND_ROOT, 'src/components/assets/AssetGoldenOperationalWorkspace.tsx')
const currentSkeleton = await fs.readFile(currentSkeletonPath, 'utf8')
const modifiedFiles = execFileSync('git', ['diff', '--name-only', '--', ...previousProofFiles], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean)

const overlapResults = []
for (const target of overlapTargets) {
  const absolute = path.join(FRONTEND_ROOT, target)
  const targetText = await fs.readFile(absolute, 'utf8')
  overlapResults.push({
    file: `frontend/${target}`,
    ...overlap(oldSource, targetText),
  })
}

const proofExistence = await Promise.all(previousProofFiles.map(async (file) => ({
  file,
  exists: await fs.access(path.join(REPO_ROOT, file)).then(() => true).catch(() => false),
})))

console.log(JSON.stringify({
  baselineRevision: previousRevision,
  baselinePath: MONOLITH_BASELINE_PATH,
  baselineLineCount: normalizeLines(oldSource).length,
  currentSkeletonLineCount: currentSkeleton.split('\n').length,
  currentSkeletonUnder700: currentSkeleton.split('\n').length < 700,
  overlapThresholdPercent: 45,
  overlapResults,
  donorModulesRemainDistinct: overlapTargets.length > 1,
  previousProofFilesModified: modifiedFiles,
  previousProofFileExistence: proofExistence,
}, null, 2))
