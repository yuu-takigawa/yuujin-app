import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTheme } from '../hooks/useTheme';
import Logo from '../components/common/Logo';

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isRestoring = useAuthStore((s) => s.isRestoring);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const t = useTheme();

  useEffect(() => {
    restoreSession();
    hydrateSettings();
  }, []);

  if (isRestoring) {
    return (
      <View style={[styles.splash, { backgroundColor: t.background }]}>
        <Logo height={36} />
        <ActivityIndicator size="small" color={t.brand} style={styles.spinner} />
      </View>
    );
  }

  if (token) {
    if (user && !user.onboardingCompleted) {
      return <Redirect href="/(auth)/onboarding" />;
    }
    return <Redirect href="/(main)/(chat)" />;
  }
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginTop: 24,
  },
});
