import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { apiFetch, setApiOverride, getApiBaseUrl } from './api/apiClient'

console.log("MAIN.TSX: Initializing React Root");

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
        let response;
        try {
          response = await apiFetch('/api/v1/settings/bootstrap');
        } catch (initialErr) {
          console.warn("BOOTSTRAP: Initial fetch failed, clearing poisoned local configs and retrying relative...", initialErr);
          // Clear any potentially poisoned configs
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('SYSGRID_CONFIG_') || k === 'SYSGRID_OVERRIDE_API_URL') {
              localStorage.removeItem(k);
            }
          });
          // Retry using a pure relative path, bypassing apiClient baseUrl injection
          response = await fetch('/api/v1/settings/bootstrap');
          if (!response.ok) {
            throw new Error(`API Error ${response.status}: ${response.statusText}`);
          }
        }
        
        const config = await response.json();
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
        console.log("BOOTSTRAP: Fetching system configuration...");
        await fetchConfig();
        if (isMounted) setReady(true);

        // Try WebSocket, fallback to polling
        const baseUrl = getApiBaseUrl() || window.location.origin;
        const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
        const wsUrl = baseUrl.replace(/^https?/, wsProtocol) + '/api/v1/ws/sync';
        
        try {
          ws = new WebSocket(wsUrl);
          ws.onmessage = (event) => {
            if (event.data === 'CONFIG_UPDATED') {
              console.log("WS: CONFIG_UPDATED signal received");
              fetchConfig().catch(() => {});
            }
          };
          ws.onerror = () => {
            console.warn("WS: Connection failed. Gracefully degrading to HTTP polling.");
            if (!pollInterval) {
              pollInterval = setInterval(() => fetchConfig().catch(() => {}), 60000); // 1 min fallback
            }
          };
        } catch (e) {
          console.warn("WS: Setup failed. Gracefully degrading to HTTP polling.");
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
  }, [ready]);

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-[#88c0d0] p-8 font-mono">
        <div className="max-w-md w-full border border-[#88c0d0]/20 p-8 rounded-lg bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <h1 className="text-xl font-bold uppercase tracking-tighter">Connection Failure</h1>
          </div>
          
          <div className="bg-black/40 p-4 rounded mb-4 border border-white/5">
            <p className="text-xs opacity-80 leading-relaxed text-red-200 mb-2">
              Failed to reach backend API. If you recently entered a custom API URL, it might be routing through a corporate proxy (APISIX) that rejects unauthenticated requests.
            </p>
            <p className="text-[10px] text-white/40">
              Target URL: {failedUrl} <br/>
              Error: {error}
            </p>
          </div>

          <div className="flex flex-col gap-3">
             <button 
               onClick={() => {
                 setApiOverride(null); // Clear the bad URL override
                 window.location.reload();
               }}
               className="w-full px-4 py-3 bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-400 transition-all active:scale-95"
             >
               Clear Overrides & Retry (Self-Heal)
             </button>

             <button 
               onClick={() => setReady(true)}
               className="w-full px-4 py-3 bg-[#88c0d0] text-slate-900 text-xs font-bold uppercase tracking-widest hover:bg-white transition-all active:scale-95"
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
               className="w-full px-4 py-2 border border-[#88c0d0]/30 text-[#88c0d0]/60 text-[10px] uppercase tracking-widest hover:text-[#88c0d0] hover:border-[#88c0d0]/60 transition-all"
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
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-[#88c0d0] font-mono">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-[#88c0d0]/10 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-2 border-[#88c0d0] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold animate-pulse">Initializing SysGrid</span>
            <span className="text-[8px] uppercase tracking-[0.1em] opacity-30">Verifying Backend Synchronization...</span>
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