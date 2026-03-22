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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { useLocale } from '../../../hooks/useLocale';
import { spacing, fontSize } from '../../../constants/theme';
import NewsCard from '../../../components/news/NewsCard';
import ShareModal from '../../../components/common/ShareModal';
import { getNewsArticles } from '../../../services/api';
import type { NewsArticle } from '../../../services/api';

const PAGE_SIZE = 20;

const CATEGORY_KEYS = [
  { key: '', i18nKey: 'news.all' },
  { key: 'ai', i18nKey: 'news.aiIt' },
  { key: 'music', i18nKey: 'news.music' },
  { key: 'comic', i18nKey: 'news.comic' },
  { key: 'tech', i18nKey: 'news.technology' },
  { key: 'lifestyle', i18nKey: 'news.lifestyle' },
];

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { t: i } = useLocale();
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
  // Web 下拉刷新
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef(0);
  const isPulling = useRef(false);
  const listContainerRef = useRef<View>(null);
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

  // Web: 原生 touch 事件实现下拉刷新
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = listContainerRef.current as unknown as HTMLElement;
    if (!el?.addEventListener) return;

    const getScrollTop = () => {
      // FlatList 内部的滚动容器
      const scrollEl = el.querySelector('[data-testid]') || el.firstElementChild?.firstElementChild;
      return (scrollEl as HTMLElement)?.scrollTop ?? 0;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (getScrollTop() <= 0 && !refreshing) {
        pullStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      const dy = e.touches[0].clientY - pullStartY.current;
      if (dy > 0 && getScrollTop() <= 0) {
        e.preventDefault();
        setPullDistance(Math.min(dy * 0.4, 80)); // 阻尼
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!isPulling.current) return;
      const dist = pullDistance;
      isPulling.current = false;
      setPullDistance(0);
      if (dist > 50) {
        handleRefresh();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [refreshing, pullDistance, handleRefresh]);

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
      if (distanceFromBottom < 800) {
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
        <Text style={[styles.headerTitle, { color: t.brand }]}>{i('news.title')}</Text>
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
        {CATEGORY_KEYS.map((cat) => {
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
                {i(cat.i18nKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 下拉刷新指示器 (Web) */}
      {Platform.OS === 'web' && (pullDistance > 0 || refreshing) && (
        <View style={{ alignItems: 'center', paddingVertical: 8, height: refreshing ? 40 : pullDistance }}>
          <ActivityIndicator size="small" color={t.brand} />
          {!refreshing && pullDistance > 50 && (
            <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 2 }}>離して更新</Text>
          )}
        </View>
      )}

      {/* Articles */}
      <View ref={listContainerRef} style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={loading ? [] : articles}
          keyExtractor={(item: NewsArticle) => item.id}
          contentContainerStyle={[styles.list, (loading || articles.length === 0) && { flex: 1 }]}
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
          ListEmptyComponent={
            loading ? (
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
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: t.textSecondary }]}>
                  {i('news.empty')}
                </Text>
              </View>
            )
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
                  {i('news.allRead')}
                </Text>
              </View>
            ) : null
          }
        />
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
