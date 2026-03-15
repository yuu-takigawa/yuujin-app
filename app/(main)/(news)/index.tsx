import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, fontSize } from '../../../constants/theme';
import NewsCard from '../../../components/news/NewsCard';
import ShareModal from '../../../components/common/ShareModal';
import { getNewsArticles } from '../../../services/api';
import type { NewsArticle } from '../../../services/api';

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const router = useRouter();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareVisible, setShareVisible] = useState(false);
  const [shareArticle, setShareArticle] = useState<NewsArticle | null>(null);

  useEffect(() => {
    getNewsArticles()
      .then(setArticles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleShare = (article: NewsArticle) => {
    setShareArticle(article);
    setShareVisible(true);
  };

  const handleShareSend = (conversationId: string) => {
    setShareVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <Text style={[styles.title, { color: t.text }]}>ニュース</Text>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={t.brand} />
        </View>
      ) : articles.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: t.textSecondary }]}>
            ニュースはまだありません
          </Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item: NewsArticle) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <NewsCard
              article={item}
              onPress={() => router.push(`/article/${item.id}`)}
              onShare={() => handleShare(item)}
            />
          )}
        />
      )}
      <ShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        onShare={handleShareSend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.body,
  },
});
