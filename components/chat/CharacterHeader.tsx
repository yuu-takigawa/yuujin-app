import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../common/Avatar';
import { useTheme } from '../../hooks/useTheme';

interface CharacterHeaderProps {
  name: string;
  avatarEmoji: string;
  onMenuPress: () => void;
  onSearchPress?: () => void;
}

export default function CharacterHeader({
  name,
  avatarEmoji,
  onMenuPress,
  onSearchPress,
}: CharacterHeaderProps) {
  const router = useRouter();
  const t = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: t.white, borderBottomColor: t.border }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={[styles.backText, { color: t.brand }]}>‹</Text>
      </TouchableOpacity>

      <View style={styles.center}>
        <Avatar emoji={avatarEmoji} size={32} />
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {name}
        </Text>
      </View>

      <View style={styles.rightButtons}>
        <TouchableOpacity onPress={onSearchPress} style={styles.iconButton}>
          <Ionicons name="search-outline" size={22} color={t.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
          <Ionicons name="menu-outline" size={22} color={t.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 68,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
