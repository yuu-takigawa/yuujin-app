import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
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
  const loadingMoreRef = useRef(false);

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
    if (refreshing) return;
    setRefreshing(true);
    await loadArticles(0, true);
    setRefreshing(false);
  }, [loadArticles, refreshing]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    await loadArticles(articles.length);
    setLoadingMore(false);
    loadingMoreRef.current = false;
  }, [hasMore, articles.length, loadArticles]);

  // Web: 使用 onScroll 检测滚动到底部触发加载更多
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Platform.OS !== 'web') return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < 300) {
      handleLoadMore();
    }
  }, [handleLoadMore]);

  const handleShare = (article: NewsArticle) => {
    setShareArticle(article);
    setShareVisible(true);
  };

  const handleShareSend = (conversationId: string) => {
    setShareVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: t.text }]}>ニュース</Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: t.inputBg }]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={t.brand} />
          ) : (
            <Text style={[styles.refreshIcon, { color: t.brand }]}>↻</Text>
          )}
        </TouchableOpacity>
      </View>
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
          onEndReached={Platform.OS !== 'web' ? handleLoadMore : undefined}
          onEndReachedThreshold={0.3}
          onScroll={Platform.OS === 'web' ? handleScroll : undefined}
          scrollEventThrottle={Platform.OS === 'web' ? 200 : undefined}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerWrap}>
                <ActivityIndicator size="small" color={t.brand} />
              </View>
            ) : !hasMore && articles.length > 0 ? (
              <View style={styles.footerWrap}>
                <Text style={[styles.footerText, { color: t.textSecondary }]}>
                  すべてのニュースを読みました
                </Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 22,
    fontWeight: '700',
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
  footerText: {
    fontSize: 13,
  },
});
