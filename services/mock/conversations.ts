import {
  conversations,
  messages,
  generateId,
  type Conversation,
  type Message,
} from './data';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockGetConversations(): Promise<Conversation[]> {
  await delay(200);
  return [...conversations].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

export async function mockGetMessages(
  conversationId: string
): Promise<Message[]> {
  await delay(200);
  return [...(messages[conversationId] || [])];
}

export async function mockDeleteConversation(
  conversationId: string
): Promise<void> {
  await delay(200);
  const idx = conversations.findIndex((c) => c.id === conversationId);
  if (idx !== -1) conversations.splice(idx, 1);
  delete messages[conversationId];
}

export async function mockMarkAsRead(
  conversationId: string
): Promise<void> {
  await delay(50);
  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) conv.hasUnread = false;
}

export async function mockClearMessages(
  conversationId: string
): Promise<void> {
  await delay(100);
  messages[conversationId] = [];
  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.lastMessage = '';
  }
}

export function addMessageToConversation(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Message {
  const msg: Message = {
    id: generateId('msg'),
    conversationId,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  if (!messages[conversationId]) {
    messages[conversationId] = [];
  }
  messages[conversationId].push(msg);

  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.lastMessage = content.slice(0, 50);
    conv.lastMessageAt = msg.createdAt;
    if (role === 'assistant') conv.hasUnread = true;
  }
  return msg;
}

export function getConversationByCharacterId(
  characterId: string
): Conversation | undefined {
  return conversations.find((c) => c.characterId === characterId);
}
