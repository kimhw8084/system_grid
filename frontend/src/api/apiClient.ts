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

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getApiBaseUrl();
  const url = (endpoint.startsWith('http') || !baseUrl) 
    ? endpoint 
    : `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  
  const headers: Record<string, string> = { ...options.headers } as any;
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

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
