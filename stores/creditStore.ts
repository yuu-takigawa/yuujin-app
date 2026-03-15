import { create } from 'zustand';
import type { CreditsInfo, AiModel } from '../services/api';
import { getCredits, getModels } from '../services/api';

interface CreditState {
  credits: number;
  dailyCredits: number;
  membership: string;
  models: AiModel[];
  selectedModelId: string | null;
  isLoaded: boolean;

  loadCredits: () => Promise<void>;
  loadModels: () => Promise<void>;
  setSelectedModel: (modelId: string) => void;
  updateCredits: (credits: number) => void;
}

export const useCreditStore = create<CreditState>((set, get) => ({
  credits: 0,
  dailyCredits: 100,
  membership: 'free',
  models: [],
  selectedModelId: null,
  isLoaded: false,

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

      // Auto-select first available model if none selected
      let modelId = selectedModelId;
      if (!modelId || !models.find((m) => m.id === modelId && m.available)) {
        const firstAvailable = models.find((m) => m.available);
        modelId = firstAvailable?.id || null;
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

  updateCredits: (credits) => set({ credits }),
}));
