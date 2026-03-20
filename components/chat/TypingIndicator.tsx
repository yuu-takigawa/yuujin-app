import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Avatar from '../common/Avatar';
import { useTheme } from '../../hooks/useTheme';

interface TypingIndicatorProps {
  avatarUrl?: string;
}

export default function TypingIndicator({ avatarUrl }: TypingIndicatorProps) {
  const t = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const makeDotStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={styles.row}>
      {avatarUrl && <Avatar imageUrl={avatarUrl} size={36} />}
      <View style={[styles.bubble, { backgroundColor: t.bubbleAI }]}>
        <Animated.View style={[styles.dot, makeDotStyle(dot1), { backgroundColor: t.textSecondary }]} />
        <Animated.View style={[styles.dot, makeDotStyle(dot2), { backgroundColor: t.textSecondary }]} />
        <Animated.View style={[styles.dot, makeDotStyle(dot3), { backgroundColor: t.textSecondary }]} />
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
  bubble: {
    flexDirection: 'row',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
