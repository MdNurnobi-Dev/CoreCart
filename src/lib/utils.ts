export async function apiFetch(endpoint: string, options?: RequestInit) {
  const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const hasContentType = options?.headers && Object.keys(options.headers).some(k => k.toLowerCase() === 'content-type');
  if (options?.body && typeof options.body === 'string' && !hasContentType) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...headers,
      ...(options?.headers || {})
    }
  });

  const text = await res.text();

  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    
    // Auto-logout on 401 Unauthorized (unless it's an auth attempt)
    if (res.status === 401 && !endpoint.startsWith('/auth') && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }

    if (text) {
      try {
        const data = JSON.parse(text);
        errorMsg = data.error || data.message || errorMsg;
      } catch {
        if (text.includes('<title>') && text.includes('</title>')) {
          const titleMatch = text.match(/<title>(.*?)<\/title>/i);
          errorMsg = titleMatch ? titleMatch[1].trim() : `HTTP Error ${res.status}`;
        } else {
          errorMsg = text.length > 200 ? `HTTP Error ${res.status}` : text;
        }
      }
    }
    throw new Error(errorMsg || 'An error occurred');
  }
  
  // Return null if empty response (e.g. 204 No Content)
  return text ? JSON.parse(text) : null;
}
