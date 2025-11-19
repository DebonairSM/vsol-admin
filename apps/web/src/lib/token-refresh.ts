/**
 * Token Refresh Interceptor for Client-Side API Calls
 * 
 * Automatically refreshes access tokens when they expire
 * Handles token rotation and storage
 */

const REFRESH_TOKEN_KEY = 'refreshToken';
const ACCESS_TOKEN_KEY = 'token';

/**
 * Store tokens in localStorage
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get the current refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Clear all tokens (logout)
 */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Refresh the access token using the refresh token
 * 
 * @returns New access token or null if refresh failed
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  
  if (!refreshToken) {
    return null;
  }

  try {
    // Use Vite proxy in development (relative URL), or explicit URL if set
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      // Refresh failed, clear tokens and force re-login
      clearTokens();
      return null;
    }

    const data = await response.json();
    
    // Store new tokens
    storeTokens(data.accessToken, data.refreshToken);
    
    return data.accessToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearTokens();
    return null;
  }
}

/**
 * Fetch wrapper that automatically handles token refresh
 * 
 * Usage:
 * ```ts
 * const response = await fetchWithTokenRefresh('/api/cycles');
 * ```
 */
export async function fetchWithTokenRefresh(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = getAccessToken();
  
  // Add authorization header if token exists
  const headers = {
    ...options.headers,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };

  // Make the request
  let response = await fetch(url, {
    ...options,
    headers
  });

  // If unauthorized, try to refresh the token
  if (response.status === 401) {
    const newAccessToken = await refreshAccessToken();
    
    if (newAccessToken) {
      // Retry the request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`
        }
      });
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  return response;
}

/**
 * Check if access token is expired or about to expire (within 1 minute)
 * This allows proactive token refresh
 */
export function isTokenExpiringSoon(token: string): boolean {
  try {
    // Decode JWT payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    return expiresAt - now < oneMinute;
  } catch (error) {
    // If we can't decode the token, assume it's expired
    return true;
  }
}

/**
 * Proactively refresh token if it's expiring soon
 * Call this on app init or before critical operations
 */
export async function ensureValidToken(): Promise<string | null> {
  const accessToken = getAccessToken();
  
  if (!accessToken) {
    return null;
  }

  if (isTokenExpiringSoon(accessToken)) {
    return await refreshAccessToken();
  }

  return accessToken;
}

