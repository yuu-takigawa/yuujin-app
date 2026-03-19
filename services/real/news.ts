import { get, post, API_BASE_URL, getToken } from '../http';
import type { NewsArticle, NewsArticleDetail, NewsComment } from '../mock/data';

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
    cache?: Record<string, Record<string, string>>;
    furigana?: Record<string, [string, string][]>;
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
  cache: Record<string, Record<string, string>>;
  furigana: Record<string, [string, string][]>;
} {
  const parsed = typeof a === 'string' ? JSON.parse(a) : (a || {});
  return {
    imageEmoji: parsed.imageEmoji || '📰',
    cache: parsed.cache || {},
    furigana: parsed.furigana || {},
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
    category: s.category || undefined,
  };
}

function mapArticleDetail(s: ServerNewsArticle): NewsArticleDetail {
  const base = mapArticle(s);
  const ann = parseAnnotations(s.annotations);
  return {
    ...base,
    content: s.content || '',
    furigana: ann.furigana,
    paragraphs: [],
    comments: [],
  };
}

export async function getNewsArticles(
  options?: { category?: string; limit?: number; offset?: number },
): Promise<{ articles: NewsArticle[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  const qs = params.toString();
  const res = await get<{ articles: ServerNewsArticle[]; hasMore: boolean }>(
    `/news/${qs ? `?${qs}` : ''}`,
  );
  return {
    articles: res.articles.map(mapArticle),
    hasMore: res.hasMore,
  };
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

// ─── 振り仮名（kuromoji 辞書、AI不要） ───

export async function getNewsFurigana(
  newsId: string,
  paragraphIndex: number,
): Promise<[string, string][]> {
  const res = await post<{ ruby: [string, string][] }>(`/news/${newsId}/furigana`, { paragraphIndex });
  return res.ruby;
}

// ─── SSE 段落注释 ───

export interface AnnotateSSEEvent {
  type: 'start' | 'delta' | 'done' | 'error';
  content?: string;
  cached?: boolean;
  error?: string;
}

function parseSSELines(text: string, onEvent: (e: AnnotateSSEEvent) => void): void {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data: ')) {
      try {
        const event = JSON.parse(trimmed.slice(6)) as AnnotateSSEEvent;
        onEvent(event);
      } catch { /* ignore malformed */ }
    }
  }
}

/**
 * 请求段落注释（翻译/解说），通过 SSE 流式返回。
 * 返回取消函数。
 */
export function annotateNewsParagraph(
  newsId: string,
  paragraphIndex: number,
  type: 'translation' | 'explanation',
  onEvent: (event: AnnotateSSEEvent) => void,
): () => void {
  let cancelled = false;

  const xhr = new XMLHttpRequest();
  let lastIndex = 0;

  xhr.open('POST', `${API_BASE_URL}/news/${newsId}/annotate`);
  xhr.setRequestHeader('Content-Type', 'application/json');

  const token = getToken();
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  xhr.onreadystatechange = () => {
    if (cancelled) return;
    if (xhr.readyState >= 3) {
      const newText = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      if (newText) {
        parseSSELines(newText, (event) => {
          if (!cancelled) onEvent(event);
        });
      }
    }
  };

  xhr.onerror = () => {
    if (!cancelled) onEvent({ type: 'error', error: 'Network error' });
  };

  xhr.timeout = 30000;
  xhr.ontimeout = () => {
    if (!cancelled) onEvent({ type: 'error', error: 'Request timeout' });
  };

  xhr.send(JSON.stringify({ paragraphIndex, type }));

  return () => {
    cancelled = true;
    xhr.abort();
  };
}
