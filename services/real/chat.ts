import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { API_BASE_URL, getToken } from '../http';

export interface SSEEvent {
  type: 'start' | 'delta' | 'done' | 'error';
  conversationId?: string;
  content?: string;
  error?: string;
  credits?: number;
}

type SSECallback = (event: SSEEvent) => void;

// Local text streaming for greeting messages (no backend call needed)
// In real mode, greetings are already saved as messages by the backend,
// so this is only used as a fallback edge case.
export function streamText(
  conversationId: string,
  text: string,
  onEvent: SSECallback,
): () => void {
  let cancelled = false;
  let index = 0;

  onEvent({ type: 'start', conversationId });

  const interval = setInterval(() => {
    if (cancelled) {
      clearInterval(interval);
      return;
    }
    if (index < text.length) {
      onEvent({ type: 'delta', content: text[index] });
      index++;
    } else {
      clearInterval(interval);
      onEvent({ type: 'done', conversationId });
    }
  }, 30);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

/** 新好友第一条消息：服务端生成 bio（含翻译）+ SSE 流式返回 + 持久化 */
export function streamGreeting(
  conversationId: string,
  onEvent: SSECallback,
): () => void {
  let cancelled = false;
  const xhr = new XMLHttpRequest();
  let lastIndex = 0;

  xhr.open('POST', `${API_BASE_URL}/chat/greet`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  const token = getToken();
  if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

  xhr.onreadystatechange = () => {
    if (cancelled) return;
    if (xhr.readyState >= 3) {
      const newText = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      if (newText) parseSSELines(newText, onEvent);
    }
  };

  xhr.onerror = () => { if (!cancelled) onEvent({ type: 'error', error: 'Network error' }); };
  xhr.send(JSON.stringify({ conversationId }));

  return () => { cancelled = true; xhr.abort(); };
}

// Parse SSE lines from a text chunk and call onEvent for each valid event
function parseSSELines(text: string, onEvent: SSECallback): void {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data: ')) {
      try {
        const event = JSON.parse(trimmed.slice(6)) as SSEEvent;
        onEvent(event);
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}

export function streamResponse(
  conversationId: string,
  userMessage: string,
  onEvent: SSECallback,
): () => void {
  let cancelled = false;

  // Use XMLHttpRequest for SSE streaming - works reliably in React Native
  // (fetch ReadableStream is not supported in React Native's Hermes engine)
  const xhr = new XMLHttpRequest();
  let lastIndex = 0;

  xhr.open('POST', `${API_BASE_URL}/chat`);
  xhr.setRequestHeader('Content-Type', 'application/json');

  const token = getToken();
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  xhr.onreadystatechange = () => {
    if (cancelled) return;

    // readyState 3 = LOADING (data is being received incrementally)
    // readyState 4 = DONE (request completed)
    if (xhr.readyState >= 3) {
      // Check for HTTP errors (e.g. 402 insufficient credits)
      if (xhr.readyState === 4 && xhr.status !== 200) {
        let errorMsg = 'AI response failed';
        if (xhr.status === 402) errorMsg = 'ポイントが不足しています。プランをアップグレードしてください。';
        else if (xhr.status === 401) errorMsg = 'Authentication failed';
        else if (xhr.status >= 500) errorMsg = 'Server error';
        onEvent({ type: 'error', error: errorMsg });
        return;
      }

      const newText = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;

      if (newText) {
        parseSSELines(newText, (event) => {
          if (!cancelled) onEvent(event);
        });
      }
    }
  };

  xhr.onerror = () => {
    if (!cancelled) {
      onEvent({ type: 'error', error: 'Network error' });
    }
  };

  xhr.ontimeout = () => {
    if (!cancelled) {
      onEvent({ type: 'error', error: 'Request timeout' });
    }
  };

  xhr.timeout = 60000; // 60 seconds timeout

  xhr.send(JSON.stringify({
    conversationId,
    message: userMessage,
  }));

  return () => {
    cancelled = true;
    xhr.abort();
  };
}

/**
 * Stream AI reply suggestion for the user (no credits, no save)
 * Endpoint: POST /chat/suggest
 */
export function streamSuggest(
  conversationId: string,
  onEvent: SSECallback,
): () => void {
  let cancelled = false;

  const xhr = new XMLHttpRequest();
  let lastIndex = 0;

  xhr.open('POST', `${API_BASE_URL}/chat/suggest`);
  xhr.setRequestHeader('Content-Type', 'application/json');

  const token = getToken();
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  xhr.onreadystatechange = () => {
    if (cancelled) return;
    if (xhr.readyState >= 3) {
      if (xhr.readyState === 4 && xhr.status !== 200) {
        let errorMsg = 'Suggest failed';
        if (xhr.status === 401) errorMsg = 'Authentication failed';
        else if (xhr.status >= 500) errorMsg = 'Server error';
        onEvent({ type: 'error', error: errorMsg });
        return;
      }
      const newText = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      if (newText) {
        parseSSELines(newText, (event) => {
          if (!cancelled) onEvent(event);
        });
      }
    }
  };

  xhr.onerror = () => {
    if (!cancelled) onEvent({ type: 'error', error: 'Network error' });
  };

  xhr.timeout = 30000;
  xhr.ontimeout = () => {
    if (!cancelled) onEvent({ type: 'error', error: 'Request timeout' });
  };

  xhr.send(JSON.stringify({ conversationId }));

  return () => { cancelled = true; xhr.abort(); };
}

/**
 * Upload an image for chat (multipart/form-data → OSS → returns URL)
 */
const MAX_IMAGE_DIMENSION = 1200;
const JPEG_QUALITY = 0.7;

async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export async function uploadChatImage(uri: string): Promise<string> {
  // Compress: resize to 1200px wide + JPEG 70% quality (~100-300KB)
  const compressedUri = await compressImage(uri);

  const token = getToken();
  const formData = new FormData();
  const filename = 'photo.jpg';

  if (Platform.OS === 'web') {
    const blob = await (await fetch(compressedUri)).blob();
    formData.append('file', blob, filename);
  } else {
    formData.append('file', {
      uri: compressedUri,
      name: filename,
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  const response = await fetch(`${API_BASE_URL}/chat/image`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const json = await response.json();
  if (!json.success) throw new Error(json.error || 'Upload failed');
  return json.data.url;
}

/**
 * Stream chat with optional imageUrl
 */
export function streamResponseWithImage(
  conversationId: string,
  userMessage: string,
  imageUrl: string,
  onEvent: SSECallback,
): () => void {
  let cancelled = false;

  const xhr = new XMLHttpRequest();
  let lastIndex = 0;

  xhr.open('POST', `${API_BASE_URL}/chat`);
  xhr.setRequestHeader('Content-Type', 'application/json');

  const token = getToken();
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  xhr.onreadystatechange = () => {
    if (cancelled) return;
    if (xhr.readyState >= 3) {
      const newText = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      if (newText) {
        parseSSELines(newText, (event) => {
          if (!cancelled) onEvent(event);
        });
      }
    }
  };

  xhr.onerror = () => {
    if (!cancelled) onEvent({ type: 'error', error: 'Network error' });
  };

  xhr.timeout = 60000;
  xhr.send(JSON.stringify({ conversationId, message: userMessage, imageUrl }));

  return () => { cancelled = true; xhr.abort(); };
}

/**
 * Stream chat message annotation (translation / grammar analysis) via SSE.
 * Endpoint: POST /chat/annotate
 */
export function streamChatAnnotate(
  messageContent: string,
  type: 'translation' | 'analysis',
  onEvent: SSECallback,
): () => void {
  let cancelled = false;

  const xhr = new XMLHttpRequest();
  let lastIndex = 0;

  xhr.open('POST', `${API_BASE_URL}/chat/annotate`);
  xhr.setRequestHeader('Content-Type', 'application/json');

  const token = getToken();
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  xhr.onreadystatechange = () => {
    if (cancelled) return;
    if (xhr.readyState >= 3) {
      if (xhr.readyState === 4 && xhr.status !== 200) {
        let errorMsg = 'Annotation failed';
        if (xhr.status === 402) errorMsg = 'ポイントが不足しています';
        else if (xhr.status === 401) errorMsg = 'Authentication failed';
        else if (xhr.status >= 500) errorMsg = 'Server error';
        onEvent({ type: 'error', error: errorMsg });
        return;
      }
      const newText = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      if (newText) {
        parseSSELines(newText, (event) => {
          if (!cancelled) onEvent(event);
        });
      }
    }
  };

  xhr.onerror = () => {
    if (!cancelled) onEvent({ type: 'error', error: 'Network error' });
  };

  xhr.timeout = 30000;
  xhr.ontimeout = () => {
    if (!cancelled) onEvent({ type: 'error', error: 'Request timeout' });
  };

  xhr.send(JSON.stringify({ content: messageContent, type }));

  return () => { cancelled = true; xhr.abort(); };
}
