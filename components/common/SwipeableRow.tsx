import { useRef, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

const SWIPE_THRESHOLD = -80;
const DELETE_WIDTH = 80;

export default function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const t = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
    },
    onPanResponderMove: (_, gestureState) => {
      const dx = isOpen.current
        ? gestureState.dx - DELETE_WIDTH
        : gestureState.dx;
      if (dx <= 0) {
        translateX.setValue(Math.max(dx, -DELETE_WIDTH));
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      const dx = isOpen.current
        ? gestureState.dx - DELETE_WIDTH
        : gestureState.dx;
      if (dx < SWIPE_THRESHOLD) {
        Animated.spring(translateX, {
          toValue: -DELETE_WIDTH,
          useNativeDriver: true,
        }).start();
        isOpen.current = true;
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        isOpen.current = false;
      }
    },
  }), [translateX]);

  return (
    <View style={styles.container}>
      <View style={[styles.deleteContainer, { backgroundColor: t.error }]}>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteText}>削除</Text>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[styles.content, { backgroundColor: t.background, transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: DELETE_WIDTH,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {},
});
