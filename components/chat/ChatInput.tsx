import { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import ReAnimated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTopicDraw?: () => void;
  onNewsPicker?: () => void;
}

export default function ChatInput({ onSend, disabled, onTopicDraw, onNewsPicker }: ChatInputProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [expandOpen, setExpandOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const panelAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Smooth safe-area bottom padding: full when keyboard closed, 0 when open
  const { progress: kbProgress } = useReanimatedKeyboardAnimation();
  const bottomPaddingStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(kbProgress.value, [0, 1], [insets.bottom, 0]),
  }));

  useEffect(() => {
    if (expandOpen) {
      setShowPanel(true);
      Animated.parallel([
        Animated.timing(panelAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(rotateAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(panelAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setShowPanel(false));
    }
  }, [expandOpen]);

  const hasText = text.trim().length > 0;
  const canSend = hasText && !disabled;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const plusRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <ReAnimated.View style={[styles.wrapper, { backgroundColor: t.white, borderTopColor: t.border }, bottomPaddingStyle]}>
      {/* Main row: [＋] [input] [AI] */}
      <View style={styles.mainRow}>
        {/* Plus / Close button */}
        <TouchableOpacity
          style={[styles.plusButton, { borderColor: t.border }]}
          onPress={() => setExpandOpen(!expandOpen)}
          activeOpacity={0.6}
        >
          <Animated.Text style={[
            styles.plusIcon,
            { color: t.brand },
            { transform: [{ rotate: plusRotation }] },
          ]}>
            ＋
          </Animated.Text>
        </TouchableOpacity>

        {/* Input field */}
        <View style={[
          styles.inputWrap,
          { borderColor: hasText ? t.brand : t.border },
        ]}>
          <TextInput
            style={[styles.input, { color: t.text }]}
            placeholder="ゆきに話しかけてみよう..."
            placeholderTextColor={t.textSecondary}
            value={text}
            onChangeText={setText}
            maxLength={1000}
            editable={!disabled}
            onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
            blurOnSubmit={Platform.OS === 'web'}
          />
          {hasText ? (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: canSend ? t.brand : t.brandLight }]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-up" size={14} color={canSend ? '#FFFFFF' : t.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.micBtn, { backgroundColor: t.brandLight }]}
              activeOpacity={0.6}
              onPress={() => Alert.alert('準備中', '音声入力機能は開発中です')}
            >
              <Ionicons name="mic-outline" size={14} color={t.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* AI assist button */}
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: t.brandLight }]}
          onPress={() => Alert.alert('準備中', 'AI返信アシスト機能は開発中です')}
          activeOpacity={0.6}
        >
          <Text style={[styles.aiButtonText, { color: t.brand }]} numberOfLines={1}>
            AI
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expand panel - animated */}
      {showPanel && <Animated.View style={[styles.expandPanel, { backgroundColor: t.surface }, {
        maxHeight: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 100] }),
        opacity: panelAnim,
      }]}>
        <TouchableOpacity style={styles.expandItem} activeOpacity={0.6} onPress={() => Alert.alert('準備中', 'カメラ機能は開発中です')}>
          <View style={[styles.expandIconBox, { backgroundColor: t.inputBg }]}>
            <Text style={styles.expandEmoji}>📷</Text>
          </View>
          <Text style={[styles.expandLabel, { color: t.text }]}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.expandItem} activeOpacity={0.6} onPress={() => Alert.alert('準備中', 'アルバム機能は開発中です')}>
          <View style={[styles.expandIconBox, { backgroundColor: t.inputBg }]}>
            <Text style={styles.expandEmoji}>🖼</Text>
          </View>
          <Text style={[styles.expandLabel, { color: t.text }]}>Album</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.expandItem}
          onPress={() => { setExpandOpen(false); onTopicDraw?.(); }}
          activeOpacity={0.6}
        >
          <View style={[styles.expandIconBox, { backgroundColor: t.inputBg }]}>
            <Text style={styles.expandEmoji}>🎲</Text>
          </View>
          <Text style={[styles.expandLabel, { color: t.text }]}>Topic</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.expandItem}
          onPress={() => { setExpandOpen(false); onNewsPicker?.(); }}
          activeOpacity={0.6}
        >
          <View style={[styles.expandIconBox, { backgroundColor: t.inputBg }]}>
            <Text style={styles.expandEmoji}>📰</Text>
          </View>
          <Text style={[styles.expandLabel, { color: t.text }]}>News</Text>
        </TouchableOpacity>
      </Animated.View>}
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    paddingHorizontal: 8,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  plusIcon: {
    fontSize: 24,
    lineHeight: 26,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 4,
    height: 36,
    alignSelf: 'center',
    overflow: 'hidden' as const,
  },
  inputWrapAI: {
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 14,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  sendBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  aiButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  expandPanel: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  expandItem: {
    alignItems: 'center',
    gap: 6,
  },
  expandIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandEmoji: {
    fontSize: 22,
  },
  expandLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
