import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { apiFetch, setApiOverride, getApiBaseUrl } from './api/apiClient'
import { AlertTriangle, Database, Globe, ShieldAlert, UserCircle2, Wrench } from 'lucide-react'
import { WorkspaceSectionCard, WorkspaceSectionBadge, WorkspaceEmptyState } from './components/shared/OperationalWorkspacePrimitives'
import { PageHeader, PageToolbar, ToolbarButton, ToolbarGroup } from './components/shared/LayoutPrimitives'

console.log("MAIN.TSX: Initializing React Root");

// Global error capture for early bootstrap issues
window.addEventListener('error', (event) => {
  console.error("GLOBAL_ERROR_BEFORE_MOUNT:", event.message, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("GLOBAL_REJECTION_BEFORE_MOUNT:", event.reason);
});

function normalizeUiApiOrigin(url: string): string {
  return (url || '').trim().replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '')
}

function isLoopbackOrigin(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(normalizeUiApiOrigin(url))
}

function isLikelyForwardedHost(hostname: string): boolean {
  return !/^(127\.0\.0\.1|localhost)$/i.test(hostname) && hostname.includes('.')
}

function resolveBootstrapCredentialsMode(url: string): RequestCredentials {
  try {
    const targetUrl = new URL(url, window.location.origin)
    return targetUrl.origin === window.location.origin ? 'same-origin' : 'include'
  } catch {
    return 'same-origin'
  }
}

function getBootstrapUserId() {
  return (
    localStorage.getItem('SYSGRID_USER_ID') ||
    localStorage.getItem('SYSGRID_CONFIG_DEFAULT_USER_ID') ||
    'admin_root'
  )
}

