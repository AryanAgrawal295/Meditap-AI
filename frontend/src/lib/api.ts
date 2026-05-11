import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
} from '@/lib/storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005/api';

type RequestOptions = {
  method?: string;
  body?: BodyInit | Record<string, unknown> | null;
  auth?: boolean;
  headers?: HeadersInit;
};

let refreshPromise: Promise<string | null> | null = null;

function notifyAuthExpired() {
  clearStoredTokens();
  window.dispatchEvent(new Event('meditap:auth-expired'));
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getStoredRefreshToken();

      if (!refreshToken) {
        notifyAuthExpired();
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        notifyAuthExpired();
        return null;
      }

      const data = await response.json();
      const currentRefreshToken = getStoredRefreshToken();

      if (data.accessToken && currentRefreshToken) {
        setStoredTokens(data.accessToken, currentRefreshToken);
      }

      return data.accessToken || null;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function parseResponse<T>(response: Response) {
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  let data: unknown = null;

  if (text) {
    if (isJson) {
      data = JSON.parse(text);
    } else {
      const compactText = text.replace(/\s+/g, ' ').trim();
      throw new Error(
        compactText.startsWith('<')
          ? `Backend returned HTML instead of JSON (${response.status}). Restart the backend and try again.`
          : compactText
      );
    }
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data !== null
        ? (data as { message?: string; error?: string }).message ||
          (data as { message?: string; error?: string }).error ||
          'Request failed'
        : 'Request failed';
    throw new Error(errorMessage);
  }

  return data as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, headers } = options;
  const requestHeaders = new Headers(headers || {});

  if (!(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const accessToken = getStoredAccessToken();

  if (auth && accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body:
      body instanceof FormData || typeof body === 'string'
        ? body
        : body
          ? JSON.stringify(body)
          : undefined,
  });

  if (response.status === 401 && auth) {
    const refreshedToken = await refreshAccessToken();

    if (refreshedToken) {
      requestHeaders.set('Authorization', `Bearer ${refreshedToken}`);

      const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: requestHeaders,
        body:
          body instanceof FormData || typeof body === 'string'
            ? body
            : body
              ? JSON.stringify(body)
              : undefined,
      });

      return parseResponse<T>(retryResponse);
    }

    notifyAuthExpired();
  }

  return parseResponse<T>(response);
}

export { API_BASE_URL };
