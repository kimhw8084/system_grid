import { errorManager } from '../stores/errorStore';

export function getApiBaseUrl() {
  return localStorage.getItem('SYSGRID_OVERRIDE_API_URL') || 
         localStorage.getItem('SYSGRID_CONFIG_VITE_API_BASE_URL') ||
         import.meta.env.VITE_API_BASE_URL || 
         '';
}

export function getConfig(key: string, defaultValue: string = ''): string {
  // Ensure the key has VITE_ prefix if not provided
  const viteKey = key.startsWith('VITE_') ? key : `VITE_${key}`;
  
  // Check bootstrap config from localStorage
  const bootstrapVal = localStorage.getItem(`SYSGRID_CONFIG_${viteKey}`);
  if (bootstrapVal !== null) return bootstrapVal;

  // Fallback to build-time env
  return (import.meta.env as any)[viteKey] || defaultValue;
}

export function setApiOverride(url: string | null) {
  if (url) {
    localStorage.setItem('SYSGRID_OVERRIDE_API_URL', url);
  } else {
    localStorage.removeItem('SYSGRID_OVERRIDE_API_URL');
  }
}

let lastLatency = 0;
const latencyListeners: ((latency: number) => void)[] = [];

export function subscribeToLatency(listener: (latency: number) => void) {
  latencyListeners.push(listener);
  listener(lastLatency);
  return () => {
    const idx = latencyListeners.indexOf(listener);
    if (idx !== -1) latencyListeners.splice(idx, 1);
  };
}

function notifyLatency(latency: number) {
  lastLatency = latency;
  latencyListeners.forEach(l => l(latency));
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const start = performance.now();
  const baseUrl = getApiBaseUrl();
  const url = (endpoint.startsWith('http') || !baseUrl) 
    ? endpoint 
    : `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  
  const headers: Record<string, string> = { ...options.headers } as any;
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Tactical Bypass: If this is a bootstrap or public call, force 'omit' credentials
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: (endpoint.includes('bootstrap') || endpoint.includes('public')) ? 'omit' : options.credentials,
    cache: endpoint.includes('bootstrap') ? 'no-cache' : options.cache,
  };

  try {
    const response = await fetch(url, fetchOptions);

    const end = performance.now();
    notifyLatency(Math.round(end - start));

    if (!response.ok) {
      let errorData: any = {};
      let fullTraceback = null;
      try {
        errorData = await response.json();
        fullTraceback = errorData.traceback || null;
      } catch (e) {
        errorData = { detail: `API Error ${response.status}: ${response.statusText}` };
      }
      
      const errorMessage = errorData.detail || errorData.message || `API error: ${response.status}`;
      
      // Log to Buganizer Console
      errorManager.addError({
        message: errorMessage,
        stack: fullTraceback || new Error().stack,
        url: url,
        method: options.method || 'GET',
        status: response.status,
        data: errorData,
        type: 'BACKEND',
        severity: response.status >= 500 ? 'CRITICAL' : 'ERROR'
      });

      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.traceback = fullTraceback;
      error.data = errorData;
      throw error;
    }

    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    if (!err.status) {
      // Network error or fetch failed
      errorManager.addError({
        message: err.message || 'Network Connectivity Failure',
        stack: err.stack,
        url: url,
        method: options.method || 'GET',
        type: 'BACKEND',
        severity: 'CRITICAL'
      });
    }
    throw err;
  }
}
