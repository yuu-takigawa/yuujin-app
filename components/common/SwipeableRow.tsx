import { useRef, useMemo, useEffect, createContext, useContext, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
  Platform,
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
  const swiping = useRef(false);
  const rowRef = useRef<View>(null);

  // Web: 左滑过程中阻止浏览器原生垂直滚动
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const preventScroll = (e: TouchEvent) => {
      if (swiping.current) e.preventDefault();
    };
    let el: HTMLElement | null = null;
    const timer = setTimeout(() => {
      el = rowRef.current as unknown as HTMLElement;
      if (el?.addEventListener) {
        el.addEventListener('touchmove', preventScroll, { passive: false });
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if (el?.removeEventListener) {
        el.removeEventListener('touchmove', preventScroll);
      }
    };
  }, []);

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

  const snapOrClose = useCallback((gs: { dx: number }) => {
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
  }, [translateX, close]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => {
      if (Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 10) return true;
      // 纵向滑动时，如果已打开则关闭并让 FlatList 滚动
      if (Math.abs(gs.dy) > 10 && isOpen.current) {
        close();
        return false;
      }
      return false;
    },
    // 水平滑动中不释放手势；但展开静止状态下允许释放（让 FlatList 能滚动）
    onPanResponderTerminationRequest: () => !swiping.current,
    onPanResponderGrant: () => {
      swiping.current = true;
      notifyOpen(close);
    },
    onPanResponderMove: (_, gs) => {
      const dx = isOpen.current ? gs.dx - TOTAL_WIDTH : gs.dx;
      if (dx <= 0) {
        translateX.setValue(Math.max(dx, -TOTAL_WIDTH));
      }
    },
    onPanResponderRelease: (_, gs) => {
      swiping.current = false;
      snapOrClose(gs);
    },
    onPanResponderTerminate: (_, gs) => {
      swiping.current = false;
      snapOrClose(gs);
    },
  }), [translateX, close, notifyOpen, snapOrClose]);

  return (
    <View ref={rowRef} style={styles.container}>
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
