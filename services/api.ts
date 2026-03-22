// ─── API Mode ───
// Set to true to use real backend, false for mock data
export const USE_REAL_API = true;

// ─── Auth ───
export { login, register, refreshToken, updateProfile, deleteAccount, sendCode, resetPassword, changePassword } from './real/auth';

// ─── Chat streaming ───
export { streamResponse, streamText, uploadChatImage, streamResponseWithImage, streamChatAnnotate } from './real/chat';
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
  streamGenerateBio,
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
export { getNewsArticles, getNewsDetail, markNewsAsRead, getNewsComments, postNewsComment, getNewsFurigana, annotateNewsParagraph, requestAIReply } from './real/news';
export type { AnnotateSSEEvent, AIReplySSEEvent, CommentMention } from './real/news';

// ─── Topics ───
export { drawTopics, shuffleTopic } from './real/topics';

// ─── Avatars ───
export { getAvatarPresets, uploadAvatar } from './real/avatars';
export type { AvatarPreset } from './real/avatars';

// ─── Notifications ───
export { getNotifications, getUnreadCount, markAllRead } from './real/notifications';
export type { Notification } from './real/notifications';

// ─── Credits & Models ───
export { getCredits, getModels } from './real/credits';
export type { CreditsInfo, AiModel } from './real/credits';

// ─── Subscriptions ───
export { upgradeSubscription } from './real/subscription';

// ─── Push Notifications ───
export { registerPushToken, unregisterPushToken } from './real/push';

// Keep mock data for components that need it (topics, news details fallback)
export { mockTopics } from './mock/data';

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
