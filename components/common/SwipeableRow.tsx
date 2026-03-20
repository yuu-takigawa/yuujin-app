import { useRef, useMemo, createContext, useContext, useCallback } from 'react';
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
  notifyOpen: (close: CloseCallback) => void;
  closeAll: () => void;
}>({
  notifyOpen: () => {},
  closeAll: () => {},
});

/** 包裹 FlatList 外层，确保同时只有一个 SwipeableRow 打开 */
export function SwipeableProvider({ children, closeAllRef }: { children: React.ReactNode; closeAllRef?: React.MutableRefObject<(() => void) | null> }) {
  const openRef = useRef<CloseCallback | null>(null);

  const notifyOpen = useCallback((close: CloseCallback) => {
    if (openRef.current && openRef.current !== close) {
      openRef.current();
    }
    openRef.current = close;
  }, []);

  const closeAll = useCallback(() => {
    if (openRef.current) {
      openRef.current();
      openRef.current = null;
    }
  }, []);

  // 暴露 closeAll 给外部
  if (closeAllRef) closeAllRef.current = closeAll;

  return (
    <SwipeContext.Provider value={{ notifyOpen, closeAll }}>
      {children}
    </SwipeContext.Provider>
  );
}

/** Hook: 获取 closeAll，用于 FlatList onScrollBeginDrag */
export function useSwipeableClose() {
  return useContext(SwipeContext).closeAll;
}

// ─── SwipeableRow ───
interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onPin?: () => void;
  isPinned?: boolean;
}

const ACTION_WIDTH = 72;
const TOTAL_WIDTH = ACTION_WIDTH * 2;

export default function SwipeableRow({ children, onDelete, onPin, isPinned }: SwipeableRowProps) {
  const t = useTheme();
  const { notifyOpen } = useContext(SwipeContext);
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  // 关闭（带动画）
  const close = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      overshootClamping: true,
    }).start();
    isOpen.current = false;
  }, [translateX]);

  // 瞬间复位（无动画，用于置顶后列表重排）
  const resetInstant = useCallback(() => {
    translateX.setValue(0);
    isOpen.current = false;
  }, [translateX]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => {
      return Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 10;
    },
    onPanResponderGrant: () => {
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
      <View style={[styles.actionsContainer, { right: 0 }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#34C759', width: ACTION_WIDTH }]}
          onPress={() => { resetInstant(); onPin?.(); }}
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
