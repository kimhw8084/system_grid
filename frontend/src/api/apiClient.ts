const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // If the endpoint is already a full URL, use it as is
  // Otherwise, prepend the base URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response;
}
