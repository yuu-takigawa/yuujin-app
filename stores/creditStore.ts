import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CreditsInfo, AiModel } from '../services/api';
import { getCredits, getModels, updateProfile, upgradeSubscription } from '../services/api';
import { useAuthStore } from './authStore';

const AUTH_STORAGE_KEY = 'yuujin_auth';

interface CreditState {
  credits: number;
  dailyCredits: number;
  membership: string;
  models: AiModel[];
  selectedModelId: string | null;
  isLoaded: boolean;
  isUpgrading: boolean;

  loadCredits: () => Promise<void>;
  loadModels: () => Promise<void>;
  setSelectedModel: (modelId: string) => void;
  setDefaultModel: (modelId: string) => Promise<void>;
  updateCredits: (credits: number) => void;
  upgradePlan: (tier: 'pro' | 'max') => Promise<void>;
}

export const useCreditStore = create<CreditState>((set, get) => ({
  credits: 0,
  dailyCredits: 100,
  membership: 'free',
  models: [],
  selectedModelId: null,
  isLoaded: false,
  isUpgrading: false,

  loadCredits: async () => {
    try {
      const info = await getCredits();
      set({
        credits: info.credits,
        dailyCredits: info.dailyCredits,
        membership: info.membership,
      });
    } catch {
      // silently fail - will use defaults
    }
  },

  loadModels: async () => {
    try {
      const models = await getModels();
      const { selectedModelId } = get();

      // Priority: current selection > user's persisted default > first available
      let modelId = selectedModelId;
      if (!modelId || !models.find((m) => m.id === modelId && m.available)) {
        const defaultId = useAuthStore.getState().user?.defaultModelId;
        if (defaultId && models.find((m) => m.id === defaultId && m.available)) {
          modelId = defaultId;
        } else {
          const firstAvailable = models.find((m) => m.available);
          modelId = firstAvailable?.id || null;
        }
      }

      set({ models, selectedModelId: modelId, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  setSelectedModel: (modelId) => {
    const model = get().models.find((m) => m.id === modelId);
    if (model?.available) {
      set({ selectedModelId: modelId });
    }
  },

  setDefaultModel: async (modelId) => {
    const model = get().models.find((m) => m.id === modelId);
    if (!model?.available) return;

    set({ selectedModelId: modelId });

    // Persist to server
    try {
      await updateProfile({ settings: { defaultModelId: modelId } });
    } catch {
      // silently fail - local selection still works
    }

    // Sync to authStore and AsyncStorage
    const authState = useAuthStore.getState();
    if (authState.user) {
      const updatedUser = { ...authState.user, defaultModelId: modelId };
      useAuthStore.setState({ user: updatedUser });
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: authState.token, user: updatedUser }));
    }
  },

  updateCredits: (credits) => set({ credits }),

  upgradePlan: async (tier) => {
    set({ isUpgrading: true });
    try {
      const result = await upgradeSubscription(tier);
      set({
        membership: result.membership,
        credits: result.credits,
        dailyCredits: result.dailyCredits,
      });
      // Reload models after tier change
      await get().loadModels();
    } finally {
      set({ isUpgrading: false });
    }
  },
}));
