import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { apiFetch } from './api/apiClient'

console.log("MAIN.TSX: Initializing React Root");

const Bootstrap = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log("BOOTSTRAP: Fetching system configuration...");
        // 1. Try to fetch bootstrap config from the backend
        const response = await apiFetch('/settings/bootstrap');
        const config = await response.json();
        
        console.log("BOOTSTRAP: Configuration received", config);
        
        // 2. Apply config to localStorage (LKG - Last Known Good)
        Object.entries(config).forEach(([key, value]) => {
          localStorage.setItem(`SYSGRID_CONFIG_${key}`, String(value));
        });
        
        setReady(true);
      } catch (err: any) {
        console.error("BOOTSTRAP: Failed to fetch configuration", err);
        
        // 3. Fallback: Check if we have LKG in localStorage
        const hasLkg = localStorage.getItem('SYSGRID_CONFIG_PORT') || localStorage.getItem('SYSGRID_CONFIG_VITE_APP_TITLE');
        if (hasLkg) {
          console.warn("BOOTSTRAP: Using Last Known Good (LKG) configuration");
          setReady(true);
        } else {
          setError("CRITICAL: Failed to connect to SysGrid Backend and no local cache found.");
        }
      }
    };
    init();
  }, []);

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-[#88c0d0] p-8 font-mono">
        <div className="max-w-md w-full border border-[#88c0d0]/20 p-8 rounded-lg bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <h1 className="text-xl font-bold uppercase tracking-tighter">Connection Failure</h1>
          </div>
          
          <div className="bg-black/40 p-4 rounded mb-8 border border-white/5">
            <p className="text-xs opacity-80 leading-relaxed text-red-200">{error}</p>
          </div>

          <div className="flex flex-col gap-3">
             <button 
               onClick={() => window.location.reload()}
               className="w-full px-4 py-3 bg-[#88c0d0] text-slate-900 text-xs font-bold uppercase tracking-widest hover:bg-white transition-all active:scale-95"
             >
               Retry Connection
             </button>
             <button 
               onClick={() => {
                 const current = localStorage.getItem('SYSGRID_OVERRIDE_API_URL') || '';
                 const newUrl = prompt("Enter Backend API URL (e.g., http://localhost:8000):", current);
                 if (newUrl !== null) {
                   if (newUrl) {
                     localStorage.setItem('SYSGRID_OVERRIDE_API_URL', newUrl);
                   } else {
                     localStorage.removeItem('SYSGRID_OVERRIDE_API_URL');
                   }
                   window.location.reload();
                 }
               }}
               className="w-full px-4 py-2 border border-[#88c0d0]/30 text-[#88c0d0]/60 text-[10px] uppercase tracking-widest hover:text-[#88c0d0] hover:border-[#88c0d0]/60 transition-all"
             >
               Manually configure API URL
             </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-[9px] text-white/20 uppercase tracking-[0.2em] text-center">
            SysGrid Tactical Initialization Engine v2.0
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

  return <App />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Bootstrap />
  </React.StrictMode>,
)
