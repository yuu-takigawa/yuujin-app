import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, radii } from '../../constants/theme';
import type { NewsArticle } from '../../services/api';

const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI・IT',
  music: '音楽',
  comic: '漫画',
  tech: 'テクノロジー',
  lifestyle: '暮らし',
};

interface NewsCardProps {
  article: NewsArticle;
  onPress?: () => void;
  onShare?: () => void;
}

export default function NewsCard({ article, onPress, onShare }: NewsCardProps) {
  const t = useTheme();
  const categoryLabel = article.category ? CATEGORY_LABELS[article.category] : null;

  return (
    <TouchableOpacity
      style={[styles.card, { borderBottomColor: t.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {article.imageUrl ? (
        <Animated.Image
          source={{ uri: article.imageUrl }}
          style={styles.heroImage}
          resizeMode="cover"
          sharedTransitionTag={`news-image-${article.id}`}
        />
      ) : (
        <Animated.View
          style={[styles.heroImage, { backgroundColor: '#2C2C2C' }]}
          sharedTransitionTag={`news-image-${article.id}`}
        >
          <Text style={styles.heroEmoji}>{article.imageEmoji}</Text>
        </Animated.View>
      )}

      <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
        {article.title}
      </Text>

      <Text style={[styles.summary, { color: t.textSecondary }]} numberOfLines={3}>
        {article.summary}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          {categoryLabel && (
            <View style={[styles.categoryBadge, { backgroundColor: t.brandLight }]}>
              <Text style={[styles.categoryText, { color: t.brand }]}>{categoryLabel}</Text>
            </View>
          )}
          <Text style={[styles.source, { color: t.textSecondary }]}>{article.source}</Text>
          <Text style={[styles.dot, { color: t.textSecondary }]}>·</Text>
          <Text style={[styles.time, { color: t.textSecondary }]}>{article.timeAgo}</Text>
        </View>
        {onShare && (
          <TouchableOpacity onPress={onShare} hitSlop={8}>
            <Ionicons name="share-outline" size={16} color={t.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: 12,
    borderBottomWidth: 1,
  },
  heroImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  summary: {
    fontSize: 13,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  source: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    fontSize: 12,
  },
  time: {
    fontSize: 12,
  },
});
