import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { radii } from '../../constants/theme';
import ShareModal from '../../components/common/ShareModal';
import Avatar from '../../components/common/Avatar';
import { getNewsDetail } from '../../services/api';
import type { NewsArticleDetail, NewsParagraph, NewsComment } from '../../services/api';

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

export default function NewsDetailScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const [shareVisible, setShareVisible] = useState(false);
  const [expandedTranslation, setExpandedTranslation] = useState<Set<string>>(new Set());
  const [expandedExplanation, setExpandedExplanation] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState('');
  const [article, setArticle] = useState<NewsArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!articleId) return;
    setLoading(true);
    getNewsDetail(articleId).then((detail) => {
      setArticle(detail);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [articleId]);

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

  const toggleTranslation = (id: string) => {
    setExpandedTranslation((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExplanation = (id: string) => {
    setExpandedExplanation((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderRubyText = (paragraph: NewsParagraph) => {
    if (paragraph.ruby.length === 0) {
      return <Text style={[styles.bodyText, { color: t.text }]}>{paragraph.text}</Text>;
    }

    // Build segments: split text around kanji that have ruby annotations
    const segments: { text: string; reading?: string }[] = [];
    let remaining = paragraph.text;

    for (const [kanji, reading] of paragraph.ruby) {
      const idx = remaining.indexOf(kanji);
      if (idx === -1) continue;
      if (idx > 0) {
        segments.push({ text: remaining.substring(0, idx) });
      }
      segments.push({ text: kanji, reading });
      remaining = remaining.substring(idx + kanji.length);
    }
    if (remaining) {
      segments.push({ text: remaining });
    }

    return (
      <View style={styles.rubyContainer}>
        {segments.map((seg, i) => (
          seg.reading ? (
            <View key={i} style={styles.rubyUnit}>
              <Text style={[styles.rubyReading, { color: t.brand }]}>{seg.reading}</Text>
              <Text style={[styles.rubyKanji, { color: t.text }]}>{seg.text}</Text>
            </View>
          ) : (
            <Text key={i} style={[styles.rubyPlain, { color: t.text }]}>{seg.text}</Text>
          )
        ))}
      </View>
    );
  };

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
          <TouchableOpacity>
            <Text style={[styles.replyButton, { color: t.textSecondary }]}>返信</Text>
          </TouchableOpacity>
        </View>
      </View>
      {comment.replies?.map((reply) => renderComment(reply, true))}
    </View>
  );

  const paragraphs = article.paragraphs || [];
  const comments = article.comments || [];

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
          <TouchableOpacity style={styles.headerIconBtn} hitSlop={8}>
            <Ionicons name="volume-medium-outline" size={22} color={t.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} hitSlop={8} onPress={() => setShareVisible(true)}>
            <Ionicons name="share-outline" size={20} color={t.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Article Header */}
        <View style={styles.articleHeader}>
          <View style={[styles.heroImage, { backgroundColor: '#2C2C2C' }]}>
            <Text style={{ fontSize: 72 }}>{article.imageEmoji}</Text>
          </View>
          <Text style={[styles.articleTitle, { color: t.text }]}>{article.title}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: t.textSecondary }]}>{article.source}</Text>
            <Text style={[styles.metaText, { color: t.textSecondary }]}>·</Text>
            <Text style={[styles.metaText, { color: t.textSecondary }]}>{article.timeAgo}</Text>
          </View>
          <View style={[styles.separator, { backgroundColor: t.border }]} />
        </View>

        {/* Paragraphs */}
        {paragraphs.map((para) => (
          <View key={para.id} style={styles.paragraph}>
            {renderRubyText(para)}

            <View style={styles.paraActions}>
              <TouchableOpacity
                style={[styles.paraBtn, { borderColor: t.border, backgroundColor: expandedTranslation.has(para.id) ? t.brandLight : t.surface }]}
                onPress={() => toggleTranslation(para.id)}
              >
                <Text style={[styles.paraBtnText, { color: expandedTranslation.has(para.id) ? t.brand : t.textSecondary }]}>翻訳</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paraBtn, { borderColor: t.border, backgroundColor: expandedExplanation.has(para.id) ? t.brandLight : t.surface }]}
                onPress={() => toggleExplanation(para.id)}
              >
                <Text style={[styles.paraBtnText, { color: expandedExplanation.has(para.id) ? t.brand : t.textSecondary }]}>解説</Text>
              </TouchableOpacity>
            </View>

            {expandedTranslation.has(para.id) && (
              <View style={[styles.expandedBox, { backgroundColor: t.surface, borderColor: t.border }]}>
                <Text style={[styles.expandedText, { color: t.text }]}>{para.translation}</Text>
              </View>
            )}

            {expandedExplanation.has(para.id) && (
              <View style={[styles.expandedBox, { backgroundColor: t.brandLight, borderColor: t.brand + '30' }]}>
                <Text style={[styles.expandedText, { color: t.text }]}>{para.explanation}</Text>
              </View>
            )}
          </View>
        ))}

        {paragraphs.length === 0 && (
          <View style={styles.paragraph}>
            <Text style={[styles.bodyText, { color: t.text }]}>{article.summary}</Text>
          </View>
        )}

        {/* Comments Section */}
        <View style={[styles.commentsSection, { borderTopColor: t.border }]}>
          <Text style={[styles.commentsTitle, { color: t.text }]}>コメント</Text>

          {comments.map((comment) => renderComment(comment))}

          <View style={[styles.commentInput, { backgroundColor: t.surface, borderColor: t.border }]}>
            <TextInput
              style={[styles.commentField, { color: t.text }]}
              placeholder="コメントを書く..."
              placeholderTextColor={t.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity
              style={[styles.commentSend, { backgroundColor: commentText.trim() ? t.brand : t.inputBg }]}
              disabled={!commentText.trim()}
            >
              <Ionicons name="arrow-up" size={16} color={commentText.trim() ? '#FFFFFF' : t.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
    width: 68,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    paddingVertical: 8,
    gap: 8,
  },
  // Inline ruby styles
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
  bodyText: {
    fontSize: 16,
    lineHeight: 28,
  },
  paraActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  paraBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  paraBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expandedBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  expandedText: {
    fontSize: 14,
    lineHeight: 22,
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
  replyButton: {
    fontSize: 12,
    marginTop: 2,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  commentField: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  commentSend: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
