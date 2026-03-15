import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function UnreadDot() {
  const t = useTheme();
  return <View style={[styles.dot, { backgroundColor: t.brand }]} />;
}

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
