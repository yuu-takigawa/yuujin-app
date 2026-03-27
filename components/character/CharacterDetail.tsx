import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../common/Avatar';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { useTTS } from '../../hooks/useTTS';
import { spacing, fontSize, radii } from '../../constants/theme';
import { VOICES } from '../../constants/voices';
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
  const { t: i } = useLocale();
  const { speak, stop } = useTTS();
  const [speaking, setSpeaking] = useState(false);

  const voiceInfo = character.voice ? VOICES.find(v => v.id === character.voice) : null;

  const handlePlayIntro = async () => {
    if (speaking) {
      stop();
      setSpeaking(false);
      return;
    }
    if (!character.bio) return;
    setSpeaking(true);
    speak(character.bio, character.voice, () => {
      setSpeaking(false);
    }, () => {
      setSpeaking(false);
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]}>
      <View style={styles.header}>
        <Avatar imageUrl={character.avatarUrl} name={character.name} size={96} />
        <Text style={[styles.name, { color: t.text }]}>{character.name}</Text>
        <Text style={[styles.sub, { color: t.textSecondary }]}>
          {character.age}{'\u6b73'} {'\u00b7'} {character.gender} {'\u00b7'} {character.occupation}
        </Text>
        <Text style={[styles.location, { color: t.textSecondary }]}>
          {'\ud83d\udccd'} {character.location}
        </Text>

        {/* Type badge */}
        <View style={[styles.typeBadge, { backgroundColor: character.isPreset ? t.brand : t.success }]}>
          <Text style={styles.typeBadgeText}>{character.isPreset ? i('character.officialChar') : i('character.customChar')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>{i('character.personality')}</Text>
        <View style={styles.tags}>
          {character.personality.map((tag, idx) => (
            <View key={idx} style={[styles.tag, { backgroundColor: t.brandLight }]}>
              <Text style={[styles.tagText, { color: t.brand }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>{i('character.hobbies')}</Text>
        <View style={styles.tags}>
          {character.hobbies.map((tag, idx) => (
            <View key={idx} style={[styles.tag, { backgroundColor: t.inputBg }]}>
              <Text style={[styles.tagText, { color: t.text }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>{i('character.bio')}</Text>
        <Text style={[styles.bio, { color: t.text }]}>{character.bio}</Text>
      </View>

      {/* Voice preview */}
      {voiceInfo && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>{i('voice.label')}</Text>
          <TouchableOpacity
            style={[styles.voiceRow, { backgroundColor: t.brandLight }]}
            onPress={handlePlayIntro}
            activeOpacity={0.7}
          >
            {speaking ? (
              <ActivityIndicator size={16} color={t.brand} />
            ) : (
              <Ionicons name="volume-medium-outline" size={18} color={t.brand} />
            )}
            <Text style={[styles.voiceName, { color: t.brand }]}>{voiceInfo.id}</Text>
            <Text style={[styles.voiceDesc, { color: t.textSecondary }]}>{i(voiceInfo.labelKey)}</Text>
            <Ionicons name={speaking ? 'stop-circle-outline' : 'play-circle-outline'} size={24} color={t.brand} />
          </TouchableOpacity>
        </View>
      )}

      {/* Chat CTA button */}
      <View style={styles.chatSection}>
        <TouchableOpacity
          style={[styles.chatButton, { backgroundColor: t.brand }]}
          onPress={onChat}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
          <Text style={styles.chatButtonText}>{i('character.startChat')}</Text>
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
              <Text style={[styles.actionButtonText, { color: t.text }]}>{i('character.edit')}</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: t.inputBg }]}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={16} color={t.error} />
              <Text style={[styles.actionButtonText, { color: t.error }]}>{i('character.delete')}</Text>
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
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
  },
  voiceName: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  voiceDesc: {
    flex: 1,
    fontSize: fontSize.caption,
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
