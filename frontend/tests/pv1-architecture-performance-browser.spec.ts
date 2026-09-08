import { expect, request, test, type Page } from '@playwright/test'

const apiOrigin = () => process.env.SYSGRID_P07_API_ORIGIN || ''
const user = 'p07.architecture'

async function setupLargeModel() {
  const api = await request.newContext({ baseURL: apiOrigin(), extraHTTPHeaders: { 'X-User-Id': user, 'X-Tenant-Id': '1' } })
  const createModelId = crypto.randomUUID()
  const modelResponse = await api.post('/api/v2/architecture/models', { headers: { 'Idempotency-Key': createModelId }, data: { command_id: createModelId, name: 'P07 Architecture Large Search Fixture' } })
  expect(modelResponse.ok(), await modelResponse.text()).toBeTruthy()
  const model = (await modelResponse.json()).model
  let revision = Number(model.revision || 1)
  for (let index = 0; index < 205; index += 1) {
    const commandId = crypto.randomUUID()
    const response = await api.post(`/api/v2/architecture/models/${model.id}/commands`, {
      headers: { 'Idempotency-Key': commandId },
      data: { command_id: commandId, type: 'object.create', expected: { model_revision: revision }, payload: { id: `p07-large-${index}`, kind: 'Component', name: `P07 Large ${index}` } },
    })
    expect(response.ok(), await response.text()).toBeTruthy()
    revision = Number((await response.json()).model_revision || revision + 1)
  }
  return { api, modelId: model.id }
}

async function open(page: Page, modelId: string) {
  await page.addInitScript(({ origin, user: identity }) => {
    localStorage.setItem('SYSGRID_OVERRIDE_API_URL', origin)
    localStorage.setItem('SYSGRID_USER_ID', identity)
    localStorage.setItem('SYSGRID_TENANT_ID', '1')
  }, { origin: apiOrigin(), user })
  await page.goto(`/architecture?model=${modelId}&mode=current`)
}

test.beforeEach(() => test.skip(!process.env.P07_REAL_BACKEND, 'requires isolated P07 backend proof runtime'))

test('Large Architecture culling preserves full search/list access and bounded rendering', async ({ page }) => {
  const fixture = await setupLargeModel()
  try {
    await open(page, fixture.modelId)
    await expect(page.getByRole('button', { name: 'P07 Large 0' })).toBeVisible()
    await expect(page.getByText(/205 objects/)).toBeVisible()
    const realizedObjects = await page.locator('[role="img"][aria-label="Architecture diagram projection"] svg g[role="button"]').count()
    expect(realizedObjects).toBeLessThanOrEqual(200)

    const search = page.getByLabel('Search Architecture objects')
    const samples: number[] = []
    for (let index = 0; index < 100; index += 1) {
      const target = `P07 Large ${105 + (index % 100)}`
      const started = await page.evaluate(() => performance.now())
      await search.fill(target)
      await expect(page.getByRole('button', { name: target })).toBeVisible()
      samples.push((await page.evaluate(() => performance.now())) - started)
    }
    const ordered = [...samples].sort((left, right) => left - right)
    const p95 = ordered[Math.floor((ordered.length - 1) * 0.95)]
    console.log(JSON.stringify({ schema: 'sysgrid.pv1.architecture-browser-performance.v1', profile: 'Large', sample_count: samples.length, p50_ms: ordered[49], p95_ms: p95, max_ms: ordered[99], realized_objects: realizedObjects, searchable_objects: 205, verdict: p95 <= 100 }))
    expect(p95).toBeLessThanOrEqual(100)
  } finally {
    await fixture.api.dispose()
  }
})
