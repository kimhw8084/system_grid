import { describe, expect, it } from 'vitest'
import { architectureInventoryText, architectureNeighbors, architectureSearch, cullArchitectureProjection, normalizeArchitectureProjection, validateArchitectureOperation } from './core'

const projection = normalizeArchitectureProjection({ model: { id: 'm1', name: 'Platform', revision: 4 }, objects: [{ id: 'a', kind: 'Application/Service', name: 'Checkout', lifecycle: 'Current', revision: 2, tags: ['payments'] }, { id: 'b', kind: 'Datastore', name: 'Orders', lifecycle: 'Planned', revision: 1 }], relations: [{ id: 'r1', source_id: 'a', target_id: 'b', relation_type: 'Changes', revision: 1 }], diagrams: [] })

describe('shared Architecture core', () => {
  it('normalizes one canonical projection and discovers one-hop impact', () => {
    expect(architectureNeighbors(projection, 'a')).toEqual(new Set(['a', 'b']))
    expect(architectureSearch(projection, 'payment').map((item) => item.id)).toEqual(['a'])
  })
  it('culls large projections while preserving only valid edges', () => {
    const large = normalizeArchitectureProjection({ ...projection, objects: Array.from({ length: 205 }, (_, index) => ({ id: `o-${index}`, kind: 'Component', name: `Component ${index}`, lifecycle: 'Current', revision: 1 })), relations: [{ id: 'r', source_id: 'o-0', target_id: 'o-1', relation_type: 'Uses', revision: 1 }] })
    const culled = cullArchitectureProjection(large, 200)
    expect(culled.objects).toHaveLength(200)
    expect(culled.relations).toHaveLength(1)
  })
  it('exports a textual inventory and rejects incomplete typed operations', () => {
    expect(architectureInventoryText(projection)).toContain('Checkout')
    expect(validateArchitectureOperation({ type: 'object.create', payload: {} })).toEqual(['Object kind is required.', 'Object name is required.'])
  })
})
