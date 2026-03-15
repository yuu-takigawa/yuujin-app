import { get, post, put, del } from '../http';
import type { Friendship, Conversation } from '../mock/data';

interface ServerFriendship {
  id: string;
  userId: string;
  characterId: string;
  isPinned: boolean | number;
  isMuted: boolean | number;
  createdAt: string;
}

interface ServerAddResult {
  friendship: ServerFriendship;
  conversation: {
    id: string;
    characterId: string;
    lastMessage: string;
    lastMessageAt: string;
    hasUnread: boolean | number;
  };
}

function mapFriendship(s: ServerFriendship): Friendship {
  return {
    id: s.id,
    userId: s.userId,
    characterId: s.characterId,
    isPinned: !!s.isPinned,
    isMuted: !!s.isMuted,
    createdAt: s.createdAt,
  };
}

export async function getFriends(userId: string): Promise<Friendship[]> {
  const list = await get<ServerFriendship[]>('/friends/');
  return list.map(mapFriendship);
}

export async function addFriend(
  userId: string,
  characterId: string,
): Promise<{ friendship: Friendship; conversation: Conversation }> {
  const result = await post<ServerAddResult>('/friends/', { characterId });
  return {
    friendship: mapFriendship(result.friendship),
    conversation: {
      id: result.conversation.id,
      characterId: result.conversation.characterId,
      lastMessage: result.conversation.lastMessage || '',
      lastMessageAt: result.conversation.lastMessageAt || new Date().toISOString(),
      hasUnread: !!result.conversation.hasUnread,
    },
  };
}

export async function removeFriend(userId: string, characterId: string): Promise<void> {
  await del(`/friends/${characterId}`);
}

export async function updateFriend(
  userId: string,
  characterId: string,
  updates: { isPinned?: boolean; isMuted?: boolean },
): Promise<Friendship | null> {
  const body: Record<string, number> = {};
  if (updates.isPinned !== undefined) body.isPinned = updates.isPinned ? 1 : 0;
  if (updates.isMuted !== undefined) body.isMuted = updates.isMuted ? 1 : 0;

  const result = await put<ServerFriendship>(`/friends/${characterId}`, body);
  return mapFriendship(result);
}
