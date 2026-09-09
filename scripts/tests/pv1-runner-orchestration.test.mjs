import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  buildChecks,
  checkAccounting,
  command,
  runChecksWithDependencies,
  validateCheckDependencies,
  validateDependencyResult,
} from '../pv1/runner.mjs'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const context = {
  run_id: 'runner-test-run',
  candidate_git_sha: 'a'.repeat(40),
  candidate_tree_sha: 'b'.repeat(40),
}

function nodeCheck(id, source, options = {}) {
  return command(id, 'test', repoRoot, process.execPath, ['-e', source], options)
}

function appendEventSource() {
  return "const fs=require('node:fs'); const event=(kind)=>fs.appendFileSync(process.env.EVENT,JSON.stringify({kind,name:process.env.NAME,at:Date.now()})+'\\n'); event('start'); setTimeout(()=>{event('end')},60)"
}

test('production registry declares browser performance before both artifact consumers', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-runner-registry-'))
  try {
    const checks = await buildChecks({ repoRoot, outputDir })
    const variants = checks.find((check) => check.id === 'performance:variant-validation')
    const measurements = checks.find((check) => check.id === 'performance:measurement-integrity')
    const browserPerformance = checks.find((check) => check.id === 'browser:performance')
    assert.deepEqual(variants.depends_on, ['browser:performance'])
    assert.deepEqual(measurements.depends_on, ['browser:performance'])
    assert.deepEqual(browserPerformance.depends_on, ['frontend:build'])
    assert.deepEqual(validateCheckDependencies(checks).dependency_graph['browser:performance'], ['frontend:build'])
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})

test('unknown prerequisites, duplicate IDs, self-dependencies, and cycles are rejected before execution', () => {
  const base = (id, depends_on = []) => ({ id, depends_on })
  assert.throws(() => validateCheckDependencies([base('consumer', ['missing'])]), /UNKNOWN_CHECK_DEPENDENCY/)
  assert.throws(() => validateCheckDependencies([base('same'), base('same')]), /DUPLICATE_CHECK_ID/)
  assert.throws(() => validateCheckDependencies([base('self', ['self'])]), /DEPENDENCY_CYCLE/)
  assert.throws(() => validateCheckDependencies([base('a', ['b']), base('b', ['a'])]), /DEPENDENCY_CYCLE/)
})

test('independent checks execute concurrently while dependent checks wait for the producer', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-runner-concurrency-'))
  const event = path.join(outputDir, 'events.jsonl')
  try {
    const producerArtifact = path.join(outputDir, 'producer.json')
    const producer = nodeCheck('producer', "const fs=require('node:fs'); fs.writeFileSync(process.env.EVENT,'producer-start\\n'); setTimeout(()=>{fs.writeFileSync(process.env.ARTIFACT,'ready'); fs.appendFileSync(process.env.EVENT,'producer-end\\n')},60)", {
      env: { EVENT: event, ARTIFACT: producerArtifact },
      artifact_files: [producerArtifact],
    })
    const independent = nodeCheck('independent', appendEventSource(), { env: { EVENT: event, NAME: 'independent' } })
    const consumer = nodeCheck('consumer', "const fs=require('node:fs'); if(!fs.existsSync(process.env.ARTIFACT)) process.exit(9); fs.writeFileSync(process.env.CONSUMER,'consumer-ran')", {
      depends_on: ['producer'],
      env: { ARTIFACT: producerArtifact, CONSUMER: path.join(outputDir, 'consumer.txt') },
    })
    const result = await runChecksWithDependencies([producer, independent, consumer], outputDir, context, { maxConcurrency: 2 })
    assert.deepEqual(result.results.map((item) => item.status), ['PASS', 'PASS', 'PASS'])
    assert.equal(await readFile(path.join(outputDir, 'consumer.txt'), 'utf8'), 'consumer-ran')
    const events = (await readFile(event, 'utf8')).trim().split('\n')
    assert.ok(events.includes('producer-start'))
    assert.ok(events.includes('producer-end'))
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})

