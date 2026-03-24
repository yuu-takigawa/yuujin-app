import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { radii, spacing, fontSize } from '../../constants/theme';
import PasswordInput from '../../components/auth/PasswordInput';
import Logo from '../../components/common/Logo';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const t = useTheme();
  const { t: i } = useLocale();
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) {
      setError(i('auth.emailRequired'));
      return;
    }
    if (!password.trim()) {
      setError(i('auth.passwordRequired'));
      return;
    }
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch {
      setError(i('auth.loginFailed'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Logo height={36} />
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>
          {i('auth.subtitle')}
        </Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
            placeholder={i('auth.email')}
            placeholderTextColor={t.textSecondary}
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <PasswordInput
            placeholder={i('auth.password')}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
          />
          {error ? (
            <Text style={[styles.errorText, { color: t.error || '#E53935' }]}>{error}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: t.brand }, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? '...' : i('auth.loginBtn')}
            </Text>
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
            <Text style={[styles.forgotText, { color: t.textSecondary }]}>{i('auth.forgotPassword')}</Text>
          </Link>
        </View>

        <Link href="/(auth)/register" style={styles.link}>
          <Text style={[styles.linkText, { color: t.brand }]}>{i('auth.noAccount')} {i('auth.registerBtn')}</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  subtitle: {
    fontSize: fontSize.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
    width: '100%',
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
  forgotLink: {
    alignSelf: 'center',
  },
  forgotText: {
    fontSize: 13,
  },
  link: {
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  linkText: {
    fontSize: fontSize.body,
  },
});
