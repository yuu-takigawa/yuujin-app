import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { getNewsArticles } from '../../services/api';
import type { NewsArticle } from '../../services/api';
import HalfScreenModal from '../common/HalfScreenModal';

interface NewsPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectNews: (article: NewsArticle) => void;
}

export default function NewsPickerModal({ visible, onClose, onSelectNews }: NewsPickerModalProps) {
  const t = useTheme();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (visible && articles.length === 0) {
      setLoading(true);
      getNewsArticles({ limit: 20, offset: 0 })
        .then(res => {
          setArticles(res.articles);
          setHasMore(res.hasMore);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    getNewsArticles({ limit: 20, offset: articles.length })
      .then(res => {
        setArticles(prev => [...prev, ...res.articles]);
        setHasMore(res.hasMore);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const handleSelect = (article: NewsArticle) => {
    onSelectNews(article);
    onClose();
  };

  return (
    <HalfScreenModal visible={visible} onClose={onClose} height={520}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>ニュースを選ぶ</Text>
      </View>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={t.brand} />
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: t.border }]} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => handleSelect(item)}
              activeOpacity={0.6}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: t.inputBg }]}>
                  <Text style={styles.thumbEmoji}>{item.imageEmoji || '📰'}</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={[styles.itemTitle, { color: t.text }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.meta, { color: t.textSecondary }]}>{item.source} · {item.timeAgo}</Text>
              </View>
            </TouchableOpacity>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={t.brand} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>
              ニュースはまだありません
            </Text>
          }
        />
      )}
    </HalfScreenModal>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  meta: {
    fontSize: 11,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 40,
  },
});