test('repeated producer/consumer scheduling never exposes the original ENOENT race', async () => {
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-runner-race-'))
    try {
      const artifact = path.join(outputDir, 'producer.json')
      const consumerMarker = path.join(outputDir, 'consumer.txt')
      const producer = nodeCheck('browser:performance', "const fs=require('node:fs'); setTimeout(()=>fs.writeFileSync(process.env.ARTIFACT,JSON.stringify({iteration:process.env.ITERATION})),35)", {
        env: { ARTIFACT: artifact, ITERATION: String(iteration) },
        artifact_files: [artifact],
      })
      const consumer = nodeCheck('performance:measurement-integrity', "const fs=require('node:fs'); const value=JSON.parse(fs.readFileSync(process.env.INPUT,'utf8')); if(value.iteration!==process.env.ITERATION) process.exit(11); fs.writeFileSync(process.env.OUTPUT,'ok')", {
        depends_on: ['browser:performance'],
        env: { INPUT: artifact, OUTPUT: consumerMarker, ITERATION: String(iteration) },
      })
      const result = await runChecksWithDependencies([producer, consumer], outputDir, { ...context, run_id: `race-${iteration}` }, { maxConcurrency: 2 })
      assert.deepEqual(result.results.map((item) => item.status), ['PASS', 'PASS'])
      assert.equal(await readFile(consumerMarker, 'utf8'), 'ok')
    } finally {
      await rm(outputDir, { recursive: true, force: true })
    }
  }
})

test('failed producer blocks consumers with explicit dependency failure and does not execute them', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-runner-failure-'))
  try {
    const producer = nodeCheck('producer', 'process.exit(3)', { artifact_files: [path.join(outputDir, 'missing.json')] })
    const consumer = nodeCheck('consumer', "require('node:fs').writeFileSync(process.env.MARKER,'ran')", {
      depends_on: ['producer'],
      env: { MARKER: path.join(outputDir, 'consumer.txt') },
    })
    const result = await runChecksWithDependencies([producer, consumer], outputDir, context)
    assert.equal(result.results[0].status, 'FAIL')
    assert.equal(result.results[1].status, 'BLOCKED')
    assert.equal(result.results[1].dependency_failure.code, 'DEPENDENCY_FAILED')
    await assert.rejects(readFile(path.join(outputDir, 'consumer.txt'), 'utf8'))
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})

test('stale and cross-candidate artifacts cannot satisfy a dependency', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-runner-binding-'))
  try {
    const staleArtifact = path.join(outputDir, 'stale.json')
    await writeFile(staleArtifact, 'old-run')
    const producer = nodeCheck('producer', 'process.exit(0)', { artifact_files: [staleArtifact] })
    const consumer = nodeCheck('consumer', 'process.exit(0)', { depends_on: ['producer'] })
    const staleResult = await runChecksWithDependencies([producer, consumer], outputDir, context)
    assert.equal(staleResult.results[0].status, 'FAIL')
    assert.equal(staleResult.results[0].artifact_error.code, 'MISSING_DECLARED_ARTIFACT')
    assert.equal(staleResult.results[1].dependency_failure.code, 'DEPENDENCY_FAILED')

    const bytes = Buffer.from('bound')
    await writeFile(path.join(outputDir, 'bound.json'), bytes)
    const bound = {
      status: 'PASS',
      check_id: 'producer',
      run_id: 'old-run',
      candidate_git_sha: 'c'.repeat(40),
      candidate_tree_sha: 'd'.repeat(40),
      declared_artifact_files: ['bound.json'],
      artifact_bindings: [{ path: 'bound.json', sha256: createHash('sha256').update(bytes).digest('hex'), run_id: 'old-run', candidate_git_sha: 'c'.repeat(40), candidate_tree_sha: 'd'.repeat(40) }],
    }
    const validation = await validateDependencyResult(bound, { outputDir, ...context })
    assert.equal(validation.valid, false)
    assert.equal(validation.code, 'PREREQUISITE_RUN_MISMATCH')

    const wrongCandidate = { ...bound, run_id: context.run_id, artifact_bindings: [{ ...bound.artifact_bindings[0], run_id: context.run_id }] }
    const wrongCandidateValidation = await validateDependencyResult(wrongCandidate, { outputDir, ...context })
    assert.equal(wrongCandidateValidation.valid, false)
    assert.equal(wrongCandidateValidation.code, 'PREREQUISITE_CANDIDATE_MISMATCH')

    const currentRunBound = { ...bound, run_id: context.run_id, candidate_git_sha: context.candidate_git_sha, candidate_tree_sha: context.candidate_tree_sha, artifact_bindings: [{ ...bound.artifact_bindings[0], run_id: context.run_id, candidate_git_sha: context.candidate_git_sha, candidate_tree_sha: context.candidate_tree_sha }] }
    await writeFile(path.join(outputDir, 'bound.json'), 'swapped')
    const swappedValidation = await validateDependencyResult(currentRunBound, { outputDir, ...context })
    assert.equal(swappedValidation.valid, false)
    assert.equal(swappedValidation.code, 'PREREQUISITE_ARTIFACT_BINDING_MISMATCH')
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})

