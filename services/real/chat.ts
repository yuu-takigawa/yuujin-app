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
  modelId?: string,
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
    ...(modelId ? { modelId } : {}),
  }));

  return () => {
    cancelled = true;
    xhr.abort();
  };
}
