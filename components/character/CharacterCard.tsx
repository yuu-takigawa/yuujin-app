import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ViewStyle } from 'react-native';
import Avatar from '../common/Avatar';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { radii } from '../../constants/theme';

interface CharacterCardProps {
  name: string;
  avatarEmoji?: string;
  avatarUrl?: string;
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
  cardHeight?: number;
}

function CharacterCard({
  name,
  avatarEmoji,
  avatarUrl,
  occupation,
  personality,
  location,
  age,
  bio,
  isPreset,
  onPress,
  onChat,
  cardHeight,
}: CharacterCardProps) {
  const t = useTheme();
  const { t: i } = useLocale();
  const isCompact = cardHeight !== undefined && cardHeight < 440;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: t.cardBackground }, cardHeight !== undefined && { height: cardHeight }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      <Avatar imageUrl={avatarUrl} name={name} size={isCompact ? 70 : 90} />

      {/* Type badge */}
      <View style={[styles.typeBadge, { borderColor: t.border, backgroundColor: t.surface }]}>
        <Text style={[styles.typeBadgeText, { color: t.textSecondary }]}>{isPreset ? i('character.official') : i('character.custom')}</Text>
      </View>

      {/* Name + age row */}
      <View style={styles.nameRow}>
        <Text style={[styles.name, { color: t.text }]}>{name}</Text>
        <Text style={[styles.age, { color: t.textSecondary }]}>{age}{'\u6b73'}</Text>
      </View>

      {/* Info line */}
      <Text style={[styles.infoLine, { color: t.textSecondary }]}>
        {occupation} {'\u00b7'} {location}
      </Text>

      {/* Personality tags */}
      <View style={styles.tags}>
        {personality.slice(0, 3).map((tag, idx) => (
          <View key={idx} style={[styles.tag, { backgroundColor: t.brandLight }]}>
            <Text style={[styles.tagText, { color: t.brand }]}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Bio */}
      {bio ? (
        <Text style={[styles.bio, { color: t.textSecondary }]} numberOfLines={isCompact ? 2 : 3}>
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
        <Text style={styles.ctaButtonText}>{i('character.startChat')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default memo(CharacterCard);

export const AddCharacterCard = memo(function AddCharacterCard({ onPress, cardHeight }: { onPress: () => void; cardHeight?: number }) {
  const t = useTheme();
  const { t: i } = useLocale();

  return (
    <TouchableOpacity
      style={[styles.card, styles.addCard, { backgroundColor: t.surface, borderColor: t.border, borderWidth: 2, borderStyle: 'dashed' }, cardHeight !== undefined && { height: cardHeight }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.addIconCircle, { backgroundColor: t.brandLight }]}>
        <Text style={[styles.addIconText, { color: t.brand }]}>+</Text>
      </View>
      <Text style={[styles.addTitle, { color: t.text }]}>{i('character.addNew')}</Text>
      <Text style={[styles.addSub, { color: t.textSecondary }]}>{i('character.addNewSub')}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 480,
    borderRadius: 20,
    padding: 24,
    paddingTop: 28,
    alignItems: 'center',
    // 轻量阴影 — 安卓 WebView 重阴影会导致滑动卡顿
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
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
