import { errorManager } from '../stores/errorStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // If the endpoint is already a full URL, use it as is
  // Otherwise, prepend the base URL
  const url = (endpoint.startsWith('http') || !API_BASE_URL) 
    ? endpoint 
    : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  
  const headers: Record<string, string> = { ...options.headers } as any;
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
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
