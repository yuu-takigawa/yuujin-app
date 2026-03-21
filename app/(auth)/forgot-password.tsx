import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { radii, spacing, fontSize } from '../../constants/theme';
import { resetPassword } from '../../services/api';
import VerificationCodeInput from '../../components/auth/VerificationCodeInput';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const t = useTheme();
  const router = useRouter();

  const handleReset = async () => {
    setError('');
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }
    if (!code.trim() || code.length !== 6) {
      setError('6桁の認証コードを入力してください');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      Alert.alert('パスワード再設定完了', '新しいパスワードでログインしてください。', [
        { text: 'ログインへ', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch {
      setError('再設定に失敗しました。コードを確認してください');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: t.text }]}>パスワード再設定</Text>
        <Text style={[styles.desc, { color: t.textSecondary }]}>
          登録済みのメールアドレスに認証コードを送信します
        </Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
            placeholder="メールアドレス"
            placeholderTextColor={t.textSecondary}
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <VerificationCodeInput
            email={email.trim()}
            type="reset_password"
            value={code}
            onChangeText={(v) => { setCode(v); setError(''); }}
            onError={setError}
          />

          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
            placeholder="新しいパスワード（6文字以上）"
            placeholderTextColor={t.textSecondary}
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); setError(''); }}
            secureTextEntry
          />
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
            placeholder="新しいパスワード（確認）"
            placeholderTextColor={t.textSecondary}
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
            secureTextEntry
          />

          {error ? (
            <Text style={[styles.errorText, { color: t.error || '#E53935' }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: t.brand }, submitting && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>
              {submitting ? '処理中...' : 'パスワードを再設定'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.link} onPress={() => router.back()}>
          <Text style={[styles.linkText, { color: t.brand }]}>ログインに戻る</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 40,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  form: { gap: spacing.md },
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
  link: { marginTop: spacing.lg, alignSelf: 'center' },
  linkText: { fontSize: fontSize.body },
});
