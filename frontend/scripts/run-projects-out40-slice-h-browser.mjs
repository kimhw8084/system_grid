import { spawn } from 'node:child_process'
import net from 'node:net'

const args = process.argv.slice(2)
const modeIndex = args.indexOf('--mode')
const requested = modeIndex >= 0 ? args[modeIndex + 1] : (args[0] || 'regression')
const diagnostic = args.includes('--diagnostic')
const modes = new Set(['rehearsal', 'acceptance', 'regression'])
if (!modes.has(requested)) throw new Error(`Unsupported mode: ${requested}`)
const executable = (name) => process.platform === 'win32' ? `${name}.cmd` : name
const reservePort = () => new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const address = server.address(); if (!address || typeof address === 'string') return reject(new Error('Unable to reserve loopback port')); server.close((error) => error ? reject(error) : resolve(address.port)) }) })
const run = (command, args, env) => new Promise((resolve, reject) => { const child = spawn(command, args, { stdio: 'inherit', env }); child.once('error', reject); child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code ?? signal}`))) })
const waitForFrontend = async (baseUrl) => { let lastError = null; for (let attempt = 0; attempt < 120; attempt += 1) { try { const response = await fetch(baseUrl, { redirect: 'manual' }); if (response.status < 500) return } catch (error) { lastError = error } await new Promise((resolve) => setTimeout(resolve, 100)) } throw lastError || new Error('Vite did not become ready') }

const port = await reservePort(); const baseUrl = `http://127.0.0.1:${port}`
const vite = spawn(executable('npx'), ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: diagnostic ? 'inherit' : ['ignore', 'pipe', 'pipe'], env: process.env })
if (!diagnostic) { vite.stdout?.on('data', () => {}); vite.stderr?.on('data', () => {}) }
try {
  await waitForFrontend(baseUrl)
  const env = { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl }
  if (requested === 'rehearsal') await run(executable('npx'), ['playwright', 'test', 'tests/projects-out40-slice-h-gantt-modernization.spec.ts', '--grep', '@out40-slice-h-rehearsal', '--workers=1'], env)
  else if (requested === 'acceptance') await run(executable('npx'), ['playwright', 'test', 'tests/projects-out40-slice-h-gantt-modernization.spec.ts', '--grep', '@out40-slice-h-acceptance', '--workers=1'], env)
  else {
    const commands = [
      ['playwright','test','tests/projects-out40-slice-h-gantt-modernization.spec.ts','--workers=1'],
      ['playwright','test','tests/projects-out40-slice-g-accessible-name-audit.spec.ts','--workers=1'],
      ['playwright','test','tests/projects-out40-slice-f-task-drawer-a11y.spec.ts','--grep','@out40-slice-f-acceptance','--workers=1'],
      ['playwright','test','tests/projects-out40-slice-e-timeline-dependency-a11y.spec.ts','--grep','@out40-slice-e-acceptance','--workers=1'],
      ['playwright','test','tests/projects-out40-slice-d-wbs-keyboard.spec.ts','--grep','@out40-slice-d-acceptance','--workers=1'],
      ['playwright','test','tests/projects-out40-slice-c-board-a11y.spec.ts','--grep','@out40-slice-c-acceptance','--workers=1'],
      // The former ProjectsSchedulingCompletion browser spec targets the superseded
      // v1 schedule-control surface. Canonical Timeline proof is run by
      // scripts/proof-p06-timeline-scheduling.sh and the v2 H suites above.
      ['playwright','test','tests/projects-navigation.spec.ts','--grep','@navigation-acceptance','--workers=1'],
      ['playwright','test','tests/projects-readability.spec.ts','--grep','P10 large Gantt remains contained and readable|narrow Projects navigation remains reachable','--workers=1'],
    ]
    for (const command of commands) await run(executable('npx'), command, env)
  }
} finally {
  if (vite.exitCode == null && vite.signalCode == null) vite.kill('SIGTERM')
  await new Promise((resolve) => { if (vite.exitCode != null || vite.signalCode != null) return resolve(); const timer = setTimeout(() => { if (vite.exitCode == null && vite.signalCode == null) vite.kill('SIGKILL'); resolve() }, 2000); vite.once('exit', () => { clearTimeout(timer); resolve() }) })
}
