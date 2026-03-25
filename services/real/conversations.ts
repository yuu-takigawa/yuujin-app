import { get, post, del } from '../http';
import type { Conversation, Message } from '../mock/data';

interface ServerConversation {
  id: string;
  userId: string;
  characterId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  hasUnread: boolean | number;
  isPinned?: number;
  character?: Record<string, unknown>;
}

interface ServerMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  language?: string;
  metadata?: { imageUrl?: string };
  createdAt: string;
}

function mapConversation(s: ServerConversation): Conversation {
  return {
    id: s.id,
    characterId: s.characterId,
    lastMessage: s.lastMessage || '',
    lastMessageAt: s.lastMessageAt || '',
    hasUnread: !!s.hasUnread,
  };
}

function mapMessage(s: ServerMessage): Message {
  return {
    id: s.id,
    conversationId: s.conversationId,
    role: s.role as 'user' | 'assistant',
    content: s.content,
    language: s.language as Message['language'],
    imageUrl: s.metadata?.imageUrl,
    createdAt: s.createdAt,
  };
}

export async function getConversations(): Promise<Conversation[]> {
  const list = await get<ServerConversation[]>('/conversations/');
  return list.map(mapConversation);
}

export async function getMessages(
  conversationId: string,
  options?: { limit?: number; before?: string },
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.before) params.set('before', options.before);
  const qs = params.toString();
  const url = `/conversations/${conversationId}${qs ? `?${qs}` : ''}`;
  const result = await get<{ conversation: ServerConversation; messages: ServerMessage[]; hasMore: boolean }>(url);
  return { messages: result.messages.map(mapMessage), hasMore: result.hasMore };
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await del(`/conversations/${conversationId}`);
}

export async function markAsRead(conversationId: string): Promise<void> {
  await post(`/conversations/${conversationId}/read`);
}

export async function clearMessages(conversationId: string): Promise<void> {
  await del(`/conversations/${conversationId}/messages`);
}

// For local optimistic updates - creates a temporary message object
// (the real message gets saved server-side during chat streaming)
export function addMessageToConversation(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  imageUrl?: string,
): Message {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    conversationId,
    role,
    content,
    imageUrl,
    createdAt: new Date().toISOString(),
  };
}

export function getConversationByCharacterId(
  characterId: string,
): Conversation | undefined {
  // This is called synchronously from stores. In real mode, the store
  // should maintain its own conversation list and search locally.
  // Return undefined to signal "not cached" - the caller handles this.
  return undefined;
}
