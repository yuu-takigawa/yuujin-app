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
import PasswordInput from '../../components/auth/PasswordInput';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const t = useTheme();
  const { t: i } = useLocale();
  const router = useRouter();

  const handleRegister = async () => {
    setError('');
    if (!email.trim()) {
      setError(i('auth.emailRequired'));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError(i('auth.invalidEmail'));
      return;
    }
    if (!code.trim() || code.length !== 6) {
      setError(i('auth.codeRequired'));
      return;
    }
    if (!password.trim()) {
      setError(i('auth.passwordRequired'));
      return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError(i('auth.passwordRule'));
      return;
    }
    if (password !== confirmPassword) {
      setError(i('auth.passwordMismatch'));
      return;
    }
    try {
      await register(email.trim(), password, code.trim());
      router.replace('/');
    } catch {
      setError(i('auth.registerFailed'));
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

          <PasswordInput
            placeholder={i('auth.password')}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
          />
          <PasswordInput
            placeholder={i('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
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
