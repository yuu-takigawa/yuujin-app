import { create } from 'zustand';
import type { JpLevel } from '../services/api';

interface SettingsState {
  nativeLanguage: string;
  targetLanguage: string;
  darkMode: boolean;
  jpLevel: JpLevel;
  setNativeLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string) => void;
  setDarkMode: (enabled: boolean) => void;
  setJpLevel: (level: JpLevel) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  nativeLanguage: '中文',
  targetLanguage: '日本語',
  darkMode: false,
  jpLevel: 'N4',
  setNativeLanguage: (lang) => set({ nativeLanguage: lang }),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
  setDarkMode: (enabled) => set({ darkMode: enabled }),
  setJpLevel: (level) => set({ jpLevel: level }),
}));
