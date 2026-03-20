import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Avatar from '../common/Avatar';
import UnreadDot from '../common/UnreadDot';
import { useTheme } from '../../hooks/useTheme';
import { fontSize } from '../../constants/theme';

interface ConversationCardProps {
  name: string;
  avatarEmoji: string;
  lastMessage: string;
  time: string;
  hasUnread: boolean;
  isPinned: boolean;
  onPress: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[d.getDay()] + '曜日';
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ConversationCard({
  name,
  avatarEmoji,
  lastMessage,
  time,
  hasUnread,
  isPinned,
  onPress,
}: ConversationCardProps) {
  const t = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderBottomColor: t.border },
        isPinned && { backgroundColor: t.brandLight },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Avatar emoji={avatarEmoji} size={52} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.time, { color: t.textSecondary }]}>
            {time ? formatTime(time) : ''}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, { color: t.textSecondary }]}
            numberOfLines={1}
          >
            {lastMessage}
          </Text>
          {hasUnread && <UnreadDot />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: fontSize.caption,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
});
