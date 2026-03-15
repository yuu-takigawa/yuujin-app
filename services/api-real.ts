// ─── Real Backend API ───
// To use: rename this file to api.ts (backup mock api.ts first)
// Requires backend running at http://localhost:7001

export const USE_REAL_API = true;

// ─── Auth ───
export { login, register, refreshToken } from './real/auth';

// ─── Chat streaming ───
export { streamResponse } from './real/chat';
export type { SSEEvent } from './real/chat';

// ─── Conversations ───
export {
  getConversations,
  getMessages,
  deleteConversation,
  markAsRead,
  clearMessages,
  addMessageToConversation,
  getConversationByCharacterId,
} from './real/conversations';

// ─── Characters ───
export {
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from './real/characters';

// Client-side randomization utilities (no backend needed)
export {
  generateRandomCharacter,
  randomizeField,
  randomizeArrayField,
} from './mock/characters';

// ─── Friends ───
export {
  getFriends,
  addFriend,
  removeFriend,
  updateFriend,
} from './real/friends';

// ─── News ───
export { getNewsArticles, getNewsDetail, markNewsAsRead } from './real/news';

// Keep mock data for components that need it (topics, news details fallback)
export { mockNewsDetails, mockTopics } from './mock/data';

// ─── Types ───
export type {
  User,
  Character,
  Friendship,
  Conversation,
  Message,
  NewsArticle,
  NewsArticleDetail,
  NewsParagraph,
  NewsComment,
  Topic,
  JpLevel,
} from './mock/data';
