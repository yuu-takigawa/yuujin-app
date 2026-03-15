import {
  friendships,
  conversations,
  messages,
  generateId,
  characterGreetings,
  defaultGreeting,
  type Friendship,
  type Conversation,
} from './data';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFriends(userId: string): Promise<Friendship[]> {
  await delay(200);
  return friendships.filter((f) => f.userId === userId);
}

export async function addFriend(
  userId: string,
  characterId: string
): Promise<{ friendship: Friendship; conversation: Conversation }> {
  await delay(300);

  // Check if already friends
  const existing = friendships.find(
    (f) => f.userId === userId && f.characterId === characterId
  );
  if (existing) {
    const conv = conversations.find((c) => c.characterId === characterId);
    return { friendship: existing, conversation: conv! };
  }

  const friendship: Friendship = {
    id: generateId('friend'),
    userId,
    characterId,
    isPinned: false,
    isMuted: false,
    createdAt: new Date().toISOString(),
  };
  friendships.push(friendship);

  // Create conversation
  const greeting =
    characterGreetings[characterId] || defaultGreeting;
  const conversation: Conversation = {
    id: generateId('conv'),
    characterId,
    lastMessage: greeting,
    lastMessageAt: new Date().toISOString(),
    hasUnread: true,
  };
  conversations.push(conversation);

  // Leave messages empty — greeting will be streamed when chat opens
  messages[conversation.id] = [];

  return { friendship, conversation };
}

export async function removeFriend(
  userId: string,
  characterId: string
): Promise<void> {
  await delay(200);
  const idx = friendships.findIndex(
    (f) => f.userId === userId && f.characterId === characterId
  );
  if (idx !== -1) friendships.splice(idx, 1);

  // Remove conversation
  const convIdx = conversations.findIndex((c) => c.characterId === characterId);
  if (convIdx !== -1) {
    const convId = conversations[convIdx].id;
    conversations.splice(convIdx, 1);
    delete messages[convId];
  }
}

export async function updateFriend(
  userId: string,
  characterId: string,
  updates: { isPinned?: boolean; isMuted?: boolean }
): Promise<Friendship | null> {
  await delay(100);
  const f = friendships.find(
    (f) => f.userId === userId && f.characterId === characterId
  );
  if (!f) return null;
  if (updates.isPinned !== undefined) f.isPinned = updates.isPinned;
  if (updates.isMuted !== undefined) f.isMuted = updates.isMuted;
  return { ...f };
}
