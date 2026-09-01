#!/usr/bin/env node
import { spawn } from 'node:child_process'
import process from 'node:process'

const args = process.argv.slice(2)
const modeIndex = args.indexOf('--mode')
const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'acceptance'
if (!['rehearsal', 'acceptance'].includes(mode)) {
  console.error(`Unsupported navigation proof mode: ${mode}`)
  process.exit(2)
}
const host = '127.0.0.1'
const port = '41732'
const baseURL = `http://${host}:${port}`
const env = { ...process.env, PLAYWRIGHT_BASE_URL: baseURL, VITE_API_BASE_URL: baseURL, VITE_IDENTITY_MODE: 'development', SYSGRID_USER_ID: 'proof_operator' }
const bin = (name) => process.platform === 'win32' ? `node_modules/.bin/${name}.cmd` : `node_modules/.bin/${name}`
const vite = spawn(bin('vite'), ['--host', host, '--port', port, '--strictPort'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
vite.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`))
vite.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`))
let stopped = false
const stop = () => { if (stopped) return; stopped = true; vite.kill('SIGTERM') }
process.on('SIGINT', () => { stop(); process.exit(130) })
process.on('SIGTERM', () => { stop(); process.exit(143) })
const waitForServer = async () => {
  let last = null
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (vite.exitCode != null) throw new Error(`Vite exited before readiness with code ${vite.exitCode}`)
    try { const response = await fetch(baseURL, { signal: AbortSignal.timeout(1000) }); if (response.ok) return; last = new Error(`Vite readiness returned ${response.status}`) } catch (error) { last = error }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw last || new Error('Vite readiness timed out')
}
try {
  await waitForServer()
  const grep = mode === 'rehearsal' ? '@navigation-rehearsal' : '@navigation-acceptance'
  const runner = spawn('npx', ['playwright', 'test', 'tests/projects-navigation.spec.ts', '--config=playwright.config.ts', '--workers=1', '--grep', grep], { env, stdio: 'inherit' })
  const exitCode = await new Promise((resolve) => runner.on('exit', (code) => resolve(code ?? 1)))
  stop(); process.exit(Number(exitCode))
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error)); stop(); process.exit(1)
}
