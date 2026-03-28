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

/** TTS: 文字转语音，返回音频 URL（非流式，用于缓存命中时） */
export async function tts(text: string, voice?: string): Promise<string> {
  const result = await post<{ url: string; cached: boolean }>('/voice/tts', { text, voice });
  return result.url;
}

/**
 * TTS 流式：SSE 接收 base64 PCM 分片
 * @param onChunk 每个 base64 音频分片回调
 * @param onDone  流结束回调
 * @returns abort 函数
 */
export function ttsStream(
  text: string,
  voice: string | undefined,
  onChunk: (base64: string) => void,
  onDone: () => void,
  onError?: (err: string) => void,
  /** 服务端缓存命中时返回 URL，前端可用 Audio 播放 */
  onCachedUrl?: (url: string) => void,
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE_URL}/voice/tts-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
    },
    body: JSON.stringify({ text, voice }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        onError?.(`TTS stream error: ${res.status}`);
        onDone();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') { onDone(); return; }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.cachedUrl) { onCachedUrl?.(parsed.cachedUrl); }
            else if (parsed.audio) onChunk(parsed.audio);
            if (parsed.error) onError?.(parsed.error);
          } catch { /* skip */ }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError?.(err.message);
      onDone();
    });

  return () => controller.abort();
}
