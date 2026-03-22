import { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
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
  imageUrl?: string;
}

// Match news ref pattern: [articleId] Title
const NEWS_REF_REGEX = /^📰\[([^\]]+)\]\s*(.+)$/;

function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function MessageBubble({
  content,
  role,
  avatarUrl,
  createdAt,
  highlight,
  skipEntrance,
  imageUrl,
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

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });
  const [annotation, setAnnotation] = useState<{ type: 'translation' | 'analysis' | 'correct' } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (skipEntrance) return;
      Animated.timing(animValue, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, []);

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
    if (iconRef.current) {
      iconRef.current.measureInWindow((x, y, _w, _h) => {
        setTooltipAnchor({ x, y });
        setTooltipVisible(true);
      });
    }
  };

  const handleAction = async (action: BubbleAction) => {
    setTooltipVisible(false);
    if (action === 'copy') {
      showToast();
    } else if (action === 'translate') {
      setAnnotation({ type: 'translation' });
    } else if (action === 'analyze') {
      setAnnotation({ type: 'analysis' });
    } else if (action === 'correct') {
      setAnnotation({ type: 'correct' });
    }
    // 'read' is handled inside BubbleTooltip directly
  };

  // Check if this is a news reference message
  const newsMatch = content.match(NEWS_REF_REGEX);
  const isSpecialMessage = !!newsMatch || !!imageUrl;

  const renderContent = () => {
    // Image message
    if (imageUrl) {
      return (
        <View style={styles.imageWrap}>
          <Image source={{ uri: imageUrl }} style={styles.chatImage} resizeMode="cover" />
          {content && !content.startsWith('[image]') && (
            <Text style={[styles.text, { color: t.text }]}>{content}</Text>
          )}
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

    // Normal text with info icon
    return (
      <View style={styles.textRow}>
        <Text style={[styles.text, { color: t.text, flex: 1 }]}>{content}</Text>
        <View ref={iconRef} collapsable={false} style={styles.infoIconWrap}>
          <TouchableOpacity onPress={handleInfoPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={14} color={t.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.row, isUser && styles.rowUser, {
      opacity: animValue,
      transform: [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
    }]}>
      {!isUser && hasAvatar && <Avatar imageUrl={avatarUrl} size={36} />}
      <View style={styles.bubbleWrap}>
        <View
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

        {/* Copy toast */}
        {toastVisible && (
          <Animated.View style={[styles.toast, { backgroundColor: t.text, opacity: toastAnim }]}>
            <Text style={[styles.toastText, { color: t.background }]}>{i('bubble.copied')}</Text>
          </Animated.View>
        )}
      </View>
      {isUser && hasAvatar && <Avatar imageUrl={avatarUrl} size={36} />}

      <BubbleTooltip
        visible={tooltipVisible}
        content={content}
        role={role}
        anchorY={tooltipAnchor.y}
        anchorX={tooltipAnchor.x}
        onClose={() => setTooltipVisible(false)}
        onAction={handleAction}
      />
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
    maxWidth: Dimensions.get('window').width * 0.65,
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
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  infoIconWrap: {
    paddingBottom: 4,
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
});
