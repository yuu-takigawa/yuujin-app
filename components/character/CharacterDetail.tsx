import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../common/Avatar';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, radii } from '../../constants/theme';
import type { Character } from '../../services/api';

interface CharacterDetailProps {
  character: Character;
  isFriend: boolean;
  onChat?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function CharacterDetail({
  character,
  isFriend,
  onChat,
  onEdit,
  onDelete,
}: CharacterDetailProps) {
  const t = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]}>
      <View style={styles.header}>
        <Avatar emoji={character.avatarEmoji} size={96} />
        <Text style={[styles.name, { color: t.text }]}>{character.name}</Text>
        <Text style={[styles.sub, { color: t.textSecondary }]}>
          {character.age}歳 · {character.gender} · {character.occupation}
        </Text>
        <Text style={[styles.location, { color: t.textSecondary }]}>
          📍 {character.location}
        </Text>

        {/* Type badge */}
        <View style={[styles.typeBadge, { backgroundColor: character.isPreset ? t.brand : t.success }]}>
          <Text style={styles.typeBadgeText}>{character.isPreset ? '公式キャラ' : 'カスタムキャラ'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>性格</Text>
        <View style={styles.tags}>
          {character.personality.map((tag, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: t.brandLight }]}>
              <Text style={[styles.tagText, { color: t.brand }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>趣味</Text>
        <View style={styles.tags}>
          {character.hobbies.map((tag, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: t.inputBg }]}>
              <Text style={[styles.tagText, { color: t.text }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>自己紹介</Text>
        <Text style={[styles.bio, { color: t.text }]}>{character.bio}</Text>
      </View>

      {/* Chat CTA button */}
      <View style={styles.chatSection}>
        <TouchableOpacity
          style={[styles.chatButton, { backgroundColor: t.brand }]}
          onPress={onChat}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
          <Text style={styles.chatButtonText}>チャットを始める</Text>
        </TouchableOpacity>
      </View>

      {/* Edit/Delete for custom characters */}
      {!character.isPreset && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: t.inputBg }]}
              onPress={onEdit}
            >
              <Ionicons name="pencil" size={16} color={t.text} />
              <Text style={[styles.actionButtonText, { color: t.text }]}>編集</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: t.inputBg }]}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={16} color={t.error} />
              <Text style={[styles.actionButtonText, { color: t.error }]}>削除</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  name: {
    fontSize: fontSize.title,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  sub: {
    fontSize: fontSize.caption,
    marginTop: spacing.xs,
  },
  location: {
    fontSize: fontSize.caption,
    marginTop: spacing.xs,
  },
  typeBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  tagText: {
    fontSize: fontSize.caption,
    fontWeight: '500',
  },
  bio: {
    fontSize: fontSize.body,
    lineHeight: 24,
  },
  chatSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radii.lg,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: radii.lg,
  },
  actionButtonText: {
    fontSize: fontSize.body,
    fontWeight: '500',
  },
});
