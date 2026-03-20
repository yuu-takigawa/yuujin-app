import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface AvatarProps {
  imageUrl?: string;
  name?: string;
  size?: number;
}

export default function Avatar({ imageUrl, name, size = 48 }: AvatarProps) {
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

  // 无图时显示首字母
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '600', color: t.brand }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
