import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import StaggerItem from '../../../components/common/StaggerItem';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CharacterCard, { AddCharacterCard } from '../../../components/character/CharacterCard';
import { useCharacterStore } from '../../../stores/characterStore';
import { useFriendStore } from '../../../stores/friendStore';
import { useAuthStore } from '../../../stores/authStore';
import { useTheme } from '../../../hooks/useTheme';
import { useLocale } from '../../../hooks/useLocale';
import { spacing, fontSize } from '../../../constants/theme';

const BASE_CARD_WIDTH = 280;
const CARD_SPACING = 220;
const MAX_ROTATION = 6;
const SIDE_SCALE_DROP = 0.12;
const VISIBLE_RANGE = 2;
const ARC_Y = 20;
const OPACITY_DROP = 0.3;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { t: i } = useLocale();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const user = useAuthStore((s) => s.user);
  const characters = useCharacterStore((s) => s.characters);
  const fetchCharacters = useCharacterStore((s) => s.fetchCharacters);
  const friends = useFriendStore((s) => s.friends);
  const conversations = useFriendStore((s) => s.conversations);
  const addFriend = useFriendStore((s) => s.addFriend);

  // 小屏适配：根据屏幕高度缩放卡片
  // 需要减去：insets.top + header(56) + dots(40) + count(28) + tabBar(60) + 余量(20)
  const availableHeight = SCREEN_HEIGHT - insets.top - 56 - 40 - 28 - 60 - 20;
  const CARD_HEIGHT = Math.min(480, Math.max(320, availableHeight));
  const CARD_WIDTH = Math.min(BASE_CARD_WIDTH, SCREEN_WIDTH - 80);

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const activeIndexRef = useRef(0);
  // Total items = characters + 1 add card at the end
  const totalCards = characters.length + 1;
  const totalCardsRef = useRef(totalCards);
  totalCardsRef.current = totalCards;

  useEffect(() => {
    fetchCharacters();
  }, []);

  const isFriend = (charId: string) =>
    friends.some((f) => f.characterId === charId);

  const handleChat = async (characterId: string) => {
    if (!user) return;
    const existingConv = conversations.find((c) => c.characterId === characterId);
    if (existingConv) {
      router.push(`/conversation/${existingConv.id}`);
    } else {
      const conv = await addFriend(user.id, characterId);
      router.push(`/conversation/${conv.id}`);
    }
  };

  const snapToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, totalCardsRef.current - 1));
    activeIndexRef.current = clamped;
    setActiveIndex(clamped);
    Animated.spring(scrollX, {
      toValue: clamped,
      useNativeDriver: Platform.OS !== 'web',
      tension: 100,
      friction: 14,
    }).start();
  }, [scrollX]);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8,
      onPanResponderGrant: () => {
        // Stop any running spring animation
        scrollX.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        const newVal = activeIndexRef.current - gs.dx / CARD_SPACING;
        scrollX.setValue(newVal);
      },
      onPanResponderRelease: (_, gs) => {
        const projected = activeIndexRef.current - gs.dx / CARD_SPACING;
        let targetIndex: number;

        if (Math.abs(gs.vx) > SWIPE_VELOCITY_THRESHOLD) {
          targetIndex = gs.vx > 0
            ? Math.floor(projected)
            : Math.ceil(projected);
        } else {
          targetIndex = Math.round(projected);
        }

        snapToIndex(targetIndex);
      },
    }),
  [scrollX]);

  const getCardTransforms = (index: number) => {
    const len = totalCards;
    if (len === 0) return { transforms: [], opacity: 1 as any, zIndex: 0 };

    if (len < 2) {
      return {
        transforms: [
          { translateX: 0 },
          { rotate: '0deg' },
          { scale: 1 },
          { translateY: 0 },
        ],
        opacity: 1 as any,
        zIndex: len,
      };
    }

    // Use a smaller inputRange window around the card index for better perf
    const windowSize = VISIBLE_RANGE + 1;
    const rangeStart = Math.max(0, index - windowSize);
    const rangeEnd = Math.min(len - 1, index + windowSize);

    const inputRange: number[] = [];
    const translateXOut: number[] = [];
    const rotateOut: string[] = [];
    const scaleOut: number[] = [];
    const translateYOut: number[] = [];
    const opacityOut: number[] = [];

    for (let scrollPos = rangeStart; scrollPos <= rangeEnd; scrollPos++) {
      const offset = index - scrollPos;
      inputRange.push(scrollPos);
      translateXOut.push(offset * CARD_SPACING);

      const rot = Math.max(-18, Math.min(18, offset * MAX_ROTATION));
      rotateOut.push(`${rot}deg`);

      const absOffset = Math.abs(offset);
      scaleOut.push(Math.max(0.76, 1 - absOffset * SIDE_SCALE_DROP));
      translateYOut.push(absOffset * ARC_Y);
      opacityOut.push(Math.max(0.1, 1 - absOffset * OPACITY_DROP));
    }

    const distFromActive = Math.abs(index - activeIndex);

    return {
      transforms: [
        {
          translateX: scrollX.interpolate({
            inputRange,
            outputRange: translateXOut,
            extrapolate: 'clamp',
          }),
        },
        {
          rotate: scrollX.interpolate({
            inputRange,
            outputRange: rotateOut,
            extrapolate: 'clamp',
          }),
        },
        {
          scale: scrollX.interpolate({
            inputRange,
            outputRange: scaleOut,
            extrapolate: 'clamp',
          }),
        },
        {
          translateY: scrollX.interpolate({
            inputRange,
            outputRange: translateYOut,
            extrapolate: 'clamp',
          }),
        },
      ],
      opacity: scrollX.interpolate({
        inputRange,
        outputRange: opacityOut,
        extrapolate: 'clamp',
      }),
      zIndex: len - distFromActive,
    };
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.brand }]}>{i('friends.title')}</Text>
        <Text
          style={[styles.addButton, { color: t.brand }]}
          onPress={() => router.push('/create-character')}
        >
          ＋
        </Text>
      </View>

      {/* Fan-shaped Card Carousel */}
      <StaggerItem index={0}>
      <View style={styles.swiperContainer} {...panResponder.panHandlers}>
        {Array.from({ length: totalCards }, (_, index) => {
          const distFromActive = Math.abs(index - activeIndex);
          if (distFromActive > VISIBLE_RANGE) return null;

          const { transforms, opacity, zIndex } = getCardTransforms(index);
          const isAddCard = index === characters.length;
          const char = characters[index];

          return (
            <Animated.View
              key={isAddCard ? '__add__' : char.id}
              style={[
                styles.fanCard,
                {
                  width: CARD_WIDTH,
                  zIndex,
                  opacity,
                  transform: transforms,
                },
              ]}
            >
              {isAddCard ? (
                <AddCharacterCard
                  onPress={() => router.push('/create-character')}
                  cardHeight={CARD_HEIGHT}
                />
              ) : (
                <CharacterCard
                  name={char.name}
                  avatarUrl={char.avatarUrl}
                  occupation={char.occupation}
                  personality={char.personality}
                  location={char.location}
                  age={char.age}
                  gender={char.gender}
                  bio={char.bio}
                  isPreset={char.isPreset}
                  isFriend={isFriend(char.id)}
                  onPress={() => router.push(`/character/${char.id}`)}
                  onChat={() => handleChat(char.id)}
                  cardHeight={CARD_HEIGHT}
                />
              )}
            </Animated.View>
          );
        })}
      </View>
      </StaggerItem>

      {/* Dots */}
      <View style={styles.dots}>
        {Array.from({ length: totalCards }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex ? t.brand : t.border,
                width: i === activeIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.countText, { color: t.textSecondary }]}>
        {activeIndex + 1} / {totalCards}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  addButton: {
    fontSize: 28,
    fontWeight: '300',
  },
  swiperContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fanCard: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderRadius: 20,
    overflow: 'hidden',
    // @ts-ignore — web-only: 提示浏览器启用 GPU 合成层
    ...(Platform.OS === 'web' ? { willChange: 'transform, opacity' } : {}),
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  countText: {
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 12,
  },
});
