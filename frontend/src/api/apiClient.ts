function normalizeApiBaseUrl(url: string | null | undefined): string {
  const trimmed = (url || '').trim()
  if (!trimmed) return ''
  return trimmed
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/$/, '')
}

function isLikelyForwardedHost(hostname: string): boolean {
  return !/^(127\.0\.0\.1|localhost)$/i.test(hostname) && hostname.includes('.')
}

function isLoopbackOrigin(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(normalizeApiBaseUrl(url))
}

function validateConfiguredApiBaseUrl(baseUrl: string) {
  if (!baseUrl) return null
  const trimmed = baseUrl.trim()
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return null
  }
  return `Configured API base "${trimmed}" is invalid. Use the backend origin only, for example https://backend.example.com, or leave it blank for same-origin routing.`
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

async function parseJsonResponse(response: Response) {
  const rawBody = await response.clone().text()
  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  const redirected = Boolean(response.redirected)
  const finalUrl = response.url || ''
  const looksLikeAuthRedirect = redirected && /oauth|gitlab|signin|sign-in|login/i.test(`${finalUrl} ${rawBody}`)

  if (looksLikeAuthRedirect) {
    const error = new Error('Backend JSON request was redirected to OAuth or a login page.') as any
    error.status = response.status
    error.statusText = response.statusText
    error.url = finalUrl
    error.data = { detail: error.message }
    error.rawBody = rawBody.slice(0, 1000)
    throw error
  }

  if (contentType.includes('application/json') || (!contentType && rawBody.trim().startsWith('{'))) {
    try {
      return rawBody ? JSON.parse(rawBody) : null
    } catch {
      const error = new Error('Backend returned invalid JSON where JSON was expected.') as any
      error.status = response.status
      error.statusText = response.statusText
      error.url = finalUrl
      error.data = { detail: error.message }
      error.rawBody = rawBody.slice(0, 1000)
      throw error
    }
  }

  const error = new Error(`Backend returned ${contentType || 'non-JSON content'} where JSON was expected.`) as any
  error.status = response.status
  error.statusText = response.statusText
  error.url = finalUrl
  error.data = { detail: error.message }
  error.rawBody = rawBody.slice(0, 1000)
  throw error
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

function getIdentityMode(): string {
  return String(import.meta.env.VITE_IDENTITY_MODE || 'development').trim().toLowerCase()
}

function shouldAttachUserIdHeader(url: string): boolean {
  // In production the reverse proxy owns identity and must strip any client-supplied
  // identity header before injecting TRUSTED_PROXY_USER_HEADER.
  if (getIdentityMode() === 'trusted_proxy') return false

  const baseUrl = getApiBaseUrl()
  if (!url.startsWith('http')) return true
  if (baseUrl && url.startsWith(baseUrl)) return true

  try {
    const targetUrl = new URL(url, window.location.origin)
    if (targetUrl.origin === window.location.origin) return true
    const isLocal = targetUrl.hostname === 'localhost' || targetUrl.hostname === '127.0.0.1'
    return isLocal
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
  const invalidApiBaseMessage = validateConfiguredApiBaseUrl(baseUrl)
  if (invalidApiBaseMessage && !endpoint.startsWith('http')) {
    const error = new Error(invalidApiBaseMessage) as any
    error.status = 0
    error.data = { detail: invalidApiBaseMessage }
    error.url = endpoint
    throw error
  }
  if (baseUrl && isLikelyForwardedHost(window.location.hostname) && isLoopbackOrigin(baseUrl) && !endpoint.startsWith('http')) {
    const error = new Error('Frontend origin mismatch: this UI is running on a hosted or company origin, but the configured API base still points to a loopback address.') as any
    error.status = 0
    error.data = { detail: error.message }
    error.url = endpoint
    throw error
  }
  
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
  const method = String(options.method || 'GET').toUpperCase()
  
  // Only attach explicit browser user identity on same-origin requests.
  if (shouldAttachUserIdHeader(url)) {
    headers['X-User-Id'] = getCurrentUserId();
    headers['X-Tenant-Id'] = getCurrentTenantId();
  }

  const hasBody = options.body != null
  const isBodylessReadRequest = (method === 'GET' || method === 'HEAD') && !hasBody

  if (!isBodylessReadRequest && !(options.body instanceof FormData) && !headers['Content-Type']) {
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
  get: (endpoint: string, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'GET' }).then(parseJsonResponse),
  post: (endpoint: string, body: any, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }).then(parseJsonResponse),
  put: (endpoint: string, body: any, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }).then(parseJsonResponse),
  delete: (endpoint: string, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'DELETE' }).then(parseJsonResponse),
  patch: (endpoint: string, body: any, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }).then(parseJsonResponse),
};
