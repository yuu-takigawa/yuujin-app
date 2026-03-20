import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Avatar from '../common/Avatar';
import { useTheme } from '../../hooks/useTheme';

interface StreamingTextProps {
  content: string;
  avatarUrl?: string;
}

export default function StreamingText({ content, avatarUrl }: StreamingTextProps) {
  const t = useTheme();

  return (
    <View style={styles.row}>
      {avatarUrl && <Avatar imageUrl={avatarUrl} size={36} />}
      <View style={styles.bubbleWrap}>
        <View style={[styles.bubble, { backgroundColor: t.bubbleAI }]}>
          <Text style={[styles.text, { color: t.text }]}>
            {content}
            <Text style={[styles.cursor, { color: t.brand }]}>|</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bubbleWrap: {
    maxWidth: Dimensions.get('window').width * 0.65,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
  },
  text: {
    fontSize: 17,
    lineHeight: 25.5,
  },
  cursor: {
    fontWeight: '300',
  },
});
