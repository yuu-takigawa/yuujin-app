import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
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

  useEffect(() => {
    if (visible && articles.length === 0) {
      setLoading(true);
      getNewsArticles()
        .then(res => setArticles(res.articles))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible]);

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
          renderItem={({ item }) => (
            <View style={[styles.item, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={[styles.thumb, { backgroundColor: t.inputBg }]}>
                <Text style={styles.thumbEmoji}>{item.imageEmoji}</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.itemTitle, { color: t.text }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.meta, { color: t.textSecondary }]}>{item.source} · {item.timeAgo}</Text>
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: t.brand }]}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.sendText}>送信</Text>
              </TouchableOpacity>
            </View>
          )}
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
    padding: 16,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 11,
  },
  sendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 40,
  },
});
