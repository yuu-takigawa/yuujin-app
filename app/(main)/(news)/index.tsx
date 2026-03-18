import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, fontSize } from '../../../constants/theme';
import NewsCard from '../../../components/news/NewsCard';
import ShareModal from '../../../components/common/ShareModal';
import { getNewsArticles } from '../../../services/api';
import type { NewsArticle } from '../../../services/api';

const PAGE_SIZE = 20;

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const router = useRouter();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [shareVisible, setShareVisible] = useState(false);
  const [shareArticle, setShareArticle] = useState<NewsArticle | null>(null);

  const loadArticles = useCallback(async (offset = 0, replace = false) => {
    try {
      const res = await getNewsArticles({ limit: PAGE_SIZE, offset });
      setArticles(prev => replace ? res.articles : [...prev, ...res.articles]);
      setHasMore(res.hasMore);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadArticles(0, true).finally(() => setLoading(false));
  }, [loadArticles]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadArticles(0, true);
    setRefreshing(false);
  }, [loadArticles]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadArticles(articles.length);
    setLoadingMore(false);
  }, [loadingMore, hasMore, articles.length, loadArticles]);

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={t.brand}
              colors={[t.brand]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerWrap}>
                <ActivityIndicator size="small" color={t.brand} />
              </View>
            ) : null
          }
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
  footerWrap: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
