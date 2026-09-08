import { spawn } from 'node:child_process'
import { execFileSync } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const output = process.env.P12_TASK_1001_OUTPUT
if (!output) throw new Error('P12_TASK_1001_OUTPUT is required')
const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    server.close(() => resolve(typeof address === 'object' && address ? address.port : 4173))
  })
})
const port = await reservePort()
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sha = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const tree = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim()
const vite = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: path.join(root, 'frontend'), stdio: 'ignore', env: process.env })
const wait = async () => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}`); if (response.status < 500) return } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('Vite did not become ready')
}
try {
  await wait()
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  await new Promise((resolve, reject) => {
    const child = spawn(command, ['playwright', 'test', '--config=playwright.pv1-task-1001.config.ts'], { cwd: path.join(root, 'frontend'), stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${port}`, PV1_CANDIDATE_SHA: sha, PV1_CANDIDATE_TREE: tree } })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`task-1001 browser proof exited ${code}`)))
  })
} finally {
  if (vite.exitCode == null && vite.signalCode == null) vite.kill('SIGTERM')
}
