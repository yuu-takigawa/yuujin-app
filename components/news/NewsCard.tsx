import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, radii } from '../../constants/theme';
import type { NewsArticle } from '../../services/api';

interface NewsCardProps {
  article: NewsArticle;
  onPress?: () => void;
  onShare?: () => void;
}

export default function NewsCard({ article, onPress, onShare }: NewsCardProps) {
  const t = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { borderBottomColor: t.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Hero image area */}
      <View style={[styles.heroImage, { backgroundColor: '#2C2C2C' }]}>
        <Text style={styles.heroEmoji}>{article.imageEmoji}</Text>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
        {article.title}
      </Text>

      {/* Summary */}
      <Text style={[styles.summary, { color: t.textSecondary }]} numberOfLines={3}>
        {article.summary}
      </Text>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
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
