import {
  characters,
  generateId,
  randomNames,
  randomEmojis,
  randomOccupations,
  randomPersonalities,
  randomHobbies,
  randomLocations,
  type Character,
} from './data';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export async function getCharacters(): Promise<Character[]> {
  await delay(200);
  return [...characters];
}

export async function createCharacter(
  data: Omit<Character, 'id' | 'isPreset'>
): Promise<Character> {
  await delay(300);
  const char: Character = {
    ...data,
    id: generateId('char'),
    isPreset: false,
  };
  characters.push(char);
  return char;
}

export async function updateCharacter(
  id: string,
  data: Partial<Omit<Character, 'id' | 'isPreset'>>
): Promise<Character> {
  await delay(300);
  const idx = characters.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Character not found');
  characters[idx] = { ...characters[idx], ...data };
  return characters[idx];
}

export async function deleteCharacter(id: string): Promise<void> {
  await delay(200);
  const idx = characters.findIndex((c) => c.id === id);
  if (idx !== -1 && !characters[idx].isPreset) {
    characters.splice(idx, 1);
  }
}

export function generateRandomCharacter(userId: string): Omit<Character, 'id' | 'isPreset'> {
  const gender = Math.random() > 0.5 ? '女性' : '男性';
  const namePool = gender === '女性' ? randomNames.female : randomNames.male;
  const name = pickRandom(namePool);
  const personality = pickRandomN(randomPersonalities, 3);
  const hobbies = pickRandomN(randomHobbies, 3);
  const occupation = pickRandom(randomOccupations);
  const location = pickRandom(randomLocations);
  const age = 20 + Math.floor(Math.random() * 15);
  const emoji = pickRandom(randomEmojis);

  return {
    userId,
    name,
    avatarEmoji: emoji,
    age,
    gender,
    occupation,
    personality,
    hobbies,
    location,
    bio: `こんにちは、${name}です。${location}に住んでいます。${occupation}をしています。趣味は${hobbies.join('と')}です。よろしくお願いします！`,
  };
}

export function randomizeField(
  field: keyof Pick<Character, 'name' | 'avatarEmoji' | 'occupation' | 'location' | 'age'>,
  gender?: string
): string | number {
  switch (field) {
    case 'name': {
      const pool = gender === '男性' ? randomNames.male : randomNames.female;
      return pickRandom(pool);
    }
    case 'avatarEmoji':
      return pickRandom(randomEmojis);
    case 'occupation':
      return pickRandom(randomOccupations);
    case 'location':
      return pickRandom(randomLocations);
    case 'age':
      return 20 + Math.floor(Math.random() * 15);
    default:
      return '';
  }
}

export function randomizeArrayField(
  field: 'personality' | 'hobbies'
): string[] {
  switch (field) {
    case 'personality':
      return pickRandomN(randomPersonalities, 3);
    case 'hobbies':
      return pickRandomN(randomHobbies, 3);
    default:
      return [];
  }
}