test('two consumers see the same successful producer artifact and scheduler accounting remains deterministic', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-runner-consumers-'))
  try {
    const artifact = path.join(outputDir, 'producer.json')
    const producer = nodeCheck('producer', "require('node:fs').writeFileSync(process.env.ARTIFACT,'shared')", { env: { ARTIFACT: artifact }, artifact_files: [artifact] })
    const makeConsumer = (id) => nodeCheck(id, "const fs=require('node:fs'); if(fs.readFileSync(process.env.INPUT,'utf8')!=='shared') process.exit(4); fs.writeFileSync(process.env.OUTPUT,'pass')", {
      depends_on: ['producer'],
      env: { INPUT: artifact, OUTPUT: path.join(outputDir, `${id}.txt`) },
    })
    const consumers = [makeConsumer('variant-validation'), makeConsumer('measurement-integrity')]
    const result = await runChecksWithDependencies([producer, ...consumers], outputDir, context)
    assert.deepEqual(result.results.map((item) => item.status), ['PASS', 'PASS', 'PASS'])
    assert.deepEqual(result.dependency_graph, { producer: [], 'variant-validation': ['producer'], 'measurement-integrity': ['producer'] })
    assert.equal(await readFile(path.join(outputDir, 'variant-validation.txt'), 'utf8'), 'pass')
    assert.equal(await readFile(path.join(outputDir, 'measurement-integrity.txt'), 'utf8'), 'pass')
    const accounting = checkAccounting([producer, ...consumers, { ...consumers[0], id: 'duplicate-variant' }])
    assert.equal(accounting.duplicates_detected.length, 1)
    assert.equal(accounting.unique_registered_checks, 3)
    assert.equal(accounting.execution_instances, 4)
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})

test('independent checks overlap without changing deterministic result ordering', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-runner-overlap-'))
  const event = path.join(outputDir, 'events.jsonl')
  try {
    const first = nodeCheck('first', appendEventSource(), { env: { EVENT: event, NAME: 'first' } })
    const second = nodeCheck('second', appendEventSource(), { env: { EVENT: event, NAME: 'second' } })
    const result = await runChecksWithDependencies([first, second], outputDir, context, { maxConcurrency: 2 })
    assert.deepEqual(result.results.map((item) => item.check_id), ['first', 'second'])
    assert.deepEqual(result.results.map((item) => item.status), ['PASS', 'PASS'])
    const events = (await readFile(event, 'utf8')).trim().split('\n').map((line) => JSON.parse(line))
    const firstStart = events.find((item) => item.name === 'first' && item.kind === 'start')
    const firstEnd = events.find((item) => item.name === 'first' && item.kind === 'end')
    const secondStart = events.find((item) => item.name === 'second' && item.kind === 'start')
    const secondEnd = events.find((item) => item.name === 'second' && item.kind === 'end')
    assert.ok(firstStart.at < secondEnd.at && secondStart.at < firstEnd.at)
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})
