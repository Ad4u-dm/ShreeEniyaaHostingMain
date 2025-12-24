/**
 * API Client Configuration
 * 
 * This module handles all API calls to the backend server.
 * It automatically switches between local development and production backend URLs.
 */

// Get backend URL from environment variable or use default
const getBackendURL = () => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  }
  // Server-side rendering
  return process.env.API_URL || 'http://localhost:5000';
};

export const API_BASE_URL = getBackendURL();

/**
 * Enhanced fetch wrapper with automatic backend URL prefixing
 * Maintains compatibility with existing code
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // Get auth token from localStorage
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth-token') 
    : null;

  // Build full URL
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint}`;

  // Merge headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  // Add authorization header if token exists
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Make request with credentials for cookies
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Important for CORS cookies
  });

  return response;
}

/**
 * Helper function for GET requests
 */
export async function apiGet(endpoint: string, options: RequestInit = {}) {
  return apiFetch(endpoint, { ...options, method: 'GET' });
}

/**
 * Helper function for POST requests
 */
export async function apiPost(endpoint: string, data?: any, options: RequestInit = {}) {
  return apiFetch(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper function for PUT requests
 */
export async function apiPut(endpoint: string, data?: any, options: RequestInit = {}) {
  return apiFetch(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper function for DELETE requests
 */
export async function apiDelete(endpoint: string, options: RequestInit = {}) {
  return apiFetch(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Helper function for PATCH requests
 */
export async function apiPatch(endpoint: string, data?: any, options: RequestInit = {}) {
  return apiFetch(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

// Export default for backward compatibility
export default {
  fetch: apiFetch,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  patch: apiPatch,
  baseURL: API_BASE_URL
};
