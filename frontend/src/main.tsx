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

const Bootstrap = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string>("");
  const [appKey, setAppKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let pollInterval: any = null;

    const fetchConfig = async () => {
      try {
        console.log("BOOTSTRAP: Fetching system configuration...");
        let response;
        try {
          // Always try relative path first for bootstrap to ensure it bypasses any poisoned baseUrl
          response = await fetch('/api/v1/settings/bootstrap');
          if (!response.ok) {
             console.warn("BOOTSTRAP: Relative fetch returned " + response.status + ", falling back to apiFetch");
             response = await apiFetch('/api/v1/settings/bootstrap');
          }
        } catch (initialErr) {
          console.warn("BOOTSTRAP: Initial fetch failed, clearing configuration cache and retrying...", initialErr);
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('SYSGRID_CONFIG_')) {
              localStorage.removeItem(k);
            }
          });
          // Note: We MUST NOT remove SYSGRID_OVERRIDE_API_URL here as it's often 
          // set by automation/proxy layers to ensure correct routing.
          response = await apiFetch('/api/v1/settings/bootstrap');
          if (!response.ok) throw new Error(`API Error ${response.status}`);
        }
        
        const config = await response.json();
        console.log("BOOTSTRAP: Configuration received", config);
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
        await fetchConfig();
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
    };
  }, []); // Only run once on mount

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--accent-primary)] p-8 font-mono">
        <div className="max-w-md w-full border border-[var(--glass-border)] p-8 rounded-lg bg-[var(--sidebar-bg)]/50 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <h1 className="text-xl font-bold uppercase tracking-tighter text-[var(--text-primary)]">Connection Failure</h1>
          </div>
          
          <div className="bg-black/40 p-4 rounded-lg mb-4 border border-white/5">
            <p className="text-xs opacity-80 leading-relaxed text-red-200 mb-2 font-bold">
              Failed to reach backend API. If you recently entered a custom API URL, it might be routing through a corporate proxy (APISIX) that rejects unauthenticated requests.
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              Target URL: {failedUrl} <br/>
              Error: {error}
            </p>
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