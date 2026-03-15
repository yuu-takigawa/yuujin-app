import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  useWindowDimensions,
  TouchableWithoutFeedback,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface HalfScreenModalProps {
  visible: boolean;
  onClose: () => void;
  height?: number;
  children: React.ReactNode;
}

export default function HalfScreenModal({ visible, onClose, height, children }: HalfScreenModalProps) {
  const t = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const modalHeight = height || screenHeight * 0.55;

  const [modalVisible, setModalVisible] = useState(visible);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(modalHeight)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(modalHeight);
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(slideAnim, {
          toValue: modalHeight,
          duration: 250,
          useNativeDriver: false,
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
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: modalHeight,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setModalVisible(false);
      onClose();
    });
  };

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.root}>
        {/* Overlay - fades independently */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayAnim,
                backgroundColor: 'rgba(0,0,0,0.45)',
              },
              Platform.OS === 'web' && ({
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              } as any),
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Content - slides up independently */}
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
          <TouchableWithoutFeedback>
            <View style={styles.inner}>
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: t.textSecondary }]} />
              </View>
              {children}
            </View>
          </TouchableWithoutFeedback>
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
