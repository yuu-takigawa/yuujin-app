import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/common/Avatar';
import { useCharacterStore } from '../stores/characterStore';
import { useFriendStore } from '../stores/friendStore';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../hooks/useTheme';
import { useLocale } from '../hooks/useLocale';
import { radii } from '../constants/theme';

export default function AddFriendScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { t: i } = useLocale();

  const user = useAuthStore((s) => s.user);
  const characters = useCharacterStore((s) => s.characters);
  const fetchCharacters = useCharacterStore((s) => s.fetchCharacters);
  const friends = useFriendStore((s) => s.friends);
  const addFriend = useFriendStore((s) => s.addFriend);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const [searchText, setSearchText] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);

  const isFriend = (charId: string) =>
    friends.some((f) => f.characterId === charId);

  const filteredCharacters = searchText.trim()
    ? characters.filter((c) => c.name.includes(searchText) || c.occupation.includes(searchText))
    : characters;

  const handleAdd = async (characterId: string) => {
    if (!user || addingId) return;
    setAddingId(characterId);
    try {
      const conversation = await addFriend(user.id, characterId);
      router.replace(`/conversation/${conversation.id}`);
    } catch {
      setAddingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()} hitSlop={8}>
          <Text style={[styles.backChevron, { color: t.brand }]}>‹</Text>
          <Text style={[styles.backLabel, { color: t.brand }]}>{i('action.back') || '戻る'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>{i('action.addFriend')}</Text>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => router.push('/create-character')}
          hitSlop={8}
        >
          <Text style={[styles.headerRightText, { color: t.brand }]}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Ionicons name="search-outline" size={18} color={t.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: t.text }]}
          placeholder={i('friends.search') || '名前で検索...'}
          placeholderTextColor={t.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        data={filteredCharacters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const alreadyFriend = isFriend(item.id);
          return (
            <View style={[styles.row, { borderBottomColor: t.border }]}>
              <Avatar imageUrl={item.avatarUrl} name={item.name} size={44} />
              <View style={styles.info}>
                <Text style={[styles.name, { color: t.text }]}>{item.name}</Text>
                <Text style={[styles.sub, { color: t.textSecondary }]}>
                  {item.occupation} · {item.location}
                </Text>
              </View>
              {alreadyFriend ? (
                <Text style={[styles.addedText, { color: t.success }]}>{i('friends.added') || '追加済み'}</Text>
              ) : (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: t.brand }]}
                  onPress={() => handleAdd(item.id)}
                  disabled={addingId === item.id}
                >
                  {addingId === item.id ? (
                    <ActivityIndicator size={14} color="#FFF" />
                  ) : (
                    <Text style={styles.addBtnText}>{i('friends.add') || '追加'}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 60,
  },
  backChevron: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  backLabel: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  headerRightText: {
    fontSize: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  list: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  sub: {
    fontSize: 13,
    marginTop: 2,
  },
  addedText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
