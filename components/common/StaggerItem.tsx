import { useRef, useEffect } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface StaggerItemProps {
  index: number;
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps a list item with a staggered bottom-to-top entrance animation.
 * - index: position in list, used to calculate stagger delay
 * - delay: per-item delay in ms (default 40)
 * - Only the first 10 items are staggered; rest appear instantly.
 */
export default function StaggerItem({ index, children, delay = 40, style }: StaggerItemProps) {
  const skip = index >= 10;
  const anim = useRef(new Animated.Value(skip ? 1 : 0)).current;

  useEffect(() => {
    if (skip) return;
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      delay: index * delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[style, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}
