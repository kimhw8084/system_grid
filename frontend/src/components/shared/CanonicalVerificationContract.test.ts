import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '../../../..')
const read = (relative: string) => fs.readFileSync(path.join(repoRoot, relative), 'utf8')

describe('canonical verification contract', () => {
  it('binds Playwright through an argument array that comments cannot sever', () => {
    const script = read('scripts/verify-app.sh')
    expect(script).toContain('PLAYWRIGHT_ENV_COMMAND=(')
    expect(script).toContain('"SYSGRID_CANONICAL_GATE=1"')
    expect(script).toContain('"SYSGRID_EXPECTED_FRONTEND_ORIGIN=$FRONTEND_ORIGIN"')
    expect(script).toContain('"SYSGRID_EXPECTED_API_BASE=$BACKEND_ORIGIN/api/v1"')
    expect(script).toContain('"${PLAYWRIGHT_ENV_COMMAND[@]}" "$FRONTEND_DIR/node_modules/.bin/playwright" test "${specs[@]}" --workers="$PLAYWRIGHT_WORKERS"')
    expect(script).toContain('run_playwright_group affected_browser_promotion "${PROMOTION_SPECS[@]}"')
    expect(script).toContain('run_playwright_group remaining_canonical_playwright "${REMAINING_SPECS[@]}"')
    expect(script).not.toContain('npx playwright')
    expect(script).toContain('run_validation_lanes')
    expect(script).toContain('local vite_bin="$FRONTEND_DIR/node_modules/.bin/vite"')
    expect(script).toContain('"$vite_bin" preview --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" --strictPort')
    expect(script).toContain('wait_for_listener "$FRONTEND_PORT" "isolated production frontend"')
    expect(script).toContain('wait_for_http "$FRONTEND_URL" "isolated production frontend"')
    expect(script).toContain(`curl --noproxy '*' --connect-timeout 1 --max-time 3 -fsS "$url"`)
    expect(script).toContain('readiness_diagnostics')
    expect(script).toContain('launch_frontend_with_readiness')
    expect(script).not.toContain('npm run preview --')
    expect(script).toContain('VITE_API_BASE_URL="$BACKEND_ORIGIN" VITE_FRONTEND_ORIGIN="$FRONTEND_ORIGIN" npm run build')
    expect(script).not.toMatch(/^\s*npm run check:shell-contracts\s*$/m)
    expect(script).not.toContain('npm run dev --')
  })

  it('fails closed when canonical frontend or API bindings are absent or mismatched', () => {
    const config = read('frontend/playwright.config.ts')
    const helper = read('frontend/tests/helpers/sysgrid.ts')
    const fixture = read('frontend/tests/helpers/sysgrid-test.ts')
    expect(config).toContain("process.env.SYSGRID_CANONICAL_GATE === '1'")
    expect(config).toContain('Canonical SysGrid gate requires explicit frontend and API runtime bindings')
    expect(config).toContain("video: 'off'")
    expect(config).not.toContain("video: 'retain-on-failure'")
    expect(helper).toContain('Canonical runtime mismatch')
    expect(helper).toContain('Canonical API request escaped the isolated runtime')
    expect(fixture).toContain('playwright.request.newContext')
    expect(fixture).toContain('resolveTestApiUrl(path)')
    expect(read('frontend/tests/blank-slate-audit.spec.ts')).toContain('resetBrowserState(page, { tenantId: emptyTenantId')
  })

  it('requires exact runtime and populated Golden Eight evidence after Playwright', () => {
    const script = read('scripts/verify-app.sh')
    expect(script).toContain('assert_canonical_runtime_evidence')
    expect(script).toContain('assert_populated_golden_eight_evidence')
    for (const key of ['monitoring', 'assets', 'services', 'external', 'network', 'far', 'research', 'vendors']) expect(script).toContain(key)
  })

  it('awaits exact tenant evidence and narrowly classifies the known browser diagnostic', () => {
    const seeded = read('frontend/tests/golden-eight-seeded-visual-matrix.spec.ts')
    const sentinel = read('frontend/tests/helpers/sentinel.ts')
    expect(seeded).toContain('const tenantResponsePromise = page.waitForResponse')
    expect(seeded).toContain("response.headers()['x-sysgrid-tenant-id'] === testTenantId")
    expect(seeded).toContain('const tenantResponse = await tenantResponsePromise')
    expect(sentinel).toContain("'ResizeObserver loop completed with undelivered notifications.'")
    expect(sentinel).toContain('[known-browser-diagnostic]')
    expect(sentinel).not.toContain("includes('ResizeObserver')")
  })

  it('publishes product subgate progress through the registered v2 event channel', () => {
    const script = read('scripts/verify-app.sh')
    for (const event of [
      'static_started',
      'backend_started',
      'frontend_started',
      'static_completed',
      'backend_completed',
      'frontend_completed',
      'build_completed',
      'runtime_ready',
      'playwright_started',
      'playwright_completed',
    ]) expect(script).toContain(`emit_progress ${event}`)
  })
})
