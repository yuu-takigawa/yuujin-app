import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Platform,
  Share,
  Animated,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTTS } from '../../hooks/useTTS';
import { spacing, fontSize, radii } from '../../constants/theme';

interface BubbleMenuProps {
  visible: boolean;
  content: string;
  role?: string;
  voice?: string;
  onClose: () => void;
}

export default function BubbleMenu({ visible, content, role, voice, onClose }: BubbleMenuProps) {
  const t = useTheme();
  const { speak, stop } = useTTS();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleCopy = async () => {
    try {
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
      }
    } catch {}
    onClose();
  };

  const showToast = (msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(msg);
    }
    onClose();
  };

  const handleShare = async () => {
    onClose();
    try {
      await Share.share({ message: content });
    } catch {}
  };

  const handleSpeak = () => {
    stop();
    speak(content, voice, undefined, (err) => {
      if (err) console.warn('[TTS Error]', err);
    });
    onClose();
  };

  const items = [
    ...(role === 'assistant' ? [{ label: '朗読', onPress: handleSpeak }] : []),
    { label: '翻訳', onPress: () => showToast('翻訳機能は開発中です') },
    { label: '解析', onPress: () => showToast('解析機能は開発中です') },
    { label: '分享', onPress: handleShare },
    { label: 'コピー', onPress: handleCopy },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.menu, { backgroundColor: t.cardBackground }, {
          opacity: scaleAnim,
          transform: [{ scale: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        }]}>
          <View style={styles.row}>
            {items.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.item}
                onPress={item.onPress}
              >
                <Text style={[styles.itemText, { color: t.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  itemText: {
    fontSize: fontSize.caption,
    fontWeight: '500',
  },
});
