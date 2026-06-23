const fs = require('fs')
const path = require('path')

const EXEMPTION_COMMENT = 'operational-escape-dismiss-exempt: non-dirty modal'
const componentsDir = path.join(__dirname, '../src/components')

const suspiciousUseEscapeDismissPatterns = [
  /useEscapeDismiss\s*\(\s*onClose\s*\)/,
  /useEscapeDismiss\s*\(\s*handleClose\s*\)/,
  /useEscapeDismiss\s*\(\s*\(\s*\)\s*=>\s*onClose\s*\(\s*\)\s*\)/,
  /useEscapeDismiss\s*\(\s*\(\s*\)\s*=>\s*handleClose\s*\(\s*\)\s*\)/,
]

const dirtyWorkspaceModalPattern = /<WorkspaceModal[\s\S]*?(isDirty|resolveIsDirty|dirtyConfirmTitle|dirtyConfirmMessage)\s*=/

const listTsxFiles = (dir) => (
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) return listTsxFiles(absolutePath)
    return absolutePath.endsWith('.tsx') ? [absolutePath] : []
  })
)

const findMatchingBrace = (source, startIndex) => {
  let depth = 0
  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

const extractComponentBlocks = (source) => {
  const blocks = []
  const patterns = [
    /function\s+([A-Z][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{/g,
    /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\([^)]*\)\s*=>\s*\{/g,
  ]

  patterns.forEach((pattern) => {
    let match
    while ((match = pattern.exec(source)) != null) {
      const bodyStart = source.indexOf('{', match.index)
      const bodyEnd = findMatchingBrace(source, bodyStart)
      if (bodyStart === -1 || bodyEnd === -1) continue
      blocks.push({
        name: match[1],
        start: match.index,
        end: bodyEnd + 1,
        body: source.slice(match.index, bodyEnd + 1),
      })
    }
  })

  return blocks
}

const failures = []

for (const filePath of listTsxFiles(componentsDir)) {
  const source = fs.readFileSync(filePath, 'utf8')
  for (const block of extractComponentBlocks(source)) {
    if (!dirtyWorkspaceModalPattern.test(block.body)) continue
    if (block.body.includes(EXEMPTION_COMMENT)) continue
    if (!suspiciousUseEscapeDismissPatterns.some((pattern) => pattern.test(block.body))) continue
    failures.push(`${path.relative(path.join(__dirname, '..'), filePath)}:${block.name}`)
  }
}

if (failures.length > 0) {
  console.error('Dirty modal contract violations found:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Form contracts check passed.')
