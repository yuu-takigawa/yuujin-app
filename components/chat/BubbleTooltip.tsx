import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { radii } from '../../constants/theme';

export type BubbleAction = 'read' | 'translate' | 'analyze' | 'copy' | 'correct';

interface BubbleTooltipProps {
  visible: boolean;
  content: string;
  role?: string;
  anchorY: number;
  anchorX: number;
  onClose: () => void;
  onAction: (action: BubbleAction) => void;
}

export default function BubbleTooltip({
  visible,
  content,
  role,
  anchorY,
  anchorX,
  onClose,
  onAction,
}: BubbleTooltipProps) {
  const t = useTheme();
  const { t: i } = useLocale();
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
      await Clipboard.setStringAsync(content);
    } catch {
      // fallback for web
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
      }
    }
    onAction('copy');
  };

  const handleSpeak = () => {
    Speech.stop();
    Speech.speak(content, { language: 'ja-JP' });
    onAction('read');
  };

  const isAI = role === 'assistant';
  const items: { label: string; action: BubbleAction; onPress: () => void }[] = isAI
    ? [
        { label: i('bubble.read'), action: 'read', onPress: handleSpeak },
        { label: i('bubble.translate'), action: 'translate', onPress: () => onAction('translate') },
        { label: i('bubble.analyze'), action: 'analyze', onPress: () => onAction('analyze') },
        { label: i('bubble.copy'), action: 'copy', onPress: handleCopy },
      ]
    : [
        { label: i('bubble.read'), action: 'read', onPress: handleSpeak },
        { label: i('bubble.correct'), action: 'correct', onPress: () => onAction('correct') },
        { label: i('bubble.copy'), action: 'copy', onPress: handleCopy },
      ];

  // Position tooltip above the anchor point
  const tooltipTop = Math.max(40, anchorY - 60);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.tooltip,
            {
              backgroundColor: t.cardBackground,
              top: tooltipTop,
              left: anchorX > 200 ? anchorX - 180 : anchorX - 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 6,
            },
            {
              opacity: scaleAnim,
              transform: [
                {
                  scale: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.row}>
            {items.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.item,
                  idx < items.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: t.border },
                ]}
                onPress={item.onPress}
                activeOpacity={0.6}
              >
                <Text style={[styles.itemText, { color: t.text }]}>{item.label}</Text>
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
    backgroundColor: 'transparent',
  },
  tooltip: {
    position: 'absolute',
    borderRadius: radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  itemText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
