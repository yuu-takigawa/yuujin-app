import { get, post } from '../http';

export interface Notification {
  id: string;
  type: 'reply' | 'mention' | 'system';
  entityType: string;
  entityId: string;
  fromUserId: string | null;
  fromCharacterId: string | null;
  isRead: boolean;
  createdAt: string;
  // enriched
  fromName?: string;
  fromEmoji?: string;
  preview?: string;
}

export async function getNotifications(): Promise<Notification[]> {
  return get<Notification[]>('/notifications');
}

export async function getUnreadCount(): Promise<number> {
  const result = await get<{ count: number }>('/notifications/unread-count');
  return result.count;
}

export async function markAllRead(): Promise<void> {
  await post('/notifications/read-all');
}
