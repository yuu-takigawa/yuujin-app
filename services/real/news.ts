import { get, post } from '../http';
import type { NewsArticle, NewsArticleDetail, NewsParagraph, NewsComment } from '../mock/data';

interface ServerComment {
  id: string;
  newsId: string;
  userId: string | null;
  characterId: string | null;
  parentId: string | null;
  content: string;
  isAi: number;
  createdAt: string;
  author: { id: string; name: string; avatarEmoji: string; isAi: boolean } | null;
  replies?: ServerComment[];
}

function mapComment(c: ServerComment, articleId: string): NewsComment {
  return {
    id: c.id,
    articleId,
    characterId: c.characterId || c.userId || '',
    characterName: c.author?.name || 'ゲスト',
    characterEmoji: c.author?.avatarEmoji || '👤',
    content: c.content,
    createdAt: c.createdAt,
    replies: (c.replies || []).map((r) => mapComment(r, articleId)),
  };
}

interface ServerNewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  source: string;
  sourceUrl: string;
  category: string;
  difficulty: string;
  annotations: string | {
    imageEmoji?: string;
    paragraphs?: NewsParagraph[];
    comments?: Array<{
      id: string;
      characterId: string;
      characterName: string;
      characterEmoji: string;
      content: string;
    }>;
  };
  publishedAt: string;
  isRead?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'たった今';
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

function parseAnnotations(a: ServerNewsArticle['annotations']): {
  imageEmoji: string;
  paragraphs: NewsParagraph[];
  comments: NewsComment[];
} {
  const parsed = typeof a === 'string' ? JSON.parse(a) : (a || {});
  return {
    imageEmoji: parsed.imageEmoji || '📰',
    paragraphs: parsed.paragraphs || [],
    comments: (parsed.comments || []).map((c: Record<string, string>) => ({
      ...c,
      articleId: '',
      createdAt: new Date().toISOString(),
    })),
  };
}

function mapArticle(s: ServerNewsArticle): NewsArticle {
  const ann = parseAnnotations(s.annotations);
  return {
    id: s.id,
    title: s.title,
    summary: s.summary,
    source: s.source,
    timeAgo: timeAgo(s.publishedAt),
    imageEmoji: ann.imageEmoji,
    imageUrl: s.imageUrl || undefined,
    url: s.sourceUrl || '',
    difficulty: s.difficulty || undefined,
  };
}

function mapArticleDetail(s: ServerNewsArticle): NewsArticleDetail {
  const base = mapArticle(s);
  const ann = parseAnnotations(s.annotations);
  return {
    ...base,
    paragraphs: ann.paragraphs,
    comments: ann.comments.map((c) => ({ ...c, articleId: s.id })),
  };
}

export async function getNewsArticles(): Promise<NewsArticle[]> {
  const list = await get<ServerNewsArticle[]>('/news/');
  return list.map(mapArticle);
}

export async function getNewsDetail(id: string): Promise<NewsArticleDetail | null> {
  try {
    const article = await get<ServerNewsArticle>(`/news/${id}`);
    return mapArticleDetail(article);
  } catch {
    return null;
  }
}

export async function markNewsAsRead(id: string): Promise<void> {
  await post(`/news/${id}/read`);
}

export async function getNewsComments(newsId: string): Promise<NewsComment[]> {
  const list = await get<ServerComment[]>(`/news/${newsId}/comments`);
  return list.map((c) => mapComment(c, newsId));
}

export async function postNewsComment(
  newsId: string,
  content: string,
  parentId?: string,
): Promise<{ id: string }> {
  return post<{ id: string }>(`/news/${newsId}/comments`, { content, parentId });
}
