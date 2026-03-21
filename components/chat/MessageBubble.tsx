import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Avatar from '../common/Avatar';
import { useTheme } from '../../hooks/useTheme';

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant';
  avatarUrl?: string;
  createdAt?: string;
  onLongPress?: () => void;
  highlight?: boolean;
  skipEntrance?: boolean;
  imageUrl?: string;
}

// Match news ref pattern: 📰[articleId] Title
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
  onLongPress,
  highlight,
  skipEntrance,
  imageUrl,
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const t = useTheme();
  const router = useRouter();
  const timeStr = formatMessageTime(createdAt);
  const hasAvatar = !!avatarUrl;

  const animValue = useRef(new Animated.Value(skipEntrance ? 1 : 0)).current;
  const mounted = useRef(false);

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

  // Check if this is a news reference message
  const newsMatch = content.match(NEWS_REF_REGEX);

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

    // Normal text
    return <Text style={[styles.text, { color: t.text }]}>{content}</Text>;
  };

  return (
    <Animated.View style={[styles.row, isUser && styles.rowUser, {
      opacity: animValue,
      transform: [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
    }]}>
      {!isUser && hasAvatar && <Avatar imageUrl={avatarUrl} size={36} />}
      <View style={styles.bubbleWrap}>
        <TouchableOpacity
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: t.brandLight }]
              : [styles.bubbleAI, { backgroundColor: t.bubbleAI }],
            highlight && { borderWidth: 2, borderColor: t.brand },
          ]}
          onLongPress={onLongPress}
          activeOpacity={0.8}
          delayLongPress={300}
        >
          {renderContent()}
        </TouchableOpacity>
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
      </View>
      {isUser && hasAvatar && <Avatar imageUrl={avatarUrl} size={36} />}
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
});
