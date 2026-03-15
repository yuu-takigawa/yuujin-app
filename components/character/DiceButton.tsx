import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface DiceButtonProps {
  onPress: () => void;
}

export default function DiceButton({ onPress }: DiceButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.6}>
      <Text style={styles.icon}>🎲</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
});
