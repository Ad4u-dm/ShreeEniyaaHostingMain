/**
 * Fetch Wrapper - Drop-in replacement for native fetch
 * 
 * This utility automatically prefixes API calls with the backend URL
 * Usage: Replace `fetch('/api/...')` with `apiFetch('/api/...')`
 * Or use as global: `window.fetch = createFetchWrapper()`
 */

import { API_BASE_URL } from './apiClient';

/**
 * Enhanced fetch that automatically routes /api calls to backend
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url: string;
  
  // Extract URL from input
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else {
    url = input.url;
  }
  
  // If URL starts with /api/, prefix with backend URL
  if (url.startsWith('/api/')) {
    url = `${API_BASE_URL}${url}`;
  }
  
  // Get auth token
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth-token') 
    : null;
  
  // Prepare headers
  const headers = new Headers(init?.headers);
  
  // Add auth token if available and not already set
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Make request
  return fetch(url, {
    ...init,
    headers,
    credentials: 'include', // Important for CORS with cookies
  });
}

/**
 * Create a wrapper that can replace global fetch
 * Only use this if you want to replace all fetch calls automatically
 */
export function createFetchWrapper() {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    return apiFetch(input, init);
  };
}

/**
 * Initialize global fetch wrapper
 * Call this in your root layout or _app.tsx
 */
export function initGlobalFetch() {
  if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      // Check if it's an API call
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (url.startsWith('/api/')) {
        return apiFetch(input, init);
      }
      
      // Use original fetch for non-API calls
      return originalFetch(input, init);
    };
    
    console.log('✓ Global fetch wrapper initialized - API calls will route to:', API_BASE_URL);
  }
}

export default apiFetch;
