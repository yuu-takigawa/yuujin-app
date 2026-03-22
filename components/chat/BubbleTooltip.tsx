import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../hooks/useTheme';

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

interface TooltipItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: BubbleAction;
  onPress: () => void;
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
  const { width: screenW, height: screenH } = useWindowDimensions();
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

  if (!visible) return null;

  const isAI = role === 'assistant';
  const items: TooltipItem[] = isAI
    ? [
        { label: '朗読', icon: 'volume-medium-outline', action: 'read', onPress: handleSpeak },
        { label: '翻訳', icon: 'language-outline', action: 'translate', onPress: () => onAction('translate') },
        { label: '解析', icon: 'school-outline', action: 'analyze', onPress: () => onAction('analyze') },
        { label: 'コピー', icon: 'copy-outline', action: 'copy', onPress: handleCopy },
      ]
    : [
        { label: '朗読', icon: 'volume-medium-outline', action: 'read', onPress: handleSpeak },
        { label: '纠错', icon: 'create-outline', action: 'correct', onPress: () => onAction('correct') },
        { label: 'コピー', icon: 'copy-outline', action: 'copy', onPress: handleCopy },
      ];

  // Position tooltip above the anchor (ⓘ icon center)
  const tooltipWidth = items.length * 56 + 8;
  const tooltipLeft = Math.max(8, Math.min(anchorX - tooltipWidth / 2, screenW - tooltipWidth - 8));
  const tooltipTop = Math.max(40, anchorY - 56);
  // Arrow points down to the ⓘ icon
  const arrowLeft = Math.max(12, Math.min(anchorX - tooltipLeft, tooltipWidth - 12));

  return (
    <>
      {/* Transparent overlay to catch taps outside tooltip */}
      <Pressable
        style={[styles.overlay, { width: screenW, height: screenH }]}
        onPress={onClose}
      />
      {/* Tooltip */}
      <Animated.View
        style={[
          styles.tooltip,
          {
            backgroundColor: 'rgba(30,30,30,0.92)',
            top: tooltipTop,
            left: tooltipLeft,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 8,
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
        {items.map((item, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.tooltipBtn}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <Ionicons name={item.icon} size={16} color={t.brand} />
              <Text style={styles.tooltipText}>{item.label}</Text>
            </TouchableOpacity>
            {idx < items.length - 1 && (
              <View style={[styles.tooltipDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            )}
          </View>
        ))}
        {/* Arrow */}
        <View style={[styles.tooltipArrow, { borderTopColor: 'rgba(30,30,30,0.92)', left: arrowLeft - 6 }]} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
  },
  tooltip: {
    position: 'absolute',
    flexDirection: 'row',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    zIndex: 1000,
  },
  tooltipBtn: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 2,
  },
  tooltipText: {
    fontSize: 11,
    marginTop: 2,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  tooltipDivider: {
    width: 1,
    height: 24,
    alignSelf: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
