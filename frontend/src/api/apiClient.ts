export function getApiBaseUrl() {
  return localStorage.getItem('SYSGRID_OVERRIDE_API_URL') || 
         localStorage.getItem('SYSGRID_CONFIG_VITE_API_BASE_URL') ||
         import.meta.env.VITE_API_BASE_URL || 
         '';
}

export function getConfig(key: string, defaultValue: string = ''): string {
  const viteKey = key.startsWith('VITE_') ? key : `VITE_${key}`;
  const bootstrapVal = localStorage.getItem(`SYSGRID_CONFIG_${viteKey}`);
  if (bootstrapVal !== null) return bootstrapVal;
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
const latencyListeners: Array<(latency: number) => void> = [];

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
  latencyListeners.forEach(listener => listener(latency));
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getApiBaseUrl();
  
  // Better normalization: remove trailing slash before query params or at the end
  let normalizedEndpoint = endpoint;
  if (endpoint.includes('?')) {
    const [path, query] = endpoint.split('?');
    if (path.length > 1 && path.endsWith('/')) {
      normalizedEndpoint = path.slice(0, -1) + '?' + query;
    }
  } else if (endpoint.length > 1 && endpoint.endsWith('/')) {
    normalizedEndpoint = endpoint.slice(0, -1);
  }

  const url = (normalizedEndpoint.startsWith('http') || !baseUrl) 
    ? normalizedEndpoint 
    : `${baseUrl.replace(/\/$/, '')}/${normalizedEndpoint.replace(/^\//, '')}`;
  
  const headers: Record<string, string> = { ...options.headers } as any;
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const startTime = Date.now();
  const response = await fetch(url, {
    ...options,
    headers,
  });
  notifyLatency(Date.now() - startTime);

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
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.traceback = fullTraceback;
    error.data = errorData;
    error.url = url; // attach URL so we can log it
    throw error;
  }

  return response;
}
