import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { changePassword } from '../../../services/api';
import { radii, spacing, fontSize } from '../../../constants/theme';

export default function ChangePasswordScreen() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const handleSubmit = async () => {
    setError('');
    if (!currentPw) {
      setError('現在のパスワードを入力してください');
      return;
    }
    if (!newPw || newPw.length < 6) {
      setError('新しいパスワードは6文字以上で入力してください');
      return;
    }
    if (newPw !== confirmPw) {
      setError('パスワードが一致しません');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPw, newPw);
      Alert.alert('パスワード変更完了', '新しいパスワードが設定されました。', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      setError('現在のパスワードが正しくありません');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.surface }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.6}>
          <Text style={[styles.backText, { color: t.brand }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>パスワード変更</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
          placeholder="現在のパスワード"
          placeholderTextColor={t.textSecondary}
          value={currentPw}
          onChangeText={(v) => { setCurrentPw(v); setError(''); }}
          secureTextEntry
        />
        <TextInput
          style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
          placeholder="新しいパスワード（6文字以上）"
          placeholderTextColor={t.textSecondary}
          value={newPw}
          onChangeText={(v) => { setNewPw(v); setError(''); }}
          secureTextEntry
        />
        <TextInput
          style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
          placeholder="新しいパスワード（確認）"
          placeholderTextColor={t.textSecondary}
          value={confirmPw}
          onChangeText={(v) => { setConfirmPw(v); setError(''); }}
          secureTextEntry
        />

        {error ? (
          <Text style={[styles.errorText, { color: t.error || '#E53935' }]}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: t.brand }, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? '変更中...' : 'パスワードを変更'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  back: { width: 68, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, fontWeight: '300', lineHeight: 34 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  form: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  input: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: fontSize.body,
  },
  errorText: { fontSize: fontSize.caption, textAlign: 'center' },
  button: {
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: fontSize.body, fontWeight: '600' },
});
