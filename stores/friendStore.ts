import { create } from 'zustand';
import type { Friendship, Conversation } from '../services/api';
import {
  getFriends as apiGetFriends,
  addFriend as apiAddFriend,
  removeFriend as apiRemoveFriend,
  updateFriend as apiUpdateFriend,
  getConversations as apiGetConversations,
  deleteConversation as apiDeleteConversation,
  markAsRead as apiMarkAsRead,
} from '../services/api';

interface FriendState {
  friends: Friendship[];
  conversations: Conversation[];
  isLoading: boolean;
  fetchFriends: (userId: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
  addFriend: (userId: string, characterId: string) => Promise<Conversation>;
  removeFriend: (userId: string, characterId: string) => Promise<void>;
  togglePin: (userId: string, characterId: string) => Promise<void>;
  toggleMute: (userId: string, characterId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  conversations: [],
  isLoading: false,

  fetchFriends: async (userId) => {
    const friends = await apiGetFriends(userId);
    set({ friends });
  },

  fetchConversations: async () => {
    set({ isLoading: true });
    const convs = await apiGetConversations();
    set({ conversations: convs, isLoading: false });
  },

  addFriend: async (userId, characterId) => {
    const { friendship, conversation } = await apiAddFriend(userId, characterId);
    set((s) => ({
      friends: [...s.friends, friendship],
      conversations: [conversation, ...s.conversations],
    }));
    return conversation;
  },

  removeFriend: async (userId, characterId) => {
    // Find conversation to remove
    const conv = get().conversations.find((c) => c.characterId === characterId);
    await apiRemoveFriend(userId, characterId);
    set((s) => ({
      friends: s.friends.filter((f) => f.characterId !== characterId),
      conversations: s.conversations.filter((c) => c.characterId !== characterId),
    }));
  },

  togglePin: async (userId, characterId) => {
    const friend = get().friends.find((f) => f.characterId === characterId);
    if (!friend) return;
    await apiUpdateFriend(userId, characterId, { isPinned: !friend.isPinned });
    set((s) => ({
      friends: s.friends.map((f) =>
        f.characterId === characterId ? { ...f, isPinned: !f.isPinned } : f
      ),
    }));
  },

  toggleMute: async (userId, characterId) => {
    const friend = get().friends.find((f) => f.characterId === characterId);
    if (!friend) return;
    await apiUpdateFriend(userId, characterId, { isMuted: !friend.isMuted });
    set((s) => ({
      friends: s.friends.map((f) =>
        f.characterId === characterId ? { ...f, isMuted: !f.isMuted } : f
      ),
    }));
  },

  deleteConversation: async (conversationId) => {
    await apiDeleteConversation(conversationId);
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== conversationId),
    }));
  },

  markAsRead: async (conversationId) => {
    await apiMarkAsRead(conversationId);
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, hasUnread: false } : c
      ),
    }));
  },
}));
