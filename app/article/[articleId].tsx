import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, ActivityIndicator, Image, Alert, useWindowDimensions, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '../../hooks/useTheme';
import ShareModal from '../../components/common/ShareModal';
import Avatar from '../../components/common/Avatar';
import { getNewsDetail, getNewsComments, postNewsComment, annotateNewsParagraph, requestAIReply } from '../../services/api';
import type { NewsArticleDetail, NewsComment, AnnotateSSEEvent, AIReplySSEEvent } from '../../services/api';
import { useCharacterStore } from '../../stores/characterStore';
import { useFriendStore } from '../../stores/friendStore';
import { useAuthStore } from '../../stores/authStore';

function formatCommentTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}分前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}時間前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 段落注释缓存：key = "index:type"
type AnnotationCache = Record<string, { text: string; loading: boolean }>;
// 振り仮名缓存：key = paragraphIndex
type RubyCache = Record<number, [string, string][]>;

export default function NewsDetailScreen() {
  const { articleId, title: previewTitle, imageUrl: previewImageUrl, imageEmoji: previewEmoji, source: previewSource, timeAgo: previewTimeAgo } = useLocalSearchParams<{ articleId: string; title?: string; imageUrl?: string; imageEmoji?: string; source?: string; timeAgo?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const characters = useCharacterStore((s) => s.characters);
  const friends = useFriendStore((s) => s.friends);
  const user = useAuthStore((s) => s.user);

  // 入场动画（Web 用 JS driver，Native 用 native driver）
  const isWeb = Platform.OS === 'web';
  const fadeAnim = useRef(new Animated.Value(isWeb ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(isWeb ? 0 : 30)).current;
  useEffect(() => {
    if (isWeb) return; // Web 端跳过动画，避免 opacity 卡在 0
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const { width: screenWidth } = useWindowDimensions();
  const [shareVisible, setShareVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [article, setArticle] = useState<NewsArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null); // null = picker hidden
  // 回复目标
  const [replyTarget, setReplyTarget] = useState<{
    id: string;           // 被回复评论的 ID
    name: string;         // 被回复者名
    isReply: boolean;     // 是否是二级评论
    parentId?: string;    // 二级评论所属的一级评论 ID
    characterId?: string; // 被回复者的角色 ID（如果是 AI）
    isAi?: boolean;       // 被回复者是否是 AI
  } | null>(null);
  // 流式 AI 回复：key = tempId, value = streaming reply data
  const [streamingReplies, setStreamingReplies] = useState<Record<string, {
    parentId: string;
    characterName: string;
    characterEmoji: string;
    content: string;
    done: boolean;
  }>>({});
  const aiReplyCancelRefs = useRef<Array<() => void>>([]);
  const [annotations, setAnnotations] = useState<AnnotationCache>({});
  const [rubyCache, setRubyCache] = useState<RubyCache>({});
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; arrowLeft: number }>({ x: 0, y: 0, arrowLeft: 100 });
  const scrollOffsetRef = useRef(0);
  const commentInputRef = useRef<TextInput>(null);
  const commentSectionRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const commentSectionY = useRef(0);

  const loadComments = async (id: string) => {
    try {
      const list = await getNewsComments(id);
      setComments(list);
    } catch { /* silent */ }
  };

  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    if (!articleId) return;
    setLoading(true);
    setContentReady(false);
    getNewsDetail(articleId).then((detail) => {
      // 同时设置 article 和 furigana，避免两次渲染导致注音闪烁
      if (detail?.furigana) {
        setRubyCache(detail.furigana as unknown as RubyCache);
      }
      setArticle(detail);
      setLoading(false);
      // 下一帧再显示内容，让布局先稳定
      requestAnimationFrame(() => setContentReady(true));
    }).catch(() => setLoading(false));
    loadComments(articleId);
    return () => {
      cancelRef.current?.();
      aiReplyCancelRefs.current.forEach((fn) => fn());
      Speech.stop();
    };
  }, [articleId]);

  const paragraphs = article?.content?.split('\n').filter(p => p.trim().length > 0) || [];

  // Ruby 文本渲染（含末尾内联问号）
  const renderParagraph = (text: string, index: number) => {
    const ruby = rubyCache[index];
    const helpMark = (
      <Text
        key="help"
        onPress={() => {
          if (tooltipIndex === index) { setTooltipIndex(null); return; }
          if (Platform.OS === 'web') {
            // 遍历 DOM 找到第 index 个 ⓘ 的 span 元素
            const spans = document.querySelectorAll('span');
            let count = 0;
            for (const span of Array.from(spans)) {
              if (span.textContent === 'ⓘ' && span.children.length === 0) {
                if (count === index) {
                  const rect = span.getBoundingClientRect();
                  const tooltipW = 200;
                  const iconCenter = rect.left + rect.width / 2;
                  const idealLeft = iconCenter - tooltipW / 2;
                  const cx = Math.max(8, Math.min(idealLeft, screenWidth - tooltipW - 8));
                  const cy = Math.max(56, rect.top - 68);
                  setTooltipPos({ x: cx, y: cy, arrowLeft: iconCenter - cx });
                  setTooltipIndex(index);
                  return;
                }
                count++;
              }
            }
          }
        }}
        style={[styles.helpInline, { color: t.brand }]}
      >{'ⓘ'}</Text>
    );

    if (!ruby || ruby.length === 0) {
      return (
        <Text style={[styles.bodyText, { color: t.text }]}>
          {text}{helpMark}
        </Text>
      );
    }

    const segments: { text: string; reading?: string }[] = [];
    let remaining = text;
    for (const [kanji, reading] of ruby) {
      const idx = remaining.indexOf(kanji);
      if (idx === -1) continue;
      if (idx > 0) segments.push({ text: remaining.substring(0, idx) });
      segments.push({ text: kanji, reading });
      remaining = remaining.substring(idx + kanji.length);
    }
    if (remaining) segments.push({ text: remaining });

    return (
      <View style={styles.rubyContainer}>
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          if (seg.reading) {
            return (
              <View key={i} style={styles.rubyUnit}>
                <Text style={[styles.rubyReading, { color: t.brand }]}>{seg.reading}</Text>
                <Text style={[styles.rubyKanji, { color: t.text }]}>{seg.text}{isLast ? helpMark : null}</Text>
              </View>
            );
          }
          return (
            <Text key={i} style={[styles.rubyPlain, { color: t.text }]}>{seg.text}{isLast ? helpMark : null}</Text>
          );
        })}
      </View>
    );
  };

  const handleAnnotate = useCallback((index: number, type: 'translation' | 'explanation') => {
    if (!articleId) return;
    const key = `${index}:${type}`;

    // 已有缓存且不在加载中 → toggle 展示/隐藏
    if (annotations[key] && !annotations[key].loading) {
      setAnnotations(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      return;
    }

    // 已在加载中，忽略
    if (annotations[key]?.loading) return;

    // 发起 SSE 请求
    setAnnotations(prev => ({ ...prev, [key]: { text: '', loading: true } }));

    cancelRef.current?.();
    cancelRef.current = annotateNewsParagraph(articleId, index, type, (event: AnnotateSSEEvent) => {
      if (event.type === 'delta' && event.content) {
        setAnnotations(prev => ({
          ...prev,
          [key]: { text: (prev[key]?.text || '') + event.content!, loading: true },
        }));
      } else if (event.type === 'done') {
        setAnnotations(prev => ({
          ...prev,
          [key]: { ...prev[key], loading: false },
        }));
      } else if (event.type === 'error') {
        setAnnotations(prev => ({
          ...prev,
          [key]: { text: prev[key]?.text || `エラー: ${event.error}`, loading: false },
        }));
      }
    });
  }, [articleId, annotations]);

  const handleSpeak = useCallback((index: number, text: string) => {
    if (speakingIndex === index) {
      Speech.stop();
      setSpeakingIndex(null);
      return;
    }
    Speech.stop();
    setSpeakingIndex(index);
    Speech.speak(text, {
      language: 'ja-JP',
      onDone: () => setSpeakingIndex(null),
      onStopped: () => setSpeakingIndex(null),
      onError: () => setSpeakingIndex(null),
    });
  }, [speakingIndex]);

  const handleSendComment = async () => {
    if (!commentText.trim() || !articleId || sending) return;
    setSending(true);
    try {
      let content = commentText.trim();
      let parentId: string | undefined;
      // replyTarget.parentId: 对于二级评论回复，指向一级评论
      let actualParentId: string | undefined;
      if (replyTarget) {
        if (replyTarget.isReply) {
          // 回复二级评论 → parentId 指向一级评论（replyTarget.parentId）
          parentId = replyTarget.parentId;
          if (!content.startsWith(`@${replyTarget.name}`)) {
            content = `@${replyTarget.name} ${content}`;
          }
        } else {
          // 回复一级评论
          parentId = replyTarget.id;
        }
      }
      const savedReplyTarget = replyTarget;
      const result = await postNewsComment(articleId, content, parentId);
      setCommentText('');
      setMentionQuery(null);
      setReplyTarget(null);
      commentInputRef.current?.blur();
      await loadComments(articleId);

      // 触发 AI 流式回复的角色集合
      const aiCharIdsToReply = new Set<string>();

      // 1. @提及的 AI 角色
      const mentionedChars = (result.mentions || []).filter((m) => m.type === 'character');
      for (const m of mentionedChars) aiCharIdsToReply.add(m.id);

      // 2. 回复 AI 角色的一级评论时，该角色也自动回复（不晾用户）
      if (savedReplyTarget && !savedReplyTarget.isReply && savedReplyTarget.isAi && savedReplyTarget.characterId) {
        aiCharIdsToReply.add(savedReplyTarget.characterId);
      }

      for (const charId of aiCharIdsToReply) {
        const tempId = `streaming-${charId}-${Date.now()}`;
        const charInfo = mentionableCharacters.find((c) => c.id === charId);

        setStreamingReplies((prev) => ({
          ...prev,
          [tempId]: {
            parentId: result.id,
            characterName: charInfo?.name || charId,
            characterEmoji: charInfo?.emoji || '🤖',
            content: '',
            done: false,
          },
        }));

        const cancel = requestAIReply(articleId, result.id, charId, (event: AIReplySSEEvent) => {
          if (event.type === 'start' && event.character) {
            setStreamingReplies((prev) => prev[tempId] ? {
              ...prev,
              [tempId]: { ...prev[tempId], characterName: event.character!.name, characterEmoji: event.character!.avatarEmoji },
            } : prev);
            // AI 开始回复时滚动到底部
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
          } else if (event.type === 'delta' && event.content) {
            setStreamingReplies((prev) => prev[tempId] ? {
              ...prev,
              [tempId]: { ...prev[tempId], content: prev[tempId].content + event.content },
            } : prev);
          } else if (event.type === 'done') {
            setStreamingReplies((prev) => {
              const copy = { ...prev };
              delete copy[tempId];
              return copy;
            });
            // 刷新评论列表获取最终数据
            loadComments(articleId);
          } else if (event.type === 'error') {
            setStreamingReplies((prev) => {
              const copy = { ...prev };
              delete copy[tempId];
              return copy;
            });
          }
        });
        aiReplyCancelRefs.current.push(cancel);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明なエラー';
      Alert.alert('コメント送信失敗', msg);
    } finally {
      setSending(false);
    }
  };

  // 好友角色列表（可@提及）
  const mentionableCharacters = (() => {
    const friendCharIds = new Set(friends.map((f) => f.characterId));
    return characters
      .filter((c) => friendCharIds.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, emoji: c.avatarEmoji || '🤖' }));
  })();

  // 根据 mentionQuery 模糊匹配候选角色
  const filteredMentions = mentionQuery !== null
    ? mentionableCharacters.filter(c => {
        if (!mentionQuery) return true; // @ 后没输入字符时显示全部
        const q = mentionQuery.toLowerCase();
        return c.name.toLowerCase().includes(q);
      })
    : [];

  // 处理输入变化，检测 @ 触发
  const handleCommentChange = (text: string) => {
    setCommentText(text);
    // 找到光标前最近的 @ 符号
    const lastAt = text.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = text.slice(lastAt + 1);
      // @ 后面没有空格说明还在输入中
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        setMentionQuery(afterAt);
        return;
      }
    }
    setMentionQuery(null);
  };

  // 选择角色后插入 @角色名
  const handleSelectMention = (name: string) => {
    const lastAt = commentText.lastIndexOf('@');
    if (lastAt >= 0) {
      setCommentText(commentText.slice(0, lastAt) + '@' + name + ' ');
    }
    setMentionQuery(null);
    commentInputRef.current?.focus();
  };

  // 使用预览数据（从列表页传入）或真实数据
  const displayTitle = article?.title || previewTitle || '';
  const displayImageUrl = article?.imageUrl || previewImageUrl || '';
  const displayEmoji = article?.imageEmoji || previewEmoji || '📰';
  const displaySource = article?.source || previewSource || '';
  const displayTimeAgo = article?.timeAgo || previewTimeAgo || '';

  if (!loading && !article) {
    return (
      <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
        <Text style={{ color: t.text, padding: 20 }}>記事が見つかりません</Text>
      </View>
    );
  }

  // 渲染评论内容，高亮 @角色名
  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[^\s@,，。！？!?]+)/g);
    return (
      <Text style={[styles.commentText, { color: t.text }]}>
        {parts.map((part, i) =>
          part.startsWith('@') ? (
            <Text key={i} style={{ color: t.brand, fontWeight: '600' }}>{part}</Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  // 渲染流式 AI 回复（正在生成中）
  const renderStreamingReply = (tempId: string, reply: typeof streamingReplies[string]) => (
    <View key={tempId} style={[styles.commentRow, styles.replyRow]}>
      <Avatar name={reply.characterName} size={28} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentName, { color: t.brand }]}>{reply.characterName}</Text>
          <Text style={[styles.commentTime, { color: t.textSecondary }]}>入力中...</Text>
        </View>
        {reply.content ? (
          renderCommentContent(reply.content)
        ) : (
          <View style={{ flexDirection: 'row', gap: 4, paddingTop: 4 }}>
            <ActivityIndicator size={12} color={t.brand} />
            <Text style={{ color: t.textSecondary, fontSize: 13 }}>考え中...</Text>
          </View>
        )}
      </View>
    </View>
  );

  const handleReply = (comment: NewsComment, isReply: boolean, parentCommentId?: string) => {
    if (isReply) {
      // 回复二级评论 → parentId 指向一级评论
      setReplyTarget({
        id: comment.id,
        name: comment.characterName,
        isReply: true,
        parentId: parentCommentId,
        characterId: comment.characterId,
        isAi: comment.isAi,
      });
      setCommentText(`@${comment.characterName} `);
    } else {
      // 回复一级评论
      setReplyTarget({
        id: comment.id,
        name: comment.characterName,
        isReply: false,
        characterId: comment.characterId,
        isAi: comment.isAi,
      });
      setCommentText('');
    }
    commentInputRef.current?.focus();
  };

  const renderComment = (comment: NewsComment, isReply = false, parentCommentId?: string) => {
    const streamingForThis = Object.entries(streamingReplies).filter(
      ([, r]) => r.parentId === comment.id,
    );
    const isOwn = comment.characterId === user?.id;

    return (
      <View key={comment.id}>
        <View style={[styles.commentRow, isReply && styles.replyRow]}>
          <Avatar name={comment.characterName} size={isReply ? 28 : 36} />
          <View style={styles.commentBody}>
            <View style={styles.commentHeader}>
              <Text style={[styles.commentName, { color: t.text }]}>{comment.characterName}</Text>
              <Text style={[styles.commentTime, { color: t.textSecondary }]}>
                {formatCommentTime(comment.createdAt)}
              </Text>
            </View>
            {renderCommentContent(comment.content)}
            {!isOwn && (
              <TouchableOpacity onPress={() => handleReply(comment, isReply, parentCommentId || comment.id)}>
                <Text style={[styles.replyBtn, { color: t.textSecondary }]}>返信</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {comment.replies?.map((reply) => renderComment(reply, true, comment.id))}
        {streamingForThis.map(([tempId, r]) => renderStreamingReply(tempId, r))}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: t.brand }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: t.text }]}>記事</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} hitSlop={8} onPress={() => setShareVisible(true)}>
            <Ionicons name="share-outline" size={20} color={t.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scroll}
        onScrollBeginDrag={() => { if (tooltipIndex !== null) setTooltipIndex(null); }}
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Article Header */}
        <View style={styles.articleHeader}>
          {displayImageUrl ? (
            <Image source={{ uri: displayImageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: '#2C2C2C' }]}>
              <Text style={{ fontSize: 72 }}>{displayEmoji}</Text>
            </View>
          )}
          <Text style={[styles.articleTitle, { color: t.text }]}>{displayTitle}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: t.textSecondary }]}>{displaySource}</Text>
            {displaySource && displayTimeAgo ? <Text style={[styles.metaText, { color: t.textSecondary }]}>·</Text> : null}
            <Text style={[styles.metaText, { color: t.textSecondary }]}>{displayTimeAgo}</Text>
          </View>
          <View style={[styles.separator, { backgroundColor: t.border }]} />
        </View>

        {/* Skeleton while loading */}
        {loading ? (
          <View style={styles.skeletonWrap}>
            {[1, 0.9, 0.75, 1, 0.6, 0.85, 1, 0.7].map((w, i) => (
              <View key={i} style={[styles.skeletonLine, { width: `${w * 100}%` as any, backgroundColor: t.border, opacity: 0.7 }]} />
            ))}
          </View>
        ) : null}

        {/* Paragraphs — fade in after layout stabilizes */}
        <View style={{ opacity: contentReady ? 1 : 0, ...(Platform.OS === 'web' ? { transition: 'opacity 0.3s ease-in' } as any : {}) }}>
        {paragraphs.map((text, index) => {
          const transKey = `${index}:translation`;
          const explKey = `${index}:explanation`;
          const trans = annotations[transKey];
          const expl = annotations[explKey];
          const showTooltip = tooltipIndex === index;

          const dismissAnnotation = (key: string) => {
            setAnnotations(prev => {
              const copy = { ...prev };
              delete copy[key];
              return copy;
            });
          };

          return (
            <View
              key={index}
              style={[
                styles.paragraph,
                showTooltip && { backgroundColor: t.brandLight, borderRadius: 8 },
              ]}
            >
              {renderParagraph(text, index)}

              {/* Translation */}
              {trans && !trans.loading && trans.text ? (
                <TouchableOpacity
                  style={[styles.annotationBox, { backgroundColor: t.surface, borderLeftColor: t.brand }]}
                  onPress={() => dismissAnnotation(transKey)}
                  activeOpacity={0.7}
                >
                  <View style={styles.annotationHeader}>
                    <Text style={[styles.annotationLabel, { color: t.brand }]}>翻訳</Text>
                    <Ionicons name="close" size={14} color={t.textSecondary} />
                  </View>
                  <Text style={[styles.annotationText, { color: t.text }]}>{trans.text}</Text>
                </TouchableOpacity>
              ) : trans?.loading ? (
                <View style={[styles.annotationBox, { backgroundColor: t.surface, borderLeftColor: t.brand }]}>
                  <View style={styles.annotationLoading}>
                    <ActivityIndicator size="small" color={t.brand} />
                    <Text style={{ color: t.textSecondary, fontSize: 13, marginLeft: 8 }}>翻訳中...</Text>
                  </View>
                  {trans.text ? <Text style={[styles.annotationText, { color: t.text }]}>{trans.text}</Text> : null}
                </View>
              ) : null}

              {/* Explanation */}
              {expl && !expl.loading && expl.text ? (
                <TouchableOpacity
                  style={[styles.annotationBox, { backgroundColor: t.brandLight, borderLeftColor: t.brand }]}
                  onPress={() => dismissAnnotation(explKey)}
                  activeOpacity={0.7}
                >
                  <View style={styles.annotationHeader}>
                    <Text style={[styles.annotationLabel, { color: t.brand }]}>解説</Text>
                    <Ionicons name="close" size={14} color={t.textSecondary} />
                  </View>
                  <Text style={[styles.annotationText, { color: t.text }]}>{expl.text}</Text>
                </TouchableOpacity>
              ) : expl?.loading ? (
                <View style={[styles.annotationBox, { backgroundColor: t.brandLight, borderLeftColor: t.brand }]}>
                  <View style={styles.annotationLoading}>
                    <ActivityIndicator size="small" color={t.brand} />
                    <Text style={{ color: t.textSecondary, fontSize: 13, marginLeft: 8 }}>解説中...</Text>
                  </View>
                  {expl.text ? <Text style={[styles.annotationText, { color: t.text }]}>{expl.text}</Text> : null}
                </View>
              ) : null}
            </View>
          );
        })}

        {paragraphs.length === 0 && article && (
          <View style={styles.paragraph}>
            <Text style={[styles.bodyText, { color: t.text }]}>{article.summary}</Text>
          </View>
        )}
        </View>

        {/* Comments Section */}
        <View
          style={[styles.commentsSection, { borderTopColor: t.border }]}
          onLayout={(e) => { commentSectionY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={[styles.commentsTitle, { color: t.text }]}>
            コメント{comments.length > 0 ? ` (${comments.length})` : ''}
          </Text>
          {comments.map((comment) => renderComment(comment))}
          {comments.length === 0 && (
            <Text style={{ color: t.textSecondary, fontSize: 13 }}>まだコメントはありません</Text>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating tooltip */}
      {tooltipIndex !== null && (
        <View style={styles.tooltipOverlay} onTouchStart={() => setTooltipIndex(null)}>
          <View style={[
            styles.tooltip,
            { backgroundColor: t.surface, shadowColor: '#000', top: tooltipPos.y, left: tooltipPos.x },
          ]} onTouchStart={(e) => e.stopPropagation()}>
            <TouchableOpacity
              style={styles.tooltipBtn}
              onPress={() => { handleSpeak(tooltipIndex, paragraphs[tooltipIndex]); setTooltipIndex(null); }}
            >
              <Ionicons name="volume-medium-outline" size={16} color={t.brand} />
              <Text style={[styles.tooltipText, { color: t.text }]}>朗読</Text>
            </TouchableOpacity>
            <View style={[styles.tooltipDivider, { backgroundColor: t.border }]} />
            <TouchableOpacity
              style={styles.tooltipBtn}
              onPress={() => { handleAnnotate(tooltipIndex, 'translation'); setTooltipIndex(null); }}
            >
              <Ionicons name="language-outline" size={16} color={t.brand} />
              <Text style={[styles.tooltipText, { color: t.text }]}>翻訳</Text>
            </TouchableOpacity>
            <View style={[styles.tooltipDivider, { backgroundColor: t.border }]} />
            <TouchableOpacity
              style={styles.tooltipBtn}
              onPress={() => { handleAnnotate(tooltipIndex, 'explanation'); setTooltipIndex(null); }}
            >
              <Ionicons name="school-outline" size={16} color={t.brand} />
              <Text style={[styles.tooltipText, { color: t.text }]}>解説</Text>
            </TouchableOpacity>
            {/* 三角箭头 */}
            <View style={[styles.tooltipArrow, { borderTopColor: t.surface, left: tooltipPos.arrowLeft - 6 }]} />
          </View>
        </View>
      )}

      {/* @Mention picker */}
      {mentionQuery !== null && filteredMentions.length > 0 && (
        <View style={[styles.mentionPicker, { backgroundColor: t.surface, borderColor: t.border, bottom: 56 + Math.max(insets.bottom, 4) }]}>
          {filteredMentions.map((char) => (
            <TouchableOpacity
              key={char.id}
              style={styles.mentionItem}
              onPress={() => handleSelectMention(char.name)}
            >
              <Text style={styles.mentionEmoji}>{char.emoji}</Text>
              <Text style={[styles.mentionName, { color: t.text }]}>{char.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Fixed bottom: reply indicator + input bar */}
      <View style={[styles.bottomContainer, { backgroundColor: t.surface, borderTopColor: t.border, paddingBottom: Math.max(insets.bottom, 4) }]}>
        {/* Reply indicator */}
        {replyTarget && (
          <View style={[styles.replyIndicator, { borderBottomColor: t.border }]}>
            <Text style={{ color: t.textSecondary, fontSize: 13, flex: 1 }}>
              {replyTarget.name} に返信
            </Text>
            <TouchableOpacity onPress={() => { setReplyTarget(null); setCommentText(''); }}>
              <Ionicons name="close" size={18} color={t.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomScrollBtn, { borderColor: t.border }]}
          onPress={() => scrollViewRef.current?.scrollTo({ y: commentSectionY.current - 60, animated: true })}
        >
          <Ionicons name="chatbubble-outline" size={18} color={t.brand} />
        </TouchableOpacity>
        <View style={[styles.bottomInput, { backgroundColor: t.inputBg }]}>
          <TextInput
            ref={commentInputRef}
            style={[styles.bottomField, { color: t.text }]}
            placeholder="コメントを書く..."
            placeholderTextColor={t.textSecondary}
            value={commentText}
            onChangeText={handleCommentChange}
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
            blurOnSubmit={false}
            onFocus={() => {
              // 滚动到评论区末尾，让用户看到即将发表的位置
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
        </View>
        <TouchableOpacity
          style={[styles.bottomSend, { backgroundColor: commentText.trim() && !sending ? t.brand : t.inputBg }]}
          onPress={handleSendComment}
          disabled={!commentText.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size={12} color={t.textSecondary} />
            : <Ionicons name="arrow-up" size={16} color={commentText.trim() ? '#FFFFFF' : t.textSecondary} />
          }
        </TouchableOpacity>
        </View>
      </View>

      <ShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        onShare={() => setShareVisible(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingBottom: 40,
  },
  articleHeader: {
    padding: 16,
    gap: 12,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  separator: {
    height: 1,
    marginTop: 4,
  },
  paragraph: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 6,
  },
  helpInline: {
    fontSize: 15,
    lineHeight: 28,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 28,
  },
  rubyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  rubyUnit: {
    alignItems: 'center',
  },
  rubyReading: {
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 12,
  },
  rubyKanji: {
    fontSize: 16,
    lineHeight: 28,
  },
  rubyPlain: {
    fontSize: 16,
    lineHeight: 28,
  },
  tooltipOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  tooltip: {
    position: 'absolute',
    flexDirection: 'row',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tooltipBtn: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 3,
    gap: 1,
  },
  tooltipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  tooltipDivider: {
    width: 1,
    marginVertical: 2,
  },
  annotationBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  annotationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  annotationLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  annotationText: {
    fontSize: 14,
    lineHeight: 22,
  },
  annotationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentsSection: {
    marginTop: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    gap: 16,
  },
  commentsTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  replyRow: {
    marginLeft: 46,
    marginTop: 8,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 11,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  bottomScrollBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bottomField: {
    flex: 1,
    fontSize: 14,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  bottomSend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionPicker: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 -2px 12px rgba(0,0,0,0.1)' } as any,
    }),
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  mentionEmoji: {
    fontSize: 20,
  },
  mentionName: {
    fontSize: 14,
    fontWeight: '500',
  },
  replyBtn: {
    fontSize: 12,
    marginTop: 4,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  skeletonWrap: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
  },
});
