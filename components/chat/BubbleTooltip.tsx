import { View, Text, TouchableOpacity, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../hooks/useTheme';

export type BubbleAction = 'read' | 'translate' | 'analyze' | 'copy' | 'correct';

interface BubbleTooltipProps {
  visible: boolean;
  content: string;
  role?: string;
  position: 'above' | 'below';
  onClose: () => void;
  onAction: (action: BubbleAction) => void;
}

export default function BubbleTooltip({
  visible,
  content,
  role,
  position,
  onClose,
  onAction,
}: BubbleTooltipProps) {
  const t = useTheme();

  if (!visible) return null;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(content);
    } catch {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
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
  const items = isAI
    ? [
        { label: '朗読', icon: 'volume-medium-outline' as const, onPress: handleSpeak },
        { label: '翻訳', icon: 'language-outline' as const, onPress: () => onAction('translate') },
        { label: '解析', icon: 'school-outline' as const, onPress: () => onAction('analyze') },
        { label: 'コピー', icon: 'copy-outline' as const, onPress: handleCopy },
      ]
    : [
        { label: '朗読', icon: 'volume-medium-outline' as const, onPress: handleSpeak },
        { label: '纠错', icon: 'create-outline' as const, onPress: () => onAction('correct') },
        { label: 'コピー', icon: 'copy-outline' as const, onPress: handleCopy },
      ];

  const isAbove = position === 'above';

  return (
    <View style={[
      styles.wrapper,
      isAbove ? styles.wrapperAbove : styles.wrapperBelow,
    ]}>
      <View style={[styles.container, { backgroundColor: 'rgba(30,30,30,0.92)' }]}>
        {items.map((item, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.btn} onPress={item.onPress} activeOpacity={0.6}>
              <Ionicons name={item.icon} size={16} color={t.brand} />
              <Text style={styles.label}>{item.label}</Text>
            </TouchableOpacity>
            {idx < items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
      {/* Arrow */}
      <View style={[
        styles.arrow,
        isAbove
          ? { borderTopColor: 'rgba(30,30,30,0.92)', borderBottomWidth: 0 }
          : { borderBottomColor: 'rgba(30,30,30,0.92)', borderTopWidth: 0 },
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
    left: 0,
    right: 0,
  },
  wrapperAbove: {
    bottom: '100%',
    marginBottom: 4,
  },
  wrapperBelow: {
    top: '100%',
    marginTop: 4,
  },
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  btn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 2,
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
  },
});
