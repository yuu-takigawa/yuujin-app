import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isRestoring = useAuthStore((s) => s.isRestoring);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    restoreSession();
    hydrateSettings();
  }, []);

  if (isRestoring) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
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