const Bootstrap = () => {
  const BOOTSTRAP_MAX_ATTEMPTS = 4
  const BOOTSTRAP_RETRY_DELAY_MS = 750
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string>("");
  const [appKey, setAppKey] = useState(0);
  const [backendDiagnostics, setBackendDiagnostics] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let pollInterval: any = null;
    let retryTimeout: any = null;

    const sleep = (ms: number) => new Promise((resolve) => {
      retryTimeout = window.setTimeout(resolve, ms)
    })

    const fetchConfig = async () => {
      try {
        console.log("BOOTSTRAP: Fetching system configuration...");
        let response;
        let usedRelativeBootstrap = false
        const configuredBaseUrl = normalizeUiApiOrigin(getApiBaseUrl() || '')
        const currentOrigin = normalizeUiApiOrigin(window.location.origin)
        const shouldPreferRelativeBootstrap = !configuredBaseUrl || configuredBaseUrl === currentOrigin

        const fetchRelativeBootstrap = async () => {
          const relativeResponse = await fetch('/api/v1/settings/bootstrap', {
            cache: 'no-store',
            credentials: 'same-origin',
          })
          const contentType = relativeResponse.headers.get('content-type') || ''
          if (!relativeResponse.ok || !contentType.toLowerCase().includes('application/json')) {
            throw new Error(`Relative bootstrap is unavailable from this origin (status ${relativeResponse.status})`)
          }
          usedRelativeBootstrap = true
          return relativeResponse
        }

        const fetchConfiguredBootstrap = async () => {
          const configuredResponse = await apiFetch('/api/v1/settings/bootstrap')
          if (!configuredResponse.ok) {
            throw new Error(`API Error ${configuredResponse.status}`)
          }
          return configuredResponse
        }

        try {
          if (shouldPreferRelativeBootstrap) {
            try {
              response = await fetchRelativeBootstrap()
            } catch (relativeErr) {
              console.warn("BOOTSTRAP: Relative bootstrap unavailable, falling back to configured API target...", relativeErr)
              response = await apiFetch('/api/v1/settings/bootstrap');
            }
          } else {
            try {
              response = await fetchConfiguredBootstrap()
            } catch (configuredErr) {
              console.warn("BOOTSTRAP: Configured bootstrap target failed, clearing configuration cache and retrying...", configuredErr)
              Object.keys(localStorage).forEach(k => {
                if (k.startsWith('SYSGRID_CONFIG_')) {
                  localStorage.removeItem(k)
                }
              })
              response = await fetchConfiguredBootstrap()
            }
          }
        } catch (initialErr) {
          console.warn("BOOTSTRAP: Initial fetch failed, clearing configuration cache and retrying...", initialErr);
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('SYSGRID_CONFIG_')) {
              localStorage.removeItem(k);
            }
          });
          try {
            response = await fetchConfiguredBootstrap()
          } catch (overrideErr) {
            const currentOverride = localStorage.getItem('SYSGRID_OVERRIDE_API_URL') || ''
            const envApiBase = (import.meta.env.VITE_API_BASE_URL || '').trim()
            if (currentOverride && envApiBase && currentOverride !== envApiBase) {
              console.warn("BOOTSTRAP: Retrying without stale API override...", currentOverride);
              setApiOverride(null);
              response = await fetchConfiguredBootstrap()
            } else {
              throw overrideErr;
            }
          }
        }
        
        const config = await response.json();
        console.log("BOOTSTRAP: Configuration received", config);
        if (usedRelativeBootstrap) {
          const currentOverride = localStorage.getItem('SYSGRID_OVERRIDE_API_URL') || ''
          const currentOrigin = window.location.origin.replace(/\/$/, '')
          const normalizedOverride = currentOverride.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '')
          if (normalizedOverride && normalizedOverride !== currentOrigin) {
            console.warn(`BOOTSTRAP: Clearing stale API override ${normalizedOverride} because same-origin API is healthy at ${currentOrigin}`)
            setApiOverride(null)
          }
        }
        let changed = false;
        Object.entries(config).forEach(([key, value]) => {
          const lsKey = `SYSGRID_CONFIG_${key}`;
          if (localStorage.getItem(lsKey) !== String(value)) {
            changed = true;
            localStorage.setItem(lsKey, String(value));
          }
        });
        if (changed && ready) {
          console.log("BOOTSTRAP: Configuration updated, triggering re-render");
          setAppKey(prev => prev + 1);
        }
        return true;
      } catch (err: any) {
        console.error("BOOTSTRAP: Failed to fetch configuration", err);
        throw err;
      }
    };

    const init = async () => {
      try {
        let lastError: any = null
        for (let attempt = 1; attempt <= BOOTSTRAP_MAX_ATTEMPTS; attempt += 1) {
          try {
            await fetchConfig();
            lastError = null
            break
          } catch (err: any) {
            lastError = err
            console.warn(`BOOTSTRAP: attempt ${attempt} failed`, err)
            if (attempt < BOOTSTRAP_MAX_ATTEMPTS) {
              await sleep(BOOTSTRAP_RETRY_DELAY_MS)
            }
          }
        }
        if (lastError) throw lastError
        if (isMounted) {
          console.log("BOOTSTRAP: System ready, launching application layer");
          setReady(true);
        }

        // Try WebSocket, fallback to polling
        const baseUrl = getApiBaseUrl() || window.location.origin;
        const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
        const wsUrl = baseUrl.replace(/^https?/, wsProtocol) + '/api/v1/ws/sync';
        
        console.log("BOOTSTRAP: Initializing WebSocket sync at " + wsUrl);
        try {
          ws = new WebSocket(wsUrl);
          ws.onmessage = (event) => {
            if (event.data === 'CONFIG_UPDATED') {
              console.log("WS: CONFIG_UPDATED signal received");
              fetchConfig().catch(() => {});
            }
          };
          ws.onerror = (err) => {
            console.warn("WS: Connection failed. Gracefully degrading to HTTP polling.", err);
            if (!pollInterval) {
              pollInterval = setInterval(() => fetchConfig().catch(() => {}), 60000); // 1 min fallback
            }
          };
        } catch (e) {
          console.warn("WS: Setup failed. Gracefully degrading to HTTP polling.", e);
          pollInterval = setInterval(() => fetchConfig().catch(() => {}), 60000);
        }

      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to connect to backend");
          setFailedUrl(err.url || getApiBaseUrl() || "relative path");
        }
      }
    };
    
    init();
    return () => { 
      isMounted = false; 
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []); // Only run once on mount

  useEffect(() => {
    if (!error) return
    let cancelled = false

    const fetchStartupDiagnostics = async () => {
      const baseUrl = normalizeUiApiOrigin(getApiBaseUrl() || '')
      const candidateUrls = [
        baseUrl ? `${baseUrl}/api/v1/settings/startup-check` : null,
        '/api/v1/settings/startup-check',
      ].filter((value, index, collection): value is string => Boolean(value) && collection.indexOf(value) === index)

      let fallbackResult: any = null

      for (const diagnosticsUrl of candidateUrls) {
        try {
          const response = await fetch(diagnosticsUrl, {
            cache: 'no-store',
            credentials: resolveBootstrapCredentialsMode(diagnosticsUrl),
          })
          const text = await response.text()
          let data: any = null
          if (text) {
            try {
              data = JSON.parse(text)
            } catch {
              data = { detail: text }
            }
          }
          const result = {
            ok: response.ok,
            status: response.status,
            data,
            url: diagnosticsUrl,
          }
          if (response.ok) {
            if (!cancelled) {
              setBackendDiagnostics(result)
            }
            return
          }
          fallbackResult = result
        } catch (diagnosticError: any) {
          fallbackResult = {
            ok: false,
            status: null,
            data: { detail: diagnosticError?.message || 'Backend startup diagnostics request failed.' },
            url: diagnosticsUrl,
          }
        }
      }

      if (!cancelled) {
        setBackendDiagnostics(fallbackResult)
      }
    }

    fetchStartupDiagnostics()
    return () => {
      cancelled = true
    }
  }, [error])

  const currentOrigin = window.location.origin
  const configuredApiBase = getApiBaseUrl()
  const effectiveUserId = getBootstrapUserId()

  const failureDiagnosis = (() => {
    const normalizedFailedUrl = normalizeUiApiOrigin(failedUrl || configuredApiBase || '')
    const normalizedConfiguredApiBase = normalizeUiApiOrigin(configuredApiBase || '')
    const statusMatch = error?.match(/\b403\b|\b404\b|\b500\b/)
    const is403 = error?.includes('403') || failedUrl.includes('403')
    const usesLoopbackApi = isLoopbackOrigin(normalizedFailedUrl || normalizedConfiguredApiBase)
    const forwardedUi = isLikelyForwardedHost(window.location.hostname)
    const overrideUrl = localStorage.getItem('SYSGRID_OVERRIDE_API_URL') || ''
    const includesApiV1 = /\/api\/v1\/?$/i.test(configuredApiBase || '') || /\/api\/v1\/?$/i.test(failedUrl || '')

    const reasons: string[] = []
    const actions: string[] = []

    if (forwardedUi && usesLoopbackApi) {
      reasons.push('The app is running on a forwarded or hosted UI origin, but the API target is still a loopback URL. The browser cannot use the backend machine-local 127.0.0.1 address in this mode.')
      actions.push('Set `frontend/.env.local` so `VITE_API_BASE_URL` is the forwarded backend origin, not `http://127.0.0.1:8000`.')
      actions.push('Set `backend/.env` so `BACKEND_CORS_ORIGINS` includes the exact forwarded frontend origin.')
    }
    if (includesApiV1) {
      reasons.push('The configured API base appears to include `/api/v1`, but SysGrid expects the backend origin only.')
      actions.push('Change the API base to the origin only, for example `https://backend.example.com`, without `/api/v1`.')
    }
    if (is403) {
      const isViewOnly403 = /view-only access/i.test(error || '')
      reasons.push(
        isViewOnly403
          ? 'The backend is reachable, but this user currently has view-only access and cannot perform the requested modifying action.'
          : 'The backend is reachable, but it is rejecting the current user or tenant context with 403 Forbidden.'
      )
      actions.push(`Ensure the browser user is the seeded or provisioned user. Current effective user is \`${effectiveUserId}\`.`)
      if (isViewOnly403) {
        actions.push('Viewing the app is allowed, but edits are blocked for this user. Contact an administrator if this account should have editor or admin permissions.')
      } else {
        actions.push('If this is a disposable local environment, set `localStorage.SYSGRID_USER_ID = "haewon.kim"` and reload, or clear `SYSGRID_USER_ID` to use the bootstrap default.')
        actions.push('Make sure the selected tenant in the active config DB grants access to that user.')
        actions.push('If this user should only browse the app, confirm that public read-only mode is enabled and a public tenant is available on the backend.')
      }
    }
    if (overrideUrl) {
      reasons.push('A stored API override is present and may be routing requests to an old or incompatible backend.')
      actions.push('Use `Clear Overrides & Retry` first if the configured backend changed.')
    }
    if (!reasons.length) {
      reasons.push('The frontend could not complete bootstrap against the configured backend target.')
      actions.push('Verify `/api/v1/health` on the configured backend origin and confirm `VITE_API_BASE_URL` and `BACKEND_CORS_ORIGINS` are aligned.')
    }

    return {
      statusMatch,
      reasons,
      actions,
      diagnostics: {
        uiOrigin: currentOrigin,
        configuredApiBase: normalizedConfiguredApiBase || '<blank>',
        failedUrl: normalizedFailedUrl || '<blank>',
        storedOverride: overrideUrl || '<none>',
        effectiveUserId,
      },
    }
  })()

  if (error) {
    const backendWarnings = Array.isArray(backendDiagnostics?.data?.warnings) ? backendDiagnostics.data.warnings : []
    const accessibleTenants = Array.isArray(backendDiagnostics?.data?.tenant?.accessible_tenants)
      ? backendDiagnostics.data.tenant.accessible_tenants
      : []

    return (
      <div className="min-h-screen w-full bg-[var(--bg-primary)] text-[var(--accent-primary)] font-mono">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8">
          <WorkspaceSectionCard className="space-y-4 p-6">
            <PageHeader
              eyebrow="Bootstrap Failure"
              title="Connection Failure"
              subtitle="Startup could not establish a valid backend, user, and tenant contract."
              meta={
                <div className="flex flex-wrap items-center gap-2">
                  <WorkspaceSectionBadge tone="rose">Bootstrap Blocked</WorkspaceSectionBadge>
                  {backendDiagnostics?.ok ? <WorkspaceSectionBadge tone="emerald">Backend Diagnostics Live</WorkspaceSectionBadge> : null}
                  {backendWarnings.length ? <WorkspaceSectionBadge tone="amber">{backendWarnings.length} Warning{backendWarnings.length > 1 ? 's' : ''}</WorkspaceSectionBadge> : null}
                </div>
              }
              actions={
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-400">
                  <AlertTriangle size={18} />
                </div>
              }
            />
            <p className="max-w-4xl text-[11px] font-semibold leading-relaxed text-slate-400">
              SysGrid could not complete startup against the backend. This surface follows the shared workspace contract: it shows inferred frontend causes first, then overlays backend startup-check diagnostics when the backend can still respond.
            </p>
            <PageToolbar
              left={
                <ToolbarGroup>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-semibold text-slate-400">
                    Active user: <span className="text-slate-200">{effectiveUserId}</span>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-semibold text-slate-400">
                    Failed target: <span className="text-slate-200">{failureDiagnosis.diagnostics.failedUrl}</span>
                  </div>
                </ToolbarGroup>
              }
              right={
                <ToolbarGroup>
                  <ToolbarButton
                    variant="primary"
                    onClick={() => {
                      setApiOverride(null)
                      window.location.reload()
                    }}
                  >
                    Clear Overrides & Retry
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => {
                      const current = localStorage.getItem('SYSGRID_OVERRIDE_API_URL') || ''
                      const newUrl = prompt('Enter Backend API URL manually (leave blank to clear):', current)
                      if (newUrl !== null) {
                        setApiOverride(newUrl)
                        window.location.reload()
                      }
                    }}
                  >
                    Configure API URL
                  </ToolbarButton>
                  <ToolbarButton variant="quiet" onClick={() => setReady(true)}>
                    Ignore Error & Launch
                  </ToolbarButton>
                </ToolbarGroup>
              }
            />
          </WorkspaceSectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <WorkspaceSectionCard className="space-y-3">
              <div className="flex items-center gap-2 text-slate-200">
                <AlertTriangle size={14} className="text-rose-400" />
                <h2 className="text-[11px] font-black uppercase tracking-widest">Likely Cause</h2>
              </div>
              <div className="space-y-2">
                {failureDiagnosis.reasons.map((reason, index) => (
                  <p key={index} className="text-[11px] leading-relaxed text-slate-300">
                    {reason}
                  </p>
                ))}
              </div>
            </WorkspaceSectionCard>

            <WorkspaceSectionCard className="space-y-3">
              <div className="flex items-center gap-2 text-slate-200">
                <Database size={14} className="text-blue-400" />
                <h2 className="text-[11px] font-black uppercase tracking-widest">Frontend Diagnostics</h2>
              </div>
              <div className="grid gap-2 text-[10px] text-slate-400">
                <p><span className="text-slate-500">UI Origin</span><br /><span className="text-slate-200">{failureDiagnosis.diagnostics.uiOrigin}</span></p>
                <p><span className="text-slate-500">Configured API Base</span><br /><span className="text-slate-200">{failureDiagnosis.diagnostics.configuredApiBase}</span></p>
                <p><span className="text-slate-500">Failed URL</span><br /><span className="text-slate-200">{failureDiagnosis.diagnostics.failedUrl}</span></p>
                <p><span className="text-slate-500">Stored Override</span><br /><span className="text-slate-200">{failureDiagnosis.diagnostics.storedOverride}</span></p>
                <p><span className="text-slate-500">Effective User</span><br /><span className="text-slate-200">{failureDiagnosis.diagnostics.effectiveUserId}</span></p>
                {failureDiagnosis.statusMatch ? (
                  <p><span className="text-slate-500">Observed HTTP Status</span><br /><span className="text-slate-200">{failureDiagnosis.statusMatch[0]}</span></p>
                ) : null}
              </div>
            </WorkspaceSectionCard>
          </div>

          <WorkspaceSectionCard className="space-y-4">
            <div className="flex items-center gap-2 text-slate-200">
              <Wrench size={14} className="text-amber-400" />
              <h2 className="text-[11px] font-black uppercase tracking-widest">Recommended Actions</h2>
            </div>
            <div className="space-y-2">
              {failureDiagnosis.actions.map((action, index) => (
                <p key={index} className="text-[11px] leading-relaxed text-slate-300">
                  {index + 1}. {action}
                </p>
              ))}
            </div>
          </WorkspaceSectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <WorkspaceSectionCard className="space-y-3">
              <div className="flex items-center gap-2 text-slate-200">
                <Globe size={14} className="text-blue-400" />
                <h2 className="text-[11px] font-black uppercase tracking-widest">Useful Checks</h2>
              </div>
              <div className="space-y-2 text-[10px] text-slate-400">
                <p>1. Open <span className="text-slate-200">{'<backend-origin>/api/v1/health'}</span> directly in the browser.</p>
                <p>2. If using a forwarded or company URL, do not use <span className="text-slate-200">http://127.0.0.1:8000</span> as the frontend API base.</p>
                <p>3. For the disposable local seed flow, the expected bootstrap user is <span className="text-slate-200">haewon.kim</span>.</p>
              </div>
            </WorkspaceSectionCard>

            <WorkspaceSectionCard className="space-y-3">
              <div className="flex items-center gap-2 text-slate-200">
                <ShieldAlert size={14} className="text-emerald-400" />
                <h2 className="text-[11px] font-black uppercase tracking-widest">Backend Diagnostics</h2>
              </div>
              {backendDiagnostics ? (
                <div className="space-y-3 text-[10px] text-slate-400">
                  <p>
                    <span className="text-slate-500">Endpoint</span><br />
                    <span className="text-slate-200">{backendDiagnostics.url}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Status</span><br />
                    <span className="text-slate-200">{backendDiagnostics.status ?? 'unreachable'}</span>
                  </p>
                  {backendDiagnostics.data?.api && (
                    <>
                      <p><span className="text-slate-500">Backend-configured API Origin</span><br /><span className="text-slate-200">{backendDiagnostics.data.api.configured_origin || '<blank>'}</span></p>
                      <p><span className="text-slate-500">Request Origin</span><br /><span className="text-slate-200">{backendDiagnostics.data.api.request_origin || '<none>'}</span></p>
                    </>
                  )}
                  {backendDiagnostics.data?.cors && (
                    <p><span className="text-slate-500">Request Origin Allowed</span><br /><span className="text-slate-200">{backendDiagnostics.data.cors.allows_request_origin ? 'yes' : 'no'}</span></p>
                  )}
                  {backendDiagnostics.data?.runtime && (
                    <>
                      <p><span className="text-slate-500">Backend Default User</span><br /><span className="text-slate-200">{backendDiagnostics.data.runtime.default_user_id || '<blank>'}</span></p>
                      <p><span className="text-slate-500">User ID Env Var</span><br /><span className="text-slate-200">{backendDiagnostics.data.runtime.user_id_env_var || '<blank>'}</span></p>
                      <p><span className="text-slate-500">Auto Admin IDs</span><br /><span className="text-slate-200">{Array.isArray(backendDiagnostics.data.runtime.auto_admin_user_ids) ? backendDiagnostics.data.runtime.auto_admin_user_ids.join(', ') || '<none>' : '<unavailable>'}</span></p>
                      <p><span className="text-slate-500">Public Read-Only</span><br /><span className="text-slate-200">{backendDiagnostics.data.runtime.public_readonly_enabled ? `enabled (${backendDiagnostics.data.runtime.public_readonly_tenant_name || 'default tenant'})` : 'disabled'}</span></p>
                    </>
                  )}
                  {backendDiagnostics.data?.tenant && (
                    <>
                      <p><span className="text-slate-500">Selected Tenant</span><br /><span className="text-slate-200">{backendDiagnostics.data.tenant.selected_tenant || '<none>'}</span></p>
                      <p><span className="text-slate-500">Selected Tenant DB</span><br /><span className="text-slate-200">{backendDiagnostics.data.tenant.selected_tenant_db_url || '<none>'}</span></p>
                      <p><span className="text-slate-500">Accessible Tenants</span><br /><span className="text-slate-200">{accessibleTenants.map((entry: any) => `${entry.name}${entry.is_selected ? ' (selected)' : ''}`).join(', ') || '<none>'}</span></p>
                    </>
                  )}
                  {backendDiagnostics.data?.storage && (
                    <>
                      <p><span className="text-slate-500">Config DB</span><br /><span className="text-slate-200">{backendDiagnostics.data.storage.config_database_url || '<blank>'}</span></p>
                      <p><span className="text-slate-500">Tenant Storage Root</span><br /><span className="text-slate-200">{backendDiagnostics.data.storage.tenant_storage_root || '<blank>'}</span></p>
                    </>
                  )}
                  {Array.isArray(backendDiagnostics.data?.warnings) && backendDiagnostics.data.warnings.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-slate-300">Warnings</p>
                      {backendDiagnostics.data.warnings.map((warning: string, index: number) => (
                        <p key={index} className="text-[10px] leading-relaxed text-amber-300">{index + 1}. {warning}</p>
                      ))}
                    </div>
                  ) : null}
                  {!backendDiagnostics.ok && backendDiagnostics.data?.detail ? (
                    <p className="text-[10px] leading-relaxed text-rose-300">{backendDiagnostics.data.detail}</p>
                  ) : null}
                </div>
              ) : (
                <WorkspaceEmptyState
                  compact
                  icon={<Database size={18} />}
                  title="Loading Backend Diagnostics"
                  description="The app is attempting to fetch startup-check data from the backend."
                />
              )}
            </WorkspaceSectionCard>
          </div>

          <WorkspaceSectionCard className="space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <UserCircle2 size={14} className="text-blue-400" />
              <h2 className="text-[11px] font-black uppercase tracking-widest">Recovery Intent</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              `Clear Overrides & Retry` is the standard first action because most startup failures come from stale browser overrides, a wrong forwarded backend origin, or a mismatched seeded user. `Ignore Error & Launch` is a last-resort operator bypass for debugging only.
            </p>
          </WorkspaceSectionCard>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--accent-primary)] font-mono">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-[var(--glass-border)] rounded-lg"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] font-black animate-pulse text-[var(--text-primary)]">Initializing SysGrid</span>
            <span className="text-[8px] uppercase tracking-[0.1em] opacity-30 text-[var(--text-muted)] font-black">Verifying Backend Synchronization...</span>
          </div>
        </div>
      </div>
    );
  }

  return <App key={appKey} />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Bootstrap />
  </React.StrictMode>,
)
