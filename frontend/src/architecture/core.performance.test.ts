import { describe, expect, it } from 'vitest'
import { cullArchitectureProjection, normalizeArchitectureProjection } from './core'

const makeScaleFixture = () => normalizeArchitectureProjection({
  model: { id: 'scale-model', name: 'Architecture scale fixture', revision: 1 },
  objects: Array.from({ length: 5000 }, (_, index) => ({
    id: `object-${index}`,
    kind: index % 2 ? 'Component' : 'Application/Service',
    name: `Scale object ${index}`,
    lifecycle: 'Current',
    revision: 1,
  })),
  relations: Array.from({ length: 10000 }, (_, index) => ({
    id: `relation-${index}`,
    source_id: `object-${index % 5000}`,
    target_id: `object-${(index + 1) % 5000}`,
    relation_type: 'Depends on',
    revision: 1,
  })),
})

describe('Architecture scale evidence', () => {
  it('culls the 5000/10000 fixture to the contextual projection within budget', () => {
    const fixture = makeScaleFixture()
    for (let index = 0; index < 10; index += 1) cullArchitectureProjection(fixture, 200)

    const samples = Array.from({ length: 100 }, () => {
      const started = performance.now()
      const visible = cullArchitectureProjection(fixture, 200)
      const elapsed = performance.now() - started
      expect(visible.objects).toHaveLength(200)
      expect(visible.relations.every((relation) => relation.source_id.startsWith('object-') && relation.target_id.startsWith('object-'))).toBe(true)
      return elapsed
    }).sort((left, right) => left - right)

    const p95 = samples[94]
    console.log(`PV1 architecture scale fixture objects=5000 relations=10000 contextual=200 samples=100 p50_ms=${samples[49].toFixed(2)} p95_ms=${p95.toFixed(2)} max_ms=${samples[99].toFixed(2)}`)
    expect(p95).toBeLessThanOrEqual(2000)
  })
})
