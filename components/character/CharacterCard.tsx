import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Avatar from '../common/Avatar';
import { useTheme } from '../../hooks/useTheme';
import { radii } from '../../constants/theme';

interface CharacterCardProps {
  name: string;
  avatarEmoji: string;
  occupation: string;
  personality: string[];
  location: string;
  age: number;
  gender: string;
  bio?: string;
  isPreset: boolean;
  isFriend: boolean;
  onPress: () => void;
  onChat?: () => void;
}

export default function CharacterCard({
  name,
  avatarEmoji,
  occupation,
  personality,
  location,
  age,
  bio,
  isPreset,
  onPress,
  onChat,
}: CharacterCardProps) {
  const t = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: t.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      <Avatar emoji={avatarEmoji} size={90} />

      {/* Type badge */}
      <View style={[styles.typeBadge, { borderColor: t.border, backgroundColor: t.surface }]}>
        <Text style={[styles.typeBadgeText, { color: t.textSecondary }]}>{isPreset ? '公式' : 'カスタム'}</Text>
      </View>

      {/* Name + age row */}
      <View style={styles.nameRow}>
        <Text style={[styles.name, { color: t.text }]}>{name}</Text>
        <Text style={[styles.age, { color: t.textSecondary }]}>{age}歳</Text>
      </View>

      {/* Info line */}
      <Text style={[styles.infoLine, { color: t.textSecondary }]}>
        {occupation} · {location}
      </Text>

      {/* Personality tags */}
      <View style={styles.tags}>
        {personality.slice(0, 3).map((tag, i) => (
          <View key={i} style={[styles.tag, { backgroundColor: t.brandLight }]}>
            <Text style={[styles.tagText, { color: t.brand }]}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Bio */}
      {bio ? (
        <Text style={[styles.bio, { color: t.textSecondary }]} numberOfLines={3}>
          {bio}
        </Text>
      ) : null}

      <View style={{ flex: 1 }} />

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: t.brand }]}
        onPress={onChat || onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.ctaButtonText}>チャットを始める</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export function AddCharacterCard({ onPress }: { onPress: () => void }) {
  const t = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, styles.addCard, { backgroundColor: t.surface, borderColor: t.border, borderWidth: 2, borderStyle: 'dashed' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.addIconCircle, { backgroundColor: t.brandLight }]}>
        <Text style={[styles.addIconText, { color: t.brand }]}>+</Text>
      </View>
      <Text style={[styles.addTitle, { color: t.text }]}>新しいキャラクター</Text>
      <Text style={[styles.addSub, { color: t.textSecondary }]}>オリジナルの友達を作ろう</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    height: 480,
    borderRadius: 20,
    padding: 24,
    paddingTop: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    marginTop: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  age: {
    fontSize: 12,
  },
  infoLine: {
    fontSize: 12,
    marginTop: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bio: {
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  ctaButton: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addCard: {
    justifyContent: 'center',
    gap: 12,
  },
  addIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconText: {
    fontSize: 32,
    fontWeight: '300',
  },
  addTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addSub: {
    fontSize: 13,
  },
});
