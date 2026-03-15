import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CharacterDetail from '../../components/character/CharacterDetail';
import { useCharacterStore } from '../../stores/characterStore';
import { useFriendStore } from '../../stores/friendStore';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize } from '../../constants/theme';

export default function CharacterDetailScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const user = useAuthStore((s) => s.user);
  const characters = useCharacterStore((s) => s.characters);
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter);
  const friends = useFriendStore((s) => s.friends);
  const conversations = useFriendStore((s) => s.conversations);
  const addFriend = useFriendStore((s) => s.addFriend);

  const character = characters.find((c) => c.id === characterId);
  const isFriend = friends.some((f) => f.characterId === characterId);

  if (!character) {
    return (
      <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
        <Text style={{ color: t.text, textAlign: 'center', marginTop: 100 }}>
          キャラクターが見つかりません
        </Text>
      </View>
    );
  }

  const handleChat = async () => {
    if (!user) return;
    const existingConv = conversations.find((c) => c.characterId === characterId);
    if (existingConv) {
      router.push(`/conversation/${existingConv.id}`);
    } else {
      const conv = await addFriend(user.id, characterId!);
      router.push(`/conversation/${conv.id}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={t.text} />
          <Text style={[styles.headerBackText, { color: t.text }]}>戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>{character.name}</Text>
        <View style={{ width: 80 }} />
      </View>

      <CharacterDetail
        character={character}
        isFriend={isFriend}
        onChat={handleChat}
        onEdit={() => {
          router.push({ pathname: '/edit-character', params: { characterId: character.id } });
        }}
        onDelete={async () => {
          await deleteCharacter(character.id);
          router.back();
        }}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  headerBackText: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
