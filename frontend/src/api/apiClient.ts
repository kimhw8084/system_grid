const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // If the endpoint is already a full URL, use it as is
  // Otherwise, prepend the base URL
  const url = (endpoint.startsWith('http') || !API_BASE_URL) 
    ? endpoint 
    : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Fallback for non-JSON error responses
      errorData = { detail: `API Error ${response.status}: ${response.statusText}` };
    }
    
    // Support both 'message' and FastAPI's 'detail' fields
    const errorMessage = errorData.detail || errorData.message || `API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response;
}
