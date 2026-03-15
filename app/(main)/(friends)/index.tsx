import { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CharacterCard, { AddCharacterCard } from '../../../components/character/CharacterCard';
import { useCharacterStore } from '../../../stores/characterStore';
import { useFriendStore } from '../../../stores/friendStore';
import { useAuthStore } from '../../../stores/authStore';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, fontSize } from '../../../constants/theme';

const CARD_WIDTH = 280;
const CARD_SPACING = 220;
const MAX_ROTATION = 6;
const SIDE_SCALE_DROP = 0.12;
const VISIBLE_RANGE = 3;
const ARC_Y = 20;
const OPACITY_DROP = 0.3;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const user = useAuthStore((s) => s.user);
  const characters = useCharacterStore((s) => s.characters);
  const fetchCharacters = useCharacterStore((s) => s.fetchCharacters);
  const friends = useFriendStore((s) => s.friends);
  const conversations = useFriendStore((s) => s.conversations);
  const addFriend = useFriendStore((s) => s.addFriend);

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

  const snapToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(index, totalCardsRef.current - 1));
    activeIndexRef.current = clamped;
    setActiveIndex(clamped);
    Animated.spring(scrollX, {
      toValue: clamped,
      useNativeDriver: true,
      tension: 100,
      friction: 14,
    }).start();
  };

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

    const inputRange: number[] = [];
    const translateXOut: number[] = [];
    const rotateOut: string[] = [];
    const scaleOut: number[] = [];
    const translateYOut: number[] = [];
    const opacityOut: number[] = [];

    for (let scrollPos = 0; scrollPos < len; scrollPos++) {
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

    if (inputRange.length < 2) {
      return {
        transforms: [
          { translateX: 0 },
          { rotate: '0deg' },
          { scale: 1 },
          { translateY: 0 },
        ],
        opacity: 1 as any,
        zIndex: len,
        blur: 0,
      };
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
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: t.text }]}>友達</Text>
          <Text style={[styles.titleCount, { color: t.textSecondary }]}>{characters.length}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { borderColor: t.border }]}
          onPress={() => router.push('/create-character')}
          hitSlop={8}
        >
          <Text style={[styles.addIcon, { color: t.brand }]}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Fan-shaped Card Carousel */}
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
                  zIndex,
                  opacity,
                  transform: transforms,
                },
              ]}
            >
              {isAddCard ? (
                <AddCharacterCard
                  onPress={() => router.push('/create-character')}
                />
              ) : (
                <CharacterCard
                  name={char.name}
                  avatarEmoji={char.avatarEmoji}
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
                />
              )}
            </Animated.View>
          );
        })}
      </View>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  titleCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 20,
  },
  swiperContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fanCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    backgroundColor: 'transparent',
    borderRadius: 20,
    overflow: 'hidden',
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
