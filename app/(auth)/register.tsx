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
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { radii, spacing, fontSize } from '../../constants/theme';
import VerificationCodeInput from '../../components/auth/VerificationCodeInput';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const t = useTheme();
  const { t: i } = useLocale();
  const router = useRouter();

  const handleRegister = async () => {
    setError('');
    if (!username.trim()) {
      setError('ユーザー名を入力してください');
      return;
    }
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('有効なメールアドレスを入力してください');
      return;
    }
    if (!code.trim() || code.length !== 6) {
      setError('6桁の認証コードを入力してください');
      return;
    }
    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }
    try {
      await register(email.trim(), password, username.trim(), code.trim());
      router.replace('/');
    } catch {
      setError('登録に失敗しました。コードを確認してもう一度お試しください');
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
        <Text style={[styles.title, { color: t.text }]}>{i('auth.register')}</Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
            placeholder="Username"
            placeholderTextColor={t.textSecondary}
            value={username}
            onChangeText={(v) => { setUsername(v); setError(''); }}
          />
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
            placeholder={i('auth.email')}
            placeholderTextColor={t.textSecondary}
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <VerificationCodeInput
            email={email.trim()}
            type="register"
            value={code}
            onChangeText={(v) => { setCode(v); setError(''); }}
            onError={setError}
          />

          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
            placeholder={i('auth.password')}
            placeholderTextColor={t.textSecondary}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry
          />
          {error ? (
            <Text style={[styles.errorText, { color: t.error || '#E53935' }]}>{error}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: t.brand }, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? '...' : i('auth.registerBtn')}
            </Text>
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={[styles.linkText, { color: t.brand }]}>{i('auth.backToLogin')}</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  input: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: fontSize.body,
  },
  errorText: {
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  button: {
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  link: {
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  linkText: {
    fontSize: fontSize.body,
  },
});
