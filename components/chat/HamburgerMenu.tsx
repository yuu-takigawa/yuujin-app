import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { fontSize } from '../../constants/theme';
import { useCreditStore } from '../../stores/creditStore';
import HalfScreenModal from '../common/HalfScreenModal';
import ConfirmModal from '../common/ConfirmModal';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  isPinned: boolean;
  isMuted: boolean;
  onViewCharacter: () => void;
  onToggleMute: () => void;
  onTogglePin: () => void;
  onClearChat: () => void;
  onDeleteFriend: () => void;
  onModelSelect: () => void;
}

export default function HamburgerMenu({
  visible,
  onClose,
  isPinned,
  isMuted,
  onViewCharacter,
  onToggleMute,
  onTogglePin,
  onClearChat,
  onDeleteFriend,
  onModelSelect,
}: HamburgerMenuProps) {
  const t = useTheme();
  const models = useCreditStore((s) => s.models);
  const selectedModelId = useCreditStore((s) => s.selectedModelId);
  const currentModelName = models.find((m) => m.id === selectedModelId)?.name || '自動選択';
  const [confirmType, setConfirmType] = useState<'clearChat' | 'deleteFriend' | null>(null);

  const handleConfirmAction = (type: 'clearChat' | 'deleteFriend') => {
    onClose();
    setTimeout(() => setConfirmType(type), 300);
  };

  const items = [
    { icon: 'person-outline' as const, label: '角色詳細', onPress: onViewCharacter },
    { icon: (isMuted ? 'notifications-outline' : 'notifications-off-outline') as const, label: isMuted ? '通知オン' : '通知オフ', onPress: onToggleMute },
    { icon: (isPinned ? 'pin' : 'pin-outline') as const, label: isPinned ? 'ピン解除' : 'ピン留め', onPress: onTogglePin },
    { icon: 'trash-outline' as const, label: 'チャット削除', onPress: () => handleConfirmAction('clearChat'), needsConfirm: true },
    { icon: 'person-remove-outline' as const, label: '友達を削除', onPress: () => handleConfirmAction('deleteFriend'), isDestructive: true, needsConfirm: true },
  ];

  const handleItemPress = (item: typeof items[number]) => {
    if (item.needsConfirm) {
      item.onPress();
      return;
    }
    onClose();
    setTimeout(item.onPress, 300);
  };

  return (
    <>
    <HalfScreenModal visible={visible} onClose={onClose} height={430}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>メニュー</Text>
      </View>

      {/* Model selector row */}
      <TouchableOpacity
        style={[styles.modelRow, { backgroundColor: t.inputBg }]}
        onPress={() => { onClose(); setTimeout(onModelSelect, 300); }}
        activeOpacity={0.7}
      >
        <Ionicons name="sparkles" size={18} color={t.brand} />
        <Text style={[styles.modelLabel, { color: t.textSecondary }]}>AIモデル</Text>
        <Text style={[styles.modelValue, { color: t.brand }]} numberOfLines={1}>{currentModelName}</Text>
        <Ionicons name="chevron-forward" size={14} color={t.textSecondary} />
      </TouchableOpacity>

      <View style={styles.menuList}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.item,
              i < items.length - 1 && { borderBottomColor: t.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
            onPress={() => handleItemPress(item)}
            activeOpacity={0.6}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={item.isDestructive ? (t.error || '#E53935') : t.textSecondary || t.text}
              style={styles.itemIcon}
            />
            <Text
              style={[
                styles.itemText,
                { color: item.isDestructive ? t.error || '#E53935' : t.text },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </HalfScreenModal>

      <ConfirmModal
        visible={confirmType === 'clearChat'}
        title="チャット削除"
        message="チャット履歴を削除しますか？"
        confirmText="削除"
        cancelText="キャンセル"
        destructive
        onConfirm={() => { setConfirmType(null); onClearChat(); }}
        onCancel={() => setConfirmType(null)}
      />

      <ConfirmModal
        visible={confirmType === 'deleteFriend'}
        title="友達を削除"
        message="この友達を削除しますか？会話履歴もすべて削除されます。"
        confirmText="削除"
        cancelText="キャンセル"
        destructive
        onConfirm={() => { setConfirmType(null); onDeleteFriend(); }}
        onCancel={() => setConfirmType(null)}
      />
    </>
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
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  modelLabel: { fontSize: 13 },
  modelValue: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  menuList: {
    paddingHorizontal: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  itemIcon: {
    width: 28,
    textAlign: 'center',
  },
  itemText: {
    fontSize: fontSize.body,
    fontWeight: '500',
  },
});
