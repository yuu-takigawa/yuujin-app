import { useRef, useMemo, useEffect, createContext, useContext, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

// ─── 排他控制：同时只有一个 row 打开 ───
type CloseCallback = () => void;
const SwipeContext = createContext<{
  register: (close: CloseCallback) => void;
  notifyOpen: (close: CloseCallback) => void;
}>({
  register: () => {},
  notifyOpen: () => {},
});

/** 包裹 FlatList 外层，确保同时只有一个 SwipeableRow 打开 */
export function SwipeableProvider({ children }: { children: React.ReactNode }) {
  const openRef = useRef<CloseCallback | null>(null);

  const register = useCallback(() => {}, []);
  const notifyOpen = useCallback((close: CloseCallback) => {
    if (openRef.current && openRef.current !== close) {
      openRef.current(); // 关闭上一个
    }
    openRef.current = close;
  }, []);

  return (
    <SwipeContext.Provider value={{ register, notifyOpen }}>
      {children}
    </SwipeContext.Provider>
  );
}

// ─── SwipeableRow ───
interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onPin?: () => void;
  isPinned?: boolean;
}

const ACTION_WIDTH = 72;
const TOTAL_WIDTH = ACTION_WIDTH * 2; // 置顶 + 削除

export default function SwipeableRow({ children, onDelete, onPin, isPinned }: SwipeableRowProps) {
  const t = useTheme();
  const { notifyOpen } = useContext(SwipeContext);
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  // 关闭动画
  const close = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      overshootClamping: true,
    }).start();
    isOpen.current = false;
  }, [translateX]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => {
      return Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 10;
    },
    onPanResponderGrant: () => {
      // 通知 Provider 关闭其他已打开的 row
      notifyOpen(close);
    },
    onPanResponderMove: (_, gs) => {
      const dx = isOpen.current ? gs.dx - TOTAL_WIDTH : gs.dx;
      if (dx <= 0) {
        translateX.setValue(Math.max(dx, -TOTAL_WIDTH));
      }
    },
    onPanResponderRelease: (_, gs) => {
      const dx = isOpen.current ? gs.dx - TOTAL_WIDTH : gs.dx;
      if (dx < -ACTION_WIDTH) {
        Animated.spring(translateX, {
          toValue: -TOTAL_WIDTH,
          useNativeDriver: true,
          overshootClamping: true,
        }).start();
        isOpen.current = true;
      } else {
        close();
      }
    },
  }), [translateX, close, notifyOpen]);

  return (
    <View style={styles.container}>
      {/* 底层按钮区 */}
      <View style={[styles.actionsContainer, { right: 0 }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#34C759', width: ACTION_WIDTH }]}
          onPress={() => { onPin?.(); close(); }}
        >
          <Text style={styles.actionText}>{isPinned ? '解除' : 'ピン留め'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: t.error, width: ACTION_WIDTH }]}
          onPress={onDelete}
        >
          <Text style={styles.actionText}>削除</Text>
        </TouchableOpacity>
      </View>

      {/* 前景内容 */}
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
  actionsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    width: TOTAL_WIDTH,
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  content: {},
});
