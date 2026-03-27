import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CharacterForm from '../components/character/CharacterForm';
import { useCharacterStore } from '../stores/characterStore';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../constants/theme';

export default function EditCharacterScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const characters = useCharacterStore((s) => s.characters);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);

  const character = characters.find((c) => c.id === characterId);

  if (!character) {
    return (
      <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
        <Text style={{ color: t.text, textAlign: 'center', marginTop: 100 }}>
          キャラクターが見つかりません
        </Text>
      </View>
    );
  }

  const handleSubmit = async (data: {
    name: string;
    avatarUrl: string;
    age: number;
    gender: string;
    occupation: string;
    personality: string[];
    hobbies: string[];
    location: string;
    bio: string;
    voice: string;
  }) => {
    setIsLoading(true);
    try {
      await updateCharacter(character.id, data);
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>キャラクター編集</Text>
        <View style={{ width: 24 }} />
      </View>

      <CharacterForm
        initialData={{
          name: character.name,
          avatarUrl: character.avatarUrl,
          age: character.age,
          gender: character.gender,
          occupation: character.occupation,
          personality: character.personality,
          hobbies: character.hobbies,
          location: character.location,
          bio: character.bio,
          voice: character.voice,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isLoading}
        submitLabel="保存する"
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
});
