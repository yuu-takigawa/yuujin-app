import { useEffect, useCallback, useRef } from 'react';
import { View, FlatList, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFriendStore } from '../../../stores/friendStore';
import { useCharacterStore } from '../../../stores/characterStore';
import { useAuthStore } from '../../../stores/authStore';
import ConversationCard from '../../../components/chat/ConversationCard';
import SwipeableRow from '../../../components/common/SwipeableRow';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, fontSize } from '../../../constants/theme';
import type { Conversation } from '../../../services/api';

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const user = useAuthStore((s) => s.user);
  const conversations = useFriendStore((s) => s.conversations);
  const friends = useFriendStore((s) => s.friends);
  const fetchConversations = useFriendStore((s) => s.fetchConversations);
  const fetchFriends = useFriendStore((s) => s.fetchFriends);
  const deleteConversation = useFriendStore((s) => s.deleteConversation);
  const removeFriend = useFriendStore((s) => s.removeFriend);
  const characters = useCharacterStore((s) => s.characters);
  const fetchCharacters = useCharacterStore((s) => s.fetchCharacters);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchConversations();
    fetchCharacters();
    if (user) fetchFriends(user.id);
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

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

  const handleDelete = async (conv: Conversation) => {
    if (user) {
      await removeFriend(user.id, conv.characterId);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
      }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>チャット</Text>
        <Text
          style={[styles.addButton, { color: t.brand }]}
          onPress={() => router.push('/add-friend')}
        >
          ＋
        </Text>
      </Animated.View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 8 + insets.bottom }}
        renderItem={({ item }) => {
          const char = getCharacter(item.characterId);
          const friend = getFriend(item.characterId);
          if (!char) return null;
          return (
            <SwipeableRow onDelete={() => handleDelete(item)}>
              <ConversationCard
                name={char.name}
                avatarEmoji={char.avatarEmoji}
                lastMessage={item.lastMessage}
                time={item.lastMessageAt}
                hasUnread={item.hasUnread}
                isPinned={friend?.isPinned || false}
                onPress={() => router.push(`/conversation/${item.id}`)}
              />
            </SwipeableRow>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyLogo, { color: t.brand }]}>Yuujin · 友人</Text>
            <View style={[styles.emptyDivider, { backgroundColor: t.border }]} />
            <Text style={[styles.emptyHint, { color: t.textSecondary }]}>
              右上の ＋ から友達を追加して{'\n'}会話をはじめましょう
            </Text>
          </View>
        }
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
    fontFamily: 'ShipporiMincho_700Bold',
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
});
