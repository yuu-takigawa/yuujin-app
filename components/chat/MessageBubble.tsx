import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Image, Platform, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Avatar from '../common/Avatar';
import BubbleTooltip, { type BubbleAction } from './BubbleTooltip';
import AnnotationPanel from './AnnotationPanel';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant';
  avatarUrl?: string;
  createdAt?: string;
  highlight?: boolean;
  skipEntrance?: boolean;
  entranceDelay?: number;
  imageUrl?: string;
  voice?: string;
  dismissSignal?: number;
  /** 当前激活 tooltip 的消息 ID（由父级控制单例） */
  activeTooltipId?: string | null;
  /** 本消息 ID */
  messageId?: string;
  onRequestScroll?: () => void;
  onTooltipChange?: (visible: boolean) => void;
}

// Match news ref pattern: [articleId] Title
const NEWS_REF_REGEX = /^📰\[([^\]]+)\]\s*(.+)$/;

function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function MessageBubble({
  content,
  role,
  avatarUrl,
  createdAt,
  highlight,
  skipEntrance,
  entranceDelay = 0,
  imageUrl,
  voice,
  dismissSignal,
  activeTooltipId,
  messageId,
  onRequestScroll,
  onTooltipChange,
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const t = useTheme();
  const { t: i } = useLocale();
  const router = useRouter();
  const timeStr = formatMessageTime(createdAt);
  const hasAvatar = !!avatarUrl;

  const animValue = useRef(new Animated.Value(skipEntrance ? 1 : 0)).current;
  const mounted = useRef(false);
  const iconRef = useRef<View>(null);

  // tooltip 可见性：优先使用父级控制（activeTooltipId），兜底本地 state
  const [localTooltipVisible, setLocalTooltipVisible] = useState(false);
  const tooltipVisible = messageId && activeTooltipId !== undefined
    ? activeTooltipId === messageId
    : localTooltipVisible;
  const setTooltipVisible = useCallback((v: boolean) => {
    setLocalTooltipVisible(v);
    onTooltipChange?.(v);
  }, [onTooltipChange]);
  const [tooltipPosition, setTooltipPosition] = useState<'above' | 'below'>('above');
  const bubbleRef = useRef<View>(null);
  const [annotation, setAnnotation] = useState<{ type: 'translation' | 'analysis' | 'correct' } | null>(null);
  const [imageZoomVisible, setImageZoomVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (skipEntrance) return;
      Animated.timing(animValue, {
        toValue: 1,
        duration: 220,
        delay: entranceDelay,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  // Close tooltip when parent signals scroll
  useEffect(() => {
    if (dismissSignal && tooltipVisible) {
      setTooltipVisible(false);
    }
  }, [dismissSignal]);

  // Close tooltip when another bubble's tooltip opens (parent-controlled)
  useEffect(() => {
    if (messageId && activeTooltipId !== undefined && activeTooltipId !== messageId && localTooltipVisible) {
      setLocalTooltipVisible(false);
    }
  }, [activeTooltipId]);

  const showToast = useCallback(() => {
    setToastVisible(true);
    toastAnim.setValue(1);
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 1200,
      delay: 600,
      useNativeDriver: true,
    }).start(() => setToastVisible(false));
  }, []);

  const handleInfoPress = () => {
    if (tooltipVisible) {
      setTooltipVisible(false);
      return;
    }
    // Measure bubble position to decide tooltip placement
    const node = bubbleRef.current as any;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x: number, y: number) => {
        setTooltipPosition(y < 120 ? 'below' : 'above');
        setTooltipVisible(true);
      });
    } else {
      setTooltipPosition('above');
      setTooltipVisible(true);
    }
  };

  const handleAction = async (action: BubbleAction) => {
    setTooltipVisible(false);
    if (action === 'copy') {
      showToast();
    } else if (action === 'translate') {
      setAnnotation({ type: 'translation' });
      setTimeout(() => onRequestScroll?.(), 300);
    } else if (action === 'analyze') {
      setAnnotation({ type: 'analysis' });
      setTimeout(() => onRequestScroll?.(), 300);
    } else if (action === 'correct') {
      setAnnotation({ type: 'correct' });
      setTimeout(() => onRequestScroll?.(), 300);
    }
    // 'read' is handled inside BubbleTooltip — tooltip closes after audio starts
  };

  // Check if this is a news reference message
  const newsMatch = content.match(NEWS_REF_REGEX);
  const isSpecialMessage = !!newsMatch || !!imageUrl;

  const renderContent = () => {
    // Image message
    if (imageUrl) {
      return (
        <View style={styles.imageWrap}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setImageZoomVisible(true)}>
            <Image source={{ uri: imageUrl }} style={styles.chatImage} resizeMode="cover" />
          </TouchableOpacity>
          {content ? (
            <Text style={[styles.text, { color: t.text }]}>{content}</Text>
          ) : null}
        </View>
      );
    }

    // News reference — clickable link style
    if (newsMatch) {
      const [, articleId, title] = newsMatch;
      return (
        <TouchableOpacity
          onPress={() => router.push(`/article/${articleId}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.newsIcon}>📰</Text>
          <Text style={[styles.newsTitle, { color: t.brand }]}>{title}</Text>
        </TouchableOpacity>
      );
    }

    // Normal text with inline info icon
    return (
      <Text style={[styles.text, { color: t.text }]}>
        {content}
        <Text
          ref={iconRef as any}
          onPress={handleInfoPress}
          style={{ color: t.textSecondary, fontSize: 13 }}
        >{'  ⓘ'}</Text>
      </Text>
    );
  };

  return (
    <Animated.View style={[styles.row, isUser && styles.rowUser, {
      opacity: animValue,
      transform: [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      ...(tooltipVisible ? { zIndex: 9999, elevation: 9999 } : undefined),
    }]}>
      {!isUser && hasAvatar && <Avatar imageUrl={avatarUrl} size={36} />}
      <View style={styles.bubbleWrap}>
        <View
          ref={bubbleRef}
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: t.brandLight }]
              : [styles.bubbleAI, { backgroundColor: t.bubbleAI }],
            highlight && { borderWidth: 2, borderColor: t.brand },
          ]}
        >
          {renderContent()}
        </View>
        {timeStr ? (
          <Text
            style={[
              styles.time,
              { color: t.textSecondary },
              isUser ? styles.timeUser : styles.timeAI,
            ]}
          >
            {timeStr}
          </Text>
        ) : null}

        {/* Annotation panel (translation / analysis / correct) */}
        {annotation && (
          <AnnotationPanel
            content={content}
            type={annotation.type}
            onClose={() => setAnnotation(null)}
          />
        )}

        {/* Tooltip - floats above or below the bubble based on position */}
        {tooltipVisible && (
          <BubbleTooltip
            visible={tooltipVisible}
            content={content}
            role={role}
            voice={voice}
            position={tooltipPosition}
            onClose={() => setTooltipVisible(false)}
            onAction={handleAction}
          />
        )}

        {/* Copy toast */}
        {toastVisible && (
          <Animated.View style={[styles.toast, { backgroundColor: t.text, opacity: toastAnim }]}>
            <Text style={[styles.toastText, { color: t.background }]}>{i('bubble.copied')}</Text>
          </Animated.View>
        )}
      </View>
      {isUser && hasAvatar && <Avatar imageUrl={avatarUrl} size={36} />}

      {/* Image zoom modal */}
      {imageUrl && imageZoomVisible && (
        <Modal
          visible={imageZoomVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageZoomVisible(false)}
        >
          <Pressable style={styles.zoomOverlay} onPress={() => setImageZoomVisible(false)}>
            <Image source={{ uri: imageUrl }} style={styles.zoomImage} resizeMode="contain" />
          </Pressable>
        </Modal>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  bubbleWrap: {
    maxWidth: '65%',
    position: 'relative',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 40,
  },
  bubbleAI: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
  },
  bubbleUser: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
  },
  text: {
    fontSize: 17,
    lineHeight: 25.5,
  },
  newsIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
  imageWrap: {
    gap: 8,
  },
  chatImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  time: {
    fontSize: 10,
    marginTop: 2,
    paddingHorizontal: 14,
  },
  timeAI: {
    textAlign: 'left',
  },
  timeUser: {
    textAlign: 'right',
  },
  toast: {
    position: 'absolute',
    bottom: -24,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  toastText: {
    fontSize: 11,
    fontWeight: '600',
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
});

/**
 * React.memo — 只在自身相关 props 变化时重渲染
 * activeTooltipId 变化时，只有 "与自己相关" 的那个气泡需要 re-render
 */
export default React.memo(MessageBubble, (prev, next) => {
  // activeTooltipId 变化：只有涉及自己的才需要 re-render
  const prevIsActive = prev.activeTooltipId === prev.messageId;
  const nextIsActive = next.activeTooltipId === next.messageId;
  if (prevIsActive !== nextIsActive) return false; // 需要 re-render

  // 其他 props 浅比较
  if (prev.content !== next.content) return false;
  if (prev.role !== next.role) return false;
  if (prev.avatarUrl !== next.avatarUrl) return false;
  if (prev.createdAt !== next.createdAt) return false;
  if (prev.highlight !== next.highlight) return false;
  if (prev.skipEntrance !== next.skipEntrance) return false;
  if (prev.imageUrl !== next.imageUrl) return false;
  if (prev.voice !== next.voice) return false;
  if (prev.dismissSignal !== next.dismissSignal) return false;

  return true; // 相同，不 re-render
});
