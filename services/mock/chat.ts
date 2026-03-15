import {
  characterResponses,
  defaultResponses,
  conversations,
  characters,
} from './data';

export interface SSEEvent {
  type: 'start' | 'delta' | 'done';
  conversationId?: string;
  content?: string;
}

type SSECallback = (event: SSEEvent) => void;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function mockStreamResponse(
  conversationId: string,
  _userMessage: string,
  onEvent: SSECallback
): () => void {
  // Find character for this conversation
  const conv = conversations.find((c) => c.id === conversationId);
  const characterId = conv?.characterId;

  // Pick response from character-specific pool or default
  let pool = defaultResponses;
  if (characterId && characterResponses[characterId]) {
    pool = characterResponses[characterId];
  }
  const response = pickRandom(pool);

  let cancelled = false;
  let charIndex = 0;

  onEvent({ type: 'start', conversationId });

  const interval = setInterval(() => {
    if (cancelled) {
      clearInterval(interval);
      return;
    }

    if (charIndex < response.length) {
      onEvent({ type: 'delta', content: response[charIndex] });
      charIndex++;
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

export function mockStreamText(
  conversationId: string,
  text: string,
  onEvent: SSECallback
): () => void {
  let cancelled = false;
  let charIndex = 0;

  onEvent({ type: 'start', conversationId });

  const interval = setInterval(() => {
    if (cancelled) {
      clearInterval(interval);
      return;
    }

    if (charIndex < text.length) {
      onEvent({ type: 'delta', content: text[charIndex] });
      charIndex++;
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
