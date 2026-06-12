import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { apiFetch, setApiOverride, getApiBaseUrl } from './api/apiClient'

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

const Bootstrap = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string>("");
  const [appKey, setAppKey] = useState(0);

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
        let usedRelativeBootstrap = false;
        try {
          // Always try relative path first for bootstrap to ensure it bypasses any poisoned baseUrl
          response = await fetch('/api/v1/settings/bootstrap');
          if (!response.ok) {
             console.warn("BOOTSTRAP: Relative fetch returned " + response.status + ", falling back to apiFetch");
             response = await apiFetch('/api/v1/settings/bootstrap');
          } else {
             usedRelativeBootstrap = true;
          }
        } catch (initialErr) {
          console.warn("BOOTSTRAP: Initial fetch failed, clearing configuration cache and retrying...", initialErr);
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('SYSGRID_CONFIG_')) {
              localStorage.removeItem(k);
            }
          });
          try {
            response = await apiFetch('/api/v1/settings/bootstrap');
            if (!response.ok) throw new Error(`API Error ${response.status}`);
          } catch (overrideErr) {
            const currentOverride = localStorage.getItem('SYSGRID_OVERRIDE_API_URL') || ''
            const envApiBase = (import.meta.env.VITE_API_BASE_URL || '').trim()
            if (currentOverride && envApiBase && currentOverride !== envApiBase) {
              console.warn("BOOTSTRAP: Retrying without stale API override...", currentOverride);
              setApiOverride(null);
              response = await apiFetch('/api/v1/settings/bootstrap');
              if (!response.ok) throw new Error(`API Error ${response.status}`);
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
        for (let attempt = 1; attempt <= 15; attempt += 1) {
          try {
            await fetchConfig();
            lastError = null
            break
          } catch (err: any) {
            lastError = err
            console.warn(`BOOTSTRAP: attempt ${attempt} failed`, err)
            if (attempt < 15) {
              await sleep(1000)
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

  const currentOrigin = window.location.origin
  const configuredApiBase = getApiBaseUrl()
  const effectiveUserId =
    localStorage.getItem('SYSGRID_USER_ID') ||
    localStorage.getItem('SYSGRID_CONFIG_DEFAULT_USER_ID') ||
    'admin_root'

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
      reasons.push('The backend is reachable, but it is rejecting the current user or tenant context with 403 Forbidden.')
      actions.push(`Ensure the browser user is the seeded or provisioned user. Current effective user is \`${effectiveUserId}\`.`)
      actions.push('If this is a disposable local environment, set `localStorage.SYSGRID_USER_ID = "haewon.kim"` and reload, or clear `SYSGRID_USER_ID` to use the bootstrap default.')
      actions.push('Make sure the selected tenant in the active config DB grants access to that user.')
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
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--accent-primary)] p-8 font-mono">
        <div className="max-w-3xl w-full border border-[var(--glass-border)] p-8 rounded-lg bg-[var(--sidebar-bg)]/50 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <h1 className="text-xl font-bold uppercase tracking-tighter text-[var(--text-primary)]">Connection Failure</h1>
          </div>
          
          <div className="bg-black/40 p-4 rounded-lg mb-4 border border-white/5">
            <p className="text-xs opacity-80 leading-relaxed text-red-200 mb-2 font-bold">
              Failed to complete bootstrap against the backend API. This panel shows the most likely cause based on the current browser origin, configured API base, and returned error.
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              Target URL: {failedUrl} <br/>
              Error: {error}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-5">
            <div className="bg-black/30 rounded-lg border border-white/5 p-4">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-white mb-3">Likely Cause</h2>
              <div className="space-y-2">
                {failureDiagnosis.reasons.map((reason, index) => (
                  <p key={index} className="text-[11px] leading-relaxed text-slate-300">
                    {reason}
                  </p>
                ))}
              </div>
            </div>
            <div className="bg-black/30 rounded-lg border border-white/5 p-4">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-white mb-3">Diagnostics</h2>
              <div className="space-y-2 text-[10px] text-slate-400">
                <p>UI Origin: <span className="text-slate-200">{failureDiagnosis.diagnostics.uiOrigin}</span></p>
                <p>Configured API Base: <span className="text-slate-200">{failureDiagnosis.diagnostics.configuredApiBase}</span></p>
                <p>Failed URL: <span className="text-slate-200">{failureDiagnosis.diagnostics.failedUrl}</span></p>
                <p>Stored Override: <span className="text-slate-200">{failureDiagnosis.diagnostics.storedOverride}</span></p>
                <p>Effective User: <span className="text-slate-200">{failureDiagnosis.diagnostics.effectiveUserId}</span></p>
              </div>
            </div>
          </div>

          <div className="bg-black/30 rounded-lg border border-white/5 p-4 mb-5">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-white mb-3">Recommended Actions</h2>
            <div className="space-y-2">
              {failureDiagnosis.actions.map((action, index) => (
                <p key={index} className="text-[11px] leading-relaxed text-slate-300">
                  {index + 1}. {action}
                </p>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-white/5 bg-black/30 p-3 text-[10px] text-slate-400">
              <p className="font-bold text-slate-200 mb-2">Useful checks</p>
              <p>1. Open <span className="text-slate-200">{'<backend-origin>/api/v1/health'}</span> directly in the browser.</p>
              <p>2. If using a forwarded/company URL, do not use `127.0.0.1:8000` as the frontend API base.</p>
              <p>3. If this is a seeded local environment, the expected disposable admin user is `haewon.kim`.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
             <button 
               onClick={() => {
                 setApiOverride(null); 
                 window.location.reload();
               }}
               className="w-full px-4 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all active:scale-95"
             >
               Clear Overrides & Retry (Self-Heal)
             </button>

             <button 
               onClick={() => setReady(true)}
               className="w-full px-4 py-3 bg-[var(--accent-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95"
             >
               Ignore Error & Launch App Anyway
             </button>

             <button 
               onClick={() => {
                 const current = localStorage.getItem('SYSGRID_OVERRIDE_API_URL') || '';
                 const newUrl = prompt("Enter Backend API URL manually (leave blank to clear):", current);
                 if (newUrl !== null) {
                   setApiOverride(newUrl);
                   window.location.reload();
                 }
               }}
               className="w-full px-4 py-2 border border-[var(--glass-border)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all"
             >
               Manually Configure API URL
             </button>
          </div>
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
