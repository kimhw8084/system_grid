function normalizeApiBaseUrl(url: string | null | undefined): string {
  const trimmed = (url || '').trim()
  if (!trimmed) return ''
  return trimmed
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/$/, '')
}

export function getApiBaseUrl() {
  return normalizeApiBaseUrl(
    localStorage.getItem('SYSGRID_OVERRIDE_API_URL') ||
    localStorage.getItem('SYSGRID_CONFIG_VITE_API_BASE_URL') ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  )
}

export function getConfig(key: string, defaultValue: string = ''): string {
  const viteKey = key.startsWith('VITE_') ? key : `VITE_${key}`;
  const bootstrapVal = localStorage.getItem(`SYSGRID_CONFIG_${viteKey}`);
  if (bootstrapVal !== null) return bootstrapVal;
  return (import.meta.env as any)[viteKey] || defaultValue;
}

export function setApiOverride(url: string | null) {
  const normalized = normalizeApiBaseUrl(url)
  if (normalized) {
    localStorage.setItem('SYSGRID_OVERRIDE_API_URL', normalized);
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

function getCurrentUserId(): string {
  return (
    localStorage.getItem('SYSGRID_USER_ID') ||
    localStorage.getItem('SYSGRID_CONFIG_DEFAULT_USER_ID') ||
    'admin_root'
  )
}

function shouldAttachUserIdHeader(url: string): boolean {
  const baseUrl = getApiBaseUrl()
  // If it's a relative URL or starts with the baseUrl, attach it.
  if (!url.startsWith('http')) return true
  if (baseUrl && url.startsWith(baseUrl)) return true
  
  try {
    const targetUrl = new URL(url, window.location.origin)
    // Same-origin is always safe
    if (targetUrl.origin === window.location.origin) return true
    
    // Also allow for local development cross-origin (e.g., localhost:5173 -> localhost:8000)
    const isLocal = targetUrl.hostname === 'localhost' || targetUrl.hostname === '127.0.0.1'
    if (isLocal) return true
    
    return false
  } catch {
    return true
  }
}

function resolveCredentialsMode(url: string): RequestCredentials {
  try {
    const targetUrl = new URL(url, window.location.origin)
    return targetUrl.origin === window.location.origin ? 'same-origin' : 'include'
  } catch {
    return 'same-origin'
  }
}

function getCurrentTenantId(): string {
  return (
    localStorage.getItem('SYSGRID_TENANT_ID') ||
    '1'
  )
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
  
  // Only attach explicit browser user identity on same-origin requests.
  if (shouldAttachUserIdHeader(url)) {
    headers['X-User-Id'] = getCurrentUserId();
    headers['X-Tenant-Id'] = getCurrentTenantId();
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const startTime = Date.now();
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: resolveCredentialsMode(url),
    ...options,
    headers,
  });
  notifyLatency(Date.now() - startTime);

  if (!response.ok) {
    let errorData: any = {};
    let rawBody = '';
    try {
      rawBody = await response.clone().text();
      errorData = JSON.parse(rawBody);
    } catch (e) {
      errorData = { detail: `API Error ${response.status}: ${response.statusText}`, raw: rawBody };
    }
    
    const errorMessage = errorData.detail || errorData.message || `API error: ${response.status}`;
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.statusText = response.statusText;
    error.data = errorData;
    error.rawBody = rawBody.slice(0, 1000); // Capture excerpt
    error.url = url; 
    throw error;
  }

  return response;
}

export const apiClient = {
  get: (endpoint: string, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'GET' }).then(r => r.json()),
  post: (endpoint: string, body: any, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }).then(r => r.json()),
  put: (endpoint: string, body: any, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }).then(r => r.json()),
  delete: (endpoint: string, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'DELETE' }).then(r => r.json()),
  patch: (endpoint: string, body: any, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }).then(r => r.json()),
};
