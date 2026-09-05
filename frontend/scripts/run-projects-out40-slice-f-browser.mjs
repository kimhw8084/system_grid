import { spawn } from 'node:child_process'
import net from 'node:net'

const args = process.argv.slice(2)
const modeIndex = args.indexOf('--mode')
const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'regression'
const diagnostic = args.includes('--diagnostic')
const modes = new Set(['rehearsal', 'acceptance', 'regression'])
if (!modes.has(mode)) throw new Error(`Unsupported mode: ${mode}`)

const executable = (name) => process.platform === 'win32' ? `${name}.cmd` : name
const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    if (!address || typeof address === 'string') return reject(new Error('Unable to reserve loopback port'))
    const port = address.port
    server.close((error) => error ? reject(error) : resolve(port))
  })
})
const waitForFrontend = async (baseUrl) => {
  let lastError = null
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { redirect: 'manual' })
      if (response.status < 500) return
    } catch (error) { lastError = error }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw lastError || new Error(`Vite did not become ready at ${baseUrl}`)
}
const run = (command, commandArgs, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, commandArgs, { stdio: 'inherit', ...options })
  child.once('error', reject)
  child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code ?? signal}`)))
})

const port = await reservePort()
const baseUrl = `http://127.0.0.1:${port}`
const vite = spawn(executable('npx'), ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: diagnostic ? 'inherit' : ['ignore', 'pipe', 'pipe'], env: process.env })
if (!diagnostic) {
  vite.stdout?.on('data', () => {})
  vite.stderr?.on('data', () => {})
}

try {
  await waitForFrontend(baseUrl)
  const byMode = {
    rehearsal: ['playwright', 'test', 'tests/projects-out40-slice-f-task-drawer-a11y.spec.ts', '--grep', '@out40-slice-f-rehearsal', '--workers=1'],
    acceptance: ['playwright', 'test', 'tests/projects-out40-slice-f-task-drawer-a11y.spec.ts', '--grep', '@out40-slice-f-acceptance', '--workers=1'],
  }
  const browserEnv = { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl }
  if (mode === 'regression') {
    const sliceE = ['playwright', 'test', 'tests/projects-out40-slice-e-timeline-dependency-a11y.spec.ts', '--grep', '@out40-slice-e-acceptance', '--workers=1']
    const sliceD = ['playwright', 'test', 'tests/projects-out40-slice-d-wbs-keyboard.spec.ts', '--grep', '@out40-slice-d-acceptance', '--workers=1']
    const sliceC = ['playwright', 'test', 'tests/projects-out40-slice-c-board-a11y.spec.ts', '--grep', '@out40-slice-c-acceptance', '--workers=1']
    const scheduling = ['playwright', 'test', 'tests/projects-scheduling-completion.spec.ts', '--workers=1']
    const navigation = ['playwright', 'test', 'tests/projects-navigation.spec.ts', '--grep', '@navigation-acceptance', '--workers=1']
    const readability = ['playwright', 'test', 'tests/projects-readability.spec.ts', '--grep', 'P10 large Gantt remains contained and readable|narrow Projects navigation remains reachable', '--workers=1']
    for (const command of [sliceE, sliceD, sliceC, scheduling, navigation, readability]) {
      if (diagnostic) command.push('--trace=on')
      await run(executable('npx'), command, { env: browserEnv })
    }
  } else {
    if (diagnostic) byMode[mode].push('--trace=on')
    await run(executable('npx'), byMode[mode], { env: browserEnv })
  }
} finally {
  if (vite.exitCode == null && vite.signalCode == null) vite.kill('SIGTERM')
  await new Promise((resolve) => {
    if (vite.exitCode != null || vite.signalCode != null) return resolve()
    const timer = setTimeout(() => { if (vite.exitCode == null && vite.signalCode == null) vite.kill('SIGKILL'); resolve() }, 2000)
    vite.once('exit', () => { clearTimeout(timer); resolve() })
  })
}
