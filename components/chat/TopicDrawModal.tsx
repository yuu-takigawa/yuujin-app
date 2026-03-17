import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { mockTopics, drawTopics } from '../../services/api';
import type { Topic } from '../../services/api';
import HalfScreenModal from '../common/HalfScreenModal';
import { Ionicons } from '@expo/vector-icons';

interface TopicDrawModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTopic: (topic: Topic) => void;
  characterId?: string;
}

export default function TopicDrawModal({ visible, onClose, onSelectTopic, characterId }: TopicDrawModalProps) {
  const t = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topics, setTopics] = useState<Topic[]>(mockTopics);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const cardAnim = useRef(new Animated.Value(1)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const panOpacity = useRef(new Animated.Value(1)).current;

  // 每次打开时从 API 拉取 AI 生成的话题
  useEffect(() => {
    if (!visible || !characterId) return;
    setLoadingTopics(true);
    drawTopics(characterId)
      .then((aiTopics) => {
        if (aiTopics.length > 0) {
          setTopics(aiTopics);
          setCurrentIndex(0);
        }
      })
      .catch(() => { /* fall back to mockTopics */ })
      .finally(() => setLoadingTopics(false));
  }, [visible, characterId]);

  const shuffleTopic = useCallback(() => {
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((prev) => (prev + 1) % topics.length);
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    });
  }, [topics.length]);

  const currentTopic = topics[currentIndex] || mockTopics[0];

  const handleSend = useCallback(() => {
    onSelectTopic(currentTopic);
    onClose();
  }, [currentTopic, onSelectTopic, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10 && gs.dy < 0,
      onPanResponderMove: (_, gs) => {
        if (gs.dy < 0) {
          panY.setValue(gs.dy);
          panOpacity.setValue(1 + gs.dy / 200);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -80) {
          // Swipe up threshold reached - send the topic
          Animated.parallel([
            Animated.timing(panY, { toValue: -300, duration: 200, useNativeDriver: true }),
            Animated.timing(panOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => {
            panY.setValue(0);
            panOpacity.setValue(1);
            handleSend();
          });
        } else {
          // Not enough swipe - snap back
          Animated.parallel([
            Animated.spring(panY, { toValue: 0, useNativeDriver: true, tension: 40, friction: 7 }),
            Animated.timing(panOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <HalfScreenModal visible={visible} onClose={onClose} height={500}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>話題を引く</Text>
      </View>

      <View style={styles.body}>
        {/* Back cards (decorative) */}
        <View style={[styles.cardBase, styles.backCard, { backgroundColor: t.surface, borderColor: t.border }]} />
        <View style={[styles.cardBase, styles.midCard, { backgroundColor: t.surface, borderColor: t.border }]} />

        {/* Front card - animated with pan */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.cardBase, styles.frontCard, { backgroundColor: t.white || '#FFFFFF', borderColor: t.brand, shadowColor: t.brand }, {
            opacity: Animated.multiply(cardAnim, panOpacity),
            transform: [
              { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
              { translateY: panY },
            ],
          }]}
        >
          <TouchableOpacity
            style={styles.frontCardInner}
            onPress={shuffleTopic}
            activeOpacity={0.85}
            disabled={loadingTopics}
          >
            {loadingTopics ? (
              <>
                <ActivityIndicator size="large" color={t.brand} />
                <Text style={[styles.cardHint, { color: t.textSecondary }]}>AI が話題を考えています...</Text>
              </>
            ) : (
              <>
                <Text style={[styles.cardTopic, { color: t.text }]}>{currentTopic.text}</Text>
                <Text style={[styles.cardHint, { color: t.textSecondary }]}>タップしてシャッフル</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: t.brand }]}
          onPress={handleSend}
          activeOpacity={0.7}
        >
          <Text style={styles.sendButtonText}>この話題を送る</Text>
        </TouchableOpacity>
        <Text style={[styles.swipeHint, { color: t.textSecondary }]}>
          <Ionicons name="chevron-up" size={14} color={t.textSecondary} />
          {'  '}上にスワイプしても送れます
        </Text>
      </View>
    </HalfScreenModal>
  );
}

const CARD_W = 260;
const CARD_H = 300;

const styles = StyleSheet.create({
  header: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBase: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    borderWidth: 1,
    position: 'absolute',
  },
  backCard: {
    transform: [{ rotate: '-3deg' }, { translateX: 8 }],
    opacity: 0.6,
  },
  midCard: {
    transform: [{ rotate: '-1.5deg' }, { translateX: 4 }],
    opacity: 0.8,
  },
  frontCard: {
    borderWidth: 2,
    shadowColor: undefined,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  frontCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  cardTopic: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  cardHint: {
    fontSize: 12,
  },
  actions: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 8,
    gap: 10,
  },
  sendButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 12,
  },
});
