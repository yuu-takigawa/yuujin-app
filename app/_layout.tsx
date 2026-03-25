import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useTheme } from '../hooks/useTheme';

export default function RootLayout() {
  const t = useTheme();

  // PWA: 动态更新 meta theme-color + body 背景色，消除顶部/底部色差线
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach((meta) => meta.setAttribute('content', t.background));
    document.documentElement.style.backgroundColor = t.surface;
    document.body.style.backgroundColor = t.surface;
  }, [t.background, t.surface]);

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <StatusBar style={t.background === '#121212' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ gestureEnabled: false, animation: 'none' }} />
          <Stack.Screen name="(main)" options={{ gestureEnabled: false, animation: 'none' }} />
          <Stack.Screen name="conversation/[conversationId]" />
          <Stack.Screen name="add-friend" />
          <Stack.Screen name="character/[characterId]" />
          <Stack.Screen name="create-character" />
          <Stack.Screen name="edit-character" />
          <Stack.Screen name="article/[articleId]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="membership" />
        </Stack>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}
