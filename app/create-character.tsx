import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CharacterForm from '../components/character/CharacterForm';
import { useCharacterStore } from '../stores/characterStore';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../constants/theme';

export default function CreateCharacterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const user = useAuthStore((s) => s.user);
  const createCharacter = useCharacterStore((s) => s.createCharacter);

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
      await createCharacter({
        ...data,
        avatarEmoji: '',
        userId: user?.id || null,
      });
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: t.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.back, { color: t.brand }]}>‹ 戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>新しいキャラクター</Text>
        <View style={{ width: 60 }} />
      </View>

      <CharacterForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isLoading}
      />
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
  back: {
    fontSize: fontSize.body,
    fontWeight: '500',
    width: 60,
  },
  title: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
  },
});
