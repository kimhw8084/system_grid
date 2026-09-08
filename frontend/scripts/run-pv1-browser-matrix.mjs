#!/usr/bin/env node

import { spawn } from 'node:child_process'
import net from 'node:net'

const executable = (name) => process.platform === 'win32' ? `${name}.cmd` : name
const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    if (!address || typeof address === 'string') return reject(new Error('Unable to reserve loopback port'))
    server.close((error) => error ? reject(error) : resolve(address.port))
  })
})
const run = (command, args, env) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit', env })
  child.once('error', reject)
  child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code ?? signal}`)))
})
const waitForFrontend = async (url) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('Vite did not become ready')
}

const port = await reservePort()
const baseUrl = `http://127.0.0.1:${port}`
const vite = spawn(executable('npx'), ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore', env: process.env })
try {
  await waitForFrontend(baseUrl)
  await run(executable('npx'), ['playwright', 'test', 'tests/pv1-browser-matrix.spec.ts', '--workers=1'], { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl })
} finally {
  if (vite.exitCode == null && vite.signalCode == null) vite.kill('SIGTERM')
}
