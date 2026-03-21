import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JpLevel } from '../services/api';

const SETTINGS_KEY = 'yuujin-settings';

interface SettingsState {
  nativeLanguage: string;
  targetLanguage: string;
  darkMode: boolean;
  jpLevel: JpLevel;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setNativeLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string) => void;
  setDarkMode: (enabled: boolean) => void;
  setJpLevel: (level: JpLevel) => void;
}

function save(partial: Record<string, unknown>) {
  const { hydrated, hydrate, setNativeLanguage, setTargetLanguage, setDarkMode, setJpLevel, ...data } = useSettingsStore.getState() as Record<string, unknown>;
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...data, ...partial }));
}

export const useSettingsStore = create<SettingsState>((set) => ({
  nativeLanguage: '中文',
  targetLanguage: '日本語',
  darkMode: false,
  jpLevel: 'N4',
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          darkMode: data.darkMode ?? false,
          jpLevel: data.jpLevel ?? 'N4',
          nativeLanguage: data.nativeLanguage ?? '中文',
          targetLanguage: data.targetLanguage ?? '日本語',
        });
      }
    } catch { /* ignore */ }
    set({ hydrated: true });
  },

  setNativeLanguage: (lang) => { set({ nativeLanguage: lang }); save({ nativeLanguage: lang }); },
  setTargetLanguage: (lang) => { set({ targetLanguage: lang }); save({ targetLanguage: lang }); },
  setDarkMode: (enabled) => { set({ darkMode: enabled }); save({ darkMode: enabled }); },
  setJpLevel: (level) => { set({ jpLevel: level }); save({ jpLevel: level }); },
}));
