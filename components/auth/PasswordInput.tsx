import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { radii, spacing, fontSize } from '../../constants/theme';

interface Props {
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
}

export default function PasswordInput({ placeholder, value, onChangeText }: Props) {
  const t = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: t.inputBg }]}>
      <TextInput
        style={[styles.input, { color: t.text }]}
        placeholder={placeholder}
        placeholderTextColor={t.textSecondary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={styles.eyeBtn}
        onPress={() => setVisible(!visible)}
        activeOpacity={0.6}
      >
        <Ionicons
          name={visible ? 'eye-outline' : 'eye-off-outline'}
          size={20}
          color={t.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: fontSize.body,
  },
  eyeBtn: {
    padding: 6,
  },
});
