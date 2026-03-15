import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { fontSize } from '../../constants/theme';
import HalfScreenModal from '../common/HalfScreenModal';

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
}: HamburgerMenuProps) {
  const t = useTheme();

  const items = [
    { icon: 'person-outline' as const, label: '角色詳細', onPress: onViewCharacter },
    { icon: (isMuted ? 'notifications-outline' : 'notifications-off-outline') as const, label: isMuted ? '通知オン' : '通知オフ', onPress: onToggleMute },
    { icon: (isPinned ? 'pin' : 'pin-outline') as const, label: isPinned ? 'ピン解除' : 'ピン留め', onPress: onTogglePin },
    { icon: 'trash-outline' as const, label: 'チャット削除', onPress: onClearChat },
    { icon: 'person-remove-outline' as const, label: '友達を削除', onPress: onDeleteFriend, isDestructive: true },
  ];

  const handleItemPress = (onPress: () => void) => {
    onClose();
    setTimeout(onPress, 300);
  };

  return (
    <HalfScreenModal visible={visible} onClose={onClose} height={380}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>メニュー</Text>
      </View>
      <View style={styles.menuList}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.item,
              i < items.length - 1 && { borderBottomColor: t.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
            onPress={() => handleItemPress(item.onPress)}
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
