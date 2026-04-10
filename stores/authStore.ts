import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../services/api';
import { login as apiLogin, register as apiRegister, updateProfile, deleteAccount as apiDeleteAccount, USE_REAL_API } from '../services/api';
import { setTokens, onUnauthorized } from '../services/http';

const AUTH_STORAGE_KEY = 'yuujin_auth';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, code: string) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  completeOnboarding: () => void;
  setJpLevel: (level: User['jpLevel']) => void;
  updateUser: (updates: { username?: string; avatarEmoji?: string; avatarUrl?: string }) => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  isRestoring: true,

  restoreSession: async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { token, user } = JSON.parse(stored);
        if (token && user) {
          setTokens(token);
          set({ token, user, isRestoring: false });
          return;
        }
      }
    } catch {}
    set({ isRestoring: false });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await apiLogin(email, password);
      set({ token: res.token, user: res.user, isLoading: false });
      // Persist session
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: res.token, user: res.user }));
    } catch {
      set({ isLoading: false });
      throw new Error('Login failed');
    }
  },

  register: async (email, password, code) => {
    set({ isLoading: true });
    try {
      const res = await apiRegister(email, password, code);
      set({ token: res.token, user: res.user, isLoading: false });
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: res.token, user: res.user }));
    } catch {
      set({ isLoading: false });
      throw new Error('Register failed');
    }
  },

  logout: () => {
    setTokens(null);
    set({ token: null, user: null });
    AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  },

  deleteAccount: async () => {
    if (USE_REAL_API) {
      await apiDeleteAccount();
    }
    setTokens(null);
    set({ token: null, user: null });
    AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  },

  completeOnboarding: () => {
    const user = get().user;
    if (user) {
      const updated = { ...user, onboardingCompleted: true };
      set({ user: updated });
      // Persist updated user
      const token = get().token;
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: updated }));
      if (USE_REAL_API) {
        updateProfile({ settings: { onboardingCompleted: true } }).catch(() => {});
      }
    }
  },

  setJpLevel: (level) => {
    const user = get().user;
    if (user) {
      const updated = { ...user, jpLevel: level };
      set({ user: updated });
      const token = get().token;
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: updated }));
      if (USE_REAL_API) {
        updateProfile({ jpLevel: level }).catch(() => {});
      }
    }
  },

  updateUser: async (updates) => {
    const { user, token } = get();
    if (!user) return;
    const updated = { ...user, ...updates };
    set({ user: updated });
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: updated }));
    if (USE_REAL_API && updates.username) {
      updateProfile({ name: updates.username }).catch(() => {});
    }
  },
}));

// Auto-logout on 401 responses
onUnauthorized(() => {
  useAuthStore.getState().logout();
});
