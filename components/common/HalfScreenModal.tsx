import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  useWindowDimensions,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface HalfScreenModalProps {
  visible: boolean;
  onClose: () => void;
  height?: number;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 0.3;

export default function HalfScreenModal({ visible, onClose, height, children }: HalfScreenModalProps) {
  const t = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const modalHeight = height || screenHeight * 0.55;

  const [modalVisible, setModalVisible] = useState(visible);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(modalHeight)).current;

  // Swipe-down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          slideAnim.setValue(gs.dy);
          overlayAnim.setValue(1 - gs.dy / modalHeight);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > SWIPE_THRESHOLD || gs.vy > SWIPE_VELOCITY) {
          handleClose();
        } else {
          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 14,
            }),
            Animated.spring(overlayAnim, {
              toValue: 1,
              useNativeDriver: true,
              tension: 120,
              friction: 14,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(modalHeight);
      overlayAnim.setValue(0);
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 15,
        }),
      ]).start();
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: modalHeight,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: modalHeight,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      onClose();
    });
  };

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.root}>
        {/* Overlay */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayAnim,
                backgroundColor: 'rgba(0,0,0,0.4)',
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            {
              backgroundColor: t.background,
              height: modalHeight,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.inner}>
            <View style={styles.handleWrap} {...panResponder.panHandlers}>
              <View style={[styles.handle, { backgroundColor: t.textSecondary }]} />
            </View>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
});
