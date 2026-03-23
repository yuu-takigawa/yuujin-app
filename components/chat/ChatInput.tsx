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
  ActivityIndicator,
} from 'react-native';
import ReAnimated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import * as ImagePicker from 'expo-image-picker';
// Voice recorder removed — users can use system keyboard voice input

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTopicDraw?: () => void;
  onNewsPicker?: () => void;
  onImagePicked?: (uri: string) => void;
  onAIAssist?: () => void;
  suggestedText?: string;
  aiAssistLoading?: boolean;
  characterName?: string;
}

export default function ChatInput({ onSend, disabled, onTopicDraw, onNewsPicker, onImagePicked, onAIAssist, suggestedText, aiAssistLoading, characterName }: ChatInputProps) {
  const t = useTheme();
  const { t: i } = useLocale();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [expandOpen, setExpandOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  // AI suggest text: 当 suggestedText 变化时填入输入框
  useEffect(() => {
    if (suggestedText !== undefined) {
      setText(suggestedText);
    }
  }, [suggestedText]);


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
    <ReAnimated.View style={[styles.wrapper, { backgroundColor: t.surface, borderTopColor: t.border }, bottomPaddingStyle]}>
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
            placeholder={`${characterName || '友達'}に話しかけてみよう...`}
            placeholderTextColor={t.textSecondary}
            value={text}
            onChangeText={setText}
            maxLength={1000}
            editable={!disabled}
            onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
            blurOnSubmit={Platform.OS === 'web'}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: canSend ? t.brand : t.brandLight }]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-up" size={14} color={canSend ? '#FFFFFF' : t.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* AI assist button */}
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: aiAssistLoading ? t.brand : t.brandLight }]}
          onPress={() => onAIAssist?.()}
          activeOpacity={0.6}
          disabled={disabled || aiAssistLoading}
        >
          {aiAssistLoading ? (
            <ActivityIndicator size={12} color="#FFFFFF" />
          ) : (
            <Text style={[styles.aiButtonText, { color: t.brand }]} numberOfLines={1}>
              AI
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Expand panel - animated */}
      {showPanel && <Animated.View style={[styles.expandPanel, { backgroundColor: t.surface }, {
        maxHeight: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }),
        opacity: panelAnim,
      }]}>
        <TouchableOpacity style={styles.expandItem} activeOpacity={0.6} onPress={async () => {
          setExpandOpen(false);
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('カメラの許可が必要です'); return; }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
          if (!result.canceled && result.assets[0]) onImagePicked?.(result.assets[0].uri);
        }}>
          <View style={[styles.expandIconBox, { backgroundColor: t.inputBg }]}>
            <Ionicons name="camera-outline" size={22} color={t.brand} />
          </View>
          <Text style={[styles.expandLabel, { color: t.text }]}>{i('panel.camera')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.expandItem} activeOpacity={0.6} onPress={async () => {
          setExpandOpen(false);
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('写真の許可が必要です'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
          if (!result.canceled && result.assets[0]) onImagePicked?.(result.assets[0].uri);
        }}>
          <View style={[styles.expandIconBox, { backgroundColor: t.inputBg }]}>
            <Ionicons name="images-outline" size={22} color={t.brand} />
          </View>
          <Text style={[styles.expandLabel, { color: t.text }]}>{i('panel.album')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.expandItem}
          onPress={() => { setExpandOpen(false); onTopicDraw?.(); }}
          activeOpacity={0.6}
        >
          <View style={[styles.expandIconBox, { backgroundColor: t.inputBg }]}>
            <Ionicons name="dice-outline" size={22} color={t.brand} />
          </View>
          <Text style={[styles.expandLabel, { color: t.text }]}>{i('panel.topic')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.expandItem}
          onPress={() => { setExpandOpen(false); onNewsPicker?.(); }}
          activeOpacity={0.6}
        >
          <View style={[styles.expandIconBox, { backgroundColor: t.inputBg }]}>
            <Ionicons name="newspaper-outline" size={22} color={t.brand} />
          </View>
          <Text style={[styles.expandLabel, { color: t.text }]}>{i('panel.news')}</Text>
        </TouchableOpacity>
      </Animated.View>}
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
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
    paddingTop: 16,
    paddingBottom: 24,
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
