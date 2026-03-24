import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native';
import ReAnimated, { useAnimatedStyle, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore } from '../../stores/chatStore';
import { useFriendStore } from '../../stores/friendStore';
import { useCharacterStore } from '../../stores/characterStore';
import { useAuthStore } from '../../stores/authStore';
import { useCreditStore } from '../../stores/creditStore';
import MessageBubble from '../../components/chat/MessageBubble';
import StreamingText from '../../components/chat/StreamingText';
import TypingIndicator from '../../components/chat/TypingIndicator';
import ChatInput from '../../components/chat/ChatInput';
import CharacterHeader from '../../components/chat/CharacterHeader';
import HamburgerMenu from '../../components/chat/HamburgerMenu';
import ModelSelectorModal from '../../components/chat/ModelSelectorModal';
// BubbleTooltip is now built into MessageBubble
import TopicDrawModal from '../../components/chat/TopicDrawModal';
import NewsPickerModal from '../../components/chat/NewsPickerModal';
import { useTheme } from '../../hooks/useTheme';
import { uploadChatImage, streamSuggest } from '../../services/api';
import type { Message } from '../../services/api';

function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (date.getFullYear() !== now.getFullYear()) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const flatListRef = useRef<FlatList<Message>>(null);

  const user = useAuthStore((s) => s.user);
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const chatError = useChatStore((s) => s.error);
  const clearError = useChatStore((s) => s.clearError);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const loadConversation = useChatStore((s) => s.loadConversation);
  const clearChat = useChatStore((s) => s.clearChat);

  const convs = useFriendStore((s) => s.conversations);
  const friends = useFriendStore((s) => s.friends);
  const markAsRead = useFriendStore((s) => s.markAsRead);
  const togglePin = useFriendStore((s) => s.togglePin);
  const toggleMute = useFriendStore((s) => s.toggleMute);
  const removeFriend = useFriendStore((s) => s.removeFriend);
  const characters = useCharacterStore((s) => s.characters);

  const [menuVisible, setMenuVisible] = useState(false);
  const [topicDrawVisible, setTopicDrawVisible] = useState(false);
  const [newsPickerVisible, setNewsPickerVisible] = useState(false);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollSignal, setScrollSignal] = useState(0);
  const [suggestText, setSuggestText] = useState<string | undefined>(undefined);
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const suggestCancelRef = useRef<(() => void) | null>(null);
  const loadCredits = useCreditStore((s) => s.loadCredits);
  const loadModels = useCreditStore((s) => s.loadModels);
  const searchInputRef = useRef<TextInput>(null);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const prevIsStreaming = useRef(false);
  const lastStreamedMsgId = useRef<string | null>(null);
  const isStreamingRef = useRef(false);
  const initialScrollDone = useRef(false);

  const conv = convs.find((c) => c.id === conversationId);
  const character = characters.find((c) => c.id === conv?.characterId);
  const friend = friends.find((f) => f.characterId === conv?.characterId);

  // Computed synchronously during render: if streaming JUST finished this render,
  // prevIsStreaming.current is still true (effect hasn't updated it yet), so we can
  // reliably compute skipEntranceId before MessageBubble first mounts.
  const justFinishedStreaming = prevIsStreaming.current && !isStreaming;
  const skipEntranceId = justFinishedStreaming && messages.length > 0
    ? messages[messages.length - 1].id
    : lastStreamedMsgId.current;

  // Reanimated keyboard animation – runs on UI thread for silky smooth tracking
  const { height: kbHeight } = useReanimatedKeyboardAnimation();

  const contentTranslateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: kbHeight.value }],
  }));

  // Scroll to bottom when keyboard opens (replaces Keyboard.addListener)
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 999999, animated: false });
  }, []);

  useAnimatedReaction(
    () => kbHeight.value,
    (cur, prev) => {
      // Scroll to bottom when keyboard moves in either direction
      if (prev !== null && cur !== prev) {
        runOnJS(scrollToBottom)();
      }
    },
  );

  useEffect(() => {
    initialScrollDone.current = false;
    if (conversationId && conv?.characterId) {
      loadConversation(conversationId, conv.characterId);
      markAsRead(conversationId);
    }
    loadCredits();
    loadModels();
  }, [conversationId]);

  useEffect(() => {
    if (prevIsStreaming.current && !isStreaming && messages.length > 0) {
      lastStreamedMsgId.current = messages[messages.length - 1].id;
    }
    prevIsStreaming.current = isStreaming;
    isStreamingRef.current = isStreaming;
  }, [isStreaming, messages]);

  // Backup: initial scroll via setTimeout (native devices may need this)
  useEffect(() => {
    if (!initialScrollDone.current && messages.length > 0) {
      const scroll = () => flatListRef.current?.scrollToOffset({ offset: 999999, animated: false });
      setTimeout(scroll, 100);
      setTimeout(scroll, 400);
    }
  }, [messages]);

  // Scroll to bottom on content size change — only during streaming or initial load
  // This avoids unwanted scrolling when AnnotationPanel expands
  const handleContentSizeChange = (_w: number, contentHeight: number) => {
    if (!initialScrollDone.current || isStreamingRef.current) {
      flatListRef.current?.scrollToOffset({ offset: contentHeight, animated: false });
    }
    if (!initialScrollDone.current && messages.length > 0) {
      initialScrollDone.current = true;
    }
  };

  type ChatItem =
    | { type: 'message'; data: Message }
    | { type: 'date'; label: string; key: string };

  const chatItems = useMemo<ChatItem[]>(() => {
    const items: ChatItem[] = [];
    let lastDateStr = '';

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const d = new Date(msg.createdAt);
      const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (dateStr !== lastDateStr && i > 0) {
        items.push({ type: 'date', label: formatDateLabel(d), key: `date-${dateStr}` });
      }
      lastDateStr = dateStr;
      items.push({ type: 'message', data: msg });
    }
    return items;
  }, [messages]);

  const handleDeleteFriend = async () => {
    if (user && conv?.characterId) {
      await removeFriend(user.id, conv.characterId);
      router.back();
    }
  };

  const handleSearchToggle = () => {
    if (searchVisible) {
      Animated.timing(searchAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setSearchVisible(false);
        setSearchQuery('');
      });
    } else {
      setSearchVisible(true);
      searchAnim.setValue(0);
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }
  };

  const searchMatchIndex = useMemo(() => {
    if (!searchQuery.trim()) return -1;
    const q = searchQuery.toLowerCase();
    const idx = chatItems.findIndex(
      (item) => item.type === 'message' && item.data.content.toLowerCase().includes(q)
    );
    return idx;
  }, [searchQuery, chatItems]);

  useEffect(() => {
    if (searchMatchIndex >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: searchMatchIndex, animated: true, viewOffset: 80 });
    }
  }, [searchMatchIndex]);

  const handleAIAssist = useCallback(() => {
    if (!conversationId || aiAssistLoading) return;
    // Cancel previous suggest if any
    suggestCancelRef.current?.();
    setAiAssistLoading(true);
    setSuggestText('');

    let accumulated = '';
    const cancel = streamSuggest(conversationId, (event) => {
      if (event.type === 'delta' && event.content) {
        accumulated += event.content;
        setSuggestText(accumulated);
      } else if (event.type === 'done' || event.type === 'error') {
        setAiAssistLoading(false);
      }
    });
    suggestCancelRef.current = cancel;
  }, [conversationId, aiAssistLoading]);

  // Cleanup suggest on unmount
  useEffect(() => {
    return () => { suggestCancelRef.current?.(); };
  }, []);

  const handleTopicSend = (topicText: string) => {
    sendMessage(`🎲 ${topicText}`);
    setTopicDrawVisible(false);
  };

  const handleNewsSend = (article: import('../../services/api').NewsArticle) => {
    // Send title as display text, but include article ID for linking
    sendMessage(`📰[${article.id}] ${article.title}`);
    setNewsPickerVisible(false);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}
    >
      <CharacterHeader
        name={character?.name || ''}
        avatarUrl={character?.avatarUrl}
        onMenuPress={() => setMenuVisible(true)}
        onSearchPress={handleSearchToggle}
      />

      {searchVisible && (
        <Animated.View style={[styles.searchBar, { backgroundColor: t.surface, borderBottomColor: t.border }, {
          height: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 44] }),
          opacity: searchAnim,
          overflow: 'hidden',
        }]}>
          <Ionicons name="search-outline" size={18} color={t.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: t.text }]}
            placeholder="メッセージを検索..."
            placeholderTextColor={t.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleSearchToggle} hitSlop={8}>
            <Ionicons name="close" size={20} color={t.textSecondary} />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ReAnimated.View style={[styles.contentArea, contentTranslateStyle]}>
        <FlatList
          ref={flatListRef as any}
          style={styles.list}
          data={chatItems}
          keyExtractor={(item) => item.type === 'date' ? item.key : item.data.id}
          contentContainerStyle={[styles.messageList, { paddingBottom: 60, paddingTop: 12 }]}
          initialNumToRender={20}
          onContentSizeChange={handleContentSizeChange}
          automaticallyAdjustKeyboardInsets={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setScrollSignal((s) => s + 1)}
          onScroll={() => setScrollSignal((s) => s + 1)}
          scrollEventThrottle={200}
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return (
                <View style={styles.dateSep}>
                  <View style={[styles.dateBadge, { backgroundColor: t.dateBadge }]}>
                    <Text style={[styles.dateLabel, { color: t.textSecondary }]}>{item.label}</Text>
                  </View>
                </View>
              );
            }
            const isSearchHit = searchQuery.trim() !== '' &&
              item.data.content.toLowerCase().includes(searchQuery.toLowerCase());
            // Parse [image] prefix or use imageUrl from metadata
            const isImageMsg = item.data.content.startsWith('[image]');
            const parsedImageUrl = item.data.imageUrl
              || (isImageMsg ? item.data.content.match(/https?:\/\/\S+/)?.[0] : undefined);
            const displayContent = isImageMsg ? '' : item.data.content;
            return (
              <MessageBubble
                content={displayContent}
                role={item.data.role}
                avatarUrl={item.data.role === 'assistant' ? character?.avatarUrl : user?.avatarUrl}
                createdAt={item.data.createdAt}
                highlight={isSearchHit}
                skipEntrance={item.data.id === skipEntranceId}
                imageUrl={parsedImageUrl}
                dismissSignal={scrollSignal}
                onRequestScroll={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />
            );
          }}
          ListFooterComponent={
            isStreaming ? (
              streamingContent ? (
                <StreamingText
                  content={streamingContent}
                  avatarUrl={character?.avatarUrl}
                />
              ) : (
                <TypingIndicator avatarUrl={character?.avatarUrl} />
              )
            ) : null
          }
        />
        {chatError ? (
          <TouchableOpacity
            style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 12, marginBottom: 4, borderRadius: 8 }}
            onPress={clearError}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center' }}>{chatError}</Text>
          </TouchableOpacity>
        ) : null}
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming}
          characterName={character?.name}
          onTopicDraw={() => setTopicDrawVisible(true)}
          onNewsPicker={() => setNewsPickerVisible(true)}
          onAIAssist={handleAIAssist}
          suggestedText={suggestText}
          aiAssistLoading={aiAssistLoading}
          onImagePicked={async (uri) => {
            try {
              const imageUrl = await uploadChatImage(uri);
              sendMessage('[image]', imageUrl);
            } catch {
              // silently fail - don't send broken message
            }
          }}
        />
      </ReAnimated.View>

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isPinned={friend?.isPinned || false}
        isMuted={friend?.isMuted || false}
        onViewCharacter={() => {
          if (conv?.characterId) {
            router.push(`/character/${conv.characterId}`);
          }
        }}
        onToggleMute={() => {
          if (user && conv?.characterId) toggleMute(user.id, conv.characterId);
        }}
        onTogglePin={() => {
          if (user && conv?.characterId) togglePin(user.id, conv.characterId);
        }}
        onClearChat={clearChat}
        onDeleteFriend={handleDeleteFriend}
        onModelSelect={() => setModelModalVisible(true)}
      />

      <ModelSelectorModal visible={modelModalVisible} onClose={() => setModelModalVisible(false)} />


      <TopicDrawModal
        visible={topicDrawVisible}
        onClose={() => setTopicDrawVisible(false)}
        onSelectTopic={(topic) => handleTopicSend(topic.text)}
        characterId={character?.id}
      />

      <NewsPickerModal
        visible={newsPickerVisible}
        onClose={() => setNewsPickerVisible(false)}
        onSelectNews={(article) => handleNewsSend(article)}
      />



    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  messageList: {
    padding: 12,
    gap: 16,
  },
  dateSep: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  dateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dateLabel: {
    fontSize: 11,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
});
