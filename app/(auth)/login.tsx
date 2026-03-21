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
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../hooks/useTheme';
import { radii, spacing, fontSize } from '../../constants/theme';

type LoginTab = 'email' | 'phone';

export default function LoginScreen() {
  const [tab, setTab] = useState<LoginTab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const t = useTheme();
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }
    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch {
      setError('メールアドレスまたはパスワードが間違っています');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={[styles.logo, { color: t.brand }]}>Yuujin・友人</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>
          日本語会話パートナー
        </Text>

        {/* Tab switcher */}
        <View style={[styles.tabRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
          <TouchableOpacity
            style={[styles.tab, tab === 'email' && { backgroundColor: t.surface }]}
            onPress={() => { setTab('email'); setError(''); }}
          >
            <Ionicons name="mail-outline" size={16} color={tab === 'email' ? t.brand : t.textSecondary} />
            <Text style={[styles.tabText, { color: tab === 'email' ? t.brand : t.textSecondary }]}>メール</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'phone' && { backgroundColor: t.surface }]}
            onPress={() => { setTab('phone'); setError(''); }}
          >
            <Ionicons name="phone-portrait-outline" size={16} color={tab === 'phone' ? t.brand : t.textSecondary} />
            <Text style={[styles.tabText, { color: tab === 'phone' ? t.brand : t.textSecondary }]}>携帯電話</Text>
          </TouchableOpacity>
        </View>

        {tab === 'email' ? (
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
            <TextInput
              style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
              placeholder="パスワード"
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
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </Text>
            </TouchableOpacity>

            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              <Text style={[styles.forgotText, { color: t.textSecondary }]}>パスワードをお忘れですか？</Text>
            </Link>
          </View>
        ) : (
          <View style={styles.phoneComingSoon}>
            <Ionicons name="phone-portrait-outline" size={48} color={t.border} />
            <Text style={[styles.comingSoonText, { color: t.textSecondary }]}>
              携帯電話でのログインは{'\n'}近日公開予定です
            </Text>
          </View>
        )}

        <Link href="/(auth)/register" style={styles.link}>
          <Text style={[styles.linkText, { color: t.brand }]}>アカウントを作成</Text>
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
    paddingHorizontal: spacing.xl,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'ShipporiMincho_700Bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
  forgotLink: {
    alignSelf: 'center',
  },
  forgotText: {
    fontSize: 13,
  },
  phoneComingSoon: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  comingSoonText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  link: {
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  linkText: {
    fontSize: fontSize.body,
  },
});
