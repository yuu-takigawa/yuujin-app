import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
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

const CATEGORIES = [
  { key: '', label: 'すべて' },
  { key: 'ai', label: 'AI・IT' },
  { key: 'music', label: '音楽' },
  { key: 'comic', label: '漫画' },
  { key: 'tech', label: 'テクノロジー' },
  { key: 'lifestyle', label: '暮らし' },
];

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const router = useRouter();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState('');
  const [shareVisible, setShareVisible] = useState(false);
  const [shareArticle, setShareArticle] = useState<NewsArticle | null>(null);
  const loadingMoreRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const prevCategoryRef = useRef(category);
  const hasFetchedRef = useRef(false);

  const loadArticles = useCallback(async (offset = 0, replace = false, cat?: string) => {
    try {
      const res = await getNewsArticles({
        limit: PAGE_SIZE,
        offset,
        category: cat !== undefined ? cat : category || undefined,
      });
      setArticles(prev => replace ? res.articles : [...prev, ...res.articles]);
      setHasMore(res.hasMore);
    } catch { /* ignore */ }
  }, [category]);

  useEffect(() => {
    const categoryChanged = prevCategoryRef.current !== category;
    prevCategoryRef.current = category;

    // 返回时已有数据且分类没变，跳过重新加载
    if (hasFetchedRef.current && !categoryChanged) return;

    if (categoryChanged) {
      setArticles([]);
    }
    setLoading(true);
    loadArticles(0, true, category || undefined).finally(() => {
      setLoading(false);
      hasFetchedRef.current = true;
    });
  }, [category]);

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

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    // 回到顶部按钮：滚动超过 800px 显示
    setShowScrollTop(contentOffset.y > 800);
    // Web: onScroll 触发无限滚动
    if (Platform.OS === 'web') {
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom < 300) {
        handleLoadMore();
      }
    }
  }, [handleLoadMore]);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleShare = (article: NewsArticle) => {
    setShareArticle(article);
    setShareVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: t.brand }]}>ニュース</Text>
        {showScrollTop ? (
          <Text style={[styles.scrollTopBtn, { color: t.brand }]} onPress={scrollToTop}>↑</Text>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        style={styles.tabScroll}
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.tabChip,
                { backgroundColor: active ? t.brand : t.surface, borderColor: active ? t.brand : t.border },
              ]}
              onPress={() => setCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: active ? '#FFFFFF' : t.textSecondary }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Articles */}
      {loading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.skeletonCard, { borderBottomColor: t.border }]}>
              <View style={[styles.skeletonImage, { backgroundColor: t.border }]} />
              <View style={[styles.skeletonLine, { width: '85%', height: 16, backgroundColor: t.border }]} />
              <View style={[styles.skeletonLine, { width: '100%', height: 12, backgroundColor: t.border }]} />
              <View style={[styles.skeletonLine, { width: '60%', height: 12, backgroundColor: t.border }]} />
              <View style={styles.skeletonMeta}>
                <View style={[styles.skeletonLine, { width: 48, height: 10, backgroundColor: t.border }]} />
                <View style={[styles.skeletonLine, { width: 60, height: 10, backgroundColor: t.border }]} />
              </View>
            </View>
          ))}
        </View>
      ) : articles.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: t.textSecondary }]}>
            ニュースはまだありません
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={articles}
          keyExtractor={(item: NewsArticle) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <NewsCard
              article={item}
              onPress={() => router.push({ pathname: `/article/${item.id}`, params: { title: item.title, imageUrl: item.imageUrl || '', imageEmoji: item.imageEmoji, source: item.source, timeAgo: item.timeAgo } })}
              onShare={() => handleShare(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.brand} colors={[t.brand]} />
          }
          onEndReached={Platform.OS !== 'web' ? handleLoadMore : undefined}
          onEndReachedThreshold={0.3}
          onScroll={handleScroll}
          scrollEventThrottle={200}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  scrollTopBtn: {
    fontSize: 28,
    fontWeight: '300',
  },
  tabScroll: {
    flexGrow: 0,
    flexShrink: 0,
    paddingTop: 4,
    paddingBottom: 12,
  },
  tabRow: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
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
  skeletonList: {
    flex: 1,
  },
  skeletonCard: {
    padding: spacing.md,
    gap: 12,
    borderBottomWidth: 1,
  },
  skeletonImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    opacity: 0.7,
  },
  skeletonLine: {
    borderRadius: 6,
    opacity: 0.6,
  },
  skeletonMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
});
