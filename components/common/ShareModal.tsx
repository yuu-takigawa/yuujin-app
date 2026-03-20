import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useFriendStore } from '../../stores/friendStore';
import { useCharacterStore } from '../../stores/characterStore';
import HalfScreenModal from './HalfScreenModal';
import Avatar from './Avatar';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  onShare: (conversationId: string) => void;
}

export default function ShareModal({ visible, onClose, onShare }: ShareModalProps) {
  const t = useTheme();
  const conversations = useFriendStore((s) => s.conversations);
  const characters = useCharacterStore((s) => s.characters);

  const getCharacter = (characterId: string) =>
    characters.find((c) => c.id === characterId);

  return (
    <HalfScreenModal visible={visible} onClose={onClose} height={460}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>シェア先を選ぶ</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const char = getCharacter(item.characterId);
          if (!char) return null;
          return (
            <View style={styles.row}>
              <Avatar imageUrl={char.avatarUrl} name={char.name} size={40} />
              <View style={styles.info}>
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{char.name}</Text>
                <Text style={[styles.preview, { color: t.textSecondary }]} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: t.brand }]}
                onPress={() => { onShare(item.id); onClose(); }}
              >
                <Text style={styles.sendText}>送信</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: t.textSecondary, fontSize: 14 }}>まだ友達がいません</Text>
          </View>
        }
      />
      <View style={styles.cancelWrap}>
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={onClose}
        >
          <Text style={[styles.cancelText, { color: t.textSecondary }]}>キャンセル</Text>
        </TouchableOpacity>
      </View>
    </HalfScreenModal>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  preview: {
    fontSize: 12,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  cancelWrap: {
    padding: 16,
    paddingBottom: 24,
  },
  cancelBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
