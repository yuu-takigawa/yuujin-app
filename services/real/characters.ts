import { get, post, put, del } from '../http';
import type { Character } from '../mock/data';
import {
  generateRandomCharacter as mockGenerate,
  randomizeField as mockRandomizeField,
  randomizeArrayField as mockRandomizeArrayField,
} from '../mock/characters';

interface ServerCharacter {
  id: string;
  userId: string | null;
  name: string;
  avatarUrl: string;
  age: number;
  gender: string;
  occupation: string;
  personality: string[] | string;
  hobbies: string[] | string;
  location: string;
  bio: string;
  isPreset: boolean | number;
  promptKey?: string;
}

// Map avatar emoji based on gender (server doesn't store emoji)
function genderEmoji(gender: string): string {
  if (gender === 'female' || gender === '女性') return '👩';
  if (gender === 'male' || gender === '男性') return '👨';
  return '🧑';
}

function mapCharacter(s: ServerCharacter): Character {
  const personality = typeof s.personality === 'string' ? JSON.parse(s.personality) : (s.personality || []);
  const hobbies = typeof s.hobbies === 'string' ? JSON.parse(s.hobbies) : (s.hobbies || []);
  return {
    id: s.id,
    userId: s.userId,
    name: s.name,
    avatarEmoji: genderEmoji(s.gender),
    avatarUrl: s.avatarUrl || undefined,
    age: s.age,
    gender: s.gender === 'female' ? '女性' : s.gender === 'male' ? '男性' : s.gender,
    occupation: s.occupation,
    personality,
    hobbies,
    location: s.location,
    bio: s.bio,
    isPreset: !!s.isPreset,
  };
}

export async function getCharacters(): Promise<Character[]> {
  const list = await get<ServerCharacter[]>('/characters/');
  return list.map(mapCharacter);
}

export async function createCharacter(data: Omit<Character, 'id' | 'isPreset'>): Promise<Character> {
  const result = await post<ServerCharacter>('/characters/', {
    name: data.name,
    avatarUrl: data.avatarUrl || '',
    age: data.age,
    gender: data.gender,
    occupation: data.occupation,
    personality: data.personality,
    hobbies: data.hobbies,
    location: data.location,
    bio: data.bio,
  });
  return mapCharacter(result);
}

export async function updateCharacter(
  id: string,
  data: Partial<Omit<Character, 'id' | 'isPreset'>>,
): Promise<Character> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.avatarUrl !== undefined) body.avatarUrl = data.avatarUrl;
  if (data.age !== undefined) body.age = data.age;
  if (data.gender !== undefined) body.gender = data.gender;
  if (data.occupation !== undefined) body.occupation = data.occupation;
  if (data.personality !== undefined) body.personality = data.personality;
  if (data.hobbies !== undefined) body.hobbies = data.hobbies;
  if (data.location !== undefined) body.location = data.location;
  if (data.bio !== undefined) body.bio = data.bio;

  const result = await put<ServerCharacter>(`/characters/${id}`, body);
  return mapCharacter(result);
}

export async function deleteCharacter(id: string): Promise<void> {
  await del(`/characters/${id}`);
}

// These stay as client-side utilities (no backend needed)
export const generateRandomCharacter = mockGenerate;
export const randomizeField = mockRandomizeField;
export const randomizeArrayField = mockRandomizeArrayField;

/** AI 生成自我介绍 */
export async function generateBio(data: {
  name: string; age: number; gender: string;
  occupation: string; personality: string[]; hobbies: string[]; location: string;
}): Promise<string> {
  const res = await post<{ bio: string }>('/characters/generate-bio', data);
  return res.bio;
}
