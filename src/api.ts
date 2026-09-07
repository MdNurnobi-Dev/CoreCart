const API_URL = '/api';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    ...(!(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers
  });

  const text = await response.text();

  if (!response.ok) {
    let errorMsg = 'API request failed';
    if (text) {
      try {
        const errorData = JSON.parse(text);
        errorMsg = errorData.error || errorData.message || errorMsg;
      } catch {
        if (text.includes('<title>') && text.includes('</title>')) {
          const titleMatch = text.match(/<title>(.*?)<\/title>/i);
          errorMsg = titleMatch ? titleMatch[1].trim() : `HTTP Error ${response.status}`;
        } else {
          errorMsg = text.length > 200 ? `HTTP Error ${response.status}` : text;
        }
      }
    }
    throw new Error(errorMsg);
  }

  return text ? JSON.parse(text) : null;
};
