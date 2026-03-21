import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JpLevel } from '../services/api';

const SETTINGS_KEY = 'yuujin-settings';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  nativeLanguage: string;
  targetLanguage: string;
  themeMode: ThemeMode;
  // 兼容旧代码：darkMode getter
  darkMode: boolean;
  jpLevel: JpLevel;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setNativeLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setDarkMode: (enabled: boolean) => void;
  setJpLevel: (level: JpLevel) => void;
}

function save(partial: Record<string, unknown>) {
  const state = useSettingsStore.getState();
  const data = {
    nativeLanguage: state.nativeLanguage,
    targetLanguage: state.targetLanguage,
    themeMode: state.themeMode,
    jpLevel: state.jpLevel,
    ...partial,
  };
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

export const useSettingsStore = create<SettingsState>((set) => ({
  nativeLanguage: '中文',
  targetLanguage: '日本語',
  themeMode: 'system',
  darkMode: false,
  jpLevel: 'N4',
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          themeMode: data.themeMode ?? (data.darkMode ? 'dark' : 'light'),
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
  setThemeMode: (mode) => { set({ themeMode: mode }); save({ themeMode: mode }); },
  setDarkMode: (enabled) => { set({ themeMode: enabled ? 'dark' : 'light' }); save({ themeMode: enabled ? 'dark' : 'light' }); },
  setJpLevel: (level) => { set({ jpLevel: level }); save({ jpLevel: level }); },
}));
