import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, TextInput, StyleSheet, Platform, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '../../hooks/useTheme';
import ShareModal from '../../components/common/ShareModal';
import Avatar from '../../components/common/Avatar';
import { getNewsDetail, getNewsComments, postNewsComment, annotateNewsParagraph } from '../../services/api';
import type { NewsArticleDetail, NewsComment, AnnotateSSEEvent } from '../../services/api';

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
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const [shareVisible, setShareVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [article, setArticle] = useState<NewsArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [sending, setSending] = useState(false);
  const [annotations, setAnnotations] = useState<AnnotationCache>({});
  const [rubyCache, setRubyCache] = useState<RubyCache>({});
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [selectableIndex, setSelectableIndex] = useState<number | null>(null);
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

  useEffect(() => {
    if (!articleId) return;
    setLoading(true);
    getNewsDetail(articleId).then((detail) => {
      setArticle(detail);
      setLoading(false);
    }).catch(() => setLoading(false));
    loadComments(articleId);
    return () => {
      cancelRef.current?.();
      Speech.stop();
    };
  }, [articleId]);

  const paragraphs = article?.content?.split('\n').filter(p => p.trim().length > 0) || [];

  // 振り仮名: 文章入库时预计算（子进程 kuromoji），存在 article.furigana 中
  useEffect(() => {
    if (article?.furigana) {
      setRubyCache(article.furigana as unknown as RubyCache);
    }
  }, [article]);

  // Ruby 文本渲染
  const renderRubyText = (text: string, index: number) => {
    const ruby = rubyCache[index];
    const isSelectable = selectableIndex === index;

    if (!ruby || ruby.length === 0) {
      return <Text selectable={isSelectable} style={[styles.bodyText, { color: t.text }]}>{text}</Text>;
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
        {segments.map((seg, i) => (
          seg.reading ? (
            <View key={i} style={styles.rubyUnit}>
              <Text selectable={isSelectable} style={[styles.rubyReading, { color: t.brand }]}>{seg.reading}</Text>
              <Text selectable={isSelectable} style={[styles.rubyKanji, { color: t.text }]}>{seg.text}</Text>
            </View>
          ) : (
            <Text key={i} selectable={isSelectable} style={[styles.rubyPlain, { color: t.text }]}>{seg.text}</Text>
          )
        ))}
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
      await postNewsComment(articleId, commentText.trim());
      setCommentText('');
      commentInputRef.current?.blur();
      await loadComments(articleId);
    } catch { /* silent */ } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={t.brand} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
        <Text style={{ color: t.text, padding: 20 }}>記事が見つかりません</Text>
      </View>
    );
  }

  const renderComment = (comment: NewsComment, isReply = false) => (
    <View key={comment.id}>
      <View style={[styles.commentRow, isReply && styles.replyRow]}>
        <Avatar emoji={comment.characterEmoji} size={isReply ? 28 : 36} />
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <Text style={[styles.commentName, { color: t.text }]}>{comment.characterName}</Text>
            <Text style={[styles.commentTime, { color: t.textSecondary }]}>
              {formatCommentTime(comment.createdAt)}
            </Text>
          </View>
          <Text style={[styles.commentText, { color: t.text }]}>{comment.content}</Text>
        </View>
      </View>
      {comment.replies?.map((reply) => renderComment(reply, true))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
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

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scroll}>
        {/* Article Header */}
        <View style={styles.articleHeader}>
          {article.imageUrl ? (
            <Image source={{ uri: article.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: '#2C2C2C' }]}>
              <Text style={{ fontSize: 72 }}>{article.imageEmoji}</Text>
            </View>
          )}
          <Text style={[styles.articleTitle, { color: t.text }]}>{article.title}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: t.textSecondary }]}>{article.source}</Text>
            <Text style={[styles.metaText, { color: t.textSecondary }]}>·</Text>
            <Text style={[styles.metaText, { color: t.textSecondary }]}>{article.timeAgo}</Text>
          </View>
          <View style={[styles.separator, { backgroundColor: t.border }]} />
        </View>

        {/* Paragraphs */}
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
            <Pressable
              key={index}
              style={[
                styles.paragraph,
                (showTooltip || selectableIndex === index) && { backgroundColor: t.brandLight, borderRadius: 8 },
              ]}
              onLongPress={() => { setSelectableIndex(null); setTooltipIndex(showTooltip ? null : index); }}
              onPress={() => {
                if (tooltipIndex !== null) setTooltipIndex(null);
                if (selectableIndex !== null && selectableIndex !== index) setSelectableIndex(null);
              }}
              delayLongPress={300}
            >
              {/* Tooltip 浮动气泡 */}
              {showTooltip && (
                <View style={styles.tooltipAnchor}>
                  <View style={[styles.tooltip, { backgroundColor: t.surface, shadowColor: '#000' }]}>
                    <TouchableOpacity
                      style={styles.tooltipBtn}
                      onPress={() => { handleSpeak(index, text); setTooltipIndex(null); }}
                    >
                      <Ionicons name="volume-medium-outline" size={18} color={t.brand} />
                      <Text style={[styles.tooltipText, { color: t.text }]}>朗読</Text>
                    </TouchableOpacity>
                    <View style={[styles.tooltipDivider, { backgroundColor: t.border }]} />
                    <TouchableOpacity
                      style={styles.tooltipBtn}
                      onPress={() => { handleAnnotate(index, 'translation'); setTooltipIndex(null); }}
                    >
                      <Ionicons name="language-outline" size={18} color={t.brand} />
                      <Text style={[styles.tooltipText, { color: t.text }]}>翻訳</Text>
                    </TouchableOpacity>
                    <View style={[styles.tooltipDivider, { backgroundColor: t.border }]} />
                    <TouchableOpacity
                      style={styles.tooltipBtn}
                      onPress={() => { handleAnnotate(index, 'explanation'); setTooltipIndex(null); }}
                    >
                      <Ionicons name="school-outline" size={18} color={t.brand} />
                      <Text style={[styles.tooltipText, { color: t.text }]}>解説</Text>
                    </TouchableOpacity>
                    <View style={[styles.tooltipDivider, { backgroundColor: t.border }]} />
                    <TouchableOpacity
                      style={styles.tooltipBtn}
                      onPress={() => { setTooltipIndex(null); setSelectableIndex(index); }}
                    >
                      <Ionicons name="text-outline" size={18} color={t.brand} />
                      <Text style={[styles.tooltipText, { color: t.text }]}>選択</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {renderRubyText(text, index)}

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
            </Pressable>
          );
        })}

        {paragraphs.length === 0 && (
          <View style={styles.paragraph}>
            <Text style={[styles.bodyText, { color: t.text }]}>{article.summary}</Text>
          </View>
        )}

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
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Fixed bottom input bar */}
      <View style={[styles.bottomBar, { backgroundColor: t.surface, borderTopColor: t.border }]}>
        <TouchableOpacity
          style={styles.bottomScrollBtn}
          onPress={() => scrollViewRef.current?.scrollTo({ y: commentSectionY.current - 60, animated: true })}
        >
          <Ionicons name="chatbubble-outline" size={20} color={t.brand} />
        </TouchableOpacity>
        <View style={[styles.bottomInput, { backgroundColor: t.inputBg }]}>
          <TextInput
            ref={commentInputRef}
            style={[styles.bottomField, { color: t.text }]}
            placeholder="コメントを書く..."
            placeholderTextColor={t.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
            blurOnSubmit={false}
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

      <ShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        onShare={() => setShareVisible(false)}
      />
    </View>
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
  tooltipAnchor: {
    position: 'absolute',
    top: -48,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  tooltip: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  tooltipBtn: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 2,
  },
  tooltipText: {
    fontSize: 11,
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 16,
    gap: 8,
    borderTopWidth: 1,
  },
  bottomScrollBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
});
