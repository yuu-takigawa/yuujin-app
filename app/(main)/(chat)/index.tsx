import { useEffect, useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, FlatList, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFriendStore } from '../../../stores/friendStore';
import { useCharacterStore } from '../../../stores/characterStore';
import { useAuthStore } from '../../../stores/authStore';
import ConversationCard from '../../../components/chat/ConversationCard';
import StaggerItem from '../../../components/common/StaggerItem';
import SwipeableRow, { SwipeableProvider } from '../../../components/common/SwipeableRow';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Logo from '../../../components/common/Logo';
import { useTheme } from '../../../hooks/useTheme';
import { useLocale } from '../../../hooks/useLocale';
import { spacing, fontSize } from '../../../constants/theme';
import type { Conversation } from '../../../services/api';

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { t: i } = useLocale();

  const user = useAuthStore((s) => s.user);
  const conversations = useFriendStore((s) => s.conversations);
  const isLoading = useFriendStore((s) => s.isLoading);
  const friends = useFriendStore((s) => s.friends);
  const fetchConversations = useFriendStore((s) => s.fetchConversations);
  const fetchFriends = useFriendStore((s) => s.fetchFriends);
  const deleteConversation = useFriendStore((s) => s.deleteConversation);
  const removeFriend = useFriendStore((s) => s.removeFriend);
  const togglePin = useFriendStore((s) => s.togglePin);
  const closeAllRef = useRef<(() => void) | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const characters = useCharacterStore((s) => s.characters);
  const fetchCharacters = useCharacterStore((s) => s.fetchCharacters);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchConversations().then(() => { setHasFetched(true); });
    fetchCharacters();
    if (user) fetchFriends(user.id);
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Close swipe actions when returning to this screen
  useFocusEffect(useCallback(() => {
    closeAllRef.current?.();
  }, []));

  const getCharacter = useCallback(
    (characterId: string) => characters.find((c) => c.id === characterId),
    [characters]
  );

  const getFriend = useCallback(
    (characterId: string) => friends.find((f) => f.characterId === characterId),
    [friends]
  );

  // Sort: pinned first, then by time
  const sorted = [...conversations].sort((a, b) => {
    const fa = getFriend(a.characterId);
    const fb = getFriend(b.characterId);
    if (fa?.isPinned && !fb?.isPinned) return -1;
    if (!fa?.isPinned && fb?.isPinned) return 1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  const doDelete = async (conv: Conversation) => {
    if (user) {
      await removeFriend(user.id, conv.characterId);
    }
  };

  const handleDelete = (conv: Conversation) => {
    setDeleteTarget(conv);
  };

  const handlePin = async (conv: Conversation) => {
    if (user) {
      await togglePin(user.id, conv.characterId);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
      }]}>
        <Text style={[styles.headerTitle, { color: t.brand }]}>{i('chat.title')}</Text>
        <Text
          style={[styles.addButton, { color: t.brand }]}
          onPress={() => { closeAllRef.current?.(); router.push('/add-friend'); }}
        >
          ＋
        </Text>
      </Animated.View>

      <SwipeableProvider closeAllRef={closeAllRef}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 8 }}
        onScrollBeginDrag={() => closeAllRef.current?.()}
        onMomentumScrollBegin={() => closeAllRef.current?.()}
        onScroll={() => closeAllRef.current?.()}
        scrollEventThrottle={100}
        renderItem={({ item, index }) => {
          const char = getCharacter(item.characterId);
          const friend = getFriend(item.characterId);
          if (!char) return null;
          return (
            <StaggerItem index={index}>
              <SwipeableRow
                onDelete={() => handleDelete(item)}
                onPin={() => handlePin(item)}
                isPinned={friend?.isPinned || false}
              >
                <ConversationCard
                  name={char.name}
                  avatarUrl={char.avatarUrl}
                  lastMessage={item.lastMessage}
                  time={item.lastMessageAt}
                  hasUnread={item.hasUnread}
                  isPinned={friend?.isPinned || false}
                  onPress={() => { closeAllRef.current?.(); router.push(`/conversation/${item.id}`); }}
                />
              </SwipeableRow>
            </StaggerItem>
          );
        }}
        ListEmptyComponent={
          hasFetched ? (
            <View style={styles.empty}>
              <Logo height={32} />
              <View style={[styles.emptyDivider, { backgroundColor: t.border }]} />
              <Text style={[styles.emptyHint, { color: t.textSecondary }]}>
                {i('chat.emptyHint')}
              </Text>
            </View>
          ) : (
            <View>
              {[0, 1, 2, 3, 4].map((idx) => (
                <View key={idx} style={[styles.skeletonRow, { borderBottomColor: t.border }]}>
                  <View style={[styles.skeletonAvatar, { backgroundColor: t.border }]} />
                  <View style={styles.skeletonTexts}>
                    <View style={[styles.skeletonLine, { width: 80, height: 14, backgroundColor: t.border }]} />
                    <View style={[styles.skeletonLine, { width: '90%', height: 12, backgroundColor: t.border }]} />
                  </View>
                  <View style={[styles.skeletonLine, { width: 32, height: 10, backgroundColor: t.border }]} />
                </View>
              ))}
            </View>
          )
        }
      />
      </SwipeableProvider>

      <ConfirmModal
        visible={!!deleteTarget}
        title={i('chat.deleteTitle')}
        message={i('chat.deleteMessage')}
        confirmText={i('action.delete')}
        cancelText={i('action.cancel')}
        destructive
        onConfirm={() => { if (deleteTarget) doDelete(deleteTarget); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
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
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  addButton: {
    fontSize: 28,
    fontWeight: '300',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 160,
    paddingBottom: 40,
  },
  emptyLogo: {
    fontSize: 32,
    letterSpacing: 2,
  },
  emptyDivider: {
    width: 32,
    height: 1,
    backgroundColor: undefined, // set via inline style
    marginVertical: 20,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 22,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    opacity: 0.5,
  },
  skeletonTexts: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    borderRadius: 6,
    opacity: 0.4,
  },
});
