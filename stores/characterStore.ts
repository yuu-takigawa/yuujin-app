import { create } from 'zustand';
import type { Character } from '../services/api';
import {
  getCharacters as apiGetCharacters,
  createCharacter as apiCreateCharacter,
  updateCharacter as apiUpdateCharacter,
  deleteCharacter as apiDeleteCharacter,
  generateRandomCharacter,
} from '../services/api';

interface CharacterState {
  characters: Character[];
  isLoading: boolean;
  fetchCharacters: () => Promise<void>;
  createCharacter: (data: Omit<Character, 'id' | 'isPreset'>) => Promise<Character>;
  updateCharacter: (id: string, data: Partial<Omit<Character, 'id' | 'isPreset'>>) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  generateRandom: (userId: string) => Omit<Character, 'id' | 'isPreset'>;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  characters: [],
  isLoading: false,

  fetchCharacters: async () => {
    set({ isLoading: true });
    const chars = await apiGetCharacters();
    set({ characters: chars, isLoading: false });
  },

  createCharacter: async (data) => {
    const char = await apiCreateCharacter(data);
    set((s) => ({ characters: [...s.characters, char] }));
    return char;
  },

  updateCharacter: async (id, data) => {
    const updated = await apiUpdateCharacter(id, data);
    set((s) => ({
      characters: s.characters.map((c) => (c.id === id ? updated : c)),
    }));
  },

  deleteCharacter: async (id) => {
    await apiDeleteCharacter(id);
    set((s) => ({ characters: s.characters.filter((c) => c.id !== id) }));
  },

  generateRandom: (userId) => {
    return generateRandomCharacter(userId);
  },
}));
