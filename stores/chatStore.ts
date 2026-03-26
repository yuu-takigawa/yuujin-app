import { create } from 'zustand';
import type { Message } from '../services/api';
import {
  streamResponse,
  streamResponseWithImage,
  streamText,
  getMessages,
  addMessageToConversation,
  clearMessages,
  getConversations,
} from '../services/api';
import { useCreditStore } from './creditStore';

// ~30 chars per second ≈ 33ms per character
const CHAR_INTERVAL_MS = 33;
const PAGE_SIZE = 30;

interface ChatState {
  conversationId: string | null;
  characterId: string | null;
  messages: Message[];
  hasMore: boolean;
  loadingMore: boolean;
  isStreaming: boolean;
  streamingContent: string;
  cancelStream: (() => void) | null;
  error: string | null;

  loadConversation: (conversationId: string, characterId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (content: string, imageUrl?: string) => void;
  stopStreaming: () => void;
  clearChat: () => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  characterId: null,
  messages: [],
  hasMore: false,
  loadingMore: false,
  isStreaming: false,
  streamingContent: '',
  cancelStream: null,
  error: null,

  loadConversation: async (conversationId, characterId) => {
    // Clear old conversation immediately to avoid stale messages showing
    set({ error: null, conversationId, characterId, messages: [], hasMore: false, streamingContent: '', isStreaming: false });
    const { messages: msgs, hasMore } = await getMessages(conversationId, { limit: PAGE_SIZE });
    // Only apply if still on the same conversation (user may have navigated away)
    if (get().conversationId !== conversationId) return;
    set({ messages: msgs, hasMore });

    // If no messages, stream the greeting (fallback for edge cases)
    if (msgs.length === 0) {
      const convs = await getConversations();
      const conv = convs.find((c) => c.id === conversationId);
      const greeting = conv?.lastMessage;
      if (greeting) {
        set({ isStreaming: true, streamingContent: '' });
        let accumulated = '';
        const cancel = streamText(conversationId, greeting, (event) => {
          if (event.type === 'delta' && event.content) {
            accumulated += event.content;
            set({ streamingContent: accumulated });
          } else if (event.type === 'done') {
            const finalContent = accumulated || greeting;
            const aiMsg = addMessageToConversation(conversationId, 'assistant', finalContent);
            set((s) => ({
              messages: [...s.messages, aiMsg],
              isStreaming: false,
              streamingContent: '',
              cancelStream: null,
            }));
          } else if (event.type === 'error') {
            set({ isStreaming: false, streamingContent: '', cancelStream: null, error: event.error || 'Streaming error' });
          }
        });
        set({ cancelStream: cancel });
      }
    }
  },

  loadMoreMessages: async () => {
    const { conversationId, messages, hasMore, loadingMore } = get();
    if (!conversationId || !hasMore || loadingMore) return;

    set({ loadingMore: true });
    const oldest = messages[0];
    const before = oldest?.createdAt;
    const { messages: older, hasMore: moreAvailable } = await getMessages(conversationId, {
      limit: PAGE_SIZE,
      before,
    });
    set((s) => ({
      messages: [...older, ...s.messages],
      hasMore: moreAvailable,
      loadingMore: false,
    }));
  },

  sendMessage: (content, imageUrl) => {
    const { conversationId, cancelStream } = get();
    if (!conversationId || get().isStreaming) return;

    if (cancelStream) cancelStream();

    const userMsg = addMessageToConversation(conversationId, 'user', content, imageUrl);
    set((s) => ({
      messages: [...s.messages, userMsg],
      isStreaming: true,
      streamingContent: '',
      error: null,
    }));

    // Buffer incoming content and display at a controlled rate (~20 chars/sec)
    let accumulated = '';       // All content received from server
    let displayed = '';         // Content currently shown to user
    let streamDone = false;     // Whether server finished sending
    let doneCredits: number | undefined;
    let displayTimer: ReturnType<typeof setInterval> | null = null;

    const finishDisplay = () => {
      if (displayTimer) {
        clearInterval(displayTimer);
        displayTimer = null;
      }
      const finalContent = accumulated;
      if (finalContent) {
        const aiMsg = addMessageToConversation(conversationId, 'assistant', finalContent);
        set((s) => ({
          messages: [...s.messages, aiMsg],
          isStreaming: false,
          streamingContent: '',
          cancelStream: null,
        }));
      } else {
        // No content received - reload from server
        set({ isStreaming: false, streamingContent: '', cancelStream: null });
        getMessages(conversationId).then(({ messages: msgs }) => {
          if (get().conversationId === conversationId) {
            set({ messages: msgs });
          }
        });
      }
      if (doneCredits !== undefined) {
        useCreditStore.getState().updateCredits(doneCredits);
      }
    };

    const startDisplayTimer = () => {
      if (displayTimer) return;
      displayTimer = setInterval(() => {
        if (displayed.length < accumulated.length) {
          // Reveal next character
          displayed = accumulated.substring(0, displayed.length + 1);
          set({ streamingContent: displayed });
        } else if (streamDone) {
          // All content displayed and server is done
          finishDisplay();
        }
        // else: waiting for more content from server, timer keeps ticking
      }, CHAR_INTERVAL_MS);
    };

    const handleEvent = (event: import('../services/api').SSEEvent) => {
      if (event.type === 'delta' && event.content) {
        accumulated += event.content;
        startDisplayTimer();
      } else if (event.type === 'done') {
        streamDone = true;
        doneCredits = event.credits;
        // If no display timer running (no deltas received), finish immediately
        if (!displayTimer) {
          finishDisplay();
        }
      } else if (event.type === 'error') {
        if (displayTimer) {
          clearInterval(displayTimer);
          displayTimer = null;
        }
        set({
          isStreaming: false,
          streamingContent: '',
          cancelStream: null,
          error: event.error || 'AI response failed',
        });
        // Server may have saved the AI response - reload after delay
        setTimeout(() => {
          getMessages(conversationId).then(({ messages: msgs }) => {
            if (get().conversationId === conversationId) {
              set({ messages: msgs });
            }
          });
        }, 1000);
      }
    };

    const cancel = imageUrl
      ? streamResponseWithImage(conversationId, content, imageUrl, handleEvent)
      : streamResponse(conversationId, content, handleEvent);

    set({
      cancelStream: () => {
        cancel();
        if (displayTimer) {
          clearInterval(displayTimer);
          displayTimer = null;
        }
      },
    });
  },

  stopStreaming: () => {
    const { cancelStream } = get();
    if (cancelStream) cancelStream();
    set({ isStreaming: false, streamingContent: '', cancelStream: null });
  },

  clearChat: async () => {
    const { conversationId } = get();
    if (!conversationId) return;
    await clearMessages(conversationId);
    set({ messages: [], hasMore: false });
  },

  clearError: () => set({ error: null }),
}));
