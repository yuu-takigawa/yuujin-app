import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface AvatarProps {
  emoji?: string;
  imageUrl?: string;
  size?: number;
}

export default function Avatar({ emoji, imageUrl, size = 48 }: AvatarProps) {
  const t = useTheme();
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: imageUrl ? 'transparent' : t.brandLight,
  };

  if (imageUrl) {
    return (
      <View style={[styles.container, containerStyle, { overflow: 'hidden' as const }]}>
        <Image source={{ uri: imageUrl }} style={{ width: size, height: size }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji || '👤'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
