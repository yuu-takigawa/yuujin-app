import { post } from '../http';
import type { Topic } from '../mock/data';

interface ServerTopic {
  text: string;
  emoji: string;
}

export async function drawTopics(characterId: string): Promise<Topic[]> {
  const result = await post<{ topics: ServerTopic[] }>('/topics/draw', { characterId });
  return (result.topics || []).map((t, i) => ({
    id: `ai-topic-${i}`,
    text: t.text,
    emoji: t.emoji,
    category: 'ai',
  }));
}
