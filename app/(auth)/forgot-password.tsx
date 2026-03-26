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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { radii, spacing, fontSize } from '../../constants/theme';
import { resetPassword } from '../../services/api';
import VerificationCodeInput from '../../components/auth/VerificationCodeInput';
import PasswordInput from '../../components/auth/PasswordInput';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const t = useTheme();
  const { t: i } = useLocale();
  const router = useRouter();

  const handleReset = async () => {
    setError('');
    if (!email.trim()) {
      setError(i('auth.emailRequired'));
      return;
    }
    if (!code.trim() || code.length !== 6) {
      setError(i('auth.codeRequired'));
      return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError(i('auth.passwordRule'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(i('auth.passwordMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('different')) {
        setError(i('auth.samePassword'));
      } else {
        setError(i('auth.resetFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, styles.successContainer, { backgroundColor: t.background }]}>
        <View style={styles.successCenter}>
          <Ionicons name="checkmark-circle" size={64} color={t.brand} />
          <Text style={[styles.successTitle, { color: t.text }]}>{i('auth.resetSuccess')}</Text>
          <Text style={[styles.successMsg, { color: t.textSecondary }]}>{i('auth.resetSuccessMsg')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: t.brand }]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.buttonText}>{i('auth.goLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <Text style={[styles.title, { color: t.text }]}>{i('auth.resetTitle')}</Text>
        <Text style={[styles.desc, { color: t.textSecondary }]}>
          {i('auth.resetDesc')}
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

          <VerificationCodeInput
            email={email.trim()}
            type="reset_password"
            value={code}
            onChangeText={(v) => { setCode(v); setError(''); }}
            onError={setError}
          />

          <PasswordInput
            placeholder={i('auth.newPasswordPlaceholder')}
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); setError(''); }}
          />
          <PasswordInput
            placeholder={i('auth.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
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
              {submitting ? i('auth.resetting') : i('auth.resetBtn')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.link} onPress={() => router.back()}>
          <Text style={[styles.linkText, { color: t.brand }]}>{i('auth.backToLogin')}</Text>
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
  successContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  successCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  successMsg: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
