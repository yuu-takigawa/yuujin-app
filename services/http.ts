export const API_BASE_URL = 'https://api.yuujin.cc';

let _token: string | null = null;
let _refreshToken: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export function setTokens(token: string | null, refresh?: string | null) {
  _token = token;
  if (refresh !== undefined) _refreshToken = refresh;
}

/** Register a callback to be called on 401 responses (auto-logout) */
export function onUnauthorized(cb: () => void) {
  _onUnauthorized = cb;
}

export function getToken() {
  return _token;
}

export function getRefreshToken() {
  return _refreshToken;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401 && _onUnauthorized) {
      _onUnauthorized();
    }
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Request failed');
  }

  return json.data as T;
}

export async function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function del<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** TTS: 文字转语音，返回音频 URL */
export async function tts(text: string, voice?: string): Promise<string> {
  const result = await post<{ url: string; cached: boolean }>('/voice/tts', { text, voice });
  return result.url;
}
