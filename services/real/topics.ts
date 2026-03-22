import { post } from '../http';
import type { Topic } from '../mock/data';

interface ServerTopic {
  text: string;
  emoji: string;
}

export async function drawTopics(characterId: string): Promise<Topic[]> {
  const result = await post<ServerTopic[]>('/topics/draw', { characterId });
  return (result || []).map((t, i) => ({
    id: `ai-topic-${i}`,
    text: t.text,
    emoji: t.emoji,
    category: 'ai',
  }));
}

export async function shuffleTopic(characterId: string): Promise<Topic> {
  const t = await post<ServerTopic>('/topics/shuffle', { characterId });
  return {
    id: `shuffle-${Date.now()}`,
    text: t?.text || '何か面白いことある？',
    emoji: t?.emoji || '🎲',
    category: 'ai',
  };
}
